import { Billboard, ContactShadows, OrbitControls } from "@react-three/drei";

import {
  dismissLabel,
  pinLabel,
  useLabelPinned,
  useLabelSuppressed,
} from "./scene-labels";
import type { SensorSummary } from "./types";

export type { SensorSummary, TwinHotspotDef, TwinSceneProps } from "./types";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Materials palette (shared with both station scenes)                 */
/* ------------------------------------------------------------------ */

/** Command-centre material palette. */
export const TWIN_COLORS = {
  snow: "#DDE7EE",
  rock: "#3A4450",
  steelWhite: "#C9D4DC",
  containerBlue: "#27415C",
  trimOrange: "#C46A2B",
  windowLit: "#FFB366",
  cyan: "#00E0C6",
  water: "#123A52",
  ice: "#A8C6D8",
  fuel: "#7A8288",
  door: "#D8A017",
  amber: "#FFB020",
  green: "#3EE07F",
  red: "#FF3B47",
  moduleRed: "#B3402F",
  moduleWhite: "#D6DDE2",
  pole: "#8A949E",
};

/** Standard material presets per the twin spec. */
export const MAT = {
  snow: { roughness: 0.7, metalness: 0.0 },
  rock: { roughness: 0.95, metalness: 0.05 },
  metal: { roughness: 0.4, metalness: 0.8 },
  glass: { roughness: 0.1, metalness: 0.0 },
} as const;

/* ------------------------------------------------------------------ */
/* Terrain                                                             */
/* ------------------------------------------------------------------ */

/**
 * Displaced terrain plane. Heights are value-noise-based so both stations get
 * realistic undulation instead of a flat plane. `rises` marks a raised sector
 * (Schirmacher hills for Maitri, the Larsemann outcrop for Bharati).
 */
export function Terrain({
  size,
  color = TWIN_COLORS.snow,
  rises = [],
}: {
  size: number;
  color?: string;
  rises?: Array<{ x: number; z: number; r: number; h: number }>;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, 96, 96);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const nx = v.x / size;
      const nz = v.y / size;
      // Layered value noise for rolling ice.
      let h =
        1.4 * Math.sin(nx * 9.7 + nz * 5.3) +
        0.9 * Math.sin(nx * 17.1 - nz * 12.7) +
        0.5 * Math.sin(nx * 31.3 + nz * 27.9);
      // Raised sectors.
      for (const r of rises) {
        const d = Math.hypot(v.x - r.x, v.y - r.z);
        if (d < r.r) {
          h += r.h * (1 - d / r.r) * (1 - d / r.r);
        }
      }
      pos.setZ(i, h);
    }
    geo.computeVertexNormals();
    return geo;
  }, [size, rises]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial color={color} {...MAT.snow} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Sky: stars, aurora ribbons, fog handled by scene                    */
/* ------------------------------------------------------------------ */

