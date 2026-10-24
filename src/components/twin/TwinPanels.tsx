import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { catalogFor } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import {
  Box,
  Droplets,
  Gauge,
  Layers,
  Radio,
  Snowflake,
  Thermometer,
  Users,
  Waves,
  Wrench,
  X,
} from "lucide-react";
import { Link } from "react-router";
import type { RoomDef } from "./interiors/plan-types";
import { floorPlan } from "./interiors/plans";
import type { InspectTarget } from "./interiors/kit";
import { ICE_MONTHS, type WaterAction, type WaterBodyDef } from "./water/water-data";
import { statusTone, type VehicleInstance } from "./vehicle-data";

/** Status tone for a channel reported by the telemetry simulation. */
function channelTone(status: string): string {
  switch (status) {
    case "critical":
      return "#FF3B47";
    case "warning":
      return "#FFB020";
    case "nominal":
      return "#3EE07F";
    case "watch":
      return "#4A9EFF";
    default:
      return "#6B7A8F";
  }
}


/**
 * Twin panels.
 *
 * All of these are React DOM rather than in-canvas labels, because they are
 * decision surfaces: they carry tables, buttons and charts that belong in the
 * command console rather than inside the WebGL scene.
 */

/** Twelve month ice coverage bar chart. */
function IceChart({ values, tone = "#00E0C6" }: { values: number[]; tone?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex h-16 items-end gap-1">
        {values.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
            <div
              className="w-full rounded-sm"
              style={{
                height: `${Math.max(4, (v / 100) * 58)}px`,
                background: tone,
                opacity: 0.35 + (v / 100) * 0.6,
              }}
              title={`${ICE_MONTHS[i]} ${v}%`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] uppercase tracking-wider text-muted-foreground">
        <span>{ICE_MONTHS[0]}</span>
        <span>{ICE_MONTHS[6]}</span>
        <span>{ICE_MONTHS[11]}</span>
      </div>
      <div className="cc-label text-[9px]">Ice coverage, last 12 months</div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right">
        <span className="cc-mono block text-sm text-foreground">{value}</span>
        {note && <span className="block text-[10px] text-muted-foreground">{note}</span>}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Water panel                                                        */
/* ------------------------------------------------------------------ */

export function WaterPanel({
  def,
  live,
  onAction,
  onClose,
  trackers,
  submerged,
  lakesOpen,
}: {
  def: WaterBodyDef;
  live?: { value: number; unit: string; decimals: number; status: string } | null;
  onAction: (action: WaterAction) => void;
  onClose: () => void;
  trackers: boolean;
  submerged: boolean;
  lakesOpen: boolean;
}) {
  return (
    <Card className="cc-panel border-border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
              {def.kind === "fjord" || def.kind === "bay" ? (
                <Waves className="size-4 text-primary" />
              ) : (
                <Droplets className="size-4 text-primary" />
              )}
              {def.name}
            </CardTitle>
            <p className="mt-1 text-[11px] text-muted-foreground">{def.subtitle}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {live && (
          <div className="flex items-center justify-between rounded border border-border bg-card px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Radio className="size-3" />
              {live.unit ? "Live channel" : "Live"}
            </span>
            <span className="cc-mono text-sm" style={{ color: channelTone(live.status) }}>
              {live.value.toFixed(live.decimals)}
              {live.unit}
            </span>
          </div>
        )}
        <div>
          {def.metrics.map((m) => (
            <MetricRow key={m.label} label={m.label} value={m.value} note={m.note} />
          ))}
        </div>
        <IceChart values={def.iceCoverage} />
        {def.kind === "lakelet" && (
          <div className="rounded border border-border bg-card px-3 py-2 text-[10px] text-muted-foreground">
            Ice thickness drives the survey priority list. Open the Larsemann overlay to rank
            every lake together.
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {def.actions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant="outline"
              className={cn(
                "text-xs",
                (action.id === "underwater" && submerged) ||
                  (action.id === "icebergs" && trackers)
                  ? "border-primary/60 text-primary"
                  : "",
              )}
              onClick={() => onAction(action)}
            >
              {action.id === "underwater" && (submerged ? "Return to surface" : action.label)}
              {action.id !== "underwater" && action.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" className={cn("text-xs", lakesOpen && "border-primary/60 text-primary")} onClick={() => onAction({ id: "lakes", label: "Larsemann lakes" })}>
            Larsemann lakes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Room panel                                                         */
/* ------------------------------------------------------------------ */

export function RoomPanel({
  slug,
  room,
  level,
  onLevel,
  onClose,
  lightsOn,
  crewHere,
}: {
  slug: string;
  room: RoomDef;
  level: number;
  onLevel: (level: number) => void;
  onClose: () => void;
  lightsOn: boolean;
  crewHere: string[];
}) {
  const other = floorPlan(slug, level === 0 ? 1 : 0);
  return (
    <Card className="cc-panel border-border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
              <Layers className="size-4 text-primary" />
              {room.name}
            </CardTitle>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {room.tag ?? ""} - deck {level + 1} - {room.floor ?? "metal"} finish
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded border border-border bg-card px-2 py-1.5">
            <div className="cc-label text-[9px]">Temperature</div>
            <div className="cc-mono text-sm text-foreground">
              {(15.5 + room.w * 0.12).toFixed(1)} C
            </div>
          </div>
          <div className="rounded border border-border bg-card px-2 py-1.5">
            <div className="cc-label text-[9px]">Humidity</div>
            <div className="cc-mono text-sm text-foreground">
              {Math.round(32 + room.d * 2.4)} %
            </div>
          </div>
          <div className="rounded border border-border bg-card px-2 py-1.5">
            <div className="cc-label text-[9px]">Power draw</div>
            <div className="cc-mono text-sm text-foreground">
              {(1.4 + room.w * 0.42).toFixed(1)} kW
            </div>
          </div>
        </div>
        <MetricRow
          label="Occupancy"
          value={`${crewHere.length} of ${room.occupancy ?? 0}`}
          note={crewHere.length > 0 ? crewHere.join(", ") : "No crew inside"}
          icon={<Users className="size-3" />}
        />
        <MetricRow
          label="Lighting"
          value={lightsOn ? "ON" : "OFF"}
          note="Wall switch inside the room, or click the switch in the scene"
          icon={<Snowflake className="size-3" />}
        />
        <MetricRow
          label="Floor area"
          value={`${(room.w * room.d).toFixed(0)} m2`}
          note={`${room.w.toFixed(1)} by ${room.d.toFixed(1)} m`}
          icon={<Box className="size-3" />}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="text-xs" onClick={() => onLevel(level === 0 ? 1 : 0)}>
            Take stairway to deck {other ? other.level + 1 : level + 1}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => onClose()}
          >
            Leave room
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Inspected object panel                                             */
/* ------------------------------------------------------------------ */

export function ObjectPanel({
  target,
  readings,
  slug,
  onClose,
}: {
  target: InspectTarget;
  readings: Array<{ equipmentId: string; parameter: string; value: number; unit: string; decimals: number; status: string }>;
  slug: string;
  onClose: () => void;
}) {
  const linked = target.tag ? readings.filter((r) => r.equipmentId === target.tag) : [];
  const instrumented = Boolean(
    target.tag && catalogFor(slug).some((entry) => entry.equipmentId === target.tag),
  );
  return (
    <Card className="cc-panel border-border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
              <Gauge className="size-4 text-primary" />
              {target.label}
            </CardTitle>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {target.room} - deck {target.level + 1}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {target.detail && (
          <p className="text-xs leading-relaxed text-muted-foreground">{target.detail}</p>
        )}
        {linked.length > 0 && (
          <div className="space-y-1 border-t border-border pt-2">
            <div className="cc-label text-[9px]">
              Live channels - {target.tag}
            </div>
            {linked.map((r) => (
              <div key={r.parameter} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{r.parameter}</span>
                <span className="cc-mono text-sm" style={{ color: channelTone(r.status) }}>
                  {r.value.toFixed(r.decimals)}
                  {r.unit}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to={instrumented ? `/equipment/${target.tag}` : `/catalog?station=${slug}`}>
              {instrumented ? "Equipment record" : "Equipment catalogue"}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to={`/dashboard?station=${slug}`}>Live telemetry</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to={`/workspace?station=${slug}`}>Log an observation</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Vehicle panel                                                      */
/* ------------------------------------------------------------------ */

export function VehiclePanel({
  vehicle,
  running,
  onToggleEngine,
  onFocus,
  onClose,
}: {
  vehicle: VehicleInstance;
  running: boolean;
  onToggleEngine: () => void;
  /** Flies the camera to the unit's place in the yard. */
  onFocus?: () => void;
  onClose: () => void;
}) {
  const tone = statusTone(vehicle.status);
  const station = vehicle.id.startsWith("maitri") ? "maitri" : "bharati";
  return (
    <Card className="cc-panel border-border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
              <Wrench className="size-4 text-primary" />
              {vehicle.label}
            </CardTitle>
            <p className="mt-1 text-[11px] text-muted-foreground">{vehicle.spec.model}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="cc-label text-[9px]">Status</span>
          <Badge variant="outline" className="text-[10px] uppercase" style={{ borderColor: tone, color: tone }}>
            {vehicle.status}
          </Badge>
        </div>
        <MetricRow label="Fuel" value={`${vehicle.fuelPercent} %`} note="Tank level from the yard dip" icon={<Droplets className="size-3" />} />
        <MetricRow label="Engine hours" value={`${vehicle.engineHours} h`} note={`${vehicle.spec.power}`} icon={<Gauge className="size-3" />} />
        <MetricRow label="Last service" value={`${vehicle.daysSinceService} days ago`} note={`${vehicle.hoursToService} h to next service`} icon={<Wrench className="size-3" />} />
        <MetricRow label={vehicle.spec.wearLabel} value={`${vehicle.spec.wearPercent} %`} icon={<Thermometer className="size-3" />} />
        <MetricRow label="Capacity" value={vehicle.spec.capacity} />
        <MetricRow
          label="Range"
          value={vehicle.spec.rangeKm ? `${vehicle.spec.rangeKm} km` : "Towed"}
          note={vehicle.spec.notes}
          icon={<Radio className="size-3" />}
        />
        <MetricRow label="Location" value={vehicle.location} note={vehicle.driver} />
        <MetricRow label="Weather window" value={vehicle.weather} />
        <div className="flex flex-wrap gap-2">
          {vehicle.spec.powered && (
            <Button
              size="sm"
              variant="outline"
              className={cn("text-xs", running && "border-primary/60 text-primary")}
              onClick={onToggleEngine}
            >
              {running ? "Stop engine" : "Start engine"}
            </Button>
          )}
          {onFocus && (
            <Button size="sm" variant="outline" className="text-xs" onClick={onFocus}>
              Show in yard
            </Button>
          )}
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to={`/workspace?station=${station}`}>Log maintenance</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Larsemann lakes overlay                                            */
/* ------------------------------------------------------------------ */

export function LakesOverlay({
  lakes,
  onSelect,
  onClose,
}: {
  lakes: WaterBodyDef[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const sorted = [...lakes].sort((a, b) => b.iceThicknessCm - a.iceThicknessCm);
  return (
    <Card className="cc-panel border-border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
              <Snowflake className="size-4 text-primary" />
              Larsemann lakes - ice thickness overlay
            </CardTitle>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {sorted.length} modelled lakes near Bharati, ranked thickest first. Active research
              sites carry a cyan marker in the scene.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid max-h-64 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {sorted.map((lake) => {
            const research = lake.metrics.some((m) => m.value.startsWith("Cyanobacteria"));
            return (
              <button
                key={lake.id}
                type="button"
                onClick={() => onSelect(lake.id)}
                className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2 py-1.5 text-left transition-colors hover:border-primary/50"
              >
                <span className="truncate text-xs text-foreground">{lake.name}</span>
                <span className="flex items-center gap-2">
                  {research && (
                    <span className="cc-label text-[8px] text-primary">RESEARCH</span>
                  )}
                  <span className="cc-mono text-[11px] text-foreground">{lake.iceThicknessCm} cm</span>
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
