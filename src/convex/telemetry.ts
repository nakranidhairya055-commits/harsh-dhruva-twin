import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { sensorDefsFor, simulateValue, evaluateThreshold, thresholdFor, SensorDef } from "./sensors";

/* ------------------------------------------------------------------ */
/* Stations                                                            */
/* ------------------------------------------------------------------ */

/** List all seeded stations in display order. */
export const listStations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stations").collect();
  },
});

/** Look up a station by slug (public query, null when missing). */
export const getStationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

/** Look up a station document by slug (internal helper). */
export const internalGetStationBySlug = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

/** Severity assigned to a threshold hit. */
type Severity = "critical" | "warning" | "watch";

/** Build the human-readable alert message for a threshold breach. */
function breachMessage(
  def: SensorDef,
  value: number,
  kind: string,
  limit: number,
): string {
  const dir = kind.endsWith("Low") ? "below" : "above";
  return `${def.parameter} (${def.equipmentId}) reading ${value} ${def.unit} ${dir} ${limit} ${def.unit} limit`;
}

/**
 * Advance the sensor simulation one tick for both instrumented stations.
 * Called by the cron job every 10 seconds. Writes telemetry rows and raises
 * new alerts for threshold breaches (deduplicated against open alerts).
 */
export const simulateTick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stations = await ctx.db.query("stations").collect();
    const instrumented = stations.filter(
      (s) => s.slug === "maitri" || s.slug === "bharati",
    );
    const report: Array<{ station: string; readings: number; newAlerts: number }> = [];

    for (const station of instrumented) {
      const defs = sensorDefsFor(station.slug);
      const rng = Math.random;
      let newAlerts = 0;

      // Existing open alerts, used for deduplication.
      const openAlerts = await ctx.db
        .query("alerts")
        .withIndex("by_open", (q) => q.eq("resolved", false))
        .collect();
      const openBySensor = new Set(
        openAlerts
          .filter((a) => a.stationId === station._id)
          .map((a) => `${a.equipmentId}|${a.sensorId ?? ""}`),
      );

      for (const def of defs) {
        const value = simulateValue(def, now, rng);
        await ctx.db.insert("telemetry", {
          stationId: station._id,
          subsystem: def.subsystem,
          equipmentId: def.equipmentId,
          sensorId: def.sensorId,
          parameter: def.parameter,
          value,
          unit: def.unit,
          qualityFlag: "good",
          timestamp: now,
        });

        const hit = evaluateThreshold(def, value);
        if (hit) {
          const key = `${def.equipmentId}|${def.sensorId}`;
          if (!openBySensor.has(key)) {
            await ctx.db.insert("alerts", {
              stationId: station._id,
              subsystem: def.subsystem,
              equipmentId: def.equipmentId,
              sensorId: def.sensorId,
              severity: hit.severity as Severity,
              message: breachMessage(def, value, hit.kind, hit.limit),
              sensorReading: `${value} ${def.unit}`,
              actuatorState: "auto-threshold-check",
              acknowledged: false,
              resolved: false,
              createdAt: now,
            });
            openBySensor.add(key);
            newAlerts += 1;
          }
        }
      }

      report.push({ station: station.slug, readings: defs.length, newAlerts });
    }

    // Keep the rolling window bounded: drop rows older than 30 minutes.
    const cutoff = now - 30 * 60 * 1000;
    const stale = await ctx.db
      .query("telemetry")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoff))
      .take(500);
    for (const row of stale) {
      await ctx.db.delete(row._id);
    }

    return report;
  },
});

/* ------------------------------------------------------------------ */
/* Live readings                                                       */
/* ------------------------------------------------------------------ */

/** Dashboard-facing status of one sensor. */
export type SensorStatus = "nominal" | "warning" | "critical" | "watch" | "offline";

/** Live reading joined with catalog metadata, as returned by getLiveReadings. */
export interface LiveReading {
  equipmentId: string;
  sensorId: string;
  parameter: string;
  subsystem: SensorDef["subsystem"];
  unit: string;
  decimals: number;
  value: number;
  qualityFlag: string;
  timestamp: number;
  status: SensorStatus;
  thresholds: {
    warnLow?: number;
    critLow?: number;
    warnHigh?: number;
    critHigh?: number;
  };
}

/** Map a threshold hit to a dashboard status label. */
function statusOf(hit: { severity: string } | null): SensorStatus {
  if (!hit) return "nominal";
  if (hit.severity === "critical") return "critical";
  if (hit.severity === "warning") return "warning";
  return "watch";
}

