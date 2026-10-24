import { useFrame } from "@react-three/fiber";
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import {
  dismissLabel,
  pinLabel,
  useHoverHold,
  useLabelPinned,
  useLabelSuppressed,
} from "../scene-labels";
import { Label3D, TWIN_COLORS } from "../twin-primitives";
import { DOOR_H, SLAB_T, type DoorDef, type FloorFinish, type FloorPlan, type RoomDef } from "./plan-types";

/**
 * Interior kit.
 *
 * Every fixture in both stations — desks, monitors, bunk beds, generator
 * blocks, microscope benches, sauna stoves, ladder rungs — is assembled from
 * these primitives, so the interiors share one material language and one
 * interaction model: anything wrapped in `Interactive` becomes clickable and
 * opens a live detail panel.
 */

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

export const INT = {
  floorMetal: "#46515C",
  floorCarpet: "#2A3644",
  floorTile: "#B4C3CE",
  floorConcrete: "#6B7178",
  floorWood: "#8A6A44",
  wall: "#D2DBE2",
  wallAccent: "#27415C",
  ceiling: "#C3CED6",
  trim: "#00E0C6",
  desk: "#78848F",
  deskTop: "#93A0AB",
  dark: "#1C2733",
  veryDark: "#121A24",
  screenCyan: "#00E0C6",
  screenBlue: "#4A9EFF",
  screenAmber: "#FFB020",
  fabric: "#33506E",
  fabricAlt: "#5A4A64",
  wood: "#8A6A44",
  woodDark: "#5E472C",
  metal: "#9AA6B0",
  steel: "#B9C4CC",
  pole: "#8A949E",
  rubber: "#2B333C",
  ceramic: "#E4EDF3",
  glass: "#7FB4E8",
  red: "#FF3B47",
  green: "#3EE07F",
  amber: "#FFB020",
} as const;

const FINISH: Record<FloorFinish, { color: string; roughness: number; metalness: number }> = {
  metal: { color: INT.floorMetal, roughness: 0.55, metalness: 0.45 },
  carpet: { color: INT.floorCarpet, roughness: 0.98, metalness: 0 },
  tile: { color: INT.floorTile, roughness: 0.32, metalness: 0.05 },
  concrete: { color: INT.floorConcrete, roughness: 0.92, metalness: 0.02 },
  wood: { color: INT.floorWood, roughness: 0.78, metalness: 0.02 },
};

/* ------------------------------------------------------------------ */
/* Mesh helpers                                                        */
/* ------------------------------------------------------------------ */

export interface MatOpts {
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  transparent?: boolean;
  side?: THREE.Side;
  flat?: boolean;
}

function matProps(m: MatOpts) {
  return {
    color: m.color ?? INT.metal,
    emissive: m.emissive ?? "#000000",
    emissiveIntensity: m.emissiveIntensity ?? 0,
    metalness: m.metalness ?? 0.25,
    roughness: m.roughness ?? 0.6,
    transparent: m.transparent ?? (m.opacity !== undefined && m.opacity < 1),
    opacity: m.opacity ?? 1,
    side: m.side ?? THREE.FrontSide,
  };
}

/** Axis-aligned box. */
export function Box({
  p,
  s,
  rot,
  ...m
}: { p: [number, number, number]; s: [number, number, number]; rot?: [number, number, number] } & MatOpts) {
  return (
    <mesh position={p} rotation={rot ?? [0, 0, 0]} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial {...matProps(m)} />
    </mesh>
  );
}

/** Cylinder, optionally laid on its side. */
export function Cyl({
  p,
  r,
  h,
  axis = "y",
  seg = 14,
  ...m
}: {
  p: [number, number, number];
  r: number;
  h: number;
  axis?: "x" | "y" | "z";
  seg?: number;
} & MatOpts) {
  const rot: [number, number, number] =
    axis === "y" ? [0, 0, 0] : axis === "x" ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, seg]} />
      <meshStandardMaterial {...matProps(m)} />
    </mesh>
  );
}

