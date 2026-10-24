/**
 * Predictive Risk Engine — DhruvaTwin.
 *
 * A deterministic, offline-capable risk scoring model for the two stations.
 * It reads the live operational picture for one station and produces:
 *
 *   - an overall risk score 0-100 and a risk level,
 *   - one finding per contributing factor, each with its own evidence,
 *   - the ranked list of the systems that drive the score,
 *   - a 24 hour outlook computed from trend components, not from randomness.
 *
 * The model is deliberately pure and synchronous: the same inputs must always
 * produce the same outputs, so a briefing generated on the server and one
 * generated offline in the browser can never disagree. It reads no clock other
 * than the timestamps in its inputs, takes no network call, and reads no key.
 * Both the AI advisor and the rule-engine fallback can consume it, which keeps
 * the two engines on one shape.
 *
 * All tuning constants live at the top of the file, documented inline. The
 * scoring model is data, not scattered magic numbers.
 */

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

/** Risk level vocabulary, aligned with the severity classes used console-wide. */
export type RiskLevel = "nominal" | "watch" | "warning" | "critical";

/** One measurement contributing to the risk picture. */
export interface RiskChannel {
  /** Stable identifier, e.g. "maitri:generator-1-winding-temp". */
  id: string;
  /** Human label, e.g. "Generator 1 winding temperature". */
  label: string;
  /** Subsystem bucket: power, thermal, life_support, environment, comms, safety. */
  subsystem: string;
  /** Most recent value of the channel. */
  value: number;
  /** Operating band. */
  min: number;
  max: number;
  /** Alert thresholds inside or at the edge of the band. */
  warnLow?: number;
  warnHigh?: number;
  /** Sample timestamps (ms epoch), oldest first, for the trend component. */
  samples?: number[];
  /** Sample values aligned with `samples`. */
  values?: number[];
}

/** One operational fact the engine can score. */
export interface RiskInput {
  /** Telemetry channels for the station, in any order. */
  channels: RiskChannel[];
  /** Open incidents, with the severity each carries today. */
  incidents: { id: string; title: string; severity: RiskLevel }[];
  /** Minutes until the predicted satellite blackout; null when not predicted. */
  minutesToBlackout: number | null;
  /** Generation headroom as a percentage (0-100). */
  generationHeadroomPct: number;
  /** Pending items in the offline outbox. */
  outboxPending: number;
}

/** One contributing factor with the evidence behind it. */
export interface RiskFinding {
  /** Stable factor id, e.g. "out-of-band". */
  factor: string;
  /** The factor's own contribution to the score. */
  points: number;
  /** What the operator should read this as. */
  title: string;
  /** The concrete readings or counts behind the finding. */
  evidence: string[];
  /** Status colour key shared with statusClasses()/severityClasses(). */
  level: RiskLevel;
}

/** The complete output of one evaluation. */
export interface RiskAssessment {
  /** 0-100. Deterministic function of the inputs. */
  score: number;
  level: RiskLevel;
  /** One line, suitable for a headline. */
  summary: string;
  findings: RiskFinding[];
  /** Systems ranked by the points they contribute, worst first. */
  topSystems: { id: string; label: string; subsystem: string; points: number; level: RiskLevel }[];
  /** 24 hour outlook, computed from the trend components. */
  outlook: {
    /** Projected score in 24 h if current trends hold. */
    projectedScore: number;
    projectedLevel: RiskLevel;
    /** Direction of travel. */
    direction: "improving" | "steady" | "worsening";
    /** The channels whose drift moves the score the most. */
    drivers: { id: string; label: string; driftPerHour: number }[];
  };
  /** When this assessment was computed (ms epoch). */
  evaluatedAt: number;
}

/* ------------------------------------------------------------------ */
/* Weights — the entire model is documented in these numbers          */
/* ------------------------------------------------------------------ */

/** Points per out-of-band channel, capped so a broken array cannot pin the score. */
export const OUT_OF_BAND_POINTS = 18;
export const OUT_OF_BAND_CAP = 54;

/** Points per channel at a warn limit but still inside its band. */
export const WARN_LIMIT_POINTS = 6;
export const WARN_LIMIT_CAP = 18;

