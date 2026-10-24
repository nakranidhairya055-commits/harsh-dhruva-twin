/**
 * DhruvaTwin cascade model.
 *
 * Pure data and pure functions, shared by the Convex cascade engine and the
 * console UI. Nothing here touches the database, so the same propagation the
 * server records is the propagation drawn on screen.
 *
 * The graph encodes what actually depends on what at each station: the
 * subsystems, the equipment tags behind them, the redundancy each node runs
 * with, and how long it takes to isolate it. Propagation is deterministic, so
 * two operators running the same trigger always get the same answer.
 */

export type CascadeSeverity = "critical" | "warning" | "watch";

export type Redundancy = "none" | "n+1" | "dual";

export interface CascadeNode {
  id: string;
  /** Equipment or subsystem tag shown in the console. */
  label: string;
  subsystem: string;
  /** Distance from the site edge: 0 fuel and utilities, 4 habitation and comms. */
  tier: number;
  /** Nodes this one needs. A trigger propagates along these edges. */
  dependsOn: string[];
  redundancy: Redundancy;
  /** Seconds a competent operator needs to isolate this node once alarmed. */
  isolationSec: number;
  /** Consequence weight, 1 (negligible) to 10 (crew safety). */
  impactWeight: number;
  /** The isolation or recovery procedure written on the drill card. */
  procedure: string;
}

/** How much downstream damage the trigger still carries. */
export const SEVERITY_FACTOR: Record<CascadeSeverity, number> = {
  critical: 1,
  warning: 0.62,
  watch: 0.34,
};

/** Redundancy keeps part of the consequence from moving downstream. */
export const REDUNDANCY_ATTENUATION: Record<Redundancy, number> = {
  none: 1,
  "n+1": 0.45,
  dual: 0.2,
};

/** Seconds of transport delay added per edge. */
export const EDGE_DELAY_SEC = 25;

/** Maitri: four diesel generators, heated lake pipeline, iron-pillar habitat. */
const MAITRI_GRAPH: CascadeNode[] = [
  {
    id: "fuel.farm",
    label: "Fuel farm and day tanks",
    subsystem: "fuel",
    tier: 0,
    dependsOn: [],
    redundancy: "n+1",
    isolationSec: 90,
    impactWeight: 8,
    procedure:
      "Transfer to the reserve tank and shut the affected bund valve. Confirm leak detection is still armed before restarting transfer.",
  },
  {
    id: "power.gen",
    label: "Generator hall (4 x 62.5 kVA)",
    subsystem: "power",
    tier: 1,
    dependsOn: ["fuel.farm"],
    redundancy: "n+1",
    isolationSec: 120,
    impactWeight: 10,
    procedure:
      "Run up the standby set on the cold-start checklist, synchronise, then trip the faulted unit. Confirm bus frequency stays inside 49.5 to 50.5 Hz.",
  },
  {
    id: "power.pdu",
    label: "PDU and switchboard",
    subsystem: "power",
    tier: 2,
    dependsOn: ["power.gen"],
    redundancy: "dual",
    isolationSec: 60,
    impactWeight: 9,
    procedure:
      "Open the tie breaker to the standby bus and transfer non-essential feeders off before working the faulted section.",
  },
  {
    id: "power.ups",
    label: "UPS and critical bus",
    subsystem: "power",
    tier: 3,
    dependsOn: ["power.pdu"],
    redundancy: "dual",
    isolationSec: 30,
    impactWeight: 9,
    procedure:
      "Confirm the UPS is on battery and shed non-critical load until the bus is restored. Battery autonomy is 30 minutes at critical load.",
  },
  {
    id: "thermal.boiler",
    label: "Thermal plant and boilers",
    subsystem: "thermal",
    tier: 2,
    dependsOn: ["power.pdu", "fuel.farm"],
    redundancy: "n+1",
    isolationSec: 180,
    impactWeight: 8,
    procedure:
      "Change over to the standby boiler and hold the heating loop above set point while the faulted boiler is isolated.",
  },
  {
    id: "thermal.loop",
    label: "Heating loop and radiators",
    subsystem: "thermal",
    tier: 3,
    dependsOn: ["thermal.boiler"],
    redundancy: "dual",
    isolationSec: 120,
    impactWeight: 9,
    procedure:
      "Close the section valves on the faulted leg so the rest of the loop keeps circulating, then drain and repair.",
  },
  {
    id: "water.pipeline",
    label: "Heated pipeline (trace heating)",
    subsystem: "water",
    tier: 2,
    dependsOn: ["power.pdu", "power.gen"],
    redundancy: "n+1",
    isolationSec: 150,
    impactWeight: 9,
    procedure:
      "Switch the trace heating to the spare circuit within 15 minutes and keep flow moving. A stopped line freezes in about 45 minutes.",
  },
  {
    id: "water.tank",
    label: "Water tank and domestic supply",
    subsystem: "water",
    tier: 3,
    dependsOn: ["water.pipeline"],
    redundancy: "n+1",
    isolationSec: 90,
    impactWeight: 7,
    procedure:
      "Draw from the reserve tank and cut non-essential draw such as laundry and vehicle wash until the pipeline is back.",
  },
  {
    id: "habitat.envelope",
    label: "Habitat envelope and airlock",
    subsystem: "life_support",
    tier: 4,
    dependsOn: ["thermal.loop", "power.ups"],
    redundancy: "dual",
    isolationSec: 60,
    impactWeight: 10,
    procedure:
      "Close the airlock to the vestibule, hold the inner envelope sealed and keep at least one heater loop live on the critical bus.",
  },
  {
    id: "comms.vsat",
    label: "VSAT uplink and modem",
    subsystem: "comms",
    tier: 3,
    dependsOn: ["power.ups"],
    redundancy: "dual",
    isolationSec: 45,
    impactWeight: 7,
    procedure:
      "Fail over to the Iridium SBD profile and flush the priority queue highest-first while the VSAT chain is recovered.",
  },
  {
    id: "env.aws",
    label: "Automatic weather station",
    subsystem: "environment",
    tier: 3,
    dependsOn: ["power.ups"],
    redundancy: "n+1",
    isolationSec: 40,
    impactWeight: 6,
    procedure:
      "Run the mast on its internal battery and fall back to the manual observation schedule until telemetry returns.",
  },
  {
    id: "safety.leak",
    label: "Leak and fire detection",
    subsystem: "safety",
    tier: 3,
    dependsOn: ["power.ups"],
    redundancy: "dual",
    isolationSec: 30,
    impactWeight: 10,
    procedure:
      "Post a standing fire watch on the affected zone until detection is verified healthy again. Never leave the zone unmonitored.",
  },
  {
    id: "field.party",
    label: "Field party support",
    subsystem: "life_support",
    tier: 4,
    dependsOn: ["comms.vsat", "env.aws"],
    redundancy: "none",
    isolationSec: 0,
    impactWeight: 8,
    procedure:
      "Recall or hold the field party by UHF schedule and confirm their position before the outage window opens.",
  },
];