/** Emissive flat panel used for screens, windows and light diffusers. */
export function Panel({
  p,
  s,
  rot,
  tone,
  intensity = 1.2,
  ...m
}: {
  p: [number, number, number];
  s: [number, number];
  rot?: [number, number, number];
  tone: string;
  intensity?: number;
} & MatOpts) {
  return (
    <mesh position={p} rotation={rot ?? [0, 0, 0]}>
      <planeGeometry args={s} />
      <meshStandardMaterial
        {...matProps({
          ...m,
          emissive: tone,
          emissiveIntensity: intensity,
          roughness: 0.2,
          metalness: 0.05,
        })}
        color={m.color ?? tone}
      />
    </mesh>
  );
}

/** A rotating element driven by a speed in radians per second. */
export function Spinner({
  axis = "y",
  speed = 4,
  children,
}: {
  axis?: "x" | "y" | "z";
  speed?: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation[axis] += delta * speed;
  });
  return <group ref={ref}>{children}</group>;
}

/* ------------------------------------------------------------------ */
/* Interaction model                                                   */
/* ------------------------------------------------------------------ */

/** What gets reported when the operator clicks an interior object. */
export interface InspectTarget {
  label: string;
  /** Furniture class key used to look up panel data. */
  kind: string;
  room: string;
  /** Equipment tag linking the object to live telemetry, when it has one. */
  tag?: string;
  /** Short static description shown under the heading. */
  detail?: string;
  level: number;
}

export type OnInspect = (target: InspectTarget) => void;

interface InteriorContextValue {
  room: string;
  level: number;
  onInspect?: OnInspect;
  lightsOn: boolean;
  toggleLights: () => void;
}

const InteriorContext = createContext<InteriorContextValue | null>(null);

/** Access the enclosing room context. */
export function useInterior() {
  return useContext(InteriorContext);
}

/**
 * Wrap a fixture so it becomes clickable and reports itself to the console.
 * The floating name label appears on hover, drawn in-canvas as a sprite.
 */
