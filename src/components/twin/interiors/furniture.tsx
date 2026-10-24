import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { Label3D } from "../twin-primitives";
import { Box, Cyl, INT, Interactive, Panel, Spinner, type OnInspect } from "./kit";

/**
 * Shared furniture composites.
 *
 * These are the pieces that repeat across stations — desks, bunks, lockers,
 * racking, chairs — kept in one place so both the operational rooms and the
 * living quarters are furnished from the same vocabulary.
 */

/* ------------------------------------------------------------------ */
/* Seat and surface pieces                                             */
/* ------------------------------------------------------------------ */

export type ChairKind = "task" | "dining" | "lounge" | "folding";

/** Office, dining or lounge chair. */
export function Chair({
  p,
  rot = 0,
  kind = "task",
  tone = INT.fabric,
}: {
  p: [number, number, number];
  rot?: number;
  kind?: ChairKind;
  tone?: string;
}) {
  const seatY = kind === "task" ? 0.46 : kind === "dining" ? 0.45 : 0.38;
  const backY = kind === "lounge" ? 0.72 : 0.86;
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, seatY, 0]} s={[0.48, 0.08, 0.46]} color={tone} roughness={0.85} />
      {kind !== "folding" && (
        <Box p={[0, seatY + backY / 2 + 0.04, -0.2]} s={[0.46, backY, 0.09]} color={tone} roughness={0.85} />
      )}
      <Cyl p={[0, seatY / 2, 0]} r={0.05} h={seatY} color={INT.dark} metalness={0.6} roughness={0.4} />
      <Cyl p={[0, 0.04, 0]} r={0.28} h={0.05} color={INT.dark} metalness={0.6} roughness={0.4} />
      {kind === "task" && (
        <Cyl p={[0, seatY - 0.1, 0]} r={0.05} h={0.06} axis="x" color={INT.dark} metalness={0.6} />
      )}
    </group>
  );
}

/** Plain table top on legs or a pedestal. */
export function Table({
  p,
  w,
  d,
  h = 0.74,
  rot = 0,
  tone = INT.wood,
  legs = 4,
}: {
  p: [number, number, number];
  w: number;
  d: number;
  h?: number;
  rot?: number;
  tone?: string;
  legs?: 2 | 4;
}) {
  const legPositions: Array<[number, number]> =
    legs === 4
      ? [
          [-w / 2 + 0.12, -d / 2 + 0.12],
          [w / 2 - 0.12, -d / 2 + 0.12],
          [-w / 2 + 0.12, d / 2 - 0.12],
          [w / 2 - 0.12, d / 2 - 0.12],
        ]
      : [
          [0, -d / 2 + 0.4],
          [0, d / 2 - 0.4],
        ];
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, h - 0.03, 0]} s={[w, 0.06, d]} color={tone} roughness={0.72} />
      {legPositions.map(([lx, lz], i) => (
        <Box key={i} p={[lx, (h - 0.06) / 2, lz]} s={[0.08, h - 0.06, 0.08]} color={INT.dark} metalness={0.6} roughness={0.4} />
      ))}
    </group>
  );
}

/** Wall or free-standing storage cabinet with visible door reveals. */
export function CabinetUnit({
  p,
  w,
  h,
  d = 0.5,
  rot = 0,
  doors = 2,
  tone = INT.steel,
  glass = false,
  label,
}: {
  p: [number, number, number];
  w: number;
  h: number;
  d?: number;
  rot?: number;
  doors?: number;
  tone?: string;
  glass?: boolean;
  label?: string;
}) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, h / 2, 0]} s={[w, h, d]} color={tone} metalness={0.45} roughness={0.5} />
      <Box p={[0, h / 2, d / 2 + 0.005]} s={[w - 0.08, h - 0.08, 0.02]} color={glass ? INT.glass : INT.dark} opacity={glass ? 0.5 : 1} roughness={0.4} />
      {Array.from({ length: doors - 1 }, (_, i) => {
        const x = -w / 2 + (w / doors) * (i + 1);
        return <Box key={i} p={[x, h / 2, d / 2 + 0.02]} s={[0.02, h - 0.12, 0.02]} color={INT.steel} metalness={0.7} />;
      })}
      {Array.from({ length: doors }, (_, i) => (
        <Cyl
          key={`h${i}`}
          p={[-w / 2 + (w / doors) * (i + 0.78), h / 2, d / 2 + 0.05]}
          r={0.016}
          h={0.16}
          color={INT.amber}
          metalness={0.8}
          roughness={0.3}
        />
      ))}
      {label && (
        <Label3D position={[0, h + 0.16, 0]} border={INT.trim} px={0.05} rows={[{ text: label, color: INT.trim }]} />
      )}
    </group>
  );
}

