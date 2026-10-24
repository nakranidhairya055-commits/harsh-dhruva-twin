import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useBlackout } from "@/hooks/use-blackout";
import { useRoleView } from "@/hooks/use-role-view";
import { useStationLinkContext } from "@/components/StationLinkProvider";
import { StationLinkProvider } from "@/components/StationLinkProvider";
import { AssistantDock } from "@/components/AssistantDock";
import { award } from "@/lib/achievements";
import {
  PROJECT_IDENTITY,
  INSTRUMENTED_STATIONS,
  formatAge,
  formatUtc,
  stationFromParams,
  type StationSlug,
} from "@/lib/station";
import { ROLE_VIEWS } from "@/lib/roles";
import {
  Activity,
  AlertTriangle,
  GitBranchPlus,
  RefreshCw,
  Ship,
  Trash2,
  Wrench,
  Box,
  BookOpen,
  ClipboardList,
  Cpu,
  FileCheck2,
  Globe2,
  Layers,
  LogOut,
  Map,
  Menu,
  PenSquare,
  Radio,
  Shield,
  Snowflake,
  Sparkles,
  Users,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Nav sections grouped by the way operators actually use the console. */
const NAV_SECTIONS: Array<{
  title: string;
  items: Array<{ to: string; label: string; icon: typeof Activity }>;
}> = [
  {
    title: "Operations",
    items: [
      { to: "/dashboard", label: "Sensor Dashboard", icon: Activity },
      { to: "/alerts", label: "Alert Triage", icon: AlertTriangle },
      { to: "/station", label: "Station Dashboard", icon: Users },
      { to: "/microgrid", label: "Microgrid & CHP", icon: Zap },
      { to: "/environment", label: "Local Environment", icon: Map },
    ],
  },
  {
    title: "Twin & Field",
    items: [
      { to: "/twin", label: "Digital Twin 3D", icon: Box },
      { to: "/antarctica", label: "Antarctica Overview", icon: Globe2 },
      { to: "/weather", label: "Weather Extension", icon: Wind },
      { to: "/antarctic", label: "Antarctic Mode", icon: Snowflake },
    ],
  },
  {
    title: "Resilience & Logistics",
    items: [
      { to: "/advisor", label: "AI Advisor", icon: Sparkles },
      { to: "/cascade", label: "Cascade Drill", icon: GitBranchPlus },
      { to: "/repair", label: "Repair Bay", icon: Wrench },
      { to: "/resupply", label: "Resupply Voyage", icon: Ship },
    ],
  },
  {
    title: "Records",
    items: [
      { to: "/library", label: "NCPOR Library", icon: BookOpen },
      { to: "/compliance", label: "NPDC Compliance", icon: FileCheck2 },
      { to: "/expeditions", label: "Expedition Logs", icon: ClipboardList },
      { to: "/audit", label: "Audit Trail", icon: Shield },
    ],
  },
  {
    title: "Workspace",
    items: [
      { to: "/catalog", label: "Equipment Catalog", icon: Layers },
      { to: "/workspace", label: "Workspace", icon: PenSquare },
      { to: "/admin", label: "Admin Console", icon: Shield },
    ],
  },
];

/** UTC clock display for the top bar. */
function UtcClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span className="cc-mono hidden text-xs text-muted-foreground xl:inline">
      {formatUtc(now)}
    </span>
  );
}

/** Continuity prediction widget shown in the top bar. */
function ContinuityWidget({ slug }: { slug: string }) {
  const blackout = useBlackout(slug);
  if (!blackout.ready) {
    return (
      <Badge variant="outline" className="hidden border-border text-[10px] text-muted-foreground lg:inline-flex">
        <Cpu className="mr-1 size-3" />
        AI engine loading
      </Badge>
    );
  }
  const critical = blackout.active || blackout.riskLevel === "imminent";
  return (
    <Badge
      variant="outline"
      className={cn(
        "hidden text-[10px] lg:inline-flex",
        critical
          ? "border-[#FF3B47]/50 text-[#FF3B47]"
          : blackout.riskLevel === "high"
            ? "border-[#FFB020]/50 text-[#FFB020]"
            : "border-[#00E0C6]/40 text-[#00E0C6]",
      )}
      title={`Continuity engine ${blackout.model}, target ${blackout.accuracyTarget}% accuracy`}
    >
      <Cpu className="mr-1 size-3" />
      {blackout.active
        ? `Blackout active - ${blackout.remainingSec}s to restore`
        : `Drop predicted in ${blackout.minutesToDrop} min - ${blackout.confidence}% confidence`}
    </Badge>
  );
}

/**
 * Offline queue and broker control.
 *
 * The badge is a live readout, and the panel behind it is the control surface:
 * broker state, queue depth by priority class, how long the oldest item has
 * been waiting, a manual flush and the recent frame feed. Field traffic is
 * written to IndexedDB before any network attempt, so a queue that survives a
 * reload is normal, not an error state.
 */
