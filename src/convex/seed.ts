import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { sensorDefsFor, simulateValue } from "./sensors";
import { MICROGRID_SOURCES } from "./ops";
import { GENESIS_HASH, rollingHash } from "./hash";

/**
 * Idempotent seed of the four Indian Antarctic stations. Safe to call again:
 * existing slugs are left untouched. Maitri and Bharati get backfilled
 * telemetry so dashboards have history on first load.
 */
export const seedStations = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, { now }) => {
    const stationSeeds = [
      {
        slug: "maitri",
        name: "Maitri",
        latitude: -70.7644,
        longitude: 11.7342,
        builtYear: 1989,
        capacity: 25,
        status: "operational",
        region: "Schirmacher Oasis, Central Dronning Maud Land",
      },
      {
        slug: "bharati",
        name: "Bharati",
        latitude: -69.4114,
        longitude: 76.1875,
        builtYear: 2012,
        capacity: 47,
        status: "operational",
        region: "Larsemann Hills, North Grovnes Island",
      },
      {
        slug: "dakshin-gangotri",
        name: "Dakshin Gangotri",
        latitude: -70.7492,
        longitude: 11.6681,
        builtYear: 1983,
        capacity: 0,
        status: "buried",
        region: "Central Dronning Maud Land (ice shelf)",
      },
      {
        slug: "maitri-ii",
        name: "Maitri-II (Planned)",
        latitude: -70.75,
        longitude: 11.7,
        builtYear: 2030,
        capacity: 60,
        status: "planned",
        region: "Schirmacher Oasis (replacement station)",
      },
    ];

    let seeded = 0;
    let maitriId: Id<"stations"> | null = null;
    let bharatiId: Id<"stations"> | null = null;

    for (const seed of stationSeeds) {
      const existing = await ctx.db
        .query("stations")
        .withIndex("by_slug", (q) => q.eq("slug", seed.slug))
        .unique();
      if (existing) {
        if (seed.slug === "maitri") maitriId = existing._id;
        if (seed.slug === "bharati") bharatiId = existing._id;
        continue;
      }
      const id = await ctx.db.insert("stations", seed);
      if (seed.slug === "maitri") maitriId = id;
      if (seed.slug === "bharati") bharatiId = id;
      seeded += 1;
    }

    if (!maitriId || !bharatiId) {
      return { seeded, backfilled: 0 };
    }

    // Backfill ~25 minutes of history at 30-second steps for both stations.
    const stationsToSeed: Array<{ id: Id<"stations">; slug: string }> = [
      { id: maitriId, slug: "maitri" },
      { id: bharatiId, slug: "bharati" },
    ];

    let backfilled = 0;
    const existingRows = await ctx.db.query("telemetry").take(1);
    if (existingRows.length === 0) {
      const steps = 50; // 50 x 30s = 25 minutes
      for (const st of stationsToSeed) {
        const defs = sensorDefsFor(st.slug);
        for (let i = steps; i >= 1; i -= 1) {
          const t = now - i * 30_000;
          for (const def of defs) {
            await ctx.db.insert("telemetry", {
              stationId: st.id,
              subsystem: def.subsystem,
              equipmentId: def.equipmentId,
              sensorId: def.sensorId,
              parameter: def.parameter,
              value: simulateValue(def, t, Math.random),
              unit: def.unit,
              qualityFlag: "good",
              timestamp: t,
            });
            backfilled += 1;
          }
        }
      }
    }

    return { seeded, backfilled };
  },
});

/* ------------------------------------------------------------------ */
/* Operations seed                                                     */
/* ------------------------------------------------------------------ */

