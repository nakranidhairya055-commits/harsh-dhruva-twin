/**
 * DhruvaTwin sensor catalog (v1 scope: live sensor dashboard + alerts).
 *
 * Pure data + helpers shared by the telemetry simulator (backend) and the
 * dashboard UI. Values model the documented station equipment:
 * - Maitri: 4 x 62.5 kVA diesel generators, heated pipeline from Lake
 *   Priyadarshini, AWS, VSAT link.
 * - Bharati: 3 x 100 kVA CHP units, 300,000 L fuel farm, seawater intake,
 *   AWS, VSAT link.
 */

export interface SensorDef {
  /** Equipment tag, e.g. GEN-1, CHP-2, PIPE-MAITRI, AWS-MAITRI. */
  equipmentId: string;
  /** Canonical sensor key, e.g. "power.output_kw". */
  sensorId: string;
  /** Subsystem grouping shown in the dashboard. */
  subsystem: "power" | "thermal" | "life_support" | "environment" | "comms" | "safety";
  /** Human label. */
  parameter: string;
  unit: string;
  decimals: number;
  /** Simulation: mid value. */
  base: number;
  /** Simulation: sinusoidal swing amplitude. */
  amplitude: number;
  /** Simulation: full sine period in ms. */
  periodMs: number;
  /** Simulation: random jitter (peak-to-peak). */
  noise: number;
  /** Simulation: phase offset so sensors do not move in lockstep. */
  phase: number;
}

export interface ThresholdBand {
  warnLow?: number;
  critLow?: number;
  warnHigh?: number;
  critHigh?: number;
}

export type ThresholdKind = "warnLow" | "critLow" | "warnHigh" | "critHigh";

/** Threshold bands keyed by `${equipmentId}|${sensorId}`. */
export const THRESHOLDS: Record<string, ThresholdBand> = {
  // ---- Power ----
  "GEN-1|power.output_kw": { warnLow: 42, critLow: 28 },
  "GEN-2|power.output_kw": { warnLow: 42, critLow: 28 },
  "GEN-3|power.output_kw": { warnLow: 42, critLow: 28 },
  "GEN-4|power.output_kw": { warnLow: 42, critLow: 28 },
  "CHP-1|power.output_kw": { warnLow: 58, critLow: 38 },
  "CHP-2|power.output_kw": { warnLow: 58, critLow: 38 },
  "CHP-3|power.output_kw": { warnLow: 58, critLow: 38 },
  "PDU-MAITRI|power.bus_frequency": { warnLow: 49.5, warnHigh: 50.5, critLow: 49.0, critHigh: 51.0 },
  "PDU-BHARATI|power.bus_frequency": { warnLow: 49.5, warnHigh: 50.5, critLow: 49.0, critHigh: 51.0 },

  // ---- Fuel ----
  "FUEL-MAITRI|fuel.level_pct": { warnLow: 35, critLow: 20 },
  "FUEL-BHARATI|fuel.level_pct": { warnLow: 30, critLow: 15 },

  // ---- Thermal ----
  "PIPE-MAITRI|thermal.pipeline_temp": { warnLow: 4, critLow: 2 },
  "HAB-MAITRI|thermal.cabin_temp": { warnLow: 16, warnHigh: 26, critLow: 12 },
  "HAB-BHARATI|thermal.cabin_temp": { warnLow: 16, warnHigh: 26, critLow: 12 },
  "CHP-1|thermal.loop_temp": { warnHigh: 85, critHigh: 95 },
  "CHP-2|thermal.loop_temp": { warnHigh: 85, critHigh: 95 },
  "CHP-3|thermal.loop_temp": { warnHigh: 85, critHigh: 95 },

  // ---- Life support ----
  "HAB-MAITRI|life.co2_ppm": { warnHigh: 1000, critHigh: 1400 },
  "HAB-BHARATI|life.co2_ppm": { warnHigh: 1000, critHigh: 1400 },
  "HAB-MAITRI|life.humidity_pct": { warnHigh: 60, warnLow: 20 },
  "HAB-BHARATI|life.humidity_pct": { warnHigh: 60, warnLow: 20 },

  // ---- Environment (informational; wind gets a watch band) ----
  "AWS-MAITRI|env.wind_speed": { warnHigh: 25 },
  "AWS-BHARATI|env.wind_speed": { warnHigh: 25 },

  // ---- Comms ----
  "VSAT-MAITRI|comms.snr_db": { warnLow: 7, critLow: 4 },
  "VSAT-BHARATI|comms.snr_db": { warnLow: 7, critLow: 4 },
  "VSAT-MAITRI|comms.latency_ms": { warnHigh: 850, critHigh: 1000 },
  "VSAT-BHARATI|comms.latency_ms": { warnHigh: 850, critHigh: 1000 },

  // ---- Safety ----
  "GENBAY-MAITRI|safety.smoke_ppm": { warnHigh: 12, critHigh: 25 },
  "GENBAY-BHARATI|safety.smoke_ppm": { warnHigh: 12, critHigh: 25 },
  "FUEL-MAITRI|safety.leak_ppm": { warnHigh: 8, critHigh: 20 },
  "FUEL-BHARATI|safety.leak_ppm": { warnHigh: 8, critHigh: 20 },
  "SWPUMP-BHARATI|safety.intake_flow": { warnLow: 28, critLow: 15 },
};

