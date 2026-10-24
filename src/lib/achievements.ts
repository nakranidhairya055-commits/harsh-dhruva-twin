import { useSyncExternalStore } from "react";
import { toast } from "sonner";

/**
 * Field badge: the progression layer over the 3D twin.
 *
 * Progress lives in local storage so it survives a reload and works offline,
 * and every award comes from something the operator actually did - walked the
 * apron, worked through the rooms, watched the wildlife, ran a drill. The
 * store is a tiny external store so React components subscribe to it without
 * a context and without re-rendering the scene.
 */

export type AchievementGroup = "explore" | "wildlife" | "operations" | "resilience";

export interface AchievementDef {
  id: string;
  title: string;
  detail: string;
  xp: number;
  group: AchievementGroup;
}

export const GROUP_LABEL: Record<AchievementGroup, string> = {
  explore: "Explorer",
  wildlife: "Naturalist",
  operations: "Operator",
  resilience: "Resilience",
};

/** Every badge in the game, in the order the panel lists them. */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "inside",
    title: "Doorways and decks",
    detail: "Step inside a station and walk its corridors.",
    xp: 60,
    group: "explore",
  },
  {
    id: "site-walk-100",
    title: "Walkabout",
    detail: "Cover 100 m on foot outside the station.",
    xp: 80,
    group: "explore",
  },
  {
    id: "site-walk-500",
    title: "Perimeter patrol",
    detail: "Cover 500 m on foot around the site.",
    xp: 160,
    group: "explore",
  },
  {
    id: "rooms-10",
    title: "Room by room",
    detail: "Stand in ten different rooms.",
    xp: 120,
    group: "explore",
  },
  {
    id: "rooms-25",
    title: "Every deck",
    detail: "Stand in twenty-five different rooms.",
    xp: 220,
    group: "explore",
  },
  {
    id: "both-stations",
    title: "3,098 km apart",
    detail: "Visit both Maitri and Bharati.",
    xp: 200,
    group: "explore",
  },
  {
    id: "teleport",
    title: "Anywhere at once",
    detail: "Use the teleport menu to jump to a place.",
    xp: 40,
    group: "explore",
  },
  {
    id: "species-5",
    title: "Field naturalist",
    detail: "Open five different species cards.",
    xp: 130,
    group: "wildlife",
  },
  {
    id: "sighting",
    title: "Census keeper",
    detail: "Record a wildlife sighting to the station log.",
    xp: 110,
    group: "wildlife",
  },
  {
    id: "dev-outside",
    title: "With the flock",
    detail: "Stand with Dev Khandhediya outside.",
    xp: 110,
    group: "wildlife",
  },
  {
    id: "dev-desk",
    title: "The admin desk",
    detail: "Find Dev Khandhediya at his desk in the command room.",
    xp: 130,
    group: "wildlife",
  },
  {
    id: "tour",
    title: "Narrated survey",
    detail: "Watch three stops of the drone tour.",
    xp: 120,
    group: "operations",
  },
  {
    id: "cutaway",
    title: "Cut through the hull",
    detail: "Open the 2.5D isometric cutaway.",
    xp: 50,
    group: "operations",
  },
  {
    id: "resupply",
    title: "Supply line",
    detail: "Open the resupply voyage tracker.",
    xp: 60,
    group: "operations",
  },
  {
    id: "offline",
    title: "Outbox drained",
    detail: "Flush the offline queue to the broker.",
    xp: 100,
    group: "operations",
  },
  {
    id: "cascade",
    title: "Failure propagation",
    detail: "Run a cascade drill through the dependency graph.",
    xp: 160,
    group: "resilience",
  },
  {
    id: "repair",
    title: "Back in band",
    detail: "Apply a telemetry repair and close its incidents.",
    xp: 160,
    group: "resilience",
  },
  {
    id: "fpga",
    title: "Self-healing verified",
    detail: "Run the FPGA self-test and read the verdict.",
    xp: 160,
    group: "resilience",
  },
  {
    id: "advisor",
    title: "Second opinion",
    detail: "Generate an AI advisor briefing for a station.",
    xp: 120,
    group: "resilience",
  },
];

