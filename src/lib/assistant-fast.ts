/**
 * Instant assistant replies.
 *
 * Meta questions and console how-to questions do not need a model or a round
 * trip, and waiting a second for "hello" is what makes an assistant feel slow.
 * These are answered locally, immediately, while anything that needs live
 * station data or general knowledge goes to the assistant action.
 */

export interface FastReply {
  answer: string;
  /** Label shown under the bubble. */
  model: string;
}

interface Rule {
  id: string;
  /** Patterns that match the question. */
  match: RegExp[];
  answer: (question: string) => string;
}

/**
 * One route per screen.
 *
 * The assistant is the guide for the whole platform, so "where do I find X"
 * has to be instant and exact. These are matched before the broad topic rules,
 * and each one names the screen, the path and the two moves that matter.
 */
interface ScreenRoute {
  id: string;
  match: RegExp;
  name: string;
  path: string;
  holds: string;
  next: string;
}

const SCREEN_ROUTES: ScreenRoute[] = [
  {
    id: "advisor",
    match: /advisor|briefing|what should i do|recommend|priorit(y|ise|ize)/i,
    name: "AI Advisor",
    path: "/advisor",
    holds:
      "a grounded briefing for one station: a headline, a risk level, three to six ranked actions with an owner and a time window, a watch list, and the live evidence behind every line. Six focus areas, from the daily briefing to the water path and the sea lift.",
    next:
      "read the actions in order, then open the evidence list underneath to check the reading each one rests on. Change the focus to see the same live data answer a different question.",
  },
  {
    id: "dashboard",
    match: /dashboard|live readings?|every channel|sensor grid/i,
    name: "Sensor Dashboard",
    path: "/dashboard",
    holds:
      "every live channel for the selected station with its operating band and status, refreshed on the ten second tick, with charts and the continuity forecast line.",
    next:
      "click a channel to open it, and watch a warning clear once a repair is applied in the Repair Bay.",
  },
  {
    id: "alerts",
    match: /alert|incident|triage|acknowledge|resolve a/i,
    name: "Alert Triage",
    path: "/alerts",
    holds:
      "the incident matrix broken out by subsystem and severity, with the sensor reading and actuator state recorded against each alert.",
    next:
      "acknowledge every critical before touching a warning, and resolve only after two consecutive in-band readings.",
  },
  {
    id: "microgrid",
    match: /microgrid|power (plant|balance)|chp|generation|thermal recovery/i,
    name: "Microgrid and CHP",
    path: "/microgrid",
    holds:
      "generation against station load, thermal recovery, storage state of charge and the plant advisories for both stations.",
    next:
      "compare online output against load: under fifteen percent headroom is where the advisor starts asking for the standby set.",
  },
  {
    id: "station",
    match: /roster|personnel|crew list|duty|roll call|who is on station/i,
    name: "Station Dashboard",
    path: "/station",
    holds: "the roster, duty board, personnel badges and roll call for the station.",
    next: "queue a roll call and it lands in the same records the audit trail verifies.",
  },
  {
    id: "environment",
    match: /ice velocity|satellite pass|local environment/i,
    name: "Local Environment",
    path: "/environment",
    holds: "the ice velocity field, local environment measurements and the satellite pass schedule.",
    next: "check the pass schedule before planning anything that depends on the uplink.",
  },
  {
    id: "weather",
    match: /weather page|forecast|open-meteo|wind limit/i,
    name: "Weather Extension",
    path: "/weather",
    holds:
      "Open-Meteo hourly temperature, wind and pressure for both station coordinates, plus a seven day forecast strip, with the automatic weather station series as the offline fallback.",
    next: "compare the wind trace against the katabatic band before releasing a field party.",
  },
  {
    id: "antarctic-mode",
    match: /sos|check-?in|field (app|interface)|high contrast|antarctic mode/i,
    name: "Antarctic Mode",
    path: "/antarctic",
    holds:
      "a separate high-contrast field interface: pure black, 18 point body text, 64 pixel targets and a 200 pixel SOS control, with tasks, issue reports, check-ins and the vehicle log.",
    next: "field traffic is written to the offline queue before any network attempt, so it survives a link loss.",
  },
  {
    id: "compliance",
    match: /metadata|npdc|export a dataset|compliance/i,
    name: "NPDC Compliance",
    path: "/compliance",
    holds:
      "metadata validation against the NPDC submission standard, with CF standard names and GCMD keywords, and the schema.org Dataset export.",
    next: "every export is also written to the audit chain, so the provenance follows the file.",
  },
  {
    id: "audit",
    match: /audit|hash chain|tamper/i,
    name: "Audit Trail",
    path: "/audit",
    holds: "the rolling hash chain over every command, with the head digest and chain verification.",
    next: "run the verification after any action you want to prove: an edit, insertion or reordering of history changes the digest.",
  },
  {
    id: "catalog",
    match: /catalog|equipment (registry|page|tag)|spare part/i,
    name: "Equipment Catalog",
    path: "/catalog",
    holds: "the equipment registry and the page behind every instrumented tag, with specs and its live sensors.",
    next: "use it when an incident names a tag you do not recognise.",
  },
  {
    id: "library",
    match: /library|treaty document|field manual|policy document/i,
    name: "NCPOR Library",
    path: "/library",
    holds: "treaty instruments, Ministry policy, NPDC data standards, field manuals and scientific reports, tagged and searchable.",
    next: "search by tag rather than scrolling: the collection is grouped by document type.",
  },
  {
    id: "expeditions",
    match: /expedition log|isea series|which expedition/i,
    name: "Expedition Logs",
    path: "/expeditions",
    holds: "the ISEA series from 1981-82 to the current season, with the hosting station and programme focus.",
    next: "use it to place a station event in the season it happened in.",
  },
  {
    id: "antarctica",
    match: /antarctica overview|sector map|all four (indian )?stations/i,
    name: "Antarctica Overview",
    path: "/antarctica",
    holds: "all four Indian sites on one sector map: Maitri, Bharati, Dakshin Gangotri and the planned Maitri II, 3,098 km apart.",
    next: "click a site to jump into its twin.",
  },
  {
    id: "admin",
    match: /role|permission|admin console|commander view|scientist view/i,
    name: "Admin Console",
    path: "/admin",
    holds: "roles and access, and the four role views: Admin, Commander, Scientist and Station.",
    next: "switch the role view to see how navigation and actions gate for each one.",
  },
];