/** Open shelving bank with stocked levels. */
export function RackUnit({
  p,
  w,
  h,
  d = 0.5,
  rot = 0,
  levels = 4,
  tone = INT.metal,
  stocked = 0.75,
  label,
}: {
  p: [number, number, number];
  w: number;
  h: number;
  d?: number;
  rot?: number;
  levels?: number;
  tone?: string;
  stocked?: number;
  label?: string;
}) {
  const step = h / levels;
  return (
    <group position={p} rotation={[0, rot, 0]}>
      {[-1, 1].map((s) => (
        <Box key={s} p={[(s * (w - 0.06)) / 2, h / 2, 0]} s={[0.06, h, d]} color={tone} metalness={0.6} roughness={0.4} />
      ))}
      {Array.from({ length: levels + 1 }, (_, i) => (
        <Box key={i} p={[0, i * step, 0]} s={[w - 0.1, 0.04, d]} color={tone} metalness={0.6} roughness={0.4} />
      ))}
      {Array.from({ length: levels }, (_, i) =>
        i === 0
          ? null
          : Array.from({ length: Math.max(1, Math.round(stocked * 4)) }, (_, j) => (
              <Box
                key={`${i}-${j}`}
                p={[-w / 2 + 0.25 + j * ((w - 0.5) / Math.max(1, Math.round(stocked * 4))), i * step + 0.16, 0]}
                s={[0.34, 0.26, d * 0.7]}
                color={["#8A6A44", "#5A6C7C", "#B3402F", "#D6DDE2"][(i + j) % 4]}
                roughness={0.8}
              />
            )),
      )}
      {label && (
        <Label3D position={[0, h + 0.18, 0]} border={INT.trim} px={0.05} rows={[{ text: label, color: INT.trim }]} />
      )}
    </group>
  );
}

/** Bench seat with a rail of hooks; the vestibule and changing rooms use it. */
export function BenchSeat({
  p,
  length,
  rot = 0,
  hooks = 0,
  hookTone = INT.red,
}: {
  p: [number, number, number];
  length: number;
  rot?: number;
  hooks?: number;
  hookTone?: string;
}) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.44, 0]} s={[length, 0.08, 0.42]} color={INT.wood} roughness={0.8} />
      <Box p={[0, 0.22, 0]} s={[length, 0.06, 0.3]} color={INT.woodDark} roughness={0.85} />
      {[-length / 2 + 0.25, length / 2 - 0.25].map((x) => (
        <Box key={x} p={[x, 0.21, 0]} s={[0.12, 0.42, 0.36]} color={INT.dark} metalness={0.5} roughness={0.5} />
      ))}
      {hooks > 0 && (
        <Box p={[0, 2.05, -0.34]} s={[length, 0.08, 0.08]} color={INT.steel} metalness={0.8} roughness={0.3} />
      )}
      {Array.from({ length: hooks }, (_, i) => {
        const x = -length / 2 + (length / hooks) * (i + 0.5);
        return (
          <group key={`h${i}`} position={[x, 1.95, -0.3]}>
            <Cyl p={[0, -0.05, 0]} r={0.014} h={0.12} color={INT.steel} metalness={0.8} />
            {/* Expedition parka: body, hood and reflective band. */}
            <Box p={[0, -0.42, -0.05]} s={[0.44, 0.78, 0.2]} color={i % 3 === 0 ? INT.red : i % 3 === 1 ? INT.wallAccent : "#D8A017"} roughness={0.9} />
            <Box p={[0, -0.86, -0.04]} s={[0.34, 0.4, 0.18]} color={INT.dark} roughness={0.9} />
            <Box p={[0, -0.32, 0.06]} s={[0.42, 0.06, 0.02]} color={INT.trim} emissive={INT.trim} emissiveIntensity={0.6} />
          </group>
        );
      })}
    </group>
  );
}

