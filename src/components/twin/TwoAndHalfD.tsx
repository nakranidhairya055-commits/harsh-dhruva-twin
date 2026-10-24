import { useMemo } from "react";
import type { SensorSummary } from "./types";
import { floorPlan } from "./interiors/plans";
import { cn } from "@/lib/utils";

/**
 * 2.5D isometric cutaway twin.
 *
 * The station footprint is drawn as flat isometric tiles with each room as an
 * extruded cutaway block (floor and four walls, no ceiling). Live data
 * overlays float above every room and the blocks are colour coded by the
 * status of the subsystem they carry. Selecting a block drives the same
 * hotspot selection the 3D view uses.
 */

export interface RoomDef {
  id: string;
  hotspot: string;
  label: string;
  /** Grid position and size in tile units. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Extrusion height in pixels. */
  height: number;
  /** Equipment tag whose live reading is shown on the block. */
  equipmentId?: string;
  /** Fixed occupancy for the overlay. */
  occupancy: number;
}

const TILE = 46;

/** Tile size, in pixels, for one metre of plan at the chosen scale. */
const ISO_SCALE: Record<string, number> = { maitri: 0.42, bharati: 0.3 };

/** Tiles of separation between the two stacked decks. */
const DECK_GAP = 2.4;

/** Equipment tag whose live reading is shown on a block, by room kind. */
function equipmentFor(slug: "maitri" | "bharati", kind: string): string | undefined {
  const south = slug === "maitri";
  switch (kind) {
    case "command":
      return south ? "HAB-MAITRI" : "HAB-BHARATI";
    case "comms":
      return south ? "VSAT-MAITRI" : "VSAT-BHARATI";
    case "server":
    case "datacentre":
      return south ? "PDU-MAITRI" : "PDU-BHARATI";
    case "generator":
      return "GEN-1";
    case "power":
      return "CHP-1";
    case "water":
      return south ? "PIPE-MAITRI" : "SWPUMP-BHARATI";
    case "wastewater":
      return south ? "HAB-MAITRI" : "SWPUMP-BHARATI";
    case "storage":
      return south ? "FUEL-MAITRI" : "FUEL-BHARATI";
    case "medical":
      return south ? "HAB-MAITRI" : "HAB-BHARATI";
    case "laboratory":
      return south ? "HAB-MAITRI" : "LAB-BHARATI";
    case "atrium":
      return south ? "HAB-MAITRI" : "HAB-BHARATI";
    default:
      // Living deck rooms carry comfort channels rather than plant channels.
      return south ? "HAB-MAITRI" : "HAB-BHARATI";
  }
}

/** Hotspot the block selects when clicked, matching the 3D scene markers. */
function hotspotFor(kind: string): string {
  switch (kind) {
    case "generator":
      return "generators";
    case "power":
      return "chp";
    case "water":
      return "pipeline";
    case "laboratory":
      return "laboratory";
    case "wastewater":
      return "wastewater";
    case "storage":
      return "fuel";
    default:
      return "main-station";
  }
}

interface IsoDeck {
  name: string;
  top: number;
}

interface IsoPlan {
  rooms: RoomDef[];
  decks: IsoDeck[];
  gridW: number;
  gridH: number;
}

/**
 * Build the isometric room blocks from the same floor plans the walkable
 * interior uses, so the cutaway and the first-person decks describe one
 * station rather than two different drawings.
 */
