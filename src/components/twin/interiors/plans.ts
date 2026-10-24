import {
  buildFloor,
  packRow,
  type DoorDef,
  type FloorGeometry,
  type FloorPlan,
  type RoomDef,
} from "./plan-types";

/**
 * Station floor plans.
 *
 * Maitri is a steel building on pillars with a central spine corridor: nine
 * rooms on the entrance level and nine above it. Bharati is the 134-container
 * module with a longer north-to-south spine, an atrium at the seaward end,
 * eleven rooms on each of its two levels.
 */

/* ------------------------------------------------------------------ */
/* Row helpers                                                         */
/* ------------------------------------------------------------------ */

interface RowCell {
  id: string;
  width: number;
}

/**
 * Lay rooms out along the z axis, used by Bharati's two side columns.
 * Generic over the entry type so the plan-specific fields survive packing.
 */
function packColumn<T extends { id: string; width: number }>(
  front: number,
  x: number,
  width: number,
  entries: T[],
): Array<T & { x: number; z: number; w: number; d: number }> {
  const gap = 0.06;
  let cursor = front;
  return entries.map((entry) => {
    const d = entry.width;
    const z = cursor + d / 2;
    cursor += d + gap;
    return { ...entry, x, z, w: width, d };
  });
}

const ROOM_WALL_MARGIN = 0.11;

/* ------------------------------------------------------------------ */
/* MAITRI                                                              */
/* ------------------------------------------------------------------ */

// The envelope is set slightly outside the room walls so the outer skin and
// the innermost partitions never occupy the same plane.
const MAITRI_SHELL = { x: 0, z: 0, w: 37.6, d: 18.8 };
const MAITRI_LEFT = -MAITRI_SHELL.w / 2 + ROOM_WALL_MARGIN;
const MAITRI_NORTH_Z = -5.45;
const MAITRI_SOUTH_Z = 5.45;
const MAITRI_ROOM_D = 7.5;

type MaitriCell = RowCell & {
  name: string;
  kind: RoomDef["kind"];
  floor: RoomDef["floor"];
  plate?: RoomDef["plate"];
  occupancy: number;
  tag: string;
  doorSide: "n" | "s" | "e" | "w";
};

function maitriLevelOne(): RoomDef[] {
  const north: MaitriCell[] = [
    { id: "command", name: "Command Centre", kind: "command", floor: "metal", plate: "s", occupancy: 3, tag: "M-101", doorSide: "s", width: 12.6 },
    { id: "comms", name: "Communication Room", kind: "comms", floor: "metal", plate: "s", occupancy: 1, tag: "M-102", doorSide: "s", width: 7.4 },
    { id: "server", name: "Server Room", kind: "server", floor: "tile", plate: "s", occupancy: 0, tag: "M-103", doorSide: "s", width: 6.8 },
    { id: "generator", name: "Generator Room", kind: "generator", floor: "concrete", plate: "s", occupancy: 1, tag: "M-104", doorSide: "s", width: 10.0 },
  ];
  const south: MaitriCell[] = [
    { id: "medical", name: "Medical Bay", kind: "medical", floor: "tile", plate: "n", occupancy: 1, tag: "M-105", doorSide: "n", width: 10.4 },
    { id: "water", name: "Water Treatment Room", kind: "water", floor: "tile", plate: "n", occupancy: 1, tag: "M-106", doorSide: "n", width: 7.2 },
    { id: "storage", name: "Storage Room", kind: "storage", floor: "concrete", plate: "n", occupancy: 1, tag: "M-107", doorSide: "n", width: 11.0 },
    { id: "stair", name: "Stairway", kind: "stair", floor: "metal", plate: "n", occupancy: 0, tag: "M-108", doorSide: "n", width: 8.2 },
  ];

  const northRooms = packRow(MAITRI_LEFT, MAITRI_NORTH_Z, MAITRI_ROOM_D, north);
  const southRooms = packRow(MAITRI_LEFT, MAITRI_SOUTH_Z, MAITRI_ROOM_D, south);

  const rooms: RoomDef[] = [
    ...northRooms.map(({ width, doorSide, ...room }) => ({
      ...room,
      doors: [{ side: doorSide, offset: 0 }],
    })),
    ...southRooms.map(({ width, doorSide, ...room }) => ({
      ...room,
      doors: [{ side: doorSide, offset: 0 }],
    })),
    {
      id: "vestibule",
      name: "Entrance Vestibule",
      kind: "vestibule",
      x: -16.6,
      z: 0,
      w: 3.4,
      d: 3.4,
      floor: "metal",
      plate: "e",
      occupancy: 0,
      tag: "M-100",
      doors: [
        { side: "e", offset: 0, hinge: 1 },
        { side: "w", offset: 0, exterior: true, label: "Outer airlock", hinge: -1 },
      ],
    },
  ];
  return rooms;
}

