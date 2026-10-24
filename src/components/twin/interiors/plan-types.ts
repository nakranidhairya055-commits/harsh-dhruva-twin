/**
 * Interior floor-plan model.
 *
 * A station interior is described as a set of rectangular rooms plus an open
 * circulation corridor inside a building envelope. Everything the renderer and
 * the walk controller need is derived from that single description:
 *
 *   plan  ->  walls (rendered boxes)  ->  colliders (2D boxes for movement)
 *         ->  doors  (hinged leaves with a known hinge side)
 *
 * Deriving both from one source is what guarantees the rule that there is no
 * wall between adjacent rooms without a doorway: a gap in a wall is created
 * only by an explicit doorway entry, and every doorway entry also produces the
 * matching door leaf.
 */

/** Wall thickness in metres. */
export const WALL_T = 0.22;
/** Standard doorway clear width in metres. */
export const DOOR_W = 1.75;
/** Standard doorway clear height in metres. */
export const DOOR_H = 2.35;
/** Slab thickness for floors and ceilings. */
export const SLAB_T = 0.18;

/** Which side of a room a wall or doorway sits on. */
export type Side = "n" | "s" | "e" | "w";

/** Floor finishes, each with its own acoustic and visual character. */
export type FloorFinish = "metal" | "carpet" | "tile" | "concrete" | "wood";

/** Every interior room type modelled in DhruvaTwin. */
export type RoomKind =
  | "vestibule"
  | "command"
  | "comms"
  | "server"
  | "generator"
  | "water"
  | "medical"
  | "storage"
  | "stair"
  | "living"
  | "dormitory"
  | "galley"
  | "dining"
  | "recreation"
  | "gym"
  | "bathroom"
  | "laundry"
  | "atrium"
  | "datacentre"
  | "power"
  | "wastewater"
  | "laboratory"
  | "workshop"
  | "sauna"
  | "lounge";

/** One doorway in a room wall. */
export interface DoorwayDef {
  /** Side of the room the doorway is cut into. */
  side: Side;
  /** Offset along that wall from the wall centre, in metres. */
  offset?: number;
  /** Label override; defaults to the room name. */
  label?: string;
  /** Marks the leaf as an exterior airlock door. */
  exterior?: boolean;
  /** Hinge end along the wall run: -1 for the low end, 1 for the high end. */
  hinge?: -1 | 1;
}

/** One rectangular room in a floor plan. */
export interface RoomDef {
  id: string;
  name: string;
  kind: RoomKind;
  /** Centre of the room in plan metres. */
  x: number;
  z: number;
  /** Room size along x and z. */
  w: number;
  d: number;
  doors: DoorwayDef[];
  floor?: FloorFinish;
  /** Wall that carries the room's 3D name plate. */
  plate?: Side;
  /** Normal working occupancy used by the room panel. */
  occupancy?: number;
  /** Room identifier from the station drawing, shown in the room panel. */
  tag?: string;
}

/** An opening in the building envelope. */
export interface ExitDef {
  side: Side;
  offset: number;
  label: string;
  /** Where the opening leads, shown in the room panel. */
  to: string;
}

/** One storey of a station interior. */
export interface FloorPlan {
  level: number;
  name: string;
  /** Floor height above the interior origin. */
  y: number;
  /** Clear ceiling height above the floor. */
  height: number;
  shell: { x: number; z: number; w: number; d: number };
  corridor: { axis: "x" | "z"; x: number; z: number; w: number; d: number };
  rooms: RoomDef[];
  exits: ExitDef[];
  /** Where the player stands when the level loads. */
  spawn: [number, number, number];
}

/** A rendered wall box. */
export interface WallSeg {
  id: string;
  x: number;
  z: number;
  sx: number;
  sz: number;
  h: number;
  y: number;
  roomId: string;
}

/** A hinged door leaf. */
export interface DoorDef {
  id: string;
  /** Centre of the opening. */
  x: number;
  z: number;
  /** Direction the wall runs: "x" or "z". */
  run: "x" | "z";
  width: number;
  height: number;
  y: number;
  label: string;
  roomId: string;
  /** Sign of the hinge offset along the run. */
  hinge: -1 | 1;
  exterior: boolean;
  /** Doors the player can see through (interior leaves). */
  glass: boolean;
}

