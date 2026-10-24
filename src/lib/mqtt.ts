/**
 * DhruvaTwin MQTT link.
 *
 * Telemetry, alerts and field traffic are published to the public HiveMQ
 * broker over WebSockets so constrained station networks can carry the same
 * payloads the console shows on screen. MQTT is used rather than a
 * request/response API because the station link is intermittent: the broker
 * holds the last known state and the station buffers locally between windows.
 *
 * Topic scheme:
 *   dhruvatwin/telemetry/{stationId}/{sensorId}
 *   dhruvatwin/telemetry/{stationId}/{sensorId}/batch
 *   dhruvatwin/alerts/{stationId}
 *   dhruvatwin/sos/{stationId}
 *   dhruvatwin/queue/{stationId}
 */

export const MQTT_BROKER_HOST = "broker.hivemq.com";
export const MQTT_WS_URL = "wss://broker.hivemq.com:8884/mqtt";
export const TOPIC_ROOT = "dhruvatwin";

/** Link state surfaced to the console. */
export type LinkStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "error";

/** Inbound or outbound message shown in the link monitor. */
export interface LinkMessage {
  id: number;
  topic: string;
  payload: string;
  direction: "in" | "out";
  at: number;
}

export const topics = {
  root: TOPIC_ROOT,
  telemetry: (stationId: string, sensorId: string) =>
    `${TOPIC_ROOT}/telemetry/${stationId}/${sensorId}`,
  telemetryBatch: (stationId: string) =>
    `${TOPIC_ROOT}/telemetry/${stationId}/batch`,
  telemetryWildcard: (stationId: string) => `${TOPIC_ROOT}/telemetry/${stationId}/#`,
  alerts: (stationId: string) => `${TOPIC_ROOT}/alerts/${stationId}`,
  sos: (stationId: string) => `${TOPIC_ROOT}/sos/${stationId}`,
  queue: (stationId: string) => `${TOPIC_ROOT}/queue/${stationId}`,
};

/** Minimal client surface the console uses. */
export interface MqttLink {
  publish: (topic: string, payload: string, qos?: 0 | 1) => void;
  close: () => void;
  connected: boolean;
}

export interface CreateLinkOptions {
  stationId: string;
  onStatus: (status: LinkStatus, detail?: string) => void;
  onMessage: (topic: string, payload: string) => void;
}

let messageSeq = 0;
/** Monotonic id for the link monitor feed. */
export function nextMessageId(): number {
  messageSeq += 1;
  return messageSeq;
}

/**
 * Open a link to the HiveMQ public broker. The mqtt client is imported
 * dynamically so a blocked or unavailable bundle never stops the console from
 * booting — the station just keeps buffering into the offline queue.
 */
export async function createStationLink(
  options: CreateLinkOptions,
): Promise<MqttLink> {
  const { stationId, onStatus, onMessage } = options;
  if (typeof window === "undefined") {
    return { publish: () => {}, close: () => {}, connected: false };
  }

  onStatus("connecting");
  try {
    const mqtt = await import("mqtt");
    const client = mqtt.connect(MQTT_WS_URL, {
      clientId: `dhruvatwin-${stationId}-${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      keepalive: 30,
      connectTimeout: 12_000,
      reconnectPeriod: 8_000,
      protocolVersion: 4,
    });

    let connected = false;

    client.on("connect", () => {
      connected = true;
      onStatus("connected", MQTT_BROKER_HOST);
      client.subscribe(
        [topics.telemetryWildcard(stationId), topics.alerts(stationId)],
        { qos: 0 },
        (err) => {
          if (err) onStatus("connected", `subscribe deferred: ${err.message}`);
        },
      );
    });
    client.on("reconnect", () => {
      connected = false;
      onStatus("reconnecting", MQTT_BROKER_HOST);
    });
    client.on("close", () => {
      if (connected) {
        connected = false;
        onStatus("offline", "socket closed");
      }
    });
    client.on("error", (err: Error) => {
      connected = false;
      onStatus("error", err.message);
    });
    client.on("message", (topic: string, payload: Uint8Array) => {
      onMessage(topic, new TextDecoder().decode(payload));
    });

    return {
      publish: (topic, payload, qos: 0 | 1 = 0) => {
        try {
          client.publish(topic, payload, { qos, retain: qos === 1 });
        } catch {
          /* the queue keeps the payload until the next window */
        }
      },
      close: () => {
        connected = false;
        try {
          client.end(true);
        } catch {
          /* already closed */
        }
      },
      get connected() {
        return connected;
      },
    };
  } catch (error) {
    onStatus("error", `mqtt client unavailable: ${String(error).slice(0, 120)}`);
    return { publish: () => {}, close: () => {}, connected: false };
  }
}