function maitriLevelTwo(): RoomDef[] {
  const north: MaitriCell[] = [
    { id: "living", name: "Living Quarters", kind: "living", floor: "carpet", plate: "s", occupancy: 4, tag: "M-201", doorSide: "s", width: 13.4 },
    { id: "dormitory", name: "Shared Dormitory", kind: "dormitory", floor: "carpet", plate: "s", occupancy: 6, tag: "M-202", doorSide: "s", width: 10.2 },
    { id: "gym", name: "Gymnasium", kind: "gym", floor: "wood", plate: "s", occupancy: 1, tag: "M-203", doorSide: "s", width: 6.6 },
    { id: "bathroom", name: "Bathrooms", kind: "bathroom", floor: "tile", plate: "s", occupancy: 2, tag: "M-204", doorSide: "s", width: 6.6 },
  ];
  const south: MaitriCell[] = [
    { id: "galley", name: "Galley", kind: "galley", floor: "tile", plate: "n", occupancy: 2, tag: "M-205", doorSide: "n", width: 9.6 },
    { id: "dining", name: "Dining Mess", kind: "dining", floor: "wood", plate: "n", occupancy: 6, tag: "M-206", doorSide: "n", width: 11.6 },
    { id: "recreation", name: "Recreation Room", kind: "recreation", floor: "carpet", plate: "n", occupancy: 3, tag: "M-207", doorSide: "n", width: 7.6 },
    { id: "stair", name: "Stairway", kind: "stair", floor: "metal", plate: "n", occupancy: 0, tag: "M-208", doorSide: "n", width: 8.0 },
  ];

  const northRooms = packRow(MAITRI_LEFT, MAITRI_NORTH_Z, MAITRI_ROOM_D, north);
  const southRooms = packRow(MAITRI_LEFT, MAITRI_SOUTH_Z, MAITRI_ROOM_D, south);

  return [
    ...northRooms.map(({ width, doorSide, ...room }) => ({
      ...room,
      doors: [{ side: doorSide, offset: 0 }],
    })),
    ...southRooms.map(({ width, doorSide, ...room }) => ({
      ...room,
      doors: [{ side: doorSide, offset: 0 }],
    })),
    {
      id: "laundry",
      name: "Laundry Room",
      kind: "laundry",
      x: 16.5,
      z: 0,
      w: 3.6,
      d: 3.4,
      floor: "tile",
      plate: "w",
      occupancy: 1,
      tag: "M-209",
      doors: [{ side: "w", offset: 0 }],
    },
  ];
}

export const MAITRI_FLOORS: FloorPlan[] = [
  {
    level: 0,
    name: "Entrance level",
    y: 0,
    height: 3.3,
    shell: MAITRI_SHELL,
    corridor: { axis: "x", x: 1.8, z: 0, w: 33.6, d: 3.4 },
    rooms: maitriLevelOne(),
    exits: [
      {
        side: "w",
        offset: 0,
        label: "Exterior airlock",
        to: "Station apron, Schirmacher Oasis",
      },
    ],
    spawn: [-13.4, 1.7, 0],
  },
  {
    level: 1,
    name: "Upper level",
    y: 3.8,
    height: 3.1,
    shell: MAITRI_SHELL,
    corridor: { axis: "x", x: 1.8, z: 0, w: 33.6, d: 3.4 },
    rooms: maitriLevelTwo(),
    exits: [],
    spawn: [12.6, 5.5, 0],
  },
];

/* ------------------------------------------------------------------ */
/* BHARATI                                                             */
/* ------------------------------------------------------------------ */

const BHARATI_SHELL = { x: 0, z: 0, w: 33.6, d: 43.6 };
const BHARATI_WEST_X = -9.15;
const BHARATI_EAST_X = 9.15;
const BHARATI_COLUMN_W = 14.9;
const BHARATI_COLUMN_FRONT = -17.0;

type BharatiCell = RowCell & {
  name: string;
  kind: RoomDef["kind"];
  floor: RoomDef["floor"];
  plate?: RoomDef["plate"];
  occupancy: number;
  tag: string;
  doorSide: "n" | "s" | "e" | "w";
};