/** Stackable supply crate. */
export function Crate({
  p,
  s = [0.6, 0.5, 0.6],
  rot = 0,
  tone = "#8A6A44",
}: {
  p: [number, number, number];
  s?: [number, number, number];
  rot?: number;
  tone?: string;
}) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, s[1] / 2, 0]} s={s} color={tone} roughness={0.85} />
      <Box p={[0, s[1] * 0.72, 0]} s={[s[0] * 1.02, 0.04, s[2] * 1.02]} color={INT.trim} emissive={INT.trim} emissiveIntensity={0.35} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Small devices                                                       */
/* ------------------------------------------------------------------ */

/** Analogue or digital clock on a wall. */
export function WallClock({
  p,
  rot = 0,
  utc = true,
}: {
  p: [number, number, number];
  rot?: number;
  utc?: boolean;
}) {
  const hand = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (hand.current) hand.current.rotation.z = -clock.elapsedTime * 0.12;
  });
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Cyl p={[0, 0, 0.03]} r={0.26} h={0.06} axis="z" color="#E8EEF4" metalness={0.4} roughness={0.4} />
      <mesh ref={hand} position={[0, 0, 0.07]}>
        <boxGeometry args={[0.02, 0.42, 0.01]} />
        <meshStandardMaterial color={INT.dark} />
      </mesh>
      <Box p={[0, 0, 0.07]} s={[0.28, 0.02, 0.01]} color={INT.dark} />
      <Label3D
        position={[0, -0.44, 0.08]}
        border={INT.trim}
        px={0.045}
        rows={[{ text: utc ? "UTC" : "IST", color: INT.trim }]}
      />
    </group>
  );
}

/** Dry-powder fire extinguisher on a bracket. */
export function Extinguisher({ p, rot = 0 }: { p: [number, number, number]; rot?: number }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Cyl p={[0, 0.34, 0]} r={0.11} h={0.62} color={INT.red} roughness={0.5} />
      <Cyl p={[0, 0.7, 0]} r={0.06} h={0.16} color={INT.dark} metalness={0.7} />
      <Box p={[0, 0.79, 0.06]} s={[0.16, 0.03, 0.03]} color={INT.dark} />
      <Box p={[0, 0, -0.04]} s={[0.2, 0.1, 0.06]} color={INT.dark} metalness={0.6} />
    </group>
  );
}

/** Insulated service pipe run with clamps, tagged by service colour. */
export function PipeRun({
  from,
  to,
  r = 0.09,
  tone = INT.trim,
  clamps = 3,
}: {
  from: [number, number, number];
  to: [number, number, number];
  r?: number;
  tone?: string;
  clamps?: number;
}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dy, dz);
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  const rotY = Math.atan2(dx, dz);
  const tilt = Math.atan2(dy, Math.hypot(dx, dz));
  return (
    <group position={mid} rotation={[0, rotY, 0]}>
      <mesh rotation={[Math.PI / 2 - tilt, 0, 0]}>
        <cylinderGeometry args={[r, r, len, 12]} />
        <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.35} roughness={0.45} metalness={0.5} />
      </mesh>
      {Array.from({ length: clamps }, (_, i) => {
        const t = (i + 1) / (clamps + 1);
        return (
          <group key={i} position={[dx * (t - 0.5), dy * (t - 0.5), dz * (t - 0.5)]}>
            <Cyl p={[0, 0, 0]} r={r + 0.03} h={0.06} axis="z" color={INT.steel} metalness={0.8} roughness={0.3} />
          </group>
        );
      })}
    </group>
  );
}

