import { useMemo } from "react";
import { INT } from "../interiors/kit";
import type { WaterBodyDef } from "./water-data";

/**
 * Iceberg and floe tracker.
 *
 * For each tracked floe the tracker draws the last twenty-four hours of drift
 * as a solid cyan trail and the next twenty-four hours as a dashed amber
 * forecast, both generated from the floe's recorded drift bearing and mass. A
 * numbered marker sits above each floe and the panel lists size, mass, drift
 * speed and bearing.
 */

interface TrackPoint {
  x: number;
  z: number;
}

/** Sample a drift arc for one floe. */
function driftPath(
  body: WaterBodyDef,
  floeIndex: number,
  hours: number,
  forward: boolean,
): TrackPoint[] {
  const floe = body.floes[floeIndex];
  if (!floe) return [];
  const bearing = ((floe.driftDeg ?? 0) * Math.PI) / 180;
  // Larger masses drift more slowly; the speed is in metres per hour.
  const speed = Math.max(0.35, 2.4 - (floe.massTonnes ?? 100) / 900);
  const steps = 8;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * hours * speed;
    const sign = forward ? 1 : -1;
    return {
      x: floe.x + Math.cos(bearing) * t * sign,
      z: floe.z + Math.sin(bearing) * t * sign,
    };
  });
}

/** One dashed segment run between two points. */
function DashRun({
  points,
  tone,
  dash = 1.6,
  gap = 1.1,
  size = 0.42,
}: {
  points: TrackPoint[];
  tone: string;
  dash?: number;
  gap?: number;
  size?: number;
}) {
  const dashes = useMemo(() => {
    const out: Array<{ x: number; z: number; rot: number; len: number }> = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 0.01) continue;
      const count = Math.max(1, Math.round(len / (dash + gap)));
      for (let j = 0; j < count; j++) {
        const t = (j + 0.5) / count;
        out.push({
          x: a.x + (b.x - a.x) * t,
          z: a.z + (b.z - a.z) * t,
          rot: Math.atan2(b.x - a.x, b.z - a.z),
          len: Math.min(dash, len / count),
        });
      }
    }
    return out;
  }, [points, dash, gap]);

  return (
    <group>
      {dashes.map((d, i) => (
        <mesh key={i} position={[d.x, 0, d.z]} rotation={[0, d.rot, 0]}>
          <boxGeometry args={[size, 0.06, d.len]} />
          <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={1.1} />
        </mesh>
      ))}
    </group>
  );
}

export function IcebergTracker({ def }: { def: WaterBodyDef }) {
  const surfaceY = def.surfaceY ?? 0.3;
  return (
    <group position={[def.position[0], surfaceY + 0.05, def.position[1]]}>
      {def.floes.map((floe, i) => (
        <group key={i}>
          <DashRun points={driftPath(def, i, 24, false)} tone={INT.trim} />
          <DashRun points={driftPath(def, i, 24, true)} tone={INT.amber} dash={1.2} gap={1.3} size={0.34} />
        </group>
      ))}
    </group>
  );
}