/** Points per open incident, weighted by its severity. */
export const INCIDENT_POINTS: Record<RiskLevel, number> = {
  critical: 16,
  warning: 9,
  watch: 4,
  nominal: 0,
};
export const INCIDENT_CAP = 40;

/** Points when the continuity engine predicts a blackout at all. */
export const BLACKOUT_POINTS = 22;
/** Extra points when the predicted drop is inside two hours. */
export const BLACKOUT_URGENT_POINTS = 14;
export const BLACKOUT_URGENT_WINDOW_MIN = 120;

/** Points when generation headroom is low, plus a gradient below 10%. */
export const GENERATION_LOW_HEADROOM_PCT = 15;
export const GENERATION_LOW_POINTS = 12;
export const GENERATION_CRITICAL_HEADROOM_PCT = 10;
export const GENERATION_CRITICAL_BONUS_MAX = 10;

/** Points when the offline outbox is backing up past the threshold. */
export const OUTBOX_BACKLOG_POINTS = 10;
export const OUTBOX_BACKLOG_THRESHOLD = 5;

/** Total level thresholds on the 0-100 score. */
export const LEVEL_CRITICAL_AT = 75;
export const LEVEL_WARNING_AT = 50;
export const LEVEL_WATCH_AT = 25;

/** The outlook horizon, in hours. */
export const OUTLOOK_HORIZON_H = 24;
/** Projection change past which the direction is not "steady". */
export const OUTLOOK_DIRECTION_THRESHOLD = 5;

const MS_PER_HOUR = 3_600_000;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Least-squares slope of values against time, in value-units per hour. */
function slopePerHour(samples: number[], values: number[]): number {
  const n = Math.min(samples.length, values.length);
  if (n < 2) return 0;
  const x0 = samples[0] ?? 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += (samples[i]! - x0) / MS_PER_HOUR;
    sumY += values[i] ?? 0;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = (samples[i]! - x0) / MS_PER_HOUR - meanX;
    num += dx * ((values[i] ?? 0) - meanY);
    den += dx * dx;
  }
  if (den === 0) return 0;
  return num / den;
}

/** True when a value sits outside its operating band. */
function isOutOfBand(channel: RiskChannel): boolean {
  return channel.value < channel.min || channel.value > channel.max;
}

/** True when a value is inside the band but past a warn limit. */
function isWarnLimit(channel: RiskChannel): boolean {
  if (channel.warnLow !== undefined && channel.value <= channel.warnLow) return true;
  if (channel.warnHigh !== undefined && channel.value >= channel.warnHigh) return true;
  return false;
}

/** Per-channel contribution to the score, from its band and warn state. */
function channelPoints(channel: RiskChannel): number {
  if (isOutOfBand(channel)) return OUT_OF_BAND_POINTS;
  if (isWarnLimit(channel)) return WARN_LIMIT_POINTS;
  return 0;
}

/** Map a point total to a risk level, for per-finding and total use. */
function levelForPoints(points: number): RiskLevel {
  if (points >= LEVEL_CRITICAL_AT) return "critical";
  if (points >= LEVEL_WARNING_AT) return "warning";
  if (points >= LEVEL_WATCH_AT) return "watch";
  return "nominal";
}

/* ------------------------------------------------------------------ */
/* Core                                                               */
/* ------------------------------------------------------------------ */

/**
 * Evaluate the risk picture for one station.
 *
 * Pure function of its inputs. Deterministic. No clock, no network, no key.
 */