function bharatiLevelOne(): RoomDef[] {
  const west: BharatiCell[] = [
    { id: "command", name: "Command Centre", kind: "command", floor: "metal", plate: "e", occupancy: 4, tag: "B-101", doorSide: "e", width: 6.7 },
    { id: "comms", name: "Communication Centre", kind: "comms", floor: "metal", plate: "e", occupancy: 2, tag: "B-102", doorSide: "e", width: 6.7 },
    { id: "datacentre", name: "Data Centre", kind: "datacentre", floor: "tile", plate: "e", occupancy: 1, tag: "B-103", doorSide: "e", width: 6.7 },
    { id: "power", name: "Power Room", kind: "power", floor: "concrete", plate: "e", occupancy: 1, tag: "B-104", doorSide: "e", width: 6.7 },
    { id: "water", name: "Water Treatment", kind: "water", floor: "tile", plate: "e", occupancy: 1, tag: "B-105", doorSide: "e", width: 6.7 },
  ];
  const east: BharatiCell[] = [
    { id: "medical", name: "Medical Bay", kind: "medical", floor: "tile", plate: "w", occupancy: 1, tag: "B-106", doorSide: "w", width: 6.7 },
    { id: "laboratory", name: "Laboratory", kind: "laboratory", floor: "tile", plate: "w", occupancy: 3, tag: "B-107", doorSide: "w", width: 6.7 },
    { id: "wastewater", name: "Wastewater Treatment", kind: "wastewater", floor: "concrete", plate: "w", occupancy: 1, tag: "B-108", doorSide: "w", width: 6.7 },
    { id: "storage", name: "Storage", kind: "storage", floor: "concrete", plate: "w", occupancy: 1, tag: "B-109", doorSide: "w", width: 6.7 },
    { id: "workshop", name: "Workshop", kind: "workshop", floor: "concrete", plate: "w", occupancy: 1, tag: "B-110", doorSide: "w", width: 6.7 },
  ];

  const westRooms = packColumn(BHARATI_COLUMN_FRONT, BHARATI_WEST_X, BHARATI_COLUMN_W, west);
  const eastRooms = packColumn(BHARATI_COLUMN_FRONT, BHARATI_EAST_X, BHARATI_COLUMN_W, east);

  return [
    ...westRooms.map(({ width, doorSide, ...room }) => ({
      ...room,
      doors: [{ side: doorSide, offset: 0 }],
    })),
    ...eastRooms.map(({ width, doorSide, ...room }) => ({
      ...room,
      doors: [{ side: doorSide, offset: 0 }],
    })),
    {
      id: "atrium",
      name: "Main Atrium",
      kind: "atrium",
      x: 0,
      z: 19.2,
      w: 33.2,
      d: 4.4,
      floor: "metal",
      plate: "n",
      occupancy: 2,
      tag: "B-100",
      doors: [
        { side: "n", offset: 0, hinge: 1 },
        { side: "s", offset: 0, exterior: true, label: "Main entrance airlock", hinge: 1 },
      ],
    },
  ];
}

