import { useRef, useState, type ReactElement } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Label3D, TWIN_COLORS } from "./twin-primitives";
import { statusTone, vehicleInstances } from "./vehicle-data";

/**
 * Antarctic vehicle fleet.
 *
 * Twelve vehicle classes are modelled in detail so the twin shows the real
 * mobility capability of each station rather than an abstract marker. Maitri
 * runs an inland fleet (snow vehicles, sledges, a helicopter); Bharati adds
 * coastal assets (Zodiac boat, mobile crane) and a larger summer complement.
 */

const BODY = "#B9C6D0";
const BODY_DARK = "#5B6873";
const TRACK = "#2B333C";
const CAB = "#7FA8C9";
const HITCH = "#D8A017";

/** Track rubber with cleats that roll while the machine is running. */
function Track({
  length = 3.4,
  width = 0.7,
  running = false,
}: {
  length?: number;
  width?: number;
  running?: boolean;
}) {
  const cleats = useRef<THREE.Group>(null);
  const step = length / 3.2;
  useFrame(({ clock }) => {
    if (!cleats.current) return;
    cleats.current.position.x = running ? ((clock.elapsedTime * 1.6) % step) - step / 2 : 0;
  });
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[length, 0.5, width]} />
        <meshStandardMaterial color={TRACK} roughness={0.9} />
      </mesh>
      <group ref={cleats}>
        {[-1, 0, 1].map((i) => (
          <mesh key={i} position={[i * step, 0.28, 0]}>
            <boxGeometry args={[0.18, 0.1, width * 1.05]} />
            <meshStandardMaterial color="#77828C" roughness={0.6} metalness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Exhaust particulates, shown only while the engine is running. */
function ExhaustSmoke({
  position,
  running,
  count = 14,
}: {
  position: [number, number, number];
  running: boolean;
  count?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      const phase = ((clock.elapsedTime * 0.5 + i * 0.14) % 1 + 1) % 1;
      child.position.y = phase * 2.6;
      child.position.x = Math.sin(phase * 3 + i) * 0.35;
      const scale = 0.35 + phase * 1.5;
      child.scale.setScalar(scale);
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.opacity = running ? 0.34 * (1 - phase) : 0;
    });
  });
  return (
    <group ref={ref} position={position} visible={running}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.16, 7, 7]} />
          <meshStandardMaterial color="#9AA6B0" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Tyre for wheeled vehicles. */
function Wheel({ r = 0.36, w = 0.26 }: { r?: number; w?: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[r, r, w, 12]} />
      <meshStandardMaterial color="#2B333C" roughness={0.85} />
    </mesh>
  );
}

/** Yellow safety beacon that pulses on the running vehicles. */
function Beacon({ y = 1.4, x = 0 }: { y?: number; x?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.4 + Math.abs(Math.sin(clock.elapsedTime * 2.2)) * 1.6;
  });
  return (
    <mesh ref={ref} position={[x, y, 0]}>
      <sphereGeometry args={[0.14, 10, 10]} />
      <meshStandardMaterial
        color={TWIN_COLORS.amber}
        emissive={TWIN_COLORS.amber}
        emissiveIntensity={1}
      />
    </mesh>
  );
}