/** Overhead ventilation duct with hangers. */
export function CeilingDuct({
  p,
  length,
  rot = 0,
  w = 0.7,
  h = 0.5,
}: {
  p: [number, number, number];
  length: number;
  rot?: number;
  w?: number;
  h?: number;
}) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0, 0]} s={[w, h, length]} color={INT.metal} metalness={0.75} roughness={0.35} />
      {Array.from({ length: Math.max(2, Math.round(length / 3)) }, (_, i) => {
        const z = -length / 2 + (length / Math.max(2, Math.round(length / 3))) * (i + 0.5);
        return <Box key={i} p={[0, 0.4, z]} s={[0.06, 0.3, 0.06]} color={INT.steel} metalness={0.8} roughness={0.3} />;
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Workstations                                                        */
/* ------------------------------------------------------------------ */

/** Single operator monitor on a stand, optionally showing live data rows. */
export function Monitor({
  p,
  rot = 0,
  size = 0.62,
  tone = INT.screenCyan,
  rows,
}: {
  p: [number, number, number];
  rot?: number;
  size?: number;
  tone?: string;
  rows?: Array<{ text: string; color?: string }>;
}) {
  const flicker = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (flicker.current) {
      const m = flicker.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 1.05 + Math.sin(clock.elapsedTime * 3.4 + p[0]) * 0.14;
    }
  });
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.32, 0]} s={[0.1, 0.06, 0.1]} color={INT.dark} metalness={0.6} />
      <Cyl p={[0, 0.2, 0]} r={0.035} h={0.26} color={INT.dark} metalness={0.6} />
      <Box p={[0, 0.5, 0]} s={[size * 1.7, size, 0.05]} color={INT.veryDark} roughness={0.6} />
      <mesh ref={flicker} position={[0, 0.5, 0.03]}>
        <planeGeometry args={[size * 1.58, size * 0.9]} />
        <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={1.1} roughness={0.25} />
      </mesh>
      {rows && rows.length > 0 && (
        <Label3D
          position={[0, 0.5, 0.06]}
          border={tone}
          px={0.028}
          rows={rows.slice(0, 4)}
          renderOrder={20}
        />
      )}
    </group>
  );
}

