import type { StationSlug } from "@/lib/station";

/**
 * Scripted drone tour.
 *
 * Each stop is a camera pose plus a narrated briefing written from the station
 * record: the position, the subsystem it shows and what the operator is looking
 * at. The narration is the same copy the console uses elsewhere, so the tour
 * never contradicts a panel.
 */
export interface DroneStop {
  id: string;
  title: string;
  /** Short category chip shown in the tour panel. */
  tag: string;
  narration: string;
  /** Two to four readings or facts pinned under the narration. */
  facts: string[];
  position: [number, number, number];
  target: [number, number, number];
  /** Seconds to hold on the stop before advancing. */
  dwell: number;
}

/** Maitri: Schirmacher Oasis, 70 45 52 S 11 44 03 E. */
const MAITRI_TOUR: DroneStop[] = [
  {
    id: "maitri-approach",
    title: "Approach to Schirmacher Oasis",
    tag: "Site",
    narration:
      "Maitri sits at 70 degrees 45 minutes 52 seconds south, 11 degrees 44 minutes 03 seconds east, in the Schirmacher Oasis, about 100 km inland from the Princess Astrid coast. The oasis is a band of exposed rock between the continental ice sheet and the shelf, and that rock is why the station is here: it gives a stable foundation, a fresh water lake and access to the ice margin.",
    facts: [
      "Elevation band: rock oasis between ice sheet and shelf",
      "Commissioned: 1989-90, continuously occupied since",
      "Distance to coast: about 100 km",
    ],
    position: [178, 96, 178],
    target: [0, 0, 0],
    dwell: 12,
  },
  {
    id: "maitri-station",
    title: "Main station on pillars",
    tag: "Habitation",
    narration:
      "The main hull is a steel structure standing on iron pillars, which keeps the heated envelope clear of the drifting snow surface. Twenty-four windows run across two decks; the orange trim marks service entries and the amber panel is the airlock. Capacity is 25 for the winter-over crew and about 40 in the summer campaign.",
    facts: [
      "Steel hull on iron pillars, two decks",
      "Winter-over capacity: 25",
      "Amber marker at the airlock opens walk mode",
    ],
    position: [42, 17, 44],
    target: [0, 4, 0],
    dwell: 12,
  },
  {
    id: "maitri-power",
    title: "Generator hall",
    tag: "Power",
    narration:
      "Four 62.5 kVA diesel generators carry the station load, with duty rotation and one unit held as standby for the blackout window. Output, exhaust temperature and fuel pressure per unit are all live channels, and a sustained low output raises a warning incident automatically.",
    facts: [
      "4 x 62.5 kVA diesel generators",
      "Duty rotation with standby held for outages",
      "Per-unit output and fuel pressure instrumented",
    ],
    position: [40, 12, -14],
    target: [16, 3, -26],
    dwell: 12,
  },
  {
    id: "maitri-water",
    title: "Heated pipeline and Lake Priyadarshini",
    tag: "Water",
    narration:
      "Water comes from Lake Priyadarshini, 0.297 square kilometres of fresh water beside the station. The pipeline is trace heated: if the heating circuit trips, the line can freeze in roughly 45 minutes, so the pipeline temperature band is tight and a breach pages immediately.",
    facts: [
      "Lake area: 0.297 sq km",
      "Trace heated line, 45 minute freeze risk",
      "Click the lake surface for depth, ice and purity",
    ],
    position: [-30, 24, 78],
    target: [-56, 0, 38],
    dwell: 13,
  },
  {
    id: "maitri-fuel",
    title: "Fuel farm",
    tag: "Safety",
    narration:
      "Bulk diesel is stored in the bunded farm south-east of the station, with hydrocarbon leak detection around the tanks. Level and leak channels are monitored against environmental safety bands, and any leak detection breach is treated as a critical incident rather than a warning.",
    facts: [
      "Bunded storage with leak detection",
      "Level and leak channels monitored continuously",
      "Leak breach escalates straight to critical",
    ],
    position: [66, 15, 46],
    target: [42, 3, 30],
    dwell: 11,
  },
  {
    id: "maitri-weather",
    title: "Automatic weather station",
    tag: "Environment",
    narration:
      "The weather mast samples temperature, wind speed, wind direction and pressure. Those four channels feed the environment screens, the Antarctic Mode thresholds and the continuity engine, which is why the mast is one of the first things to check before any field movement.",
    facts: [
      "Temperature, wind speed, direction and pressure",
      "Drives the minus 20 C and 80 km/h Antarctic Mode gates",
      "Feeds the AI continuity prediction",
    ],
    position: [-34, 26, -58],
    target: [-8, 14, -30],
    dwell: 11,
  },
  {
    id: "maitri-camp",
    title: "Summer camp",
    tag: "Field",
    narration:
      "The summer camp is a ring of containerised modules that expands the complement well beyond the winter-over crew. Each module is sealed against katabatic wind and is checked before the first summer flight lands, since the camp is the first thing that opens and the last that closes each season.",
    facts: [
      "Containerised accommodation for the summer campaign",
      "Seals inspected above 25 m/s wind",
      "Opens first and closes last each season",
    ],
    position: [-74, 18, -30],
    target: [-44, 3, -12],
    dwell: 11,
  },
  {
    id: "maitri-field",
    title: "Vehicle fleet and helipad",
    tag: "Vehicles",
    narration:
      "Twelve vehicle classes are modelled on the apron: tracked PistenBully units, wheeled trucks, snowmobiles, cranes and the rotary-wing apron beside them. Every unit carries its own maintenance record and service interval, and the helipad supports medical evacuation and remote field party support.",
    facts: [
      "12 vehicle classes with maintenance records",
      "Helipad for medevac and field support",
      "Novo airfield is 5.5 km away",
    ],
    position: [96, 26, 32],
    target: [62, 5, 14],
    dwell: 12,
  },
  {
    id: "maitri-wildlife",
    title: "Oasis wildlife and the expedition member",
    tag: "Wildlife",
    narration:
      "Maitri is about 100 km inland, so the animals here are the ones that live on the oasis itself: snow petrels and Antarctic petrels riding the ridge line, skuas patrolling the open ground, Antarctic terns flying in to bathe at the lake margin, and storm petrels nesting in the rock crevices. The oasis lakes hold copepods, rotifers and tardigrades rather than fish. Dev Khandhediya, the expedition systems administrator, is out with the flyers; click any group to open its species card, and the same card carries a link across to the coastal species at Bharati.",
    facts: [
      "Snow petrels, Antarctic petrels and skuas nest on the inland nunataks",
      "Antarctic terns fly inland to bathe and drink at the lakes",
      "Marine species are one click away on the Bharati twin",
    ],
    position: [-96, 30, 70],
    target: [-58, 4, 32],
    dwell: 13,
  },
  {
    id: "maitri-interior",
    title: "Interior access",
    tag: "Habitation",
    narration:
      "The tour ends at the airlock. From here the twin drops you inside the station: both decks are walkable, every room is furnished, the light switches work, and the crew roster shows who is standing in the room you are in. Click the amber marker to go in.",
    facts: [
      "Two walkable decks, every room modelled",
      "Working light switches per room",
      "Occupants listed from the crew roster",
    ],
    position: [0, 9, 34],
    target: [0, 4, 10],
    dwell: 12,
  },
];