/** Sensor bands keyed by `${equipmentId}|${sensorId}`. */
export function thresholdFor(equipmentId: string, sensorId: string): ThresholdBand {
  return THRESHOLDS[`${equipmentId}|${sensorId}`] ?? {};
}

/** Shared AWS + comms + safety definitions for a station prefix. */
function commonSensors(prefix: "MAITRI" | "BHARATI"): SensorDef[] {
  const awsTemp = prefix === "MAITRI" ? -18 : -11;
  const awsWind = prefix === "MAITRI" ? 12 : 9;
  return [
    {
      equipmentId: `AWS-${prefix}`,
      sensorId: "env.temperature",
      subsystem: "environment",
      parameter: "Ambient Temperature",
      unit: "\u00B0C",
      decimals: 1,
      base: awsTemp,
      amplitude: 4,
      periodMs: 600_000,
      noise: 0.4,
      phase: 0.3,
    },
    {
      equipmentId: `AWS-${prefix}`,
      sensorId: "env.wind_speed",
      subsystem: "environment",
      parameter: "Wind Speed",
      unit: "m/s",
      decimals: 1,
      base: awsWind,
      amplitude: 7,
      periodMs: 420_000,
      noise: 1.6,
      phase: 1.1,
    },
    {
      equipmentId: `AWS-${prefix}`,
      sensorId: "env.pressure",
      subsystem: "environment",
      parameter: "Barometric Pressure",
      unit: "hPa",
      decimals: 1,
      base: 986,
      amplitude: 7,
      periodMs: 900_000,
      noise: 0.8,
      phase: 2.2,
    },
    {
      equipmentId: `VSAT-${prefix}`,
      sensorId: "comms.snr_db",
      subsystem: "comms",
      parameter: "VSAT Link SNR",
      unit: "dB",
      decimals: 1,
      base: 12,
      amplitude: 3,
      periodMs: 300_000,
      noise: 0.9,
      phase: 0.7,
    },
    {
      equipmentId: `VSAT-${prefix}`,
      sensorId: "comms.latency_ms",
      subsystem: "comms",
      parameter: "VSAT Latency",
      unit: "ms",
      decimals: 0,
      base: 640,
      amplitude: 60,
      periodMs: 240_000,
      noise: 40,
      phase: 1.9,
    },
    {
      equipmentId: `GENBAY-${prefix}`,
      sensorId: "safety.smoke_ppm",
      subsystem: "safety",
      parameter: "Generator Bay Smoke",
      unit: "ppm",
      decimals: 1,
      base: 4,
      amplitude: 2,
      periodMs: 360_000,
      noise: 0.7,
      phase: 2.6,
    },
    {
      equipmentId: `HAB-${prefix}`,
      sensorId: "thermal.cabin_temp",
      subsystem: "thermal",
      parameter: "Habitat Cabin Temperature",
      unit: "\u00B0C",
      decimals: 1,
      base: 21,
      amplitude: 1.1,
      periodMs: 480_000,
      noise: 0.25,
      phase: 0.1,
    },
    {
      equipmentId: `HAB-${prefix}`,
      sensorId: "life.co2_ppm",
      subsystem: "life_support",
      parameter: "CO2 Concentration",
      unit: "ppm",
      decimals: 0,
      base: 620,
      amplitude: 80,
      periodMs: 540_000,
      noise: 35,
      phase: 1.4,
    },
    {
      equipmentId: `HAB-${prefix}`,
      sensorId: "life.humidity_pct",
      subsystem: "life_support",
      parameter: "Relative Humidity",
      unit: "%",
      decimals: 1,
      base: 38,
      amplitude: 6,
      periodMs: 660_000,
      noise: 1.2,
      phase: 2.9,
    },
    {
      equipmentId: `FUEL-${prefix}`,
      sensorId: "fuel.level_pct",
      subsystem: "power",
      parameter: "Fuel Farm Level",
      unit: "%",
      decimals: 1,
      base: prefix === "MAITRI" ? 78 : 64,
      amplitude: 1.5,
      periodMs: 1_800_000,
      noise: 0.2,
      phase: 0.5,
    },
    {
      equipmentId: `FUEL-${prefix}`,
      sensorId: "safety.leak_ppm",
      subsystem: "safety",
      parameter: "Hydrocarbon Detector",
      unit: "ppm",
      decimals: 2,
      base: 1,
      amplitude: 0.8,
      periodMs: 300_000,
      noise: 0.3,
      phase: 2.1,
    },
  ];
}

/**
 * Full sensor catalog for one station.
 * Maitri runs 4 diesel generators and the heated Lake Priyadarshini pipeline;
 * Bharati runs 3 CHP units with a hot-water loop and a seawater intake.
 */