const XP_PER_LEVEL = 400;
const STORE_KEY = "dhruvatwin.field-badge.v1";

export interface FieldProgress {
  xp: number;
  /** id -> milliseconds since epoch when it was unlocked. */
  unlocked: Record<string, number>;
  /** Metres walked on foot outside the station. */
  walked: number;
  /** Room ids stood in. */
  rooms: string[];
  /** Station slugs visited. */
  stations: string[];
  /** Species ids whose card has been opened. */
  species: string[];
}

const EMPTY: FieldProgress = {
  xp: 0,
  unlocked: {},
  walked: 0,
  rooms: [],
  stations: [],
  species: [],
};

function read(): FieldProgress {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<FieldProgress>;
    return {
      xp: typeof parsed.xp === "number" ? parsed.xp : 0,
      unlocked: parsed.unlocked && typeof parsed.unlocked === "object" ? parsed.unlocked : {},
      walked: typeof parsed.walked === "number" ? parsed.walked : 0,
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
      stations: Array.isArray(parsed.stations) ? parsed.stations : [],
      species: Array.isArray(parsed.species) ? parsed.species : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

let progress: FieldProgress = typeof window === "undefined" ? { ...EMPTY } : read();
const listeners = new Set<() => void>();

function commit(): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(progress));
  } catch {
    // Private browsing or a full quota: the session still works, it just
    // will not remember the badge after a reload.
  }
  for (const listener of listeners) listener();
}

/** Read the badge progress without subscribing. */
export function getFieldProgress(): FieldProgress {
  return progress;
}

/** Subscribe to badge progress from a component. */
export function useFieldProgress(): FieldProgress {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getFieldProgress,
    getFieldProgress,
  );
}

/** Level implied by the current experience total. */
export function fieldLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/** Progress through the current level, 0 to 1. */
export function levelProgress(xp: number): number {
  return (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
}

function unlock(id: string): AchievementDef | null {
  const def = ACHIEVEMENTS.find((entry) => entry.id === id);
  if (!def || progress.unlocked[id]) return null;
  progress = {
    ...progress,
    xp: progress.xp + def.xp,
    unlocked: { ...progress.unlocked, [id]: Date.now() },
  };
  commit();
  return def;
}

/**
 * Award a badge. Returns the definition only when it was won on this call, so
 * callers can tell a new badge from one that was already held.
 */
export function award(id: string): AchievementDef | null {
  const def = unlock(id);
  if (def) {
    toast.success(`Field badge: ${def.title}`, {
      description: `+${def.xp} XP - ${def.detail}`,
      duration: 4200,
    });
  }
  return def;
}

/** Add metres walked outside, awarding the walking badges at their marks. */
export function recordDistance(metres: number): void {
  if (!(metres > 0)) return;
  const walked = progress.walked + metres;
  if (walked < progress.walked) return;
  progress = { ...progress, walked };
  commit();
  if (walked >= 500) award("site-walk-500");
  else if (walked >= 100) award("site-walk-100");
}

/** Record a room stood in, keeping the list distinct. */
export function recordRoom(roomId: string): void {
  if (!roomId || progress.rooms.includes(roomId)) return;
  const rooms = [...progress.rooms, roomId];
  progress = { ...progress, rooms };
  commit();
  if (rooms.length >= 25) award("rooms-25");
  else if (rooms.length >= 10) award("rooms-10");
}

/** Record a station visited and award the both-stations badge on the second. */
export function recordStation(slug: string): void {
  if (!slug || progress.stations.includes(slug)) return;
  const stations = [...progress.stations, slug];
  progress = { ...progress, stations };
  commit();
  if (stations.length >= 2) award("both-stations");
}

/** Record a species card opened. */
export function recordSpecies(speciesId: string): void {
  if (!speciesId || progress.species.includes(speciesId)) return;
  const species = [...progress.species, speciesId];
  progress = { ...progress, species };
  commit();
  if (species.length >= 5) award("species-5");
}

/** Reset everything, for a clean demo. */
export function resetFieldProgress(): void {
  progress = { ...EMPTY };
  commit();
}
