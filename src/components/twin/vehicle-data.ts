/**
 * Vehicle fleet specification.
 *
 * Twelve classes are modelled in the twin. Each class carries the fields a
 * station engineer actually tracks — service interval, track or blade life,
 * range, capacity, weather limits — and each individual unit is derived
 * deterministically from its tail number, so the panel values are stable
 * between reloads instead of drifting at random.
 */

export interface VehicleClassSpec {
  id: string;
  label: string;
  /** Full description shown in the panel heading. */
  model: string;
  power: string;
  capacity: string;
  rangeKm: number | null;
  /** Field used for remaining track, blade or ski life. */
  wearLabel: string;
  wearPercent: number;
  serviceHours: number;
  /** Units that breathe exhaust. */
  powered: boolean;
  /** Whether the machine is moving by default in the twin. */
  moving: boolean;
  notes: string;
}

export const VEHICLE_SPECS: Record<string, VehicleClassSpec> = {
  pistenbully: {
    id: "pistenbully",
    label: "PistenBully",
    model: "Tracked snow grooming vehicle, front tiller and 3 m blade",
    power: "Diesel, 6 cylinder",
    capacity: "2 crew plus 1,200 kg on the deck",
    rangeKm: 420,
    wearLabel: "Track remaining",
    wearPercent: 78,
    serviceHours: 500,
    powered: true,
    moving: false,
    notes: "Primary route preparation to Novo airfield and the field camps.",
  },
  snowmobile: {
    id: "snowmobile",
    label: "Snowmobile",
    model: "Arctic Cat style snow scooter with 1.4 m track",
    power: "Petrol, 600 cc",
    capacity: "1 rider plus 45 kg on the rear rack",
    rangeKm: 180,
    wearLabel: "Track remaining",
    wearPercent: 85,
    serviceHours: 250,
    powered: true,
    moving: false,
    notes: "Short field movements and medical evacuation standby.",
  },
  atv: {
    id: "atv",
    label: "ATV Quad Bike",
    model: "Four wheel drive quad on studded tyres",
    power: "Petrol, 500 cc",
    capacity: "1 rider plus 60 kg",
    rangeKm: 140,
    wearLabel: "Tyre remaining",
    wearPercent: 72,
    serviceHours: 200,
    powered: true,
    moving: false,
    notes: "Ice runway marking on the blue ice apron.",
  },
  "cargo-carrier": {
    id: "cargo-carrier",
    label: "Tracked Cargo Carrier",
    model: "Articulated twin section tracked carrier, Hagglunds pattern",
    power: "Diesel, 4 cylinder",
    capacity: "Front 3 crew, rear 2,400 kg",
    rangeKm: 380,
    wearLabel: "Track remaining",
    wearPercent: 68,
    serviceHours: 600,
    powered: true,
    moving: true,
    notes: "Heavy resupply over the coastal ice and to the neighbour stations.",
  },
  helicopter: {
    id: "helicopter",
    label: "Helicopter",
    model: "Light utility helicopter, four blade main rotor",
    power: "Turboshaft",
    capacity: "2 crew plus 8 passengers",
    rangeKm: 1200,
    wearLabel: "Blade life remaining",
    wearPercent: 91,
    serviceHours: 900,
    powered: true,
    moving: false,
    notes: "Medical evacuation, airborne geophysics and remote field support.",
  },
  "nansen-sledge": {
    id: "nansen-sledge",
    label: "Nansen Sledge",
    model: "Timber sledge on steel runners with a canvas load bag",
    power: "Towed",
    capacity: "220 kg",
    rangeKm: null,
    wearLabel: "Runner remaining",
    wearPercent: 82,
    serviceHours: 0,
    powered: false,
    moving: false,
    notes: "Traditional field transport, still preferred on crevassed ground.",
  },
  "cargo-sledge": {
    id: "cargo-sledge",
    label: "Cargo Sledge",
    model: "Reinforced cargo sledge with strapped crates",
    power: "Towed",
    capacity: "900 kg",
    rangeKm: null,
    wearLabel: "Runner remaining",
    wearPercent: 74,
    serviceHours: 0,
    powered: false,
    moving: false,
    notes: "Bulk stores and fuel drums behind the tracked carriers.",
  },
  "snow-blower": {
    id: "snow-blower",
    label: "Snow Blower",
    model: "Tracked rotary snow blower with discharge chute",
    power: "Diesel, turbocharged",
    capacity: "1,800 tonnes per hour",
    rangeKm: 160,
    wearLabel: "Auger remaining",
    wearPercent: 66,
    serviceHours: 400,
    powered: true,
    moving: false,
    notes: "Clears drift from the airlock approaches and the runway shoulders.",
  },
  forklift: {
    id: "forklift",
    label: "Forklift",
    model: "Rough terrain forklift with 2.6 m mast",
    power: "Diesel",
    capacity: "2,500 kg",
    rangeKm: 120,
    wearLabel: "Tyre remaining",
    wearPercent: 70,
    serviceHours: 800,
    powered: true,
    moving: false,
    notes: "Container unstuffing and cargo yard pallet handling.",
  },
  "mobile-crane": {
    id: "mobile-crane",
    label: "Mobile Crane",
    model: "Truck mounted telescopic crane",
    power: "Diesel, 6 cylinder",
    capacity: "16 tonnes at 3 m radius",
    rangeKm: 260,
    wearLabel: "Hook and cable remaining",
    wearPercent: 88,
    serviceHours: 1000,
    powered: true,
    moving: false,
    notes: "Module placement, tank lifts and antenna erection.",
  },
  zodiac: {
    id: "zodiac",
    label: "Zodiac Boat",
    model: "Inflatable shore boat with rigid hull and outboard",
    power: "Petrol outboard, 40 hp",
    capacity: "6 persons",
    rangeKm: 90,
    wearLabel: "Hull remaining",
    wearPercent: 80,
    serviceHours: 150,
    powered: true,
    moving: false,
    notes: "Shore party transfer and seawater sampling in Quilty Bay.",
  },
  trailer: {
    id: "trailer",
    label: "Utility Trailer",
    model: "Single axle utility trailer with sides and lamps",
    power: "Towed",
    capacity: "750 kg",
    rangeKm: null,
    wearLabel: "Bearing remaining",
    wearPercent: 76,
    serviceHours: 0,
    powered: false,
    moving: false,
    notes: "General cargo behind the ATVs and the tracked carriers.",
  },
};

