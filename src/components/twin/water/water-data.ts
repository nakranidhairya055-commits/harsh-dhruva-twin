/**
 * Interactive water catalogue.
 *
 * Every water body in the twin carries the measurements the station actually
 * acts on: surface temperature, ice thickness, depth, purity or salinity,
 * intake status and the trace heating state on any heated line. The twelve
 * month ice coverage series drives the seasonal chart in each panel, and the
 * live telemetry link joins the panel to the running sensor simulation.
 */

export interface WaterMetric {
  label: string;
  value: string;
  note?: string;
}

export interface WaterAction {
  id: "underwater" | "icebergs" | "pumphouse" | "floes" | "lakes" | "samples" | "pipe";
  label: string;
}

export interface FloeDef {
  x: number;
  z: number;
  r: number;
  /** Numbered marker shown while the iceberg tracker is active. */
  marker?: number;
  /** Mass in tonnes, reported in the tracker panel. */
  massTonnes?: number;
  driftDeg?: number;
}

export interface WaterBodyDef {
  id: string;
  station: "maitri" | "bharati";
  name: string;
  subtitle: string;
  kind: "lake" | "fjord" | "bay" | "lakelet" | "intake";
  /** Centre of the body in station-local metres. */
  position: [number, number];
  /** Half extents in metres along x and z. */
  radius: [number, number];
  depthM: number;
  maxDepthM?: number;
  surfaceY?: number;
  /** Deep and shallow water tones for the wave shader. */
  deep: string;
  shallow: string;
  seabed: string;
  waveAmp: number;
  waveSpeed: number;
  metrics: WaterMetric[];
  /** Twelve monthly ice coverage values, oldest first. */
  iceCoverage: number[];
  /** Ice thickness in centimetres, used by the heatmap overlay. */
  iceThicknessCm: number;
  actions: WaterAction[];
  floes: FloeDef[];
  underwater: { rocks: number; fish: number; intakePipe: boolean; vegetation: boolean };
  live?: { tag: string; parameter: string };
}

const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];

/** Month labels for the ice coverage chart. */
export const ICE_MONTHS = MONTHS;

/* ------------------------------------------------------------------ */
/* Maitri: Lake Priyadarshini                                           */
/* ------------------------------------------------------------------ */

const PRIYADARSHINI: WaterBodyDef = {
  id: "priyadarshini",
  station: "maitri",
  name: "Lake Priyadarshini",
  subtitle: "Maitri freshwater supply - Schirmacher Oasis",
  kind: "lake",
  position: [-38, 26],
  radius: [40, 25],
  depthM: 4.2,
  maxDepthM: 6.1,
  deep: "#0B2A3E",
  shallow: "#1D5E72",
  seabed: "#2A3F4A",
  waveAmp: 0.05,
  waveSpeed: 0.55,
  metrics: [
    { label: "Surface temperature", value: "1.2 C", note: "live from the lake thermistor chain" },
    { label: "Ice thickness at shore", value: "45 cm" },
    { label: "Ice thickness at centre", value: "82 cm" },
    { label: "Water purity", value: "98.2 %", note: "after reverse osmosis" },
    { label: "pH", value: "7.4" },
    { label: "Depth at centre", value: "4.2 m" },
    { label: "Depth at shore", value: "0.8 m" },
    { label: "Volume", value: "178,000 m3" },
    { label: "Flow to station", value: "12 L/min" },
    { label: "Trace heating", value: "ACTIVE", note: "4.8 ohm loop, 6.2 A" },
    { label: "Days to complete freeze", value: "24 days", note: "target 95% accuracy" },
  ],
  iceCoverage: [92, 96, 99, 100, 100, 100, 100, 100, 98, 92, 78, 62],
  iceThicknessCm: 82,
  actions: [
    { id: "underwater", label: "Underwater view" },
    { id: "pumphouse", label: "View pumphouse" },
  ],
  floes: [
    { x: -9, z: 2, r: 1.6, marker: 1, massTonnes: 34, driftDeg: 12 },
    { x: 5, z: -4, r: 2.1, marker: 2, massTonnes: 61, driftDeg: 28 },
    { x: 11, z: 3, r: 2.6, marker: 3, massTonnes: 96, driftDeg: 44 },
  ],
  underwater: { rocks: 14, fish: 8, intakePipe: true, vegetation: true },
  live: { tag: "AWS-MAITRI", parameter: "temperature" },
};

/* ------------------------------------------------------------------ */
/* Bharati: Thala Fjord, Quilty Bay and the seawater intake             */
/* ------------------------------------------------------------------ */

