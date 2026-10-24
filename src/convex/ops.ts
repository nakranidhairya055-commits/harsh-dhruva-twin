import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** One member of a station roster. */
export interface PersonnelView {
  _id: string;
  badgeId: string;
  name: string;
  role: string;
  sector: string;
  rfidStatus: "valid" | "expired" | "unassigned";
  uhfChannel: string;
  dutyShift: string;
  medStatus: "fit" | "monitor" | "restricted";
  present: boolean;
  lastSync: number;
}

/** Latest microgrid state for one generation source. */
export interface MicrogridSourceView {
  source: string;
  outputKw: number;
  thermalKw: number;
  soc: number;
  loadKw: number;
  timestamp: number;
}

/** Load/supply point on the microgrid trend chart. */
export interface MicrogridPoint {
  timestamp: number;
  loadKw: number;
  outputKw: number;
  thermalKw: number;
}

/** Local environment sample. */
export interface WeatherPoint {
  timestamp: number;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

/** Station roster ordered by sector then role. */
export const listPersonnel = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }): Promise<PersonnelView[]> => {
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!station) return [];
    const rows = await ctx.db
      .query("personnel")
      .withIndex("by_station", (q) => q.eq("stationId", station._id))
      .collect();
    return rows
      .sort((a, b) =>
        a.sector === b.sector
          ? a.role.localeCompare(b.role)
          : a.sector.localeCompare(b.sector),
      )
      .map((p) => ({
        _id: p._id,
        badgeId: p.badgeId,
        name: p.name,
        role: p.role,
        sector: p.sector,
        rfidStatus: p.rfidStatus,
        uhfChannel: p.uhfChannel,
        dutyShift: p.dutyShift,
        medStatus: p.medStatus,
        present: p.present,
        lastSync: p.lastSync,
      }));
  },
});

/** Latest reading per generation source plus a rolling history window. */
export const microgridSnapshot = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }) => {
    const n = Math.min(Math.max(limit ?? 60, 10), 240);
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!station) return { sources: [], history: [], online: false };
    const rows = await ctx.db
      .query("microgridReadings")
      .withIndex("by_station_time", (q) => q.eq("stationId", station._id))
      .collect();

    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const prev = latest.get(row.source);
      if (!prev || row.timestamp > prev.timestamp) latest.set(row.source, row);
    }
    const sources: MicrogridSourceView[] = [...latest.values()]
      .sort((a, b) => a.source.localeCompare(b.source))
      .map((r) => ({
        source: r.source,
        outputKw: r.outputKw,
        thermalKw: r.thermalKw,
        soc: r.soc,
        loadKw: r.loadKw,
        timestamp: r.timestamp,
      }));

    // Aggregate the newest n timestamps into one load/supply trend.
    const byTime = new Map<number, { load: number; output: number; thermal: number }>();
    for (const row of rows) {
      const bucket = byTime.get(row.timestamp) ?? { load: 0, output: 0, thermal: 0 };
      bucket.load = Math.max(bucket.load, row.loadKw);
      bucket.output += row.outputKw;
      bucket.thermal += row.thermalKw;
      byTime.set(row.timestamp, bucket);
    }
    const history: MicrogridPoint[] = [...byTime.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(-n)
      .map(([timestamp, agg]) => ({
        timestamp,
        loadKw: Math.round(agg.load * 10) / 10,
        outputKw: Math.round(agg.output * 10) / 10,
        thermalKw: Math.round(agg.thermal * 10) / 10,
      }));

    return { sources, history, online: sources.length > 0 };
  },
});

/** Automatic weather station history for the local environment screens. */
export const weatherHistory = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }): Promise<WeatherPoint[]> => {
    const n = Math.min(Math.max(limit ?? 60, 10), 240);
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!station) return [];
    const rows = await ctx.db
      .query("weatherReadings")
      .withIndex("by_station_time", (q) => q.eq("stationId", station._id))
      .collect();
    return rows
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-n)
      .map((r) => ({
        timestamp: r.timestamp,
        temperature: r.temperature,
        windSpeed: r.windSpeed,
        windDirection: r.windDirection,
        pressure: r.pressure,
      }));
  },
});

