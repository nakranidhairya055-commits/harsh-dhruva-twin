import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Label3D } from "../twin-primitives";
import { Figure } from "./furniture";
import { INT, useInterior } from "./kit";
import { CREW, floorPlan, routePoints, type OccupantDef } from "./plans";

/**
 * Crew occupants.
 *
 * Every figure walks a fixed polyline derived from the floor plan — corridor
 * to room centre and back — so movement is repeatable and never crosses a
 * partition except at that room's own doorway. Each figure is clickable and
 * reports a profile with role, duty, shift and check-in state.
 */

const ROLE_LABEL: Record<OccupantDef["role"], string> = {
  commander: "Commander",
  scientist: "Scientist",
  engineer: "Engineer",
  medical: "Medical",
  logistics: "Logistics",
  operations: "Operations",
};

/** One figure walking its route. */
function Walker({
  def,
  points,
  speed,
  lateral,
}: {
  def: OccupantDef;
  points: Array<[number, number]>;
  speed: number;
  lateral: number;
}) {
  const group = useRef<THREE.Group>(null);
  const ctx = useInterior();
  const [hovered, setHovered] = useState(false);
  const progress = useRef(Math.random() * 1);

  // Cumulative segment lengths for constant-speed traversal.
  const segments = useMemo(() => {
    const out: Array<{ from: [number, number]; to: [number, number]; len: number }> = [];
    for (let i = 0; i < points.length; i++) {
      const from = points[i];
      const to = points[(i + 1) % points.length];
      out.push({ from, to, len: Math.hypot(to[0] - from[0], to[1] - from[1]) });
    }
    return out;
  }, [points]);

  const total = useMemo(() => segments.reduce((sum, s) => sum + s.len, 0), [segments]);

  useFrame((_, delta) => {
    if (!group.current || total < 0.1) return;
    progress.current = (progress.current + (speed * delta) / total) % 1;
    let travelled = progress.current * total;
    let seg = segments[0];
    for (const candidate of segments) {
      if (travelled <= candidate.len) {
        seg = candidate;
        break;
      }
      travelled -= candidate.len;
    }
    const t = seg.len > 0.001 ? travelled / seg.len : 0;
    const x = seg.from[0] + (seg.to[0] - seg.from[0]) * t;
    const z = seg.from[1] + (seg.to[1] - seg.from[1]) * t;
    const dx = seg.to[0] - seg.from[0];
    const dz = seg.to[1] - seg.from[1];
    const len = Math.hypot(dx, dz) || 1;
    // Lateral offset keeps figures from walking inside each other.
    group.current.position.set(x + (-dz / len) * lateral, 0, z + (dx / len) * lateral);
    group.current.rotation.y = Math.atan2(dx, dz);
  });

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        ctx?.onInspect?.({
          label: def.name,
          kind: "crew",
          room: ctx.room,
          level: def.level,
          detail: `${ROLE_LABEL[def.role]} - ${def.duty}`,
        });
      }}
    >
      <Figure p={[0, 0, 0]} rot={0} role={def.role} walking />
      {hovered && (
        <Label3D
          position={[0, 2.15, 0]}
          border={INT.trim}
          px={0.08}
          rows={[
            { text: def.name, color: INT.trim },
            { text: ROLE_LABEL[def.role], color: INT.screenBlue },
          ]}
        />
      )}
    </group>
  );
}

/** All crew assigned to one deck. */
export function Occupants({ slug, level }: { slug: string; level: number }) {
  const plan = floorPlan(slug, level);
  const roster = (CREW[slug] ?? []).filter((c) => c.level === level);
  if (!plan || roster.length === 0) return null;

  return (
    <group>
      {roster.map((def, i) => {
        const points = routePoints(plan, def.route.roomIds);
        if (points.length < 2) return null;
        const speed = 1.05 + (i % 3) * 0.12;
        return (
          <Walker
            key={def.id}
            def={def}
            points={points}
            speed={speed}
            lateral={i % 2 === 0 ? 0.5 : -0.5}
          />
        );
      })}
    </group>
  );
}

/** Crew roster for the console panels. */
export function crewFor(slug: string, level: number): OccupantDef[] {
  return (CREW[slug] ?? []).filter((c) => c.level === level);
}