/** Operator desk with two monitors, keyboard, footrest and a task chair. */
export function WorkstationDesk({
  p,
  rot = 0,
  tone = INT.desk,
  rows,
  label,
  seated = true,
}: {
  p: [number, number, number];
  rot?: number;
  tone?: string;
  rows?: Array<{ text: string; color?: string }>;
  label?: string;
  seated?: boolean;
}) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.72, 0]} s={[1.7, 0.06, 0.85]} color={INT.deskTop} roughness={0.5} metalness={0.35} />
      <Box p={[0, 0.5, -0.38]} s={[1.7, 0.42, 0.06]} color={tone} metalness={0.4} roughness={0.5} />
      {[-0.76, 0.76].map((x) => (
        <Box key={x} p={[x, 0.36, 0]} s={[0.08, 0.72, 0.8]} color={INT.dark} metalness={0.5} roughness={0.5} />
      ))}
      <Monitor p={[-0.42, 0.78, -0.2]} size={0.56} rows={rows} />
      <Monitor p={[0.42, 0.78, -0.2]} size={0.56} tone={INT.screenBlue} />
      <Box p={[0, 0.79, 0.22]} s={[0.46, 0.03, 0.16]} color={INT.veryDark} roughness={0.7} />
      <Cyl p={[0.78, 0.79, 0.2]} r={0.04} h={0.09} color={INT.red} roughness={0.6} />
      {label && (
        <Label3D position={[0, 1.5, 0]} border={INT.trim} px={0.06} rows={[{ text: label, color: INT.trim }]} />
      )}
      {seated && (
        <group position={[0, 0, 0.95]}>
          <Chair p={[0, 0, 0]} rot={Math.PI} kind="task" />
          <Figure p={[0, 0, 0]} rot={Math.PI} seated tone={INT.wallAccent} />
        </group>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Crew figures                                                        */
/* ------------------------------------------------------------------ */

const ROLE_TONE: Record<string, string> = {
  commander: "#FFB020",
  scientist: "#4A9EFF",
  engineer: "#FFD24A",
  medical: "#FF3B47",
  logistics: "#8FD98F",
  operations: "#00E0C6",
};

/** Role colour for a crew member. */
export function roleTone(role: string): string {
  return ROLE_TONE[role] ?? INT.trim;
}

/**
 * Low-poly crew figure: torso, head, arms and legs. Legs and arms swing when
 * walking; the same model is posed for sitting so desks and mess tables are
 * inhabited rather than empty.
 */
export function Figure({
  p,
  rot = 0,
  tone = INT.fabric,
  role,
  seated = false,
  walking = false,
  phase = 0,
}: {
  p: [number, number, number];
  rot?: number;
  tone?: string;
  role?: string;
  seated?: boolean;
  walking?: boolean;
  phase?: number;
}) {
  const legs = useRef<THREE.Group>(null);
  const arms = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 4.4 + phase;
    const swing = walking ? Math.sin(t) * 0.55 : seated ? 0.02 : 0;
    if (legs.current) {
      legs.current.children.forEach((child, i) => {
        child.rotation.x = i === 0 ? swing : -swing;
      });
    }
    if (arms.current) {
      arms.current.children.forEach((child, i) => {
        child.rotation.x = seated ? -0.9 : i === 0 ? -swing * 0.8 : swing * 0.8;
      });
    }
  });

  const bodyTone = role ? roleTone(role) : tone;
  const hipY = seated ? 0.44 : 0.86;

  return (
    <group position={p} rotation={[0, rot, 0]}>
      {/* Legs */}
      <group ref={legs}>
        {[-0.13, 0.13].map((x, i) => (
          <group key={i} position={[x, hipY, 0]}>
            <Box
              p={[0, seated ? 0 : -0.35, seated ? 0.28 : 0]}
              s={[0.17, seated ? 0.7 : 0.7, seated ? 0.68 : 0.17]}
              color={INT.dark}
              roughness={0.85}
            />
            <Box
              p={[0, seated ? -0.7 : -0.7, seated ? 0.55 : 0]}
              s={[0.17, 0.1, 0.28]}
              color={INT.veryDark}
              roughness={0.9}
            />
          </group>
        ))}
      </group>
      {/* Torso */}
      <Box p={[0, hipY + (seated ? 0.34 : 0.36), 0]} s={[0.46, 0.62, 0.26]} color={bodyTone} roughness={0.8} />
      <Box p={[0, hipY + (seated ? 0.28 : 0.3), 0.14]} s={[0.3, 0.4, 0.03]} color={INT.trim} emissive={INT.trim} emissiveIntensity={0.5} />
      {/* Arms */}
      <group ref={arms}>
        {[-0.31, 0.31].map((x, i) => (
          <group key={i} position={[x, hipY + (seated ? 0.56 : 0.58), 0]}>
            <Box p={[0, seated ? -0.24 : -0.24, seated ? 0.24 : 0]} s={[0.13, 0.5, 0.14]} color={bodyTone} roughness={0.85} />
          </group>
        ))}
      </group>
      {/* Head */}
      <group position={[0, hipY + (seated ? 0.74 : 0.8), 0]}>
        <Cyl p={[0, -0.06, 0]} r={0.07} h={0.1} color="#C9A98A" roughness={0.8} />
        <Box p={[0, 0.06, 0]} s={[0.2, 0.24, 0.21]} color="#D8B593" roughness={0.8} />
        <Box p={[0, 0.17, 0]} s={[0.23, 0.12, 0.24]} color={INT.red} roughness={0.85} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Sleeping and living pieces                                          */
/* ------------------------------------------------------------------ */

/** Two-tier bunk with ladder, mattress, pillow and reading lamp. */
export function Bunk({
  p,
  rot = 0,
  tone = INT.fabric,
  label,
}: {
  p: [number, number, number];
  rot?: number;
  tone?: string;
  label?: string;
}) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      {[-0.95, 0.95].map((z) => (
        <Box key={z} p={[0, 0.9, z]} s={[2.1, 1.8, 0.08]} color={INT.metal} metalness={0.7} roughness={0.35} />
      ))}
      {[0.42, 1.28].map((y) => (
        <group key={y}>
          <Box p={[0, y, 0]} s={[2.0, 0.12, 1.86]} color={INT.woodDark} roughness={0.8} />
          <Box p={[0, y + 0.14, 0]} s={[1.9, 0.16, 1.74]} color={INT.ceramic} roughness={0.9} />
          <Box p={[0.72, y + 0.2, 0]} s={[0.44, 0.1, 0.28]} color="#E8EEF4" roughness={0.95} />
          <Box p={[0, y + 0.22, 0]} s={[1.9, 0.14, 1.74]} color={tone} roughness={0.95} />
        </group>
      ))}
      {/* Ladder */}
      {[0, 1].map((i) => (
        <Cyl key={i} p={[-1.05, 0.85, i === 0 ? -0.5 : 0.5]} r={0.035} h={1.7} color={INT.metal} metalness={0.7} />
      ))}
      {[0.35, 0.75, 1.15].map((y) => (
        <Cyl key={y} p={[-1.05, y, 0]} r={0.026} h={1.0} axis="z" color={INT.metal} metalness={0.7} />
      ))}
      {label && (
        <Label3D position={[0, 1.96, 0]} border={INT.trim} px={0.055} rows={[{ text: label, color: INT.trim }]} />
      )}
    </group>
  );
}