/** Duty roles present on a winter-over roster, with sector and shift. */
const ROSTER_ROLES: Array<{ role: string; sector: string; shift: string }> = [
  { role: "Station Leader", sector: "Habitation", shift: "Alpha" },
  { role: "Station Engineer", sector: "Habitation", shift: "Alpha" },
  { role: "Medical Officer", sector: "Habitation", shift: "Alpha" },
  { role: "Chef", sector: "Habitation", shift: "Charlie" },
  { role: "Carpenter", sector: "Habitation", shift: "Charlie" },
  { role: "Electrical Engineer", sector: "Power Gen Bay", shift: "Bravo" },
  { role: "Power Plant Operator", sector: "Power Gen Bay", shift: "Bravo" },
  { role: "Thermal Systems Technician", sector: "Power Gen Bay", shift: "Charlie" },
  { role: "Glaciologist", sector: "Science Wing", shift: "Alpha" },
  { role: "Meteorologist", sector: "Science Wing", shift: "Bravo" },
  { role: "Oceanographer", sector: "Science Wing", shift: "Charlie" },
  { role: "Atmospheric Scientist", sector: "Science Wing", shift: "Alpha" },
  { role: "Lab Analyst", sector: "Science Wing", shift: "Bravo" },
  { role: "Ice Core Technician", sector: "Science Wing", shift: "Charlie" },
  { role: "Survey Technician", sector: "Science Wing", shift: "Alpha" },
  { role: "Comms Officer", sector: "Comms", shift: "Bravo" },
  { role: "Network Technician", sector: "Comms", shift: "Alpha" },
  { role: "Vehicle Fleet Operator", sector: "Field Support", shift: "Bravo" },
  { role: "Field Camp Coordinator", sector: "Field Support", shift: "Charlie" },
  { role: "Mechanic", sector: "Field Support", shift: "Alpha" },
  { role: "Helicopter Crew", sector: "Field Support", shift: "Bravo" },
  { role: "Fuel Farm Supervisor", sector: "Fuel Farm", shift: "Alpha" },
  { role: "Plumber", sector: "Water Systems", shift: "Bravo" },
  { role: "Store Keeper", sector: "Logistics", shift: "Charlie" },
  { role: "Crane Operator", sector: "Logistics", shift: "Charlie" },
  { role: "Safety Officer", sector: "Safety", shift: "Bravo" },
];

/** Surname pool for the roster. Initials only, no individual is identified. */
const SURNAMES = [
  "Kulkarni", "Nair", "Bhattacharya", "Reddy", "Iyer", "Mehta",
  "Chauhan", "Das", "Joshi", "Pillai", "Verma", "Bose", "Rathore",
  "Sethi", "Mukherjee", "Menon", "Kaul", "Naik", "Chandra", "Ghosh",
  "Bansal", "Tiwari", "Fernandes", "Dhillon", "Rao", "Sinha", "Mishra",
  "Kapoor", "Ahluwalia", "Pathak", "Shetty", "Barman", "Kohli", "Saxena",
  "Deshmukh", "Boruah", "Zacharia", "Thakur", "Prasad", "Vaidya",
];
const INITIALS = ["A", "B", "C", "D", "G", "H", "J", "K", "M", "N", "P", "R", "S", "T", "V"];

/** Build one station roster deterministically. */
function buildRoster(
  code: string,
  count: number,
  offset: number,
  now: number,
) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const role = ROSTER_ROLES[i % ROSTER_ROLES.length];
    const surname = SURNAMES[(i * 7 + offset) % SURNAMES.length];
    const initial = INITIALS[(i * 5 + offset) % INITIALS.length];
    const medStatus = i % 11 === 4 ? "monitor" : i % 17 === 9 ? "restricted" : "fit";
    const rfidStatus = i % 13 === 6 ? "expired" : i % 19 === 3 ? "unassigned" : "valid";
    rows.push({
      badgeId: `${code}-${String(1000 + i * 7 + offset * 3).padStart(4, "0")}`,
      name: `${surname}, ${initial}.`,
      role: role.role,
      sector: role.sector,
      rfidStatus: rfidStatus as "valid" | "expired" | "unassigned",
      uhfChannel: `UHF-${(i % 6) + 1}`,
      medStatus: medStatus as "fit" | "monitor" | "restricted",
      dutyShift: role.shift,
      present: i % 7 !== 5,
      lastSync: now - (i % 9) * 45_000,
    });
  }
  return rows;
}