export function Interactive({
  label,
  kind,
  tag,
  detail,
  labelHeight = 1.35,
  position,
  rotation,
  children,
}: {
  label: string;
  kind: string;
  tag?: string;
  detail?: string;
  labelHeight?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  children: ReactNode;
}) {
  const ctx = useInterior();
  // Short hold in here: rooms are dense, so a long grace period would leave
  // several name plates standing over the deck at once.
  const { hovered, over, out } = useHoverHold(900);
  const pinId = `fixture:${ctx?.level ?? 0}:${ctx?.room ?? "deck"}:${label}`;
  const pinned = useLabelPinned(pinId);
  const suppressed = useLabelSuppressed(pinId);
  return (
    <group
      position={position ?? [0, 0, 0]}
      rotation={rotation ?? [0, 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        over();
        if (ctx?.onInspect) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        out();
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        ctx?.onInspect?.({
          label,
          kind,
          tag,
          detail,
          room: ctx.room,
          level: ctx.level,
        });
        // Clicking a fixture pins its name in the room. A pinned label shows
        // a red cross that removes it again, so the label is the operator's
        // choice rather than a default, and a click always brings it back.
        pinLabel(pinId);
      }}
    >
      {children}
      {(hovered || pinned) && !suppressed && (
        <Label3D
          position={[0, labelHeight, 0]}
          border={INT.trim}
          px={0.11}
          rows={[
            { text: label, color: INT.trim },
            ...(tag ? [{ text: tag, color: "#8FA0B2" }] : []),
          ]}
          onDismiss={() => dismissLabel(pinId)}
          requested={pinned}
        />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Room shell: slab, ceiling, lights, switch, name plate               */
/* ------------------------------------------------------------------ */

/** Ceiling strip light and its associated point light. */
function CeilingLight({
  position,
  length,
  on,
  color = "#F0F6FF",
  power = 30,
  cast = true,
}: {
  position: [number, number, number];
  length: number;
  on: boolean;
  color?: string;
  /** Luminous power of the fixture, shared out from the room's budget. */
  power?: number;
  /** Only some fixtures mount a real light; the rest stay emissive strips. */
  cast?: boolean;
}) {
  return (
    <group position={position}>
      <Panel
        p={[0, -0.02, 0]}
        s={[length, 0.34]}
        rot={[Math.PI / 2, 0, 0]}
        tone={color}
        intensity={on ? 1.5 : 0.04}
        color={on ? color : "#6B7A8F"}
      />
      <Box p={[0, 0.12, 0]} s={[length + 0.12, 0.12, 0.42]} color={INT.steel} metalness={0.7} roughness={0.35} />
      {/* Always mounted, intensity driven: keeps the light count stable so the
          shader is never recompiled when a room switch is thrown. */}
      {cast && (
        <pointLight
          position={[0, -1.2, 0]}
          intensity={on ? power : 0}
          distance={length * 1.8 + 6}
          decay={2}
          color={color}
        />
      )}
    </group>
  );
}

/** Wall switch beside a doorway. */
function LightSwitch({
  position,
  rotation,
  on,
  onToggle,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  on: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <group
      position={position}
      rotation={rotation}
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
        onToggle();
      }}
    >
      <Box p={[0, 0, 0.01]} s={[0.16, 0.24, 0.03]} color="#E8EEF4" roughness={0.4} />
      <Box
        p={[0, on ? 0.04 : -0.04, 0.035]}
        s={[0.1, 0.1, 0.02]}
        color={on ? INT.trim : INT.dark}
        emissive={on ? INT.trim : "#000000"}
        emissiveIntensity={on ? 1.2 : 0}
      />
      {hovered && (
        <Label3D
          position={[0, 0.5, 0.1]}
          border={INT.trim}
          px={0.06}
          rows={[{ text: on ? "Lights off" : "Lights on", color: INT.trim }]}
        />
      )}
    </group>
  );
}

/** Floor slab, ceiling slab, lighting, light switch and room name plate. */
export function RoomShell({
  room,
  plan,
  lightsOn,
  onToggleLights,
  showCeiling = true,
  children,
}: {
  room: RoomDef;
  plan: FloorPlan;
  lightsOn: boolean;
  onToggleLights: () => void;
  /** Ceiling slabs are hidden for the deck-plan overview. */
  showCeiling?: boolean;
  children: ReactNode;
}) {
  const finish = FINISH[room.floor ?? "metal"];
  const plate = room.plate ?? "n";
  const platePos: [number, number, number] =
    plate === "n"
      ? [room.x, plan.y + plan.height - 0.5, room.z - room.d / 2 + 0.14]
      : plate === "s"
        ? [room.x, plan.y + plan.height - 0.5, room.z + room.d / 2 - 0.14]
        : plate === "w"
          ? [room.x - room.w / 2 + 0.14, plan.y + plan.height - 0.5, room.z]
          : [room.x + room.w / 2 - 0.14, plan.y + plan.height - 0.5, room.z];

  const door = room.doors[0];
  const switchOffset = (door?.offset ?? 0) + 0.95;
  const switchPos = useMemo<[number, number, number]>(() => {
    const side = door?.side ?? "n";
    switch (side) {
      case "n":
        return [room.x + switchOffset, plan.y + 0.8, room.z - room.d / 2 + 0.14];
      case "s":
        return [room.x + switchOffset, plan.y + 0.8, room.z + room.d / 2 - 0.14];
      case "w":
        return [room.x - room.w / 2 + 0.14, plan.y + 0.8, room.z + switchOffset];
      default:
        return [room.x + room.w / 2 - 0.14, plan.y + 0.8, room.z + switchOffset];
    }
  }, [door?.side, room.x, room.z, room.w, room.d, switchOffset, plan.y]);

  const switchRot = useMemo<[number, number, number]>(() => {
    switch (door?.side ?? "n") {
      case "n":
        return [0, Math.PI, 0];
      case "w":
        return [0, Math.PI / 2, 0];
      case "e":
        return [0, -Math.PI / 2, 0];
      default:
        return [0, 0, 0];
    }
  }, [door?.side]);

  const lightRows = Math.max(1, Math.round(room.w / 4));
  // Every extra point light is a per-fragment loop paid by the whole deck, so
  // only the first few fixtures in a row actually cast one. Bharati's
  // fourteen-metre modules would otherwise mount over fifty lights at once.
  // The dropped strips stay emissive, and the survivors carry their share of
  // the power, so the room keeps its brightness for a fraction of the cost.
  const litRows = Math.min(lightRows, room.w > 24 ? 3 : 2);
  const lit = new Set(
    Array.from({ length: litRows }, (_, k) =>
      litRows === 1 ? 0 : Math.round((k * (lightRows - 1)) / (litRows - 1)),
    ),
  );
  const power = (30 * lightRows) / litRows;

  return (
    <InteriorContext.Provider
      value={{ room: room.name, level: plan.level, lightsOn, toggleLights: onToggleLights }}
    >
      {/* Floor slab */}
      <mesh position={[room.x, plan.y - SLAB_T / 2, room.z]} receiveShadow>
        <boxGeometry args={[room.w, SLAB_T, room.d]} />
        <meshStandardMaterial color={finish.color} roughness={finish.roughness} metalness={finish.metalness} />
      </mesh>
      {/* Ceiling slab */}
      {showCeiling && (
        <mesh position={[room.x, plan.y + plan.height + SLAB_T / 2, room.z]}>
          <boxGeometry args={[room.w, SLAB_T, room.d]} />
          <meshStandardMaterial color={INT.ceiling} roughness={0.9} />
        </mesh>
      )}
      {/* Ceiling lights */}
      {Array.from({ length: lightRows }, (_, i) => {
        const span = room.w / lightRows;
        return (
          <CeilingLight
            key={i}
            position={[
              room.x - room.w / 2 + span * (i + 0.5),
              plan.y + plan.height - 0.06,
              room.z,
            ]}
            length={Math.min(span * 0.62, 2.6)}
            on={lightsOn}
            power={power}
            cast={lit.has(i)}
          />
        );
      })}
      <LightSwitch
        position={switchPos}
        rotation={switchRot}
        on={lightsOn}
        onToggle={onToggleLights}
      />
      <Label3D
        position={platePos}
        border={lightsOn ? INT.trim : "#6B7A8F"}
        px={0.085}
        ambient
        rows={[
          { text: room.name.toUpperCase(), color: lightsOn ? "#E8EEF4" : "#6B7A8F" },
          { text: `${room.tag ?? ""}  ${room.occupancy ?? 0} crew`, color: lightsOn ? INT.trim : "#6B7A8F" },
        ]}
      />
      {children}
    </InteriorContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Doors                                                               */
/* ------------------------------------------------------------------ */

/**
 * Hinged door leaf.
 *
 * `open` is a target angle supplied by the walk controller: proximity opens a
 * door automatically and walking away closes it, with a short eased animation
 * so the swing reads like a real airlock leaf rather than a snap.
 */
export function DoorLeaf({
  door,
  open,
  openRef,
}: {
  door: DoorDef;
  open?: boolean;
  /** Live door state box supplied by the walk controller. */
  openRef?: { current: Record<string, boolean> };
}) {
  const hinge = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!hinge.current) return;
    const isOpen = openRef ? openRef.current[door.id] === true : Boolean(open);
    const target = isOpen ? (door.hinge === -1 ? -1.45 : 1.45) : 0;
    const k = 1 - Math.pow(0.0001, delta);
    hinge.current.rotation.y += (target - hinge.current.rotation.y) * k;
  });

  const halfW = door.width / 2;
  const glassW = door.width * 0.52;

  return (
    <group position={[door.x, door.y, door.z]} rotation={[0, door.run === "x" ? 0 : Math.PI / 2, 0]}>
      {/* Frame */}
      <Box p={[-door.width / 2 - 0.06, door.height / 2, 0]} s={[0.12, door.height, 0.26]} color={INT.steel} metalness={0.6} roughness={0.4} />
      <Box p={[door.width / 2 + 0.06, door.height / 2, 0]} s={[0.12, door.height, 0.26]} color={INT.steel} metalness={0.6} roughness={0.4} />
      <Box p={[0, door.height + 0.06, 0]} s={[door.width + 0.24, 0.12, 0.26]} color={INT.steel} metalness={0.6} roughness={0.4} />
      <group ref={hinge} position={[door.hinge * halfW, 0, 0]}>
        <group position={[-door.hinge * halfW, 0, 0]}>
          {/* Leaf */}
          <Box p={[0, door.height / 2, 0]} s={[door.width, door.height, 0.07]} color={door.exterior ? INT.red : INT.wall} roughness={0.55} metalness={0.3} />
          {door.glass ? (
            <Panel p={[0, door.height * 0.66, 0.05]} s={[glassW, door.height * 0.42]} tone={INT.glass} intensity={0.5} opacity={0.55} />
          ) : (
            <Box p={[0, door.height * 0.66, 0.05]} s={[glassW, door.height * 0.34, 0.02]} color={INT.dark} roughness={0.7} />
          )}
          {/* Seal and handle */}
          <Box p={[0, door.height / 2, -0.05]} s={[door.width, door.height, 0.05]} color="#1B242E" roughness={0.95} />
          <Cyl p={[-door.hinge * (door.width / 2 - 0.16), 1.05, door.hinge * 0.09]} r={0.035} h={0.34} axis="y" color={INT.amber} metalness={0.8} roughness={0.3} />
          {door.exterior && (
            <Label3D
              position={[0, door.height + 0.34, 0]}
              border={INT.red}
              px={0.075}
              ambient
              rows={[{ text: door.label.toUpperCase(), color: INT.red }]}
            />
          )}
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Circulation                                                         */
/* ------------------------------------------------------------------ */

/** Corridor floor markings, handrails and ceiling strip lights. */
export function Corridor({
  plan,
  lightsOn,
  showCeiling = true,
}: {
  plan: FloorPlan;
  lightsOn: boolean;
  showCeiling?: boolean;
}) {
  const c = plan.corridor;
  const along = c.axis === "x" ? c.w : c.d;
  const runs = Math.max(2, Math.round(along / 5));
  const rails = useMemo(() => {
    const out: Array<{ p: [number, number, number]; s: [number, number, number] }> = [];
    if (c.axis === "x") {
      out.push({ p: [c.x, plan.y + 1.05, c.z - c.d / 2 + 0.22], s: [c.w, 0.07, 0.07] });
      out.push({ p: [c.x, plan.y + 1.05, c.z + c.d / 2 - 0.22], s: [c.w, 0.07, 0.07] });
    } else {
      out.push({ p: [c.x - c.w / 2 + 0.22, plan.y + 1.05, c.z], s: [0.07, 0.07, c.d] });
      out.push({ p: [c.x + c.w / 2 - 0.22, plan.y + 1.05, c.z], s: [0.07, 0.07, c.d] });
    }
    return out;
  }, [c.axis, c.x, c.z, c.w, c.d, plan.y]);

  return (
    <group>
      <mesh position={[c.x, plan.y - SLAB_T / 2, c.z]} receiveShadow>
        <boxGeometry args={[c.w, SLAB_T, c.d]} />
        <meshStandardMaterial color={INT.floorMetal} roughness={0.6} metalness={0.4} />
      </mesh>
      {showCeiling && (
        <mesh position={[c.x, plan.y + plan.height + SLAB_T / 2, c.z]}>
          <boxGeometry args={[c.w, SLAB_T, c.d]} />
          <meshStandardMaterial color={INT.ceiling} roughness={0.9} />
        </mesh>
      )}
      {/* Direction markings */}
      {Array.from({ length: runs }, (_, i) => {
        const t = (i + 0.5) / runs;
        const p: [number, number, number] =
          c.axis === "x"
            ? [c.x - c.w / 2 + c.w * t, plan.y + 0.012, c.z]
            : [c.x, plan.y + 0.012, c.z - c.d / 2 + c.d * t];
        return (
          <mesh key={i} position={p} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={c.axis === "x" ? [1.5, 0.16] : [0.16, 1.5]} />
            <meshStandardMaterial
              color={lightsOn ? INT.trim : "#3A4550"}
              emissive={lightsOn ? INT.trim : "#000000"}
              emissiveIntensity={lightsOn ? 0.5 : 0}
            />
          </mesh>
        );
      })}
      {rails.map((rail, i) => (
        <Box key={i} p={rail.p} s={rail.s} color={INT.steel} metalness={0.75} roughness={0.32} />
      ))}
      {Array.from({ length: Math.max(2, Math.round(along / 7)) }, (_, i) => {
        const t = (i + 0.5) / Math.max(2, Math.round(along / 7));
        const p: [number, number, number] =
          c.axis === "x"
            ? [c.x - c.w / 2 + c.w * t, plan.y + plan.height - 0.06, c.z]
            : [c.x, plan.y + plan.height - 0.06, c.z - c.d / 2 + c.d * t];
        return <CeilingLight key={`l${i}`} position={p} length={2.2} on={lightsOn} color="#DCEBFF" />;
      })}
      {/* Temperature gauges every five metres */}
      {Array.from({ length: Math.max(2, Math.floor(along / 5)) }, (_, i) => {
        const p: [number, number, number] =
          c.axis === "x"
            ? [c.x - c.w / 2 + (i + 1) * 5, plan.y + 1.6, c.z + c.d / 2 - 0.11]
            : [c.x + c.w / 2 - 0.11, plan.y + 1.6, c.z - c.d / 2 + (i + 1) * 5];
        return (
          <group key={`g${i}`} position={p} rotation={[0, c.axis === "x" ? 0 : -Math.PI / 2, 0]}>
            <Box p={[0, 0, 0]} s={[0.22, 0.14, 0.03]} color="#E8EEF4" roughness={0.4} />
            <Panel p={[0, 0, 0.02]} s={[0.15, 0.07]} tone={INT.trim} intensity={0.9} />
          </group>
        );
      })}
      {/* Emergency exit signage */}
      {Array.from({ length: 2 }, (_, i) => {
        const p: [number, number, number] =
          c.axis === "x"
            ? [c.x + (i === 0 ? -c.w / 2 + 1.2 : c.w / 2 - 1.2), plan.y + 2.5, c.z]
            : [c.x, plan.y + 2.5, c.z + (i === 0 ? -c.d / 2 + 1.2 : c.d / 2 - 1.2)];
        return (
          <group key={`e${i}`} position={p}>
            <Box p={[0, 0, 0]} s={[0.9, 0.26, 0.04]} color="#1B242E" roughness={0.6} />
            <Panel p={[0, 0, 0.025]} s={[0.84, 0.2]} tone={INT.green} intensity={1.3} />
          </group>
        );
      })}
    </group>
  );
}

/** Steel stair flight with handrails and lit treads. */
export function StairFlight({
  from,
  to,
  width = 1.6,
  steps = 14,
}: {
  from: [number, number, number];
  to: [number, number, number];
  width?: number;
  steps?: number;
}) {
  const rise = (to[1] - from[1]) / steps;
  const run = (to[2] - from[2]) / steps;
  return (
    <group position={[from[0], 0, from[2]]} rotation={[0, 0, 0]}>
      {Array.from({ length: steps }, (_, i) => (
        <group key={i} position={[0, from[1] + rise * (i + 0.5), run * (i + 0.5)]}>
          <Box p={[0, 0, 0]} s={[width, 0.08, Math.abs(run) * 1.05]} color={INT.metal} metalness={0.7} roughness={0.35} />
          <Box p={[0, 0.05, 0.02]} s={[width * 0.9, 0.02, 0.06]} color={INT.trim} emissive={INT.trim} emissiveIntensity={0.6} />
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={s} position={[(s * width) / 2 + s * 0.09, 0, 0]}>
          <Box
            p={[0, from[1] + (to[1] - from[1]) / 2 + 0.55, ((to[2] - from[2]) / 2) * 1.0]}
            s={[0.07, 1.05, 0.07]}
            rot={[-Math.atan2(to[1] - from[1], to[2] - from[2]), 0, 0]}
            color={INT.trim}
            emissive={INT.trim}
            emissiveIntensity={0.25}
          />
        </group>
      ))}
      <Box p={[0, to[1] + 0.04, (to[2] - from[2]) * 0.98]} s={[width + 1.4, 0.08, 1.4]} color={INT.floorMetal} metalness={0.5} roughness={0.5} />
    </group>
  );
}

/** Wall plate carrying a label, used for fire points and equipment codes. */
export function WallPlate({
  position,
  rotation,
  text,
  tone = INT.trim,
  width = 1.1,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  text: string;
  tone?: string;
  width?: number;
}) {
  return (
    <group position={position} rotation={rotation ?? [0, 0, 0]}>
      <Box p={[0, 0, 0]} s={[width, 0.28, 0.03]} color="#1B242E" roughness={0.7} />
      <Label3D position={[0, 0, 0.04]} border={tone} px={0.055} rows={[{ text, color: tone }]} />
    </group>
  );
}

export { DOOR_H };
