import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/AppShell";
import { catalogFor } from "@/lib/catalog";
import {
  SUBSYSTEM_LABELS,
  stationFromParams,
  type StationSlug,
} from "@/lib/station";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";

/** Equipment registry browser for the current station. */
export default function Catalog() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params) as StationSlug;
  const [query, setQuery] = useState("");
  const [subsystem, setSubsystem] = useState<string>("all");

  const entries = useMemo(() => catalogFor(slug), [slug]);

  const subsystems = useMemo(() => {
    const set = new Set(entries.map((e) => e.subsystem));
    return ["all", ...Array.from(set)];
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (subsystem !== "all" && e.subsystem !== subsystem) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.equipmentId.toLowerCase().includes(q) ||
        e.tagline.toLowerCase().includes(q) ||
        e.sensors.some((s) => s.parameter.toLowerCase().includes(q))
      );
    });
  }, [entries, query, subsystem]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="cc-label">Equipment Catalog</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Instrumented systems registry
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every equipment tag the platform currently instruments at this station,
            with its live channels, telemetry thresholds and operator field notes.
            Open an entry to see real-time readings and to post observations of your own.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search equipment, channels, tags..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1">
            {subsystems.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSubsystem(s)}
                className={
                  "rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors " +
                  (subsystem === s
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {s === "all" ? "All" : SUBSYSTEM_LABELS[s] ?? s}
              </button>
            ))}
          </div>
          <span className="cc-mono ml-auto text-xs text-muted-foreground">
            {filtered.length} of {entries.length} entries
          </span>
        </div>

        {filtered.length === 0 ? (
          <Card className="cc-panel border-border shadow-none">
            <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-center">
              <Search className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No equipment matches that search. Clear the query or pick another subsystem.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => (
              <Card
                key={e.equipmentId}
                className="cc-panel group border-border shadow-none transition-colors hover:border-ring/60"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
                      {e.name}
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                      {SUBSYSTEM_LABELS[e.subsystem] ?? e.subsystem}
                    </Badge>
                  </div>
                  <p className="cc-mono text-[10px] text-muted-foreground">{e.equipmentId}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">{e.tagline}</p>
                  <div className="flex flex-wrap gap-1">
                    {e.sensors.map((s) => (
                      <Badge
                        key={s.sensorId}
                        variant="outline"
                        className="text-[10px] font-normal text-muted-foreground"
                      >
                        {s.parameter}
                      </Badge>
                    ))}
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full cursor-pointer">
                    <Link to={`/equipment/${e.equipmentId}?station=${slug}`}>
                      Open equipment page
                      <ArrowRight className="ml-1 size-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="cc-panel border-border shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
              About this registry
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            The catalog is generated directly from the DhruvaTwin sensor definitions, so
            what you see here is exactly what the simulation instruments and what the
            alert engine watches. Partner organisations can extend the registry by
            contributing observations through the workspace; administrators manage who
            may publish from the admin console.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
