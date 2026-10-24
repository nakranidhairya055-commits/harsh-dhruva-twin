import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Wildlife sightings.
 *
 * The twin places the animals; this table records the actual observations.
 * A sighting is an operational record, not a decoration: it carries the count,
 * the location, the observer and the time, and it is appended to the audit
 * chain so the station's wildlife log is tamper-evident like the rest of the
 * console. Field parties and the summer campaign work from these entries when
 * they report disturbance or colony counts.
 */

/** Recorded sightings, newest first, with a per-species census. */
export const listSightings = query({
  args: { slug: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }) => {
    const n = Math.min(Math.max(limit ?? 30, 1), 120);
    const rows = await ctx.db
      .query("sightings")
      .withIndex("by_time")
      .order("desc")
      .take(n * 4);
    const filtered = rows.filter((row) => !slug || row.stationSlug === slug);
    const sightings = filtered.slice(0, n).map((row) => ({
      _id: row._id,
      stationSlug: row.stationSlug,
      speciesId: row.speciesId,
      speciesName: row.speciesName,
      count: row.count,
      location: row.location,
      note: row.note,
      observer: row.observer,
      timestamp: row.timestamp,
    }));

    // Census: total counted per species over the retained window.
    const census: Record<string, { count: number; sightings: number; lastAt: number }> = {};
    for (const row of filtered) {
      const entry = census[row.speciesId] ?? { count: 0, sightings: 0, lastAt: 0 };
      entry.count += row.count;
      entry.sightings += 1;
      entry.lastAt = Math.max(entry.lastAt, row.timestamp);
      census[row.speciesId] = entry;
    }

    return { sightings, census };
  },
});

/**
 * Record one wildlife sighting.
 *
 * Written by an operator at the console or from the twin, and chained into the
 * audit log so the count and the observer survive with the record.
 */
export const recordSighting = mutation({
  args: {
    slug: v.string(),
    speciesId: v.string(),
    speciesName: v.string(),
    count: v.number(),
    location: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!station) throw new Error(`Unknown station: ${args.slug}`);

    const userId = await getAuthUserId(ctx);
    const observer = userId ? String(userId) : "unauthenticated";
    const timestamp = Date.now();
    const count = Math.max(1, Math.round(args.count));

    const id = await ctx.db.insert("sightings", {
      stationSlug: args.slug,
      speciesId: args.speciesId,
      speciesName: args.speciesName,
      count,
      location: args.location,
      note: args.note ?? "Sighting recorded from the digital twin.",
      observer,
      timestamp,
    });

    await ctx.runMutation(internal.records.appendLog, {
      node: `WILDLIFE/${args.slug.toUpperCase()}`,
      stationSlug: args.slug,
      category: "sighting",
      message: `${args.speciesName} sighting recorded: ${count} at ${args.location}`,
    });

    return { _id: id, count, timestamp };
  },
});

/** Most sighted species at a station over the retained window. */
export const topSpecies = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }) => {
    const rows = await ctx.db
      .query("sightings")
      .withIndex("by_station_time", (q) => q.eq("stationSlug", slug))
      .order("desc")
      .take(400);
    const tally = new Map<string, { speciesId: string; speciesName: string; count: number }>();
    for (const row of rows) {
      const entry = tally.get(row.speciesId) ?? {
        speciesId: row.speciesId,
        speciesName: row.speciesName,
        count: 0,
      };
      entry.count += row.count;
      tally.set(row.speciesId, entry);
    }
    return [...tally.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.min(Math.max(limit ?? 8, 1), 24));
  },
});
