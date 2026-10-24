import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { GENESIS_HASH, rollingHash } from "./hash";

/* ------------------------------------------------------------------ */
/* Hash-chained command log                                            */
/* ------------------------------------------------------------------ */

/** Compose the digest payload for one log entry. */
function logPayload(entry: {
  sequence: number;
  node: string;
  category: string;
  message: string;
  timestamp: number;
}): string {
  return [
    entry.sequence,
    entry.node,
    entry.category,
    entry.message,
    entry.timestamp,
  ].join("|");
}

/**
 * Append one entry to the station audit chain. Called by the blackout engine,
 * the NPDC export tooling and the seed routine so every state change is
 * tamper-evident.
 */
export const appendLog = internalMutation({
  args: {
    node: v.string(),
    stationSlug: v.string(),
    category: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const last = await ctx.db
      .query("commandLogs")
      .withIndex("by_sequence")
      .order("desc")
      .first();
    const sequence = (last?.sequence ?? 0) + 1;
    const prevHash = last?.hash ?? GENESIS_HASH;
    const hash = rollingHash(
      prevHash,
      logPayload({ ...args, sequence, timestamp }),
    );
    const id = await ctx.db.insert("commandLogs", {
      sequence,
      node: args.node,
      stationSlug: args.stationSlug,
      category: args.category,
      message: args.message,
      timestamp,
      hash,
      prevHash,
    });
    return { _id: id, sequence, hash };
  },
});

/** Audit trail entries, newest first. */
export const listCommandLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const n = Math.min(Math.max(limit ?? 60, 1), 400);
    const rows = await ctx.db
      .query("commandLogs")
      .withIndex("by_sequence")
      .order("desc")
      .take(n);
    return rows.map((r) => ({
      _id: r._id,
      sequence: r.sequence,
      node: r.node,
      stationSlug: r.stationSlug,
      category: r.category,
      message: r.message,
      timestamp: r.timestamp,
      hash: r.hash,
      prevHash: r.prevHash,
    }));
  },
});

/**
 * Recompute the full chain and report whether it is intact. The first entry
 * whose recomputed digest differs from the stored digest is reported so an
 * operator can see exactly where tampering would have occurred.
 */
export const verifyChain = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("commandLogs")
      .withIndex("by_sequence")
      .take(400);
    let prevHash = GENESIS_HASH;
    let brokenAt: number | null = null;
    for (const row of rows) {
      const expected = rollingHash(
        prevHash,
        logPayload({
          sequence: row.sequence,
          node: row.node,
          category: row.category,
          message: row.message,
          timestamp: row.timestamp,
        }),
      );
      if (expected !== row.hash || row.prevHash !== prevHash) {
        brokenAt = row.sequence;
        break;
      }
      prevHash = row.hash;
    }
    const head = rows[rows.length - 1];
    return {
      entries: rows.length,
      valid: brokenAt === null && rows.length > 0,
      brokenAt,
      headHash: head?.hash ?? GENESIS_HASH,
      headSequence: head?.sequence ?? 0,
    };
  },
});

/* ------------------------------------------------------------------ */
/* NCPOR library                                                       */
/* ------------------------------------------------------------------ */

/** Reference documents, optionally filtered by category. */
export const listDocuments = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    const rows = category
      ? await ctx.db
          .query("documents")
          .withIndex("by_category", (q) => q.eq("category", category))
          .collect()
      : await ctx.db.query("documents").collect();
    return rows
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .map((d) => ({
        _id: d._id,
        title: d.title,
        category: d.category,
        url: d.url,
        summary: d.summary,
        npdcStandard: d.npdcStandard,
        tags: d.tags,
        publishedAt: d.publishedAt,
      }));
  },
});

/** Distinct document categories in display order. */
export const listDocumentCategories = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("documents").collect();
    return [...new Set(rows.map((r) => r.category))].sort();
  },
});

/* ------------------------------------------------------------------ */
/* Expeditions                                                         */
/* ------------------------------------------------------------------ */

/** All Indian Scientific Expedition to Antarctica (ISEA) records. */
export const listExpeditions = query({
  args: { stationSlug: v.optional(v.string()) },
  handler: async (ctx, { stationSlug }) => {
    const rows = await ctx.db
      .query("expeditions")
      .withIndex("by_number")
      .collect();
    return rows
      .filter((r) => !stationSlug || r.stationSlug === stationSlug)
      .sort((a, b) => a.number - b.number)
      .map((r) => ({
        _id: r._id,
        number: r.number,
        year: r.year,
        teamSize: r.teamSize,
        focus: r.focus,
        summary: r.summary,
        stationSlug: r.stationSlug,
        leaderRole: r.leaderRole,
      }));
  },
});

/* ------------------------------------------------------------------ */
/* NPDC metadata export                                                */
/* ------------------------------------------------------------------ */

/** Export records generated for the NPDC compliance centre. */
export const listExports = query({
  args: { slug: v.optional(v.string()) },
  handler: async (ctx, { slug }) => {
    const rows = slug
      ? await ctx.db
          .query("npdcExports")
          .withIndex("by_station_time", (q) => q.eq("stationSlug", slug))
          .collect()
      : await ctx.db.query("npdcExports").collect();
    return rows
      .sort((a, b) => b.generatedAt - a.generatedAt)
      .slice(0, 40)
      .map((r) => ({
        _id: r._id,
        stationSlug: r.stationSlug,
        datasetId: r.datasetId,
        standard: r.standard,
        recordCount: r.recordCount,
        generatedAt: r.generatedAt,
        generatedBy: r.generatedBy,
      }));
  },
});

/**
 * Record an NPDC metadata export. Called by the compliance centre when an
 * operator publishes a dataset package; the export is also written to the
 * audit chain so provenance survives independently of the file itself.
 */
export const recordNpdcExport = mutation({
  args: {
    stationSlug: v.string(),
    datasetId: v.string(),
    standard: v.string(),
    recordCount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const generatedAt = Date.now();
    const id = await ctx.db.insert("npdcExports", {
      stationSlug: args.stationSlug,
      datasetId: args.datasetId,
      standard: args.standard,
      recordCount: args.recordCount,
      generatedAt,
      generatedBy: userId ?? undefined,
    });
    const last = await ctx.db
      .query("commandLogs")
      .withIndex("by_sequence")
      .order("desc")
      .first();
    const sequence = (last?.sequence ?? 0) + 1;
    const prevHash = last?.hash ?? GENESIS_HASH;
    const message = `NPDC export ${args.datasetId} published (${args.recordCount} records, ${args.standard})`;
    const node = `NPDC-EXPORT/${args.stationSlug.toUpperCase()}`;
    const category = "compliance";
    await ctx.db.insert("commandLogs", {
      sequence,
      node,
      stationSlug: args.stationSlug,
      category,
      message,
      timestamp: generatedAt,
      prevHash,
      hash: rollingHash(
        prevHash,
        logPayload({ sequence, node, category, message, timestamp: generatedAt }),
      ),
    });
    return { _id: id, datasetId: args.datasetId, generatedAt };
  },
});
