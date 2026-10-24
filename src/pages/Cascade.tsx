import { useMutation, useQuery } from "convex/react";
import { award } from "@/lib/achievements";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { PageHeading, Panel, PanelEmpty, PanelLoading, StatTile } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cascadeGraph,
  simulateCascade,
  type CascadeNode,
  type CascadeSeverity,
} from "@/convex/cascadeGraph";
import { formatUtc, severityClasses, stationFromParams, SUBSYSTEM_LABELS } from "@/lib/station";
import { cn } from "@/lib/utils";
import { GitBranchPlus, Play, ShieldAlert, Timer, Zap } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

const SEVERITIES: Array<{ id: CascadeSeverity; label: string; hint: string }> = [
  { id: "critical", label: "Critical", hint: "Full consequence propagates downstream." },
  { id: "warning", label: "Warning", hint: "Degraded trigger, about sixty percent carries." },
  { id: "watch", label: "Watch", hint: "Early indication, only a third of consequence moves." },
];

/** Tier labels used for the graph columns and the drill card groups. */
const TIER_LABELS = ["Utilities", "Prime movers", "Distribution", "Critical loads", "Crew loads"];

function minuteLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Box geometry, shared by the layout, the swimlanes and the flow arrows. */
const BOX_W = 184;
const BOX_H = 52;
/** Half the width of a tier swimlane, so lanes never touch. */
const LANE_HALF = 105;
/** Where the first tier column sits. */
const FIRST_COLUMN_X = 130;
const COLUMN_STEP = 210;

/**
 * Deterministic flowchart layout: tiers become swimlanes, order within a tier
 * becomes rows. Every coordinate the flowchart draws comes from here, so the
 * lanes, the boxes and the arrows can never drift apart.
 */
function layout(nodes: CascadeNode[]) {
  const tiers = [...new Set(nodes.map((node) => node.tier))].sort((a, b) => a - b);
  const columnX = (tier: number) => FIRST_COLUMN_X + tier * COLUMN_STEP;
  const maxRows = Math.max(
    ...tiers.map((tier) => nodes.filter((node) => node.tier === tier).length),
    1,
  );
  const rowGap = 78;
  const height = Math.max(360, maxRows * rowGap + 110);
  const placed = new Map<string, { x: number; y: number }>();
  for (const tier of tiers) {
    const column = nodes.filter((node) => node.tier === tier);
    const offset = (maxRows - column.length) * (rowGap / 2);
    column.forEach((node, index) => {
      placed.set(node.id, { x: columnX(tier), y: 80 + offset + index * rowGap });
    });
  }
  return {
    placed,
    tiers,
    columns: tiers.map((tier) => ({ tier, x: columnX(tier) })),
    width: columnX(tiers[tiers.length - 1] ?? 0) + 150,
    height,
  };
}