function bharatiLevelTwo(): RoomDef[] {
  const west: BharatiCell[] = [
    { id: "galley", name: "Galley", kind: "galley", floor: "tile", plate: "e", occupancy: 3, tag: "B-201", doorSide: "e", width: 6.7 },
    { id: "dining", name: "Dining Mess", kind: "dining", floor: "wood", plate: "e", occupancy: 8, tag: "B-202", doorSide: "e", width: 6.7 },
    { id: "recreation", name: "Recreation Room", kind: "recreation", floor: "carpet", plate: "e", occupancy: 4, tag: "B-203", doorSide: "e", width: 6.7 },
    { id: "gym", name: "Gymnasium", kind: "gym", floor: "wood", plate: "e", occupancy: 2, tag: "B-204", doorSide: "e", width: 6.7 },
    { id: "sauna", name: "Sauna", kind: "sauna", floor: "wood", plate: "e", occupancy: 1, tag: "B-205", doorSide: "e", width: 6.7 },
  ];
  const east: BharatiCell[] = [
    { id: "living", name: "Living Quarters", kind: "living", floor: "carpet", plate: "w", occupancy: 5, tag: "B-206", doorSide: "w", width: 6.7 },
    { id: "dormitory", name: "Shared Dormitory", kind: "dormitory", floor: "carpet", plate: "w", occupancy: 6, tag: "B-207", doorSide: "w", width: 6.7 },
    { id: "bathroom", name: "Bathrooms", kind: "bathroom", floor: "tile", plate: "w", occupancy: 3, tag: "B-208", doorSide: "w", width: 6.7 },
    { id: "laundry", name: "Laundry", kind: "laundry", floor: "tile", plate: "w", occupancy: 1, tag: "B-209", doorSide: "w", width: 6.7 },
    { id: "lounge", name: "Observation Lounge", kind: "lounge", floor: "carpet", plate: "w", occupancy: 2, tag: "B-210", doorSide: "w", width: 6.7 },
  ];

  const westRooms = packColumn(BHARATI_COLUMN_FRONT, BHARATI_WEST_X, BHARATI_COLUMN_W, west);
  const eastRooms = packColumn(BHARATI_COLUMN_FRONT, BHARATI_EAST_X, BHARATI_COLUMN_W, east);

  return [
    ...westRooms.map(({ width, doorSide, ...room }) => ({
      ...room,
      doors: [{ side: doorSide, offset: 0 }],
    })),
    ...eastRooms.map(({ width, doorSide, ...room }) => ({
      ...room,
      doors: [{ side: doorSide, offset: 0 }],
    })),
    {
      id: "stair",
      name: "Stairway and Atrium Connection",
      kind: "stair",
      x: 0,
      z: 19.2,
      w: 33.2,
      d: 4.4,
      floor: "metal",
      plate: "n",
      occupancy: 0,
      tag: "B-211",
      doors: [{ side: "n", offset: 0, label: "Stairway landing", hinge: 1 }],
    },
  ];
}

export const BHARATI_FLOORS: FloorPlan[] = [
  {
    level: 0,
    name: "Operations level",
    y: 0,
    height: 3.4,
    shell: BHARATI_SHELL,
    corridor: { axis: "z", x: 0, z: -2, w: 3.4, d: 38 },
    rooms: bharatiLevelOne(),
    exits: [
      {
        side: "s",
        offset: 0,
        label: "Main entrance airlock",
        to: "North Grovnes Island shoreline",
      },
    ],
    spawn: [0, 1.7, 18.6],
  },
  {
    level: 1,
    name: "Living level",
    y: 3.9,
    height: 3.3,
    shell: BHARATI_SHELL,
    corridor: { axis: "z", x: 0, z: -2, w: 3.4, d: 38 },
    rooms: bharatiLevelTwo(),
    exits: [],
    spawn: [0, 5.6, 18.6],
  },
];

/** Floor plans for a station slug. */
export const FLOOR_PLANS: Record<string, FloorPlan[]> = {
  maitri: MAITRI_FLOORS,
  bharati: BHARATI_FLOORS,
};

/** Cached derived geometry per station and level. */
const geometryCache = new Map<string, FloorGeometry>();

/** Derived walls, doors and colliders for one storey. */
export function floorGeometry(slug: string, level: number): FloorGeometry {
  const key = `${slug}:${level}`;
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const plan = (FLOOR_PLANS[slug] ?? []).find((p) => p.level === level);
  const geometry = plan
    ? buildFloor(plan)
    : { walls: [], doors: [], colliders: [] as FloorGeometry["colliders"] };
  geometryCache.set(key, geometry);
  return geometry;
}

/** The plan for one storey. */
export function floorPlan(slug: string, level: number): FloorPlan | undefined {
  return (FLOOR_PLANS[slug] ?? []).find((p) => p.level === level);
}

/** Entry point of a room: the centre of its first doorway. */
export function roomDoorPoint(room: RoomDef): [number, number] {
  const door = room.doors[0];
  if (!door) return [room.x, room.z];
  const offset = door.offset ?? 0;
  switch (door.side) {
    case "n":
      return [room.x + offset, room.z - room.d / 2];
    case "s":
      return [room.x + offset, room.z + room.d / 2];
    case "w":
      return [room.x - room.w / 2, room.z + offset];
    default:
      return [room.x + room.w / 2, room.z + offset];
  }
}

/** A patrol route expressed as an ordered list of rooms. */
export interface OccupantRoute {
  roomIds: string[];
  /** Seconds spent on each leg. */
  legSeconds: number;
}

/** An animated crew member. */
export interface OccupantDef {
  id: string;
  name: string;
  role: "commander" | "scientist" | "engineer" | "medical" | "logistics" | "operations";
  duty: string;
  level: number;
  route: OccupantRoute;
}

