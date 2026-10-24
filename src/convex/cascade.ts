import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  cascadeGraph,
  cascadeSummary,
  simulateCascade,
  type CascadeSeverity,
} from "./cascadeGraph";

/**
 * Cascade drill engine.
 *
 * A drill starts from one equipment trigger, propagates through the station
 * dependency graph with the operator's isolation plan applied, and records the
 * outcome. Every run is written to the cascade log and to the hash-chained
 * command log, so a drill is evidence rather than a simulation that scrolls
 * past.
 */

const severityValidator = v.union(
  v.literal("critical"),
  v.literal("warning"),
  v.literal("watch"),
);

/** Dependency graph for a station, with the drill cards. */
export const getTopology = query({
  args: { slug: v.string() },
  handler: async (_ctx, { slug }) => {
    return cascadeGraph(slug).map((node) => ({
      id: node.id,
      label: node.label,
      subsystem: node.subsystem,
      tier: node.tier,
      dependsOn: node.dependsOn,
      redundancy: node.redundancy,
      isolationSec: node.isolationSec,
      impactWeight: node.impactWeight,
      procedure: node.procedure,
    }));
  },
});

/** Recorded cascade drills, newest first. */
export const listRuns = query({
  args: { slug: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }) => {
    const rows = await ctx.db
      .query("cascadeRuns")
      .withIndex("by_time")
      .order("desc")
      .take(Math.min(Math.max(limit ?? 20, 1), 80));
    return rows
      .filter((row) => !slug || row.stationSlug === slug)
      .map((row) => ({
        _id: row._id,
        stationSlug: row.stationSlug,
        triggerId: row.triggerId,
        triggerLabel: row.triggerLabel,
        severity: row.severity,
        impacted: row.impacted,
        isolated: row.isolated,
        minutesBought: row.minutesBought,
        resilience: row.resilience,
        crewRiskNode: row.crewRiskNode,
        recommendation: row.recommendation,
        runBy: row.runBy,
        timestamp: row.timestamp,
      }));
  },
});

/**
 * Run a cascade drill.
 *
 * Returns the full propagation so the console can draw it immediately, and
 * persists the run. `isolations` is the operator's isolation plan: isolated
 * nodes stop propagating downstream, which is exactly what the drill is for.
 */
export const runCascade = mutation({
  args: {
    slug: v.string(),
    triggerId: v.string(),
    severity: severityValidator,
    isolations: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { slug, triggerId, severity, isolations }) => {
    const graph = cascadeGraph(slug);
    if (!graph.some((node) => node.id === triggerId)) {
      throw new Error(`Unknown cascade trigger: ${triggerId}`);
    }
    const result = simulateCascade({
      nodes: graph,
      triggerId,
      severity: severity as CascadeSeverity,
      isolations: isolations ?? [],
    });

    const userId = await getAuthUserId(ctx);
    const runBy = userId ? String(userId) : "unauthenticated";
    const timestamp = Date.now();

    const id = await ctx.db.insert("cascadeRuns", {
      stationSlug: slug,
      triggerId,
      triggerLabel: result.triggerLabel,
      severity,
      impacted: result.impacts.filter((impact) => impact.state === "impacted").length,
      isolated: result.isolated.length,
      minutesBought: result.minutesBought,
      resilience: result.resilience,
      crewRiskNode: result.crewRiskNode ?? undefined,
      recommendation: result.recommendation,
      impacts: result.impacts.map((impact) => ({
        id: impact.id,
        label: impact.label,
        timeToImpactSec: impact.timeToImpactSec,
        probability: impact.probability,
        severity: impact.severity,
        state: impact.state,
      })),
      runBy,
      timestamp,
    });

    await ctx.runMutation(internal.records.appendLog, {
      node: `CASCADE/${slug.toUpperCase()}`,
      stationSlug: slug,
      category: "drill",
      message: cascadeSummary(result),
    });

    // A drill at warning or above also raises the top crew-risk node as an
    // incident, so the drill shows up in triage like any other work item.
    if (result.crewRiskNode && severity !== "watch") {
      const station = await ctx.db
        .query("stations")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (station) {
        const open = await ctx.db
          .query("alerts")
          .withIndex("by_open", (q) => q.eq("resolved", false))
          .collect();
        const already = open.some(
          (alert) =>
            alert.stationId === station._id && alert.equipmentId === result.triggerId,
        );
        if (!already) {
          await ctx.db.insert("alerts", {
            stationId: station._id,
            subsystem: graph.find((node) => node.id === triggerId)?.subsystem ?? "power",
            equipmentId: triggerId,
            severity,
            message: `Cascade drill: ${result.triggerLabel} threatens ${result.crewRiskNode}`,
            sensorReading: `${result.impacts.length} downstream nodes on the drill card`,
            actuatorState: "drill-recorded",
            acknowledged: false,
            resolved: false,
            createdAt: timestamp,
          });
        }
      }
    }

    return { _id: id, ...result };
  },
});