/** Axis-aligned 2D collider used by the walk controller. */
export interface Collider2D {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Everything derived from one floor plan. */
export interface FloorGeometry {
  walls: WallSeg[];
  doors: DoorDef[];
  colliders: Collider2D[];
}

/** Split a wall run into the segments left between doorways. */
function splitRun(
  start: number,
  end: number,
  gaps: Array<{ c: number; w: number }>,
): Array<[number, number]> {
  const sorted = [...gaps].sort((a, b) => a.c - b.c);
  const out: Array<[number, number]> = [];
  let cursor = start;
  for (const gap of sorted) {
    const a = Math.max(start, gap.c - gap.w / 2);
    const b = Math.min(end, gap.c + gap.w / 2);
    if (a - cursor > 0.05) out.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (end - cursor > 0.05) out.push([cursor, end]);
  return out;
}

function collider(id: string, cx: number, cz: number, sx: number, sz: number): Collider2D {
  return {
    id,
    minX: cx - sx / 2,
    maxX: cx + sx / 2,
    minZ: cz - sz / 2,
    maxZ: cz + sz / 2,
  };
}

/** Emit the four walls of a rectangle, cutting a gap at every doorway. */
function emitRoomWalls(
  rect: { id: string; x: number; z: number; w: number; d: number },
  y: number,
  height: number,
  doorways: DoorwayDef[],
): { walls: WallSeg[]; colliders: Collider2D[] } {
  const walls: WallSeg[] = [];
  const colliders: Collider2D[] = [];
  const halfW = rect.w / 2;
  const halfD = rect.d / 2;

  const sides: Array<{ side: Side; run: "x" | "z"; fixed: number; min: number; max: number }> = [
    { side: "n", run: "x", fixed: rect.z - halfD, min: rect.x - halfW, max: rect.x + halfW },
    { side: "s", run: "x", fixed: rect.z + halfD, min: rect.x - halfW, max: rect.x + halfW },
    { side: "w", run: "z", fixed: rect.x - halfW, min: rect.z - halfD, max: rect.z + halfD },
    { side: "e", run: "z", fixed: rect.x + halfW, min: rect.z - halfD, max: rect.z + halfD },
  ];

  for (const s of sides) {
    const gaps = doorways
      .filter((d) => d.side === s.side)
      .map((d) => ({ c: (s.run === "x" ? rect.x : rect.z) + (d.offset ?? 0), w: DOOR_W }));
    const segments = splitRun(s.min, s.max, gaps);
    segments.forEach((seg, i) => {
      const [a, b] = seg;
      const len = b - a;
      const centre = (a + b) / 2;
      const id = `${rect.id}-${s.side}-${i}`;
      if (s.run === "x") {
        walls.push({
          id,
          x: centre,
          z: s.fixed,
          sx: len,
          sz: WALL_T,
          h: height,
          y,
          roomId: rect.id,
        });
        colliders.push(collider(id, centre, s.fixed, len, WALL_T));
      } else {
        walls.push({
          id,
          x: s.fixed,
          z: centre,
          sx: WALL_T,
          sz: len,
          h: height,
          y,
          roomId: rect.id,
        });
        colliders.push(collider(id, s.fixed, centre, WALL_T, len));
      }
    });
  }

  return { walls, colliders };
}

/**
 * Derive every wall, door leaf and collider on one storey.
 *
 * Room walls and the building envelope are generated together so that interior
 * partitions never contradict the outer shell.
 */
export function buildFloor(plan: FloorPlan): FloorGeometry {
  const walls: WallSeg[] = [];
  const colliders: Collider2D[] = [];
  const doors: DoorDef[] = [];

  for (const room of plan.rooms) {
    const { walls: w, colliders: c } = emitRoomWalls(room, plan.y, plan.height, room.doors);
    walls.push(...w);
    colliders.push(...c);
    for (const [i, doorway] of room.doors.entries()) {
      const alongRoom = doorway.side === "n" || doorway.side === "s";
      const fixed =
        doorway.side === "n"
          ? room.z - room.d / 2
          : doorway.side === "s"
            ? room.z + room.d / 2
            : doorway.side === "w"
              ? room.x - room.w / 2
              : room.x + room.w / 2;
      const offset = doorway.offset ?? 0;
      doors.push({
        id: `${room.id}-door-${i}`,
        x: alongRoom ? room.x + offset : fixed,
        z: alongRoom ? fixed : room.z + offset,
        run: alongRoom ? "x" : "z",
        width: DOOR_W,
        height: DOOR_H,
        y: plan.y,
        label: doorway.label ?? room.name,
        roomId: room.id,
        hinge: doorway.hinge ?? -1,
        exterior: doorway.exterior ?? false,
        glass: room.kind !== "storage" && room.kind !== "generator" && !doorway.exterior,
      });
    }
  }

  // Building envelope with its exits.
  const shell = plan.shell;
  const shellDoors: DoorwayDef[] = plan.exits.map((e) => ({
    side: e.side,
    offset: e.offset,
    label: e.label,
    exterior: true,
  }));
  const { walls: sw, colliders: sc } = emitRoomWalls(
    { id: "shell", ...shell },
    plan.y,
    plan.height,
    shellDoors,
  );
  walls.push(...sw);
  colliders.push(...sc);

  plan.exits.forEach((exit, i) => {
    const alongShell = exit.side === "n" || exit.side === "s";
    const fixed =
      exit.side === "n"
        ? shell.z - shell.d / 2
        : exit.side === "s"
          ? shell.z + shell.d / 2
          : exit.side === "w"
            ? shell.x - shell.w / 2
            : shell.x + shell.w / 2;
    doors.push({
      id: `shell-door-${i}`,
      x: alongShell ? shell.x + exit.offset : fixed,
      z: alongShell ? fixed : shell.z + exit.offset,
      run: alongShell ? "x" : "z",
      width: DOOR_W + 0.35,
      height: DOOR_H + 0.25,
      y: plan.y,
      label: exit.label,
      roomId: "shell",
      hinge: -1,
      exterior: true,
      glass: true,
    });
  });

  return { walls, doors, colliders };
}

/**
 * Lay rooms out along one row of a floor.
 *
 * Widths are consumed left to right from `left`, with a small gap between
 * neighbours so the generated walls stay visually separate.
 */
export function packRow<T extends { id: string; width: number }>(
  left: number,
  z: number,
  depth: number,
  entries: T[],
): Array<T & { x: number; z: number; w: number; d: number }> {
  const gap = 0.06;
  let cursor = left;
  return entries.map((entry) => {
    const w = entry.width;
    const x = cursor + w / 2;
    cursor += w + gap;
    return { ...entry, x, z, w, d: depth };
  });
}