export function evaluateRisk(input: RiskInput, now: number = Date.now()): RiskAssessment {
  const findings: RiskFinding[] = [];
  const perSystem = new Map<string, { label: string; subsystem: string; points: number }>();

  const credit = (systemId: string, systemLabel: string, subsystem: string, points: number): void => {
    if (points <= 0) return;
    const existing = perSystem.get(systemId);
    perSystem.set(systemId, {
      label: systemLabel,
      subsystem,
      points: (existing ? existing.points : 0) + points,
    });
  };

  /* 1. Telemetry: out of band, or at a warn limit -------------------- */
  const outOfBand = input.channels.filter(isOutOfBand);
  const atWarn = input.channels.filter((c) => !isOutOfBand(c) && isWarnLimit(c));

  for (const channel of outOfBand) credit(channel.id, channel.label, channel.subsystem, OUT_OF_BAND_POINTS);
  for (const channel of atWarn) credit(channel.id, channel.label, channel.subsystem, WARN_LIMIT_POINTS);

  const telemetryPoints = Math.min(
    outOfBand.length * OUT_OF_BAND_POINTS + atWarn.length * WARN_LIMIT_POINTS,
    OUT_OF_BAND_CAP + WARN_LIMIT_CAP,
  );

  if (outOfBand.length > 0) {
    findings.push({
      factor: "out-of-band",
      points: Math.min(outOfBand.length * OUT_OF_BAND_POINTS, OUT_OF_BAND_CAP),
      level: "warning",
      title: `${outOfBand.length} channel${outOfBand.length === 1 ? "" : "s"} outside its operating band`,
      evidence: outOfBand.map((c) => `${c.label}: ${c.value} outside ${c.min}–${c.max}`),
    });
  }
  if (atWarn.length > 0) {
    findings.push({
      factor: "warn-limit",
      points: Math.min(atWarn.length * WARN_LIMIT_POINTS, WARN_LIMIT_CAP),
      level: "watch",
      title: `${atWarn.length} channel${atWarn.length === 1 ? "" : "s"} at a warn limit inside the band`,
      evidence: atWarn.map((c) => `${c.label}: ${c.value} (warn ${c.warnLow ?? "–"} / ${c.warnHigh ?? "–"})`),
    });
  }

  /* 2. Open incidents ------------------------------------------------ */
  let incidentPoints = 0;
  for (const incident of input.incidents) {
    const points = INCIDENT_POINTS[incident.severity] ?? 0;
    incidentPoints += points;
    credit(`incident:${incident.id}`, incident.title, "safety", points);
    if (points > 0) {
      findings.push({
        factor: "incident",
        points,
        level: incident.severity,
        title: `Open ${incident.severity} incident: ${incident.title}`,
        evidence: [`${incident.title} — severity ${incident.severity}`],
      });
    }
  }
  incidentPoints = Math.min(incidentPoints, INCIDENT_CAP);

  /* 3. Continuity (blackout prediction) ------------------------------ */
  let blackoutPoints = 0;
  if (input.minutesToBlackout !== null) {
    const urgent = input.minutesToBlackout <= BLACKOUT_URGENT_WINDOW_MIN;
    blackoutPoints = BLACKOUT_POINTS + (urgent ? BLACKOUT_URGENT_POINTS : 0);
    credit("continuity:vsat", "VSAT uplink", "comms", blackoutPoints);
    findings.push({
      factor: "blackout-predicted",
      points: blackoutPoints,
      level: urgent ? "critical" : "warning",
      title: urgent
        ? `Satellite blackout predicted within ${Math.round(input.minutesToBlackout)} min`
        : `Satellite blackout predicted in ${Math.round(input.minutesToBlackout)} min`,
      evidence: [
        `Continuity engine prediction: ${Math.round(input.minutesToBlackout)} minutes to blackout`,
        urgent
          ? "Inside the two hour window: fallback profile and outbox flush are the standing actions"
          : "Monitor the forecast line on the telemetry charts",
      ],
    });
  }

  /* 4. Generation headroom ------------------------------------------- */
  let generationPoints = 0;
  const headroom = input.generationHeadroomPct;
  if (headroom < GENERATION_LOW_HEADROOM_PCT) {
    const criticalBonus =
      headroom < GENERATION_CRITICAL_HEADROOM_PCT
        ? clamp(GENERATION_CRITICAL_HEADROOM_PCT - headroom, 0, GENERATION_CRITICAL_BONUS_MAX)
        : 0;
    generationPoints = GENERATION_LOW_POINTS + criticalBonus;
    credit("generation", "Generation headroom", "power", generationPoints);
    findings.push({
      factor: "generation-headroom",
      points: generationPoints,
      level: headroom < GENERATION_CRITICAL_HEADROOM_PCT ? "critical" : "warning",
      title: `Generation headroom at ${Math.round(headroom)}%`,
      evidence: [
        `Headroom ${headroom}% against the ${GENERATION_LOW_HEADROOM_PCT}% floor`,
        "Raise the reserve action with the microgrid screen if this persists",
      ],
    });
  }

  /* 5. Offline outbox backlog ---------------------------------------- */
  let outboxPoints = 0;
  if (input.outboxPending > OUTBOX_BACKLOG_THRESHOLD) {
    outboxPoints = OUTBOX_BACKLOG_POINTS;
    credit("outbox", "Offline outbox", "comms", outboxPoints);
    findings.push({
      factor: "outbox-backlog",
      points: outboxPoints,
      level: "watch",
      title: `Offline outbox holding ${input.outboxPending} pending items`,
      evidence: [
        `Pending items: ${input.outboxPending} (threshold ${OUTBOX_BACKLOG_THRESHOLD})`,
        "Replayed highest-priority-first when the link returns: SOS 1, Critical 2, Check-in 3, Routine 4",
      ],
    });
  }

  /* 6. Total ---------------------------------------------------------- */
  const score = Math.min(100, telemetryPoints + incidentPoints + blackoutPoints + generationPoints + outboxPoints);
  const level = levelForPoints(score);

  const topSystems = Array.from(perSystem.entries())
    .map(([id, entry]) => ({
      id,
      label: entry.label,
      subsystem: entry.subsystem,
      points: entry.points,
      level: levelForPoints(entry.points),
    }))
    .sort((a, b) => b.points - a.points);

  /* 7. 24 hour outlook ------------------------------------------------ */
  const drivers = input.channels
    .map((channel) => {
      const samples = channel.samples ?? [];
      const values = channel.values ?? [];
      return { channel, driftPerHour: slopePerHour(samples, values) };
    })
    .filter((entry) => entry.driftPerHour !== 0)
    .sort((a, b) => Math.abs(b.driftPerHour) - Math.abs(a.driftPerHour))
    .slice(0, 3)
    .map((entry) => ({
      id: entry.channel.id,
      label: entry.channel.label,
      driftPerHour: Math.round(entry.driftPerHour * 1000) / 1000,
    }));

  // Project each channel along its linear trend and re-score the telemetry
  // term. Operational terms (incidents, generation, outbox) carry forward as
  // measured; the blackout term is dropped once the predicted drop is inside
  // the horizon, because after it the uplink is assumed restored.
  const projectedTelemetry = input.channels.reduce((total, channel) => {
    const samples = channel.samples ?? [];
    const values = channel.values ?? [];
    const slope = slopePerHour(samples, values);
    const projected = channel.value + slope * OUTLOOK_HORIZON_H;
    if (projected < channel.min || projected > channel.max) return total + OUT_OF_BAND_POINTS;
    const warnLow = channel.warnLow;
    const warnHigh = channel.warnHigh;
    if ((warnLow !== undefined && projected <= warnLow) || (warnHigh !== undefined && projected >= warnHigh)) {
      return total + WARN_LIMIT_POINTS;
    }
    return total;
  }, 0);
  const projectedScore = Math.min(
    100,
    Math.min(projectedTelemetry, OUT_OF_BAND_CAP + WARN_LIMIT_CAP) +
      incidentPoints +
      (input.minutesToBlackout !== null && input.minutesToBlackout <= OUTLOOK_HORIZON_H * 60 ? 0 : blackoutPoints) +
      generationPoints +
      outboxPoints,
  );
  const delta = projectedScore - score;
  const direction = delta > OUTLOOK_DIRECTION_THRESHOLD ? "worsening" : delta < -OUTLOOK_DIRECTION_THRESHOLD ? "improving" : "steady";

  /* 8. Summary -------------------------------------------------------- */
  const headlineBits: string[] = [];
  if (outOfBand.length > 0) headlineBits.push(`${outOfBand.length} channel${outOfBand.length === 1 ? "" : "s"} out of band`);
  if (input.incidents.length > 0) headlineBits.push(`${input.incidents.length} open incident${input.incidents.length === 1 ? "" : "s"}`);
  if (input.minutesToBlackout !== null) headlineBits.push(`blackout predicted in ${Math.round(input.minutesToBlackout)} min`);
  if (headlineBits.length === 0) headlineBits.push("all channels in band, no open incidents");
  const summary = `Risk ${score}/100 (${level}): ${headlineBits.join(", ")}.`;

  return {
    score,
    level,
    summary,
    findings,
    topSystems,
    outlook: {
      projectedScore,
      projectedLevel: levelForPoints(projectedScore),
      direction,
      drivers,
    },
    evaluatedAt: now,
  };
}
