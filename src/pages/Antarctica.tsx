import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { PageHeading, Panel, PanelEmpty, PanelLoading, StatTile } from "@/components/panels";
import { stationFromParams } from "@/lib/station";
import { cn } from "@/lib/utils";
import { Activity, MapPin, Snowflake } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

/**
 * Schematic sector map projection. The Indian Antarctic programme operates in
 * the 0 to 110 degree East sector, so the map is cropped to that band and
 * drawn equirectangular with a note that it is a schematic, not a survey
 * projection.
 */
const LON_MIN = 0;
const LON_MAX = 110;
const LAT_TOP = -55;
const LAT_BOTTOM = -85;

function project(longitude: number, latitude: number) {
  const x = ((longitude - LON_MIN) / (LON_MAX - LON_MIN)) * 1000;
  const y = ((LAT_TOP - latitude) / (LAT_TOP - LAT_BOTTOM)) * 620;
  return { x, y };
}

/** Approximate coastline of the sector used for the schematic landmass. */
const COAST: Array<[number, number]> = [
  [0, -69],
  [12, -70],
  [24, -69.5],
  [36, -68.5],
  [48, -67.5],
  [60, -67],
  [72, -66.5],
  [84, -66],
  [96, -65.5],
  [110, -66],
];

const STATUS_TONE: Record<string, string> = {
  operational: "border-[#3EE07F]/50 text-[#3EE07F]",
  seasonal: "border-[#4A9EFF]/50 text-[#4A9EFF]",
  buried: "border-[#FFB020]/50 text-[#FFB020]",
  planned: "border-[#6B7A8F]/50 text-[#6B7A8F]",
};

