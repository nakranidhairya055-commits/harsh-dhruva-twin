import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { PageHeading, Panel, PanelEmpty, PanelLoading, StatTile } from "@/components/panels";
import { formatTimeShort, stationFromParams } from "@/lib/station";
import { cn } from "@/lib/utils";
import { CloudSun, Droplets, Gauge, RefreshCw, ThermometerSun, Wind } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const COORDS: Record<string, { lat: number; lon: number; label: string }> = {
  maitri: { lat: -70.76, lon: 11.73, label: "Maitri" },
  bharati: { lat: -69.41, lon: 76.19, label: "Bharati" },
};

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  wind_speed_10m: number[];
  surface_pressure: number[];
  relative_humidity_2m: number[];
}

interface OpenMeteoResponse {
  hourly?: OpenMeteoHourly;
}

interface Sample {
  time: string;
  timestamp: number;
  temperature: number;
  wind: number;
  pressure: number;
  humidity: number;
}

type Source = "open-meteo" | "station";

/**
 * Weather extension.
 *
 * Pulls hourly forecast and reanalysis from Open-Meteo (no API key required)
 * for the station coordinates and charts the temperature, wind, pressure and
 * humidity series. If the public endpoint is unreachable the page falls back
 * to the station's own automatic weather station history so operators always
 * have a curve rather than an error state.
 */