/** Bharati: three CHP units, 450 m seawater intake, 134-container complex. */
const BHARATI_GRAPH: CascadeNode[] = [
  {
    id: "fuel.farm13",
    label: "Fuel farm (13 tanks, 300,000 L)",
    subsystem: "fuel",
    tier: 0,
    dependsOn: [],
    redundancy: "n+1",
    isolationSec: 120,
    impactWeight: 8,
    procedure:
      "Isolate the faulted tank pair, confirm bund integrity and keep the day tank above the low-level alarm.",
  },
  {
    id: "power.chp",
    label: "CHP units (3 x 100 kVA / 150 kW)",
    subsystem: "power",
    tier: 1,
    dependsOn: ["fuel.farm13"],
    redundancy: "n+1",
    isolationSec: 150,
    impactWeight: 10,
    procedure:
      "Bring the third unit online and share load across two before isolating the faulted machine. Watch thermal recovery on the loop.",
  },
  {
    id: "power.grid",
    label: "Station distribution grid",
    subsystem: "power",
    tier: 2,
    dependsOn: ["power.chp"],
    redundancy: "dual",
    isolationSec: 60,
    impactWeight: 9,
    procedure:
      "Split the ring into two sections and run each from a different CHP unit so a single fault cannot take the complex down.",
  },
  {
    id: "power.ups",
    label: "UPS and emergency bus",
    subsystem: "power",
    tier: 3,
    dependsOn: ["power.grid"],
    redundancy: "dual",
    isolationSec: 30,
    impactWeight: 9,
    procedure:
      "Confirm the emergency bus is on battery, then shed laboratory and laundry load until the grid is stable.",
  },
  {
    id: "thermal.loop",
    label: "Thermal loop and snow melt",
    subsystem: "thermal",
    tier: 3,
    dependsOn: ["power.chp", "power.grid"],
    redundancy: "n+1",
    isolationSec: 180,
    impactWeight: 8,
    procedure:
      "Hold the loop on the two healthy units and close the melt circuit to protect the habitat set point.",
  },
  {
    id: "water.intake",
    label: "Seawater intake (450 m)",
    subsystem: "water",
    tier: 1,
    dependsOn: ["power.grid"],
    redundancy: "n+1",
    isolationSec: 240,
    impactWeight: 8,
    procedure:
      "Verify flow before assuming a pump fault: ice blockage and a pump trip present the same way. Back-flush, then restart.",
  },
  {
    id: "water.plant",
    label: "Desalination plant",
    subsystem: "water",
    tier: 2,
    dependsOn: ["water.intake", "power.grid"],
    redundancy: "n+1",
    isolationSec: 120,
    impactWeight: 8,
    procedure:
      "Run the reserve train and hold production to domestic demand only until the plant is back.",
  },
  {
    id: "wastewater.plant",
    label: "Wastewater treatment plant",
    subsystem: "life_support",
    tier: 2,
    dependsOn: ["power.grid", "water.plant"],
    redundancy: "n+1",
    isolationSec: 150,
    impactWeight: 8,
    procedure:
      "Hold discharge and store effluent in the buffer tank. Discharge without treatment is a treaty breach, not an inconvenience.",
  },
  {
    id: "habitat.envelope",
    label: "Container complex envelope",
    subsystem: "life_support",
    tier: 4,
    dependsOn: ["thermal.loop", "power.ups"],
    redundancy: "dual",
    isolationSec: 60,
    impactWeight: 10,
    procedure:
      "Close the vestibule doors between wings, hold the heated envelope on the emergency bus and keep one wing fully warm.",
  },
  {
    id: "comms.vsat",
    label: "VSAT uplink and modem",
    subsystem: "comms",
    tier: 3,
    dependsOn: ["power.ups"],
    redundancy: "dual",
    isolationSec: 45,
    impactWeight: 7,
    procedure:
      "Fail over to the Iridium SBD profile and flush the offline queue highest priority first.",
  },
  {
    id: "env.aws",
    label: "Automatic weather station",
    subsystem: "environment",
    tier: 3,
    dependsOn: ["power.ups"],
    redundancy: "n+1",
    isolationSec: 40,
    impactWeight: 6,
    procedure:
      "Run the mast on internal battery and log manual observations until the automatic feed returns.",
  },
  {
    id: "lab.power",
    label: "Laboratory regulated power",
    subsystem: "power",
    tier: 4,
    dependsOn: ["power.ups"],
    redundancy: "dual",
    isolationSec: 30,
    impactWeight: 6,
    procedure:
      "Protect running experiments first: hold the lab on its conditioner, and only then take load for the rest of the complex.",
  },
  {
    id: "safety.detection",
    label: "Fire and gas detection",
    subsystem: "safety",
    tier: 3,
    dependsOn: ["power.ups"],
    redundancy: "dual",
    isolationSec: 30,
    impactWeight: 10,
    procedure:
      "Post a fire watch on the affected wing until detection is verified healthy. Never leave a zone unmonitored.",
  },
];

