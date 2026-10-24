import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { PageHeading, Panel, PanelEmpty, PanelLoading, StatTile } from "@/components/panels";
import { formatUtc, stationFromParams } from "@/lib/station";
import { cn } from "@/lib/utils";
import { CheckCircle2, Hash, ShieldAlert, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

const CATEGORY_TONE: Record<string, string> = {
  auth: "border-[#4A9EFF]/50 text-[#4A9EFF]",
  telemetry: "border-[#00E0C6]/50 text-[#00E0C6]",
  alerts: "border-[#FFB020]/50 text-[#FFB020]",
  comms: "border-[#4A9EFF]/50 text-[#4A9EFF]",
  power: "border-[#FFB020]/50 text-[#FFB020]",
  safety: "border-[#FF3B47]/50 text-[#FF3B47]",
  compliance: "border-[#3EE07F]/50 text-[#3EE07F]",
  npdc: "border-[#3EE07F]/50 text-[#3EE07F]",
  queue: "border-[#6B7A8F]/50 text-muted-foreground",
};

/** Audit Trail: hash-chained command log with live verification. */
export default function Audit() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);
  const chain = useQuery(api.records.verifyChain, {});
  const logs = useQuery(api.records.listCommandLogs, { limit: 120 });
  const [category, setCategory] = useState("all");
  const [stationFilter, setStationFilter] = useState<"all" | "maitri" | "bharati">("all");

  const categories = useMemo(
    () => [...new Set((logs ?? []).map((l) => l.category))].sort(),
    [logs],
  );

  const filtered = useMemo(
    () =>
      (logs ?? []).filter((row) => {
        if (category !== "all" && row.category !== category) return false;
        if (stationFilter !== "all" && row.stationSlug !== stationFilter) return false;
        return true;
      }),
    [category, logs, stationFilter],
  );

  const integrity = chain?.valid
    ? { tone: "text-[#3EE07F]", label: "CHAIN VERIFIED" }
    : chain === undefined
      ? { tone: "text-muted-foreground", label: "VERIFYING" }
      : { tone: "text-[#FF3B47]", label: `BROKEN AT ${chain.brokenAt}` };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Audit Trail"
          title="Hash-chained command log"
          description="Every state change on the platform appends an entry to a rolling hash chain: each record stores the digest of its predecessor plus its own payload. Recomputing the chain from the genesis digest detects any edit, insertion or reordering of history."
        >
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase",
              chain?.valid ? "border-[#3EE07F]/50 text-[#3EE07F]" : "border-[#FFB020]/50 text-[#FFB020]",
            )}
          >
            {chain?.valid ? (
              <CheckCircle2 className="mr-1 size-3" />
            ) : (
              <ShieldAlert className="mr-1 size-3" />
            )}
            {integrity.label}
          </Badge>
        </PageHeading>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Chain entries"
            value={chain?.entries ?? 0}
            hint="records in the verification window"
          />
          <StatTile
            label="Head sequence"
            value={chain?.headSequence ?? 0}
            hint="latest appended record"
            tone="text-[#00E0C6]"
          />
          <StatTile
            label="Integrity"
            value={chain?.valid ? "PASS" : chain === undefined ? "..." : "FAIL"}
            hint={chain?.valid ? "recomputed digests match" : "chain mismatch or empty"}
            tone={chain?.valid ? "text-[#3EE07F]" : "text-[#FFB020]"}
          />
          <StatTile
            label="Focused station"
            value={slug === "maitri" ? "MTQ" : "BRT"}
            hint="station filter applied to the view"
          />
        </div>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Hash className="size-4 text-primary" />
              Chain head digest
            </span>
          }
        >
          <div className="space-y-2">
            <div className="cc-mono break-all rounded border border-border bg-background px-3 py-2 text-xs text-[#00E0C6]">
              {chain?.headHash ?? "0000000000000000"}
            </div>
            <p className="cc-mono text-[10px] leading-relaxed text-muted-foreground">
              Genesis digest 0000000000000000. Each entry digest is computed over the previous
              digest plus sequence, node, category, message and timestamp. A single altered
              character anywhere in history breaks every digest that follows it.
            </p>
            {chain && !chain.valid && chain.brokenAt !== null && (
              <div className="flex items-center gap-2 text-xs text-[#FF3B47]">
                <XCircle className="size-4" />
                First mismatch at sequence {chain.brokenAt}. Treat the records after that point as
                unverified.
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Command log"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value as "all" | "maitri" | "bharati")}
                className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
              >
                <option value="all">All stations</option>
                <option value="maitri">Maitri</option>
                <option value="bharati">Bharati</option>
              </select>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          }
          bodyClassName="p-0"
        >
          {logs === undefined ? (
            <PanelLoading height={320} />
          ) : filtered.length === 0 ? (
            <PanelEmpty message="No audit entries match this filter." height={200} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="cc-label px-4 py-2">Seq</th>
                    <th className="cc-label px-4 py-2">Category</th>
                    <th className="cc-label px-4 py-2">Node</th>
                    <th className="cc-label px-4 py-2">Message</th>
                    <th className="cc-label px-4 py-2">Timestamp</th>
                    <th className="cc-label px-4 py-2">Digest</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row._id} className="border-b border-border/60">
                      <td className="cc-mono px-4 py-2 text-muted-foreground">{row.sequence}</td>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase",
                            CATEGORY_TONE[row.category] ?? "border-border text-muted-foreground",
                          )}
                        >
                          {row.category}
                        </Badge>
                      </td>
                      <td className="cc-mono px-4 py-2 text-muted-foreground">{row.node}</td>
                      <td className="px-4 py-2 text-foreground">{row.message}</td>
                      <td className="cc-mono px-4 py-2 text-muted-foreground">
                        {formatUtc(row.timestamp)}
                      </td>
                      <td className="cc-mono px-4 py-2 text-[#00E0C6]">{row.hash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
