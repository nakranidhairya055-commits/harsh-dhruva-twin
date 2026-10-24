import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The seven twin view modes.
 *
 * Each mode is applied by traversing the live scene graph and overriding
 * material state, so every mode works on both station twins with no per-scene
 * authoring. Structural mode relies on groups tagged `userData.structural`,
 * and the MEP overlay is tagged `userData.mep`.
 */
export type ViewMode =
  | "exterior"
  | "xray"
  | "infrared"
  | "thermal"
  | "mep"
  | "structural"
  | "night";

export interface ViewModeDef {
  id: ViewMode;
  label: string;
  short: string;
  hint: string;
}

export const VIEW_MODES: ViewModeDef[] = [
  {
    id: "exterior",
    label: "Exterior",
    short: "EXT",
    hint: "Default photographic rendering of the station.",
  },
  {
    id: "xray",
    label: "X-Ray",
    short: "XRY",
    hint: "Buildings translucent at 15 percent with the structural frame drawn in cyan.",
  },
  {
    id: "infrared",
    label: "Infrared",
    short: "IR",
    hint: "Heat-map overlay from purple through red across the station envelope.",
  },
  {
    id: "thermal",
    label: "Thermal",
    short: "THM",
    hint: "Thermal view with live temperature values pinned to each subsystem.",
  },
  {
    id: "mep",
    label: "MEP / HVAC",
    short: "MEP",
    hint: "Water cyan, electrical yellow, HVAC orange, fuel red service runs.",
  },
  {
    id: "structural",
    label: "Structural",
    short: "STR",
    hint: "Load-bearing structure only, all secondary equipment removed.",
  },
  {
    id: "night",
    label: "Night",
    short: "NGT",
    hint: "Emissive elements only, matching a polar night inspection walk.",
  },
];

interface Snapshot {
  color: THREE.Color | null;
  emissive: THREE.Color | null;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  wireframe: boolean;
  metalness: number;
  roughness: number;
  side: THREE.Side;
}

function isFlagged(obj: THREE.Object3D, flag: string): boolean {
  let cursor: THREE.Object3D | null = obj;
  while (cursor) {
    if (cursor.userData && cursor.userData[flag] === true) return true;
    cursor = cursor.parent;
  }
  return false;
}

/** Apply a view mode to every material in the scene. */
export function ViewModeEffect({ mode }: { mode: ViewMode }) {
  const scene = useThree((state) => state.scene);
  const originals = useRef(new Map<string, Snapshot>());

  useEffect(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) meshes.push(mesh);
    });

    const worldPos = new THREE.Vector3();
    const heat = new THREE.Color();

    for (const mesh of meshes) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (!material || Array.isArray(material)) continue;
      if (!("color" in material)) continue;

      const key = material.uuid;
      if (!originals.current.has(key)) {
        originals.current.set(key, {
          color: material.color ? material.color.clone() : null,
          emissive: material.emissive ? material.emissive.clone() : null,
          emissiveIntensity: material.emissiveIntensity ?? 0,
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
          wireframe: material.wireframe ?? false,
          metalness: material.metalness ?? 0,
          roughness: material.roughness ?? 1,
          side: material.side,
        });
      }
      const snap = originals.current.get(key)!;

      // Restore before applying the new mode so modes never compound.
      mesh.visible = true;
      if (snap.color && material.color) material.color.copy(snap.color);
      if (snap.emissive && material.emissive) material.emissive.copy(snap.emissive);
      material.emissiveIntensity = snap.emissiveIntensity;
      material.opacity = snap.opacity;
      material.transparent = snap.transparent;
      material.depthWrite = snap.depthWrite;
      material.wireframe = snap.wireframe;
      material.metalness = snap.metalness;
      material.roughness = snap.roughness;
      material.side = snap.side;

      const isMep = isFlagged(mesh, "mep");
      const isStructural = isFlagged(mesh, "structural");

      switch (mode) {
        case "exterior":
          break;
        case "xray": {
          if (isMep) {
            mesh.visible = false;
            break;
          }
          material.transparent = true;
          material.opacity = 0.15;
          material.depthWrite = false;
          material.wireframe = true;
          material.roughness = 0.4;
          if (material.color) material.color.set("#00E0C6");
          if (material.emissive) {
            material.emissive.set("#00E0C6");
            material.emissiveIntensity = 1.1;
          }
          break;
        }
        case "infrared":
        case "thermal": {
          if (isMep) {
            mesh.visible = false;
            break;
          }
          mesh.getWorldPosition(worldPos);
          const level = THREE.MathUtils.clamp(
            (worldPos.y + 3) / 24 + 0.14 * Math.sin(worldPos.x * 0.28 + worldPos.z * 0.11),
            0,
            1,
          );
          // Purple (cold) through red (hot) spectrum.
          heat.setHSL(0.78 - level * 0.78, 0.95, 0.4);
          material.transparent = false;
          material.depthWrite = true;
          material.wireframe = false;
          if (material.color) material.color.copy(heat);
          if (material.emissive) {
            material.emissive.copy(heat);
            material.emissiveIntensity = mode === "thermal" ? 1.45 : 1.0;
          }
          break;
        }
        case "mep": {
          if (isMep) {
            if (material.emissive) material.emissiveIntensity = 1.5;
            break;
          }
          material.transparent = true;
          material.opacity = 0.07;
          material.depthWrite = false;
          material.wireframe = false;
          if (material.color) material.color.set("#5C6A78");
          if (material.emissive) material.emissiveIntensity = 0;
          break;
        }
        case "structural": {
          mesh.visible = isStructural;
          if (material.emissive) material.emissiveIntensity = 0.25;
          break;
        }
        case "night": {
          if (isMep) {
            mesh.visible = false;
            break;
          }
          material.wireframe = false;
          if (material.color) material.color.set("#05070A");
          if (material.emissive && snap.emissiveIntensity > 0.2) {
            material.emissiveIntensity = snap.emissiveIntensity * 1.9;
          }
          break;
        }
      }
    }
  }, [mode, scene]);

  return null;
}

/** Lighting overrides that accompany the night and thermal modes. */
export function modeLighting(mode: ViewMode): {
  sun: number;
  hemi: number;
  ambient: number;
} {
  switch (mode) {
    case "night":
      return { sun: 0.18, hemi: 0.12, ambient: 0.04 };
    case "thermal":
    case "infrared":
      return { sun: 0.25, hemi: 0.1, ambient: 0.1 };
    case "xray":
      return { sun: 0.5, hemi: 0.2, ambient: 0.12 };
    default:
      return { sun: 1.2, hemi: 0.4, ambient: 0.15 };
  }
}