/** Upcoming satellite passes with pointing and link budget. */
export const listPasses = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { slug, limit }) => {
    const n = Math.min(Math.max(limit ?? 8, 1), 24);
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!station) return [];
    const rows = await ctx.db
      .query("satellitePasses")
      .withIndex("by_station_time", (q) => q.eq("stationId", station._id))
      .collect();
    return rows
      .sort((a, b) => a.scheduledAt - b.scheduledAt)
      .slice(0, n)
      .map((p) => ({
        _id: p._id,
        satelliteName: p.satelliteName,
        azimuth: p.azimuth,
        elevation: p.elevation,
        scheduledAt: p.scheduledAt,
        durationSec: p.durationSec,
        linkBudget: p.linkBudget,
      }));
  },
});

/**
 * Surface ice velocity field around a station. Deterministic analytic field
 * (glacier-flow style rotational component plus a katabatic drift) sampled on
 * a grid, returned as magnitude in metres per year.
 */
export const iceVelocity = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!station) return { cells: [], maxMperYear: 0, meanMperYear: 0 };
    const grid = 7;
    const span = 26; // km
    const cells: Array<{
      ix: number;
      iy: number;
      xKm: number;
      yKm: number;
      mPerYear: number;
      bearingDeg: number;
    }> = [];
    let max = 0;
    let sum = 0;
    const coastal = slug === "bharati" ? 1 : 0.55;
    for (let iy = 0; iy < grid; iy += 1) {
      for (let ix = 0; ix < grid; ix += 1) {
        const xKm = ((ix / (grid - 1)) * 2 - 1) * span;
        const yKm = ((iy / (grid - 1)) * 2 - 1) * span;
        const r = Math.hypot(xKm, yKm) / span;
        // Rotational (glacier) component plus katabatic downhill drift.
        const rotational = 34 * (1 - r) * coastal;
        const drift = 9 * Math.cos(xKm / 9 + 0.7);
        const channel = 18 * Math.exp(-Math.pow((xKm + 6) / 7, 2)) * coastal;
        const mag = Math.abs(rotational + drift + channel) + 0.8;
        const bearing =
          (Math.atan2(xKm * 0.55, -yKm - 4) * 180) / Math.PI + 182;
        cells.push({
          ix,
          iy,
          xKm: Math.round(xKm * 10) / 10,
          yKm: Math.round(yKm * 10) / 10,
          mPerYear: Math.round(mag * 10) / 10,
          bearingDeg: Math.round((bearing + 360) % 360),
        });
        max = Math.max(max, mag);
        sum += mag;
      }
    }
    return {
      cells,
      maxMperYear: Math.round(max * 10) / 10,
      meanMperYear: Math.round((sum / cells.length) * 10) / 10,
    };
  },
});

/** Aggregate personnel counters used by the station dashboard header. */
export const personnelSummary = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const station = await ctx.db
      .query("stations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!station) {
      return { total: 0, present: 0, field: 0, expiredBadges: 0, medicalWatch: 0 };
    }
    const rows = await ctx.db
      .query("personnel")
      .withIndex("by_station", (q) => q.eq("stationId", station._id))
      .collect();
    return {
      total: rows.length,
      present: rows.filter((r) => r.present).length,
      field: rows.filter((r) => !r.present).length,
      expiredBadges: rows.filter((r) => r.rfidStatus !== "valid").length,
      medicalWatch: rows.filter((r) => r.medStatus !== "fit").length,
    };
  },
});

/* ------------------------------------------------------------------ */
/* Simulation                                                          */
/* ------------------------------------------------------------------ */