/** Single bed for the shared dormitories. */
export function SingleBed({
  p,
  rot = 0,
  tone = INT.fabricAlt,
}: {
  p: [number, number, number];
  rot?: number;
  tone?: string;
}) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.28, -0.9]} s={[1.95, 0.9, 0.08]} color={INT.metal} metalness={0.65} roughness={0.4} />
      <Box p={[0, 0.28, 0.9]} s={[1.95, 0.55, 0.08]} color={INT.metal} metalness={0.65} roughness={0.4} />
      <Box p={[0, 0.4, 0]} s={[1.9, 0.16, 1.86]} color={INT.woodDark} roughness={0.8} />
      <Box p={[0, 0.5, 0]} s={[1.8, 0.14, 1.74]} color={tone} roughness={0.95} />
      <Box p={[0, 0.6, -0.7]} s={[0.5, 0.12, 0.3]} color="#E8EEF4" roughness={0.95} />
      {/* Reading lamp */}
      <Cyl p={[0.92, 0.85, -0.8]} r={0.03} h={0.6} color={INT.dark} metalness={0.6} />
      <Box p={[0.8, 1.14, -0.8]} s={[0.3, 0.05, 0.2]} color={INT.amber} emissive={INT.amber} emissiveIntensity={1.1} />
    </group>
  );
}

/** Personal locker with door, badge and louvred vent. */
export function Locker({
  p,
  rot = 0,
  h = 1.85,
  label,
  tone = INT.wallAccent,
}: {
  p: [number, number, number];
  rot?: number;
  h?: number;
  label?: string;
  tone?: string;
}) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, h / 2, 0]} s={[0.62, h, 0.5]} color={tone} metalness={0.4} roughness={0.5} />
      <Box p={[0.31, h / 2, 0]} s={[0.02, h - 0.08, 0.46]} color={INT.steel} metalness={0.7} />
      {Array.from({ length: 4 }, (_, i) => (
        <Box key={i} p={[0, h - 0.2 - i * 0.05, 0.26]} s={[0.4, 0.02, 0.02]} color={INT.dark} />
      ))}
      <Cyl p={[0.2, h / 2, 0.27]} r={0.018} h={0.12} color={INT.amber} metalness={0.8} />
      {label && (
        <Label3D position={[0, h + 0.2, 0]} border={INT.trim} px={0.05} rows={[{ text: label, color: INT.trim }]} />
      )}
    </group>
  );
}