function buildIsoRooms(slug: "maitri" | "bharati"): IsoPlan {
  const scale = ISO_SCALE[slug] ?? 0.42;
  const rooms: RoomDef[] = [];
  const decks: IsoDeck[] = [];
  let cursor = 0;

  for (const deck of [0, 1]) {
    const plan = floorPlan(slug, deck);
    if (!plan) continue;
    decks.push({ name: plan.name, top: cursor });
    const toX = (x: number) => (x + plan.shell.w / 2) * scale;
    const toY = (z: number) => cursor + (z + plan.shell.d / 2) * scale;

    // Corridor slab first, so room blocks draw over it.
    rooms.push({
      id: `${deck}-corridor`,
      hotspot: "main-station",
      label: `${plan.name} circulation`,
      x: toX(plan.corridor.x - plan.corridor.w / 2),
      y: toY(plan.corridor.z - plan.corridor.d / 2),
      w: plan.corridor.w * scale,
      h: plan.corridor.d * scale,
      height: 20,
      occupancy: 0,
    });

    for (const room of plan.rooms) {
      rooms.push({
        id: `${deck}-${room.id}`,
        hotspot: hotspotFor(room.kind),
        label: room.name,
        x: toX(room.x - room.w / 2),
        y: toY(room.z - room.d / 2),
        w: room.w * scale,
        h: room.d * scale,
        height: Math.round(26 + Math.min(room.w, room.d) * 2.2 + deck * 8),
        equipmentId: equipmentFor(slug, room.kind),
        occupancy: room.occupancy ?? 0,
      });
    }

    cursor += plan.shell.d * scale + DECK_GAP;
  }

  const gridW = Math.max(...rooms.map((r) => (r.x + r.w) * TILE));
  const gridH = Math.max(...rooms.map((r) => (r.y + r.h) * TILE));
  return { rooms, decks, gridW, gridH };
}

const STATUS_FILL: Record<string, { top: string; wall: string; text: string }> = {
  nominal: { top: "#123244", wall: "#0B2130", text: "#3EE07F" },
  warning: { top: "#3A2C12", wall: "#251B0A", text: "#FFB020" },
  watch: { top: "#152C42", wall: "#0E1F30", text: "#4A9EFF" },
  critical: { top: "#3A1218", wall: "#240A0F", text: "#FF3B47" },
  offline: { top: "#1A2533", wall: "#111A24", text: "#6B7A8F" },
};