/** 1. PistenBully style tracked snow vehicle. */
function PistenBully({ running = false }: { running?: boolean }) {
  const blade = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!blade.current) return;
    // The blade breathes through a short hydraulic stroke while running.
    blade.current.rotation.x = running ? -0.18 + Math.sin(clock.elapsedTime * 0.9) * 0.12 : -0.04;
  });
  return (
    <group>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[2.1, 0.9, 3.2]} />
        <meshStandardMaterial color="#C63A2B" roughness={0.55} />
      </mesh>
      <mesh position={[-0.1, 1.62, 0.2]} castShadow>
        <boxGeometry args={[1.7, 1.0, 1.7]} />
        <meshStandardMaterial color={CAB} roughness={0.25} metalness={0.1} />
      </mesh>
      <mesh position={[-0.1, 1.62, -0.72]}>
        <boxGeometry args={[1.55, 0.8, 0.1]} />
        <meshStandardMaterial color="#0E1A26" />
      </mesh>
      <group position={[0, 0.34, 1.35]}>
        <Track running={running} />
      </group>
      <group position={[0, 0.34, -1.35]}>
        <Track running={running} />
      </group>
      <group ref={blade} position={[0, 0.7, 2.1]}>
        <mesh position={[0, 0.4, 0.1]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[2.6, 0.9, 0.18]} />
          <meshStandardMaterial color="#D5DDE4" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.05, -0.2]}>
          <boxGeometry args={[2.4, 0.2, 0.3]} />
          <meshStandardMaterial color={BODY_DARK} metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
      <ExhaustSmoke position={[-0.6, 1.6, 0.6]} running={running} />
      <group position={[0, 2.35, 0.2]}>
        <mesh>
          <boxGeometry args={[1.9, 0.16, 0.35]} />
          <meshStandardMaterial color={BODY_DARK} metalness={0.6} roughness={0.4} />
        </mesh>
        {[-0.8, 0, 0.8].map((x) => (
          <mesh key={x} position={[x, 0.24, -0.2]} rotation={[-0.4, 0, 0]}>
            <boxGeometry args={[0.5, 0.12, 0.4]} />
            <meshStandardMaterial color={TWIN_COLORS.cyan} emissive={TWIN_COLORS.cyan} emissiveIntensity={0.7} />
          </mesh>
        ))}
      </group>
      <Beacon y={2.3} />
    </group>
  );
}

/** 2. Snowmobile / snow scooter. */
function Snowmobile({ running = false }: { running?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.7, 0.5, 2.3]} />
        <meshStandardMaterial color="#1F4E79" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.95, -0.45]}>
        <boxGeometry args={[0.66, 0.28, 0.9]} />
        <meshStandardMaterial color="#12202E" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.3, -1.05]}>
        <Track length={1.7} width={0.5} running={running} />
      </mesh>
      <mesh position={[0, 0.28, 1.15]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.68, 0.1, 1.05]} />
        <meshStandardMaterial color={BODY} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Front ski struts */}
      <mesh position={[0, 0.7, 0.75]}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        <meshStandardMaterial color={BODY_DARK} metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.15, 0.35]} rotation={[0.9, 0, 0]}>
        <boxGeometry args={[0.86, 0.07, 0.07]} />
        <meshStandardMaterial color={BODY_DARK} />
      </mesh>
      <Beacon y={1.28} />
    </group>
  );
}

/** 3. ATV quad bike. */
function Atv() {
  return (
    <group>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[1.0, 0.36, 1.9]} />
        <meshStandardMaterial color="#2F6B3A" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.98, -0.25]}>
        <boxGeometry args={[0.6, 0.16, 0.7]} />
        <meshStandardMaterial color="#14202C" />
      </mesh>
      {[
        [0.58, 0.85],
        [-0.58, 0.85],
        [0.58, -0.85],
        [-0.58, -0.85],
      ].map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, 0.34, z]} rotation={[0, 0, Math.PI / 2]}>
          <Wheel r={0.34} w={0.24} />
        </group>
      ))}
      <mesh position={[0, 1.1, 0.75]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.9, 0.06, 0.06]} />
        <meshStandardMaterial color={BODY_DARK} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.88, 0.8]}>
        <boxGeometry args={[0.3, 0.45, 0.28]} />
        <meshStandardMaterial color="#3A4650" />
      </mesh>
    </group>
  );
}

