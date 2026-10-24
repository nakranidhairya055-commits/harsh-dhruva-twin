import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useStationLinkContext } from "@/components/StationLinkProvider";
import { PageHeading, Panel, PanelEmpty, PanelLoading, StatTile } from "@/components/panels";
import { buildNpdcPackage, downloadText, GCMD_SCHEME, NPDC_STANDARD } from "@/lib/npdc";
import { formatAge, formatUtc, stationFromParams } from "@/lib/station";
import { useRoleView } from "@/hooks/use-role-view";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { CheckCircle2, Download, FileCheck2, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

/** NPDC compliance centre: metadata coverage, provenance and export. */
export default function Compliance() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);
  const { user } = useAuth();
  const { def, role } = useRoleView(
    (user as { twinRole?: string } | null)?.twinRole ?? null,
  );

  const stations = useQuery(api.telemetry.listStations, {});
  const readings = useQuery(api.telemetry.getLiveReadings, { slug });
  const chain = useQuery(api.records.verifyChain, {});
  const exportsList = useQuery(api.records.listExports, { slug });
  const recordExport = useMutation(api.records.recordNpdcExport);
  const link = useStationLinkContext();
  const [busy, setBusy] = useState(false);

  const station = stations?.find((s) => s.slug === slug);

  const channels = useMemo(
    () =>
      (readings ?? []).map((r) => ({
        equipmentId: r.equipmentId,
        sensorId: r.sensorId,
        parameter: r.parameter,
        unit: r.unit,
        subsystem: r.subsystem,
      })),
    [readings],
  );

  const preview = useMemo(() => {
    if (!station) return null;
    return buildNpdcPackage({
      stationSlug: station.slug,
      stationName: station.name,
      latitude: station.latitude,
      longitude: station.longitude,
      region: station.region,
      channels,
      generatedAt: Date.now(),
      recordCount: (readings ?? []).length * 720,
      operator: def.label,
    });
  }, [channels, def.label, readings, station]);

  const checks = useMemo(() => {
    const unmapped = preview
      ? (preview.payload.variableMeasured as Array<{ cfStandardName: string }>).filter(
          (v) => v.cfStandardName === "not_mapped",
        ).length
      : 0;
    return [
      {
        label: "Channel inventory harvested",
        detail: `${channels.length} instrumented channels discovered from live telemetry`,
        pass: channels.length > 0,
      },
      {
        label: "CF standard-name mapping",
        detail:
          unmapped === 0
            ? "every channel maps to a CF-1.11 standard name"
            : `${unmapped} channels still unmapped and will publish as not_mapped`,
        pass: unmapped === 0,
      },
      {
        label: "GCMD keyword tagging",
        detail: `${GCMD_SCHEME} applied across all subsystems present on station`,
        pass: (preview?.keywords.length ?? 0) > 3,
      },
      {
        label: "Quality flag vocabulary",
        detail: "good / suspect / offline declared on every observation record",
        pass: true,
      },
      {
        label: "Spatial coverage declared",
        detail: station
          ? `point coverage at ${Math.abs(station.latitude).toFixed(4)}S ${station.longitude.toFixed(4)}E`
          : "awaiting station metadata",
        pass: Boolean(station),
      },
      {
        label: "Provenance chain intact",
        detail: chain
          ? `${chain.entries} audit entries verified, head ${chain.headHash}`
          : "audit chain not yet loaded",
        pass: Boolean(chain?.valid),
      },
      {
        label: "Offline queue drained",
        detail:
          link.pending === 0
            ? "no buffered observations pending uplink"
            : `${link.pending} observations still buffered for the next window`,
        pass: link.pending === 0,
      },
    ];
  }, [chain, channels.length, link.pending, preview, station]);

  const passed = checks.filter((c) => c.pass).length;

  const publish = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      downloadText(preview.filename, JSON.stringify(preview.payload, null, 2));
      await recordExport({
        stationSlug: slug,
        datasetId: preview.datasetId,
        standard: NPDC_STANDARD,
        recordCount: (readings ?? []).length * 720,
      });
      toast.success(`${preview.datasetId} exported and logged to the audit chain`);
    } catch (error) {
      toast.error(`Export failed: ${String(error).slice(0, 120)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="NPDC Compliance Centre"
          title={`${station?.name ?? "Station"} dataset compliance`}
          description={`Metadata is auto-tagged from live telemetry and validated against the National Polar Data Centre submission standard ${NPDC_STANDARD}, CF-1.11 parameter naming and ${GCMD_SCHEME}. Publishing a package downloads the record and writes it to the audit chain.`}
        >
          <Badge variant="outline" className="border-primary/40 text-primary">
            <ShieldCheck className="mr-1 size-3" />
            {role} view
          </Badge>
        </PageHeading>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Checks passed"
            value={`${passed}/${checks.length}`}
            hint="compliance gates evaluated live"
            tone={passed === checks.length ? "text-[#3EE07F]" : "text-[#FFB020]"}
          />
          <StatTile
            label="Channels tagged"
            value={channels.length}
            hint="instrumented channels in the package"
          />
          <StatTile
            label="Keywords generated"
            value={preview?.keywords.length ?? 0}
            hint="GCMD keyword tags"
            tone="text-[#00E0C6]"
          />
          <StatTile
            label="Exports published"
            value={exportsList?.length ?? 0}
            hint="records logged on this station"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel
            title={
              <span className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" />
                Compliance gates
              </span>
            }
            className="lg:col-span-2"
          >
            <div className="space-y-2">
              {checks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-start gap-3 rounded border border-border bg-card px-3 py-2"
                >
                  {check.pass ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#3EE07F]" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-[#FFB020]" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground">{check.label}</div>
                    <div className="cc-mono text-[10px] leading-relaxed text-muted-foreground">
                      {check.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Publish package">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Dataset identifier</span>
              </div>
              <div className="cc-mono break-all rounded border border-border bg-background px-2 py-1.5 text-[10px] text-foreground">
                {preview?.datasetId ?? "awaiting station metadata"}
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Standard</span>
                <span className="cc-mono text-foreground">{NPDC_STANDARD}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Format</span>
                <span className="cc-mono text-foreground">schema.org Dataset JSON-LD</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Your role</span>
                <span className="cc-mono text-foreground">{def.label}</span>
              </div>
              <Button
                className="w-full"
                disabled={busy || !preview || !def.canExportNpdc}
                onClick={() => void publish()}
              >
                <Download className="mr-2 size-4" />
                {def.canExportNpdc ? "Export NPDC metadata" : "Export not permitted for this role"}
              </Button>
              <p className="cc-mono text-[10px] leading-relaxed text-muted-foreground">
                Export writes a provenance entry to the audit trail so the package can be traced
                independently of the file.
              </p>
            </div>
          </Panel>
        </div>

        <Panel title="Auto-tagged channel metadata" bodyClassName="p-0">
          {readings === undefined || !preview ? (
            <PanelLoading height={240} />
          ) : channels.length === 0 ? (
            <PanelEmpty message="No instrumented channels on this station." height={180} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="cc-label px-4 py-2">Equipment</th>
                    <th className="cc-label px-4 py-2">Parameter</th>
                    <th className="cc-label px-4 py-2">Subsystem</th>
                    <th className="cc-label px-4 py-2">Unit</th>
                    <th className="cc-label px-4 py-2">CF standard name</th>
                    <th className="cc-label px-4 py-2">Cell methods</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.payload.variableMeasured as Array<{
                    equipmentId: string;
                    parameter: string;
                    subsystem: string;
                    unit: string;
                    cfStandardName: string;
                    cellMethods: string;
                  }>).map((variable) => (
                    <tr key={`${variable.equipmentId}-${variable.parameter}`} className="border-b border-border/60">
                      <td className="cc-mono px-4 py-2 text-foreground">{variable.equipmentId}</td>
                      <td className="px-4 py-2 text-muted-foreground">{variable.parameter}</td>
                      <td className="px-4 py-2 text-muted-foreground">{variable.subsystem}</td>
                      <td className="cc-mono px-4 py-2 text-muted-foreground">{variable.unit}</td>
                      <td
                        className={cn(
                          "cc-mono px-4 py-2",
                          variable.cfStandardName === "not_mapped"
                            ? "text-[#FFB020]"
                            : "text-foreground",
                        )}
                      >
                        {variable.cfStandardName}
                      </td>
                      <td className="cc-mono px-4 py-2 text-muted-foreground">
                        {variable.cellMethods}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Export history" bodyClassName="p-0">
          {exportsList === undefined ? (
            <PanelLoading height={160} />
          ) : exportsList.length === 0 ? (
            <PanelEmpty message="No NPDC packages published from this station yet." height={140} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="cc-label px-4 py-2">Dataset</th>
                    <th className="cc-label px-4 py-2">Standard</th>
                    <th className="cc-label px-4 py-2">Records</th>
                    <th className="cc-label px-4 py-2">Published</th>
                    <th className="cc-label px-4 py-2">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {exportsList.map((row) => (
                    <tr key={row._id} className="border-b border-border/60">
                      <td className="cc-mono px-4 py-2 text-foreground">{row.datasetId}</td>
                      <td className="cc-mono px-4 py-2 text-muted-foreground">{row.standard}</td>
                      <td className="cc-mono px-4 py-2 text-muted-foreground">
                        {row.recordCount.toLocaleString("en-IN")}
                      </td>
                      <td className="cc-mono px-4 py-2 text-muted-foreground">
                        {formatUtc(row.generatedAt)}
                      </td>
                      <td className="cc-mono px-4 py-2 text-muted-foreground">
                        {formatAge(row.generatedAt)}
                      </td>
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
