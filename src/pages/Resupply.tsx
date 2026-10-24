import { AppShell } from "@/components/AppShell";
import { PageHeading, Panel, PanelEmpty, StatTile } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUtc } from "@/lib/station";
import {
  DESTINATIONS,
  ICE_EDGE_LAT,
  VESSEL,
  VOYAGES,
  compass,
  formatPosition,
  googleEarthUrl,
  googleMapsEmbedUrl,
  googleMapsRouteUrl,
  googleMapsUrl,
  midpoint,
  noonReports,
  routeDistances,
  statusAt,
  type GeoPoint,
} from "@/lib/voyage";
import { cn } from "@/lib/utils";
import { award } from "@/lib/achievements";
import { Anchor, Compass, ExternalLink, MapPin, Play, Ship, Waves } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/** Chart projection for the Southern Ocean sector the voyages cross. */
const LON_MIN = -4;
const LON_MAX = 90;
const LAT_TOP = -28;
const LAT_BOTTOM = -76;
const CHART_W = 1000;
const CHART_H = 620;

function project(point: { lat: number; lon: number }) {
  const x = ((point.lon - LON_MIN) / (LON_MAX - LON_MIN)) * CHART_W;
  const y = ((LAT_TOP - point.lat) / (LAT_TOP - LAT_BOTTOM)) * CHART_H;
  return { x, y };
}

