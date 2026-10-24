import * as THREE from "three";
import { Label3D } from "./twin-primitives";

/**
 * MEP / HVAC overlay.
 *
 * Draws the mechanical, electrical and plumbing service runs that are hidden
 * by the building envelope: potable and seawater lines in cyan, electrical
 * distribution in yellow, HVAC ducting in orange and fuel lines in red. Runs
 * are authored per station and rendered only in MEP view mode.
 */

export const MEP_COLORS = {
  water: "#00E0C6",
  power: "#FFD400",
  hvac: "#FF8A1F",
  fuel: "#FF3B47",
} as const;

export type MepKind = keyof typeof MEP_COLORS;

export interface MepRun {
  a: [number, number, number];
  b: [number, number, number];
  kind: MepKind;
  radius?: number;
}

export interface MepLabel {
  text: string;
  position: [number, number, number];
  kind: MepKind;
}

const UP = new THREE.Vector3(0, 1, 0);

/** One straight service run between two points. */
function Run({ a, b, kind, radius = 0.22 }: MepRun) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const length = dir.length();
  const position = va.clone().add(vb).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    UP,
    dir.clone().normalize(),
  );
  const color = MEP_COLORS[kind];
  return (
    <mesh position={position} quaternion={quaternion} userData={{ mep: true }}>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.15}
        roughness={0.3}
        metalness={0.3}
      />
    </mesh>
  );
}

/** Junction box drawn at a service node. */
function Node({
  position,
  kind,
}: {
  position: [number, number, number];
  kind: MepKind;
}) {
  const color = MEP_COLORS[kind];
  return (
    <mesh position={position} userData={{ mep: true }}>
      <boxGeometry args={[0.85, 0.85, 0.85]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.4}
        roughness={0.35}
      />
    </mesh>
  );
}

/** Full overlay: service runs plus labelled junctions. */
export function MepOverlay({
  runs,
  labels = [],
  nodes = [],
}: {
  runs: MepRun[];
  labels?: MepLabel[];
  nodes?: Array<{ position: [number, number, number]; kind: MepKind }>;
}) {
  return (
    <group userData={{ mep: true }}>
      {runs.map((run, i) => (
        <Run key={i} {...run} />
      ))}
      {nodes.map((node, i) => (
        <Node key={`n${i}`} {...node} />
      ))}
      {labels.map((label) => (
        <Label3D
          key={label.text}
          position={label.position}
          border={MEP_COLORS[label.kind]}
          px={0.18}
          rows={[{ text: label.text.toUpperCase(), color: MEP_COLORS[label.kind] }]}
        />
      ))}
    </group>
  );
}

/** Maitri service runs: lake to station water, generator bay to station power. */
export const MAITRI_MEP: { runs: MepRun[]; nodes: Array<{ position: [number, number, number]; kind: MepKind }>; labels: MepLabel[] } = {
  runs: [
    // Water: lake intake, pump house, heated pipeline into the station.
    { a: [-38, 0.6, 26], b: [-22, 1.6, 34], kind: "water", radius: 0.32 },
    { a: [-22, 1.6, 34], b: [-12, 1.4, 6], kind: "water", radius: 0.34 },
    { a: [-12, 1.4, 6], b: [-2, 2.6, 2], kind: "water", radius: 0.3 },
    { a: [-2, 2.6, 2], b: [-2, 3.4, -6], kind: "water", radius: 0.24 },
    // Electrical: generator bay through the distribution panel into the hull.
    { a: [16, 2.4, -26], b: [16, 2.4, -14], kind: "power", radius: 0.24 },
    { a: [16, 2.4, -14], b: [4, 2.4, -11], kind: "power", radius: 0.24 },
    { a: [4, 2.4, -11], b: [4, 3.2, -2], kind: "power", radius: 0.2 },
    { a: [16, 2.4, -26], b: [30, 2.2, -18], kind: "power", radius: 0.2 },
    // HVAC: station air handling to the summer camp and workshop.
    { a: [-2, 6.2, -8], b: [-20, 6.2, -12], kind: "hvac", radius: 0.34 },
    { a: [-20, 6.2, -12], b: [-42, 5.4, -12], kind: "hvac", radius: 0.3 },
    // Fuel: farm to the fuel station and then the generator bay.
    { a: [42, 1.2, 30], b: [42, 1.2, 8], kind: "fuel", radius: 0.26 },
    { a: [42, 1.2, 8], b: [30, 1.4, -14], kind: "fuel", radius: 0.26 },
    { a: [30, 1.4, -14], b: [20, 1.6, -26], kind: "fuel", radius: 0.24 },
  ],
  nodes: [
    { position: [-22, 1.6, 34], kind: "water" },
    { position: [-2, 3, -1], kind: "water" },
    { position: [16, 2.4, -20], kind: "power" },
    { position: [4, 2.8, -6], kind: "power" },
    { position: [-20, 6.2, -12], kind: "hvac" },
    { position: [36, 1.3, 0], kind: "fuel" },
  ],
  labels: [
    { text: "Potable water", position: [-30, 4.6, 30], kind: "water" },
    { text: "Electrical distribution", position: [12, 5.2, -16], kind: "power" },
    { text: "HVAC ducting", position: [-21, 8.4, -12], kind: "hvac" },
    { text: "Fuel supply", position: [42, 4, 12], kind: "fuel" },
  ],
};

