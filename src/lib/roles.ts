/**
 * Role-based views.
 *
 * Four roles see the console differently. The role view filters which screens
 * appear in navigation, which actions are offered and what the console
 * emphasises, so a station operator is not shown programme administration and
 * a scientist is not shown field emergency tooling.
 */

export type RoleView = "admin" | "commander" | "scientist" | "station";

export interface RoleViewDef {
  id: RoleView;
  label: string;
  summary: string;
  /** What this role is here to do, shown in the role banner. */
  focus: string;
  /** Route paths this role can open from navigation. */
  screens: string[];
  canSimulateBlackout: boolean;
  canExportNpdc: boolean;
  canModerate: boolean;
  canPublish: boolean;
}

export const ROLE_VIEWS: RoleViewDef[] = [
  {
    id: "admin",
    label: "Admin",
    summary: "Full platform administration across both stations.",
    focus:
      "User management, threshold governance, moderation and every operational screen on the platform.",
    screens: [
      "/dashboard",
      "/alerts",
      "/station",
      "/microgrid",
      "/environment",
      "/twin",
      "/antarctica",
      "/weather",
      "/library",
      "/compliance",
      "/expeditions",
      "/audit",
      "/catalog",
      "/workspace",
      "/admin",
    ],
    canSimulateBlackout: true,
    canExportNpdc: true,
    canModerate: true,
    canPublish: true,
  },
  {
    id: "commander",
    label: "Commander",
    summary: "Mission command across the station pair.",
    focus:
      "Cross-station picture, incident command, continuity drills, expedition movement and compliance sign-off.",
    screens: [
      "/dashboard",
      "/alerts",
      "/station",
      "/microgrid",
      "/environment",
      "/twin",
      "/antarctica",
      "/weather",
      "/compliance",
      "/expeditions",
      "/audit",
      "/catalog",
      "/workspace",
    ],
    canSimulateBlackout: true,
    canExportNpdc: true,
    canModerate: false,
    canPublish: true,
  },
  {
    id: "scientist",
    label: "Scientist",
    summary: "Observation, analysis and data curation.",
    focus:
      "Telemetry analysis, the twin view modes, environmental series, the NCPOR library and NPDC dataset publication.",
    screens: [
      "/dashboard",
      "/alerts",
      "/environment",
      "/microgrid",
      "/twin",
      "/antarctica",
      "/weather",
      "/library",
      "/compliance",
      "/expeditions",
      "/audit",
      "/catalog",
      "/workspace",
    ],
    canSimulateBlackout: false,
    canExportNpdc: true,
    canModerate: false,
    canPublish: true,
  },
  {
    id: "station",
    label: "Station",
    summary: "Winter-over station crew view.",
    focus:
      "Live telemetry, incident triage, roster and duty board, Antarctic Mode field tools and the local forecast.",
    screens: [
      "/dashboard",
      "/alerts",
      "/station",
      "/microgrid",
      "/twin",
      "/weather",
      "/antarctic",
      "/catalog",
      "/workspace",
    ],
    canSimulateBlackout: false,
    canExportNpdc: false,
    canModerate: false,
    canPublish: true,
  },
];

/** Look up a role definition, falling back to the scientist view. */
export function roleView(role: RoleView): RoleViewDef {
  return ROLE_VIEWS.find((r) => r.id === role) ?? ROLE_VIEWS[2];
}

/** Coerce an arbitrary stored or profile value to a known role view. */
export function toRoleView(value: unknown, fallback: RoleView = "scientist"): RoleView {
  return ROLE_VIEWS.some((r) => r.id === value) ? (value as RoleView) : fallback;
}