/** Latest value per sensor for a station, joined with the sensor catalog. */
export const getLiveReadings = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }): Promise<LiveReading[]> => {
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!station) return [];

    const docs = await ctx.db
      .query("telemetry")
      .withIndex("by_station_sensor", (q) => q.eq("stationId", station._id))
      .collect();

    const latest = new Map<string, (typeof docs)[number]>();
    for (const doc of docs) {
      const key = `${doc.equipmentId}|${doc.sensorId}`;
      const prev = latest.get(key);
      if (!prev || doc.timestamp > prev.timestamp) {
        latest.set(key, doc);
      }
    }

    const defs = sensorDefsFor(slug);
    const readings: LiveReading[] = defs.map((def) => {
      const doc = latest.get(`${def.equipmentId}|${def.sensorId}`);
      const value = doc?.value ?? 0;
      const hit = doc ? evaluateThreshold(def, value) : null;
      return {
        equipmentId: def.equipmentId,
        sensorId: def.sensorId,
        parameter: def.parameter,
        subsystem: def.subsystem,
        unit: def.unit,
        decimals: def.decimals,
        value,
        qualityFlag: doc?.qualityFlag ?? "offline",
        timestamp: doc?.timestamp ?? 0,
        status: doc ? statusOf(hit) : "offline",
        thresholds: thresholdFor(def.equipmentId, def.sensorId),
      };
    });
    return readings;
  },
});

/** History for one sensor (oldest-to-newest) for the live chart. */
export const getSensorHistory = query({
  args: {
    slug: v.string(),
    equipmentId: v.string(),
    sensorId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { slug, equipmentId, sensorId, limit }) => {
    const n = Math.min(Math.max(limit ?? 60, 10), 180);
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!station) return [];
    const rows = await ctx.db
      .query("telemetry")
      .withIndex("by_station_sensor", (q) => q.eq("stationId", station._id))
      .collect();
    return rows
      .filter((r) => r.equipmentId === equipmentId && r.sensorId === sensorId)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-n)
      .map((r) => ({ timestamp: r.timestamp, value: r.value }));
  },
});

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

/** Alert as consumed by the UI. */
export interface AlertView {
  _id: string;
  stationSlug: string;
  stationName: string;
  subsystem: string;
  equipmentId: string;
  sensorId?: string;
  severity: "critical" | "warning" | "watch" | "info";
  message: string;
  sensorReading?: string;
  actuatorState?: string;
  acknowledged: boolean;
  resolved: boolean;
  createdAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
}

/** Query open or resolved alerts, optionally filtered by station. */
export const listAlerts = query({
  args: {
    stationSlug: v.optional(v.string()),
    openOnly: v.boolean(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { stationSlug, openOnly, limit }) => {
    const n = Math.min(Math.max(limit ?? 50, 1), 200);
    let rows = await ctx.db
      .query("alerts")
      .withIndex("by_open", (q) => q.eq("resolved", openOnly))
      .collect();
    if (stationSlug) {
      const station = await ctx.db
        .query("stations")
        .withIndex("by_slug", (q) => q.eq("slug", stationSlug))
        .unique();
      rows = rows.filter((a) => a.stationId === station?._id);
    }
    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, n);
    const stations = await ctx.db.query("stations").collect();
    const stById = new Map(stations.map((s) => [s._id, s]));
    return sorted.map((a) => {
      const st = stById.get(a.stationId);
      return {
        _id: a._id,
        stationSlug: st?.slug ?? "unknown",
        stationName: st?.name ?? "Unknown station",
        subsystem: a.subsystem,
        equipmentId: a.equipmentId,
        sensorId: a.sensorId,
        severity: a.severity,
        message: a.message,
        sensorReading: a.sensorReading,
        actuatorState: a.actuatorState,
        acknowledged: a.acknowledged,
        resolved: a.resolved,
        createdAt: a.createdAt,
        acknowledgedAt: a.acknowledgedAt,
        resolvedAt: a.resolvedAt,
      } satisfies AlertView;
    });
  },
});

/** Args for acknowledgeAlert / resolveAlert. */
const alertActionArgs = v.object({
  alertId: v.id("alerts"),
});

/** Mark an alert acknowledged by the current operator. */
export const acknowledgeAlert = mutation({
  args: alertActionArgs,
  handler: async (ctx, { alertId }) => {
    const userId = await getAuthUserId(ctx);
    const doc = await ctx.db.get(alertId);
    if (!doc) throw new Error("Alert not found");
    await ctx.db.patch(alertId, {
      acknowledged: true,
      acknowledgedBy: userId ?? undefined,
      acknowledgedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Resolve an alert, closing it out of the triage queue. */
export const resolveAlert = mutation({
  args: alertActionArgs,
  handler: async (ctx, { alertId }) => {
    const doc = await ctx.db.get(alertId);
    if (!doc) throw new Error("Alert not found");
    await ctx.db.patch(alertId, { resolved: true, resolvedAt: Date.now() });
    return { ok: true };
  },
});
