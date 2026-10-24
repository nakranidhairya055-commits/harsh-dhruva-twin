/**
 * Shared client helpers for the DhruvaTwin command centre.
 */

/** Stations instrumented in version 1. */
export const INSTRUMENTED_STATIONS = [
  { slug: "maitri", name: "Maitri", code: "MTQ" },
  { slug: "bharati", name: "Bharati", code: "BRT" },
] as const;

export type StationSlug = (typeof INSTRUMENTED_STATIONS)[number]["slug"];

/** Default station when no query param is present. */
export const DEFAULT_STATION: StationSlug = "maitri";

/** Parse a station slug from search params, falling back to the default. */
export function stationFromParams(
  params: URLSearchParams | null,
): StationSlug {
  const raw = params?.get("station");
  if (raw === "maitri" || raw === "bharati") return raw;
  return DEFAULT_STATION;
}

/** Project identity shown in chrome and footers. */
export const PROJECT_IDENTITY = {
  name: "DhruvaTwin",
  team: "HackFinity007",
  psId: "26060",
  theme: "Smart Automation",
  /** Programme category shown on the public poster. */
  category: "Software",
  /** Project title as submitted to the hackathon. */
  project: "DhruvaTwin",
  event: "Smart India Hackathon 2026",
  agency: "NCPOR - National Centre for Polar and Ocean Research, MoES",
} as const;

/** ISO-style UTC clock used across the command centre. */
export function formatUtc(ts: number | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  const pad = (n: number, size = 2) => String(n).padStart(size, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

/** Short HH:MM:SS UTC label for charts and feeds. */
export function formatTimeShort(ts: number | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** Relative "x s ago" label for feeds. */
export function formatAge(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/** Tailwind classes for sensor status chips. */
export function statusClasses(status: string): { text: string; bg: string; border: string; dot: string } {
  switch (status) {
    case "critical":
      return {
        text: "text-[#FF3B47]",
        bg: "bg-[#FF3B47]/10",
        border: "border-[#FF3B47]/40",
        dot: "bg-[#FF3B47]",
      };
    case "warning":
      return {
        text: "text-[#FFB020]",
        bg: "bg-[#FFB020]/10",
        border: "border-[#FFB020]/40",
        dot: "bg-[#FFB020]",
      };
    case "watch":
      return {
        text: "text-[#4A9EFF]",
        bg: "bg-[#4A9EFF]/10",
        border: "border-[#4A9EFF]/40",
        dot: "bg-[#4A9EFF]",
      };
    case "nominal":
      return {
        text: "text-[#3EE07F]",
        bg: "bg-[#3EE07F]/10",
        border: "border-[#3EE07F]/40",
        dot: "bg-[#3EE07F]",
      };
    default:
      return {
        text: "text-muted-foreground",
        bg: "bg-muted",
        border: "border-border",
        dot: "bg-muted-foreground",
      };
  }
}

/** Tailwind classes for alert severities. */
export function severityClasses(severity: string): { text: string; bg: string; border: string } {
  switch (severity) {
    case "critical":
      return { text: "text-[#FF3B47]", bg: "bg-[#FF3B47]/10", border: "border-[#FF3B47]/40" };
    case "warning":
      return { text: "text-[#FFB020]", bg: "bg-[#FFB020]/10", border: "border-[#FFB020]/40" };
    case "watch":
      return { text: "text-[#4A9EFF]", bg: "bg-[#4A9EFF]/10", border: "border-[#4A9EFF]/40" };
    default:
      return { text: "text-muted-foreground", bg: "bg-muted", border: "border-border" };
  }
}

/** Subsystem display labels. */
export const SUBSYSTEM_LABELS: Record<string, string> = {
  power: "Power",
  thermal: "Thermal",
  life_support: "Life Support",
  environment: "Environment",
  comms: "Comms",
  safety: "Safety",
};