/** One dependency graph per instrumented station. */
export const CASCADE_GRAPHS: Record<string, CascadeNode[]> = {
  maitri: MAITRI_GRAPH,
  bharati: BHARATI_GRAPH,
};

/** Read the graph for a station, falling back to Maitri. */
export function cascadeGraph(slug: string): CascadeNode[] {
  return CASCADE_GRAPHS[slug] ?? MAITRI_GRAPH;
}

export interface CascadeImpact {
  id: string;
  label: string;
  subsystem: string;
  tier: number;
  /** Seconds from the trigger to this node losing function. */
  timeToImpactSec: number;
  /** Probability the consequence actually reaches the node. */
  probability: number;
  severity: CascadeSeverity;
  state: "impacted" | "isolated";
  path: string[];
  impactWeight: number;
  procedure: string;
}

export interface CascadeResult {
  triggerId: string;
  triggerLabel: string;
  severity: CascadeSeverity;
  impacts: CascadeImpact[];
  isolated: string[];
  /** Nodes that never left nominal because redundancy absorbed the event. */
  spared: string[];
  /** First node whose loss endangers the crew, with its time to impact. */
  crewRiskSec: number | null;
  crewRiskNode: string | null;
  /** Minutes of response time the isolation points bought back. */
  minutesBought: number;
  /** 0 to 100 index: how much of the station's consequence was prevented. */
  resilience: number;
  recommendation: string;
}