/** Cross-cutting guidance that is not tied to one screen. */
const GUIDE_ANSWERS: Array<{ id: string; match: RegExp; answer: string }> = [
  {
    id: "guide-tour",
    match: /guide me|walk me|show me around|give me a tour|where do i start|getting started|what should i look at|overview of the (console|project)|how does this (project|console) work/i,
    answer: [
      "Guided walkthrough, in the order that builds context fastest:",
      "1. Sensor Dashboard - every live channel with its band; this is the picture everything else reasons over.",
      "2. Alert Triage - the incident matrix; acknowledge a critical, resolve a warning.",
      "3. AI Advisor - let it write the daily briefing, then read the ranked actions with their owners and windows.",
      "4. Digital Twin 3D - switch station, cycle the view modes, click an object to pin its label and press Esc to clear it, then walk the site and the interiors.",
      "5. Cascade Drill - click a box in the flowchart to shut that system down and read what is affected.",
      "6. Repair Bay - apply a repair, then run the FPGA self-healing self-test.",
      "7. Resupply Voyage - the supply ship, its position on the chart, and a timeline you can scrub.",
      "8. NPDC Compliance then Audit Trail - validate and export metadata, then verify the hash chain.",
      "Open the AI Advisor whenever you want the console to decide what matters rather than describe what is there.",
    ].join("\n"),
  },
  {
    id: "labels",
    match: /label|nameplate|tag(s)? on the (object|model)|why is there nothing written/i,
    answer: [
      "Labels in the 3D scene appear on click, not by default.",
      "- Click an object in the twin and its label appears with the live reading behind it; the cross at the top right of the label removes that one.",
      "- Press Esc, or the 'clear N labels' chip in the scene toolbar, to take every label you opened back off.",
      "- The Layers menu has 'Place titles and telemetry strips' for the ambient set (telemetry strips, room plates, the airlock marker), and 'Species name labels' for the wildlife names. Press L to hide or show every floating label.",
    ].join("\n"),
  },
  {
    id: "badge",
    match: /badge|achievement|xp|level up|gamif/i,
    answer: [
      "The Field badge is the progression layer over the twin, and it lives in the right rail of the Digital Twin.",
      "- Nineteen badges across Explorer, Naturalist, Operator and Resilience: distance walked outside, rooms stood in, species carded, both stations visited, drone tour stops watched, drills run, a repair applied, the FPGA self-test, an advisor briefing generated.",
      "- Each badge pays experience towards a level, with a progress bar in the card, and progress is stored locally so it survives a reload and works offline.",
    ].join("\n"),
  },
  {
    id: "advisor-install",
    match: /groq|api key|model key|why is the assistant falling back|llama/i,
    answer: [
      "The console runs with or without a model key, and tells you which engine answered.",
      "- With no key the station assistant answers from a deterministic rule engine over the same live context, and the AI Advisor writes its briefing from the same live inputs, so nothing is ever empty.",
      "- With a key set the assistant and the advisor run on llama-3.3-70b-versatile: the advisor answers in JSON and the result is validated before it reaches the screen.",
      "- The key is a deployment secret named GROQ_API_KEY, held in the project's keys tab rather than in the code; no key is needed for weather, the keyless map embeds or the public MQTT broker.",
    ].join("\n"),
  },
];