const THALA_FJORD: WaterBodyDef = {
  id: "thala-fjord",
  station: "bharati",
  name: "Thala Fjord",
  subtitle: "Bharati coastal water - Larsemann Hills",
  kind: "fjord",
  position: [-70, 110],
  radius: [150, 75],
  depthM: 45,
  maxDepthM: 120,
  deep: "#04121F",
  shallow: "#0E3A55",
  seabed: "#1E2C38",
  waveAmp: 0.8,
  waveSpeed: 0.9,
  metrics: [
    { label: "Surface temperature", value: "-1.8 C" },
    { label: "Salinity", value: "34.2 PSU" },
    { label: "Ice coverage", value: "22 %", note: "partial, broken by katabatic flow" },
    { label: "Icebergs tracked", value: "4" },
    { label: "Mean depth", value: "45 m" },
    { label: "Maximum depth", value: "120 m" },
    { label: "Wave height", value: "0.8 m", note: "whitecaps above 40 km/h wind" },
    { label: "Current speed", value: "0.3 m/s" },
    { label: "Aurora reflection", value: "VISIBLE" },
    { label: "Fishing activity", value: "NONE" },
  ],
  iceCoverage: [88, 94, 98, 100, 100, 100, 99, 96, 90, 74, 48, 30],
  iceThicknessCm: 118,
  actions: [
    { id: "underwater", label: "Underwater view" },
    { id: "icebergs", label: "Track icebergs" },
  ],
  floes: [
    { x: -40, z: -18, r: 7, marker: 1, massTonnes: 1840, driftDeg: 20 },
    { x: 26, z: 12, r: 5.5, marker: 2, massTonnes: 1120, driftDeg: 65 },
    { x: -6, z: 34, r: 4.2, marker: 3, massTonnes: 640, driftDeg: 130 },
    { x: 62, z: -26, r: 3.4, marker: 4, massTonnes: 410, driftDeg: 210 },
  ],
  underwater: { rocks: 22, fish: 12, intakePipe: false, vegetation: false },
  live: { tag: "AWS-BHARATI", parameter: "wind_speed" },
};

const QUILTY_BAY: WaterBodyDef = {
  id: "quilty-bay",
  station: "bharati",
  name: "Quilty Bay",
  subtitle: "Bharati operations water - shoreline access",
  kind: "bay",
  position: [120, 90],
  radius: [125, 60],
  // Offset fractionally below the fjord surface so the two water bodies never
  // z-fight where they meet along the shoreline.
  surfaceY: 0.26,
  depthM: 30,
  maxDepthM: 58,
  deep: "#07202F",
  shallow: "#155066",
  seabed: "#243642",
  waveAmp: 0.5,
  waveSpeed: 0.75,
  metrics: [
    { label: "Surface temperature", value: "-1.5 C" },
    { label: "Ice coverage", value: "8 %" },
    { label: "Wave height", value: "0.5 m" },
    { label: "Mean depth", value: "30 m" },
    { label: "Seawater intake", value: "ACTIVE" },
    { label: "Intake flow", value: "45 L/min" },
    { label: "Purity after desalination", value: "99.1 %" },
    { label: "Shore assets", value: "Zodiac and kayak" },
  ],
  iceCoverage: [84, 90, 95, 99, 100, 100, 98, 94, 88, 72, 46, 26],
  iceThicknessCm: 96,
  actions: [
    { id: "underwater", label: "Underwater view" },
    { id: "pumphouse", label: "View seawater pumphouse" },
    { id: "floes", label: "Track ice floes" },
  ],
  floes: [
    { x: -30, z: 10, r: 2.6, marker: 1, massTonnes: 210, driftDeg: 35 },
    { x: 18, z: -14, r: 3.2, marker: 2, massTonnes: 330, driftDeg: 90 },
    { x: 48, z: 20, r: 1.8, marker: 3, massTonnes: 96, driftDeg: 150 },
  ],
  underwater: { rocks: 16, fish: 9, intakePipe: true, vegetation: false },
  live: { tag: "SWPUMP-BHARATI", parameter: "flow_rate" },
};

