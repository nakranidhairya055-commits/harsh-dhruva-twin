import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { PageHeading, Panel, PanelLoading, StatTile } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { award } from "@/lib/achievements";
import {
  formatUtc,
  stationFromParams,
  statusClasses,
} from "@/lib/station";
import {
  VOYAGES,
  formatPosition,
  statusAt,
} from "@/lib/voyage";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Bot,
  Compass,
  Droplets,
  Send,
  Ship,
  Snowflake,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";

/** Focus areas the advisor can be pointed at. */
const FOCUSES = [
  { id: "briefing", label: "Daily briefing", icon: Sparkles, hint: "The whole station." },
  { id: "power", label: "Power and heat", icon: Zap, hint: "Generation, storage and load." },
  { id: "water", label: "Water path", icon: Droplets, hint: "Source to drain and the freeze window." },
  { id: "connectivity", label: "Connectivity", icon: Activity, hint: "Link, fallback and the outbox." },
  { id: "logistics", label: "Sea lift", icon: Ship, hint: "Voyage, discharge window and stores." },
  { id: "field", label: "Field safety", icon: Users, hint: "People, weather limits and comms gaps." },
] as const;

type FocusId = (typeof FOCUSES)[number]["id"];

interface AdvisorAction {
  title: string;
  why: string;
  owner: string;
  window: string;
  severity: string;
}

interface AdvisorBriefing {
  headline: string;
  risk: string;
  summary: string;
  actions: AdvisorAction[];
  watch: string[];
  evidence: string[];
  model: string;
  usedFallback: boolean;
}

const RISK_LABEL: Record<string, string> = {
  critical: "Critical",
  warning: "Elevated",
  watch: "Steady",
};

function riskTone(risk: string): string {
  if (risk === "critical") return "border-[#FF3B47]/50 text-[#FF8A92]";
  if (risk === "warning") return "border-[#FFB020]/50 text-[#FFB020]";
  return "border-[#3EE07F]/50 text-[#3EE07F]";
}

/**
 * AI advisor.
 *
 * The station assistant answers what you ask. This screen decides what you
 * should be told: it reads the station's own live data, the incident list, the
 * continuity prediction, the generation snapshot, the repair history, the
 * self-test verdicts and the station dependency graph, then returns a ranked
 * briefing - actions with an owner and a window, what to keep watching, and the
 * evidence behind every line.
 *
 * The briefing is written by the advisor action, which uses llama-3.3-70b over
 * a live context block when GROQ_API_KEY is set and falls back to a
 * deterministic rule engine over the same numbers when it is not. The panel on
 * the right always shows the raw findings, so the advice can be checked.
 */