const RULES: Rule[] = [
  ...GUIDE_ANSWERS.map((entry) => ({
    id: entry.id,
    match: [entry.match],
    answer: () => entry.answer,
  })),
  ...SCREEN_ROUTES.map((entry) => ({
    id: `screen-${entry.id}`,
    match: [entry.match],
    answer: () =>
      [
        `${entry.name} is where that lives - open ${entry.path}.`,
        `- What it holds: ${entry.holds}`,
        `- Next: ${entry.next}`,
      ].join("\n"),
  })),
  {
    id: "greeting",
    match: [/^\s*(hi|hey|hello|yo|namaste|good (morning|afternoon|evening))\b/i],
    answer: (question) =>
      [
        `Hello. I am the DhruvaTwin assistant, and I can help with two kinds of question.`,
        `- Station operations: readiness, incidents, continuity risk, power, water, weather limits, telemetry repair and the cascade drill.`,
        `- General knowledge: polar science, Antarctic history, engineering, definitions, and anything else you want explained. Ask me ${question.trim().endsWith("?") ? "anything else" : "away"}.`,
      ].join("\n"),
  },
  {
    id: "thanks",
    match: [/^\s*(thanks|thank you|cheers|great, thanks|shukriya)\b/i],
    answer: () => "Any time. Ask again whenever you want the station picture, a procedure, or something explained from first principles.",
  },
  {
    id: "identity",
    match: [/who are you|what are you\b|your name|are you (an? )?(ai|bot|human)/i],
    answer: () =>
      [
        "I am the station assistant inside DhruvaTwin, the digital twin console for the Indian Antarctic stations Maitri and Bharati, built for NCPOR under the Ministry of Earth Sciences.",
        "- I answer from live station context when the question is operational.",
        "- I answer from general knowledge when the question is not, so you can ask about polar science, engineering or history without leaving the console.",
        "- With a Groq key configured I run on llama-3.3-70b-versatile; without one I fall back to a local rule engine over the same live context, which is why the console stays usable offline.",
      ].join("\n"),
  },
  {
    id: "capabilities",
    match: [/what can you do|how can you help|what do you do|help me|^help$/i],
    answer: () =>
      [
        "Assessment: I read the live station context and answer questions over it, and I answer general questions too.",
        "- Operations: continuity and blackout risk, open incidents by severity, microgrid headroom, water path, weather limits, personnel state.",
        "- Maintenance: telemetry repair procedures in the repair bay, and the FPGA self-healing self-test verdicts.",
        "- Resilience: cascade drill results, which node is reached next, and the isolation plan that buys the most time.",
        "- Logistics: resupply voyage position, cargo and noon reports for the sea lift from Cape Town.",
        "- Wildlife: where each penguin, seal, whale, dolphin, bird, fish or invertebrate colony is modelled in the twin, and the sighting log behind it.",
        "- General: any question outside the station, answered normally rather than forced into a template.",
      ].join("\n"),
  },
  {
    id: "walk-inside",
    match: [/walk inside|enter the station|go inside|interior|walk mode/i],
    answer: () =>
      [
        "To walk the station: open the Digital Twin, switch the view to Interior, then click into the canvas to take the pointer.",
        "- WASD moves, mouse looks, Shift sprints, Space jumps, and Esc releases the pointer.",
        "- Doors open as you approach them, and clicking a fixture with the crosshair opens its detail panel.",
        "- The interior toggle also gives the overhead deck plan if you want the whole floor at once.",
      ].join("\n"),
  },
  {
    id: "drone",
    match: [/drone|tour|fly ?over|show ?me around/i],
    answer: () =>
      [
        "Drone tour: on the Digital Twin, choose Drone Tour in the view selector.",
        "- The drone flies a scripted route over the station and narrates every stop with the real facts behind it.",
        "- You get pause, previous, next, restart and half, normal or double speed.",
        "- Take control at any time: switch back to Exterior and the camera is yours again, free to orbit, pan and zoom.",
      ].join("\n"),
  },
  {
    id: "free-camera",
    match: [/camera (stuck|snap|return)|free view|orbit|why does the camera/i],
    answer: () =>
      [
        "The camera is free by default. Choosing a preset flies it there once and then releases it.",
        "- Drag to orbit, right-drag to pan, scroll to zoom.",
        "- If a preset is re-selected it flies again; otherwise nothing writes to the camera while you work.",
        "- Reset to overview from the Camera menu whenever you want the wide shot back.",
      ].join("\n"),
  },
  {
    id: "offline",
    match: [/offline|sync|queue|mqtt|broker/i],
    answer: () =>
      [
        "Offline sync works in three layers: the console keeps working, the outbound messages queue, and the queue drains in priority order when the link returns.",
        "- Priority order: SOS first, then critical telemetry, then check-ins, then routine traffic.",
        "- Queued items live in IndexedDB, so a page reload or a browser restart does not lose them.",
        "- The header shows ONLINE, SYNCING or OFFLINE with the number of queued items, and MQTT frames go out on the station topic tree.",
      ].join("\n"),
  },
  {
    id: "teleport",
    match: [/teleport|jump to|go to (a )?room|navigate/i],
    answer: () =>
      [
        "Teleport opens a directory of every place in the twin: both decks, every room, each water body, each vehicle and every exterior viewpoint.",
        "- Press T anywhere on the Digital Twin, or click the Teleport button.",
        "- Picking a room drops you into walk mode at that room's spawn point.",
        "- The minimap in the corner also teleports: click a marker on it.",
      ].join("\n"),
  },
  {
    id: "cascade-help",
    match: [/cascade/i],
    answer: () =>
      [
        "Cascade drill: open it from the left rail under Resilience.",
        "- The dependency graph is drawn as a flowchart: one swimlane per tier, arrows showing which way consequence travels, and each affected box numbered in propagation order.",
        "- Click any box to shut that system down - the chart, the highlighted flow path, the response window and the resilience index all recompute - then tick the isolation points you would actually open.",
        "- Run and record the drill to store it and write an entry into the audit chain.",
      ].join("\n"),
  },
  {
    id: "repair-help",
    match: [/repair|self[- ]?heal|fpga/i],
    answer: () =>
      [
        "Repair bay: open it from the left rail under Resilience.",
        "- The fault queue lists channels that are out of band, dropped or drifting, each with the field procedure written out.",
        "- Applying a repair closes the matching incidents, writes a corrected sample back into the band, and records the work in the audit chain.",
        "- Below it, the FPGA self-test injects real bit flips into a triple-redundant bitstream, runs the voter and the scrubber, and reports PASS or FAIL with the numbers behind it.",
      ].join("\n"),
  },
  {
    id: "resupply-help",
    match: [/resupply|ship|voyage|cargo|sea lift|track the ship/i],
    answer: () =>
      [
        "Live supply ship tracker: open it from the left rail under Logistics.",
        "- The position refreshes on a five second clock with a pulsing LIVE badge, the passage already run is drawn bright and the passage remaining dashed, with the ship on the seam between them.",
        "- The satellite panel follows the ship, and one click takes it to Cape Town, the destination or any waypoint; Google Earth and turn-by-turn route links sit beside it.",
        "- The timeline slider scrubs the voyage: position, distance run, sea state, noon reports and the countdown to arrival all move together, which is how the discharge window gets checked before the ship is there.",
      ].join("\n"),
  },
  {
    id: "wildlife",
    match: [/penguin|seal|whale|orca|dolphin|krill|wildlife|animal|species|bird|petrel|skua|tern|fish/i],
    answer: () =>
      [
        "Wildlife layer: it is on by default in the twin, and the Layers menu switches the whole layer, the labels and the survey grid.",
        "- Twenty-two species are modelled: Adelie, emperor, chinstrap and gentoo penguins with chicks, Weddell, crabeater and leopard seals, humpback, minke and killer whales, hourglass dolphins, terns, skuas, snow, Antarctic and cape petrels, storm petrels, toothfish, icefish, krill, sea spiders and the oasis lake invertebrates.",
        "- Bharati carries the marine animals because it is on the coast; Maitri carries what actually lives inland on the oasis. Every species card states where it is seen and links across to the other station.",
        "- Click any group for its species card: size, mass, diet, status, field facts, how many are modelled, and a sighting log. Recording a sighting writes it to the station record and the audit chain.",
      ].join("\n"),
  },
  {
    id: "expedition-member",
    match: [/dev\b|khandhediya|admin desk|expedition member|who is (the )?(human|person|crew)|twin admin/i],
    answer: () =>
      [
        "Dev Khandhediya is the expedition systems and digital twin administrator modelled in the twin.",
        "- Outdoors he stands with the Adelie colony on the Bharati shore, or with the flyers at Maitri: click him for his profile card.",
        "- Indoors he sits at his own admin desk in the command room of both stations, with the sensor ingest, MQTT bridge and offline outbox on the screen.",
        "- His card carries 'Go to his desk inside' and 'Stand with him outside', so you can follow him between the two.",
      ].join("\n"),
  },
];

/**
 * Try to answer instantly.
 *
 * Returns null when the question needs live station data or real model
 * knowledge, in which case the caller sends it to the assistant action.
 */
export function fastReply(question: string): FastReply | null {
  const trimmed = question.trim();
  if (trimmed.length === 0) return null;
  for (const rule of RULES) {
    if (rule.match.some((pattern) => pattern.test(trimmed))) {
      return { answer: rule.answer(trimmed), model: `quick reply - ${rule.id}` };
    }
  }
  return null;
}