/** Small desk with lamp and a personal effects shelf. */
export function PersonalDesk({
  p,
  rot = 0,
  lampOn = true,
  label,
}: {
  p: [number, number, number];
  rot?: number;
  lampOn?: boolean;
  label?: string;
}) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.72, 0]} s={[1.1, 0.05, 0.55]} color={INT.wood} roughness={0.75} />
      <Box p={[-0.5, 0.36, 0]} s={[0.06, 0.72, 0.5]} color={INT.woodDark} roughness={0.8} />
      <Box p={[0.5, 0.36, 0]} s={[0.06, 0.72, 0.5]} color={INT.woodDark} roughness={0.8} />
      <Box p={[0, 0.2, -0.2]} s={[1.0, 0.04, 0.2]} color={INT.wood} roughness={0.75} />
      <Cyl p={[-0.4, 0.92, -0.16]} r={0.02} h={0.36} color={INT.dark} metalness={0.6} />
      <Box p={[-0.4, 1.12, -0.1]} s={[0.22, 0.04, 0.16]} color={INT.amber} emissive={INT.amber} emissiveIntensity={lampOn ? 1.2 : 0.05} />
      <Box p={[0.36, 0.78, -0.14]} s={[0.3, 0.2, 0.03]} color="#E8EEF4" roughness={0.6} />
      <Box p={[-0.15, 0.77, 0.12]} s={[0.16, 0.02, 0.2]} color="#3A4650" roughness={0.6} />
      {label && (
        <Label3D position={[0, 1.36, 0]} border={INT.trim} px={0.05} rows={[{ text: label, color: INT.trim }]} />
      )}
    </group>
  );
}

/** Two-seat sofa with cushions. */
export function Sofa({ p, rot = 0, tone = INT.fabric }: { p: [number, number, number]; rot?: number; tone?: string }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.22, 0]} s={[2.1, 0.34, 0.9]} color={tone} roughness={0.92} />
      <Box p={[0, 0.6, -0.38]} s={[2.1, 0.62, 0.2]} color={tone} roughness={0.92} />
      {[-1.0, 1.0].map((x) => (
        <Box key={x} p={[x, 0.46, 0]} s={[0.18, 0.4, 0.9]} color={tone} roughness={0.92} />
      ))}
      {[-0.5, 0.5].map((x) => (
        <Box key={x} p={[x, 0.42, 0.06]} s={[0.92, 0.12, 0.78]} color={INT.fabricAlt} roughness={0.95} />
      ))}
      <Box p={[0, 0.06, 0]} s={[2.0, 0.12, 0.8]} color={INT.woodDark} roughness={0.85} />
    </group>
  );
}

/** Wall-mounted display for briefing and welfare content. */
export function WallScreen({
  p,
  rot = 0,
  w = 2.6,
  h = 1.5,
  tone = INT.screenBlue,
}: {
  p: [number, number, number];
  rot?: number;
  w?: number;
  h?: number;
  tone?: string;
}) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0, 0]} s={[w + 0.12, h + 0.12, 0.07]} color={INT.veryDark} roughness={0.6} />
      <Panel p={[0, 0, 0.05]} s={[w, h]} tone={tone} intensity={1.0} />
    </group>
  );
}

/** Toilet cubicle with cistern, seat and privacy partitions. */
export function Toilet({ p, rot = 0 }: { p: [number, number, number]; rot?: number }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.42, 0]} s={[0.4, 0.32, 0.62]} color={INT.ceramic} roughness={0.3} />
      <Box p={[0, 0.24, 0]} s={[0.34, 0.14, 0.5]} color={INT.ceramic} roughness={0.3} />
      <Box p={[0, 0.62, -0.24]} s={[0.44, 0.36, 0.12]} color={INT.ceramic} roughness={0.3} />
      <Box p={[0, 0, 0]} s={[0.42, 0.1, 0.64]} color={INT.ceramic} roughness={0.35} />
      <Cyl p={[0.16, 0.6, -0.24]} r={0.02} h={0.08} color={INT.metal} metalness={0.8} axis="z" />
      {[-0.6, 0.6].map((z) => (
        <Box key={z} p={[0.62, 1.1, z]} s={[0.05, 2.1, 0.05]} color={INT.metal} metalness={0.6} />
      ))}
    </group>
  );
}

