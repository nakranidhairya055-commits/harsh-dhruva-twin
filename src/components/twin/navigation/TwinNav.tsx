import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Crosshair, MapPin, Navigation } from "lucide-react";
import { floorPlan } from "../interiors/plans";
import { stationWater } from "../water/water-data";

/**
 * Twin navigation.
 *
 * The mini-map draws one of two plans depending on where the operator is: the
 * station plot while outside, or the current deck while walking. It always
 * shows the live player marker, so the map doubles as a position readout and
 * a click-to-travel surface.
 */

export interface TeleportTarget {
  id: string;
  label: string;
  group: "Exterior" | "Interior" | "Water" | "Vehicle";
  /** Exterior targets move the orbit camera to a named preset. */
  preset?: string;
  /** Interior targets load a deck and drop the player at a spawn point. */
  level?: number;
  spawn?: [number, number, number];
  /** Water targets pick a body as well as moving the camera. */
  waterId?: string;
  /** Vehicle targets focus the yard on one unit. */
  vehicleId?: string;
}

export interface PlayerPosition {
  x: number;
  z: number;
  yaw: number;
}

/** Exterior plot features drawn on the mini-map, in station metres. */
const EXTERIOR_FEATURES: Record<
  string,
  Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    label: string;
    tone: string;
    /** Hotspot opened in the scene when the operator clicks the plot block. */
    hotspot: string;
  }>
> = {
  maitri: [
    { x: 0, z: 0, w: 40, d: 20, label: "Main building", tone: "#00E0C6", hotspot: "main-station" },
    { x: -12, z: 36, w: 6, d: 4, label: "Lake pump house", tone: "#4A9EFF", hotspot: "pipeline" },
    { x: 42, z: 30, w: 22, d: 16, label: "Fuel farm", tone: "#FFB020", hotspot: "fuel" },
    { x: 16, z: -26, w: 14, d: 12, label: "Generator hall", tone: "#FFB020", hotspot: "generators" },
    { x: -44, z: -12, w: 28, d: 10, label: "Summer camp", tone: "#6B7A8F", hotspot: "summer-camp" },
    { x: -8, z: -30, w: 6, d: 6, label: "Weather mast", tone: "#4A9EFF", hotspot: "weather" },
    { x: 58, z: -40, w: 14, d: 10, label: "Garage", tone: "#6B7A8F", hotspot: "vehicle-fleet" },
    { x: 62, z: 18, w: 24, d: 22, label: "Vehicle yard", tone: "#3EE07F", hotspot: "vehicle-fleet" },
    { x: 74, z: -30, w: 16, d: 16, label: "Helipad", tone: "#3EE07F", hotspot: "helipad" },
  ],
  bharati: [
    { x: 0, z: 0, w: 36, d: 48, label: "Container station", tone: "#00E0C6", hotspot: "main-station" },
    { x: 34, z: -20, w: 8, d: 20, label: "CHP hall", tone: "#FFB020", hotspot: "chp" },
    { x: -44, z: -18, w: 26, d: 12, label: "Fuel farm", tone: "#FFB020", hotspot: "fuel" },
    { x: 10, z: 44, w: 12, d: 8, label: "Seawater pumps", tone: "#4A9EFF", hotspot: "seawater" },
    { x: -20, z: 40, w: 8, d: 6, label: "Wastewater", tone: "#6B7A8F", hotspot: "wastewater" },
    { x: 46, z: 26, w: 14, d: 8, label: "Laboratory", tone: "#3EE07F", hotspot: "laboratory" },
    { x: -12, z: -52, w: 30, d: 12, label: "Summer camp", tone: "#6B7A8F", hotspot: "summer-camp" },
    { x: -86, z: 16, w: 24, d: 26, label: "Vehicle yard", tone: "#3EE07F", hotspot: "vehicle-fleet" },
    { x: -74, z: -34, w: 16, d: 16, label: "Helipad", tone: "#3EE07F", hotspot: "helipad" },
  ],
};

/** Range rings drawn on the station plot, in metres. */
const PLOT_RINGS = [50, 100, 150] as const;

