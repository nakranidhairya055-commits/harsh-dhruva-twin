import type { StationSlug } from "@/lib/station";
import type { Collider2D } from "./interiors/plan-types";

/**
 * Walking the ground outside the station.
 *
 * The site is treated as one walkable apron: the station hull, the fuel farm
 * and the summer camp block you out, the sea and the oasis lake are fenced off
 * so nobody walks on water, and four slabs a quarter of a kilometre out keep a
 * walk on the map instead of running to the horizon.
 */

/** Where a site walk starts: on the apron, clear of the hull, facing it. */
export function siteSpawn(slug: StationSlug): [number, number, number] {
  return slug === "maitri" ? [0, 1.7, 42] : [0, 1.7, 30];
}

/** Axis-aligned block, in station metres. */
const block = (
  id: string,
  x: number,
  z: number,
  w: number,
  d: number,
): Collider2D => ({
  id,
  minX: x - w / 2,
  maxX: x + w / 2,
  minZ: z - d / 2,
  maxZ: z + d / 2,
});

/** Collision boxes for one station site. */
export function siteColliders(slug: StationSlug): Collider2D[] {
  const hull = slug === "maitri" ? { w: 37.6, d: 18.8 } : { w: 33.6, d: 43.6 };
  // Fuel farm and summer camp sit clear of the hull on both sites; the
  // coordinates match the hotspot the twin flies to for each of them.
  const fuel = slug === "maitri" ? { x: 42, z: 30 } : { x: -44, z: -12 };
  const camp = slug === "maitri" ? { x: -44, z: -12 } : { x: -12, z: -52 };

  return [
    block("hull", 0, 0, hull.w + 4, hull.d + 4),
    block("fuel-farm", fuel.x, fuel.z, 30, 22),
    block("summer-camp", camp.x, camp.z, 26, 20),
    // Water: Thala Fjord and Quilty Bay to the south of Bharati, the oasis
    // lake to the west of Maitri. Watching beats wading. The lake is fenced
    // in three steps rather than one box so the apron north of the hull stays
    // walkable.
    ...(slug === "bharati"
      ? [block("sea", 0, 180, 620, 292)]
      : [
          block("lake-west", -61, 26, 34, 44),
          block("lake-mid", -30, 26, 28, 44),
          block("lake-east", -6, 26, 20, 24),
        ]),
    // Site boundary, four slabs outside the 260 m walk radius.
    { id: "bound-n", minX: -320, maxX: 320, minZ: -320, maxZ: -260 },
    { id: "bound-s", minX: -320, maxX: 320, minZ: 260, maxZ: 320 },
    { id: "bound-w", minX: -320, maxX: -260, minZ: -260, maxZ: 260 },
    { id: "bound-e", minX: 260, maxX: 320, minZ: -260, maxZ: 260 },
  ];
}