/**
 * Turn a sequence of rooms into a walkable polyline through the spine
 * corridor. Room centre to its doorway, along the corridor, into the next
 * room. Routes are therefore fixed and repeatable rather than random.
 */
export function routePoints(plan: FloorPlan, roomIds: string[]): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const corridorAxis = plan.corridor.axis;
  for (const id of roomIds) {
    const room = plan.rooms.find((r) => r.id === id);
    if (!room) continue;
    const [dx, dz] = roomDoorPoint(room);
    // Every leg goes corridor -> room centre -> back to the corridor, so the
    // polyline only ever crosses a wall at that room's own doorway.
    const corridorPoint: [number, number] =
      corridorAxis === "x" ? [dx, 0] : [0, dz];
    const last = points[points.length - 1];
    if (!last || Math.hypot(last[0] - corridorPoint[0], last[1] - corridorPoint[1]) > 0.05) {
      points.push(corridorPoint);
    }
    points.push([room.x, room.z]);
    points.push(corridorPoint);
  }
  return points;
}

const MAITRI_CREW: OccupantDef[] = [
  { id: "m-c1", name: "Station Commander", role: "commander", duty: "Winter-over command watch", level: 0, route: { roomIds: ["command", "vestibule", "comms", "command"], legSeconds: 9 } },
  { id: "m-c2", name: "Comms Operator", role: "operations", duty: "VSAT and Iridium traffic", level: 0, route: { roomIds: ["comms", "command", "comms"], legSeconds: 7 } },
  { id: "m-c3", name: "Systems Administrator", role: "engineer", duty: "Server room and telemetry stack", level: 0, route: { roomIds: ["server", "command", "generator"], legSeconds: 10 } },
  { id: "m-c4", name: "Power Engineer", role: "engineer", duty: "Generator watch, four units", level: 0, route: { roomIds: ["generator", "storage", "generator"], legSeconds: 8 } },
  { id: "m-c5", name: "Station Doctor", role: "medical", duty: "Medical bay clinic hours", level: 0, route: { roomIds: ["medical", "command", "medical"], legSeconds: 11 } },
  { id: "m-c6", name: "Water Systems Engineer", role: "engineer", duty: "Reverse osmosis and trace heating", level: 0, route: { roomIds: ["water", "storage", "water"], legSeconds: 7 } },
  { id: "m-c7", name: "Logistics Officer", role: "logistics", duty: "Stores and resupply staging", level: 0, route: { roomIds: ["storage", "vestibule", "storage"], legSeconds: 9 } },
  { id: "m-c8", name: "Field Safety Officer", role: "operations", duty: "Airlock drills and safety rounds", level: 0, route: { roomIds: ["vestibule", "stair", "command"], legSeconds: 12 } },
  { id: "m-c9", name: "Chief Scientist", role: "scientist", duty: "Atmospheric science planning", level: 1, route: { roomIds: ["living", "dining", "recreation"], legSeconds: 10 } },
  { id: "m-c10", name: "Glaciologist", role: "scientist", duty: "Lake Priyadarshini ice survey", level: 1, route: { roomIds: ["dormitory", "dining", "bathroom"], legSeconds: 8 } },
  { id: "m-c11", name: "Station Cook", role: "logistics", duty: "Galley service, three meals", level: 1, route: { roomIds: ["galley", "dining", "galley"], legSeconds: 6 } },
  { id: "m-c12", name: "Mess Steward", role: "logistics", duty: "Dining mess and stores", level: 1, route: { roomIds: ["dining", "galley", "dining"], legSeconds: 7 } },
  { id: "m-c13", name: "Physiotherapist", role: "medical", duty: "Fitness and acclimatisation", level: 1, route: { roomIds: ["gym", "bathroom", "living"], legSeconds: 9 } },
  { id: "m-c14", name: "Laundry Technician", role: "logistics", duty: "Laundry and bedding cycle", level: 1, route: { roomIds: ["laundry", "dining", "laundry"], legSeconds: 8 } },
  { id: "m-c15", name: "Radio Officer", role: "operations", duty: "Schedule and message relay", level: 1, route: { roomIds: ["recreation", "stair", "living"], legSeconds: 10 } },
  { id: "m-c16", name: "Duty Medic", role: "medical", duty: "Overnight response team", level: 1, route: { roomIds: ["bathroom", "living", "stair"], legSeconds: 11 } },
];