/** Resupply voyage tracker: position, route, Google Maps and Google Earth. */
export default function Resupply() {
  /** Wall clock, refreshed on a short interval so the board reads as live. */
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const [voyageId, setVoyageId] = useState(VOYAGES[0].id);
  const [focus, setFocus] = useState<GeoPoint | null>(null);
  /**
   * Set while the operator scrubs the passage instead of watching it live.
   * Everything on the page is computed from this one clock, so a scrubbed
   * position, the distance run, the noon reports and the sea state all stay
   * consistent with each other.
   */
  const [scrubMs, setScrubMs] = useState<number | null>(null);
  /** Where the satellite map is anchored, and whether it follows the ship. */
  const [mapAnchor, setMapAnchor] = useState<GeoPoint | null>(null);
  const [follow, setFollow] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => setLiveNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const now = scrubMs ?? liveNow;
  const live = scrubMs === null;

  /** Opening the sea lift is a badge: the supply line is watched. */
  useEffect(() => {
    award("resupply");
  }, []);

  const voyage = VOYAGES.find((candidate) => candidate.id === voyageId) ?? VOYAGES[0];
  const status = useMemo(() => statusAt(voyage, now), [voyage, now]);
  const reports = useMemo(() => noonReports(status, now), [status, now]);

  /**
   * The map anchor follows the ship, but only re-anchors every ninety seconds,
   * so the satellite iframe reports a moving position without reloading on
   * every tick of the clock.
   */
  const positionRef = useRef(status.position);
  positionRef.current = status.position;
  useEffect(() => {
    if (!follow) return;
    const anchor = () => setMapAnchor(positionRef.current);
    anchor();
    const timer = window.setInterval(anchor, 90000);
    return () => window.clearInterval(timer);
  }, [follow, voyageId]);

  /* The travelled and remaining halves of the track, drawn from the route. */
  const [flownPoints, remainingPoints] = useMemo(() => {
    const cumulative = routeDistances(voyage.route);
    const total = cumulative[cumulative.length - 1] ?? 1;
    const target = status.fraction * total;
    const flown: GeoPoint[] = [voyage.route[0]];
    const remaining: GeoPoint[] = [status.position];
    for (let i = 1; i < voyage.route.length; i += 1) {
      if (cumulative[i] <= target) flown.push(voyage.route[i]);
      else remaining.push(voyage.route[i]);
    }
    flown.push(status.position);
    return [flown.map(project), remaining.map(project)];
  }, [voyage, status.fraction, status.position]);

  const shipPoint = project(status.position);
  const mapPoint = focus ?? mapAnchor ?? status.position;
  const passageMidpoint = useMemo(
    () => midpoint({ lat: DESTINATIONS["cape-town"].lat, lon: DESTINATIONS["cape-town"].lon }, voyage.destination),
    [voyage.destination],
  );
  const destinationPoint =
    DESTINATIONS[voyage.target] ?? DESTINATIONS.bharati;

  const totalCargo =
    voyage.cargo.fuelTonnes +
    voyage.cargo.foodTonnes +
    voyage.cargo.scienceTonnes +
    voyage.cargo.constructionTonnes;

  /** Live countdown to the planned arrival, taken from the same clock. */
  const toArrivalMs = status.plannedArrivalMs - now;
  const countdown =
    status.state === "arrived" || toArrivalMs <= 0
      ? "arrived"
      : `${Math.floor(toArrivalMs / 86400000)}d ${Math.floor((toArrivalMs % 86400000) / 3600000)}h ${Math.floor((toArrivalMs % 3600000) / 60000)}m`;

  const stateTone =
    status.state === "at sea"
      ? "border-[#00E0C6]/40 text-[#7DF3E4]"
      : status.state === "arrived"
        ? "border-[#3EE07F]/40 text-[#3EE07F]"
        : "border-[#FFB020]/40 text-[#FFB020]";

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Logistics"
          title="Resupply voyage tracker"
          description="The annual sea lift that keeps both stations alive: route, position, cargo, noon reports and sea state from Cape Town to Bharati or Maitri, with Google Maps and Google Earth one click away."
        >
          <Badge variant="outline" className={cn("text-[10px]", stateTone)}>
            {status.state === "at sea" ? "UNDER WAY" : status.state === "arrived" ? "ARRIVED" : "IN PORT"}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 text-[10px]",
              live ? "border-[#3EE07F]/50 text-[#3EE07F]" : "border-[#FFB020]/50 text-[#FFB020]",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                live ? "animate-pulse bg-[#3EE07F]" : "bg-[#FFB020]",
              )}
            />
            {live
              ? `LIVE - updated ${Math.max(0, Math.round((liveNow - now) / 1000))}s ago`
              : `SCRUBBED - ${formatUtc(now).slice(0, 16)} UTC`}
          </Badge>
        </PageHeading>

        <div className="flex flex-wrap items-center gap-1.5">
          {VOYAGES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setVoyageId(option.id);
                setFocus(null);
                setFollow(true);
                setScrubMs(null);
              }}
              className={cn(
                "rounded border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                option.id === voyage.id
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {option.name}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Day of voyage"
            value={status.state === "in port" ? "not sailed" : `day ${status.dayOfVoyage}`}
            hint={`${status.daysAtSea} days at sea of ${status.totalDays} planned.`}
          />
          <StatTile
            label="Distance run"
            value={Math.round(status.runKm * 0.539957)}
            unit="nm"
            hint={`${status.runKm} km of ${status.totalKm} km total.`}
          />
          <StatTile
            label="Remaining to port"
            value={Math.round(status.remainingKm * 0.539957)}
            unit="nm"
            tone="text-[#00E0C6]"
            hint={`Next waypoint ${status.nextWaypoint?.name ?? "-"}${status.distanceToNextKm ? `, ${Math.round(status.distanceToNextKm * 0.539957)} nm ahead` : ""}.`}
          />
          <StatTile
            label="Planned arrival"
            value={formatUtc(status.plannedArrivalMs).slice(0, 16)}
            hint={
              status.state === "arrived"
                ? "Voyage closed out, cargo discharged."
                : `${Math.max(0, Math.round(status.overnightMs / 3600000))} hours remaining on the plan.`
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Live position" className="lg:col-span-1">
            <div className="space-y-3">
              <div>
                <div className="cc-label text-[9px]">Position</div>
                <div className="cc-mono mt-1 text-sm text-foreground">
                  {formatPosition(status.position)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="cc-label text-[9px]">Course</div>
                  <div className="cc-mono mt-1 flex items-center gap-1.5 text-xs text-foreground">
                    <Compass className="size-3.5 text-primary" />
                    {status.headingDeg} deg {compass(status.headingDeg)}
                  </div>
                </div>
                <div>
                  <div className="cc-label text-[9px]">Speed</div>
                  <div className="cc-mono mt-1 text-xs text-foreground">{status.speedKn} kn</div>
                </div>
                <div>
                  <div className="cc-label text-[9px]">Ice state</div>
                  <div className="cc-mono mt-1 text-xs text-foreground">{status.iceState}</div>
                </div>
                <div>
                  <div className="cc-label text-[9px]">Schedule margin</div>
                  <div
                    className={cn(
                      "cc-mono mt-1 text-xs",
                      status.marginHours >= 0 ? "text-[#3EE07F]" : "text-[#FFB020]",
                    )}
                  >
                    {status.marginHours} h
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="cc-label text-[9px]">Time to arrival</div>
                  <div className="cc-mono mt-1 text-sm text-foreground">{countdown}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Passage progress</span>
                  <span className="cc-mono">{status.percent}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-border">
                  <div className="h-full bg-primary" style={{ width: `${status.percent}%` }} />
                </div>
              </div>

              <div className="rounded border border-border px-3 py-2">
                <div className="cc-label text-[9px]">Discharge plan</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {voyage.discharge}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Button asChild size="sm" variant="outline" className="text-[11px]">
                  <a href={googleMapsUrl(mapPoint, 5)} target="_blank" rel="noreferrer">
                    <MapPin className="mr-1.5 size-3.5" />
                    Google Maps
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="text-[11px]">
                  <a href={googleEarthUrl(mapPoint, 1800000)} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 size-3.5" />
                    Google Earth
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="text-[11px]">
                  <a
                    href={googleMapsRouteUrl(mapPoint, destinationPoint)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Anchor className="mr-1.5 size-3.5" />
                    Route to {voyage.targetLabel}
                  </a>
                </Button>
              </div>
            </div>
          </Panel>

          <Panel
            title="Google Maps - satellite view"
            className="lg:col-span-2"              action={
              <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                centred on {focus ? focus.name : follow ? "the ship, live" : "last position"}
              </Badge>
            }
          >
            <div className="overflow-hidden rounded border border-border">
              <iframe
                title="Resupply voyage position on Google Maps"
                src={googleMapsEmbedUrl(mapPoint, focus ? 8 : 4)}
                className="h-[360px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="text-[11px]"
                onClick={() => {
                  setFocus(null);
                  setFollow(true);
                  setMapAnchor(status.position);
                }}
              >
                <Ship className="mr-1.5 size-3.5" />
                Centre on the ship
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-[11px]"
                onClick={() => {
                  setFollow(false);
                  setFocus({
                    name: "Cape Town",
                    lat: DESTINATIONS["cape-town"].lat,
                    lon: DESTINATIONS["cape-town"].lon,
                  });
                }}
              >
                Centre on Cape Town
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-[11px]"
                onClick={() => {
                  setFollow(false);
                  setFocus(destinationPoint);
                }}
              >
                Centre on {voyage.targetLabel}
              </Button>
              <Button
                size="sm"
                variant={follow ? "secondary" : "ghost"}
                className="text-[11px]"
                onClick={() => {
                  setFocus(null);
                  setFollow((value) => !value);
                }}
              >
                {follow ? "Following the ship" : "Follow the ship"}
              </Button>
              <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
                mid-passage {formatPosition(passageMidpoint)}
              </span>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              Satellite tiles come from the keyless Google Maps embed, so the tracker works with no
              configuration. Adding a Maps JavaScript API key upgrades this panel to a live vector map
              with the route drawn in the page.
            </p>
          </Panel>
        </div>

        <Panel
          title="Route chart"
          action={
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#00E0C6]" /> route
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#FF3B47]" /> ship
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#4A9EFF]" /> ice edge
              </span>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-[420px] w-full min-w-[760px]">
              {/* Graticule */}
              {Array.from({ length: 13 }, (_, i) => LON_MIN + i * 8).map((lon) => {
                const { x } = project({ lat: 0, lon });
                return (
                  <line key={`lon-${lon}`} x1={x} y1={0} x2={x} y2={CHART_H} stroke="#1C2733" strokeWidth={1} />
                );
              })}
              {Array.from({ length: 7 }, (_, i) => LAT_TOP - i * 8).map((lat) => {
                const { y } = project({ lat, lon: 0 });
                return (
                  <g key={`lat-${lat}`}>
                    <line x1={0} y1={y} x2={CHART_W} y2={y} stroke="#1C2733" strokeWidth={1} />
                    <text x={6} y={y - 4} fontSize={10} fill="#4A5D72">
                      {lat} deg
                    </text>
                  </g>
                );
              })}

              {/* Ice edge */}
              <polyline
                points={Array.from({ length: 46 }, (_, i) => {
                  const lon = LON_MIN + (i * (LON_MAX - LON_MIN)) / 45;
                  const lat = ICE_EDGE_LAT + 1.8 * Math.sin((lon * Math.PI) / 26);
                  const at = project({ lat, lon });
                  return `${at.x},${at.y}`;
                }).join(" ")}
                fill="none"
                stroke="#4A9EFF"
                strokeWidth={1.8}
                strokeDasharray="7 5"
              />
              <text x={project({ lat: ICE_EDGE_LAT + 3, lon: 46 }).x} y={project({ lat: ICE_EDGE_LAT, lon: 46 }).y} fontSize={10} fill="#4A9EFF">
                Antarctic ice edge
              </text>

              {/* Route: run in bright cyan, still to run in a dashed dim line */}
              <polyline
                points={remainingPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#00E0C6"
                strokeWidth={1.6}
                strokeDasharray="6 6"
                opacity={0.45}
              />
              <polyline
                points={flownPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#00E0C6"
                strokeWidth={2.6}
              />

              {/* Waypoints */}
              {voyage.route.map((point, index) => {
                const at = project(point);
                const active = focus?.name === point.name;
                return (
                  <g
                    key={`${point.name}-${index}`}
                    transform={`translate(${at.x}, ${at.y})`}
                    onClick={() => setFocus(point)}
                    className="cursor-pointer"
                  >
                    <circle r={active ? 6 : 4} fill={active ? "#FFB020" : "#0B1622"} stroke="#00E0C6" strokeWidth={1.6} />
                    <text x={8} y={3.5} fontSize={9.5} fill={active ? "#FFB020" : "#8FA0B2"}>
                      {point.name}
                    </text>
                  </g>
                );
              })}

              {/* Port and destination */}
              {[DESTINATIONS["cape-town"], DESTINATIONS[voyage.target]].map((point) => {
                const at = project(point);
                return (
                  <g key={point.name} transform={`translate(${at.x}, ${at.y})`}>
                    <rect x={-4} y={-4} width={8} height={8} fill="#FFB020" />
                    <text x={10} y={4} fontSize={11} fill="#FFB020" className="font-display">
                      {point.name}
                    </text>
                  </g>
                );
              })}

              {/* Ship, with a halo that pulses while the clock is live */}
              <g transform={`translate(${shipPoint.x}, ${shipPoint.y})`}>
                {live && (
                  <circle r={9} fill="#FF3B47" opacity={0.35} className="animate-ping" />
                )}
                <circle r={9} fill="#FF3B47" opacity={0.2} />
                <circle r={4.5} fill="#FF3B47" />
                <line
                  x1={0}
                  y1={0}
                  x2={14 * Math.sin((status.headingDeg * Math.PI) / 180)}
                  y2={-14 * Math.cos((status.headingDeg * Math.PI) / 180)}
                  stroke="#FF3B47"
                  strokeWidth={2}
                />
                <text x={12} y={-10} fontSize={10} fill="#FF8A92" className="cc-mono">
                  {VESSEL.name}
                </text>
              </g>
            </svg>
          </div>
          <p className="mt-3 grid gap-2 text-[10px] leading-snug text-muted-foreground sm:grid-cols-2">
            <span>
              The chart is drawn by the twin from the same route geometry used for the position, distance
              and ETA, so the ship marker cannot drift away from the numbers. Click any waypoint to centre
              the satellite map on it.
            </span>
            <span>
              Ice edge is plotted for the operating season. {status.iceState === "in ice" ? "The ship is currently inside the ice edge." : status.iceState === "cleared ice" ? "The ship has cleared the ice edge." : "The ship is still north of the ice edge."}
            </span>
          </p>
        </Panel>

        {/*
          Passage timeline. Dragging it moves the one clock the whole screen is
          computed from, so a scrubbed voyage still reports a consistent
          position, distance run, sea state and noon report.
        */}
        <Panel
          title="Passage timeline"
          action={
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                live ? "border-[#3EE07F]/50 text-[#3EE07F]" : "border-[#FFB020]/50 text-[#FFB020]",
              )}
            >
              {live ? "on the live clock" : "scrubbing the passage"}
            </Badge>
          }
        >
          <input
            type="range"
            aria-label="Voyage time"
            min={status.departureMs}
            max={status.plannedArrivalMs}
            step={1800000}
            value={Math.min(status.plannedArrivalMs, Math.max(status.departureMs, now))}
            onChange={(event) => setScrubMs(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded bg-border accent-[#00E0C6]"
          />
          <div className="cc-mono mt-1.5 flex justify-between text-[10px] text-muted-foreground">
            <span>{formatUtc(status.departureMs).slice(0, 16)} UTC departure</span>
            <span>{status.daysAtSea} of {status.totalDays} days at sea</span>
            <span>{formatUtc(status.plannedArrivalMs).slice(0, 16)} UTC arrival</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Button size="sm" className="text-[11px]" disabled={live} onClick={() => setScrubMs(null)}>
              <Play className="mr-1.5 size-3.5" />
              Back to live
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px]"
              onClick={() => setScrubMs(status.departureMs)}
            >
              Departure
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px]"
              onClick={() =>
                setScrubMs(Math.round((status.departureMs + status.plannedArrivalMs) / 2))
              }
            >
              Mid passage
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px]"
              onClick={() => setScrubMs(status.plannedArrivalMs)}
            >
              Arrival
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-[11px]"
              disabled={live || status.daysAtSea < 1}
              onClick={() => setScrubMs(Date.now())}
            >
              Jump to now
            </Button>
          </div>
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            The timeline moves the single clock the whole screen is built from. Scrub it and the
            position, the distance run, the sea state, the noon reports and the countdown all follow
            together, which is how the discharge window can be checked before the ship is there. The
            marker on the chart pulses while the clock is live.
          </p>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Noon reports"
            action={
              <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                <Waves className="mr-1 size-3" />
                {reports.length} report{reports.length === 1 ? "" : "s"}
              </Badge>
            }
          >
            {reports.length === 0 ? (
              <PanelEmpty message="The vessel has not sailed yet, so there are no noon reports for this voyage. Reports appear from the first day at sea." />
            ) : (
              <div className="max-h-80 overflow-y-auto rounded border border-border">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Day</th>
                      <th className="px-3 py-1.5 font-medium">UTC</th>
                      <th className="px-3 py-1.5 font-medium">Position</th>
                      <th className="px-3 py-1.5 font-medium">Run</th>
                      <th className="px-3 py-1.5 font-medium">Avg</th>
                      <th className="px-3 py-1.5 font-medium">Wind</th>
                      <th className="px-3 py-1.5 font-medium">Swell</th>
                      <th className="px-3 py-1.5 font-medium">Air</th>
                    </tr>
                  </thead>
                  <tbody className="cc-mono">
                    {reports
                      .slice()
                      .reverse()
                      .map((report) => (
                        <tr key={report.day} className="border-t border-border">
                          <td className="px-3 py-1">{report.day}</td>
                          <td className="px-3 py-1">{formatUtc(report.timestamp).slice(11, 16)}</td>
                          <td className="px-3 py-1">{formatPosition(report.position)}</td>
                          <td className="px-3 py-1">
                            {report.distanceRunKm} km
                            {report.iceCrossing && (
                              <span className="ml-1 text-[#4A9EFF]">ice edge</span>
                            )}
                          </td>
                          <td className="px-3 py-1">{report.averageSpeedKn} kn</td>
                          <td className="px-3 py-1">
                            {report.sea.windKn} kn {compass(report.sea.windDir)}
                          </td>
                          <td className="px-3 py-1">{report.sea.swellM} m</td>
                          <td className="px-3 py-1">{report.sea.airTempC} C</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              Sea state and air temperature are modelled from position for the twin. Connecting a marine
              weather provider replaces these columns with forecast data for the same track.
            </p>
          </Panel>

          <div className="space-y-4">
            <Panel title="Cargo manifest">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatTile label="Total cargo" value={totalCargo} unit="t" hint={`${voyage.cargo.containers} containers on deck and in the hold.`} />
                <StatTile label="Fuel" value={voyage.cargo.fuelTonnes} unit="t" hint="Bulk diesel for generators, CHP units and vehicles." />
                <StatTile label="Food" value={voyage.cargo.foodTonnes} unit="t" hint="A full year of provisions for the station complement." />
                <StatTile label="Science" value={voyage.cargo.scienceTonnes} unit="t" hint="Instruments, sample consumables and laboratory stores." />
                <StatTile label="Construction" value={voyage.cargo.constructionTonnes} unit="t" hint="Spares, module panels, snow vehicles and plant." />
                <StatTile label="Passengers" value={voyage.cargo.passengers} hint="Expedition members embarking or relieving." />
              </div>
            </Panel>

            <Panel title="Vessel particulars">
              <dl className="grid gap-2 sm:grid-cols-2">
                {[
                  ["Vessel", VESSEL.name],
                  ["Class", VESSEL.class],
                  ["Length / beam / draft", `${VESSEL.lengthM} m / ${VESSEL.beamM} m / ${VESSEL.draftM} m`],
                  ["Deadweight", `${VESSEL.deadweightTonnes} t`],
                  ["Service / max speed", `${VESSEL.serviceSpeedKn} kn / ${VESSEL.maxSpeedKn} kn`],
                  ["Crew", `${VESSEL.crew}`],
                  ["Cranes", VESSEL.cranesTonnes],
                  ["Aviation", VESSEL.helideck],
                ].map(([label, value]) => (
                  <div key={label} className="rounded border border-border px-3 py-2">
                    <dt className="cc-label text-[9px]">{label}</dt>
                    <dd className="mt-0.5 text-[11px] leading-relaxed text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                Particulars are modelled for the twin at the scale of the vessel class the programme
                charters. Live automatic identification system data requires a keyed marine provider.
              </p>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
