import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { PageHeading, Panel, PanelEmpty, PanelLoading, StatTile } from "@/components/panels";
import { formatAge, formatTimeShort, stationFromParams } from "@/lib/station";
import { cn } from "@/lib/utils";
import { Compass, Mountain, Satellite, Wind } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Colour ramp for the surface velocity field, slow to fast. */
function velocityColor(value: number, max: number) {
  const t = max === 0 ? 0 : Math.min(1, value / max);
  const hue = 190 - t * 190; // cyan through amber to red
  return `hsl(${hue} 85% ${28 + t * 18}%)`;
}

/** Local environment: ice velocity field, weather series and pass schedule. */
export default function Environment() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);

  const stations = useQuery(api.telemetry.listStations, {});
  const ice = useQuery(api.ops.iceVelocity, { slug });
  const weather = useQuery(api.ops.weatherHistory, { slug, limit: 90 });
  const passes = useQuery(api.ops.listPasses, { slug, limit: 8 });
  const readings = useQuery(api.telemetry.getLiveReadings, { slug });

  const station = stations?.find((s) => s.slug === slug);

  const series = useMemo(
    () =>
      (weather ?? []).map((point) => ({
        time: formatTimeShort(point.timestamp),
        temperature: point.temperature,
        wind: point.windSpeed,
        pressure: point.pressure,
      })),
    [weather],
  );

  const grid = useMemo(() => {
    const cells = ice?.cells ?? [];
    if (cells.length === 0) return [] as Array<Array<(typeof cells)[number]>>;
    const size = Math.max(...cells.map((c) => c.ix)) + 1;
    const rows: Array<Array<(typeof cells)[number]>> = [];
    for (let iy = 0; iy < size; iy += 1) {
      rows.push(cells.filter((c) => c.iy === iy).sort((a, b) => a.ix - b.ix));
    }
    return rows;
  }, [ice]);

  const latest = series.length ? series[series.length - 1] : null;
  const ambient = readings?.find((r) => r.sensorId === "env.temperature");
  const windChannel = readings?.find((r) => r.sensorId === "env.wind_speed");
  const nextPass = (passes ?? [])[0];

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Local Environment"
          title={`${station?.name ?? "Station"} ice, weather and downlink`}
          description={`Surface velocity field derived from the station position ${station ? `${Math.abs(station.latitude).toFixed(3)}S ${station.longitude.toFixed(3)}E` : ""}, automatic weather station series and the scheduled satellite pass plan.`}
        >
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Compass className="mr-1 size-3" />
            {station?.region ?? "Loading region"}
          </Badge>
        </PageHeading>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Max ice velocity"
            value={ice?.maxMperYear ?? "--"}
            unit="m/yr"
            hint="fastest cell in the survey grid"
            tone="text-[#FFB020]"
          />
          <StatTile
            label="Mean ice velocity"
            value={ice?.meanMperYear ?? "--"}
            unit="m/yr"
            hint="area average across the grid"
            tone="text-[#00E0C6]"
          />
          <StatTile
            label="Ambient temperature"
            value={ambient ? ambient.value.toFixed(1) : "--"}
            unit={ambient?.unit}
            hint="automatic weather station"
          />
          <StatTile
            label="Surface wind"
            value={windChannel ? windChannel.value.toFixed(1) : "--"}
            unit={windChannel?.unit}
            hint="katabatic episodes exceed 41 m/s"
            tone={windChannel && windChannel.status !== "nominal" ? "text-[#FFB020]" : undefined}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Mountain className="size-4 text-primary" />
                Surface ice velocity field
              </span>
            }
            className="lg:col-span-2"
            action={
              <span className="cc-mono text-[10px] text-muted-foreground">
                {(ice?.cells?.length ?? 0)} cells, 26 km span
              </span>
            }
          >
            {ice === undefined ? (
              <PanelLoading height={320} />
            ) : grid.length === 0 ? (
              <PanelEmpty message="Velocity field unavailable." height={320} />
            ) : (
              <div className="space-y-3">
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 7}, minmax(0, 1fr))` }}>
                  {grid.flatMap((row) =>
                    row.map((cell) => (
                      <div
                        key={`${cell.ix}-${cell.iy}`}
                        title={`${cell.xKm} km / ${cell.yKm} km - ${cell.mPerYear} m per year at ${cell.bearingDeg} degrees`}
                        className="flex aspect-square flex-col items-center justify-center rounded border border-border/70 text-[9px]"
                        style={{ background: velocityColor(cell.mPerYear, ice.maxMperYear) }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="size-3.5 text-foreground/80"
                          style={{ transform: `rotate(${cell.bearingDeg}deg)` }}
                        >
                          <polygon points="12,2 20,22 12,16 4,22" fill="currentColor" />
                        </svg>
                        <span className="cc-mono mt-0.5 text-foreground/90">
                          {Math.round(cell.mPerYear)}
                        </span>
                      </div>
                    )),
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>slow</span>
                  <span className="h-1.5 flex-1 mx-2 overflow-hidden rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, hsl(190 85% 28%), hsl(95 85% 34%), hsl(0 85% 46%))",
                    }}
                  />
                  <span>fast</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Arrows show flow bearing, colour and value show magnitude in metres per year.
                  The field combines the rotational glacier component with katabatic downhill
                  drift and the outlet channel close to the station apron.
                </p>
              </div>
            )}
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-2">
                <Wind className="size-4 text-primary" />
                Weather series
              </span>
            }
            className="lg:col-span-3"
            action={
              latest ? (
                <span className="cc-mono text-[10px] text-muted-foreground">
                  latest {latest.time} UTC
                </span>
              ) : undefined
            }
          >
            {weather === undefined ? (
              <PanelLoading height={320} />
            ) : series.length === 0 ? (
              <PanelEmpty message="Weather series not yet populated." height={320} />
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#1A2533" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#6B7A8F", fontSize: 10, fontFamily: "JetBrains Mono" }}
                      tickLine={false}
                      axisLine={{ stroke: "#1A2533" }}
                      minTickGap={40}
                    />
                    <YAxis
                      tick={{ fill: "#6B7A8F", fontSize: 10, fontFamily: "JetBrains Mono" }}
                      tickLine={false}
                      axisLine={{ stroke: "#1A2533" }}
                      width={52}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "#0A121E",
                        border: "1px solid #1A2533",
                        borderRadius: 8,
                        fontFamily: "JetBrains Mono",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#6B7A8F" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#6B7A8F" }} />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      name="Air temperature C"
                      stroke="#00E0C6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="wind"
                      name="Wind m/s"
                      stroke="#FFB020"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="pressure"
                      name="Pressure hPa"
                      stroke="#4A9EFF"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </div>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Satellite className="size-4 text-primary" />
              Satellite pass schedule
            </span>
          }
          action={
            nextPass ? (
              <span className="cc-mono text-[10px] text-muted-foreground">
                next pass in {formatDelay(nextPass.scheduledAt - Date.now())}
              </span>
            ) : undefined
          }
          bodyClassName="p-0"
        >
          {passes === undefined ? (
            <PanelLoading height={200} />
          ) : passes.length === 0 ? (
            <PanelEmpty message="No passes scheduled." height={160} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="cc-label px-4 py-2">Satellite</th>
                    <th className="cc-label px-4 py-2">Azimuth</th>
                    <th className="cc-label px-4 py-2">Elevation</th>
                    <th className="cc-label px-4 py-2">Window</th>
                    <th className="cc-label px-4 py-2">Link budget</th>
                    <th className="cc-label px-4 py-2">Starts in</th>
                  </tr>
                </thead>
                <tbody>
                  {passes.map((pass) => {
                    const seconds = Math.round((pass.scheduledAt - Date.now()) / 1000);
                    const label =
                      seconds <= 0
                        ? "in progress"
                        : seconds < 3600
                          ? `${Math.round(seconds / 60)} min`
                          : `${(seconds / 3600).toFixed(1)} h`;
                    return (
                      <tr key={pass._id} className="border-b border-border/60">
                        <td className="px-4 py-2 text-foreground">{pass.satelliteName}</td>
                        <td className="cc-mono px-4 py-2 text-muted-foreground">
                          {pass.azimuth} deg
                        </td>
                        <td className="cc-mono px-4 py-2 text-muted-foreground">
                          {pass.elevation} deg
                        </td>
                        <td className="cc-mono px-4 py-2 text-muted-foreground">
                          {Math.round(pass.durationSec / 60)} min
                        </td>
                        <td className="cc-mono px-4 py-2 text-foreground">{pass.linkBudget} dB</td>
                        <td
                          className={cn(
                            "cc-mono px-4 py-2",
                            seconds < 1800 ? "text-[#FFB020]" : "text-muted-foreground",
                          )}
                        >
                          {label}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

/** Human readable delay from now to a future timestamp. */
function formatDelay(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}