/** Bharati: Larsemann Hills, North Grovnes Island, 69 24 41 S 76 11 15 E. */
const BHARATI_TOUR: DroneStop[] = [
  {
    id: "bharati-approach",
    title: "Approach to Larsemann Hills",
    tag: "Site",
    narration:
      "Bharati stands on North Grovnes Island in the Larsemann Hills at 69 degrees 24 minutes 41 seconds south, 76 degrees 11 minutes 15 seconds east, 3,098 km east of Maitri. The site was chosen for a stable rock peninsula with deep water access and a freshwater lake system, and the station was commissioned in 2012.",
    facts: [
      "North Grovnes Island, Larsemann Hills",
      "3,098 km from Maitri",
      "Commissioned 2012",
    ],
    position: [186, 104, 190],
    target: [0, 0, 10],
    dwell: 12,
  },
  {
    id: "bharati-station",
    title: "The container station",
    tag: "Habitation",
    narration:
      "Bharati is built from 134 shipping containers wrapped in a composite skin that keeps the thermal envelope tight and lets modules be swapped without touching the structure. Capacity is 47 for the winter-over crew with 25 more emergency berths, all held in a single heated complex.",
    facts: [
      "134 containers with a composite skin",
      "47 winter-over, 25 emergency berths",
      "Single heated complex with three wings",
    ],
    position: [66, 30, 62],
    target: [0, 6, 6],
    dwell: 13,
  },
  {
    id: "bharati-chp",
    title: "Combined heat and power units",
    tag: "Power",
    narration:
      "Three combined heat and power units run the station: each is rated 100 kVA electrical and 150 kW thermal, so the same prime mover carries the load and the hot water loop. Electrical output, thermal recovery and the storage state of charge are the three numbers the microgrid screen is built on.",
    facts: [
      "3 units at 100 kVA electrical each",
      "150 kW thermal recovery per unit",
      "Storage state of charge feeds blackout planning",
    ],
    position: [62, 20, -4],
    target: [34, 5, -20],
    dwell: 13,
  },
  {
    id: "bharati-fuel",
    title: "Fuel farm, 13 tanks",
    tag: "Safety",
    narration:
      "The fuel farm holds 300,000 litres across 13 tanks at the western end of the station, delivered once a year by the resupply voyage that the Harbour and Resupply screen tracks from Cape Town. Tank level, bund state and leak detection are all instrumented, and the farm is the single largest environmental risk on site.",
    facts: [
      "300,000 litres across 13 tanks",
      "Delivered by the annual resupply voyage",
      "Leak detection with bund monitoring",
    ],
    position: [-74, 22, -4],
    target: [-44, 5, -12],
    dwell: 13,
  },
  {
    id: "bharati-water",
    title: "Seawater pump house and intake",
    tag: "Water",
    narration:
      "Fresh water starts as seawater: the pump house draws through a 450 m intake and the plant desalinates it. An ice blockage and a pump fault present the same way on the flow channel, so the procedure is to verify intake flow first and only then look at the pump.",
    facts: [
      "450 m seawater intake",
      "Ice blockage mimics a pump fault on flow",
      "Intake path shown in the dive view",
    ],
    position: [46, 18, 66],
    target: [10, 3, 44],
    dwell: 12,
  },
  {
    id: "bharati-wastewater",
    title: "Wastewater treatment plant",
    tag: "Life support",
    narration:
      "All wastewater is treated on site before discharge, which is a treaty obligation rather than a convenience. Process health is instrumented, and steam plumes over the plant are normal operation in cold air, not a fault signature.",
    facts: [
      "On-site treatment before discharge",
      "Treaty obligation under the Madrid Protocol",
      "Steam plumes are normal in cold air",
    ],
    position: [-46, 16, 62],
    target: [-20, 3, 40],
    dwell: 11,
  },
  {
    id: "bharati-lab",
    title: "Laboratory module",
    tag: "Science",
    narration:
      "The laboratory is 270 square feet of regulated power on its own circuit so that a plant disturbance never reaches an experiment. Roof instruments sample the atmosphere, and sample power state is logged separately from station load.",
    facts: [
      "270 sq ft of regulated laboratory power",
      "Separate circuit from station load",
      "Atmospheric instruments on the roof",
    ],
    position: [76, 18, 44],
    target: [46, 4, 26],
    dwell: 11,
  },
  {
    id: "bharati-camp",
    title: "Summer camp",
    tag: "Field",
    narration:
      "Fifteen containerised modules sit north of the main complex for the summer campaign, when the station population grows and field parties stage through here. Each module is tied into the same power and water distribution as the main station.",
    facts: [
      "15 containerised summer modules",
      "Shares power and water with the main complex",
      "Staging point for field parties",
    ],
    position: [-30, 24, -78],
    target: [-12, 4, -52],
    dwell: 11,
  },
  {
    id: "bharati-water-features",
    title: "Thala Fjord, Quilty Bay and 44 lakes",
    tag: "Water",
    narration:
      "Bharati overlooks Thala Fjord and Quilty Bay, and 44 Larsemann lakes are modelled individually. Every water body opens a panel with depth, salinity, ice thickness and the iceberg tracker, and any of them can be entered from below for the submerged view.",
    facts: [
      "Thala Fjord and Quilty Bay modelled",
      "44 Larsemann lakes individually clickable",
      "Iceberg tracker and dive view per body",
    ],
    position: [-96, 44, 152],
    target: [-70, 0, 110],
    dwell: 13,
  },
  {
    id: "bharati-wildlife",
    title: "Penguins, seals and whales at the ice edge",
    tag: "Wildlife",
    narration:
      "The Larsemann Hills coast carries the whole food web. Adelie, chinstrap and gentoo penguin colonies stand along the shoreline with their chicks, emperor penguins huddle further out on the fast ice, and Weddell and crabeater seals rest on the floes while a leopard seal cruises the waterline in front of the penguins. Overhead there are snow petrels, skuas, Antarctic petrels, terns, cape petrels and storm petrels; in the water, humpback whales, a minke pair, orcas, hourglass dolphins, a krill swarm, icefish and sea spiders. Dev Khandhediya stands with the Adelie colony, and the same card that opens here will find him indoors at his admin desk in the command room.",
    facts: [
      "Three penguin species on one shoreline, plus emperor penguins on the fast ice",
      "Leopard seal patrols the waterline in front of the colony",
      "Species cards link straight across to the inland station",
    ],
    position: [70, 34, 110],
    target: [18, 4, 62],
    dwell: 13,
  },
  {
    id: "bharati-return",
    title: "Return over the apron",
    tag: "Vehicles",
    narration:
      "The last leg runs back over the apron, where the vehicle fleet and the airlock sit. The tour closes here: switch to free view to orbit yourself, or click the amber airlock marker to walk the two decks of the station.",
    facts: [
      "12 vehicle classes on the apron",
      "Free view releases the camera completely",
      "Airlock opens walk mode",
    ],
    position: [-16, 26, 60],
    target: [0, 6, 20],
    dwell: 12,
  },
];

/** One scripted tour per instrumented station. */
export const DRONE_TOURS: Record<StationSlug, DroneStop[]> = {
  maitri: MAITRI_TOUR,
  bharati: BHARATI_TOUR,
};

/** Total scripted flight time for a tour, in seconds. */
export function tourDuration(stops: DroneStop[]): number {
  return stops.reduce((sum, stop) => sum + stop.dwell + 3.2, 0);
}