/** Deterministically propagate a trigger through the graph. */
export function simulateCascade({
  nodes,
  triggerId,
  severity,
  isolations = [],
}: {
  nodes: CascadeNode[];
  triggerId: string;
  severity: CascadeSeverity;
  isolations?: string[];
}): CascadeResult {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const isolated = new Set(isolations.filter((id) => byId.has(id)));
  const severityFactor = SEVERITY_FACTOR[severity];
  const trigger = byId.get(triggerId);

  const arrival = new Map<string, { time: number; probability: number; path: string[] }>();

  if (!trigger) {
    return {
      triggerId,
      triggerLabel: "unknown",
      severity,
      impacts: [],
      isolated: [...isolated],
      spared: nodes.map((node) => node.id),
      crewRiskSec: null,
      crewRiskNode: null,
      minutesBought: 0,
      resilience: 100,
      recommendation: "Select a valid trigger node to run the drill.",
    };
  }

  if (!isolated.has(triggerId)) {
    arrival.set(triggerId, { time: 0, probability: 1, path: [triggerId] });
  }

  // Relaxation pass: each node takes the fastest path from a live parent and
  // iteration continues until no arrival time improves. Deterministic and
  // bounded, so a drill result never depends on iteration order.
  let changed = true;
  let guard = 0;
  while (changed && guard < nodes.length + 2) {
    changed = false;
    guard += 1;
    for (const node of nodes) {
      if (node.id === triggerId || isolated.has(node.id)) continue;
      let best: { time: number; probability: number; path: string[] } | null = null;
      for (const parentId of node.dependsOn) {
        if (isolated.has(parentId)) continue;
        const parent = arrival.get(parentId);
        if (!parent) continue;
        const probability = Math.min(
          1,
          parent.probability * REDUNDANCY_ATTENUATION[node.redundancy] * severityFactor,
        );
        const time = parent.time + node.isolationSec + EDGE_DELAY_SEC;
        if (!best || time < best.time) {
          best = { time, probability, path: [...parent.path, node.id] };
        }
      }
      if (!best) continue;
      const current = arrival.get(node.id);
      if (!current || best.time < current.time - 0.001) {
        arrival.set(node.id, best);
        changed = true;
      }
    }
  }

  const impacts: CascadeImpact[] = [];
  for (const node of nodes) {
    if (node.id === triggerId) continue;
    const state = arrival.get(node.id);
    if (!state) continue;
    impacts.push({
      id: node.id,
      label: node.label,
      subsystem: node.subsystem,
      tier: node.tier,
      timeToImpactSec: Math.round(state.time),
      probability: Math.round(state.probability * 100) / 100,
      severity:
        state.probability >= 0.6 ? "critical" : state.probability >= 0.3 ? "warning" : "watch",
      state: isolated.has(node.id) ? "isolated" : "impacted",
      path: state.path,
      impactWeight: node.impactWeight,
      procedure: node.procedure,
    });
  }
  impacts.sort((a, b) => a.timeToImpactSec - b.timeToImpactSec);

  const reached = new Set(impacts.map((impact) => impact.id));
  reached.add(triggerId);
  const spared = nodes
    .filter((node) => !reached.has(node.id) || isolated.has(node.id))
    .map((node) => node.id);

  const totalWeight = nodes.reduce((sum, node) => sum + node.impactWeight, 0) || 1;
  const lostWeight = impacts
    .filter((impact) => impact.state === "impacted")
    .reduce((sum, impact) => sum + impact.impactWeight * impact.probability, 0);
  const resilience = Math.max(0, Math.round((1 - lostWeight / totalWeight) * 100));

  const crewNode = impacts.find(
    (impact) => impact.impactWeight >= 10 && impact.state === "impacted",
  );

  // Response window: the time the isolation points buy before the first
  // crew-critical node is lost.
  const criticalTimes = impacts
    .filter((impact) => impact.impactWeight >= 8)
    .map((impact) => impact.timeToImpactSec);
  const minutesBought =
    criticalTimes.length > 0 ? Math.round(Math.min(...criticalTimes) / 60) : 0;

  const recommendation = crewNode
    ? `Isolate ${trigger.label} at the drill card, then protect ${crewNode.label} first - it is ${Math.round(crewNode.timeToImpactSec / 60)} minutes out and carries crew-safety weight.`
    : `Isolate ${trigger.label} at the drill card and verify the ${isolations.length} planned isolation points on the plant before recovery.`;

  return {
    triggerId,
    triggerLabel: trigger.label,
    severity,
    impacts,
    isolated: [...isolated],
    spared,
    crewRiskSec: crewNode ? crewNode.timeToImpactSec : null,
    crewRiskNode: crewNode ? crewNode.label : null,
    minutesBought,
    resilience,
    recommendation,
  };
}

/** One-line summary recorded with the drill. */
export function cascadeSummary(result: CascadeResult): string {
  const impacted = result.impacts.filter((impact) => impact.state === "impacted").length;
  return [
    `Cascade drill on ${result.triggerLabel}`,
    `severity ${result.severity}`,
    `${impacted} nodes impacted`,
    `${result.isolated.length} isolated`,
    `${result.minutesBought} min response window`,
    `resilience ${result.resilience}%`,
  ].join(" | ");
}