const BHARATI_CREW: OccupantDef[] = [
  { id: "b-c1", name: "Station Commander", role: "commander", duty: "Operations level command", level: 0, route: { roomIds: ["command", "atrium", "comms"], legSeconds: 10 } },
  { id: "b-c2", name: "Communications Officer", role: "operations", duty: "RF console and antenna control", level: 0, route: { roomIds: ["comms", "command", "comms"], legSeconds: 8 } },
  { id: "b-c3", name: "Data Centre Engineer", role: "engineer", duty: "Rack health and cooling", level: 0, route: { roomIds: ["datacentre", "power", "datacentre"], legSeconds: 7 } },
  { id: "b-c4", name: "CHP Engineer", role: "engineer", duty: "Combined heat and power units", level: 0, route: { roomIds: ["power", "storage", "power"], legSeconds: 9 } },
  { id: "b-c5", name: "Water Plant Engineer", role: "engineer", duty: "Reverse osmosis four stage plant", level: 0, route: { roomIds: ["water", "wastewater", "water"], legSeconds: 8 } },
  { id: "b-c6", name: "Wastewater Operator", role: "engineer", duty: "MBBR digester process control", level: 0, route: { roomIds: ["wastewater", "workshop", "wastewater"], legSeconds: 10 } },
  { id: "b-c7", name: "Station Medical Officer", role: "medical", duty: "Medical bay and pharmacy", level: 0, route: { roomIds: ["medical", "laboratory", "medical"], legSeconds: 9 } },
  { id: "b-c8", name: "Marine Biologist", role: "scientist", duty: "Thala Fjord sampling", level: 0, route: { roomIds: ["laboratory", "atrium", "laboratory"], legSeconds: 11 } },
  { id: "b-c9", name: "Ice Core Analyst", role: "scientist", duty: "Sample preparation and microscopy", level: 0, route: { roomIds: ["laboratory", "storage", "laboratory"], legSeconds: 8 } },
  { id: "b-c10", name: "Maintenance Fitter", role: "engineer", duty: "Workshop fabrication tasks", level: 0, route: { roomIds: ["workshop", "storage", "workshop"], legSeconds: 9 } },
  { id: "b-c11", name: "Storekeeper", role: "logistics", duty: "Pallet racking and spares", level: 0, route: { roomIds: ["storage", "atrium", "storage"], legSeconds: 10 } },
  { id: "b-c12", name: "Chief Cook", role: "logistics", duty: "Galley service for 47", level: 1, route: { roomIds: ["galley", "dining", "galley"], legSeconds: 6 } },
  { id: "b-c13", name: "Mess Supervisor", role: "logistics", duty: "Dining mess and pantry", level: 1, route: { roomIds: ["dining", "galley", "dining"], legSeconds: 7 } },
  { id: "b-c14", name: "Recreation Officer", role: "operations", duty: "Recreation and library", level: 1, route: { roomIds: ["recreation", "dining", "recreation"], legSeconds: 9 } },
  { id: "b-c15", name: "Fitness Instructor", role: "operations", duty: "Gymnasium programme", level: 1, route: { roomIds: ["gym", "bathroom", "gym"], legSeconds: 8 } },
  { id: "b-c16", name: "Sauna Attendant", role: "logistics", duty: "Sauna and recovery sessions", level: 1, route: { roomIds: ["sauna", "bathroom", "sauna"], legSeconds: 10 } },
  { id: "b-c17", name: "Geophysicist", role: "scientist", duty: "Aurora observation watch", level: 1, route: { roomIds: ["lounge", "dining", "lounge"], legSeconds: 11 } },
  { id: "b-c18", name: "Aurora Observer", role: "scientist", duty: "Magnetometer and imaging", level: 1, route: { roomIds: ["lounge", "recreation", "lounge"], legSeconds: 9 } },
  { id: "b-c19", name: "Laundry Technician", role: "logistics", duty: "Laundry plant", level: 1, route: { roomIds: ["laundry", "bathroom", "laundry"], legSeconds: 8 } },
  { id: "b-c20", name: "Welfare Officer", role: "operations", duty: "Crew welfare rounds", level: 1, route: { roomIds: ["dormitory", "living", "dining"], legSeconds: 10 } },
];

/** Crew roster per station. */
export const CREW: Record<string, OccupantDef[]> = {
  maitri: MAITRI_CREW,
  bharati: BHARATI_CREW,
};

export type { DoorDef, FloorGeometry, FloorPlan, RoomDef };
