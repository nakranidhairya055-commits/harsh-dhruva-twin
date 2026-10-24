import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatAge,
  severityClasses,
  stationFromParams,
  INSTRUMENTED_STATIONS,
  SUBSYSTEM_LABELS,
} from "@/lib/station";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";

/** Severity filter tabs shown above the incident list. */
const SEVERITY_TABS = ["all", "critical", "warning", "watch"] as const;
type SeverityTab = (typeof SEVERITY_TABS)[number];

/** DhruvaTwin v1 alert triage and incident queue. */
export default function Alerts() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);

  const openAlerts = useQuery(api.telemetry.listAlerts, { openOnly: true, limit: 200 });
  const resolvedAlerts = useQuery(api.telemetry.listAlerts, { openOnly: false, limit: 200 });
  const acknowledgeAlert = useMutation(api.telemetry.acknowledgeAlert);
  const resolveAlert = useMutation(api.telemetry.resolveAlert);

  const [tab, setTab] = useState<SeverityTab>("all");
  const [view, setView] = useState<"open" | "resolved">("open");
  const [subsystemFilter, setSubsystemFilter] = useState<string | null>(null);

  const base = view === "open" ? openAlerts : resolvedAlerts;

  const counts = useMemo(() => {
    const list = openAlerts ?? [];
    return {
      critical: list.filter((a) => a.severity === "critical").length,
      warning: list.filter((a) => a.severity === "warning").length,
      watch: list.filter((a) => a.severity === "watch").length,
      total: list.length,
    };
  }, [openAlerts]);

  const filtered = useMemo(() => {
    let list = base ?? [];
    if (tab !== "all") list = list.filter((a) => a.severity === tab);
    list = list.filter((a) => a.stationSlug === slug);
    if (subsystemFilter) list = list.filter((a) => a.subsystem === subsystemFilter);
    return list;
  }, [base, subsystemFilter, tab, slug]);

  /**
   * Incident matrix: open incidents broken out by subsystem against severity
   * so a duty operator can see at a glance where the station is degrading.
   */
  const matrix = useMemo(() => {
    const subsystems = ["power", "thermal", "life_support", "environment", "comms", "safety"];
    const severities: Array<"critical" | "warning" | "watch"> = ["critical", "warning", "watch"];
    const rows = subsystems.map((subsystem) => ({
      subsystem,
      cells: severities.map((severity) => ({
        severity,
        count: (openAlerts ?? []).filter(
          (a) => a.stationSlug === slug && a.subsystem === subsystem && a.severity === severity,
        ).length,
      })),
    }));
    const totals = severities.map((severity) => ({
      severity,
      count: (openAlerts ?? []).filter(
        (a) => a.stationSlug === slug && a.severity === severity,
      ).length,
    }));
    return { rows, severities, totals };
  }, [openAlerts, slug]);

  const incidentId = (alert: { stationSlug: string; equipmentId: string; sensorId?: string }) =>
    `INC-${alert.stationSlug.slice(0, 3).toUpperCase()}-${alert.equipmentId}-${(alert.sensorId ?? "gen").split(".").pop()?.toUpperCase()}`;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="cc-label">Alert Triage</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Incident Queue</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Threshold alerts from the station sensor grid. Acknowledge to claim an incident, resolve to close it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#FF3B47]/40 text-[#FF3B47]">
              {counts.critical} critical
            </Badge>
            <Badge variant="outline" className="border-[#FFB020]/40 text-[#FFB020]">
              {counts.warning} warning
            </Badge>
            <Badge variant="outline" className="border-[#4A9EFF]/40 text-[#4A9EFF]">
              {counts.watch} watch
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            {(["open", "resolved"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                  view === v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
        ))}
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            {SEVERITY_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                  tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <span className="cc-mono ml-auto text-xs text-muted-foreground">
            {INSTRUMENTED_STATIONS.find((s) => s.slug === slug)?.name} view - station switcher in the top bar
          </span>
        </div>

        <Card className="cc-panel border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
              Incident Matrix
            </CardTitle>
            <div className="flex items-center gap-2">
              {subsystemFilter && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] text-muted-foreground"
                  onClick={() => setSubsystemFilter(null)}
                >
                  Clear subsystem filter
                </Button>
              )}
              <span className="cc-mono text-[11px] text-muted-foreground">
                subnet view - {slug}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="cc-label px-3 py-2">Subsystem</th>
                    {matrix.severities.map((severity) => (
                      <th key={severity} className="cc-label px-3 py-2">
                        {severity}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.rows.map((row) => (
                    <tr key={row.subsystem} className="border-b border-border/60">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSubsystemFilter((current) =>
                              current === row.subsystem ? null : row.subsystem,
                            )
                          }
                          className={cn(
                            "text-xs transition-colors hover:text-primary",
                            subsystemFilter === row.subsystem
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {SUBSYSTEM_LABELS[row.subsystem] ?? row.subsystem}
                        </button>
                      </td>
                      {row.cells.map((cell) => {
                        const cls = severityClasses(cell.severity);
                        return (
                          <td key={cell.severity} className="px-3 py-2">
                            <span
                              className={cn(
                                "cc-mono inline-flex size-7 items-center justify-center rounded border text-[11px]",
                                cell.count > 0
                                  ? cn(cls.border, cls.bg, cls.text)
                                  : "border-border text-muted-foreground",
                              )}
                            >
                              {cell.count}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="cc-label px-3 py-2">Total</td>
                    {matrix.totals.map((total) => {
                      const cls = severityClasses(total.severity);
                      return (
                        <td key={total.severity} className={cn("cc-mono px-3 py-2 text-sm", cls.text)}>
                          {total.count}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="cc-panel border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
              {view === "open" ? "Open Incidents" : "Resolved Incidents"}
            </CardTitle>
            <span className="cc-mono text-xs text-muted-foreground">{filtered.length} shown</span>
          </CardHeader>
          <CardContent>
            {(openAlerts === undefined || resolvedAlerts === undefined) ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                <CheckCircle2 className="size-6 text-[#3EE07F]" />
                <p className="text-sm text-muted-foreground">
                  {view === "open"
                    ? "No incidents match this filter. The station is quiet."
                    : "No resolved incidents yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((a) => {
                  const sev = severityClasses(a.severity);
                  return (
                    <div
                      key={a._id}
                      className={cn(
                        "rounded-md border p-4",
                        a.resolved ? "border-border bg-card opacity-70" : cn(sev.border, sev.bg),
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("cc-label", sev.text)}>{a.severity}</span>
                        <span className="cc-mono text-[10px] text-muted-foreground">
                          {incidentId(a)}
                        </span>
                        <span className="cc-mono text-[10px] text-muted-foreground">{a.stationName}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {SUBSYSTEM_LABELS[a.subsystem] ?? a.subsystem}
                        </Badge>
                        <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
                          {a.equipmentId}
                          {a.sensorId ? ` - ${a.sensorId}` : ""}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">{a.message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          disabled={a.acknowledged}
                          onClick={() => void acknowledgeAlert({ alertId: a._id as never })}
                        >
                          {a.acknowledged ? "Acknowledged" : "Acknowledge"}
                        </Button>
                        {!a.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => void resolveAlert({ alertId: a._id as never })}
                          >
                            Resolve
                          </Button>
                        )}
                        <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
                          raised {formatAge(a.createdAt)}
                          {a.acknowledgedAt ? ` - ack ${formatAge(a.acknowledgedAt)}` : ""}
                          {a.resolvedAt ? ` - resolved ${formatAge(a.resolvedAt)}` : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="cc-panel border-border shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
              How triage works
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm leading-relaxed text-muted-foreground sm:grid-cols-3">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#FF3B47]" />
              <p>
                The simulation evaluates every reading against per-sensor threshold bands each tick. Critical breaches page the station, warnings queue for review, ambient watches log for context.
              </p>
            </div>
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#FFB020]" />
              <p>
                One open incident per sensor at a time. New breaches of the same sensor do not duplicate the queue while the first incident is being worked.
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#3EE07F]" />
              <p>
                Acknowledging claims the incident under your operator ID. Resolving closes it; if the sensor breaches again a fresh incident is raised.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
