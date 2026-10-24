import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useStationLinkContext } from "@/components/StationLinkProvider";
import {
  Panel,
  PanelEmpty,
  PanelLoading,
  PageHeading,
  StatTile,
} from "@/components/panels";
import { formatAge, stationFromParams } from "@/lib/station";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Radio, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

const SECTORS = [
  "All sectors",
  "Habitation",
  "Power Gen Bay",
  "Science Wing",
  "Comms",
  "Field Support",
  "Fuel Farm",
  "Water Systems",
  "Logistics",
  "Safety",
];

const SHIFTS = ["Alpha", "Bravo", "Charlie"];

function rfidClasses(status: string) {
  if (status === "valid") return "border-[#3EE07F]/50 text-[#3EE07F]";
  if (status === "expired") return "border-[#FFB020]/50 text-[#FFB020]";
  return "border-[#FF3B47]/50 text-[#FF3B47]";
}

function medClasses(status: string) {
  if (status === "fit") return "text-[#3EE07F]";
  if (status === "monitor") return "text-[#FFB020]";
  return "text-[#FF3B47]";
}

/** Station dashboard: complement, roster, badge state and duty board. */
export default function StationOps() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);
  const [sector, setSector] = useState("All sectors");
  const [query, setQuery] = useState("");

  const stations = useQuery(api.telemetry.listStations, {});
  const personnel = useQuery(api.ops.listPersonnel, { slug });
  const summary = useQuery(api.ops.personnelSummary, { slug });
  const link = useStationLinkContext();

  const station = stations?.find((s) => s.slug === slug);

  const filtered = useMemo(() => {
    const rows = personnel ?? [];
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (sector !== "All sectors" && row.sector !== sector) return false;
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) ||
        row.role.toLowerCase().includes(needle) ||
        row.badgeId.toLowerCase().includes(needle)
      );
    });
  }, [personnel, query, sector]);

  const dutyBoard = useMemo(
    () =>
      SHIFTS.map((shift) => ({
        shift,
        members: (personnel ?? []).filter(
          (p) => p.dutyShift === shift && p.present,
        ).length,
        onDutyRoles: (personnel ?? [])
          .filter((p) => p.dutyShift === shift && p.present)
          .map((p) => p.role),
      })),
    [personnel],
  );

  const requestCheckIn = async () => {
    const target = (personnel ?? []).filter((p) => !p.present).length;
    await link.send(3, "check-in-request", `Roll call for ${target} field personnel`, {
      station: slug,
      requestedAt: Date.now(),
      personnel: (personnel ?? [])
        .filter((p) => !p.present)
        .map((p) => ({ badgeId: p.badgeId, uhfChannel: p.uhfChannel })),
    });
    toast.success(
      `Roll call queued for ${target} field personnel on the priority 3 channel`,
    );
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Station Dashboard"
          title={`${station?.name ?? "Station"} complement and roster`}
          description={`${station?.region ?? "Loading region"} - ${station ? `${Math.abs(station.latitude).toFixed(4)}S ${station.longitude.toFixed(4)}E, built ${station.builtYear}` : ""}. RFID badge state, UHF channel and medical clearance are shown for every member on station.`}
        >
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Radio className="mr-1 size-3" />
            {link.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void requestCheckIn()}>
            <ShieldCheck className="mr-1.5 size-3.5" />
            Roll call
          </Button>
        </PageHeading>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile
            label="On strength"
            value={summary?.total ?? 0}
            hint="roster entries on station"
          />
          <StatTile
            label="Present"
            value={summary?.present ?? 0}
            hint="badge scanned at station"
            tone="text-[#3EE07F]"
          />
          <StatTile
            label="In field"
            value={summary?.field ?? 0}
            hint="deployed beyond station limits"
            tone="text-[#4A9EFF]"
          />
          <StatTile
            label="Badge exceptions"
            value={summary?.expiredBadges ?? 0}
            hint="expired or unassigned RFID"
            tone={(summary?.expiredBadges ?? 0) > 0 ? "text-[#FFB020]" : "text-foreground"}
          />
          <StatTile
            label="Medical watch"
            value={summary?.medicalWatch ?? 0}
            hint="monitor or restricted clearance"
            tone={(summary?.medicalWatch ?? 0) > 0 ? "text-[#FFB020]" : "text-foreground"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {dutyBoard.map((board) => (
            <Panel
              key={board.shift}
              title={`${board.shift} shift`}
              action={
                <span className="cc-mono text-sm text-primary">{board.members} on duty</span>
              }
            >
              <div className="space-y-1.5">
                {board.onDutyRoles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No personnel posted to this shift.</p>
                ) : (
                  board.onDutyRoles.slice(0, 8).map((role) => (
                    <div
                      key={role}
                      className="flex items-center gap-2 border-b border-border pb-1 text-xs text-muted-foreground last:border-0"
                    >
                      <CheckCircle2 className="size-3 text-[#3EE07F]" />
                      {role}
                    </div>
                  ))
                )}
              </div>
            </Panel>
          ))}
        </div>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Personnel roster
            </span>
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search badge, name or role"
                className="h-8 w-56 rounded border border-border bg-background px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
              />
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          }
          bodyClassName="p-0"
        >
          {personnel === undefined ? (
            <PanelLoading height={260} />
          ) : filtered.length === 0 ? (
            <PanelEmpty message="No personnel match this filter." height={180} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="cc-label px-4 py-2">Badge</th>
                    <th className="cc-label px-4 py-2">Member</th>
                    <th className="cc-label px-4 py-2">Role</th>
                    <th className="cc-label px-4 py-2">Sector</th>
                    <th className="cc-label px-4 py-2">Shift</th>
                    <th className="cc-label px-4 py-2">RFID</th>
                    <th className="cc-label px-4 py-2">UHF</th>
                    <th className="cc-label px-4 py-2">Medical</th>
                    <th className="cc-label px-4 py-2">State</th>
                    <th className="cc-label px-4 py-2">Last sync</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row._id}
                      className="border-b border-border/60 transition-colors hover:bg-accent/40"
                    >
                      <td className="cc-mono px-4 py-2 text-foreground">{row.badgeId}</td>
                      <td className="px-4 py-2 text-foreground">{row.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{row.role}</td>
                      <td className="px-4 py-2 text-muted-foreground">{row.sector}</td>
                      <td className="cc-mono px-4 py-2 text-muted-foreground">{row.dutyShift}</td>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] uppercase", rfidClasses(row.rfidStatus))}
                        >
                          {row.rfidStatus}
                        </Badge>
                      </td>
                      <td className="cc-mono px-4 py-2 text-muted-foreground">{row.uhfChannel}</td>
                      <td className={cn("cc-mono px-4 py-2", medClasses(row.medStatus))}>
                        {row.medStatus}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "cc-mono text-[10px]",
                            row.present ? "text-[#3EE07F]" : "text-[#4A9EFF]",
                          )}
                        >
                          {row.present ? "ON STATION" : "IN FIELD"}
                        </span>
                      </td>
                      <td className="cc-mono px-4 py-2 text-muted-foreground">
                        {formatAge(row.lastSync)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {link.pending > 0 && (
          <p className="cc-mono text-[11px] text-muted-foreground">
            {link.pending} messages buffered in the station outbox awaiting the uplink window.
          </p>
        )}
        {personnel === undefined && (
          <div className="flex justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </AppShell>
  );
}
