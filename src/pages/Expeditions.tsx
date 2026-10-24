import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { PageHeading, Panel, PanelEmpty, PanelLoading, StatTile } from "@/components/panels";
import { cn } from "@/lib/utils";
import { Compass, Flag, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATION_TONE: Record<string, string> = {
  maitri: "border-[#00E0C6]/50 text-[#00E0C6]",
  bharati: "border-[#4A9EFF]/50 text-[#4A9EFF]",
  "dakshin-gangotri": "border-[#FFB020]/50 text-[#FFB020]",
};

function stationLabel(slug: string) {
  if (slug === "maitri") return "Maitri";
  if (slug === "bharati") return "Bharati";
  return "Dakshin Gangotri";
}

/** Expedition Logs: every Indian Scientific Expedition to Antarctica. */
export default function Expeditions() {
  const expeditions = useQuery(api.records.listExpeditions, {});
  const [stationFilter, setStationFilter] = useState("all");

  const filtered = useMemo(() => {
    const rows = expeditions ?? [];
    return stationFilter === "all"
      ? rows
      : rows.filter((r) => r.stationSlug === stationFilter);
  }, [expeditions, stationFilter]);

  const totals = useMemo(() => {
    const rows = expeditions ?? [];
    const teamTotal = rows.reduce((a, b) => a + b.teamSize, 0);
    return {
      count: rows.length,
      teamTotal,
      average: rows.length ? Math.round(teamTotal / rows.length) : 0,
      latest: rows.length ? rows[rows.length - 1] : null,
      perStation: {
        maitri: rows.filter((r) => r.stationSlug === "maitri").length,
        bharati: rows.filter((r) => r.stationSlug === "bharati").length,
        "dakshin-gangotri": rows.filter((r) => r.stationSlug === "dakshin-gangotri").length,
      },
    };
  }, [expeditions]);

  const chart = useMemo(
    () =>
      filtered.map((row) => ({
        label: `ISEA-${row.number}`,
        teamSize: row.teamSize,
      })),
    [filtered],
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Expedition Logs"
          title="Indian Scientific Expedition to Antarctica"
          description="The full ISEA series from the first expedition in 1981-82 to the current season. Each record captures the station that hosted the season, the programme focus and the personnel strength deployed."
        >
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Flag className="mr-1 size-3" />
            {totals.count} seasons logged
          </Badge>
        </PageHeading>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Expeditions" value={totals.count} hint="ISEA-1 through the current season" />
          <StatTile
            label="Personnel deployed"
            value={totals.teamTotal.toLocaleString("en-IN")}
            hint="sum across all logged seasons"
            tone="text-[#00E0C6]"
          />
          <StatTile label="Average team" value={totals.average} hint="persons per season" />
          <StatTile
            label="Current season"
            value={totals.latest ? totals.latest.year : "--"}
            hint={totals.latest ? `ISEA-${totals.latest.number} at ${stationLabel(totals.latest.stationSlug)}` : ""}
            tone="text-[#4A9EFF]"
          />
        </div>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Team size history
            </span>
          }
          action={
            <div className="flex items-center gap-1">
              {[
                { id: "all", label: "All" },
                { id: "dakshin-gangotri", label: "Dakshin Gangotri" },
                { id: "maitri", label: "Maitri" },
                { id: "bharati", label: "Bharati" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStationFilter(option.id)}
                  className={cn(
                    "rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                    stationFilter === option.id
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        >
          {expeditions === undefined ? (
            <PanelLoading height={240} />
          ) : chart.length === 0 ? (
            <PanelEmpty message="No expeditions in this filter." height={200} />
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#1A2533" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#6B7A8F", fontSize: 9, fontFamily: "JetBrains Mono" }}
                    tickLine={false}
                    axisLine={{ stroke: "#1A2533" }}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fill: "#6B7A8F", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    tickLine={false}
                    axisLine={{ stroke: "#1A2533" }}
                    width={40}
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
                    formatter={(value: number) => [`${value} persons`, "team"]}
                  />
                  <Bar dataKey="teamSize" fill="#00E0C6" fillOpacity={0.75} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Expedition records">
          {expeditions === undefined ? (
            <PanelLoading height={300} />
          ) : filtered.length === 0 ? (
            <PanelEmpty message="No expedition records to show." height={200} />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filtered.map((row) => (
                <div
                  key={row._id}
                  className="rounded border border-border bg-card p-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Compass className="size-4 text-primary" />
                      <span className="font-display text-sm font-bold text-foreground">
                        ISEA-{row.number} - {row.year}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase",
                        STATION_TONE[row.stationSlug] ?? "border-border text-muted-foreground",
                      )}
                    >
                      {stationLabel(row.stationSlug)}
                    </Badge>
                  </div>
                  <div className="cc-mono mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                    <span>{row.teamSize} persons</span>
                    <span>{row.leaderRole}</span>
                    <span>focus: {row.focus}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.summary}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