const SEAWATER_INTAKE: WaterBodyDef = {
  id: "seawater-intake",
  station: "bharati",
  name: "Seawater Intake System",
  subtitle: "450 m intake line with trace heating",
  kind: "intake",
  position: [10, 44],
  radius: [4, 4],
  surfaceY: 0.34,
  depthM: 12,
  deep: "#061A28",
  shallow: "#0F4459",
  seabed: "#1F2E3A",
  waveAmp: 0.12,
  waveSpeed: 0.7,
  metrics: [
    { label: "Intake depth", value: "12 m below surface" },
    { label: "Intake temperature", value: "-1.2 C" },
    { label: "Flow rate", value: "45 L/min" },
    { label: "Filter status", value: "CLEAN" },
    { label: "Last maintenance", value: "18 days ago" },
    { label: "Pipe integrity", value: "100 %" },
    { label: "Trace heating", value: "ACTIVE" },
    { label: "Trace current", value: "6.2 A" },
    { label: "Trace resistance", value: "4.8 Ohm" },
  ],
  iceCoverage: [80, 88, 94, 98, 100, 100, 99, 95, 88, 70, 44, 24],
  iceThicknessCm: 104,
  actions: [
    { id: "underwater", label: "Underwater pipe view" },
    { id: "pumphouse", label: "View pump house" },
  ],
  floes: [],
  underwater: { rocks: 8, fish: 4, intakePipe: true, vegetation: false },
  live: { tag: "SWPUMP-BHARATI", parameter: "flow_rate" },
};

/* ------------------------------------------------------------------ */
/* Larsemann Hills small lakes                                          */
/* ------------------------------------------------------------------ */

/** Deterministic pseudo-random in the unit interval. */
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The Larsemann Hills carry over a hundred small lakes; the twin models the
 * forty-four nearest to Bharati, each one clickable with its own survey state.
 */
function buildLakelets(): WaterBodyDef[] {
  return Array.from({ length: 44 }, (_, i) => {
    const r1 = seeded(i, 1);
    const r2 = seeded(i, 2);
    const r3 = seeded(i, 3);
    const r4 = seeded(i, 4);
    const x = -240 + r1 * 480;
    const z = -230 + r2 * 460;
    const diameter = 3 + Math.round(r3 * 9);
    const depth = 0.6 + r4 * 1.8;
    const ice = 55 + Math.round(seeded(i, 5) * 40);
    const distance = Math.round(Math.hypot(x, z - 19));
    const sampled = 2 + Math.round(seeded(i, 6) * 40);
    const biota = seeded(i, 7) > 0.62;
    return {
      id: `lake-${i + 1}`,
      station: "bharati" as const,
      name: `Lake #${i + 1}`,
      subtitle: "Larsemann Hills research lake",
      kind: "lakelet" as const,
      position: [x, z] as [number, number],
      radius: [diameter / 2, diameter / 2] as [number, number],
      depthM: Number(depth.toFixed(1)),
      deep: "#0A2436",
      shallow: "#1B5A70",
      seabed: "#26343F",
      waveAmp: 0.015,
      waveSpeed: 0.4,
      metrics: [
        { label: "Diameter", value: `${diameter} m` },
        { label: "Depth", value: `${depth.toFixed(1)} m` },
        { label: "Ice thickness", value: `${ice} cm` },
        { label: "Water temperature", value: `${(-0.9 + r4 * 1.2).toFixed(1)} C` },
        { label: "Biota", value: biota ? "Cyanobacteria research site" : "No active biota recorded" },
        { label: "Distance from Bharati", value: `${distance} m` },
        { label: "Last sampled", value: `${sampled} days ago` },
      ],
      iceCoverage: [86, 92, 96, 99, 100, 100, 99, 96, 90, 76, 52, 32],
      iceThicknessCm: ice,
      actions: [{ id: "samples", label: "View sample history" }],
      floes: [],
      underwater: { rocks: 5, fish: 0, intakePipe: false, vegetation: biota },
    };
  });
}

/** Every water body, keyed by id. */
export const WATER_BODIES: Record<string, WaterBodyDef> = {
  priyadarshini: PRIYADARSHINI,
  "thala-fjord": THALA_FJORD,
  "quilty-bay": QUILTY_BAY,
  "seawater-intake": SEAWATER_INTAKE,
  ...Object.fromEntries(buildLakelets().map((body) => [body.id, body])),
};

/** Water bodies belonging to one station. */
export function stationWater(station: "maitri" | "bharati"): WaterBodyDef[] {
  return Object.values(WATER_BODIES).filter((b) => b.station === station);
}

/** The primary water body for a station, used by the teleport menu. */
export function primaryWater(station: "maitri" | "bharati"): WaterBodyDef {
  return station === "maitri" ? PRIYADARSHINI : THALA_FJORD;
}

/** Mean ice thickness across the Larsemann lakes, for the heatmap legend. */
export function lakeletIceRange(): { min: number; max: number } {
  const values = Object.values(WATER_BODIES)
    .filter((b) => b.kind === "lakelet")
    .map((b) => b.iceThicknessCm);
  return { min: Math.min(...values), max: Math.max(...values) };
}