export type VehicleStatus = "operational" | "standby" | "maintenance" | "in transit";

export interface VehicleInstance {
  /** Stable identifier such as maitri-pistenbully-1. */
  id: string;
  classId: string;
  /** Tail number shown on the model and in the panel. */
  tail: string;
  label: string;
  spec: VehicleClassSpec;
  status: VehicleStatus;
  fuelPercent: number;
  engineHours: number;
  daysSinceService: number;
  hoursToService: number;
  location: string;
  driver: string;
  weather: string;
  running: boolean;
}

const DRIVERS = [
  "Duty driver A",
  "Duty driver B",
  "Field party lead",
  "Plant operator",
  "Depot storekeeper",
];

const LOCATIONS: Record<string, string> = {
  maitri: "Vehicle yard, south of the fuel farm",
  bharati: "Vehicle yard, west of the CHP hall",
};

/** Tail prefix per class, following station practice. */
const TAIL: Record<string, string> = {
  pistenbully: "PB",
  snowmobile: "SM",
  atv: "ATV",
  "cargo-carrier": "TC",
  helicopter: "HELI",
  "nansen-sledge": "NS",
  "cargo-sledge": "CS",
  "snow-blower": "SB",
  forklift: "FL",
  "mobile-crane": "CR",
  zodiac: "ZB",
  trailer: "UT",
};

