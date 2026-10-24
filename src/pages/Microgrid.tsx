import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { PageHeading, Panel, PanelEmpty, PanelLoading, StatTile } from "@/components/panels";
import { formatTimeShort, stationFromParams } from "@/lib/station";
import { cn } from "@/lib/utils";
import { Cpu, Flame, Gauge, Zap } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Derated / offline classification for one generation source. */
function stateFor(outputKw: number, source: string) {
  if (source.startsWith("BATTERY")) {
    return outputKw > 12 ? "discharging" : outputKw > 4 ? "float" : "standby";
  }
  if (source.startsWith("SOLAR")) {
    return outputKw > 8 ? "generating" : "low irradiance";
  }
  if (outputKw >= 70) return "online";
  if (outputKw >= 40) return "derated";
  return "offline";
}

function stateClasses(state: string) {
  if (state === "online" || state === "generating" || state === "discharging")
    return "border-[#3EE07F]/50 text-[#3EE07F]";
  if (state === "derated" || state === "float")
    return "border-[#FFB020]/50 text-[#FFB020]";
  if (state === "offline") return "border-[#FF3B47]/50 text-[#FF3B47]";
  return "border-border text-muted-foreground";
}

/** Microgrid & CHP command: generation sources, load balance and thermal. */
export default function Microgrid() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);

  const stations = useQuery(api.telemetry.listStations, {});
  const snapshot = useQuery(api.ops.microgridSnapshot, { slug, limit: 90 });
  const readings = useQuery(api.telemetry.getLiveReadings, { slug });

  const station = stations?.find((s) => s.slug === slug);
  const isChp = slug === "bharati";

  const totals = useMemo(() => {
    const sources = snapshot?.sources ?? [];
    const electrical = sources.reduce((a, b) => a + b.outputKw, 0);
    const thermal = sources.reduce((a, b) => a + b.thermalKw, 0);
    const load = sources.length ? Math.max(...sources.map((s) => s.loadKw)) : 0;
    const soc = sources.find((s) => s.source.startsWith("BATTERY"))?.soc ?? 0;
    return {
      electrical: Math.round(electrical * 10) / 10,
      thermal: Math.round(thermal),
      load,
      soc,
      headroom: Math.round((electrical - load) * 10) / 10,
    };
  }, [snapshot]);

  const chartData = useMemo(
    () =>
      (snapshot?.history ?? []).map((point) => ({
        time: formatTimeShort(point.timestamp),
        load: point.loadKw,
        supply: point.outputKw,
        thermal: point.thermalKw,
      })),
    [snapshot],
  );

  const fuelLevel = readings?.find((r) => r.sensorId === "fuel.level_pct");
  const busFreq = readings?.find((r) => r.sensorId === "power.bus_frequency");
  const loopTemps = (readings ?? []).filter((r) => r.sensorId === "thermal.loop_temp");

  const advisories = useMemo(() => {
    const notes: Array<{ tone: string; text: string }> = [];
    if (totals.load > totals.electrical) {
      notes.push({
        tone: "text-[#FF3B47]",
        text: `Station load ${totals.load} kW exceeds online generation ${totals.electrical} kW. Start the next unit or shed non-essential load.`,
      });
    } else {
      notes.push({
        tone: "text-[#3EE07F]",
        text: `Load covered by online generation with ${totals.headroom} kW of headroom.`,
      });
    }
    if (fuelLevel && fuelLevel.status !== "nominal") {
      notes.push({
        tone: "text-[#FFB020]",
        text: `Fuel farm at ${fuelLevel.value.toFixed(1)}% - ${fuelLevel.status}. Plan a resupply before the next blackout window.`,
      });
    }
    if (busFreq && busFreq.status !== "nominal") {
      notes.push({
        tone: "text-[#FFB020]",
        text: `Bus frequency ${busFreq.value.toFixed(2)} Hz is outside the 49.5-50.5 Hz band. Check governor response on the duty unit.`,
      });
    }
    if (totals.soc < 60) {
      notes.push({
        tone: "text-[#FFB020]",
        text: `Storage state of charge at ${totals.soc}%. Hold the next blackout window with load shedding if it drops below 50%.`,
      });
    }
    return notes;
  }, [busFreq, fuelLevel, totals]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Microgrid & CHP Command"
          title={`${station?.name ?? "Station"} power plant`}
          description={
            isChp
              ? "Three combined heat and power units rated 100 kVA electrical and 150 kW thermal each, with battery storage and the fuel farm header."
              : "Four 62.5 kVA diesel generators with a battery storage unit, carrying station load and the heated water pipeline draw."
          }
        >
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Zap className="mr-1 size-3" />
            {snapshot?.online ? "PLANT ONLINE" : "AWAITING PLANT DATA"}
          </Badge>
        </PageHeading>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Electrical output"
            value={totals.electrical}
            unit="kW"
            hint="sum of online sources"
            tone="text-[#00E0C6]"
          />
          <StatTile
            label="Thermal recovery"
            value={totals.thermal}
            unit="kW"
            hint="hot water and space heating"
            tone="text-[#FFB020]"
          />
          <StatTile
            label="Station load"
            value={totals.load}
            unit="kW"
            hint="current demand"
          />
          <StatTile
            label="Storage state of charge"
            value={totals.soc}
            unit="%"
            hint="battery buffer for blackout windows"
            tone={totals.soc < 60 ? "text-[#FFB020]" : "text-[#3EE07F]"}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel
            title="Load versus supply"
            className="lg:col-span-2"
            action={
              <span className="cc-mono text-[10px] text-muted-foreground">
                rolling {chartData.length} samples
              </span>
            }
          >
            {snapshot === undefined ? (
              <PanelLoading height={260} />
            ) : chartData.length === 0 ? (
              <PanelEmpty message="Waiting for the first plant sample." height={260} />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="supplyFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00E0C6" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#00E0C6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFB020" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#FFB020" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
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
                      unit=" kW"
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
                    <Area
                      type="monotone"
                      dataKey="supply"
                      name="Supply kW"
                      stroke="#00E0C6"
                      strokeWidth={2}
                      fill="url(#supplyFill)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="load"
                      name="Load kW"
                      stroke="#FFB020"
                      strokeWidth={2}
                      fill="url(#loadFill)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel
            title="Plant advisories"
            action={<Flame className="size-4 text-[#FFB020]" />}
          >
            <div className="space-y-3">
              {advisories.map((note) => (
                <p key={note.text} className={cn("text-xs leading-relaxed", note.tone)}>
                  {note.text}
                </p>
              ))}
            </div>
          </Panel>
        </div>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Cpu className="size-4 text-primary" />
              Generation sources
            </span>
          }
          bodyClassName="p-0"
        >
          {snapshot === undefined ? (
            <PanelLoading height={220} />
          ) : snapshot.sources.length === 0 ? (
            <PanelEmpty message="No plant samples recorded yet." height={180} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="cc-label px-4 py-2">Source</th>
                    <th className="cc-label px-4 py-2">Electrical</th>
                    <th className="cc-label px-4 py-2">Thermal</th>
                    <th className="cc-label px-4 py-2">Storage</th>
                    <th className="cc-label px-4 py-2">State</th>
                    <th className="cc-label px-4 py-2">Sampled</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.sources.map((source) => {
                    const state = stateFor(source.outputKw, source.source);
                    return (
                      <tr key={source.source} className="border-b border-border/60">
                        <td className="cc-mono px-4 py-2 text-foreground">{source.source}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="cc-mono w-16 text-foreground">
                              {source.outputKw} kW
                            </span>
                            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                              <span
                                className="block h-full rounded-full bg-[#00E0C6]"
                                style={{ width: `${Math.min(100, (source.outputKw / 110) * 100)}%` }}
                              />
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="cc-mono w-16 text-foreground">
                              {source.thermalKw} kW
                            </span>
                            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                              <span
                                className="block h-full rounded-full bg-[#FFB020]"
                                style={{ width: `${Math.min(100, (source.thermalKw / 170) * 100)}%` }}
                              />
                            </span>
                          </div>
                        </td>
                        <td className="cc-mono px-4 py-2 text-muted-foreground">{source.soc}%</td>
                        <td className="px-4 py-2">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] uppercase", stateClasses(state))}
                          >
                            {state}
                          </Badge>
                        </td>
                        <td className="cc-mono px-4 py-2 text-muted-foreground">
                          {formatTimeShort(source.timestamp)} UTC
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {isChp && (
          <Panel
            title={
              <span className="flex items-center gap-2">
                <Gauge className="size-4 text-[#FFB020]" />
                Hot water loop recovery
              </span>
            }
          >
            {loopTemps.length === 0 ? (
              <PanelEmpty message="CHP loop sensors not reporting." height={140} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {loopTemps.map((loop) => (
                  <div key={loop.equipmentId} className="rounded border border-border bg-card p-3">
                    <div className="cc-label">{loop.equipmentId} loop</div>
                    <div className="cc-mono mt-1 text-2xl text-foreground">
                      {loop.value.toFixed(1)}
                      <span className="ml-1 text-sm text-muted-foreground">{loop.unit}</span>
                    </div>
                    <div className="cc-mono mt-1 text-[10px] text-muted-foreground">
                      warn above 85 C, critical above 95 C
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        <Panel title="Rated plant capacity">
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={
                  isChp
                    ? [
                        { name: "CHP-1", electrical: 100, thermal: 150 },
                        { name: "CHP-2", electrical: 100, thermal: 150 },
                        { name: "CHP-3", electrical: 100, thermal: 150 },
                      ]
                    : [
                        { name: "GEN-1", electrical: 62.5, thermal: 62.5 },
                        { name: "GEN-2", electrical: 62.5, thermal: 62.5 },
                        { name: "GEN-3", electrical: 62.5, thermal: 62.5 },
                        { name: "GEN-4", electrical: 62.5, thermal: 62.5 },
                      ]
                }
                margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke="#1A2533" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#6B7A8F", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  tickLine={false}
                  axisLine={{ stroke: "#1A2533" }}
                />
                <YAxis
                  tick={{ fill: "#6B7A8F", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  tickLine={false}
                  axisLine={{ stroke: "#1A2533" }}
                  width={52}
                  unit=" kW"
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
                  dataKey="electrical"
                  name="Rated electrical kVA"
                  stroke="#00E0C6"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="thermal"
                  name="Rated thermal kW"
                  stroke="#FFB020"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