/** 4. Tracked cargo carrier. */
function CargoCarrier({ running = false }: { running?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[1.8, 0.7, 3.4]} />
        <meshStandardMaterial color={BODY_DARK} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.55, -0.9]} castShadow>
        <boxGeometry args={[1.6, 1.0, 1.5]} />
        <meshStandardMaterial color={CAB} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.95, 1.3]} castShadow>
        <boxGeometry args={[1.75, 0.9, 1.9]} />
        <meshStandardMaterial color={BODY} roughness={0.6} />
      </mesh>
      <group position={[0.95, 0.36, 0]}>
        <Track length={4.0} width={0.8} running={running} />
      </group>
      <group position={[-0.95, 0.36, 0]}>
        <Track length={4.0} width={0.8} running={running} />
      </group>
      <Beacon y={2.2} x={-0.6} />
    </group>
  );
}

/** 5. Helicopter with animated rotor. */
function Helicopter({ running = false }: { running?: boolean }) {
  const rotor = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (rotor.current) rotor.current.rotation.y += delta * (running ? 9 : 0.35);
    if (tail.current) tail.current.rotation.x += delta * (running ? 16 : 0.5);
  });
  return (
    <group>
      <mesh position={[0, 1.5, 0]} castShadow>
        <capsuleGeometry args={[0.95, 1.9, 6, 14]} />
        <meshStandardMaterial color="#E4E9ED" roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0, 1.45, 1.15]}>
        <sphereGeometry args={[0.62, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1B2A38" roughness={0.15} />
      </mesh>
      <mesh position={[0, 1.35, -2.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.14, 2.4, 10]} />
        <meshStandardMaterial color="#E4E9ED" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.9, -3.3]}>
        <boxGeometry args={[0.14, 0.9, 0.5]} />
        <meshStandardMaterial color={TWIN_COLORS.trimOrange} roughness={0.5} />
      </mesh>
      <group ref={tail} position={[0, 1.9, -3.3]}>
        <mesh position={[0.3, 0, 0]}>
          <boxGeometry args={[0.08, 0.75, 0.22]} />
          <meshStandardMaterial color={BODY_DARK} metalness={0.6} />
        </mesh>
      </group>
      <group ref={rotor} position={[0, 2.55, 0]}>
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, 0.3, 8]} />
          <meshStandardMaterial color={BODY_DARK} metalness={0.7} />
        </mesh>
        {[0, Math.PI / 3, (2 * Math.PI) / 3].map((a) => (
          <mesh key={a} rotation={[0, a, 0]} position={[0, 0.05, 0]}>
            <boxGeometry args={[5.4, 0.06, 0.28]} />
            <meshStandardMaterial color="#8A949E" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
      </group>
      {[0.7, -0.7].map((x) => (
        <mesh key={x} position={[x, 0.55, 0]}>
          <boxGeometry args={[0.18, 0.12, 2.6]} />
          <meshStandardMaterial color={BODY_DARK} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 2.2, -1.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 1.9, 8]} />
        <meshStandardMaterial color={BODY_DARK} metalness={0.6} />
      </mesh>
    </group>
  );
}

/** 6. Nansen sledge. */
function NansenSledge() {
  return (
    <group>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]}>
          <boxGeometry args={[0.12, 0.12, 3.0]} />
          <meshStandardMaterial color={BODY} roughness={0.6} />
        </mesh>
      ))}
      {[-0.6, 0, 0.6].map((z) => (
        <mesh key={z} position={[0, 0.3, z]}>
          <boxGeometry args={[1.1, 0.1, 0.16]} />
          <meshStandardMaterial color="#6B4E2E" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.72, 0.2]} castShadow>
        <boxGeometry args={[0.95, 0.7, 1.4]} />
        <meshStandardMaterial color="#7A6340" roughness={0.85} />
      </mesh>
      {[-0.4, 0.4].map((z) => (
        <mesh key={z} position={[0, 0.62, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 2.6, 6]} />
          <meshStandardMaterial color={HITCH} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.42, -1.9]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.9, 6]} />
        <meshStandardMaterial color={BODY_DARK} metalness={0.6} />
      </mesh>
    </group>
  );
}