/** Reference documents published by NCPOR and the wider Antarctic programme. */
const DOCUMENT_SEED: Array<{
  title: string;
  category: string;
  url: string;
  summary: string;
  npdcStandard?: string;
  tags: string[];
  daysAgo: number;
}> = [
  {
    title: "The Antarctic Treaty",
    category: "Policy",
    url: "https://www.ats.aq/e/antarctictreaty.html",
    summary:
      "The 1959 treaty that reserves the continent for peaceful purposes and scientific investigation, and the instrument under which the Indian Antarctic Programme operates.",
    tags: ["treaty", "governance", "international"],
    daysAgo: 640,
  },
  {
    title: "Protocol on Environmental Protection (Madrid Protocol)",
    category: "Protocol",
    url: "https://www.ats.aq/e/protocol.html",
    summary:
      "Designates Antarctica as a natural reserve devoted to peace and science and sets the environmental impact assessment obligations behind every station activity.",
    tags: ["environment", "impact assessment", "protocol"],
    daysAgo: 590,
  },
  {
    title: "Committee on Antarctic Governance and Environmental Protection Guidelines",
    category: "Policy",
    url: "https://www.moes.gov.in/",
    summary:
      "Ministry of Earth Sciences guidelines governing Indian Antarctic expeditions, station operations and environmental stewardship.",
    tags: ["governance", "moes", "expedition"],
    daysAgo: 420,
  },
  {
    title: "NPDC Data Submission Standard for Polar Datasets",
    category: "Data Standard",
    url: "https://www.ncpor.res.in/",
    summary:
      "Mandatory metadata fields, controlled vocabularies and file naming rules for datasets submitted to the National Polar Data Centre.",
    npdcStandard: "NPDC-DS-01",
    tags: ["metadata", "npdc", "submission"],
    daysAgo: 300,
  },
  {
    title: "CF Conventions for Climate and Forecast Metadata",
    category: "Data Standard",
    url: "http://cfconventions.org/",
    summary:
      "Coordinate, grid and parameter naming conventions applied to every NetCDF package exported from the platform.",
    npdcStandard: "NPDC-DS-02",
    tags: ["netcdf", "cf", "metadata"],
    daysAgo: 280,
  },
  {
    title: "WMO GTS Data Exchange Formats",
    category: "Data Standard",
    url: "https://community.wmo.int/",
    summary:
      "Bulletin formats and coding practice for routing automatic weather station observations to the global telecommunication system.",
    npdcStandard: "NPDC-DS-05",
    tags: ["wmo", "gts", "weather"],
    daysAgo: 260,
  },
  {
    title: "SCAR Data Policy",
    category: "Policy",
    url: "https://www.scar.org/",
    summary:
      "Scientific Committee on Antarctic Research policy on open and timely access to Antarctic data.",
    tags: ["scar", "open data", "policy"],
    daysAgo: 240,
  },
  {
    title: "Antarctic Meteorological Data Management Guide",
    category: "Field Manual",
    url: "https://www.scar.org/",
    summary:
      "Instrument siting, calibration intervals and quality flagging procedure for automatic weather stations on the ice sheet.",
    npdcStandard: "NPDC-DS-03",
    tags: ["weather", "calibration", "qa"],
    daysAgo: 210,
  },
  {
    title: "Field Party Safety and Communication Protocol",
    category: "Field Manual",
    url: "https://www.ncpor.res.in/",
    summary:
      "Check-in cadence, UHF channel plan, Iridium SBD fallback procedure and search-and-rescue escalation for field parties beyond station limits.",
    tags: ["safety", "iridium", "field party"],
    daysAgo: 180,
  },
  {
    title: "Fuel Handling and Hazardous Goods Procedure",
    category: "Field Manual",
    url: "https://www.ncpor.res.in/",
    summary:
      "Bulk fuel transfer, bunding and leak response requirements for the station fuel farms and day tanks.",
    tags: ["fuel", "hazard", "procedure"],
    daysAgo: 150,
  },
  {
    title: "Water System Freeze Protection Manual",
    category: "Field Manual",
    url: "https://www.ncpor.res.in/",
    summary:
      "Trace heating inspection intervals and pipeline thaw recovery steps, including the 45 minute freeze window on the Lake Priyadarshini line.",
    tags: ["water", "thermal", "freeze"],
    daysAgo: 120,
  },
  {
    title: "Schirmacher Oasis Glacial and Lake Systems Report",
    category: "Scientific Report",
    url: "https://www.ncpor.res.in/",
    summary:
      "Long-term monitoring results for the freshwater lakes of the Schirmacher Oasis including Lake Priyadarshini.",
    tags: ["limnology", "schirmacher", "maitri"],
    daysAgo: 96,
  },
  {
    title: "Larsemann Hills Coastal Environment Assessment",
    category: "Scientific Report",
    url: "https://www.ncpor.res.in/",
    summary:
      "Baseline assessment of the Larsemann Hills lake district, Thala Fjord and Quilty Bay in the Bharati operating area.",
    tags: ["coastal", "larsemann", "bharati"],
    daysAgo: 72,
  },
  {
    title: "Antarctic Sea Ice Extent and Katabatic Wind Study",
    category: "Scientific Report",
    url: "https://www.ncpor.res.in/",
    summary:
      "Analysis of katabatic wind episodes above 150 km/h and their effect on satellite link availability at coastal stations.",
    tags: ["katabatic", "comms", "sea ice"],
    daysAgo: 54,
  },
  {
    title: "Microbial Ecology of Antarctic Lake Sediments",
    category: "Scientific Report",
    url: "https://www.ncpor.res.in/",
    summary:
      "Sampling protocol and results for sediment microbial communities in the coastal lake systems.",
    tags: ["biology", "limnology", "sampling"],
    daysAgo: 36,
  },
  {
    title: "NCPOR Polar Data Centre Catalogue Guide",
    category: "Policy",
    url: "https://www.ncpor.res.in/",
    summary:
      "How datasets are registered, versioned and cited once deposited with the National Polar Data Centre.",
    npdcStandard: "NPDC-DS-04",
    tags: ["npdc", "catalogue", "citation"],
    daysAgo: 18,
  },
];

