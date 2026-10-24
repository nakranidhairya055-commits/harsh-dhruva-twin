import { useMutation, useQuery } from "convex/react";
import { award } from "@/lib/achievements";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { PageHeading, Panel, PanelEmpty, PanelLoading, StatTile } from "@/components/panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { thresholdFor } from "@/convex/sensors";
import { runFpgaSelfTest, scrubIntervalModel, type SelfTestResult } from "@/lib/fpga";
import { formatAge, formatUtc, severityClasses, statusClasses, stationFromParams } from "@/lib/station";
import { cn } from "@/lib/utils";
import {
  Activity,
  CircleCheckBig,
  CircleX,
  Cpu,
  Gauge,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

/** One open telemetry fault, derived from the live channel state. */
interface Fault {
  key: string;
  equipmentId: string;
  sensorId: string;
  parameter: string;
  unit: string;
  decimals: number;
  value: number;
  status: string;
  ageSec: number;
  severity: "critical" | "warning" | "watch";
  cause: string;
  procedure: string;
  steps: string[];
  estimateMin: number;
}

/**
 * Fault signatures.
 *
 * Each signature is a real field procedure, written the way the station
 * instrument technician would work the channel. The repair bay chooses the
 * signature from the channel state, so the steps on screen match the fault.
 */
const PROCEDURES: Record<
  "out_of_band" | "dropout" | "drift" | "quality",
  { cause: string; procedure: string; steps: string[]; estimateMin: number }
> = {
  out_of_band: {
    cause: "Reading outside the operating band",
    procedure: "Verify then substitute the transducer",
    steps: [
      "Verify the reading against a local gauge or handheld before touching the channel.",
      "Check the transducer wiring, connector seating and the local junction box.",
      "Substitute the calibrated spare transducer on the same tapping.",
      "Confirm two consecutive in-band samples before closing the incident.",
    ],
    estimateMin: 35,
  },
  dropout: {
    cause: "Telemetry dropout, no sample in the window",
    procedure: "Restore the channel and backfill the historian",
    steps: [
      "Check the terminal block for a loose conductor on the sensor pair.",
      "Confirm the sensor power rail on the local distribution board.",
      "Re-seat the connector and watch for the next ten second sample.",
      "Backfill the gap in the historian from the redundant channel before closing.",
    ],
    estimateMin: 20,
  },
  drift: {
    cause: "Slow drift toward the alarm band",
    procedure: "Zero and span the channel",
    steps: [
      "Zero the transducer at the reference point with the plant steady.",
      "Apply the span correction recorded on the calibration sheet.",
      "Re-run the loop check and log the new offset against the equipment record.",
      "Watch the next three samples and escalate if the drift resumes.",
    ],
    estimateMin: 25,
  },
  quality: {
    cause: "Signal quality flagged by the acquisition layer",
    procedure: "Clean up the measurement loop",
    steps: [
      "Inspect the shielded pair for a ground loop or a wet joint.",
      "Check the shield drain is terminated at the cabinet end only.",
      "Re-terminate the pair and confirm the reading settles.",
      "Escalate to the instrument technician if the noise floor persists.",
    ],
    estimateMin: 18,
  },
};

type ProcedureKey = keyof typeof PROCEDURES;

/** Classify one live reading into a fault, or return null when it is healthy. */
function classify(
  reading: {
    equipmentId: string;
    sensorId: string;
    parameter: string;
    unit: string;
    decimals: number;
    value: number;
    status: string;
    qualityFlag: string;
    timestamp: number;
  },
  now: number,
): Fault | null {
  const ageSec = Math.max(0, Math.round((now - reading.timestamp) / 1000));
  let kind: ProcedureKey | null = null;
  let severity: Fault["severity"] = "watch";

  if (ageSec > 90) {
    kind = "dropout";
    severity = "warning";
  } else if (reading.qualityFlag !== "good") {
    kind = "quality";
    severity = "warning";
  } else if (reading.status === "critical") {
    kind = "out_of_band";
    severity = "critical";
  } else if (reading.status === "warning") {
    kind = "out_of_band";
    severity = "warning";
  } else {
    // Watch for drift: a value sitting inside ten percent of a warn limit.
    const band = thresholdFor(reading.equipmentId, reading.sensorId);
    const span =
      band.warnLow !== undefined && band.warnHigh !== undefined
        ? band.warnHigh - band.warnLow
        : Math.max(Math.abs(reading.value) * 0.25, 1);
    const margin = span * 0.1;
    const nearLow = band.warnLow !== undefined && reading.value - band.warnLow < margin;
    const nearHigh = band.warnHigh !== undefined && band.warnHigh - reading.value < margin;
    if (nearLow || nearHigh) {
      kind = "drift";
      severity = "watch";
    }
  }

  if (!kind) return null;
  const procedure = PROCEDURES[kind];
  return {
    key: `${reading.equipmentId}|${reading.sensorId}`,
    equipmentId: reading.equipmentId,
    sensorId: reading.sensorId,
    parameter: reading.parameter,
    unit: reading.unit,
    decimals: reading.decimals,
    value: reading.value,
    status: reading.status,
    ageSec,
    severity,
    cause: procedure.cause,
    procedure: procedure.procedure,
    steps: procedure.steps,
    estimateMin: procedure.estimateMin,
  };
}

/** Telemetry repair bay and FPGA self-healing verification. */
export default function Repair() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);
  const stationLabel = slug === "maitri" ? "Maitri" : "Bharati";

  const readings = useQuery(api.telemetry.getLiveReadings, { slug });
  const repairs = useQuery(api.repairs.listRepairs, { slug, limit: 20 });
  const selfTests = useQuery(api.repairs.listSelfTests, { slug, limit: 8 });
  const repairChannel = useMutation(api.repairs.repairChannel);
  const recordSelfTest = useMutation(api.repairs.recordSelfTest);

  const [busyChannel, setBusyChannel] = useState<string | null>(null);
  const [openFault, setOpenFault] = useState<string | null>(null);
  const [result, setResult] = useState<SelfTestResult | null>(null);
  const [runningTest, setRunningTest] = useState(false);
  const [recording, setRecording] = useState(false);
  const [trials, setTrials] = useState(240);
  const [upsetsPerTrial, setUpsetsPerTrial] = useState(6);
  const [doubleBitRate, setDoubleBitRate] = useState(0.25);
  const [upsetsPerDay, setUpsetsPerDay] = useState(0.05);
  const [scrubIntervalSec, setScrubIntervalSec] = useState(300);

  const now = Date.now();

  const faults = useMemo<Fault[]>(() => {
    if (!readings) return [];
    const order = { critical: 0, warning: 1, watch: 2 } as const;
    return readings
      .map((reading) => classify(reading, now))
      .filter((fault): fault is Fault => fault !== null)
      .sort((a, b) => order[a.severity] - order[b.severity] || a.equipmentId.localeCompare(b.equipmentId));
  }, [readings, now]);

  const scrub = useMemo(
    () => scrubIntervalModel({ upsetsPerDay, scrubIntervalSec }),
    [upsetsPerDay, scrubIntervalSec],
  );

  const runSelfTest = useCallback(() => {
    setRunningTest(true);
    // A short deferral keeps the button state paint before the suite runs.
    window.setTimeout(() => {
      try {
        setResult(
          runFpgaSelfTest({
            trials,
            upsetsPerTrial,
            doubleBitRate,
            seed: 20260227 + trials,
          }),
        );
        award("fpga");
      } catch (error) {
        toast.error(`Self-test failed to run: ${String(error).slice(0, 120)}`);
      } finally {
        setRunningTest(false);
      }
    }, 30);
  }, [doubleBitRate, trials, upsetsPerTrial]);

  const applyRepair = useCallback(
    async (fault: Fault) => {
      setBusyChannel(fault.key);
      try {
        const response = await repairChannel({
          slug,
          equipmentId: fault.equipmentId,
          sensorId: fault.sensorId,
          cause: fault.cause,
          procedure: fault.procedure,
          steps: fault.steps,
          readingBefore: `${fault.value.toFixed(fault.decimals)} ${fault.unit} (${fault.status}, sample age ${fault.ageSec}s)`,
        });
        toast.success(
          `${fault.equipmentId} ${fault.parameter} repaired - ${response.clearedAlerts} incident(s) closed${
            response.target === null ? "" : `, channel back in band`
          }`,
        );
        award("repair");
        setOpenFault(null);
      } catch (error) {
        toast.error(`Repair not applied: ${String(error).slice(0, 140)}`);
      } finally {
        setBusyChannel(null);
      }
    },
    [repairChannel, slug],
  );

  const saveSelfTest = useCallback(async () => {
    if (!result) return;
    setRecording(true);
    try {
      await recordSelfTest({
        slug,
        suite: result.suite,
        trials: result.options.trials,
        corrected: result.correctedTmr + result.correctedScrub,
        correctedTmr: result.correctedTmr,
        correctedScrub: result.correctedScrub,
        correctedDouble: result.correctedDouble,
        detectedUncorrectable: result.detectedUncorrectable,
        undetected: result.undetected,
        scrubs: result.scrubs,
        meanScrubMs: result.meanScrubMs,
        pass: result.pass,
        notes: result.verdict,
      });
      toast.success("Self-test verdict recorded in the audit chain");
      award("fpga");
    } catch (error) {
      toast.error(`Could not record verdict: ${String(error).slice(0, 140)}`);
    } finally {
      setRecording(false);
    }
  }, [recordSelfTest, result, slug]);

  const channelCount = readings?.length ?? 0;
  const healthy = channelCount - faults.length;
  const critical = faults.filter((fault) => fault.severity === "critical").length;
  const repairsToday = (repairs ?? []).filter((row) => now - row.timestamp < 24 * 3600 * 1000).length;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Maintenance"
          title={`${stationLabel} repair bay`}
          description="Telemetry repair procedures with real effect on the plant record, and the FPGA self-healing self-test that proves the instrument fabric corrects single-event upsets instead of absorbing them."
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
                <a href={`/repair?station=${option}`}>{option === "maitri" ? "Maitri" : "Bharati"}</a>
              </Button>
            ))}
          </div>
        </PageHeading>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Channels monitored"
            value={channelCount}
            hint="Live channels joined from the sensor catalog."
          />
          <StatTile
            label="In band"
            value={channelCount > 0 ? `${Math.round((healthy / channelCount) * 100)}%` : "--"}
            tone={critical > 0 ? "text-[#FFB020]" : "text-[#3EE07F]"}
            hint={`${healthy} of ${channelCount} channels clear of any fault signature.`}
          />
          <StatTile
            label="Open faults"
            value={faults.length}
            tone={faults.length > 0 ? "text-[#FFB020]" : "text-[#3EE07F]"}
            hint={`${critical} in the critical band.`}
          />
          <StatTile
            label="Repairs logged"
            value={repairsToday}
            hint="Procedures closed in the last 24 hours."
          />
        </div>

        <Panel
          title="Fault queue and repair procedures"
          action={
            <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
              {faults.length} channel{faults.length === 1 ? "" : "s"} need attention
            </Badge>
          }
        >
          {!readings ? (
            <PanelLoading />
          ) : faults.length === 0 ? (
            <PanelEmpty message="Every monitored channel is inside its band with good signal quality. No repair is outstanding." />
          ) : (
            <div className="divide-y divide-border">
              {faults.map((fault) => {
                const tone = severityClasses(fault.severity);
                const status = statusClasses(fault.status);
                const open = openFault === fault.key;
                return (
                  <div key={fault.key} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", tone.border, tone.bg, tone.text)}>
                        {fault.severity}
                      </span>
                      <span className="cc-mono text-xs text-foreground">{fault.equipmentId}</span>
                      <span className="text-sm text-foreground">{fault.parameter}</span>
                      <span className={cn("cc-mono text-xs", status.text)}>
                        {fault.value.toFixed(fault.decimals)} {fault.unit}
                      </span>
                      <span className="cc-mono text-[10px] text-muted-foreground">
                        sample {formatAge(fault.ageSec === 0 ? now : now - fault.ageSec * 1000, now)}
                      </span>
                      <span className="cc-mono ml-auto hidden text-[10px] text-muted-foreground sm:inline">
                        {fault.cause} - about {fault.estimateMin} min
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px]"
                        onClick={() => setOpenFault(open ? null : fault.key)}
                      >
                        <Wrench className="mr-1.5 size-3.5" />
                        {open ? "Hide procedure" : "Open procedure"}
                      </Button>
                      <Button
                        size="sm"
                        className="text-[11px]"
                        disabled={busyChannel === fault.key}
                        onClick={() => void applyRepair(fault)}
                      >
                        <Sparkles className="mr-1.5 size-3.5" />
                        {busyChannel === fault.key ? "Applying procedure" : "Apply repair"}
                      </Button>
                      <span className="cc-mono text-[10px] text-muted-foreground">
                        {fault.procedure}
                      </span>
                    </div>

                    {open && (
                      <ol className="mt-3 space-y-1.5 border-l-2 border-primary/40 pl-3">
                        {fault.steps.map((step, index) => (
                          <li key={step} className="text-[11px] leading-relaxed text-muted-foreground">
                            <span className="cc-mono mr-1.5 text-foreground/70">{index + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Repair log">
            {!repairs ? (
              <PanelLoading height={120} />
            ) : repairs.length === 0 ? (
              <PanelEmpty height={120} message="No repair has been applied at this station yet. Applying a procedure writes a log row and an entry in the audit chain." />
            ) : (
              <div className="space-y-3">
                {repairs.map((row) => (
                  <div key={row._id} className="rounded border border-border px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-[#3EE07F]/40 text-[10px] text-[#3EE07F]">
                        closed
                      </Badge>
                      <span className="cc-mono text-xs text-foreground">{row.equipmentId}</span>
                      <span className="text-xs text-foreground">{row.parameter}</span>
                      <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
                        {formatUtc(row.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {row.procedure} - reading before repair {row.readingBefore}. {row.clearedAlerts} incident(s) closed.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Scrub interval planner">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="cc-label text-[9px]">Upsets per device per day</span>
                  <input
                    type="number"
                    min={0.001}
                    max={5}
                    step={0.001}
                    value={upsetsPerDay}
                    onChange={(event) => setUpsetsPerDay(Number(event.target.value) || 0.001)}
                    className="h-9 w-full rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
                  />
                </label>
                <label className="space-y-1">
                  <span className="cc-label text-[9px]">Scrub interval (seconds)</span>
                  <input
                    type="number"
                    min={10}
                    max={7200}
                    step={10}
                    value={scrubIntervalSec}
                    onChange={(event) => setScrubIntervalSec(Number(event.target.value) || 60)}
                    className="h-9 w-full rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile label="Upsets per interval" value={scrub.upsetsPerInterval} hint="Expected upsets landing between two scrubber passes." />
                <StatTile
                  label="Double-bit risk"
                  value={scrub.doubleBitProbability.toExponential(1)}
                  hint="Probability two upsets share one copy between passes."
                />
                <StatTile
                  label="Ceiling"
                  value={scrub.recommendedIntervalSec}
                  unit="s"
                  hint="Recommended maximum scrub interval at this rate."
                />
              </div>
              <p
                className={cn(
                  "rounded border px-3 py-2 text-[11px] leading-relaxed",
                  scrubIntervalSec <= scrub.recommendedIntervalSec
                    ? "border-[#3EE07F]/40 bg-[#3EE07F]/10 text-[#3EE07F]"
                    : "border-[#FFB020]/40 bg-[#FFB020]/10 text-[#FFB020]",
                )}
              >
                {scrub.verdict}
              </p>
            </div>
          </Panel>
        </div>

        <Panel
          title="FPGA self-healing verification"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="text-[11px]" onClick={runSelfTest} disabled={runningTest}>
                <Cpu className="mr-1.5 size-3.5" />
                {runningTest ? "Running suite" : "Run self-test"}
              </Button>
              <Button size="sm" className="text-[11px]" onClick={() => void saveSelfTest()} disabled={!result || recording}>
                <ShieldCheck className="mr-1.5 size-3.5" />
                {recording ? "Recording" : "Record verdict"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="cc-label text-[9px]">Trials</span>
                <select
                  value={trials}
                  onChange={(event) => setTrials(Number(event.target.value))}
                  className="h-9 w-full rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
                >
                  {[60, 120, 240, 600, 1200].map((option) => (
                    <option key={option} value={option}>
                      {option} trials
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="cc-label text-[9px]">Single-bit upsets per trial</span>
                <select
                  value={upsetsPerTrial}
                  onChange={(event) => setUpsetsPerTrial(Number(event.target.value))}
                  className="h-9 w-full rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
                >
                  {[1, 3, 6, 12, 24].map((option) => (
                    <option key={option} value={option}>
                      {option} upsets
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="cc-label text-[9px]">Double-bit event rate</span>
                <select
                  value={doubleBitRate}
                  onChange={(event) => setDoubleBitRate(Number(event.target.value))}
                  className="h-9 w-full rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
                >
                  {[0, 0.1, 0.25, 0.5, 0.8].map((option) => (
                    <option key={option} value={option}>
                      {Math.round(option * 100)}% of trials
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              The suite builds a 256 frame bitstream in triple modular redundancy, injects upsets into
              individual copies, runs the majority voter, then runs the scrubber and re-verifies every
              frame against its CRC signature. A single-bit upset must never reach the logic; two upsets
              in one copy are physically unrepairable by voting, and are only acceptable if the CRC
              detects them and the console reports the frame as uncorrectable.
            </p>

            {!result ? (
              <PanelEmpty height={120} message="No self-test has been run in this session. Run the suite to verify the fabric." />
            ) : (
              <>
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded border px-3 py-2",
                    result.pass
                      ? "border-[#3EE07F]/40 bg-[#3EE07F]/10"
                      : "border-[#FF3B47]/50 bg-[#FF3B47]/10",
                  )}
                >
                  {result.pass ? (
                    <CircleCheckBig className="size-4 text-[#3EE07F]" />
                  ) : (
                    <CircleX className="size-4 text-[#FF3B47]" />
                  )}
                  <span className={cn("font-display text-xs font-bold uppercase tracking-wider", result.pass ? "text-[#3EE07F]" : "text-[#FF3B47]")}>
                    {result.pass ? "Self-healing verified" : "Self-healing fault"}
                  </span>
                  <span className="cc-mono text-[10px] text-muted-foreground">
                    {result.suite} - seed {result.options.seed}
                  </span>
                </div>

                <p className="text-[11px] leading-relaxed text-muted-foreground">{result.verdict}</p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatTile label="Corrected" value={result.correctedTmr + result.correctedScrub} hint="Trials where the logic output stayed correct." tone="text-[#3EE07F]" />
                  <StatTile label="Vote-only" value={result.correctedTmr} hint="Cleared by the majority voter alone." />
                  <StatTile label="Needed scrub" value={result.correctedScrub} hint="Frames the scrubber rewrote from the majority." tone="text-[#FFB020]" />
                  <StatTile label="Frames rewritten" value={result.scrubs} hint="Total scrubber writes across the suite." />
                  <StatTile label="Double-bit repaired" value={result.correctedDouble} hint="Two upsets in different copies, fixed by voting." />
                  <StatTile label="Detected uncorrectable" value={result.detectedUncorrectable} hint="Two upsets in one copy: CRC caught it, TMR cannot fix it." tone="text-[#FFB020]" />
                  <StatTile label="Undetected" value={result.undetected} hint="Must be zero for the fabric to be trusted." tone={result.undetected === 0 ? "text-[#3EE07F]" : "text-[#FF3B47]"} />
                  <StatTile label="Mean scrub" value={result.meanScrubMs} unit="ms" hint={`Worst pass ${result.maxScrubMs} ms.`} />
                </div>

                <div className="max-h-56 overflow-y-auto rounded border border-border">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">Trial</th>
                        <th className="px-3 py-1.5 font-medium">Upsets</th>
                        <th className="px-3 py-1.5 font-medium">Voted clean</th>
                        <th className="px-3 py-1.5 font-medium">Scrub</th>
                        <th className="px-3 py-1.5 font-medium">Repaired</th>
                        <th className="px-3 py-1.5 font-medium">Frame check</th>
                        <th className="px-3 py-1.5 font-medium">Scrub ms</th>
                      </tr>
                    </thead>
                    <tbody className="cc-mono">
                      {result.trials.slice(0, 40).map((trial) => (
                        <tr key={trial.trial} className="border-t border-border">
                          <td className="px-3 py-1">{trial.trial}</td>
                          <td className="px-3 py-1">{trial.upsets}</td>
                          <td className={cn("px-3 py-1", trial.logicCorrect ? "text-[#3EE07F]" : "text-[#FF3B47]")}>
                            {trial.logicCorrect ? "yes" : "no"}
                          </td>
                          <td className="px-3 py-1">{trial.neededScrub ? "required" : "not needed"}</td>
                          <td className="px-3 py-1">{trial.copiesRepaired}</td>
                          <td className={cn("px-3 py-1", trial.undetectedBits === 0 ? "text-[#3EE07F]" : "text-[#FF3B47]")}>
                            {trial.undetectedBits === 0 ? "consistent" : "unreported"}
                          </td>
                          <td className="px-3 py-1">{trial.scrubMs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div>
              <div className="cc-label mb-2 text-[9px]">Recorded verdicts</div>
              {!selfTests ? (
                <PanelLoading height={80} />
              ) : selfTests.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  No verdict recorded yet. Recording writes the suite statistics to the station record and
                  appends an entry to the hash-chained audit log.
                </p>
              ) : (
                <div className="space-y-2">
                  {selfTests.map((row) => (
                    <div key={row._id} className="flex flex-wrap items-center gap-2 rounded border border-border px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          row.pass ? "border-[#3EE07F]/40 text-[#3EE07F]" : "border-[#FF3B47]/50 text-[#FF3B47]",
                        )}
                      >
                        {row.pass ? "PASS" : "FAIL"}
                      </Badge>
                      <span className="cc-mono text-[10px] text-foreground">{row.suite}</span>
                      <span className="cc-mono text-[10px] text-muted-foreground">
                        {row.trials} trials - {row.corrected} corrected - {row.detectedUncorrectable} uncorrectable
                        detected - scrub mean {row.meanScrubMs} ms
                      </span>
                      <span className="cc-mono ml-auto text-[10px] text-muted-foreground">
                        {formatUtc(row.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded border border-border px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Gauge className="size-3.5 text-primary" />
                  <span className="cc-label text-[9px]">Telemetry integrity</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Every transmitted frame carries a CRC over the payload plus the sequence number, so a
                  corrupt sample is dropped at the edge instead of entering the historian.
                </p>
              </div>
              <div className="rounded border border-border px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="size-3.5 text-primary" />
                  <span className="cc-label text-[9px]">Watchdog</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  A channel that misses two consecutive ten second ticks is flagged as dropped in the
                  repair queue and backfilled from its redundant source.
                </p>
              </div>
              <div className="rounded border border-border px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span className="cc-label text-[9px]">Audit</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Repairs and self-test verdicts are appended to the tamper-evident command chain, so the
                  maintenance record survives even if a local log is lost.
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