/** 7. Cargo sledge with strapped crates. */
function CargoSledge() {
  return (
    <group>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.24, 0]}>
          <boxGeometry args={[0.16, 0.2, 4.0]} />
          <meshStandardMaterial color={BODY} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.7, 0.18, 3.9]} />
        <meshStandardMaterial color="#6B4E2E" roughness={0.85} />
      </mesh>
      {[
        [-0.4, 1.2],
        [0.4, 0.9],
        [-0.35, -0.6],
        [0.45, -1.35],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.85, z]} castShadow>
          <boxGeometry args={[0.8, 0.7, 0.9]} />
          <meshStandardMaterial color={BODY_DARK} roughness={0.8} />
        </mesh>
      ))}
      {[-1.0, 0, 1.0].map((z) => (
        <mesh key={z} position={[0, 1.22, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 1.8, 6]} />
          <meshStandardMaterial color={HITCH} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** 8. Snow blower. */
function SnowBlower({ running = false }: { running?: boolean }) {
  const auger = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (auger.current) auger.current.rotation.x += delta * (running ? 3 : 0.2);
  });
  return (
    <group>
      <mesh position={[0, 0.85, -0.3]} castShadow>
        <boxGeometry args={[1.5, 0.9, 1.5]} />
        <meshStandardMaterial color={TWIN_COLORS.trimOrange} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.65, -0.3]} castShadow>
        <boxGeometry args={[1.3, 0.9, 1.2]} />
        <meshStandardMaterial color={CAB} roughness={0.3} />
      </mesh>
      <mesh ref={auger} position={[0, 0.7, 1.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 1.4, 12]} />
        <meshStandardMaterial color="#8A949E" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.45, 1.95, 0.85]} rotation={[0.5, 0, -0.4]}>
        <cylinderGeometry args={[0.22, 0.28, 1.3, 10]} />
        <meshStandardMaterial color="#C63A2B" roughness={0.5} />
      </mesh>
      <group position={[-0.8, 0.36, -0.3]}>
        <Track length={2.6} width={0.6} running={running} />
      </group>
      <group position={[0.8, 0.36, -0.3]}>
        <Track length={2.6} width={0.6} running={running} />
      </group>
      <Beacon y={2.3} />
    </group>
  );
}

/** 9. Forklift. */
function Forklift() {
  return (
    <group>
      <mesh position={[0, 0.9, -0.3]} castShadow>
        <boxGeometry args={[1.2, 0.9, 2.0]} />
        <meshStandardMaterial color={TWIN_COLORS.door} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.75, -0.5]}>
        <boxGeometry args={[1.0, 0.75, 1.0]} />
        <meshStandardMaterial color="#3A4650" roughness={0.6} />
      </mesh>
      {[-0.62, 0.62].map((z) => (
        <group key={z} position={[0, 0.4, z]} rotation={[0, 0, Math.PI / 2]}>
          <Wheel r={0.4} w={0.28} />
        </group>
      ))}
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 1.5, 0.9]}>
          <boxGeometry args={[0.14, 2.6, 0.14]} />
          <meshStandardMaterial color={BODY_DARK} metalness={0.7} />
        </mesh>
      ))}
      {[-0.42, 0.42].map((x) => (
        <mesh key={`f${x}`} position={[x, 0.35, 1.4]}>
          <boxGeometry args={[0.16, 0.08, 1.1]} />
          <meshStandardMaterial color="#8A949E" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 1.35, -0.3]}>
        <boxGeometry args={[1.28, 0.7, 0.1]} />
        <meshStandardMaterial color="#0E1A26" />
      </mesh>
    </group>
  );
}