/** Research themes cycled across the expedition log. */
const EXPEDITION_FOCUS = [
  "station establishment and resupply",
  "geological mapping of the Schirmacher Oasis",
  "glaciological mass balance survey",
  "meteorological and ozone monitoring",
  "Southern Ocean biological productivity",
  "sea ice and coastal oceanography",
  "geomagnetic and seismological observation",
  "lake and ice core palaeoclimate sampling",
  "station modernisation and container construction",
  "polar microgrid and renewable integration trials",
];

/** Satellites used for the pass scheduler. */
const PASS_SATELLITES = [
  "IRS-1D (VSAT relay)",
  "INSAT-3DR",
  "SCATSAT-1",
  "Oceansat-2",
  "Cartosat-3",
  "NOAA-20",
];

/** Audit-chain templates replayed into the command log. */
const AUDIT_TEMPLATE: Array<{ category: string; node: string; message: string }> = [
  { category: "auth", node: "AUTH/GATEWAY", message: "Operator session opened against station relay" },
  { category: "telemetry", node: "SENSOR/SIM", message: "Ten second telemetry tick committed for all instrumented channels" },
  { category: "alerts", node: "ALERT/EVAL", message: "Threshold evaluation completed with no unreconciled breaches" },
  { category: "comms", node: "VSAT/LINK", message: "Uplink synced - buffered telemetry forwarded to NCPOR data centre" },
  { category: "power", node: "MICROGRID/CTRL", message: "Duty generator rotation verified against station load" },
  { category: "safety", node: "SAFETY/WATCH", message: "Hydrocarbon detector and smoke channel self-test passed" },
  { category: "thermal", node: "WATER/TRACE", message: "Trace heating current draw inside nominal band" },
  { category: "npdc", node: "NPDC/EXPORT", message: "Metadata package validated against NPDC submission standard" },
  { category: "field", node: "FIELD/PARTY", message: "Field party check-in received from UHF relay" },
  { category: "structural", node: "TWIN/RENDER", message: "Digital twin geometry revision published to operators" },
  { category: "compliance", node: "ENV/AUDIT", message: "Environmental log reviewed - no deviation recorded" },
  { category: "queue", node: "EDGE/QUEUE", message: "Priority queue reconciled after uplink window closed" },
];