/** Static star field (points) positioned on a high dome. */
export function Stars({ count = 500, radius = 320 }: { count?: number; radius?: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.42;
      const r = radius * (0.85 + Math.random() * 0.15);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.6 + 60;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count, radius]);

  return (
    <points geometry={geometry}>
      <pointsMaterial color="#BFD3E6" size={0.9} sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

/** Animated aurora ribbons across the southern sky. */
export function Aurora({
  z = -160,
  scale = 1,
  opacity = 0.32,
}: {
  z?: number;
  scale?: number;
  /** Season-driven brightness: absent under the summer sun, strong in winter. */
  opacity?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      ref.current.position.x = Math.sin(t * 0.12) * 14;
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.85 + Math.sin(t * 0.7) * 0.25;
    }
  });
  return (
    <group position={[0, 90, z]} scale={scale}>
      {[0, 26, 52].map((off, i) => (
        <mesh key={off} ref={i === 0 ? ref : undefined} position={[off * 0.6, off * 0.35, -off]}>
          <planeGeometry args={[300, 34, 1, 1]} />
          <meshStandardMaterial
            color={i === 1 ? "#3EE07F" : "#00E0C6"}
            emissive={i === 1 ? "#3EE07F" : "#00E0C6"}
            emissiveIntensity={0.9}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Snowfall                                                            */
/* ------------------------------------------------------------------ */

/** Drifting snow particles that wrap around a bounding volume. */
export function Snowfall({ count = 1200, spread = 220 }: { count?: number; spread?: number }) {
  const ref = useRef<THREE.Points>(null);
  const [geometry] = useState(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = Math.random() * 70;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  });
  const speeds = useMemo(
    () => Array.from({ length: count }, () => 2.2 + Math.random() * 3.4),
    [count],
  );

  useFrame((_, delta) => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i] * delta;
      arr[i * 3 + 3] += 0; // keep V8 happy about the stride read
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 70;
        arr[i * 3] = (Math.random() - 0.5) * spread;
        arr[i * 3 + 2] = (Math.random() - 0.5) * spread;
      }
    }
    pos.needsUpdate = true;
    if (ref.current) ref.current.rotation.y += delta * 0.008;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color="#EAF2F8" size={0.55} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Display layers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Layer switches for the twin scenes.
 *
 * Labels, hotspot markers and the survey grid are drawn inside the WebGL
 * scene, so switching them from the console must not rebuild the scene graph.
 * The switches therefore live in a small module-level store that every layer
 * subscribes to with useSyncExternalStore.
 */
export interface TwinDisplayState {
  /** Floating in-canvas labels (telemetry strips, room and object labels). */
  labels: boolean;
  /**
   * Ambient titles: always-on nameplates over places, telemetry strips, the
   * airlock marker and room plates. Off by default because they were the
   * clutter operators complained about most; the Layers menu turns them back
   * on, and they also gate every label shown while walking so walk mode is
   * clean until they are switched on.
   */
  titles: boolean;
  /** Survey grid: graticule, range rings, contour rings and the north rose. */
  survey: boolean;
  /** Clickable hotspot markers scattered across the site. */
  hotspots: boolean;
  /** Antarctic wildlife, colonies and the expedition member on site. */
  wildlife: boolean;
  /**
   * Wildlife name labels. Species facts are shown on screen, and this is the
   * switch that takes the floating names back off the scene, so the operator
   * chooses how much of the animal information is drawn over the ice.
   */
  wildlifeLabels: boolean;
  /** Set while pointer lock is held, i.e. while the operator is walking. */
  walkMode: boolean;
  /**
   * Set while the overhead deck plan is on screen. Room plates are the only
   * thing labelling the boxes in that view, so ambient titles stay on there
   * even though they are off everywhere else.
   */
  deckPlan: boolean;
}

let displayState: TwinDisplayState = {
  labels: true,
  titles: false,
  survey: true,
  hotspots: true,
  wildlife: true,
  wildlifeLabels: true,
  walkMode: false,
  deckPlan: false,
};
const displayListeners = new Set<() => void>();

/** Read the current layer switches without subscribing. */
export function getTwinDisplay(): TwinDisplayState {
  return displayState;
}

/** Update one or more layer switches. */
export function setTwinDisplay(patch: Partial<TwinDisplayState>): void {
  const next = { ...displayState, ...patch };
  if (
    next.labels === displayState.labels &&
    next.titles === displayState.titles &&
    next.survey === displayState.survey &&
    next.hotspots === displayState.hotspots &&
    next.wildlife === displayState.wildlife &&
    next.wildlifeLabels === displayState.wildlifeLabels &&
    next.walkMode === displayState.walkMode &&
    next.deckPlan === displayState.deckPlan
  ) {
    return;
  }
  displayState = next;
  for (const listener of displayListeners) listener();
}

/** Subscribe to the layer switches for use in components. */
export function useTwinDisplay(): TwinDisplayState {
  return useSyncExternalStore(
    (listener) => {
      displayListeners.add(listener);
      return () => displayListeners.delete(listener);
    },
    getTwinDisplay,
    getTwinDisplay,
  );
}

/* ------------------------------------------------------------------ */
/* Hotspots                                                            */
/* ------------------------------------------------------------------ */

/** Short uppercase tags that read better shouted than title-cased. */
const ACRONYMS = new Set([
  "chp",
  "gen",
  "aws",
  "vsat",
  "ups",
  "mep",
  "ro",
  "pp",
  "dc",
  "ac",
  "rf",
  "hvac",
]);

/** "main-station" becomes "Main Station", "chp" becomes "CHP". */
export function objectTitle(id: string): string {
  return id
    .split("-")
    .map((part) =>
      ACRONYMS.has(part.toLowerCase())
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ");
}

/**
 * Clickable equipment hotspot marker floating above an object.
 *
 * Clicking selects the object and pins its label. The label is the only thing
 * this marker ever draws beyond the sphere itself: nothing floats over the
 * site until the operator asks for it, either by clicking the object, which
 * pins a single label with its own cross to remove it, or with the Titles
 * layer switch, which turns the whole ambient set on.
 */
export function Hotspot({
  position,
  label,
  onSelect,
  active,
  title,
  detail,
}: {
  position: [number, number, number];
  label: string;
  onSelect: (label: string) => void;
  active?: boolean;
  /** Human heading for the pinned label. Defaults to the object id. */
  title?: string;
  /** Extra rows under the heading, typically live readings for the object. */
  detail?: LabelRow[];
}) {
  const [hovered, setHovered] = useState(false);
  const display = useTwinDisplay();
  const ref = useRef<THREE.Group>(null);
  const pinId = `hotspot:${label}`;
  const pinned = useLabelPinned(pinId);
  const suppressed = useLabelSuppressed(pinId);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2) * 0.25;
    }
  });
  if (!display.hotspots) return null;
  // Pinned by a click, or forced on by the Titles switch, but never once the
  // operator has closed it with the cross.
  const showLabel = (pinned || display.titles) && !suppressed;
  return (
    <>
      <group
        ref={ref}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(label);
          // A deliberate click always brings the label back, dismissal included.
          pinLabel(pinId);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <mesh>
          <sphereGeometry args={hovered || active || pinned ? [1.15, 16, 16] : [0.85, 16, 16]} />
          <meshStandardMaterial
            color={active ? TWIN_COLORS.red : TWIN_COLORS.cyan}
            emissive={active ? TWIN_COLORS.red : TWIN_COLORS.cyan}
            emissiveIntensity={1.6}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]}>
          <ringGeometry args={[1.4, 1.8, 24]} />
          <meshStandardMaterial
            color={active ? TWIN_COLORS.red : TWIN_COLORS.cyan}
            emissive={active ? TWIN_COLORS.red : TWIN_COLORS.cyan}
            emissiveIntensity={0.8}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      {showLabel && (
        <group position={position}>
          <Label3D
            position={[0, 3.6, 0]}
            px={0.11}
            border={active ? TWIN_COLORS.red : TWIN_COLORS.cyan}
            rows={[
              {
                text: (title ?? objectTitle(label)).toUpperCase(),
                color: active ? TWIN_COLORS.red : TWIN_COLORS.cyan,
              },
              ...(detail ?? []),
            ]}
            onDismiss={() => dismissLabel(pinId)}
            requested={pinned}
          />
        </group>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Survey layer                                                        */
/* ------------------------------------------------------------------ */

/**
 * Cartographic layer for the station site.
 *
 * Draws the detail the twin is read with operationally: a 20 m graticule over
 * the apron, range rings at 25/50/100/200 m with distance labels, contour
 * rings around every raised sector and a north rose. Everything is line or
 * flat geometry, so it costs almost nothing, and the layer obeys the console's
 * survey and label switches.
 */
export function SiteSurvey({
  size = 400,
  spacing = 20,
  rings = [25, 50, 100, 200],
  rises = [],
  y = 0.09,
}: {
  size?: number;
  spacing?: number;
  rings?: number[];
  rises?: Array<{ x: number; z: number; r: number; h: number }>;
  y?: number;
}) {
  const display = useTwinDisplay();

  const grid = useMemo(() => {
    const minor: number[] = [];
    const major: number[] = [];
    const half = size / 2;
    for (let v = -half; v <= half; v += spacing) {
      const bucket = Math.round(v) % 100 === 0 ? major : minor;
      bucket.push(-half, y, v, half, y, v);
      bucket.push(v, y, -half, v, y, half);
    }
    const build = (verts: number[]) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      return geo;
    };
    return { minor: build(minor), major: build(major) };
  }, [size, spacing, y]);

  const contours = useMemo(() => {
    const out: Array<{ key: string; x: number; z: number; radius: number; opacity: number }> = [];
    rises.forEach((rise, index) => {
      for (const fraction of [1, 0.78, 0.55, 0.32]) {
        out.push({
          key: `${index}-${fraction}`,
          x: rise.x,
          z: rise.z,
          radius: rise.r * fraction,
          opacity: 0.1 + (1 - fraction) * 0.2,
        });
      }
    });
    return out;
  }, [rises]);

  if (!display.survey) return null;

  return (
    <group>
      <lineSegments geometry={grid.minor}>
        <lineBasicMaterial color="#5C87A5" transparent opacity={0.16} />
      </lineSegments>
      <lineSegments geometry={grid.major}>
        <lineBasicMaterial color="#5C87A5" transparent opacity={0.34} />
      </lineSegments>

      {/* Range rings from the station datum. */}
      {rings.map((radius) => (
        <mesh
          key={`ring-${radius}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, y + 0.01, 0]}
        >
          <ringGeometry args={[radius - 0.28, radius + 0.28, 112]} />
          <meshBasicMaterial
            color={TWIN_COLORS.cyan}
            transparent
            opacity={radius >= 100 ? 0.34 : 0.24}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Contour rings around the raised sectors. */}
      {contours.map((contour) => (
        <mesh
          key={`contour-${contour.key}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[contour.x, y + 0.02, contour.z]}
        >
          <ringGeometry args={[contour.radius - 0.5, contour.radius + 0.5, 96]} />
          <meshBasicMaterial
            color="#A8C6D8"
            transparent
            opacity={contour.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* North rose with cardinal ticks. */}
      <group position={[0, y + 0.03, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[13.2, 14, 96]} />
          <meshBasicMaterial
            color="#8FB8CC"
            transparent
            opacity={0.34}
            side={THREE.DoubleSide}
          />
        </mesh>
        {Array.from({ length: 16 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const long = i % 4 === 0;
          const inner = long ? 13.2 : 13.7;
          return (
            <mesh
              key={`tick-${i}`}
              rotation={[-Math.PI / 2, 0, -angle]}
              position={[
                Math.cos(angle) * ((inner + 14) / 2),
                0,
                Math.sin(angle) * ((inner + 14) / 2),
              ]}
            >
              <planeGeometry args={[long ? 1.5 : 0.8, 0.26]} />
              <meshBasicMaterial color="#8FB8CC" transparent opacity={0.5} />
            </mesh>
          );
        })}
      </group>

      {/* Distance and cardinal labels, hidden with the label layer. */}
      {rings
        .filter((radius) => radius >= 100)
        .map((radius) => (
          <Label3D
            key={`ring-label-${radius}`}
            position={[radius * 0.7, 1.7, -radius * 0.7]}
            px={0.12}
            border="#123A52"
            rows={[{ text: `${radius} m radius`, color: "#9FD5E8" }]}
          />
        ))}
      <Label3D
        position={[0, 2.2, -16.5]}
        px={0.13}
        border="#123A52"
        rows={[{ text: "N", color: "#9FD5E8" }]}
      />
      <Label3D
        position={[16.5, 2.2, 0]}
        px={0.13}
        border="#123A52"
        rows={[{ text: "E", color: "#9FD5E8" }]}
      />
      <Label3D
        position={[0, 2.2, 16.5]}
        px={0.13}
        border="#123A52"
        rows={[{ text: "S", color: "#9FD5E8" }]}
      />
      <Label3D
        position={[-16.5, 2.2, 0]}
        px={0.13}
        border="#123A52"
        rows={[{ text: "W", color: "#9FD5E8" }]}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Lights                                                              */
/* ------------------------------------------------------------------ */

/**
 * Lighting rig per the twin spec: cool sun, hemi fill, warm windows.
 * Intensities are driven by the active view mode so night and thermal modes
 * read correctly.
 */
export function Lighting({
  sun = 1.2,
  hemi = 0.4,
  ambient = 0.15,
  sunPosition = [120, 140, 60],
  night = false,
}: {
  sun?: number;
  hemi?: number;
  ambient?: number;
  /** Direction of the sun for the selected time of day. */
  sunPosition?: [number, number, number];
  /** Night raises the apron floodlights. */
  night?: boolean;
}) {
  return (
    <>
      <directionalLight
        position={sunPosition}
        intensity={sun}
        color={night ? "#8FB4E0" : "#E8F4FF"}
      />
      <hemisphereLight args={[night ? "#0C1626" : "#1A2A44", "#4A3E30", hemi]} />
      {night && <Floodlights />}
      <pointLight position={[0, 12, 0]} intensity={40} distance={40} color="#FFB366" />
      <pointLight position={[-60, 8, 40]} intensity={25} distance={50} color={TWIN_COLORS.cyan} />
      <ambientLight intensity={ambient} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Night floodlights and building access                               */
/* ------------------------------------------------------------------ */

/**
 * Station apron floodlights.
 *
 * Mounted only for the polar night, so the light count is stable through the
 * day. They carry no shadows because the sun already does.
 */
export function Floodlights({ intensity = 55 }: { intensity?: number }) {
  const posts: Array<[number, number, number]> = [
    [42, 9, 42],
    [-42, 9, 42],
    [42, 9, -42],
    [-42, 9, -42],
  ];
  return (
    <group>
      {posts.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, -p[1] / 2, 0]}>
            <cylinderGeometry args={[0.18, 0.26, p[1], 8]} />
            <meshStandardMaterial color={TWIN_COLORS.pole} metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh rotation={[0.5, i * 1.6, 0]}>
            <boxGeometry args={[1.1, 0.3, 0.7]} />
            <meshStandardMaterial color="#B9C4CC" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.1, 0.3]} rotation={[0.5, 0, 0]}>
            <planeGeometry args={[0.9, 0.4]} />
            <meshStandardMaterial color="#FFE6C0" emissive="#FFE6C0" emissiveIntensity={1.6} />
          </mesh>
          <pointLight
            position={[0, -0.4, 0.8]}
            intensity={intensity}
            distance={90}
            decay={2}
            color="#FFE6C0"
          />
        </group>
      ))}
    </group>
  );
}

/**
 * Building entrance marker.
 *
 * A lit airlock frame with a hover label. Clicking it leaves the exterior view
 * and puts the operator inside the station in walk mode, which is the only
 * entry point to the interior rooms.
 */
export function BuildingEntrance({
  position,
  rotation = [0, 0, 0],
  label,
  onEnter,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  label: string;
  onEnter: () => void;
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
        onEnter();
      }}
    >
      <mesh>
        <planeGeometry args={[3.2, 4.2]} />
        <meshStandardMaterial
          color={TWIN_COLORS.amber}
          emissive={TWIN_COLORS.amber}
          emissiveIntensity={hovered ? 0.9 : 0.35}
          transparent
          opacity={0.34}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.9, 28]} />
        <meshStandardMaterial
          color={TWIN_COLORS.amber}
          emissive={TWIN_COLORS.amber}
          emissiveIntensity={hovered ? 1.2 : 0.5}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/*
        The airlock nameplate is drawn on hover only. It used to sit over the
        site permanently and covered the telemetry strip behind it, so it is
        now part of the same rule as every other label: nothing floats until
        the operator asks for it.
      */}
      {hovered && (
        <Label3D
          position={[0, 2.9, 0]}
          border={TWIN_COLORS.amber}
          px={0.13}
          rows={[
            { text: label.toUpperCase(), color: TWIN_COLORS.amber },
            { text: "CLICK TO ENTER", color: "#E8EEF4" },
          ]}
        />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Camera rig + presets                                                */
/* ------------------------------------------------------------------ */

/** Camera preset descriptor. */
export interface CameraPreset {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

/** In-flight preset flight. */
interface CameraFlight {
  from: THREE.Vector3;
  fromTarget: THREE.Vector3;
  to: THREE.Vector3;
  toTarget: THREE.Vector3;
  started: number;
  duration: number;
}

/**
 * Orbit camera with one-shot preset flights.
 *
 * Selecting a camera preset starts a timed flight and then RELEASES the
 * camera: once the flight ends nothing writes to the camera again, so a drag,
 * pan or zoom stays exactly where the operator left it. Any manual input
 * cancels a flight in progress, and `flyKey` lets the console re-fly the
 * current preset on demand. Free view is the default state of the rig.
 */
export function CameraRig({
  preset,
  presets,
  flyKey = 0,
  minDistance = 8,
  maxDistance = 480,
  enabled = true,
}: {
  preset: string;
  presets: CameraPreset[];
  /** Bump to re-fly the same preset after the operator has moved the camera. */
  flyKey?: number;
  minDistance?: number;
  maxDistance?: number;
  /** Set false while another controller (drone tour) owns the camera. */
  enabled?: boolean;
}) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);
  const camera = useThree((state) => state.camera);
  const target = presets.find((p) => p.id === preset) ?? presets[0];
  const targetRef = useRef(target);
  targetRef.current = target;
  const flight = useRef<CameraFlight | null>(null);
  /** Identity of the requested pose: a new pose re-flies, a re-render does not. */
  const pose = target ? `${target.position.join(":")}@${target.target.join(":")}` : "";

  useEffect(() => {
    const controls = controlsRef.current;
    const to = targetRef.current;
    if (!controls || !to) return;
    const goal = new THREE.Vector3(...to.position);
    flight.current = {
      from: camera.position.clone(),
      fromTarget: controls.target.clone(),
      to: goal,
      toTarget: new THREE.Vector3(...to.target),
      started: performance.now(),
      duration: THREE.MathUtils.clamp(
        0.5 + camera.position.distanceTo(goal) / 380,
        0.7,
        1.7,
      ),
    };
    // `pose` and `flyKey` are the flight triggers; the vectors are read above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, flyKey, pose, camera, enabled]);

  useFrame(() => {
    const controls = controlsRef.current;
    const active = flight.current;
    if (!controls || !active) return;
    const t = (performance.now() - active.started) / (active.duration * 1000);
    if (t >= 1) {
      camera.position.copy(active.to);
      controls.target.copy(active.toTarget);
      controls.update();
      flight.current = null;
      return;
    }
    // Ease-in-out cubic so the arrival is smooth and the flight reads as a move.
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(active.from, active.to, e);
    controls.target.lerpVectors(active.fromTarget, active.toTarget, e);
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      enableDamping
      dampingFactor={0.08}
      enablePan
      screenSpacePanning
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI / 2.02}
      // A manual drag, pan or wheel always wins over an in-flight preset.
      onStart={() => {
        flight.current = null;
      }}
    />
  );
}

/** Twin canvas wrapper with fog and shared defaults. */
export function TwinCanvas({
  children,
  fogColor = "#0B1622",
  fogNear = 180,
  fogFar = 420,
  cameraPosition = [150, 95, 150],
  cameraNear = 0.5,
}: {
  children: React.ReactNode;
  fogColor?: string;
  fogNear?: number;
  fogFar?: number;
  /** Initial camera placement; the controllers take over from there. */
  cameraPosition?: [number, number, number];
  cameraNear?: number;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: cameraPosition, fov: 42, near: cameraNear, far: 900 }}
      gl={{ antialias: true }}
    >
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
      <color attach="background" args={[fogColor]} />
      {children}
    </Canvas>
  );
}

/* ------------------------------------------------------------------ */
/* In-canvas labels                                                    */
/* ------------------------------------------------------------------ */

/** One line of an in-canvas label. */
export interface LabelRow {
  text: string;
  color?: string;
}

const LABEL_FONT = '600 34px "JetBrains Mono", ui-monospace, monospace';

/**
 * Draw a label to an offscreen canvas and upload it as a texture.
 *
 * Labels are drawn inside the WebGL scene as camera-facing sprites rather
 * than React DOM portals overlaid on the canvas. Overlay portals inside a
 * canvas are fragile: under StrictMode, or when a conditional label group is
 * unmounted, the portal teardown can remove a DOM node React still owns and
 * the commit throws NotFoundError on removeChild. Sprites have no DOM, so the
 * whole failure mode disappears and labels still scale with perspective.
 */
function labelTexture(rows: LabelRow[], border: string) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const lines = rows.length > 0 ? rows : [{ text: " ", color: "#E8EEF4" }];
  const padding = 16;
  const lineHeight = 46;
  if (!ctx) {
    return { texture: new THREE.Texture(), width: 1, height: 1 };
  }
  ctx.font = LABEL_FONT;
  const textWidth = Math.max(
    ...lines.map((line) => ctx.measureText(line.text).width),
    24,
  );
  const width = Math.ceil(textWidth + padding * 2);
  const height = Math.ceil(lines.length * lineHeight + padding * 2);
  canvas.width = width;
  canvas.height = height;

  ctx.font = LABEL_FONT;
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(6, 11, 20, 0.92)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);
  lines.forEach((line, i) => {
    ctx.fillStyle = line.color ?? "#E8EEF4";
    ctx.fillText(line.text, padding, padding + i * lineHeight);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return { texture, width, height };
}

/**
 * Camera-facing label rendered entirely inside the 3D scene.
 * `px` is the world size of one texture pixel, which sets how large the label
 * reads at a given camera distance. Labels honour the console's layer switch,
 * so the whole world can be decluttered without rebuilding the scene.
 */
/**
 * Red cross texture for the dismiss control, built once and shared.
 *
 * Deliberately loud: a filled red disc with a white cross and a pale ring, so
 * there is no doubt about how a label is removed. Operators were left hunting
 * for the control, which is a design fault, not a user fault.
 */
let dismissTexture: THREE.Texture | null = null;
function getDismissTexture(): THREE.Texture {
  if (dismissTexture) return dismissTexture;
  if (typeof document === "undefined") return new THREE.Texture();
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Pale halo so the control reads against snow, sky or a dark hull.
    ctx.fillStyle = "rgba(232, 238, 244, 0.95)";
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();
    // Red disc.
    ctx.fillStyle = "#E01F2E";
    ctx.beginPath();
    ctx.arc(64, 64, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7E0C15";
    ctx.lineWidth = 4;
    ctx.stroke();
    // White cross.
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 17;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(42, 42);
    ctx.lineTo(86, 86);
    ctx.moveTo(86, 42);
    ctx.lineTo(42, 86);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  dismissTexture = texture;
  return texture;
}

export function Label3D({
  position,
  rows,
  border = TWIN_COLORS.cyan,
  px = 0.18,
  renderOrder = 12,
  ambient = false,
  onDismiss,
  requested = false,
}: {
  position: [number, number, number];
  rows: LabelRow[];
  border?: string;
  px?: number;
  renderOrder?: number;
  /**
   * Called by the cross drawn at the top right of the label. Only pinned
   * labels pass this in, which is what makes a clicked label removable.
   */
  onDismiss?: () => void;
  /**
   * True when the operator asked for this label by clicking the object. A
   * requested label is drawn even while walking, because a click is an
   * instruction rather than clutter; everything else stays off in walk mode.
   */
  requested?: boolean;
  /**
   * Ambient titles, i.e. nameplates that sit over a place or a fixture whether
   * or not the operator asked for them: telemetry strips, the airlock marker,
   * room plates. These follow the Titles switch, which is off by default, and
   * every label is suppressed while walking unless that switch is on.
   */
  ambient?: boolean;
}) {
  const display = useTwinDisplay();
  const key = rows.map((row) => `${row.text}:${row.color ?? ""}`).join("|");
  const { texture, width, height } = useMemo(
    () => labelTexture(rows, border),
    // The row key captures every visual input of the texture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, border],
  );

  useEffect(() => () => texture.dispose(), [texture]);

  /**
   * The dismiss control is sized against the label, not the world.
   *
   * A label is drawn at `px` world units per texture pixel, so a two-row label
   * is over thirteen metres tall on screen from the site camera. A fixed-size
   * cross next to a label that large is a couple of pixels wide and impossible
   * to hit, which is exactly why operators could not find it. Scaling the cross
   * to roughly a third of the label height keeps it obvious and clickable at
   * every distance the label itself can be read from.
   */
  const crossSize = Math.min(6, Math.max(1.25, height * px * 0.32));

  if (!display.labels) return null;
  // Ambient titles only when the operator has asked for them, or while the
  // overhead deck plan needs its room plates to make sense.
  if (ambient && !display.titles && !display.deckPlan) return null;
  // While walking nothing floats over anything, except a label the operator
  // opened by clicking the object themselves.
  if (display.walkMode && !display.titles && !requested) return null;

  return (
    <group position={position}>
      <sprite
        scale={[width * px, height * px, 1]}
        renderOrder={renderOrder}
        /*
          Clicking the label removes it. The cross is the explicit control, but
          the label itself is the largest target in the scene, and an operator
          who wants a label gone should not have to aim.
        */
        onClick={(event) => {
          if (!onDismiss) return;
          event.stopPropagation();
          onDismiss();
        }}
        onPointerOver={() => {
          if (!onDismiss) return;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (!onDismiss) return;
          document.body.style.cursor = "auto";
        }}
      >
        <spriteMaterial
          map={texture}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      {/*
        Dismiss control: a red camera-facing cross at the top right of the
        label. It sits just outside the label, is never occluded and is sized
        for a click at any camera distance the label itself is readable from.
      */}
      {onDismiss && (
        <Billboard
          position={[
            width * px * 0.5 + crossSize * 0.62,
            height * px * 0.5 + crossSize * 0.08,
            0.02,
          ]}
        >
          <mesh
            renderOrder={renderOrder + 1}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}
          >
            <planeGeometry args={[crossSize, crossSize]} />
            <meshBasicMaterial
              map={getDismissTexture()}
              transparent
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </Billboard>
      )}
    </group>
  );
}

/** Colour for a reading status, matching the console palette. */
export function statusTone(status: string): string {
  switch (status) {
    case "critical":
      return TWIN_COLORS.red;
    case "warning":
      return TWIN_COLORS.amber;
    case "nominal":
      return TWIN_COLORS.green;
    case "watch":
      return "#4A9EFF";
    default:
      return "#6B7A8F";
  }
}

/** Live telemetry readout drawn above a station. */
/**
 * Live reading rows for a set of equipment tags.
 *
 * Shared by the always-on telemetry strip and by the object labels the
 * operator pins by clicking, so a clicked CHP unit reports exactly the same
 * numbers as the strip does.
 */
export function readingRows(tags: string[], readings: SensorSummary[]): LabelRow[] {
  return tags.map((tag) => {
    const reading = readings.find((r) => r.equipmentId === tag);
    if (!reading) return { text: `${tag}  --`, color: "#6B7A8F" };
    return {
      text: `${tag}  ${reading.value.toFixed(reading.decimals)}${reading.unit}`,
      color: statusTone(reading.status),
    };
  });
}

export function TelemetryStrip({
  position,
  tags,
  readings,
  px = 0.2,
  border = TWIN_COLORS.cyan,
}: {
  position: [number, number, number];
  tags: string[];
  readings: SensorSummary[];
  px?: number;
  border?: string;
}) {
  return (
    <Label3D
      position={position}
      rows={readingRows(tags, readings)}
      border={border}
      px={px}
      ambient
    />
  );
}

/**
 * Thermal-mode readout labels pinned to subsystems. Each label shows the live
 * value and parameter for one equipment tag so the thermal view carries
 * numbers rather than only a colour gradient.
 */
export function ThermalReadout({
  targets,
  readings,
}: {
  targets: Array<{ tag: string; position: [number, number, number] }>;
  readings: SensorSummary[];
}) {
  return (
    <group>
      {targets.map((target) => {
        const reading = readings.find((r) => r.equipmentId === target.tag);
        if (!reading) return null;
        const color = statusTone(reading.status);
        return (
          <Label3D
            key={target.tag}
            position={target.position}
            border={color}
            px={0.16}
            rows={[
              { text: target.tag, color },
              {
                text: `${reading.value.toFixed(reading.decimals)}${reading.unit}`,
                color,
              },
              { text: reading.parameter, color: "#6B7A8F" },
            ]}
          />
        );
      })}
    </group>
  );
}

/**
 * Soft contact shadow patch under buildings.
 *
 * The shadow pass is rendered once and then kept, rather than re-rendered
 * every frame. The buildings do not move, so a per-frame shadow render was
 * paying a second full scene pass for an image that never changed.
 */
export function GroundShadow({ y = 0.05, scale = 1 }: { y?: number; scale?: number }) {
  return (
    <ContactShadows
      position={[0, y, 0]}
      scale={220 * scale}
      blur={2.4}
      opacity={0.35}
      far={40}
      frames={1}
    />
  );
}