/** 10. Mobile crane. */
function MobileCrane({ running = false }: { running?: boolean }) {
  const turret = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!turret.current) return;
    turret.current.rotation.y = running
      ? 0.6 + Math.sin(clock.elapsedTime * 0.25) * 0.35
      : 0.35;
  });
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[2.0, 0.7, 4.2]} />
        <meshStandardMaterial color="#C63A2B" roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.5, 1.6]}>
        <boxGeometry args={[1.8, 0.9, 1.1]} />
        <meshStandardMaterial color={CAB} roughness={0.3} />
      </mesh>
      {[1.4, -1.4].map((z) => [-1.05, 1.05].map((x) => (
        <group key={`${x}-${z}`} position={[x, 0.42, z]} rotation={[0, 0, Math.PI / 2]}>
          <Wheel r={0.42} w={0.3} />
        </group>
      )))}
      <group ref={turret} position={[0, 1.35, -0.8]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[1.5, 1.0, 1.5]} />
          <meshStandardMaterial color="#E4A11B" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.9, 2.6]} rotation={[-0.55, 0, 0]}>
          <boxGeometry args={[0.42, 0.42, 7.0]} />
          <meshStandardMaterial color="#F2C14E" roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.5, -1.8]} rotation={[-0.4, 0, 0]}>
          <boxGeometry args={[0.34, 0.34, 4.2]} />
          <meshStandardMaterial color="#F2C14E" roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[0, -1.1, 5.4]}>
          <boxGeometry args={[0.2, 2.6, 0.2]} />
          <meshStandardMaterial color={BODY_DARK} metalness={0.6} />
        </mesh>
        <mesh position={[0, -2.5, 5.4]}>
          <boxGeometry args={[0.7, 0.4, 0.5]} />
          <meshStandardMaterial color={BODY_DARK} metalness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

/** 11. Zodiac inflatable boat. */
function Zodiac({ running = false }: { running?: boolean }) {
  const bob = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (bob.current) {
      const amp = running ? 0.14 : 0.07;
      bob.current.position.y = 0.42 + Math.sin(clock.elapsedTime * 1.1) * amp;
      bob.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * (running ? 0.07 : 0.03);
    }
  });
  return (
    <group ref={bob}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[1.5, 0.32, 10, 22]} />
        <meshStandardMaterial color="#C63A2B" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.4, 20]} />
        <meshStandardMaterial color="#2E3A44" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.1, -0.4]}>
        <boxGeometry args={[1.0, 0.16, 0.5]} />
        <meshStandardMaterial color="#3B4854" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.5, -0.5]}>
        <boxGeometry args={[1.1, 0.55, 0.1]} />
        <meshStandardMaterial color="#0E1A26" />
      </mesh>
      <mesh position={[0, 0.15, 1.85]}>
        <boxGeometry args={[0.36, 0.7, 0.4]} />
        <meshStandardMaterial color={BODY_DARK} metalness={0.6} />
      </mesh>
    </group>
  );
}

/** 12. Utility trailer. */
function UtilityTrailer() {
  return (
    <group>
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.6, 0.5, 2.6]} />
        <meshStandardMaterial color={BODY} roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[1.66, 0.1, 2.66]} />
        <meshStandardMaterial color={BODY_DARK} roughness={0.7} />
      </mesh>
      {[-0.5, 0.5].map((z) => (
        <group key={z} position={[0, 0.36, z]} rotation={[0, 0, Math.PI / 2]}>
          <Wheel r={0.36} w={0.24} />
        </group>
      ))}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.5, 1.5]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.1, 0.1, 1.2]} />
          <meshStandardMaterial color={BODY_DARK} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 1.35, -0.3]} castShadow>
        <boxGeometry args={[1.1, 0.5, 1.2]} />
        <meshStandardMaterial color={TWIN_COLORS.trimOrange} roughness={0.8} />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={`l${x}`} position={[x, 0.9, -1.3]} rotation={[-0.9, 0, 0]}>
          <boxGeometry args={[0.55, 0.08, 0.12]} />
          <meshStandardMaterial color={HITCH} emissive={HITCH} emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/** Vehicle class registry used to lay out each station yard. */
export interface VehicleClassDef {
  id: string;
  label: string;
  Component: (props: { running?: boolean }) => ReactElement;
  scale: number;
}