function SyncIndicator() {
  const link = useStationLinkContext();
  const connected = link.status === "connected";
  const [busy, setBusy] = useState(false);

  const runFlush = async () => {
    setBusy(true);
    try {
      await link.flush();
      award("offline");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "hidden items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors md:inline-flex",
            connected
              ? "border-[#3EE07F]/40 text-[#3EE07F] hover:bg-[#3EE07F]/10"
              : link.online
                ? "border-[#FFB020]/40 text-[#FFB020] hover:bg-[#FFB020]/10"
                : "border-[#FF3B47]/40 text-[#FF3B47] hover:bg-[#FF3B47]/10",
          )}
          title={`MQTT broker ${link.broker} - ${link.published} frames published, ${link.pending} queued`}
        >
          <Radio className="size-3" />
          {connected ? "ONLINE" : link.online ? "SYNCING" : "OFFLINE"} - {link.pending} queued
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Offline sync and MQTT
        </DropdownMenuLabel>
        <div className="space-y-2 px-2 pb-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Broker</span>
            <span className="cc-mono text-foreground">{link.broker}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Link state</span>
            <span className="cc-mono text-foreground">
              {connected ? "connected" : link.online ? "reconnecting" : "offline"}
              {link.detail ? ` - ${link.detail.slice(0, 40)}` : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Frames published</span>
            <span className="cc-mono text-foreground">{link.published}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Oldest queued</span>
            <span className="cc-mono text-foreground">
              {link.oldestAt ? formatAge(link.oldestAt) : "nothing waiting"}
            </span>
          </div>
          <div>
            <div className="cc-label text-[9px]">Queue by priority</div>
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((priority) => (
                <div key={priority} className="rounded border border-border px-1.5 py-1 text-center">
                  <div className="cc-mono text-xs text-foreground">
                    {link.byPriority[priority] ?? 0}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {priority === 1
                      ? "SOS"
                      : priority === 2
                        ? "Critical"
                        : priority === 3
                          ? "Check-in"
                          : "Routine"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void runFlush()} disabled={busy}>
          <RefreshCw className="mr-2 size-3" />
          <span className="text-xs">{busy ? "Flushing queue" : "Flush queue now"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void link.clear()}>
          <Trash2 className="mr-2 size-3" />
          <span className="text-xs">Clear the outbox</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Recent frames
        </DropdownMenuLabel>
        <div className="max-h-40 space-y-1 overflow-y-auto px-2 pb-2">
          {link.messages.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No frames yet. Live telemetry publishes every five seconds once the link is up.
            </p>
          ) : (
            link.messages.slice(0, 6).map((message) => (
              <div key={message.id} className="rounded border border-border px-2 py-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "cc-mono text-[9px]",
                      message.direction === "out" ? "text-[#00E0C6]" : "text-[#4A9EFF]",
                    )}
                  >
                    {message.direction === "out" ? "TX" : "RX"}
                  </span>
                  <span className="cc-mono truncate text-[9px] text-foreground">{message.topic}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Authenticated console chrome. */
function ShellChrome({
  station,
  setStation,
  children,
}: {
  station: StationSlug;
  setStation: (slug: StationSlug) => void;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const link = useStationLinkContext();
  const blackout = useBlackout(station);
  const readings = useStationReadingsForAuto(station);

  const profileRole = (user as { twinRole?: string } | null)?.twinRole ?? null;
  const { role, def, setRole, allows } = useRoleView(profileRole);

  /* --- Antarctic Mode: manual toggle and keyboard shortcut --- */
  const toggleAntarctic = () => {
    if (location.pathname === "/antarctic") {
      navigate(`/dashboard?station=${station}`);
    } else {
      navigate(`/antarctic?station=${station}`);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        toggleAntarctic();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /*
   * Antarctic Mode automatic activation.
   *
   * Fires once per browser session when the station environment crosses a
   * threshold, so a crew member who is already working in the console is not
   * pulled out of it repeatedly by the same weather.
   */
  const autoFired = useRef(false);
  useEffect(() => {
    if (autoFired.current) return;
    if (location.pathname === "/antarctic") return;
    if (!readings) return;
    if (sessionStorage.getItem(AUTO_KEY)) {
      autoFired.current = true;
      return;
    }
    const reason = antarcticTrigger(readings);
    if (!reason) return;
    autoFired.current = true;
    sessionStorage.setItem(AUTO_KEY, reason);
    toast.warning(`Antarctic Mode auto-activated: ${reason}.`);
    navigate(`/antarctic?station=${station}&reason=${encodeURIComponent(reason)}`);
  }, [location.pathname, navigate, readings, station]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex size-10 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
            <Snowflake className="size-5 text-primary" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold tracking-wide text-foreground">
              {PROJECT_IDENTITY.name}
            </div>
            <div className="cc-label">Team {PROJECT_IDENTITY.team}</div>
          </div>
        </div>
        <Separator />
        <div className="px-5 py-3">
          <div className="cc-label pb-1">Role view</div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            {ROLE_VIEWS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{def.focus}</p>
        </div>
        <Separator />
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => allows(item.to));
            if (items.length === 0) return null;
            return (
              <div key={section.title} className="space-y-1">
                <div className="cc-label px-2 pb-1">{section.title}</div>
                {items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )
                    }
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <Separator />
        {/* Continuity drill trigger, kept in the left rail so it is reachable
            from every screen while the operator is watching a station. */}
        <div className="space-y-2 px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-[#FF3B47]/60 text-[10px] uppercase tracking-wider text-[#FF3B47] hover:bg-[#FF3B47]/10"
            disabled={blackout.active || blackout.busy}
            onClick={() => void blackout.start()}
            title="Run the 60 second satellite blackout drill for this station"
          >
            <Cpu className="mr-1.5 size-3" />
            {blackout.active
              ? `Blackout active ${blackout.remainingSec}s`
              : "Simulate Satellite Blackout"}
          </Button>
          <p className="cc-mono text-[10px] leading-relaxed text-muted-foreground">
            {blackout.active
              ? `Predicted retention ${blackout.confidence}% - target ${blackout.accuracyTarget}% accuracy`
              : `Drop in ${blackout.minutesToDrop} min at ${blackout.confidence}% confidence`}
          </p>
        </div>
        <Separator />
        <div className="px-5 py-4">
          <div className="cc-label">PS {PROJECT_IDENTITY.psId} - SIH 2026</div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {PROJECT_IDENTITY.agency}
          </p>
        </div>
      </aside>

      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Toggle navigation"
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            {INSTRUMENTED_STATIONS.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setStation(s.slug)}
                className={cn(
                  "cc-mono rounded px-3 py-1.5 text-xs transition-colors",
                  station === s.slug
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.name.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ContinuityWidget slug={station} />
            <SyncIndicator />
            <UtcClock />
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-[10px] uppercase tracking-wider",
                location.pathname === "/antarctic" && "border-[#FFD700] text-[#FFD700]",
              )}
              onClick={toggleAntarctic}
              title="Antarctic Mode (Ctrl+Shift+A)"
            >
              <Snowflake className="size-3.5" />
              Antarctic
            </Button>
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <div className="text-xs font-medium text-foreground">
                  {user?.name ?? user?.email ?? "Operator"}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {role}
                </div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void signOut()}>
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <footer className="border-t border-border px-4 py-3 md:px-6">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="font-display font-bold uppercase tracking-wider text-foreground">
              {PROJECT_IDENTITY.name}
            </span>
            <span>PS {PROJECT_IDENTITY.psId}</span>
            <span>{PROJECT_IDENTITY.event}</span>
            <span className="hidden sm:inline">{PROJECT_IDENTITY.agency}</span>
            <span className="cc-mono">
              AI engine {blackout.model} - {blackout.ready ? `${blackout.riskLevel} risk` : "starting"} -
              target {blackout.accuracyTarget}% accuracy
            </span>
            <span className="cc-mono">
              MQTT {link.broker} {link.status} - {link.pending} queued
            </span>
            <span className="ml-auto flex items-center gap-3">
              <Link to="/terms" className="transition-colors hover:text-foreground">
                Terms
              </Link>
              <Link to="/privacy" className="transition-colors hover:text-foreground">
                Privacy
              </Link>
              <Link to="/" className="transition-colors hover:text-foreground">
                About the project
              </Link>
            </span>
          </div>
        </footer>
      </div>

      <AssistantDock
        slug={station}
        stationLabel={station === "maitri" ? "Maitri" : "Bharati"}
      />
    </div>
  );
}

/** Live telemetry used by the Antarctic Mode auto-activation rule. */
function useStationReadingsForAuto(slug: string) {
  return useQuery(api.telemetry.getLiveReadings, { slug });
}

/** Session key that records an automatic Antarctic Mode activation. */
const AUTO_KEY = "dhruvatwin.antarcticAuto";

/**
 * Antarctic Mode auto-activation rule: ambient at or below -20 Celsius, or
 * surface wind above 80 km/h (the katabatic blackout band).
 */
function antarcticTrigger(
  readings: Array<{ sensorId: string; value: number; unit: string }> | undefined,
): string | null {
  if (!readings) return null;
  const ambient = readings.find((r) => r.sensorId === "env.temperature");
  const wind = readings.find((r) => r.sensorId === "env.wind_speed");
  if (ambient && ambient.value <= -20) {
    return `ambient temperature ${ambient.value.toFixed(1)} C is at or below the -20 C Antarctic Mode threshold`;
  }
  if (wind && wind.value * 3.6 > 80) {
    return `surface wind ${(wind.value * 3.6).toFixed(0)} km/h is above the 80 km/h katabatic threshold`;
  }
  return null;
}

/** Top-level authenticated layout for the DhruvaTwin command centre. */
export function AppShell({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const station = stationFromParams(params);

  const setStation = (slug: StationSlug) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("station", slug);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <StationLinkProvider slug={station}>
      <ShellChrome station={station} setStation={setStation}>
        {children}
      </ShellChrome>
    </StationLinkProvider>
  );
}
