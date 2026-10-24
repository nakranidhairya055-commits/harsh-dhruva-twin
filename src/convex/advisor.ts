"use node";

import { v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { cascadeGraph, simulateCascade } from "./cascadeGraph";

/**
 * DhruvaTwin AI advisor.
 *
 * The station assistant answers questions. The advisor goes one step further:
 * it reads the station's own live data, works out what is actually at risk,
 * and returns a briefing the duty engineer can act on - a headline, a risk
 * level, ordered actions with an owner and a window, what to keep watching, and
 * the exact evidence each conclusion came from.
 *
 * Two engines, one shape. With GROQ_API_KEY set the briefing is written by
 * llama-3.3-70b-versatile over a live context block. Without a key the same
 * briefing is derived by a deterministic rule engine over the same numbers, so
 * the screen is never empty and never invents a reading.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export type AdvisorSeverity = "critical" | "warning" | "watch";

export interface AdvisorAction {
  title: string;
  why: string;
  owner: string;
  window: string;
  severity: AdvisorSeverity;
}

export interface AdvisorBriefing {
  headline: string;
  risk: AdvisorSeverity;
  summary: string;
  actions: AdvisorAction[];
  watch: string[];
  evidence: string[];
}

export interface AdvisorResult extends AdvisorBriefing {
  model: string;
  usedFallback: boolean;
}

interface ReadingView {
  equipmentId: string;
  parameter: string;
  value: number;
  unit: string;
  decimals: number;
  status: string;
}

interface AlertView {
  equipmentId: string;
  severity: string;
  message: string;
  acknowledged: boolean;
  subsystem: string;
}

/** Focus areas the advisor can be pointed at. */
const FOCUS_LABEL: Record<string, string> = {
  briefing: "the station as a whole",
  power: "power, heat and the microgrid",
  water: "the water path from source to drain",
  connectivity: "satellite connectivity and the continuity window",
  logistics: "the sea lift, stores and cargo discharge",
  field: "field parties, weather limits and crew safety",
};

const FOCUS_GUIDE: Record<string, string> = {
  briefing:
    "Cover the whole station: the most consequential open item first, then power, water, connectivity and crew safety.",
  power:
    "Concentrate on generation, thermal recovery, storage state of charge and load headroom. Ignore anything that cannot change the power balance.",
  water:
    "Concentrate on the water path: source, pumps, trace heating, storage and the freeze window. Say explicitly how long the station has before a freeze or a supply loss.",
  connectivity:
    "Concentrate on the satellite link and the continuity window: predicted drop, confidence, the fallback profile and the offline outbox.",
  logistics:
    "Concentrate on the sea lift and stores: discharge window, weather window, cargo priorities and the effect on station consumables.",
  field:
    "Concentrate on people: weather limits, katabatic wind, blackout windows that cut comms, and anything that should stop a field movement.",
};

const REFERENCE: Record<string, string> = {
  maitri:
    "Maitri (1989, Schirmacher Oasis, 70 45 52 S 11 44 03 E, about 100 km inland). Steel structure on iron pillars, 25 winter-over plus 40 summer. Water is drawn from Lake Priyadarshini (0.297 sq km) through a heated pipeline that can freeze in about 45 minutes if trace heating trips. Power: four 62.5 kVA diesel generators. Nearby: Schirmacher Hills, Novo airfield 5.5 km.",
  bharati:
    "Bharati (2012, Larsemann Hills, North Grovnes Island, 69 24 41 S 76 11 15 E, 3,098 km from Maitri). 134 shipping containers with a composite skin, 47 plus 25 emergency berths. Power: three CHP units rated 100 kVA electrical and 150 kW thermal. Fuel farm 300,000 litres in 13 tanks. Water from seawater pumps through a 450 m intake.",
};

interface Snapshot {
  slug: string;
  readings: ReadingView[];
  alerts: AlertView[];
  prediction: {
    riskLevel: string;
    riskScore: number;
    confidence: number;
    minutesToDrop: number;
    accuracyTarget: number;
    drivers: Array<{ label: string; value: number; unit: string }>;
  } | null;
  microgrid: {
    online: boolean;
    sources: Array<{
      source: string;
      outputKw: number;
      thermalKw: number;
      soc: number;
      loadKw: number;
    }>;
  } | null;
  weather: {
    temperature: number;
    windSpeed: number;
    windDirection: number;
    pressure: number;
  } | null;
  repairs: Array<{ equipmentId: string; cause: string; timestamp: number }>;
  selfTests: Array<{ suite: string; pass: boolean; corrected: number; timestamp: number }>;
  /** Worst single-point shutdown from the station's own dependency graph. */
  worst: { label: string; impacted: number; crewRiskNode: string | null } | null;
  /** Optional sea-lift line computed by the console from the voyage model. */
  seaLift?: string;
}

/** Read every live input the advisor reasons over. */
async function snapshot(
  ctx: ActionCtx,
  slug: string,
  seaLift?: string,
): Promise<Snapshot> {
  const [readings, alerts, prediction, microgrid, weather, repairs, selfTests] = await Promise.all([
    ctx.runQuery(api.telemetry.getLiveReadings, { slug }),
    ctx.runQuery(api.telemetry.listAlerts, { stationSlug: slug, openOnly: true, limit: 10 }),
    ctx.runQuery(api.blackout.getPrediction, { slug }),
    ctx.runQuery(api.ops.microgridSnapshot, { slug, limit: 12 }),
    ctx.runQuery(api.ops.weatherHistory, { slug, limit: 2 }),
    ctx.runQuery(api.repairs.listRepairs, { slug, limit: 6 }),
    ctx.runQuery(api.repairs.listSelfTests, { slug, limit: 3 }),
  ]);

  // The worst single-point shutdown: every node of the station's dependency
  // graph taken as the trigger at critical severity, keeping the widest reach.
  let worst: Snapshot["worst"] = null;
  try {
    const graph = cascadeGraph(slug);
    for (const node of graph) {
      const result = simulateCascade({
        nodes: graph,
        triggerId: node.id,
        severity: "critical",
        isolations: [],
      });
      const impacted = result.impacts.filter((impact) => impact.state === "impacted").length;
      if (!worst || impacted > worst.impacted) {
        worst = {
          label: node.label,
          impacted,
          crewRiskNode: result.crewRiskNode ?? null,
        };
      }
    }
  } catch {
    worst = null;
  }

  const lastWeather = weather.length ? weather[weather.length - 1] : null;
  return {
    slug,
    readings: readings.map((r) => ({
      equipmentId: r.equipmentId,
      parameter: r.parameter,
      value: r.value,
      unit: r.unit,
      decimals: r.decimals,
      status: r.status,
    })),
    alerts: alerts.map((a) => ({
      equipmentId: a.equipmentId,
      severity: a.severity,
      message: a.message,
      acknowledged: a.acknowledged,
      subsystem: a.subsystem,
    })),
    prediction: prediction
      ? {
          riskLevel: prediction.riskLevel,
          riskScore: prediction.riskScore,
          confidence: prediction.confidence,
          minutesToDrop: prediction.minutesToDrop,
          accuracyTarget: prediction.accuracyTarget,
          drivers: prediction.drivers.map((d) => ({
            label: d.label,
            value: d.value,
            unit: d.unit,
          })),
        }
      : null,
    microgrid: microgrid
      ? {
          online: microgrid.online,
          sources: microgrid.sources.map((s) => ({
            source: s.source,
            outputKw: s.outputKw,
            thermalKw: s.thermalKw,
            soc: s.soc,
            loadKw: s.loadKw,
          })),
        }
      : null,
    weather: lastWeather
      ? {
          temperature: lastWeather.temperature,
          windSpeed: lastWeather.windSpeed,
          windDirection: lastWeather.windDirection,
          pressure: lastWeather.pressure,
        }
      : null,
    repairs: repairs.map((r) => ({
      equipmentId: r.equipmentId,
      cause: r.cause,
      timestamp: r.timestamp,
    })),
    selfTests: selfTests.map((s) => ({
      suite: s.suite,
      pass: s.pass,
      corrected: s.corrected,
      timestamp: s.timestamp,
    })),
    worst,
    seaLift,
  };
}

/** Deterministic briefing used with no model key, and as the model's baseline. */
function ruleBriefing(data: Snapshot, focus: string): AdvisorBriefing {
  const critical = data.alerts.filter((alert) => alert.severity === "critical");
  const warning = data.alerts.filter((alert) => alert.severity === "warning");
  const outOfBand = data.readings.filter((reading) => reading.status !== "nominal");
  const totals = data.readings.length;

  const actions: AdvisorAction[] = [];
  const evidence: string[] = [];
  const watch: string[] = [];

  const format = (reading: ReadingView) =>
    `${reading.equipmentId} ${reading.parameter} ${reading.value.toFixed(reading.decimals)} ${reading.unit}`;

  // 1. The channel that is furthest out of band, worst first.
  const ranked = [...outOfBand].sort((a, b) => {
    const rank = (status: string) => (status === "critical" ? 0 : status === "warning" ? 1 : 2);
    return rank(a.status) - rank(b.status);
  });
  for (const reading of ranked.slice(0, 3)) {
    actions.push({
      title:
        reading.status === "critical"
          ? `Restore ${reading.equipmentId} now`
          : `Bring ${reading.equipmentId} back into band this watch`,
      why: `${format(reading)} is reading ${reading.status} against its operating band.`,
      owner: "Duty engineer",
      window: reading.status === "critical" ? "immediate" : "this watch",
      severity: reading.status === "critical" ? "critical" : "warning",
    });
    evidence.push(`${format(reading)} [${reading.status}]`);
  }

  // 2. Connectivity, when the continuity engine expects a drop soon.
  if (data.prediction && data.prediction.minutesToDrop <= 120) {
    actions.push({
      title: "Switch the uplink to the Iridium fallback profile",
      why: `The continuity engine expects a link drop in ${data.prediction.minutesToDrop} minutes at ${data.prediction.confidence}% confidence against a ${data.prediction.accuracyTarget}% accuracy target.`,
      owner: "Comms operator",
      window: `${Math.max(0, data.prediction.minutesToDrop - 15)} minutes`,
      severity: data.prediction.riskLevel === "critical" ? "critical" : "warning",
    });
    actions.push({
      title: "Flush the offline outbox highest priority first",
      why: "SOS and Critical samples must leave the station before the link drops; Routine traffic can wait for the window to reopen.",
      owner: "Duty engineer",
      window: "before the drop",
      severity: "warning",
    });
    evidence.push(
      `Continuity: risk ${data.prediction.riskLevel}, drop in ${data.prediction.minutesToDrop} min, confidence ${data.prediction.confidence}%`,
    );
    for (const driver of data.prediction.drivers) {
      watch.push(`${driver.label} at ${driver.value} ${driver.unit}`);
    }
  }

  // 3. Generation headroom.
  if (data.microgrid?.online && data.microgrid.sources.length > 0) {
    const generation = data.microgrid.sources.reduce((sum, s) => sum + s.outputKw, 0);
    const load = Math.max(...data.microgrid.sources.map((s) => s.loadKw));
    const headroom = load > 0 ? Math.round(((generation - load) / load) * 100) : 100;
    const lowestSoc = Math.min(...data.microgrid.sources.map((s) => s.soc));
    evidence.push(`${generation} kW online against a ${load} kW station load (${headroom}% headroom)`);
    if (headroom < 15) {
      actions.push({
        title: "Start the standby prime mover to restore spinning reserve",
        why: `Online generation is only ${headroom}% above station load, which leaves no margin for a unit tripping.`,
        owner: "Power plant operator",
        window: "immediate",
        severity: headroom < 5 ? "critical" : "warning",
      });
    }
    if (lowestSoc < 60) {
      watch.push(`Storage state of charge down to ${lowestSoc}% on one source`);
    }
  }

  // 4. Water path: the freeze window is the highest-consequence thermal risk.
  const waterLine = data.readings.find(
    (reading) =>
      /PIPE|SWPUMP|WATER|INTAKE/i.test(reading.equipmentId) && reading.status !== "nominal",
  );
  if (waterLine) {
    actions.push({
      title: "Prove the trace heating and the spare pump circuit",
      why: `${format(waterLine)} is ${waterLine.status}. The heated line can freeze in about 45 minutes at Maitri, and ice blockage at Bharati presents exactly like a pump fault.`,
      owner: "Mechanical technician",
      window: "immediate",
      severity: waterLine.status === "critical" ? "critical" : "warning",
    });
    evidence.push(`${format(waterLine)} [${waterLine.status}]`);
  }

  // 5. The widest-reaching single-point shutdown, from the dependency graph.
  if (data.worst && data.worst.impacted > 0) {
    evidence.push(
      `Worst single-point shutdown in the dependency graph: ${data.worst.label}, reaching ${data.worst.impacted} downstream systems`,
    );
    if (data.worst.crewRiskNode) {
      actions.push({
        title: `Rehearse the isolation plan for ${data.worst.label}`,
        why: `Losing it reaches ${data.worst.impacted} systems and threatens ${data.worst.crewRiskNode}. The ordered isolation plan is what buys the response window.`,
        owner: "Shift supervisor",
        window: "next drill slot",
        severity: "watch",
      });
    }
  }

  // 6. Weather limits for anyone working outside.
  if (data.weather) {
    const w = data.weather;
    evidence.push(
      `Weather ${w.temperature} C, wind ${w.windSpeed} m/s at ${w.windDirection} deg, ${w.pressure} hPa`,
    );
    if (w.windSpeed >= 20) {
      actions.push({
        title: "Hold non-essential field movement",
        why: `Wind is ${w.windSpeed} m/s. Above 20 m/s the katabatic gusts make a whiteout walk-back a real risk and the antenna pedestal loads up.`,
        owner: "Field party leader",
        window: "until the wind drops",
        severity: w.windSpeed >= 25 ? "critical" : "warning",
      });
    } else {
      watch.push(`Wind ${w.windSpeed} m/s: watch for a katabatic gust after the temperature inversion clears`);
    }
  }

  // 7. Repeat offenders from the repair log, so the same fault is not fixed twice.
  if (data.repairs.length > 0) {
    const repeats = new Map<string, number>();
    for (const repair of data.repairs) {
      repeats.set(repair.equipmentId, (repeats.get(repair.equipmentId) ?? 0) + 1);
    }
    const worst = [...repeats.entries()].sort((a, b) => b[1] - a[1])[0];
    if (worst && worst[1] > 1) {
      watch.push(`${worst[0]} repaired ${worst[1]} times recently: treat it as a failing channel, not three separate faults`);
      evidence.push(`${data.repairs.length} channel repairs on record, ${worst[0]} repeating`);
    }
  }

  if (data.seaLift) {
    evidence.push(`Sea lift: ${data.seaLift}`);
    watch.push(`Sea lift: ${data.seaLift}`);
  }

  if (data.selfTests.length > 0) {
    const failed = data.selfTests.filter((test) => !test.pass);
    if (failed.length > 0) {
      actions.push({
        title: "Re-run the self-healing suite that failed",
        why: `${failed.length} of the last ${data.selfTests.length} self-test runs did not pass, so the radiation-tolerant logic is not currently proven on this hardware.`,
        owner: "Avionics technician",
        window: "this watch",
        severity: "warning",
      });
    } else {
      evidence.push(
        `Self-healing verified: ${data.selfTests[0].corrected} corrections on the last ${data.selfTests[0].suite} run`,
      );
    }
  }

  const risk: AdvisorSeverity =
    critical.length > 0 || actions.some((action) => action.severity === "critical")
      ? "critical"
      : warning.length > 0 || actions.some((action) => action.severity === "warning")
        ? "warning"
        : "watch";

  const headline =
    critical.length > 0
      ? `${critical.length} critical incident${critical.length === 1 ? "" : "s"} open, ${outOfBand.length} of ${totals} channels out of band`
      : actions.length > 0
        ? `${actions.length} item${actions.length === 1 ? "" : "s"} worth acting on, no critical incident open`
        : `All ${totals} channels inside band, no open incident`;

  const summary = [
    `Advisor focused on ${FOCUS_LABEL[focus] ?? focus}.`,
    `${outOfBand.length} of ${totals} live channels are outside nominal and there are ${critical.length} critical and ${warning.length} warning incidents open.`,
    data.worst
      ? `The widest single-point shutdown on this station is ${data.worst.label}, which reaches ${data.worst.impacted} downstream systems.`
      : "",
    data.prediction
      ? `The continuity engine reports ${data.prediction.riskLevel} risk with a predicted drop in ${data.prediction.minutesToDrop} minutes.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    headline,
    risk,
    summary,
    actions: actions.slice(0, 6),
    watch: [...new Set(watch)].slice(0, 5),
    evidence: evidence.slice(0, 10),
  };
}

/** Live context block handed to the model. */
function contextBlock(data: Snapshot, focus: string): string {
  const lines: string[] = [];
  lines.push(`STATION: ${data.slug} - ${REFERENCE[data.slug] ?? "Indian Antarctic station"}`);
  lines.push(`ADVISOR FOCUS: ${FOCUS_LABEL[focus] ?? focus}. ${FOCUS_GUIDE[focus] ?? ""}`);
  lines.push(`TELEMETRY (${data.readings.length} live channels):`);
  for (const reading of data.readings.slice(0, 20)) {
    lines.push(
      `  ${reading.equipmentId} | ${reading.parameter} = ${reading.value.toFixed(reading.decimals)} ${reading.unit} [${reading.status}]`,
    );
  }
  lines.push(`OPEN INCIDENTS (${data.alerts.length}):`);
  for (const alert of data.alerts) {
    lines.push(
      `  [${alert.severity}] ${alert.subsystem}/${alert.equipmentId}: ${alert.message}${alert.acknowledged ? " (acknowledged)" : ""}`,
    );
  }
  if (data.prediction) {
    lines.push(
      `CONTINUITY: risk ${data.prediction.riskLevel}, drop in ${data.prediction.minutesToDrop} min, confidence ${data.prediction.confidence}% (target ${data.prediction.accuracyTarget}% accuracy).`,
    );
    for (const driver of data.prediction.drivers) {
      lines.push(`  driver ${driver.label} = ${driver.value} ${driver.unit}`);
    }
  }
  if (data.microgrid?.online) {
    for (const source of data.microgrid.sources) {
      lines.push(
        `GENERATION ${source.source}: ${source.outputKw} kW electrical, ${source.thermalKw} kW thermal, storage ${source.soc}%, load ${source.loadKw} kW`,
      );
    }
  }
  if (data.weather) {
    lines.push(
      `WEATHER: ${data.weather.temperature} C, wind ${data.weather.windSpeed} m/s at ${data.weather.windDirection} deg, ${data.weather.pressure} hPa`,
    );
  }
  if (data.worst) {
    lines.push(
      `DEPENDENCY GRAPH: the widest single-point shutdown is ${data.worst.label}, reaching ${data.worst.impacted} downstream systems${data.worst.crewRiskNode ? `, crew-critical at ${data.worst.crewRiskNode}` : ""}.`,
    );
  }
  lines.push(`RECENT CHANNEL REPAIRS (${data.repairs.length}):`);
  for (const repair of data.repairs) {
    lines.push(`  ${repair.equipmentId}: ${repair.cause}`);
  }
  lines.push(`RECENT SELF-TESTS (${data.selfTests.length}):`);
  for (const test of data.selfTests) {
    lines.push(
      `  ${test.suite}: ${test.pass ? "pass" : "FAIL"}, ${test.corrected} corrections`,
    );
  }
  if (data.seaLift) lines.push(`SEA LIFT: ${data.seaLift}`);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are the DhruvaTwin station advisor for the Indian Antarctic research programme operated by NCPOR under the Ministry of Earth Sciences. You do not chat. You produce a decision briefing for the duty engineer on shift at one station, from the live context you are given.

Rules:
- Use only the numbers and facts in the context. Never invent a reading, a person or a procedure.
- Rank by consequence to the crew, then by how soon it bites.
- Every action must be something a person on station can actually do, with a plain owner and a time window.
- Be specific: name the equipment tag and the reading behind the recommendation.
- British English, metric units, UTC. No emojis, no filler, no restating the question.

Answer as JSON only, exactly this shape:
{
  "headline": "one line, under 90 characters, the single most important fact",
  "risk": "critical" | "warning" | "watch",
  "summary": "three sentences at most, why the risk is what it is",
  "actions": [
    { "title": "imperative, under 70 characters", "why": "the reading or dependency behind it", "owner": "who does it", "window": "immediate | this watch | before <event> | next drill slot", "severity": "critical" | "warning" | "watch" }
  ],
  "watch": ["things to keep an eye on, each under 90 characters"],
  "evidence": ["the exact live facts used, each under 110 characters"]
}
Give between three and six actions, at least two watch items and at least four evidence items.`;

/** Validate what came back before it reaches the screen. */
function parseBriefing(raw: string): AdvisorBriefing | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<AdvisorBriefing>;
    if (!parsed.headline || !parsed.summary || !Array.isArray(parsed.actions)) return null;
    const severity = (value: unknown): AdvisorSeverity =>
      value === "critical" || value === "warning" ? value : "watch";
    return {
      headline: String(parsed.headline).slice(0, 200),
      risk: severity(parsed.risk),
      summary: String(parsed.summary).slice(0, 900),
      actions: parsed.actions
        .filter((action) => action && typeof action.title === "string")
        .slice(0, 6)
        .map((action) => ({
          title: String(action.title).slice(0, 160),
          why: String(action.why ?? "").slice(0, 400),
          owner: String(action.owner ?? "Duty engineer").slice(0, 80),
          window: String(action.window ?? "this watch").slice(0, 80),
          severity: severity(action.severity),
        })),
      watch: Array.isArray(parsed.watch)
        ? parsed.watch.slice(0, 6).map((item) => String(item).slice(0, 200))
        : [],
      evidence: Array.isArray(parsed.evidence)
        ? parsed.evidence.slice(0, 10).map((item) => String(item).slice(0, 240))
        : [],
    };
  } catch {
    return null;
  }
}

/** Produce a station briefing for one focus area. */
export const briefing = action({
  args: {
    slug: v.string(),
    focus: v.string(),
    /** Sea-lift line computed by the console from the voyage model. */
    seaLift: v.optional(v.string()),
  },
  handler: async (ctx, { slug, focus, seaLift }): Promise<AdvisorResult> => {
    const data = await snapshot(ctx, slug, seaLift);
    const fallback = ruleBriefing(data, focus);
    const key = process.env.GROQ_API_KEY;

    if (!key) {
      return { ...fallback, model: "dhruvatwin-advisor-rules", usedFallback: true };
    }

    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 1400,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "system",
              content: `LIVE STATION CONTEXT\n${contextBlock(data, focus)}`,
            },
            {
              role: "user",
              content: `Produce the ${FOCUS_LABEL[focus] ?? focus} briefing for ${slug} now.`,
            },
          ],
        }),
      });
      if (!res.ok) {
        return { ...fallback, model: "dhruvatwin-advisor-rules", usedFallback: true };
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      const parsed = content ? parseBriefing(content) : null;
      if (!parsed) {
        return { ...fallback, model: "dhruvatwin-advisor-rules", usedFallback: true };
      }
      return {
        ...parsed,
        // Never let the model drop the deterministic findings entirely: the
        // evidence list is the audit trail for the briefing.
        evidence: parsed.evidence.length > 0 ? parsed.evidence : fallback.evidence,
        model: GROQ_MODEL,
        usedFallback: false,
      };
    } catch {
      return { ...fallback, model: "dhruvatwin-advisor-rules", usedFallback: true };
    }
  },
});
