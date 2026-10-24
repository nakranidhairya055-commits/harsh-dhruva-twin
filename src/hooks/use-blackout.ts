import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Simulated uplink-loss window used by the continuity demonstration. */
export const BLACKOUT_DURATION_SEC = 60;

export interface ReconciliationView {
  predictedCoverage: number;
  actualCoverage: number;
  delta: number;
  withinTarget: boolean;
  note: string;
  bufferedSamples: number;
  endedAt: number;
}

export interface BlackoutState {
  riskLevel: string;
  riskScore: number;
  confidence: number;
  minutesToDrop: number;
  accuracyTarget: number;
  model: string;
  drivers: Array<{ label: string; value: number; unit: string; weight: number }>;
  active: boolean;
  remainingSec: number;
  durationSec: number;
  reconciliation: ReconciliationView | null;
  lastReconciliation: ReconciliationView | null;
  eventCount: number;
  busy: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  ready: boolean;
}

/**
 * Drive the AI blackout predictor for one station.
 *
 * The prediction itself is computed server side from live VSAT, wind and
 * latency channels. Starting a simulation opens a blackout event and raises a
 * critical incident; when the 60 second window closes the event is
 * reconciled against the coverage actually measured during the outage.
 */
export function useBlackout(slug: string): BlackoutState {
  const prediction = useQuery(api.blackout.getPrediction, { slug });
  const simulate = useMutation(api.blackout.simulateBlackout);
  const finish = useMutation(api.blackout.endBlackout);

  const [tick, setTick] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [reconciliation, setReconciliation] = useState<ReconciliationView | null>(null);
  const closing = useRef(false);

  const activeEvent = prediction?.activeEvent ?? null;

  useEffect(() => {
    if (!activeEvent) return;
    const timer = window.setInterval(() => setTick(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [activeEvent]);

  const remainingSec = activeEvent
    ? Math.max(
        0,
        Math.ceil(
          (activeEvent.startedAt + BLACKOUT_DURATION_SEC * 1000 - tick) / 1000,
        ),
      )
    : 0;

  const stop = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;
    try {
      const result = await finish({ slug });
      if (result.reconciled) {
        setReconciliation({
          predictedCoverage: result.predictedCoverage,
          actualCoverage: result.actualCoverage,
          delta: result.delta,
          withinTarget: result.withinTarget,
          note: result.note,
          bufferedSamples: result.bufferedSamples,
          endedAt: result.endedAt,
        });
      }
    } finally {
      closing.current = false;
      setBusy(false);
    }
  }, [finish, slug]);

  const start = useCallback(async () => {
    setBusy(true);
    setReconciliation(null);
    try {
      await simulate({ slug, durationSec: BLACKOUT_DURATION_SEC });
      setTick(Date.now());
    } finally {
      setBusy(false);
    }
  }, [simulate, slug]);

  /* Close the window automatically once the countdown expires. */
  useEffect(() => {
    if (!activeEvent) return;
    if (remainingSec > 0) return;
    void stop();
  }, [activeEvent, remainingSec, stop]);

  const lastReconciliation = useMemo<ReconciliationView | null>(() => {
    const last = prediction?.lastReconciliation;
    if (!last) return null;
    return {
      predictedCoverage: last.predictedCoverage,
      actualCoverage: last.actualCoverage,
      delta: last.delta,
      withinTarget: last.delta <= 100 - last.confidence || last.delta <= 5,
      note: last.note,
      bufferedSamples: 0,
      endedAt: last.endedAt,
    };
  }, [prediction]);

  return {
    riskLevel: prediction?.riskLevel ?? "nominal",
    riskScore: prediction?.riskScore ?? 0,
    confidence: prediction?.confidence ?? 0,
    minutesToDrop: prediction?.minutesToDrop ?? 0,
    accuracyTarget: prediction?.accuracyTarget ?? 95,
    model: prediction?.model ?? "DT-CONTINUITY-3.2",
    drivers: prediction?.drivers ?? [],
    active: activeEvent !== null,
    remainingSec,
    durationSec: BLACKOUT_DURATION_SEC,
    reconciliation,
    lastReconciliation,
    eventCount: prediction?.eventCount ?? 0,
    busy,
    start,
    stop,
    ready: prediction !== undefined,
  };
}