/** Plotted mini-map with the live player marker. */
export function MiniMap({
  slug,
  mode,
  level,
  position,
  activeWater,
  onTeleport,
  onSelectObject,
  onSelectWater,
}: {
  slug: string;
  mode: "exterior" | "interior" | "underwater";
  level: number;
  position: PlayerPosition;
  activeWater?: string | null;
  onTeleport?: (target: TeleportTarget) => void;
  /** Opens the clicked structure's hotspot in the scene. */
  onSelectObject?: (hotspotId: string) => void;
  /** Opens the clicked water body's panel. */
  onSelectWater?: (bodyId: string) => void;
}) {
  const plan = floorPlan(slug, level);
  const water = stationWater(slug === "maitri" ? "maitri" : "bharati");

  if (mode !== "exterior" && plan) {
    // Deck plan view: rooms as blocks with the corridor running through.
    const spanX = plan.shell.w;
    const spanZ = plan.shell.d;
    const scale = Math.min(200 / spanX, 150 / spanZ);
    return (
      <div className="rounded border border-border bg-[#060B14]/80 p-2 backdrop-blur">
        <div className="cc-label mb-1 flex items-center gap-1 text-[9px]">
          <MapPin className="size-3 text-primary" />
          Deck {level + 1} plan
        </div>
        <svg viewBox="-100 -75 200 150" className="h-40 w-full">
          <rect x={-spanX / 2 * scale} y={-spanZ / 2 * scale} width={spanX * scale} height={spanZ * scale} fill="#0A121E" stroke="#1A2533" />
          <rect
            x={(plan.corridor.x - plan.corridor.w / 2) * scale}
            y={(plan.corridor.z - plan.corridor.d / 2) * scale}
            width={plan.corridor.w * scale}
            height={plan.corridor.d * scale}
            fill="#16232F"
            stroke="#1A2533"
          />
          {plan.rooms.map((room) => (
            <g key={room.id}>
              <rect
                x={(room.x - room.w / 2) * scale}
                y={(room.z - room.d / 2) * scale}
                width={room.w * scale}
                height={room.d * scale}
                fill="#0E1A26"
                stroke="#2C3C4C"
              />
              {room.w * scale > 26 && (
                <text
                  x={room.x * scale}
                  y={room.z * scale}
                  fontSize={7}
                  fill="#6B7A8F"
                  textAnchor="middle"
                >
                  {room.name.split(" ")[0]}
                </text>
              )}
            </g>
          ))}
          <circle cx={position.x * scale} cy={position.z * scale} r={4} fill="#FFB020" />
          <line
            x1={position.x * scale}
            y1={position.z * scale}
            x2={position.x * scale - Math.sin(position.yaw) * 12}
            y2={position.z * scale - Math.cos(position.yaw) * 12}
            stroke="#FFB020"
            strokeWidth={1.5}
          />
        </svg>
        <p className="cc-mono mt-1 text-[9px] text-muted-foreground">
          x {position.x.toFixed(1)} z {position.z.toFixed(1)} m
        </p>
      </div>
    );
  }

  const features = EXTERIOR_FEATURES[slug] ?? [];
  return (
    <div className="rounded border border-border bg-[#060B14]/84 p-2 backdrop-blur">
      <div className="cc-label mb-1 flex items-center gap-1 text-[9px]">
        <MapPin className="size-3 text-primary" />
        Station plot
      </div>
      <svg viewBox="-160 -130 320 300" className="h-48 w-full">
        <defs>
          <pattern id="plot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#16202B" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect x={-160} y={-130} width={320} height={300} fill="url(#plot-grid)" />

        {/* Range rings from the station datum. */}
        {PLOT_RINGS.map((radius) => (
          <circle
            key={radius}
            cx={0}
            cy={0}
            r={radius}
            fill="none"
            stroke="#1F3B4A"
            strokeWidth={0.9}
            strokeDasharray="5 5"
          />
        ))}
        <text x={PLOT_RINGS[1] * 0.72} y={-PLOT_RINGS[1] * 0.72} fontSize={6.5} fill="#4A5D72">
          {PLOT_RINGS[1]} m
        </text>

        {/* Water bodies, clickable. */}
        {water.map((body) => (
          <ellipse
            key={body.id}
            cx={body.position[0]}
            cy={body.position[1]}
            rx={body.radius[0]}
            ry={body.radius[1]}
            fill={activeWater === body.id ? "#0F5B6E" : "#0C2C3C"}
            stroke={activeWater === body.id ? "#00E0C6" : "#1A2533"}
            strokeWidth={activeWater === body.id ? 2 : 1}
            opacity={body.kind === "lakelet" ? 0.7 : 1}
            className={cn(onSelectWater && "cursor-pointer")}
            onClick={() => onSelectWater?.(body.id)}
          />
        ))}
        {water
          .filter((body) => body.kind !== "lakelet")
          .map((body) => (
            <text
              key={`label-${body.id}`}
              x={body.position[0]}
              y={body.position[1] - body.radius[1] - 3}
              fontSize={6.5}
              fill="#4A9EFF"
              textAnchor="middle"
            >
              {body.name.length > 22 ? `${body.name.slice(0, 20)}...` : body.name}
            </text>
          ))}

        {/* Structures, clickable to open the matching hotspot. */}
        {features.map((f) => (
          <g
            key={`${f.label}-${f.hotspot}`}
            className={cn(onSelectObject && "cursor-pointer")}
            onClick={() => onSelectObject?.(f.hotspot)}
          >
            <rect
              x={f.x - f.w / 2}
              y={f.z - f.d / 2}
              width={f.w}
              height={f.d}
              fill="#0E1A26"
              stroke={f.tone}
              strokeWidth={1.2}
            />
            <text x={f.x} y={f.z + 2} fontSize={6} fill={f.tone} textAnchor="middle">
              {f.label.split(" ")[0]}
            </text>
          </g>
        ))}

        {/* North arrow and scale bar. */}
        <g transform="translate(148, -116)">
          <line x1={0} y1={6} x2={0} y2={-8} stroke="#8FA0B2" strokeWidth={1.2} />
          <path d="M 0 -12 L 3.4 -4 L -3.4 -4 Z" fill="#8FA0B2" />
          <text x={0} y={14} fontSize={7} fill="#8FA0B2" textAnchor="middle">
            N
          </text>
        </g>
        <g transform="translate(-150, 116)">
          <line x1={0} y1={0} x2={50} y2={0} stroke="#8FA0B2" strokeWidth={1.2} />
          <line x1={0} y1={-3} x2={0} y2={3} stroke="#8FA0B2" strokeWidth={1.2} />
          <line x1={50} y1={-3} x2={50} y2={3} stroke="#8FA0B2" strokeWidth={1.2} />
          <text x={25} y={-5} fontSize={6.5} fill="#8FA0B2" textAnchor="middle">
            50 m
          </text>
        </g>
      </svg>
      <p className="cc-mono mt-1 text-[9px] text-muted-foreground">
        orbit view - {features.length} structures plotted - click a block or a lake to open it
      </p>
    </div>
  );
}

/** Teleport menu grouping every destination the twin offers. */
export function TeleportMenu({
  open,
  targets,
  onTeleport,
  onClose,
}: {
  open: boolean;
  targets: TeleportTarget[];
  onTeleport: (target: TeleportTarget) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const groups: Array<TeleportTarget["group"]> = ["Interior", "Water", "Vehicle", "Exterior"];
  return (
    <div className="absolute right-3 top-24 z-20 w-64 rounded border border-border bg-[#060B14]/95 p-3 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="cc-label flex items-center gap-1.5 text-[9px]">
          <Navigation className="size-3 text-primary" />
          Teleport
        </span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {groups.map((group) => {
          const items = targets.filter((t) => t.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group}>
              <div className="cc-label mb-1 text-[9px]">{group}</div>
              <div className="space-y-1">
                {items.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => onTeleport(target)}
                    className="flex w-full items-center gap-2 rounded border border-border bg-card px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Crosshair className="size-3 shrink-0 text-primary" />
                    <span className="truncate">{target.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 border-t border-border pt-2 text-[9px] text-muted-foreground">
        Press T anywhere in the twin to reopen this list.
      </p>
    </div>
  );
}