export const VEHICLE_CLASSES: VehicleClassDef[] = [
  { id: "pistenbully", label: "PistenBully", Component: PistenBully, scale: 1 },
  { id: "snowmobile", label: "Snowmobile", Component: Snowmobile, scale: 1 },
  { id: "atv", label: "ATV Quad Bike", Component: Atv, scale: 1 },
  { id: "cargo-carrier", label: "Tracked Cargo Carrier", Component: CargoCarrier, scale: 1 },
  { id: "helicopter", label: "Helicopter", Component: Helicopter, scale: 1 },
  { id: "nansen-sledge", label: "Nansen Sledge", Component: NansenSledge, scale: 1 },
  { id: "cargo-sledge", label: "Cargo Sledge", Component: CargoSledge, scale: 1 },
  { id: "snow-blower", label: "Snow Blower", Component: SnowBlower, scale: 1 },
  { id: "forklift", label: "Forklift", Component: Forklift, scale: 1 },
  { id: "mobile-crane", label: "Mobile Crane", Component: MobileCrane, scale: 1 },
  { id: "zodiac", label: "Zodiac Boat", Component: Zodiac, scale: 1 },
  { id: "trailer", label: "Utility Trailer", Component: UtilityTrailer, scale: 1 },
];

/** Fleet complement per station. */
export const FLEET: Record<
  string,
  Array<{ id: string; count: number; x: number; z: number; rot: number; dx: number; dz: number }>
> = {
  // Maitri vehicle yard sits east of the fuel farm, clear of the lake and
  // the field-camp rows. The helicopter stands on its own pad to the south.
  maitri: [
    { id: "pistenbully", count: 2, x: 58, z: 22, rot: 0.3, dx: 5.5, dz: 1.6 },
    { id: "snowmobile", count: 3, x: 60, z: 14, rot: 1.2, dx: 2.4, dz: 1.0 },
    { id: "atv", count: 2, x: 60, z: 8, rot: -0.4, dx: 2.8, dz: 1.2 },
    { id: "cargo-carrier", count: 1, x: 54, z: -2, rot: 0.1, dx: 4.6, dz: 2.4 },
    { id: "helicopter", count: 1, x: 74, z: -30, rot: 0.6, dx: 8, dz: 8 },
    { id: "nansen-sledge", count: 2, x: 78, z: 16, rot: 1.6, dx: 1.6, dz: 3.6 },
    { id: "cargo-sledge", count: 2, x: 78, z: 24, rot: 1.6, dx: 2.2, dz: 4.4 },
    { id: "snow-blower", count: 1, x: 52, z: 14, rot: -0.8, dx: 4, dz: 2 },
    { id: "forklift", count: 1, x: 52, z: 6, rot: 0.9, dx: 3, dz: 2 },
    { id: "trailer", count: 2, x: 66, z: -6, rot: 0.2, dx: 2.8, dz: 3.4 },
  ],
  // Bharati vehicle yard runs west of the CHP hall; the Zodiac is kept on the
  // shoreline between Thala Fjord and Quilty Bay.
  bharati: [
    { id: "pistenbully", count: 3, x: -90, z: 24, rot: 0.35, dx: 5.5, dz: 1.7 },
    { id: "snowmobile", count: 5, x: -86, z: 16, rot: 1.25, dx: 2.4, dz: 1.0 },
    { id: "atv", count: 3, x: -84, z: 10, rot: -0.45, dx: 2.8, dz: 1.3 },
    { id: "cargo-carrier", count: 2, x: -92, z: 2, rot: 0.12, dx: 5.0, dz: 2.8 },
    { id: "helicopter", count: 1, x: -74, z: -34, rot: 0.7, dx: 8, dz: 8 },
    { id: "nansen-sledge", count: 3, x: -70, z: 24, rot: 1.6, dx: 1.6, dz: 3.6 },
    { id: "cargo-sledge", count: 3, x: -70, z: 32, rot: 1.6, dx: 2.2, dz: 4.4 },
    { id: "snow-blower", count: 2, x: -58, z: 16, rot: -0.85, dx: 4, dz: 2.2 },
    { id: "forklift", count: 2, x: -56, z: 6, rot: 0.9, dx: 3.2, dz: 2.2 },
    { id: "mobile-crane", count: 1, x: -96, z: -16, rot: 0.5, dx: 6, dz: 5 },
    { id: "zodiac", count: 1, x: 60, z: 100, rot: 0.2, dx: 4, dz: 4 },
    { id: "trailer", count: 2, x: -84, z: -8, rot: 0.2, dx: 2.8, dz: 3.4 },
  ],
};

