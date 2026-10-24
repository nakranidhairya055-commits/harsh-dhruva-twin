import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { INT } from "../interiors/kit";
import type { WaterBodyDef } from "./water-data";

/**
 * Underwater camera dive.
 *
 * Drops the camera below the surface of the selected body and holds it there
 * with a slow drift, so the submerged set — seabed relief, boulders, the
 * intake line, fish and bubbles — reads as a real dive rather than a static
 * screenshot. Light shafts are modelled in-scene as soft additive cones so
 * they behave correctly against the water surface from below.
 */
export function UnderwaterView({ def }: { def: WaterBodyDef }) {
  const camera = useThree((s) => s.camera);
  const start = useRef(0);

  const diveY = -Math.min(6, Math.max(1.8, def.depthM * 0.28));
  const offset = Math.min(def.radius[1] * 0.35, 22);

  useEffect(() => {
    start.current = performance.now();
    camera.position.set(def.position[0], diveY, def.position[1] + offset);
    camera.lookAt(def.position[0], diveY + 0.4, def.position[1] - offset * 0.4);
  }, [camera, def, diveY, offset]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    camera.position.x = def.position[0] + Math.sin(t * 0.12) * 6;
    camera.position.z = def.position[1] + offset + Math.sin(t * 0.08) * 3;
    camera.position.y = diveY + Math.sin(t * 0.2) * 0.35;
    camera.lookAt(
      def.position[0] + Math.sin(t * 0.05) * 8,
      diveY + 1.2,
      def.position[1] - offset * 0.5,
    );
  });

  const shafts = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        x: def.position[0] - def.radius[0] * 0.6 + i * (def.radius[0] * 0.15),
        z: def.position[1] - def.radius[1] * 0.3 + ((i * 53) % 40),
        tilt: 0.12 + (i % 4) * 0.06,
        scale: 0.7 + (i % 3) * 0.25,
      })),
    [def.radius, def.position],
  );

  return (
    <group>
      {/* Sun shafts penetrating the surface */}
      {shafts.map((shaft, i) => (
        <mesh
          key={i}
          position={[shaft.x, 0.2, shaft.z]}
          rotation={[shaft.tilt, (i * 37) % 60, shaft.tilt * 0.5]}
        >
          <coneGeometry args={[3.4 * shaft.scale, Math.abs(diveY) + 12, 10, 1, true]} />
          <meshBasicMaterial
            color="#9FE4FF"
            transparent
            opacity={0.07}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* A dim blue fill so the dive never goes completely black */}
      <pointLight
        position={[def.position[0], diveY + 8, def.position[1]]}
        intensity={26}
        distance={Math.max(60, def.depthM * 3)}
        color="#63B6D8"
        decay={2}
      />
      <ambientLight intensity={0.28} color="#7FD8FF" />

      {/* Bottom reference ring marking the dive position */}
      <mesh
        position={[def.position[0], -def.depthM * 0.55 - 0.1, def.position[1]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[3.4, 3.7, 40]} />
        <meshBasicMaterial color={INT.trim} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
