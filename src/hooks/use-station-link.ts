import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createStationLink,
  nextMessageId,
  topics,
  MQTT_BROKER_HOST,
  type LinkMessage,
  type LinkStatus,
  type MqttLink,
} from "@/lib/mqtt";
import {
  PRIORITY,
  bumpAttempt,
  clearQueue,
  enqueue,
  listPending,
  queueStats,
  removeItem,
  type QueuePriority,
} from "@/lib/offline-queue";

/** One live channel pushed to the broker. */
export interface LinkChannel {
  equipmentId: string;
  sensorId: string;
  parameter: string;
  value: number;
  unit: string;
  status: string;
  decimals: number;
}

const PUBLISH_INTERVAL_MS = 5_000;
const MAX_FEED = 40;

export interface StationLink {
  status: LinkStatus;
  detail: string;
  online: boolean;
  broker: string;
  pending: number;
  byPriority: Record<number, number>;
  oldestAt: number | null;
  published: number;
  lastPublishAt: number | null;
  messages: LinkMessage[];
  send: (
    priority: QueuePriority,
    kind: string,
    label: string,
    payload: unknown,
  ) => Promise<void>;
  clear: () => Promise<void>;
  /** Re-attempt the outbox now instead of waiting for the next reconnect. */
  flush: () => Promise<void>;
}

/**
 * Bind a station to the MQTT broker and the offline outbox.
 *
 * Outbound traffic always lands in IndexedDB first. When the link is up the
 * queue is drained highest-priority-first; when it is down the queue simply
 * grows and the console reports the backlog. Live telemetry is published on a
 * fixed cadence so the broker always carries the latest station state.
 */
export function useStationLink(slug: string, channels: LinkChannel[]): StationLink {
  const [status, setStatus] = useState<LinkStatus>("idle");
  const [detail, setDetail] = useState("");
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pending, setPending] = useState(0);
  const [byPriority, setByPriority] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });
  const [oldestAt, setOldestAt] = useState<number | null>(null);
  const [published, setPublished] = useState(0);
  const [lastPublishAt, setLastPublishAt] = useState<number | null>(null);
  const [messages, setMessages] = useState<LinkMessage[]>([]);

  const linkRef = useRef<MqttLink | null>(null);
  const connectedRef = useRef(false);
  const channelsRef = useRef(channels);
  channelsRef.current = channels;

  const pushMessage = useCallback(
    (topic: string, payload: string, direction: "in" | "out") => {
      setMessages((prev) =>
        [
          { id: nextMessageId(), topic, payload, direction, at: Date.now() },
          ...prev,
        ].slice(0, MAX_FEED),
      );
    },
    [],
  );

  const refreshStats = useCallback(async () => {
    const stats = await queueStats();
    setPending(stats.total);
    setByPriority(stats.byPriority);
    setOldestAt(stats.oldestAt);
  }, []);

  /** Replay the outbox in priority order. */
  const drain = useCallback(async () => {
    const link = linkRef.current;
    if (!link || !connectedRef.current) return;
    const rows = await listPending();
    for (const row of rows) {
      if (!connectedRef.current) {
        await bumpAttempt(row);
        break;
      }
      link.publish(row.topic, row.payload, row.priority <= PRIORITY.CRITICAL ? 1 : 0);
      pushMessage(row.topic, row.payload, "out");
      setPublished((n) => n + 1);
      if (row.id !== undefined) await removeItem(row.id);
    }
    await refreshStats();
  }, [pushMessage, refreshStats]);

  /* ---- Link lifecycle ---- */
  useEffect(() => {
    let cancelled = false;
    connectedRef.current = false;
    createStationLink({
      stationId: slug,
      onStatus: (next, note) => {
        if (cancelled) return;
        connectedRef.current = next === "connected";
        setStatus(next);
        setDetail(note ?? "");
        if (next === "connected") void drain();
      },
      onMessage: (topic, payload) => {
        if (!cancelled) pushMessage(topic, payload, "in");
      },
    }).then((created) => {
      if (cancelled) {
        created.close();
        return;
      }
      linkRef.current = created;
    });
    return () => {
      cancelled = true;
      connectedRef.current = false;
      linkRef.current?.close();
      linkRef.current = null;
    };
  }, [slug, drain, pushMessage]);

  /* ---- Outbox statistics + replay ---- */
  useEffect(() => {
    void refreshStats();
    const t = window.setInterval(() => void refreshStats(), 3_000);
    return () => window.clearInterval(t);
  }, [refreshStats]);

  useEffect(() => {
    if (status === "connected") void drain();
  }, [drain, status]);

  /* ---- Connectivity ---- */
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void drain();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [drain]);

  /* ---- Live telemetry publication ---- */
  useEffect(() => {
    const tick = () => {
      const link = linkRef.current;
      if (!link || !connectedRef.current) return;
      const batch = channelsRef.current;
      if (batch.length === 0) return;
      const at = Date.now();
      for (const channel of batch) {
        const payload = JSON.stringify({
          station: slug,
          equipmentId: channel.equipmentId,
          sensorId: channel.sensorId,
          parameter: channel.parameter,
          value: channel.value,
          unit: channel.unit,
          status: channel.status,
          ts: at,
        });
        link.publish(topics.telemetry(slug, channel.sensorId), payload, 0);
      }
      link.publish(
        topics.telemetryBatch(slug),
        JSON.stringify({
          station: slug,
          channels: batch.length,
          ts: at,
          readings: batch.map((c) => ({
            equipmentId: c.equipmentId,
            sensorId: c.sensorId,
            value: c.value,
            unit: c.unit,
            status: c.status,
          })),
        }),
        0,
      );
      setPublished((n) => n + batch.length + 1);
      setLastPublishAt(at);
    };
    const t = window.setInterval(tick, PUBLISH_INTERVAL_MS);
    tick();
    return () => window.clearInterval(t);
  }, [slug]);

  const send = useCallback(
    async (
      priority: QueuePriority,
      kind: string,
      label: string,
      payload: unknown,
    ) => {
      const topic =
        priority === PRIORITY.SOS
          ? topics.sos(slug)
          : priority === PRIORITY.CRITICAL
            ? topics.alerts(slug)
            : topics.queue(slug);
      const body = JSON.stringify({
        station: slug,
        kind,
        label,
        priority,
        ts: Date.now(),
        payload,
      });
      // Offline-first: persist before attempting the network.
      await enqueue({ priority, kind, label, topic, payload: body });
      await refreshStats();
      await drain();
    },
    [drain, refreshStats, slug],
  );

  const clear = useCallback(async () => {
    await clearQueue();
    await refreshStats();
  }, [refreshStats]);

  /**
   * Manual flush. The queue also drains on reconnect and after every send, but
   * an operator watching a weak pass wants to force the attempt themselves.
   */
  const flush = useCallback(async () => {
    await drain();
    await refreshStats();
  }, [drain, refreshStats]);

  return useMemo(
    () => ({
      status,
      detail,
      online,
      broker: MQTT_BROKER_HOST,
      pending,
      byPriority,
      oldestAt,
      published,
      lastPublishAt,
      messages,
      send,
      clear,
      flush,
    }),
    [
      status,
      detail,
      online,
      pending,
      byPriority,
      oldestAt,
      published,
      lastPublishAt,
      messages,
      send,
      clear,
      flush,
    ],
  );
}