/**
 * One parked unit.
 *
 * The unit is clickable and reports its stable identifier, so the console can
 * open the right maintenance record. Hovering shows a tail number plate in the
 * status colour, which is how the yard reads at a glance from the air.
 */
function VehicleUnit({
  instanceId,
  tail,
  label,
  tone,
  position,
  rotation,
  running,
  active,
  onSelect,
  children,
}: {
  instanceId: string;
  tail: string;
  label: string;
  tone: string;
  position: [number, number, number];
  rotation: [number, number, number];
  running: boolean;
  active: boolean;
  onSelect?: (id: string) => void;
  children: ReactElement;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <group
      position={position}
      rotation={rotation}
      scale={0.9}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (onSelect) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(instanceId);
      }}
    >
      {children}
      {(hovered || active) && (
        <Label3D
          position={[0, 3.4, 0]}
          border={tone}
          px={0.14}
          rows={[
            { text: tail, color: tone },
            { text: running ? "RUNNING" : "PARKED", color: running ? "#3EE07F" : "#6B7A8F" },
          ]}
        />
      )}
      {active && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.6, 3.1, 28]} />
          <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.8} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

/** Full vehicle yard for one station, with per unit interaction. */
export function VehicleFleet({
  station,
  onSelect,
  activeVehicle,
  runningIds,
}: {
  station: "maitri" | "bharati";
  onSelect?: (instanceId: string) => void;
  activeVehicle?: string | null;
  /** Units whose engines the operator has started. */
  runningIds?: string[];
}) {
  const layout = FLEET[station] ?? [];
  const instances = vehicleInstances(station);
  return (
    <group>
      {layout.map((entry) => {
        const cls = VEHICLE_CLASSES.find((c) => c.id === entry.id);
        if (!cls) return null;
        const { Component } = cls;
        return (
          <group key={entry.id}>
            {Array.from({ length: entry.count }).map((_, i) => {
              const instanceId = `${station}-${entry.id}-${i + 1}`;
              const record = instances.find((v) => v.id === instanceId);
              const running = runningIds
                ? runningIds.includes(instanceId)
                : (record?.running ?? false);
              return (
                <VehicleUnit
                  key={instanceId}
                  instanceId={instanceId}
                  tail={record?.tail ?? "VH-01"}
                  label={record?.label ?? cls.label}
                  tone={record ? statusTone(record.status) : TWIN_COLORS.cyan}
                  position={[
                    entry.x + i * entry.dx,
                    0,
                    entry.z + (i % 2 === 0 ? 0 : entry.dz),
                  ]}
                  rotation={[0, entry.rot + i * 0.12, 0]}
                  running={running}
                  active={activeVehicle === instanceId}
                  onSelect={onSelect}
                >
                  <Component running={running} />
                </VehicleUnit>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/** Total vehicles rendered for a station, for the console header. */
export function fleetCount(station: "maitri" | "bharati"): number {
  return (FLEET[station] ?? []).reduce((sum, entry) => sum + entry.count, 0);
}

/**
 * World position of one parked unit, read back from the same yard layout the
 * models are placed from, so the console can fly the camera to a unit that was
 * picked from a list rather than from the scene.
 */
export function vehiclePosition(
  station: "maitri" | "bharati",
  instanceId: string,
): [number, number] | null {
  for (const entry of FLEET[station] ?? []) {
    for (let i = 0; i < entry.count; i += 1) {
      if (`${station}-${entry.id}-${i + 1}` === instanceId) {
        return [entry.x + i * entry.dx, entry.z + (i % 2 === 0 ? 0 : entry.dz)];
      }
    }
  }
  return null;
}