/**
 * Idempotent seed of the operations data set: rosters, microgrid and weather
 * history, satellite pass schedule, NCPOR library, the full ISEA expedition
 * log and the initial audit chain.
 */
export const seedOperations = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, { now }) => {
    const stations = await ctx.db.query("stations").collect();
    const bySlug = new Map(stations.map((s) => [s.slug, s]));
    const maitri = bySlug.get("maitri");
    const bharati = bySlug.get("bharati");
    const result = {
      personnel: 0,
      microgrid: 0,
      weather: 0,
      passes: 0,
      documents: 0,
      expeditions: 0,
      audit: 0,
    };

    /* ---- Personnel ---- */
    const rosters: Array<{ id: Id<"stations">; code: string; count: number; offset: number }> = [];
    if (maitri) rosters.push({ id: maitri._id, code: "MTQ", count: 26, offset: 0 });
    if (bharati) rosters.push({ id: bharati._id, code: "BRT", count: 34, offset: 11 });
    for (const r of rosters) {
      const existing = await ctx.db
        .query("personnel")
        .withIndex("by_station", (q) => q.eq("stationId", r.id))
        .take(1);
      if (existing.length > 0) continue;
      for (const row of buildRoster(r.code, r.count, r.offset, now)) {
        await ctx.db.insert("personnel", { stationId: r.id, ...row });
        result.personnel += 1;
      }
    }

    /* ---- Microgrid + weather history (60 minutes at 60 second steps) ---- */
    for (const station of [maitri, bharati]) {
      if (!station) continue;
      const existing = await ctx.db
        .query("microgridReadings")
        .withIndex("by_station_time", (q) => q.eq("stationId", station._id))
        .collect();
      // A sparse window (only a few live ticks so far) is replaced with a full
      // 60 minute backfill so the command charts have history on first load.
      if (existing.length >= 30) continue;
      for (const row of existing) await ctx.db.delete(row._id);
      const existingWeather = await ctx.db
        .query("weatherReadings")
        .withIndex("by_station_time", (q) => q.eq("stationId", station._id))
        .collect();
      for (const row of existingWeather) await ctx.db.delete(row._id);
      const sources = MICROGRID_SOURCES[station.slug] ?? [];
      const tempBase = station.slug === "maitri" ? -18 : -11;
      const windBase = station.slug === "maitri" ? 12 : 9;
      const phase = station.slug === "maitri" ? 0.4 : 1.7;
      for (let i = 60; i >= 1; i -= 1) {
        const t = now - i * 60_000;
        let nominal = 0;
        for (const src of sources) {
          const wave = 1 + 0.09 * Math.sin(t / 180_000 + phase + src.baseKw / 37);
          nominal += src.baseKw;
          await ctx.db.insert("microgridReadings", {
            stationId: station._id,
            source: src.source,
            outputKw: Math.round(src.baseKw * wave * 10) / 10,
            thermalKw: Math.round(src.thermalKw * wave),
            soc: Math.round((72 + 14 * Math.sin(t / 900_000 + phase)) * 10) / 10,
            loadKw: Math.round(nominal * (0.86 + 0.05 * Math.sin(t / 240_000)) * 10) / 10,
            timestamp: t,
          });
          result.microgrid += 1;
        }
        await ctx.db.insert("weatherReadings", {
          stationId: station._id,
          temperature: Math.round((tempBase + 4 * Math.sin(t / 600_000)) * 10) / 10,
          windSpeed: Math.round((windBase + 7 * Math.sin(t / 420_000 + 1.1)) * 10) / 10,
          windDirection: Math.round((180 + 60 * Math.sin(t / 780_000)) % 360),
          pressure: Math.round((986 + 7 * Math.sin(t / 900_000 + 2.2)) * 10) / 10,
          timestamp: t,
        });
        result.weather += 1;
      }

      /* ---- Satellite pass schedule ---- */
      const existingPasses = await ctx.db
        .query("satellitePasses")
        .withIndex("by_station_time", (q) => q.eq("stationId", station._id))
        .take(1);
      if (existingPasses.length === 0) {
        for (let i = 0; i < PASS_SATELLITES.length; i += 1) {
          await ctx.db.insert("satellitePasses", {
            stationId: station._id,
            satelliteName: PASS_SATELLITES[i],
            azimuth: Math.round((station.longitude * 3 + i * 47) % 360),
            elevation: Math.round((18 + ((i * 13) % 62)) * 10) / 10,
            scheduledAt: now + (i + 1) * 3.2 * 60 * 60 * 1000,
            durationSec: 240 + i * 165,
            linkBudget: Math.round((186 - i * 4.5 - (station.slug === "maitri" ? 6 : 0)) * 10) / 10,
          });
          result.passes += 1;
        }
      }
    }

    /* ---- NCPOR library ---- */
    const existingDocs = await ctx.db.query("documents").take(1);
    if (existingDocs.length === 0) {
      for (const doc of DOCUMENT_SEED) {
        await ctx.db.insert("documents", {
          title: doc.title,
          category: doc.category,
          url: doc.url,
          summary: doc.summary,
          npdcStandard: doc.npdcStandard,
          tags: doc.tags,
          publishedAt: now - doc.daysAgo * 24 * 60 * 60 * 1000,
        });
        result.documents += 1;
      }
    }

    /* ---- ISEA expedition log (46 expeditions) ---- */
    const existingExpeditions = await ctx.db.query("expeditions").take(1);
    if (existingExpeditions.length === 0) {
      for (let n = 1; n <= 46; n += 1) {
        const focus = EXPEDITION_FOCUS[(n - 1) % EXPEDITION_FOCUS.length];
        const teamSize = 24 + ((n * 11) % 52);
        const stationSlug = n <= 8 ? "dakshin-gangotri" : n <= 31 ? "maitri" : "bharati";
        const stationName =
          stationSlug === "dakshin-gangotri"
            ? "Dakshin Gangotri"
            : stationSlug === "maitri"
              ? "Maitri"
              : "Bharati";
        const leaderRole =
          n <= 8
            ? "Expedition Leader"
            : n <= 31
              ? "Station Commander"
              : "Deputy Expedition Leader";
        await ctx.db.insert("expeditions", {
          number: n,
          year: `${1980 + n}-${String(1981 + n).slice(2)}`,
          teamSize,
          focus,
          summary: `ISEA-${n} deployed ${teamSize} personnel to ${stationName} with the programme focus on ${focus}. Instrumented observations were logged on station and deposited with the National Polar Data Centre at the close of the season.`,
          stationSlug,
          leaderRole,
        });
        result.expeditions += 1;
      }
    }

    /* ---- Audit chain ---- */
    const existingLogs = await ctx.db.query("commandLogs").take(1);
    if (existingLogs.length === 0) {
      let prevHash = GENESIS_HASH;
      for (let i = 0; i < 48; i += 1) {
        const tpl = AUDIT_TEMPLATE[i % AUDIT_TEMPLATE.length];
        const stationSlug = i % 3 === 2 ? "bharati" : "maitri";
        const sequence = i + 1;
        const timestamp = now - (48 - i) * 15 * 60 * 1000;
        const message = `${tpl.message} (${stationSlug})`;
        const payload = [sequence, tpl.node, tpl.category, message, timestamp].join("|");
        const hash = rollingHash(prevHash, payload);
        await ctx.db.insert("commandLogs", {
          sequence,
          node: tpl.node,
          stationSlug,
          category: tpl.category,
          message,
          timestamp,
          hash,
          prevHash,
        });
        prevHash = hash;
        result.audit += 1;
      }
    }

    return result;
  },
});