/** Generation sources per station, used by the microgrid simulator. */
export const MICROGRID_SOURCES: Record<string, Array<{ source: string; baseKw: number; thermalKw: number }>> = {
  maitri: [
    { source: "GEN-1", baseKw: 52, thermalKw: 118 },
    { source: "GEN-2", baseKw: 49, thermalKw: 112 },
    { source: "GEN-3", baseKw: 46, thermalKw: 106 },
    { source: "GEN-4", baseKw: 41, thermalKw: 98 },
    { source: "BATTERY-1", baseKw: 18, thermalKw: 0 },
  ],
  bharati: [
    { source: "CHP-1", baseKw: 82, thermalKw: 150 },
    { source: "CHP-2", baseKw: 76, thermalKw: 146 },
    { source: "CHP-3", baseKw: 69, thermalKw: 141 },
    { source: "BATTERY-1", baseKw: 26, thermalKw: 0 },
    { source: "SOLAR-1", baseKw: 12, thermalKw: 4 },
  ],
};

/** Append one microgrid + weather sample per instrumented station. */
export const simulateOpsTick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stations = await ctx.db.query("stations").collect();
    const instrumented = stations.filter(
      (s) => s.slug === "maitri" || s.slug === "bharati",
    );
    const report: string[] = [];

    for (const station of instrumented) {
      const sources = MICROGRID_SOURCES[station.slug] ?? [];
      const phase = station.slug === "maitri" ? 0.4 : 1.7;
      let load = 0;
      for (const src of sources) {
        const wave =
          1 + 0.09 * Math.sin(now / 180_000 + phase + src.baseKw / 37);
        const outputKw = Math.round(src.baseKw * wave * 10) / 10;
        load += src.baseKw;
        await ctx.db.insert("microgridReadings", {
          stationId: station._id,
          source: src.source,
          outputKw,
          thermalKw: Math.round(src.thermalKw * wave),
          soc: Math.round((72 + 14 * Math.sin(now / 900_000 + phase)) * 10) / 10,
          loadKw: 0,
          timestamp: now,
        });
      }
      // Stamp the true station load on every row of this tick.
      const stationLoad = Math.round(load * (0.86 + 0.05 * Math.sin(now / 240_000)) * 10) / 10;
      const tickRows = await ctx.db
        .query("microgridReadings")
        .withIndex("by_station_time", (q) =>
          q.eq("stationId", station._id).eq("timestamp", now),
        )
        .collect();
      for (const row of tickRows) {
        await ctx.db.patch(row._id, { loadKw: stationLoad });
      }

      const tempBase = station.slug === "maitri" ? -18 : -11;
      const windBase = station.slug === "maitri" ? 12 : 9;
      await ctx.db.insert("weatherReadings", {
        stationId: station._id,
        temperature:
          Math.round((tempBase + 4 * Math.sin(now / 600_000) + (Math.random() - 0.5) * 0.8) * 10) / 10,
        windSpeed:
          Math.round((windBase + 7 * Math.sin(now / 420_000 + 1.1) + (Math.random() - 0.5) * 3) * 10) / 10,
        windDirection: Math.round((180 + 60 * Math.sin(now / 780_000)) % 360),
        pressure:
          Math.round((986 + 7 * Math.sin(now / 900_000 + 2.2) + (Math.random() - 0.5) * 1.6) * 10) / 10,
        timestamp: now,
      });

      report.push(station.slug);
    }

    // Keep the rolling windows bounded.
    const cutoff = now - 12 * 60 * 60 * 1000;
    for (const station of instrumented) {
      const staleMicro = await ctx.db
        .query("microgridReadings")
        .withIndex("by_station_time", (q) =>
          q.eq("stationId", station._id).lt("timestamp", cutoff),
        )
        .take(400);
      for (const row of staleMicro) await ctx.db.delete(row._id);
      const staleWeather = await ctx.db
        .query("weatherReadings")
        .withIndex("by_station_time", (q) =>
          q.eq("stationId", station._id).lt("timestamp", cutoff),
        )
        .take(400);
      for (const row of staleWeather) await ctx.db.delete(row._id);
    }

    return report;
  },
});