/** Wash basin with mirror and soap dispenser. */
export function WashBasin({ p, rot = 0, taps = 1 }: { p: [number, number, number]; rot?: number; taps?: number }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.82, 0]} s={[Math.max(0.6, taps * 0.6), 0.12, 0.48]} color={INT.ceramic} roughness={0.3} />
      <Box p={[0, 0.72, 0]} s={[Math.max(0.5, taps * 0.5), 0.2, 0.34]} color={INT.ceramic} roughness={0.35} />
      {Array.from({ length: taps }, (_, i) => {
        const span = Math.max(0.6, taps * 0.6);
        const x = -span / 2 + (span / taps) * (i + 0.5);
        return (
          <group key={i} position={[x, 0, 0]}>
            <Cyl p={[0, 0.94, -0.14]} r={0.022} h={0.2} color={INT.metal} metalness={0.85} roughness={0.25} />
            <Cyl p={[0, 1.02, -0.08]} r={0.02} h={0.14} axis="z" color={INT.metal} metalness={0.85} />
          </group>
        );
      })}
      <mesh position={[0, 1.42, -0.24]}>
        <boxGeometry args={[Math.max(0.55, taps * 0.6), 0.7, 0.04]} />
        <meshStandardMaterial color="#BFD3E0" metalness={0.9} roughness={0.12} />
      </mesh>
      <Box p={[Math.max(0.6, taps * 0.6) / 2 + 0.1, 1.16, -0.16]} s={[0.1, 0.2, 0.1]} color={INT.steel} roughness={0.5} />
    </group>
  );
}

/** Shower stall with screen, head and drainage grate. */
export function Shower({ p, rot = 0 }: { p: [number, number, number]; rot?: number }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Box p={[0, 0.06, 0]} s={[1.0, 0.12, 1.0]} color={INT.ceramic} roughness={0.35} />
      {[[0, -0.5, 1.0, 0.05], [0, 0.5, 1.0, 0.05], [-0.5, 0, 0.05, 1.0]].map((g, i) => (
        <Box key={i} p={[g[0], 1.1, g[1]]} s={[g[2], 2.0, g[3]]} color={INT.glass} opacity={0.22} roughness={0.1} />
      ))}
      <Cyl p={[0.3, 1.9, -0.3]} r={0.03} h={0.4} color={INT.metal} metalness={0.85} />
      <Box p={[0.3, 2.06, -0.18]} s={[0.22, 0.05, 0.22]} color={INT.metal} metalness={0.85} />
      <Box p={[0, 0.13, 0]} s={[0.26, 0.02, 0.26]} color={INT.dark} />
    </group>
  );
}

/** Garden variety interior plant, used to soften the living deck. */
export function Plant({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <Cyl p={[0, 0.2, 0]} r={0.22} h={0.4} color="#8A5A3A" roughness={0.85} />
      <Cyl p={[0, 0.48, 0]} r={0.04} h={0.3} color="#3E6B3A" />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.6) * 0.16, 0.66 + i * 0.08, Math.sin(i * 1.6) * 0.16]} rotation={[0.5, i, 0.3]}>
          <boxGeometry args={[0.28, 0.05, 0.14]} />
          <meshStandardMaterial color="#4E8C46" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** A steady reading of the room, used by the training and rec areas. */
export function SpinningFan({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <Cyl p={[0, 0.3, 0]} r={0.05} h={0.6} color={INT.dark} metalness={0.6} />
      <Spinner speed={6}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
            <boxGeometry args={[0.7, 0.02, 0.16]} />
            <meshStandardMaterial color={INT.metal} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </Spinner>
    </group>
  );
}

export type { OnInspect };