export default function Weather() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);
  const coords = COORDS[slug];

  const [samples, setSamples] = useState<Sample[] | null>(null);
  const [source, setSource] = useState<Source>("open-meteo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const localWeather = useQuery(api.ops.weatherHistory, { slug, limit: 180 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
        "&hourly=temperature_2m,wind_speed_10m,surface_pressure,relative_humidity_2m" +
        "&past_days=2&forecast_days=7&timezone=UTC&wind_speed_unit=ms";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
      const json = (await res.json()) as OpenMeteoResponse;
      const hourly = json.hourly;
      if (!hourly || !hourly.time) throw new Error("Open-Meteo returned no hourly block");
      const rows: Sample[] = hourly.time.map((time, i) => ({
        time,
        timestamp: new Date(`${time}Z`).getTime(),
        temperature: hourly.temperature_2m?.[i] ?? 0,
        wind: hourly.wind_speed_10m?.[i] ?? 0,
        pressure: hourly.surface_pressure?.[i] ?? 0,
        humidity: hourly.relative_humidity_2m?.[i] ?? 0,
      }));
      setSamples(rows);
      setSource("open-meteo");
    } catch (err) {
      setError(String(err).slice(0, 160));
      setSource("station");
    } finally {
      setLoading(false);
    }
  }, [coords.lat, coords.lon]);

  useEffect(() => {
    void load();
  }, [load]);

  const fallback = useMemo<Sample[]>(
    () =>
      (localWeather ?? []).map((row) => ({
        time: new Date(row.timestamp).toISOString().slice(0, 16),
        timestamp: row.timestamp,
        temperature: row.temperature,
        wind: row.windSpeed,
        pressure: row.pressure,
        humidity: 0,
      })),
    [localWeather],
  );

  const data = source === "open-meteo" && samples ? samples : fallback;
  const now = Date.now();

  const last24h = useMemo(
    () => data.filter((s) => s.timestamp >= now - 24 * 3600 * 1000 && s.timestamp <= now + 3600 * 1000),
    [data, now],
  );
  const next7d = useMemo(
    () => data.filter((s) => s.timestamp >= now - 3600 * 1000),
    [data, now],
  );

  const tempSeries = useMemo(
    () =>
      last24h.map((s) => ({
        time: formatTimeShort(s.timestamp),
        temperature: s.temperature,
      })),
    [last24h],
  );
  const windSeries = useMemo(
    () =>
      last24h.map((s) => ({
        time: formatTimeShort(s.timestamp),
        wind: s.wind,
      })),
    [last24h],
  );
  const pressureSeries = useMemo(
    () =>
      next7d.map((s) => ({
        time: `${new Date(s.timestamp).toISOString().slice(5, 10)} ${formatTimeShort(s.timestamp)}`,
        pressure: s.pressure,
      })),
    [next7d],
  );

  const forecastStrip = useMemo(() => {
    const days = new Map<string, { date: string; min: number; max: number; wind: number; samples: number }>();
    for (const sample of next7d) {
      const date = new Date(sample.timestamp).toISOString().slice(0, 10);
      const entry = days.get(date) ?? { date, min: sample.temperature, max: sample.temperature, wind: 0, samples: 0 };
      entry.min = Math.min(entry.min, sample.temperature);
      entry.max = Math.max(entry.max, sample.temperature);
      entry.wind += sample.wind;
      entry.samples += 1;
      days.set(date, entry);
    }
    return [...days.values()]
      .slice(0, 7)
      .map((day) => ({
        ...day,
        wind: day.samples ? Math.round((day.wind / day.samples) * 10) / 10 : 0,
      }));
  }, [next7d]);

  const latest = next7d.length ? next7d[0] : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Weather Extension"
          title={`${coords.label} forecast and reanalysis`}
          description={`Hourly series pulled from Open-Meteo for ${Math.abs(coords.lat).toFixed(2)}S ${coords.lon.toFixed(2)}E. Temperature and wind cover the last 24 hours, surface pressure covers the full 7 day window, and the strip below summarises the forecast ahead.`}
        >
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase",
              source === "open-meteo"
                ? "border-[#3EE07F]/50 text-[#3EE07F]"
                : "border-[#FFB020]/50 text-[#FFB020]",
            )}
          >
            {source === "open-meteo" ? "Open-Meteo live" : "Station AWS fallback"}
          </Badge>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className={cn("size-3", loading && "animate-spin")} />
            Refresh
          </button>
        </PageHeading>

        {error && source === "station" && (
          <p className="cc-mono rounded border border-[#FFB020]/40 bg-[#FFB020]/5 px-3 py-2 text-[10px] leading-relaxed text-[#FFB020]">
            Open-Meteo unreachable from this browser session ({error}). Showing the station
            automatic weather station history instead.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Temperature"
            value={latest ? latest.temperature.toFixed(1) : "--"}
            unit="C"
            hint="Open-Meteo hourly"
            tone={(latest?.temperature ?? 0) < -20 ? "text-[#4A9EFF]" : "text-foreground"}
          />
          <StatTile
            label="Wind speed"
            value={latest ? latest.wind.toFixed(1) : "--"}
            unit="m/s"
            hint="katabatic blackout band above 41 m/s"
            tone={(latest?.wind ?? 0) > 25 ? "text-[#FFB020]" : "text-foreground"}
          />
          <StatTile
            label="Surface pressure"
            value={latest ? latest.pressure.toFixed(0) : "--"}
            unit="hPa"
            hint="reduced to station level"
          />
          <StatTile
            label="Relative humidity"
            value={latest ? latest.humidity.toFixed(0) : "--"}
            unit="%"
            hint="ice-shelf boundary layer"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title={
              <span className="flex items-center gap-2">
                <ThermometerSun className="size-4 text-[#00E0C6]" />
                Temperature trend - 24 hours
              </span>
            }
          >
            {loading && data.length === 0 ? (
              <PanelLoading height={240} />
            ) : tempSeries.length === 0 ? (
              <PanelEmpty message="No temperature samples available." height={240} />
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tempSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
                      width={48}
                      unit=" C"
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
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#00E0C6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-2">
                <Wind className="size-4 text-[#FFB020]" />
                Wind speed - 24 hours
              </span>
            }
          >
            {loading && data.length === 0 ? (
              <PanelLoading height={240} />
            ) : windSeries.length === 0 ? (
              <PanelEmpty message="No wind samples available." height={240} />
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={windSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
                      width={48}
                      unit=" m/s"
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
                    <Line
                      type="monotone"
                      dataKey="wind"
                      stroke="#FFB020"
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
              <Gauge className="size-4 text-[#A07CFF]" />
              Pressure trend - 7 days
            </span>
          }
          action={
            <span className="cc-mono text-[10px] text-muted-foreground">
              {pressureSeries.length} hourly samples
            </span>
          }
        >
          {loading && data.length === 0 ? (
            <PanelLoading height={260} />
          ) : pressureSeries.length === 0 ? (
            <PanelEmpty message="No pressure samples available." height={260} />
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pressureSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#1A2533" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#6B7A8F", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    tickLine={false}
                    axisLine={{ stroke: "#1A2533" }}
                    minTickGap={60}
                  />
                  <YAxis
                    domain={["dataMin - 4", "dataMax + 4"]}
                    tick={{ fill: "#6B7A8F", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    tickLine={false}
                    axisLine={{ stroke: "#1A2533" }}
                    width={54}
                    unit=" hPa"
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
                    dataKey="pressure"
                    name="Surface pressure hPa"
                    stroke="#A07CFF"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <CloudSun className="size-4 text-primary" />
              7 day forecast strip
            </span>
          }
        >
          {forecastStrip.length === 0 ? (
            <PanelEmpty message="Forecast strip not available." height={140} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {forecastStrip.map((day, index) => {
                const spread = day.max - day.min;
                return (
                  <div
                    key={day.date}
                    className={cn(
                      "rounded border bg-card p-3",
                      index === 0 ? "border-primary/50" : "border-border",
                    )}
                  >
                    <div className="cc-label">
                      {index === 0 ? "Today" : new Date(day.date).toISOString().slice(5, 10)}
                    </div>
                    <div className="cc-mono mt-1 text-lg text-foreground">
                      {day.max.toFixed(1)} C
                    </div>
                    <div className="cc-mono text-[10px] text-[#4A9EFF]">
                      min {day.min.toFixed(1)} C
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Droplets className="size-3" />
                      range {spread.toFixed(1)} C
                    </div>
                    <div className="cc-mono mt-1 text-[10px] text-[#FFB020]">
                      wind {day.wind} m/s
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
