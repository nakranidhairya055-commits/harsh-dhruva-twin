import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatAge,
  formatTimeShort,
  severityClasses,
  statusClasses,
  stationFromParams,
  SUBSYSTEM_LABELS,
  type StationSlug,
} from "@/lib/station";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Loader2,
  Radio,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";

/** One KPI tile on the dashboard header row. */
function KpiCard({
  label,
  value,
  unit,
  hint,
  tone = "text-foreground",
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: string;
  icon: typeof Gauge;
}) {
  return (
    <Card className="cc-panel border-border shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <span className="cc-label">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn("cc-mono text-2xl leading-none", tone)}>
          {value}
          {unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
        </div>
        {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Status chip for a sensor reading. */
function StatusChip({ status }: { status: string }) {
  const cls = statusClasses(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        cls.text,
        cls.bg,
        cls.border,
      )}
    >
      <span className={cn("size-1.5 rounded-full", cls.dot)} />
      {status}
    </span>
  );
}

/** Live recharts line for one sensor with threshold bands. Shared with the equipment detail page. */
export function LiveChart({
  slug,
  equipmentId,
  sensorId,
  thresholds,
  unit,
  status,
  height = 280,
  predicted = true,
}: {
  slug: StationSlug;
  equipmentId: string;
  sensorId: string;
  thresholds: { warnLow?: number; critLow?: number; warnHigh?: number; critHigh?: number };
  unit: string;
  status: string;
  height?: number;
  /**
   * Overlay the AI continuity forecast: a dotted orange projection of the
   * channel computed from the trailing trend. During a predicted or active
   * satellite blackout the measured line stops and the forecast carries on.
   * Enabled on every telemetry chart by default.
   */
  predicted?: boolean;
}) {
  const history = useQuery(api.telemetry.getSensorHistory, {
    slug,
    equipmentId,
    sensorId,
    limit: 60,
  });

  if (history === undefined) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (history.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        Waiting for first readings from the simulation.
      </div>
    );
  }

  const data: Array<{ time: string; value: number | null; predicted: number | null }> =
    history.map((h) => ({
      time: formatTimeShort(h.timestamp),
      value: h.value,
      predicted: null,
    }));

  if (predicted && history.length >= 4) {
    // Least-squares extrapolation over the trailing window, anchored on the
    // newest real sample so the forecast continues the measured line.
    const tail = history.slice(-12);
    const meanX = (tail.length - 1) / 2;
    const meanY = tail.reduce((a, b) => a + b.value, 0) / tail.length;
    let num = 0;
    let den = 0;
    tail.forEach((point, i) => {
      num += (i - meanX) * (point.value - meanY);
      den += (i - meanX) ** 2;
    });
    const slope = den === 0 ? 0 : num / den;
    const last = history[history.length - 1];
    data[data.length - 1].predicted = last.value;
    const stepMs =
      history.length > 1
        ? last.timestamp - history[history.length - 2].timestamp
        : 10_000;
    for (let k = 1; k <= 12; k += 1) {
      data.push({
        time: formatTimeShort(last.timestamp + k * stepMs),
        value: null,
        predicted: Math.round((last.value + slope * k) * 1000) / 1000,
      });
    }
  }

  const values = data
    .flatMap((d) => [d.value, d.predicted])
    .filter((v): v is number => typeof v === "number");
  const lo = Math.min(...values, ...(thresholds.critLow !== undefined ? [thresholds.critLow] : []), ...(thresholds.warnLow !== undefined ? [thresholds.warnLow] : []));
  const hi = Math.max(...values, ...(thresholds.critHigh !== undefined ? [thresholds.critHigh] : []), ...(thresholds.warnHigh !== undefined ? [thresholds.warnHigh] : []));
  const pad = Math.max((hi - lo) * 0.15, 0.5);
  const stroke = status === "critical" ? "#FF3B47" : status === "warning" ? "#FFB020" : "#00E0C6";

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#1A2533" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "#6B7A8F", fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={{ stroke: "#1A2533" }}
            minTickGap={40}
          />
          <YAxis
            domain={[lo - pad, hi + pad]}
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
            formatter={(value: number) => [`${value} ${unit}`, "value"]}
          />
          {thresholds.warnLow !== undefined && (
            <ReferenceArea
              y1={lo - pad}
              y2={thresholds.warnLow}
              fill="#FFB020"
              fillOpacity={0.07}
              stroke="#FFB020"
              strokeOpacity={0.35}
              strokeDasharray="4 4"
            />
          )}
          {thresholds.warnHigh !== undefined && (
            <ReferenceArea
              y1={thresholds.warnHigh}
              y2={hi + pad}
              fill="#FFB020"
              fillOpacity={0.07}
              stroke="#FFB020"
              strokeOpacity={0.35}
              strokeDasharray="4 4"
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
          {predicted && (
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#FFB020"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Default sensor featured on the dashboard chart. */
const DEFAULT_FEATURED: Record<StationSlug, { equipmentId: string; sensorId: string }> = {
  maitri: { equipmentId: "PIPE-MAITRI", sensorId: "thermal.pipeline_temp" },
  bharati: { equipmentId: "CHP-1", sensorId: "power.output_kw" },
};

/** DhruvaTwin v1 sensor dashboard: live station telemetry and alert feed. */
export default function Dashboard() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);
  const navigate = useNavigate();

  const stations = useQuery(api.telemetry.listStations, {});
  const readings = useQuery(api.telemetry.getLiveReadings, { slug });
  const openAlerts = useQuery(api.telemetry.listAlerts, { openOnly: true, limit: 8 });
  const ensureSeeded = useAction(api.bootstrap.ensureSeeded);
  const resolveAlert = useMutation(api.telemetry.resolveAlert);
  const acknowledgeAlert = useMutation(api.telemetry.acknowledgeAlert);

  const [seedState, setSeedState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [featured, setFeatured] = useState(DEFAULT_FEATURED[slug]);

  useEffect(() => {
    setFeatured(DEFAULT_FEATURED[slug]);
  }, [slug]);

  useEffect(() => {
    if (seedState !== "idle") return;
    if (stations === undefined) return;
    if (stations.length === 0) {
      setSeedState("running");
      ensureSeeded()
        .then(() => setSeedState("done"))
        .catch(() => setSeedState("error"));
    } else {
      setSeedState("done");
    }
  }, [stations, seedState, ensureSeeded]);

  const kpis = useMemo(() => {
    const list = readings ?? [];
    const critical = list.filter((r) => r.status === "critical").length;
    const warning = list.filter((r) => r.status === "warning" || r.status === "watch").length;
    const nominal = list.filter((r) => r.status === "nominal").length;
    const ambient = list.find((r) => r.sensorId === "env.temperature");
    return { critical, warning, nominal, ambient };
  }, [readings]);

  const stationMeta = stations?.find((s) => s.slug === slug);

  const lastTick = useMemo(
    () => (readings && readings.length > 0 ? Math.max(...readings.map((r) => r.timestamp)) : 0),
    [readings],
  );

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header row */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="cc-label">Sensor Dashboard</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {stationMeta ? stationMeta.name : "Station"} Live Telemetry
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {stationMeta
                ? `${stationMeta.region} - ${stationMeta.latitude.toFixed(2)}S ${stationMeta.longitude.toFixed(2)}E, est. ${stationMeta.builtYear}`
                : "Loading station metadata..."}
            </p>
        </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#3EE07F]/40 text-[#3EE07F]">
              <span className="cc-dot bg-[#3EE07F] text-[#3EE07F]" />
              Simulation Feed
            </Badge>
            <span className="cc-mono text-xs text-muted-foreground">
              {lastTick > 0 ? `last tick ${formatAge(lastTick)}` : "awaiting tick"}
            </span>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Critical Sensors"
            value={String(kpis.critical)}
            hint="threshold breaches (critical band)"
            tone="text-[#FF3B47]"
            icon={ShieldAlert}
          />
          <KpiCard
            label="Warnings + Watches"
            value={String(kpis.warning)}
            hint="outside nominal band, not critical"
            tone="text-[#FFB020]"
            icon={AlertTriangle}
          />
          <KpiCard
            label="Nominal Sensors"
            value={String(kpis.nominal)}
            hint="inside all threshold bands"
            tone="text-[#3EE07F]"
            icon={CheckCircle2}
          />
          <KpiCard
            label="Ambient Temperature"
            value={kpis.ambient ? kpis.ambient.value.toFixed(1) : "--"}
            unit={kpis.ambient ? kpis.ambient.unit : undefined}
            hint="automatic weather station"
            icon={Gauge}
          />
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Featured chart */}
          <Card className="cc-panel border-border shadow-none lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
                  Featured Sensor
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {featured.equipmentId} - {featured.sensorId} - rolling 30 minute window
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFeatured({
                      equipmentId: "GEN-1",
                      sensorId: "power.output_kw",
                    })
                  }
                  className={cn(
                    "cc-mono h-8 text-[11px]",
                    featured.equipmentId === "GEN-1" && "border-primary/50 text-primary",
                  )}
                >
                  GEN-1
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFeatured({
                      equipmentId: slug === "maitri" ? "PIPE-MAITRI" : "CHP-1",
                      sensorId: slug === "maitri" ? "thermal.pipeline_temp" : "power.output_kw",
                    })
                  }
                  className={cn(
                    "cc-mono h-8 text-[11px]",
                    featured.equipmentId !== "GEN-1" && "border-primary/50 text-primary",
                  )}
                >
                  {slug === "maitri" ? "PIPELINE" : "CHP-1"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <LiveChart
                slug={slug}
                equipmentId={featured.equipmentId}
                sensorId={featured.sensorId}
                thresholds={
                  readings?.find(
                    (r) =>
                      r.equipmentId === featured.equipmentId &&
                      r.sensorId === featured.sensorId,
                  )?.thresholds ?? {}
                }
                unit={
                  readings?.find(
                    (r) =>
                      r.equipmentId === featured.equipmentId &&
                      r.sensorId === featured.sensorId,
                  )?.unit ?? ""
                }
                status={
                  readings?.find(
                    (r) =>
                      r.equipmentId === featured.equipmentId &&
                      r.sensorId === featured.sensorId,
                  )?.status ?? "nominal"
                }
                predicted
              />
            </CardContent>
          </Card>

          {/* Alert feed */}
          <Card className="cc-panel border-border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
                Live Alert Feed
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => navigate("/alerts")}
              >
                Triage
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {openAlerts === undefined ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : openAlerts.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                  <CheckCircle2 className="size-6 text-[#3EE07F]" />
                  <p className="text-sm text-muted-foreground">No open alerts. All sensors nominal.</p>
                </div>
              ) : (
                openAlerts.map((a) => {
                  const sev = severityClasses(a.severity);
                  return (
                    <div
                      key={a._id}
                      className={cn("rounded-md border p-3", sev.border, sev.bg)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("cc-label", sev.text)}>{a.severity}</span>
                        <span className="cc-mono text-[10px] text-muted-foreground">
                          {formatAge(a.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground">{a.message}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          disabled={a.acknowledged}
                          onClick={() => void acknowledgeAlert({ alertId: a._id as never })}
                        >
                          {a.acknowledged ? "ACK" : "Acknowledge"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => void resolveAlert({ alertId: a._id as never })}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sensor grid */}
        <Card className="cc-panel border-border shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
              Sensor Grid - {readings ? readings.length : 0} channels live
            </CardTitle>
          </CardHeader>
          <CardContent>
            {readings === undefined ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : readings.length === 0 ? (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Radio className="size-4" />
                Booting sensor simulation, first tick in a few seconds.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {readings.map((r) => {
                  const cls = statusClasses(r.status);
                  return (
                    <div
                      key={`${r.equipmentId}|${r.sensorId}`}
                      className={cn(
                        "rounded-md border bg-card p-3 transition-colors hover:border-ring/60",
                        cls.border,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{r.parameter}</div>
                          <div className="cc-mono text-[10px] text-muted-foreground">
                            {r.equipmentId} - {SUBSYSTEM_LABELS[r.subsystem] ?? r.subsystem}
                          </div>
                        </div>
                        <StatusChip status={r.status} />
                      </div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className={cn("cc-mono text-xl", cls.text)}>
                          {r.value.toFixed(r.decimals)}
                        </span>
                        <span className="text-xs text-muted-foreground">{r.unit}</span>
                      </div>
                      <div className="cc-mono mt-1 text-[10px] text-muted-foreground">
                        {r.timestamp > 0 ? formatAge(r.timestamp) : "no data"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