export function sensorDefsFor(slug: string): SensorDef[] {
  if (slug === "maitri") {
    const gens: SensorDef[] = [1, 2, 3, 4].map((n) => ({
      equipmentId: `GEN-${n}`,
      sensorId: "power.output_kw",
      subsystem: "power",
      parameter: `Generator ${n} Output`,
      unit: "kW",
      decimals: 1,
      base: 52,
      amplitude: 6,
      periodMs: 240_000,
      noise: 2.2,
      phase: n * 1.3,
    }));
    const pipe: SensorDef = {
      equipmentId: "PIPE-MAITRI",
      sensorId: "thermal.pipeline_temp",
      subsystem: "thermal",
      parameter: "Heated Pipeline Temperature",
      unit: "\u00B0C",
      decimals: 1,
      base: 8,
      amplitude: 1.6,
      periodMs: 300_000,
      noise: 0.4,
      phase: 0.9,
    };
    const pdu: SensorDef = {
      equipmentId: "PDU-MAITRI",
      sensorId: "power.bus_frequency",
      subsystem: "power",
      parameter: "Bus Frequency",
      unit: "Hz",
      decimals: 2,
      base: 50,
      amplitude: 0.25,
      periodMs: 180_000,
      noise: 0.08,
      phase: 1.7,
    };
    return [...gens, pipe, pdu, ...commonSensors("MAITRI")];
  }

  if (slug === "bharati") {
    const chps: SensorDef[] = [1, 2, 3].map((n) => ({
      equipmentId: `CHP-${n}`,
      sensorId: "power.output_kw",
      subsystem: "power",
      parameter: `CHP Unit ${n} Output`,
      unit: "kW",
      decimals: 1,
      base: 78,
      amplitude: 8,
      periodMs: 260_000,
      noise: 2.8,
      phase: n * 1.1,
    }));
    const loops: SensorDef[] = [1, 2, 3].map((n) => ({
      equipmentId: `CHP-${n}`,
      sensorId: "thermal.loop_temp",
      subsystem: "thermal",
      parameter: `CHP ${n} Hot Water Loop`,
      unit: "\u00B0C",
      decimals: 1,
      base: 72,
      amplitude: 4,
      periodMs: 320_000,
      noise: 1.1,
      phase: n * 1.9,
    }));
    const pdu: SensorDef = {
      equipmentId: "PDU-BHARATI",
      sensorId: "power.bus_frequency",
      subsystem: "power",
      parameter: "Bus Frequency",
      unit: "Hz",
      decimals: 2,
      base: 50,
      amplitude: 0.22,
      periodMs: 180_000,
      noise: 0.07,
      phase: 2.4,
    };
    const pump: SensorDef = {
      equipmentId: "SWPUMP-BHARATI",
      sensorId: "safety.intake_flow",
      subsystem: "safety",
      parameter: "Seawater Intake Flow",
      unit: "m3/h",
      decimals: 1,
      base: 42,
      amplitude: 5,
      periodMs: 360_000,
      noise: 1.4,
      phase: 0.4,
    };
    return [...chps, ...loops, pdu, pump, ...commonSensors("BHARATI")];
  }

  // Dakshin Gangotri / Maitri-II are not instrumented in v1.
  return [];
}

/**
 * Simulated reading for a sensor at time `tMs`.
 * Sinusoid + deterministic phase + light noise, rounded to the sensor's
 * decimal precision. `rng` is injected so callers control randomness.
 */
export function simulateValue(def: SensorDef, tMs: number, rng: () => number): number {
  const wave =
    def.base +
    def.amplitude * Math.sin((2 * Math.PI * tMs) / def.periodMs + def.phase) +
    (rng() - 0.5) * def.noise;
  const factor = Math.pow(10, def.decimals);
  return Math.round(wave * factor) / factor;
}

export interface ThresholdHit {
  kind: ThresholdKind;
  limit: number;
  severity: "critical" | "warning" | "watch";
}

/**
 * Evaluate a value against the sensor's threshold band. Returns null when the
 * value is inside the band. "watch" bands (ambient wind) are informational.
 */
export function evaluateThreshold(
  def: SensorDef,
  value: number,
): ThresholdHit | null {
  const band = thresholdFor(def.equipmentId, def.sensorId);
  if (band.critLow !== undefined && value <= band.critLow) {
    return { kind: "critLow", limit: band.critLow, severity: "critical" };
  }
  if (band.critHigh !== undefined && value >= band.critHigh) {
    return { kind: "critHigh", limit: band.critHigh, severity: "critical" };
  }
  if (band.warnLow !== undefined && value <= band.warnLow) {
    return {
      kind: "warnLow",
      limit: band.warnLow,
      severity: def.subsystem === "environment" ? "watch" : "warning",
    };
  }
  if (band.warnHigh !== undefined && value >= band.warnHigh) {
    return {
      kind: "warnHigh",
      limit: band.warnHigh,
      severity: def.subsystem === "environment" ? "watch" : "warning",
    };
  }
  return null;
}
