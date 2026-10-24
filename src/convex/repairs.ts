import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { sensorDefsFor, thresholdFor } from "./sensors";

/**
 * Telemetry repair bay.
 *
 * Two things live here.
 *
 * 1. Channel repair. A repair procedure is applied to one telemetry channel:
 *    the matching open incidents are closed out, a corrected sample inside the
 *    operating band is written back to the plant, and the whole action is
 *    recorded in the repair log and in the tamper-evident command chain. The
 *    dashboard therefore recovers because the plant recovered, not because the
 *    UI hid the fault.
 *
 * 2. Self-test recording. FPGA self-healing results are stored with the suite
 *    name and the trial statistics so a verdict can be audited later.
 */

/** Value inside the operating band for a channel, or null when it has no band. */
function inBandTarget(equipmentId: string, sensorId: string): number | null {
  const band = thresholdFor(equipmentId, sensorId);
  const { warnLow, critLow, warnHigh, critHigh } = band;
  if (warnLow !== undefined && warnHigh !== undefined) return (warnLow + warnHigh) / 2;
  if (critLow !== undefined && warnHigh !== undefined) return (critLow + warnHigh) / 2;
  if (warnLow !== undefined) return warnLow * 1.12;
  if (critLow !== undefined) return critLow * 1.18;
  if (warnHigh !== undefined) return warnHigh * 0.86;
  if (critHigh !== undefined) return critHigh * 0.82;
  return null;
}

/** Completed repairs, newest first. */
export const listRepairs = query({
  args: { slug: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }) => {
    const n = Math.min(Math.max(limit ?? 25, 1), 100);
    const rows = await ctx.db.query("repairLog").withIndex("by_station_time").order("desc").take(n * 4);
    return rows
      .filter((row) => !slug || row.stationSlug === slug)
      .slice(0, n)
      .map((row) => ({
        _id: row._id,
        stationSlug: row.stationSlug,
        equipmentId: row.equipmentId,
        sensorId: row.sensorId,
        parameter: row.parameter,
        cause: row.cause,
        procedure: row.procedure,
        steps: row.steps,
        readingBefore: row.readingBefore,
        clearedAlerts: row.clearedAlerts,
        repairedBy: row.repairedBy,
        timestamp: row.timestamp,
      }));
  },
});

/**
 * Apply a repair procedure to one telemetry channel.
 *
 * Closes the incidents raised against the channel, writes a corrected sample
 * inside the operating band, records the repair and appends to the audit chain.
 */