/** Antarctica overview: all four Indian station sites on one picture. */
export default function Antarctica() {
  const [params, setParams] = useSearchParams();
  const activeSlug = stationFromParams(params);

  const stations = useQuery(api.telemetry.listStations, {});
  const maitriReadings = useQuery(api.telemetry.getLiveReadings, { slug: "maitri" });
  const bharatiReadings = useQuery(api.telemetry.getLiveReadings, { slug: "bharati" });

  const linked = useMemo(() => {
    const points = (stations ?? []).map((station) => ({
      station,
      ...project(station.longitude, station.latitude),
    }));
    return points;
  }, [stations]);

  const distanceKm = useMemo(() => {
    const a = (stations ?? []).find((s) => s.slug === "maitri");
    const b = (stations ?? []).find((s) => s.slug === "bharati");
    if (!a || !b) return 3098;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }, [stations]);

  const coastPath = useMemo(() => {
    const points = COAST.map(([lon, lat]) => project(lon, lat));
    const top = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    return `${top} L 1000 620 L 0 620 Z`;
  }, []);

  const stationChannels: Record<string, number> = {
    maitri: maitriReadings?.length ?? 0,
    bharati: bharatiReadings?.length ?? 0,
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Antarctica Overview"
          title="Indian Antarctic station network"
          description={`Four Indian sites in the 0 to 110 degree East sector. Maitri and Bharati are instrumented and streaming; Dakshin Gangotri is buried in the ice shelf and Maitri-II is the planned replacement station. Maitri to Bharati separation is ${distanceKm.toLocaleString("en-IN")} km.`}
        >
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Snowflake className="mr-1 size-3" />
            NCPOR / MoES network
          </Badge>
        </PageHeading>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Sites in network" value={stations?.length ?? 0} hint="seeded station records" />
          <StatTile
            label="Instrumented"
            value={Object.values(stationChannels).filter((n) => n > 0).length}
            hint="streaming telemetry channels"
            tone="text-[#3EE07F]"
          />
          <StatTile
            label="Live channels"
            value={Object.values(stationChannels).reduce((a, b) => a + b, 0)}
            hint="Maitri plus Bharati"
            tone="text-[#00E0C6]"
          />
          <StatTile
            label="Maitri to Bharati"
            value={distanceKm.toLocaleString("en-IN")}
            unit="km"
            hint="great-circle separation"
            tone="text-[#4A9EFF]"
          />
        </div>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              Sector map
            </span>
          }
          action={
            <span className="cc-mono text-[10px] text-muted-foreground">
              schematic equirectangular, 0-110 E sector
            </span>
          }
        >
          {stations === undefined ? (
            <PanelLoading height={420} />
          ) : (
            <div className="overflow-hidden rounded border border-border bg-[#050A12]">
              <svg viewBox="0 0 1000 620" className="h-[420px] w-full">
                <defs>
                  <linearGradient id="ice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#12202E" />
                    <stop offset="100%" stopColor="#0A1622" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="1000" height="620" fill="#050A12" />
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <line
                    key={`lon${i}`}
                    x1={(i / 10) * 1000}
                    y1="0"
                    x2={(i / 10) * 1000}
                    y2="620"
                    stroke="#101B2A"
                    strokeWidth="1"
                  />
                ))}
                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={`lat${i}`}
                    x1="0"
                    y1={(i / 4) * 620}
                    x2="1000"
                    y2={(i / 4) * 620}
                    stroke="#101B2A"
                    strokeWidth="1"
                  />
                ))}
                <path d={coastPath} fill="url(#ice)" stroke="#2A3D50" strokeWidth="1.5" />

                {/* Maitri to Bharati link */}
                {linked.length >= 2 && (() => {
                  const m = linked.find((p) => p.station.slug === "maitri");
                  const b = linked.find((p) => p.station.slug === "bharati");
                  if (!m || !b) return null;
                  return (
                    <>
                      <line
                        x1={m.x}
                        y1={m.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="#4A9EFF"
                        strokeWidth="1.5"
                        strokeDasharray="6 6"
                      />
                      <text
                        x={(m.x + b.x) / 2}
                        y={(m.y + b.y) / 2 - 10}
                        fill="#4A9EFF"
                        fontSize="14"
                        fontFamily="JetBrains Mono"
                        textAnchor="middle"
                      >
                        {distanceKm.toLocaleString("en-IN")} KM
                      </text>
                    </>
                  );
                })()}

                {linked.map(({ station, x, y }) => {
                  const instrumented = (stationChannels[station.slug] ?? 0) > 0;
                  const isActive = station.slug === activeSlug;
                  return (
                    <g key={station._id}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isActive ? 13 : 9}
                        fill={instrumented ? "#00E0C6" : "#6B7A8F"}
                        stroke={isActive ? "#E8EEF4" : "transparent"}
                        strokeWidth="2"
                      />
                      <text
                        x={x + 18}
                        y={y + 4}
                        fill="#E8EEF4"
                        fontSize="15"
                        fontFamily="Montserrat"
                        fontWeight="700"
                      >
                        {station.name.toUpperCase()}
                      </text>
                      <text
                        x={x + 18}
                        y={y + 22}
                        fill="#6B7A8F"
                        fontSize="12"
                        fontFamily="JetBrains Mono"
                      >
                        {Math.abs(station.latitude).toFixed(3)}S {station.longitude.toFixed(3)}E
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {(stations ?? []).map((station) => {
            const instrumented = (stationChannels[station.slug] ?? 0) > 0;
            return (
              <Panel
                key={station._id}
                title={station.name}
                action={
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] uppercase", STATUS_TONE[station.status] ?? "")}
                  >
                    {station.status}
                  </Badge>
                }
              >
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Coordinates</span>
                    <span className="cc-mono text-foreground">
                      {Math.abs(station.latitude).toFixed(4)}S {station.longitude.toFixed(4)}E
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Established</span>
                    <span className="cc-mono text-foreground">{station.builtYear ?? "--"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="cc-mono text-foreground">
                      {station.capacity ? `${station.capacity} persons` : "unmanned"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Telemetry</span>
                    <span className="cc-mono text-foreground">
                      {instrumented ? `${stationChannels[station.slug]} channels` : "not instrumented"}
                    </span>
                  </div>
                  <p className="leading-relaxed text-muted-foreground">{station.region}</p>
                  {instrumented ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() =>
                        setParams(
                          (prev) => {
                            const next = new URLSearchParams(prev);
                            next.set("station", station.slug);
                            return next;
                          },
                          { replace: true },
                        )
                      }
                    >
                      <Activity className="mr-1.5 size-3.5" />
                      Focus this station
                    </Button>
                  ) : (
                    <p className="cc-mono text-[10px] text-muted-foreground">
                      No instrumented channels at this site.
                    </p>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>

        {stations !== undefined && stations.length === 0 && (
          <PanelEmpty message="Station catalog is empty." />
        )}
      </div>
    </AppShell>
  );
}