export default function Advisor() {
  const [params, setParams] = useSearchParams();
  const slug = stationFromParams(params);
  const stationLabel = slug === "maitri" ? "Maitri" : "Bharati";

  const [focus, setFocus] = useState<FocusId>("briefing");
  const [briefing, setBriefing] = useState<AdvisorBriefing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [exchange, setExchange] = useState<{ q: string; a: string; model: string } | null>(null);
  const [asking, setAsking] = useState(false);

  const runBriefing = useAction(api.advisor.briefing);
  const ask = useAction(api.assistant.ask);

  const readings = useQuery(api.telemetry.getLiveReadings, { slug });
  const alerts = useQuery(api.telemetry.listAlerts, {
    stationSlug: slug,
    openOnly: true,
    limit: 12,
  });
  const microgrid = useQuery(api.ops.microgridSnapshot, { slug, limit: 12 });

  /** Live sea-lift line, computed from the same voyage model the tracker draws. */
  const seaLiftLine = useMemo(() => {
    const now = Date.now();
    const ranked = VOYAGES.filter((voyage) => voyage.target === slug)
      .map((voyage) => statusAt(voyage, now))
      .sort((a, b) => {
        const rank = (state: string) => (state === "at sea" ? 0 : state === "in port" ? 1 : 2);
        return rank(a.state) - rank(b.state) || a.departureMs - b.departureMs;
      });
    const status = ranked[0];
    if (!status) return undefined;
    return `${status.voyage.name} - ${status.state}, ${status.percent}% of the passage run, ${Math.round(status.remainingKm * 0.539957)} nm to ${status.voyage.targetLabel}, planned arrival ${formatUtc(status.plannedArrivalMs).slice(0, 16)} UTC, position ${formatPosition(status.position)}, ice state ${status.iceState}.`;
  }, [slug]);

  const worstChannels = useMemo(
    () => (readings ?? []).filter((reading) => reading.status !== "nominal"),
    [readings],
  );
  const criticalAlerts = useMemo(
    () => (alerts ?? []).filter((alert) => alert.severity === "critical"),
    [alerts],
  );

  /** Generation headroom, or null when the snapshot has not arrived. */
  const [onlineGenerationKw, stationLoadKw] = useMemo<[number | null, number | null]>(() => {
    const sources = microgrid?.online ? microgrid.sources : [];
    if (sources.length === 0) return [null, null];
    return [
      sources.reduce((sum, source) => sum + source.outputKw, 0),
      Math.max(...sources.map((source) => source.loadKw)),
    ];
  }, [microgrid]);

  const requestKey = useRef("");

  const generate = useCallback(
    async (nextFocus: FocusId, { quiet = false } = {}) => {
      setBusy(true);
      setError(null);
      try {
        const result = (await runBriefing({
          slug,
          focus: nextFocus,
          seaLift: seaLiftLine,
        })) as AdvisorBriefing;
        setBriefing(result);
        award("advisor");
        if (!quiet) {
          toast.success(
            result.usedFallback
              ? "Briefing built from the live rule engine"
              : "Briefing written from live station context",
          );
        }
      } catch (cause) {
        setError(String(cause).slice(0, 200));
      } finally {
        setBusy(false);
      }
    },
    [runBriefing, seaLiftLine, slug],
  );

  /**
   * A briefing is produced on arrival and whenever the station or the focus
   * changes, so the screen is never an empty form waiting for a click.
   */
  useEffect(() => {
    const key = `${slug}:${focus}:${seaLiftLine ?? ""}`;
    if (requestKey.current === key) return;
    requestKey.current = key;
    void generate(focus, { quiet: true });
  }, [focus, generate, seaLiftLine, slug]);

  const submitQuestion = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || asking) return;
      setAsking(true);
      setQuestion("");
      try {
        const result = await ask({ slug, question: trimmed });
        setExchange({ q: trimmed, a: result.answer, model: result.model });
        award("advisor");
      } catch (cause) {
        toast.error(`Assistant unavailable: ${String(cause).slice(0, 140)}`);
      } finally {
        setAsking(false);
      }
    },
    [ask, asking, slug],
  );

  const activeFocus = FOCUSES.find((entry) => entry.id === focus) ?? FOCUSES[0];

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Intelligence"
          title={`${stationLabel} AI advisor`}
          description="A decision briefing, not a chat: the advisor reads the station's own telemetry, incidents, continuity prediction, generation snapshot, repair history, self-test verdicts and dependency graph, then ranks what to do about it. Every conclusion lists the live evidence behind it."
        >
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            {(["maitri", "bharati"] as const).map((option) => (
              <Button
                key={option}
                variant="ghost"
                size="sm"
                className={cn(
                  "cursor-pointer text-xs",
                  slug === option && "bg-primary/15 text-primary",
                )}
                onClick={() =>
                  setParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("station", option);
                      return next;
                    },
                    { replace: true },
                  )
                }
              >
                {option === "maitri" ? "Maitri" : "Bharati"}
              </Button>
            ))}
          </div>
        </PageHeading>

        {/* Focus selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {FOCUSES.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.id}
                type="button"
                title={entry.hint}
                onClick={() => setFocus(entry.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                  focus === entry.id
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <Icon className="size-3" />
                {entry.label}
              </button>
            );
          })}
          <Button
            size="sm"
            variant="outline"
            className="ml-auto text-[11px]"
            disabled={busy}
            onClick={() => void generate(focus)}
          >
            <Sparkles className={cn("mr-1.5 size-3.5", busy && "animate-pulse")} />
            {busy ? "Working the problem" : "Refresh the briefing"}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* The briefing itself */}
          <div className="space-y-4 lg:col-span-2">
            <Panel
              title={`${activeFocus.label} briefing`}
              action={
                <div className="flex items-center gap-2">
                  {briefing && (
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", riskTone(briefing.risk))}
                    >
                      {RISK_LABEL[briefing.risk] ?? briefing.risk}
                    </Badge>
                  )}
                  {briefing && (
                    <Badge
                      variant="outline"
                      className="border-border text-[10px] text-muted-foreground"
                    >
                      {briefing.usedFallback ? "live rule engine" : briefing.model}
                    </Badge>
                  )}
                </div>
              }
            >
              {error ? (
                <p className="text-[11px] leading-relaxed text-[#FF8A92]">
                  The advisor could not be reached: {error}
                </p>
              ) : busy && !briefing ? (
                <PanelLoading height={180} />
              ) : briefing ? (
                <div className="space-y-4">
                  <div>
                    <div className="cc-label text-[9px]">Headline</div>
                    <p className="mt-1 font-display text-base font-bold leading-snug text-foreground">
                      {briefing.headline}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {briefing.summary}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="cc-label text-[9px]">
                        Actions, ranked by consequence
                      </span>
                      {busy && <span className="cc-mono text-[9px] text-primary">updating</span>}
                    </div>
                    {briefing.actions.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        Nothing outstanding in this focus area: every channel is inside band and no
                        incident is open.
                      </p>
                    ) : (
                      briefing.actions.map((action, index) => {
                        const tone = statusClasses(action.severity);
                        return (
                          <div
                            key={`${action.title}-${index}`}
                            className="rounded border border-border px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="cc-mono text-[10px] text-muted-foreground">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span
                                className={cn(
                                  "rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                                  tone.border,
                                  tone.bg,
                                  tone.text,
                                )}
                              >
                                {action.severity}
                              </span>
                              <span className="text-xs font-semibold text-foreground">
                                {action.title}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                              {action.why}
                            </p>
                            <div className="cc-mono mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="size-3" /> {action.owner}
                              </span>
                              <span className="flex items-center gap-1">
                                <Compass className="size-3" /> {action.window}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Pick a focus and the advisor will produce a briefing.
                </p>
              )}
            </Panel>

            <Panel
              title="Ask the assistant a follow-up"
              action={
                <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                  <Bot className="mr-1 size-3" />
                  same live context
                </Badge>
              }
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitQuestion(question);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={`e.g. why is ${worstChannels[0]?.equipmentId ?? "this channel"} out of band?`}
                  className="h-9 min-w-0 flex-1 rounded border border-border bg-background px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
                />
                <Button type="submit" size="icon" disabled={asking || !question.trim()} aria-label="Ask">
                  <Send className="size-4" />
                </Button>
              </form>

              {exchange ? (
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-semibold text-foreground">{exchange.q}</p>
                  <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                    {exchange.a}
                  </p>
                  <p className="cc-mono text-[9px] text-muted-foreground">{exchange.model}</p>
                </div>
              ) : (
                <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                  The assistant answers from the same live context the briefing was built from, so a
                  question about anything the advisor raised is answered with the same numbers.
                </p>
              )}
            </Panel>
          </div>

          {/* Grounded findings */}
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <StatTile
                label="Channels out of band"
                value={worstChannels.length}
                tone={worstChannels.length > 0 ? "text-[#FFB020]" : "text-[#3EE07F]"}
                hint={`${readings?.length ?? 0} live channels read at the moment the briefing was built.`}
              />
              <StatTile
                label="Critical incidents"
                value={criticalAlerts.length}
                tone={criticalAlerts.length > 0 ? "text-[#FF3B47]" : "text-[#3EE07F]"}
                hint={`${alerts?.length ?? 0} open incidents on ${stationLabel}.`}
              />
              <StatTile
                label="Online generation"
                value={
                  onlineGenerationKw === null
                    ? 0
                    : onlineGenerationKw
                }
                unit="kW"
                hint={
                  stationLoadKw === null
                    ? "The generation snapshot is not online for this station."
                    : `Against a station load of ${stationLoadKw} kW.`
                }
              />
            </div>

            <Panel title="Watch list">
              {briefing && briefing.watch.length > 0 ? (
                <ul className="space-y-1.5">
                  {briefing.watch.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground"
                    >
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#FFB020]" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Nothing on the watch list for this focus.
                </p>
              )}
            </Panel>

            <Panel
              title="Evidence"
              action={
                <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                  live
                </Badge>
              }
            >
              {briefing && briefing.evidence.length > 0 ? (
                <ul className="space-y-1.5">
                  {briefing.evidence.map((item) => (
                    <li
                      key={item}
                      className="cc-mono rounded border border-border px-2.5 py-1.5 text-[10px] leading-snug text-muted-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  The evidence list fills in with the briefing.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button asChild size="sm" variant="outline" className="text-[11px]">
                  <Link to={`/alerts?station=${slug}`}>Incidents</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="text-[11px]">
                  <Link to={`/cascade?station=${slug}`}>Cascade flowchart</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="text-[11px]">
                  <Link to={`/repair?station=${slug}`}>Repair bay</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="text-[11px]">
                  <Link to="/resupply">Sea lift</Link>
                </Button>
              </div>
            </Panel>

            <Panel title="How the advice is built">
              <ul className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <Activity className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  Live telemetry channels are ranked by how far outside their band they read, and the
                  worst three become the first actions.
                </li>
                <li className="flex gap-2">
                  <Zap className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  Generation is compared against station load: under fifteen percent headroom raises a
                  reserve action rather than a note.
                </li>
                <li className="flex gap-2">
                  <Snowflake className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  The dependency graph is searched for the widest single-point shutdown, so the drill
                  slot always rehearses the one that hurts most.
                </li>
                <li className="flex gap-2">
                  <Ship className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  The sea lift is read from the same voyage model the tracker draws, so the discharge
                  window in the briefing matches the position on the chart.
                </li>
              </ul>
              <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                With no model key configured the briefing is produced by the deterministic rule engine
                over the same live inputs; set the GROQ_API_KEY credential to have
                llama-3.3-70b-versatile write it instead.
              </p>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