interface Placement {
  classId: string;
  count: number;
}

/** Fleet complement per station, matching the yards laid out in the scenes. */
export const FLEET_COMPLEMENT: Record<"maitri" | "bharati", Placement[]> = {
  maitri: [
    { classId: "pistenbully", count: 2 },
    { classId: "snowmobile", count: 3 },
    { classId: "atv", count: 2 },
    { classId: "cargo-carrier", count: 1 },
    { classId: "helicopter", count: 1 },
    { classId: "nansen-sledge", count: 2 },
    { classId: "cargo-sledge", count: 2 },
    { classId: "snow-blower", count: 1 },
    { classId: "forklift", count: 1 },
    { classId: "trailer", count: 2 },
  ],
  bharati: [
    { classId: "pistenbully", count: 3 },
    { classId: "snowmobile", count: 5 },
    { classId: "atv", count: 3 },
    { classId: "cargo-carrier", count: 2 },
    { classId: "helicopter", count: 1 },
    { classId: "nansen-sledge", count: 3 },
    { classId: "cargo-sledge", count: 3 },
    { classId: "snow-blower", count: 2 },
    { classId: "forklift", count: 2 },
    { classId: "mobile-crane", count: 1 },
    { classId: "zodiac", count: 1 },
    { classId: "trailer", count: 2 },
  ],
};

/** Deterministic pseudo-random in the unit interval, keyed by unit index. */
function jitter(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function statusFor(spec: VehicleClassSpec, i: number): VehicleStatus {
  if (spec.moving) return "in transit";
  const roll = jitter(i, 4);
  if (roll > 0.9) return "maintenance";
  if (roll > 0.62) return "standby";
  return "operational";
}

/** Every vehicle instance at a station, in panel order. */
export function vehicleInstances(station: "maitri" | "bharati"): VehicleInstance[] {
  const out: VehicleInstance[] = [];
  let index = 0;
  for (const placement of FLEET_COMPLEMENT[station]) {
    const spec = VEHICLE_SPECS[placement.classId];
    if (!spec) continue;
    for (let i = 0; i < placement.count; i++) {
      index += 1;
      const status = statusFor(spec, index);
      const fuel = Math.round(58 + jitter(index, 2) * 40);
      const engineHours = Math.round(140 + jitter(index, 3) * spec.serviceHours * 2.4);
      const sinceService = Math.round(4 + jitter(index, 5) * 90);
      out.push({
        id: `${station}-${placement.classId}-${i + 1}`,
        classId: placement.classId,
        tail: `${TAIL[placement.classId] ?? "VH"}-${String(i + 1).padStart(2, "0")}`,
        label: `${spec.label} ${TAIL[placement.classId] ?? "VH"}-${String(i + 1).padStart(2, "0")}`,
        spec,
        status,
        fuelPercent: fuel,
        engineHours,
        daysSinceService: sinceService,
        hoursToService: Math.max(0, spec.serviceHours - (engineHours % spec.serviceHours)),
        location: LOCATIONS[station],
        driver: DRIVERS[index % DRIVERS.length],
        weather:
          status === "in transit"
            ? "Cleared for movement, visibility 4 km"
            : "Parked, wind limit 60 km/h",
        running: spec.moving || status === "operational",
      });
    }
  }
  return out;
}

/** Look up one instance by id. */
export function vehicleById(id: string): VehicleInstance | undefined {
  const station = id.startsWith("maitri") ? "maitri" : "bharati";
  return vehicleInstances(station).find((v) => v.id === id);
}

/** Colour token for a vehicle status. */
export function statusTone(status: VehicleStatus): string {
  switch (status) {
    case "operational":
      return "#3EE07F";
    case "standby":
      return "#4A9EFF";
    case "maintenance":
      return "#FFB020";
    default:
      return "#00E0C6";
  }
}