function RoomBlock({
  room,
  reading,
  active,
  onSelect,
}: {
  room: RoomDef;
  reading?: SensorSummary;
  active: boolean;
  onSelect: (hotspot: string) => void;
}) {
  const status = active ? "critical" : (reading?.status ?? "offline");
  const fill = STATUS_FILL[status] ?? STATUS_FILL.offline;
  const width = room.w * TILE;
  const height = room.h * TILE;
  const base = {
    left: room.x * TILE,
    top: room.y * TILE,
    width,
    height,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(room.hotspot)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(room.hotspot)}
      className="absolute cursor-pointer"
      style={{ ...base, transformStyle: "preserve-3d" }}
    >
      {/* Floor */}
      <div
        className="absolute inset-0 border"
        style={{
          background: fill.wall,
          borderColor: active ? "#FF3B47" : "#1A2533",
        }}
      />
      {/* North wall */}
      <div
        className="absolute left-0 top-0 w-full"
        style={{
          height: room.height,
          background: fill.top,
          transformOrigin: "top",
          transform: "rotateX(90deg)",
          borderTop: `1px solid ${fill.text}55`,
        }}
      />
      {/* South wall */}
      <div
        className="absolute bottom-0 left-0 w-full"
        style={{
          height: room.height,
          background: fill.wall,
          transformOrigin: "bottom",
          transform: "rotateX(-90deg)",
          borderBottom: `1px solid ${fill.text}33`,
        }}
      />
      {/* East wall */}
      <div
        className="absolute right-0 top-0 h-full"
        style={{
          width: room.height,
          background: "#0B1622",
          transformOrigin: "right",
          transform: "rotateY(90deg)",
        }}
      />
      {/* West wall */}
      <div
        className="absolute left-0 top-0 h-full"
        style={{
          width: room.height,
          background: "#0D1A27",
          transformOrigin: "left",
          transform: "rotateY(-90deg)",
        }}
      />
      {/* Floating data overlay, counter-rotated to face the camera */}
      <div
        className="absolute left-1/2 top-1/2 w-max -translate-x-1/2 -translate-y-1/2"
        style={{
          transform: `translate(-50%, -50%) translateZ(${room.height + 26}px) rotateZ(-45deg) rotateX(-58deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className={cn(
            "rounded border px-2 py-1 text-center backdrop-blur",
            active && "ring-1 ring-[#FF3B47]",
          )}
          style={{
            background: "#060B14E0",
            borderColor: `${fill.text}66`,
          }}
        >
          <div className="font-display text-[10px] font-bold uppercase tracking-wider text-[#E8EEF4]">
            {room.label}
          </div>
          <div className="cc-mono text-[10px]" style={{ color: fill.text }}>
            {reading ? `${reading.value.toFixed(reading.decimals)}${reading.unit}` : "no data"}
          </div>
          <div className="cc-mono text-[9px] text-[#6B7A8F]">
            {room.occupancy} pax · {status}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TwoAndHalfD({
  slug,
  readings,
  onSelect,
  activeHotspot,
}: {
  slug: "maitri" | "bharati";
  readings: SensorSummary[];
  onSelect: (hotspot: string) => void;
  activeHotspot: string | null;
}) {
  const iso = useMemo(() => buildIsoRooms(slug), [slug]);
  const { rooms, gridW, gridH } = iso;

  const byEquipment = useMemo(() => {
    const map = new Map<string, SensorSummary>();
    for (const reading of readings) {
      if (!map.has(reading.equipmentId)) map.set(reading.equipmentId, reading);
    }
    return map;
  }, [readings]);

  const counts = rooms.reduce<Record<string, number>>((acc, room) => {
    const reading = room.equipmentId ? byEquipment.get(room.equipmentId) : undefined;
    const status = reading?.status ?? "offline";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden bg-[#060B14] px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="cc-label">2.5D isometric cutaway</span>
        {Object.entries(STATUS_FILL).map(([status, fill]) => (
          <span key={status} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="size-2 rounded-sm" style={{ background: fill.text }} />
            {status}
            {counts[status] ? ` (${counts[status]})` : ""}
          </span>
        ))}
        <span className="cc-mono text-[10px] text-muted-foreground">
          click a room block to inspect
        </span>
      </div>

      <div
        className="flex-1 overflow-auto"
        style={{ perspective: "1600px", perspectiveOrigin: "50% 40%" }}
      >
        <div
          className="relative"
          style={{
            width: gridW,
            height: gridH,
            transform: "rotateX(58deg) rotateZ(45deg)",
            transformStyle: "preserve-3d",
            transformOrigin: "center",
            margin: "70px auto 0",
          }}
        >
          {/* Flat isometric terrain tiles */}
          <div
            className="absolute"
            style={{
              left: -TILE * 4,
              top: -TILE * 4,
              width: gridW + TILE * 8,
              height: gridH + TILE * 8,
              background:
                "repeating-linear-gradient(0deg, #0E1A27 0 1px, transparent 1px 46px), repeating-linear-gradient(90deg, #0E1A27 0 1px, transparent 1px 46px), #081120",
              border: "1px solid #1A2533",
            }}
          />
          {/* Shoreline / water body tile */}
          <div
            className="absolute"
            style={{
              left: slug === "maitri" ? -TILE * 3 : gridW + TILE,
              top: gridH + TILE,
              width: TILE * 4,
              height: TILE * 3,
              background: "linear-gradient(135deg, #123A52, #0B2436)",
              border: "1px solid #00E0C655",
            }}
          />
          {iso.decks.map((deck) => (
            <div
              key={deck.name}
              className="absolute left-0"
              style={{ top: deck.top * TILE - 18 }}
            >
              <span className="cc-label text-[9px] text-[#4A9EFF]">{deck.name}</span>
            </div>
          ))}
          {rooms.map((room) => (
            <RoomBlock
              key={room.id}
              room={room}
              reading={room.equipmentId ? byEquipment.get(room.equipmentId) : undefined}
              active={activeHotspot === room.hotspot}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