/** Bharati service runs: seawater intake, CHP loop, fuel farm, HVAC. */
export const BHARATI_MEP: { runs: MepRun[]; nodes: Array<{ position: [number, number, number]; kind: MepKind }>; labels: MepLabel[] } = {
  runs: [
    // Seawater intake 450 m out to the pump house and into the station.
    { a: [52, 0.6, 66], b: [34, 1.8, 52], kind: "water", radius: 0.4 },
    { a: [34, 1.8, 52], b: [18, 1.8, 40], kind: "water", radius: 0.38 },
    { a: [18, 1.8, 40], b: [4, 2.8, 18], kind: "water", radius: 0.32 },
    { a: [4, 2.8, 18], b: [4, 4.2, 8], kind: "water", radius: 0.28 },
    // CHP electrical bus into the station distribution room.
    { a: [-22, 2.6, -22], b: [-22, 2.6, -8], kind: "power", radius: 0.26 },
    { a: [-22, 2.6, -8], b: [-6, 3.4, 0], kind: "power", radius: 0.26 },
    { a: [-6, 3.4, 0], b: [-6, 4.6, 10], kind: "power", radius: 0.22 },
    // CHP thermal loop to the habitat and the wastewater plant.
    { a: [-22, 3.6, -18], b: [-14, 3.6, 4], kind: "hvac", radius: 0.32 },
    { a: [-14, 3.6, 4], b: [6, 4, 6], kind: "hvac", radius: 0.3 },
    { a: [6, 4, 6], b: [26, 3, 22], kind: "hvac", radius: 0.28 },
    // Fuel farm header to the day tanks and the CHP units.
    { a: [-44, 1.4, 34], b: [-44, 1.4, 8], kind: "fuel", radius: 0.3 },
    { a: [-44, 1.4, 8], b: [-32, 1.4, -14], kind: "fuel", radius: 0.28 },
    { a: [-32, 1.4, -14], b: [-22, 1.8, -22], kind: "fuel", radius: 0.26 },
  ],
  nodes: [
    { position: [34, 1.8, 52], kind: "water" },
    { position: [4, 3.4, 18], kind: "water" },
    { position: [-22, 2.6, -14], kind: "power" },
    { position: [-8, 3.8, 4], kind: "power" },
    { position: [-14, 3.6, 0], kind: "hvac" },
    { position: [-38, 1.4, 4], kind: "fuel" },
  ],
  labels: [
    { text: "Seawater intake", position: [30, 5, 46], kind: "water" },
    { text: "CHP electrical bus", position: [-18, 6.2, -10], kind: "power" },
    { text: "CHP thermal loop", position: [-2, 6.6, 8], kind: "hvac" },
    { text: "Fuel header", position: [-44, 4.4, 16], kind: "fuel" },
  ],
};