/** Cascade failure drill console. */
export default function Cascade() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);
  const stationLabel = slug === "maitri" ? "Maitri" : "Bharati";
  const nodes = useMemo(() => cascadeGraph(slug), [slug]);

  const runs = useQuery(api.cascade.listRuns, { slug, limit: 12 });
  const runCascade = useMutation(api.cascade.runCascade);

  const [triggerId, setTriggerId] = useState(nodes[0]?.id ?? "");
  const [severity, setSeverity] = useState<CascadeSeverity>("critical");
  const [isolations, setIsolations] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Station switches replace the graph, so the trigger and plan are re-seeded.
  const graphKey = nodes.map((node) => node.id).join("|");
  const [lastGraphKey, setLastGraphKey] = useState(graphKey);
  if (lastGraphKey !== graphKey) {
    setLastGraphKey(graphKey);
    setTriggerId(nodes[0]?.id ?? "");
    setIsolations([]);
  }

  const activeTrigger = nodes.find((node) => node.id === triggerId) ?? nodes[0];
  const preview = useMemo(
    () => simulateCascade({ nodes, triggerId, severity, isolations }),
    [nodes, triggerId, severity, isolations],
  );
  const { placed, columns, width, height } = useMemo(() => layout(nodes), [nodes]);

  /** Position of a node in the propagation order, for the step badges. */
  const stepOf = useMemo(() => {
    const map = new Map<string, number>();
    preview.impacts.forEach((impact, index) => map.set(impact.id, index + 1));
    return map;
  }, [preview.impacts]);

  const impactedCount = preview.impacts.filter((impact) => impact.state === "impacted").length;

  const toggleIsolation = useCallback((id: string) => {
    setIsolations((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }, []);

  const recordDrill = useCallback(async () => {
    setBusy(true);
    try {
      await runCascade({ slug, triggerId, severity, isolations });
      award("cascade");
      toast.success(
        `Drill recorded: ${preview.impacts.length} downstream nodes, ${preview.minutesBought} minute response window`,
      );
    } catch (error) {
      toast.error(`Drill not recorded: ${String(error).slice(0, 140)}`);
    } finally {
      setBusy(false);
    }
  }, [isolations, preview.impacts.length, preview.minutesBought, runCascade, severity, slug, triggerId]);

  const pathEdges = useMemo(() => {
    const edges = new Set<string>();
    for (const impact of preview.impacts) {
      for (let i = 0; i < impact.path.length - 1; i += 1) {
        edges.add(`${impact.path[i]}->${impact.path[i + 1]}`);
      }
    }
    return edges;
  }, [preview.impacts]);

  const stateOf = useCallback(
    (id: string) => {
      if (id === triggerId) return "trigger" as const;
      const impact = preview.impacts.find((entry) => entry.id === id);
      if (!impact) return "spared" as const;
      return impact.state === "isolated" ? ("isolated" as const) : ("impacted" as const);
    },
    [preview.impacts, triggerId],
  );

  const toneFor = (state: ReturnType<typeof stateOf>, severityOf?: CascadeSeverity) => {
    if (state === "trigger") return { stroke: "#FF3B47", fill: "#3A1218", text: "#FF8A92" };
    if (state === "isolated") return { stroke: "#00E0C6", fill: "#062A2A", text: "#7DF3E4" };
    if (state === "spared") return { stroke: "#33414F", fill: "#0C141D", text: "#8FA0B2" };
    if (severityOf === "critical") return { stroke: "#FFB020", fill: "#3A2A10", text: "#FFD08A" };
    if (severityOf === "warning") return { stroke: "#4A9EFF", fill: "#101F33", text: "#9CC8FF" };
    return { stroke: "#6B7A8F", fill: "#121A24", text: "#B3C0CE" };
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Resilience"
          title={`${stationLabel} cascade drill`}
          description="Take one equipment trigger, propagate it through the real station dependency graph, and see how far the consequence travels before the isolation plan stops it. Every drill is recorded with the full propagation and written into the audit chain."
        >
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            {(["maitri", "bharati"] as const).map((option) => (
              <Button
                key={option}
                asChild
                variant="ghost"
                size="sm"
                className={cn("cursor-pointer text-xs", slug === option && "bg-primary/15 text-primary")}
              >
                <a href={`/cascade?station=${option}`}>{option === "maitri" ? "Maitri" : "Bharati"}</a>
              </Button>
            ))}
          </div>
        </PageHeading>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Cascade node reached"
            value={preview.impacts.filter((impact) => impact.state === "impacted").length}
            tone="text-[#FFB020]"
            hint={`${preview.isolated.length} node(s) isolated by the plan.`}
          />
          <StatTile
            label="Response window"
            value={preview.minutesBought}
            unit="min"
            hint="Time bought by the isolation points before the first crew-critical loss."
          />
          <StatTile
            label="Resilience index"
            value={`${preview.resilience}%`}
            tone={preview.resilience >= 70 ? "text-[#3EE07F]" : preview.resilience >= 45 ? "text-[#FFB020]" : "text-[#FF3B47]"}
            hint="Consequence absorbed by redundancy and the isolation plan."
          />
          <StatTile
            label="Crew risk"
            value={preview.crewRiskNode ? minuteLabel(preview.crewRiskSec ?? 0) : "none"}
            tone={preview.crewRiskNode ? "text-[#FF3B47]" : "text-[#3EE07F]"}
            hint={preview.crewRiskNode ?? "No crew-critical node is reached by this trigger."}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Drill setup" className="lg:col-span-1">
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="cc-label text-[9px]">Trigger</span>
                <select
                  value={triggerId}
                  onChange={(event) => setTriggerId(event.target.value)}
                  className="h-9 w-full rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
                >
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {SUBSYSTEM_LABELS[node.subsystem] ?? node.subsystem} - {node.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-1">
                <span className="cc-label text-[9px]">Severity</span>
                <div className="flex flex-wrap gap-1.5">
                  {SEVERITIES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      title={option.hint}
                      onClick={() => setSeverity(option.id)}
                      className={cn(
                        "rounded border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                        severity === option.id
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  {SEVERITIES.find((option) => option.id === severity)?.hint}
                </p>
              </div>

              {activeTrigger && (
                <div className="rounded border border-border px-3 py-2">
                  <div className="cc-label text-[9px]">Trigger drill card</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {activeTrigger.procedure}
                  </p>
                  <p className="cc-mono mt-1.5 text-[10px] text-muted-foreground">
                    redundancy {activeTrigger.redundancy} - isolation {activeTrigger.isolationSec}s -
                    consequence weight {activeTrigger.impactWeight}/10
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <span className="cc-label text-[9px]">
                  Isolation plan ({isolations.length} node{isolations.length === 1 ? "" : "s"})
                </span>
                <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                  {nodes
                    .filter((node) => node.id !== triggerId)
                    .map((node) => {
                      const active = isolations.includes(node.id);
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => toggleIsolation(node.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded border px-2 py-1 text-left text-[11px] transition-colors",
                            active
                              ? "border-[#00E0C6]/50 bg-[#00E0C6]/10 text-[#7DF3E4]"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span className="truncate">{node.label}</span>
                          <span className="cc-mono shrink-0 text-[9px]">{node.isolationSec}s</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="text-[11px]" onClick={() => void recordDrill()} disabled={busy}>
                  <Play className="mr-1.5 size-3.5" />
                  {busy ? "Recording drill" : "Run and record drill"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px]"
                  onClick={() => setIsolations([])}
                  disabled={isolations.length === 0}
                >
                  Clear plan
                </Button>
              </div>
            </div>
          </Panel>

          <Panel
            title="Propagation graph"
            className="lg:col-span-2"
            action={
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#FF3B47]" /> trigger
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#FFB020]" /> impacted
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#00E0C6]" /> isolated
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#33414F]" /> spared
                </span>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-[500px] w-full min-w-[900px]"
                role="img"
                aria-label="Propagation flowchart"
              >
                <defs>
                  {/* Flow arrows: the direction consequence travels. */}
                  {[
                    { id: "flow-live", fill: "#FFB020" },
                    { id: "flow-iso", fill: "#00E0C6" },
                    { id: "flow-idle", fill: "#33414F" },
                  ].map((marker) => (
                    <marker
                      key={marker.id}
                      id={marker.id}
                      viewBox="0 0 10 10"
                      refX="8.5"
                      refY="5"
                      markerWidth="5.5"
                      markerHeight="5.5"
                      orient="auto"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill={marker.fill} />
                    </marker>
                  ))}
                </defs>

                {/* Swimlanes: one band per dependency tier, left to right. */}
                {columns.map(({ tier, x }) => (
                  <g key={`lane-${tier}`}>
                    <rect
                      x={x - LANE_HALF}
                      y={40}
                      width={LANE_HALF * 2}
                      height={height - 62}
                      rx={12}
                      fill={tier % 2 === 0 ? "rgba(12,20,29,0.6)" : "rgba(18,28,40,0.4)"}
                      stroke="#1C2733"
                      strokeWidth={1}
                    />
                    <text
                      x={x}
                      y={26}
                      textAnchor="middle"
                      className="font-display"
                      fontSize={11}
                      fill="#6B7A8F"
                      letterSpacing={1.4}
                    >
                      {TIER_LABELS[tier] ?? `Tier ${tier}`}
                    </text>
                  </g>
                ))}

                {/* Flow arrows: parent to child, in the direction consequence moves. */}
                {nodes.flatMap((node) =>
                  node.dependsOn.map((parentId) => {
                    const from = placed.get(parentId);
                    const to = placed.get(node.id);
                    if (!from || !to) return null;
                    const onPath = pathEdges.has(`${parentId}->${node.id}`);
                    const isolatedEdge = isolations.includes(parentId);
                    const marker = isolatedEdge
                      ? "url(#flow-iso)"
                      : onPath
                        ? "url(#flow-live)"
                        : "url(#flow-idle)";
                    return (
                      <line
                        key={`${parentId}-${node.id}`}
                        x1={from.x + BOX_W / 2}
                        y1={from.y}
                        x2={to.x - BOX_W / 2 - 2}
                        y2={to.y}
                        stroke={isolatedEdge ? "#00E0C6" : onPath ? "#FFB020" : "#2A3644"}
                        strokeWidth={onPath ? 2.2 : 1.4}
                        strokeDasharray={isolatedEdge ? "5 4" : undefined}
                        opacity={onPath || isolatedEdge ? 0.95 : 0.5}
                        markerEnd={marker}
                      />
                    );
                  }),
                )}

                {/*
                  One box per system. Clicking a box makes it the system that
                  shuts down, so the flowchart can be driven from either the
                  dropdown or the diagram itself.
                */}
                {nodes.map((node) => {
                  const at = placed.get(node.id);
                  if (!at) return null;
                  const state = stateOf(node.id);
                  const impact = preview.impacts.find((entry) => entry.id === node.id);
                  const tone = toneFor(state, impact?.severity);
                  const step = stepOf.get(node.id);
                  const isTrigger = state === "trigger";
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${at.x}, ${at.y})`}
                      className="cursor-pointer"
                      onClick={() => setTriggerId(node.id)}
                    >
                      <title>
                        {`${node.label} - click to shut this system down`}
                      </title>
                      <rect
                        x={-BOX_W / 2}
                        y={-BOX_H / 2}
                        width={BOX_W}
                        height={BOX_H}
                        rx={6}
                        fill={tone.fill}
                        stroke={tone.stroke}
                        strokeWidth={isTrigger ? 2.6 : 1.6}
                      />
                      {isTrigger && (
                        <rect
                          x={-BOX_W / 2 - 4}
                          y={-BOX_H / 2 - 4}
                          width={BOX_W + 8}
                          height={BOX_H + 8}
                          rx={9}
                          fill="none"
                          stroke={tone.stroke}
                          strokeWidth={1}
                          strokeDasharray="4 4"
                          opacity={0.7}
                        />
                      )}
                      <text
                        x={0}
                        y={-6}
                        textAnchor="middle"
                        fontSize={11}
                        fill={tone.text}
                        className="font-display"
                      >
                        {node.label.length > 26 ? `${node.label.slice(0, 24)}...` : node.label}
                      </text>
                      <text x={0} y={12} textAnchor="middle" fontSize={9.5} fill="#8FA0B2">
                        {SUBSYSTEM_LABELS[node.subsystem] ?? node.subsystem} - {node.redundancy}
                      </text>
                      {impact && (
                        <text
                          x={0}
                          y={26}
                          textAnchor="middle"
                          fontSize={9.5}
                          fill={tone.text}
                          className="cc-mono"
                        >
                          {minuteLabel(impact.timeToImpactSec)} - {Math.round(impact.probability * 100)}%
                          {impact.state === "isolated" ? " isolated" : ""}
                        </text>
                      )}
                      {/* Step in the propagation order, so the flow reads as a sequence. */}
                      {step !== undefined && !isTrigger && (
                        <g transform="translate(-78, -14)">
                          <circle r={9} fill={tone.stroke} opacity={0.24} />
                          <text
                            x={0}
                            y={3.5}
                            textAnchor="middle"
                            fontSize={9.5}
                            fill={tone.text}
                            className="cc-mono"
                          >
                            {step}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <GitBranchPlus className="size-3 text-primary" />
                Click any box to shut that system down
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#FFB020]" /> arrow carrying consequence
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#00E0C6]" /> arrow stopped by an isolation
              </span>
              <span className="cc-mono ml-auto">
                {impactedCount} system{impactedCount === 1 ? "" : "s"} affected
              </span>
            </div>

            <p className="mt-3 rounded border border-border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-display text-[10px] uppercase tracking-wider text-foreground">
                If {activeTrigger?.label ?? "the trigger"} shuts down
              </span>
              <br />
              {impactedCount} system{impactedCount === 1 ? "" : "s"} are affected, {preview.isolated.length} of
              them isolated by the plan{preview.crewRiskNode ? `, and ${preview.crewRiskNode} is crew-critical at T+${minuteLabel(preview.crewRiskSec ?? 0)}` : ", with no crew-critical node reached"}. {preview.recommendation}
            </p>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Propagation timeline"
            action={
              <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                <Timer className="mr-1 size-3" />
                {preview.impacts.length} nodes reached
              </Badge>
            }
          >
            {preview.impacts.length === 0 ? (
              <PanelEmpty message="This trigger does not reach any downstream node at the selected severity." />
            ) : (
              <div className="space-y-2">
                {preview.impacts.map((impact) => {
                  const tone = severityClasses(impact.severity);
                  return (
                    <div key={impact.id} className="rounded border border-border px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="cc-mono text-[11px] text-foreground">
                          T+{minuteLabel(impact.timeToImpactSec)}
                        </span>
                        <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase", tone.border, tone.bg, tone.text)}>
                          {impact.severity}
                        </span>
                        <span className="text-xs text-foreground">{impact.label}</span>
                        {impact.state === "isolated" && (
                          <Badge variant="outline" className="border-[#00E0C6]/40 text-[9px] text-[#7DF3E4]">
                            isolated
                          </Badge>
                        )}
                        <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
                          {Math.round(impact.probability * 100)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-border">
                        <div
                          className={cn("h-full", impact.state === "isolated" ? "bg-[#00E0C6]" : "bg-[#FFB020]")}
                          style={{ width: `${Math.max(4, Math.round(impact.probability * 100))}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        {impact.procedure}
                      </p>
                      <p className="cc-mono mt-1 text-[10px] text-muted-foreground/80">
                        path {impact.path.map((step) => nodes.find((node) => node.id === step)?.label ?? step).join(" - ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <div className="space-y-4">
            <Panel title="Recorded drills">
              {!runs ? (
                <PanelLoading height={120} />
              ) : runs.length === 0 ? (
                <PanelEmpty height={120} message="No drill recorded yet. Recording stores the trigger, the isolation plan and every downstream node." />
              ) : (
                <div className="space-y-2">
                  {runs.map((run) => (
                    <div key={run._id} className="rounded border border-border px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn("text-[10px]", severityClasses(run.severity).border, severityClasses(run.severity).text)}>
                          {run.severity}
                        </Badge>
                        <span className="text-xs text-foreground">{run.triggerLabel}</span>
                        <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
                          {formatUtc(run.timestamp)}
                        </span>
                      </div>
                      <p className="cc-mono mt-1 text-[10px] text-muted-foreground">
                        {run.impacted} impacted - {run.isolated} isolated - {run.minutesBought} min window -
                        resilience {run.resilience}%
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {run.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="How the drill is computed">
              <ul className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <GitBranchPlus className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  Consequence moves along declared dependency edges only, so a node with no path from the
                  trigger can never appear as impacted.
                </li>
                <li className="flex gap-2">
                  <Zap className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  Redundancy attenuates probability: none passes everything, N+1 passes forty-five percent,
                  a dual path passes twenty.
                </li>
                <li className="flex gap-2">
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  An isolated node stops propagating, which is why the plan changes the timeline rather
                  than only the text around it.
                </li>
                <li className="flex gap-2">
                  <Timer className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  Time to impact is the summed isolation time along the fastest live path plus transport
                  delay, so it reads as a real response window.
                </li>
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