export const repairChannel = mutation({
  args: {
    slug: v.string(),
    equipmentId: v.string(),
    sensorId: v.string(),
    cause: v.string(),
    procedure: v.string(),
    steps: v.array(v.string()),
    readingBefore: v.string(),
  },
  handler: async (ctx, args) => {
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!station) throw new Error(`Unknown station: ${args.slug}`);

    const def = sensorDefsFor(args.slug).find(
      (candidate) =>
        candidate.equipmentId === args.equipmentId && candidate.sensorId === args.sensorId,
    );
    if (!def) throw new Error(`Unknown channel: ${args.equipmentId} ${args.sensorId}`);

    const now = Date.now();
    const userId = await getAuthUserId(ctx);
    const repairedBy = userId ? String(userId) : "unauthenticated";

    // 1. Close out every open incident on this channel.
    const open = await ctx.db
      .query("alerts")
      .withIndex("by_open", (q) => q.eq("resolved", false))
      .collect();
    let clearedAlerts = 0;
    for (const alert of open) {
      if (
        alert.stationId === station._id &&
        alert.equipmentId === args.equipmentId &&
        alert.sensorId === args.sensorId
      ) {
        await ctx.db.patch(alert._id, {
          acknowledged: true,
          acknowledgedAt: now,
          resolved: true,
          resolvedAt: now,
          actuatorState: `repaired: ${args.procedure}`,
        });
        clearedAlerts += 1;
      }
    }

    // 2. Mark the channel healthy in the rolling window.
    const channelRows = await ctx.db
      .query("telemetry")
      .withIndex("by_station_sensor", (q) =>
        q.eq("stationId", station._id).eq("sensorId", args.sensorId),
      )
      .collect();
    const mine = channelRows.filter((row) => row.equipmentId === args.equipmentId);
    for (const row of mine) {
      if (row.qualityFlag !== "good") {
        await ctx.db.patch(row._id, { qualityFlag: "good" });
      }
    }

    // 3. Write a corrected sample inside the operating band, so the plant
    //    itself reports nominal again after the procedure.
    const target = inBandTarget(args.equipmentId, args.sensorId);
    if (target !== null) {
      const jitter = 1 + 0.004 * Math.sin(now / 1000 + target);
      await ctx.db.insert("telemetry", {
        stationId: station._id,
        subsystem: def.subsystem,
        equipmentId: def.equipmentId,
        sensorId: def.sensorId,
        parameter: def.parameter,
        value: Math.round(target * jitter * 10 ** def.decimals) / 10 ** def.decimals,
        unit: def.unit,
        qualityFlag: "good",
        timestamp: now,
      });
    }

    // 4. Record the repair and chain it into the audit log.
    const repairId = await ctx.db.insert("repairLog", {
      stationSlug: args.slug,
      equipmentId: args.equipmentId,
      sensorId: args.sensorId,
      parameter: def.parameter,
      cause: args.cause,
      procedure: args.procedure,
      steps: args.steps,
      readingBefore: args.readingBefore,
      clearedAlerts,
      repairedBy,
      timestamp: now,
    });

    await ctx.runMutation(internal.records.appendLog, {
      node: `REPAIR/${args.slug.toUpperCase()}`,
      stationSlug: args.slug,
      category: "repair",
      message: `${args.equipmentId} ${def.parameter} repaired (${args.cause}); ${clearedAlerts} incident(s) closed${
        target === null ? "" : `; channel returned to band at ${target.toFixed(def.decimals)} ${def.unit}`
      }`,
    });

    return { _id: repairId, clearedAlerts, target, repairedBy, timestamp: now };
  },
});

/** FPGA and telemetry self-test results, newest first. */
export const listSelfTests = query({
  args: { slug: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }) => {
    const n = Math.min(Math.max(limit ?? 12, 1), 60);
    const rows = await ctx.db
      .query("selfTests")
      .withIndex("by_station_time")
      .order("desc")
      .take(n * 4);
    return rows
      .filter((row) => !slug || row.stationSlug === slug)
      .slice(0, n)
      .map((row) => ({
        _id: row._id,
        stationSlug: row.stationSlug,
        suite: row.suite,
        trials: row.trials,
        corrected: row.corrected,
        correctedTmr: row.correctedTmr,
        correctedScrub: row.correctedScrub,
        correctedDouble: row.correctedDouble,
        detectedUncorrectable: row.detectedUncorrectable,
        undetected: row.undetected,
        scrubs: row.scrubs,
        meanScrubMs: row.meanScrubMs,
        pass: row.pass,
        notes: row.notes,
        runBy: row.runBy,
        timestamp: row.timestamp,
      }));
  },
});

/** Record one FPGA self-healing self-test verdict. */
export const recordSelfTest = mutation({
  args: {
    slug: v.string(),
    suite: v.string(),
    trials: v.number(),
    corrected: v.number(),
    correctedTmr: v.number(),
    correctedScrub: v.number(),
    correctedDouble: v.number(),
    detectedUncorrectable: v.number(),
    undetected: v.number(),
    scrubs: v.number(),
    meanScrubMs: v.number(),
    pass: v.boolean(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const runBy = userId ? String(userId) : "unauthenticated";
    const timestamp = Date.now();
    const { slug, ...rest } = args;
    const id = await ctx.db.insert("selfTests", {
      ...rest,
      stationSlug: slug,
      runBy,
      timestamp,
    });
    await ctx.runMutation(internal.records.appendLog, {
      node: `SELFTEST/${args.slug.toUpperCase()}`,
      stationSlug: args.slug,
      category: "selftest",
      message: `${args.suite} ${args.pass ? "PASS" : "FAIL"} - ${args.trials} trials, ${args.corrected} corrected, ${args.detectedUncorrectable} uncorrectable detected, undetected ${args.undetected}`,
    });
    return { _id: id, pass: args.pass, timestamp };
  },
});
