import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { INT } from "../interiors/kit";
import type { WaterBodyDef } from "./water-data";

/**
 * Interactive water body.
 *
 * The surface is displaced by three superposed swell components in a small
 * custom shader, so the wave height and speed come straight from the station
 * data: a 5 cm ripple on Lake Priyadarshini, 0.8 m whitecapped swell on Thala
 * Fjord. Fresnel mixing gives the characteristic dark water at high viewing
 * angles and an aurora ribbon reflection across the far edge.
 *
 * Clicking any part of the surface reports the body to the console, which
 * opens its data panel. When the underwater view is active the submerged set
 * is mounted: seabed relief, boulders, fish, rising bubbles and the intake
 * line where the body has one.
 */

/** Segment count for a water plane, banded by body size. */
function SEGMENTS(radius: number): number {
  if (radius <= 6) return 10;
  if (radius <= 20) return 20;
  if (radius <= 60) return 34;
  return 52;
}

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uSpeed;
varying float vHeight;
varying vec3 vWorld;
void main() {
  vec3 p = position;
  float t = uTime * uSpeed;
  float h =
    sin(p.x * 0.16 + t) * 0.5 +
    sin(p.y * 0.23 - t * 1.3) * 0.3 +
    sin((p.x + p.y) * 0.09 + t * 0.7) * 0.2;
  p.z += h * uAmp;
  vHeight = h;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uAurora;
uniform float uTime;
uniform float uOpacity;
varying float vHeight;
varying vec3 vWorld;
void main() {
  vec3 toCamera = cameraPosition - vWorld;
  vec3 view = normalize(toCamera);
  float fresnel = pow(1.0 - clamp(abs(view.y), 0.0, 1.0), 2.0);
  vec3 base = mix(uDeep, uShallow, clamp(vHeight * 0.5 + 0.5, 0.0, 1.0));
  base = mix(base, uShallow * 1.3, fresnel * 0.6);
  float ribbon = sin(vWorld.x * 0.045 + uTime * 0.22) * 0.5 + 0.5;
  float band = smoothstep(0.6, 1.0, ribbon) * (1.0 - fresnel) * 0.32;
  vec3 colour = base + uAurora * band;
  colour += vec3(pow(max(0.0, vHeight), 6.0) * 0.3);
  gl_FragColor = vec4(colour, uOpacity);
}
`;

/** Water surface with animated swell. */
function Surface({
  def,
  onSelect,
  active,
  heatmap,
}: {
  def: WaterBodyDef;
  onSelect?: (id: string) => void;
  active?: boolean;
  heatmap?: boolean;
}) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const surfaceY = def.surfaceY ?? 0.3;

  const uniforms = useMemo(() => {
    // Heatmap mode recolours the lakelet by its measured ice thickness, so the
    // overlay reads as a survey rather than a decoration.
    let deep = new THREE.Color(def.deep);
    let shallow = new THREE.Color(def.shallow);
    if (heatmap) {
      const t = THREE.MathUtils.clamp((def.iceThicknessCm - 55) / 45, 0, 1);
      deep = new THREE.Color().setHSL(0.52 - t * 0.52, 0.8, 0.24);
      shallow = new THREE.Color().setHSL(0.52 - t * 0.52, 0.85, 0.46);
    }
    return {
      uTime: { value: 0 },
      uAmp: { value: def.waveAmp },
      uSpeed: { value: def.waveSpeed },
      uDeep: { value: deep },
      uShallow: { value: shallow },
      uAurora: { value: new THREE.Color(INT.trim) },
      uOpacity: { value: heatmap ? 0.94 : 0.9 },
    };
  }, [def.deep, def.shallow, def.waveAmp, def.waveSpeed, def.iceThicknessCm, heatmap]);

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh
      position={[def.position[0], surfaceY, def.position[1]]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[def.radius[0] * 2, def.radius[1] * 2, 1]}
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
        onSelect?.(def.id);
      }}
    >
      {/* Tessellation scales with the body: a 2 m lakelet does not need the
          same grid as a 300 m fjord. */}
      <planeGeometry
        args={[1, 1, SEGMENTS(Math.max(def.radius[0], def.radius[1])), SEGMENTS(Math.max(def.radius[0], def.radius[1]))]}
      />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        transparent
        side={THREE.DoubleSide}
      />
      {/* Selection ring sits in the surface's own space, so it inherits the
          body rotation and follows the shoreline ellipse. */}
      {active && (
        <mesh position={[0, 0, 0.5]} scale={[0.5, 0.5, 1]}>
          <ringGeometry args={[0.94, 1.0, 64]} />
          <meshBasicMaterial
            color={INT.trim}
            transparent
            opacity={hovered ? 0.85 : 0.5}
            depthWrite={false}
          />
        </mesh>
      )}
    </mesh>
  );
}

/** Ice collar around the shoreline with thickness read from the body data. */
function IceCollar({ def }: { def: WaterBodyDef }) {
  const thickness = Math.min(0.6, 0.12 + def.iceThicknessCm / 320);
  const span = Math.max(def.radius[0], def.radius[1]);
  // Small lakes get a simple rim: the broken ice blocks only read at scale.
  const blocks = span < 8 ? 0 : span < 40 ? 8 : 12;
  const ringSegments = span < 8 ? 16 : span < 40 ? 40 : 72;
  return (
    <group position={[def.position[0], 0.16, def.position[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[def.radius[0] * 2, def.radius[1] * 2, 1]}>
        <ringGeometry args={[0.9, 1.06, ringSegments]} />
        <meshStandardMaterial color="#DCEAF2" roughness={0.62} metalness={0.02} />
      </mesh>
      {blocks > 0 && (
        <mesh position={[0, thickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[def.radius[0] * 2, def.radius[1] * 2, 1]}>
          <ringGeometry args={[0.9, 1.02, ringSegments]} />
          <meshStandardMaterial color="#A8C6D8" roughness={0.5} transparent opacity={0.8} />
        </mesh>
      )}
      {Array.from({ length: blocks }, (_, i) => {
        const angle = (i / Math.max(1, blocks)) * Math.PI * 2;
        const x = Math.cos(angle) * def.radius[0] * 0.93;
        const z = Math.sin(angle) * def.radius[1] * 0.93;
        return (
          <mesh
            key={i}
            position={[x, thickness / 2, z]}
            rotation={[0.12 * Math.sin(i), angle, 0.1 * Math.cos(i)]}
          >
            <boxGeometry args={[2.2 + (i % 3) * 0.6, thickness, 1.4]} />
            <meshStandardMaterial color="#E4EFF5" roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Drifting ice floes or icebergs, numbered when the tracker is active. */
function Floes({ def, trackers }: { def: WaterBodyDef; trackers?: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const floe = def.floes[i];
      if (!floe) return;
      const drift = ((floe.driftDeg ?? 0) * Math.PI) / 180;
      child.position.x = floe.x + Math.sin(t * 0.06 + drift) * (1.4 + i * 0.3);
      child.position.z = floe.z + Math.cos(t * 0.05 + drift) * (1.1 + i * 0.25);
      child.rotation.y = t * 0.03 + drift;
    });
  });
  const surfaceY = def.surfaceY ?? 0.3;
  return (
    <group ref={group} position={[def.position[0], surfaceY + 0.12, def.position[1]]}>
      {def.floes.map((floe, i) => (
        <group key={i} position={[floe.x, 0, floe.z]}>
          <mesh>
            <cylinderGeometry args={[floe.r, floe.r * 0.82, floe.r * 0.36, 8]} />
            <meshStandardMaterial color="#E8F1F6" roughness={0.55} metalness={0.02} />
          </mesh>
          <mesh position={[0, floe.r * 0.1, 0]}>
            <cylinderGeometry args={[floe.r * 0.94, floe.r * 0.94, floe.r * 0.2, 8]} />
            <meshStandardMaterial color="#CFE3EF" roughness={0.4} transparent opacity={0.85} />
          </mesh>
          {trackers && floe.marker !== undefined && (
            <mesh position={[0, floe.r * 0.5 + 0.6, 0]}>
              <octahedronGeometry args={[0.55]} />
              <meshStandardMaterial color={INT.amber} emissive={INT.amber} emissiveIntensity={1.3} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** Fish swimming a slow circle around the submerged rocks. */
function Fish({ count, seabedY, radius }: { count: number; seabedY: number; radius: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const speed = 0.12 + (i % 4) * 0.03;
      const angle = t * speed + i * 1.7;
      const r = radius * (0.25 + ((i * 37) % 60) / 100);
      child.position.set(Math.cos(angle) * r, seabedY + 1.4 + (i % 5) * 0.6, Math.sin(angle) * r);
      child.rotation.y = -angle;
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i}>
          <mesh>
            <capsuleGeometry args={[0.14, 0.5, 3, 6]} />
            <meshStandardMaterial color="#5A7C8C" roughness={0.7} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0, -0.42]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.13, 0.3, 4]} />
            <meshStandardMaterial color="#3F5C6B" roughness={0.75} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Rising bubbles traced in the water column. */
function Bubbles({ count, top }: { count: number; top: number }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = Math.random() * top;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count, top]);
  const speeds = useMemo(
    () => Array.from({ length: count }, () => 0.6 + Math.random() * 1.1),
    [count],
  );
  const ref = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    const attr = geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * delta;
      if (arr[i * 3 + 1] > top) arr[i * 3 + 1] = 0;
    }
    attr.needsUpdate = true;
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color="#BFE8FF" size={0.28} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

/** Submerged set: seabed relief, boulders, intake line, fish and bubbles. */
function Submerged({ def }: { def: WaterBodyDef }) {
  const surfaceY = def.surfaceY ?? 0.3;
  const seabedY = -def.depthM * 0.55;

  const seabed = useMemo(() => {
    const geo = new THREE.PlaneGeometry(def.radius[0] * 2, def.radius[1] * 2, 40, 40);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const nx = v.x / Math.max(1, def.radius[0]);
      const nz = v.y / Math.max(1, def.radius[1]);
      const radial = Math.hypot(nx, nz);
      let h =
        1.2 * Math.sin(nx * 5.1 + nz * 3.3) +
        0.7 * Math.sin(nx * 11.7 - nz * 9.1) +
        0.4 * Math.cos(nx * 19.3 + nz * 17.7);
      // Shoreline shelves away toward the middle of the body.
      h -= Math.max(0, 1 - radial) * def.depthM * 0.16;
      pos.setZ(i, h);
    }
    geo.computeVertexNormals();
    return geo;
  }, [def.radius, def.depthM]);

  const rocks = useMemo(
    () =>
      Array.from({ length: def.underwater.rocks }, (_, i) => ({
        x: (Math.random() - 0.5) * def.radius[0] * 1.5,
        z: (Math.random() - 0.5) * def.radius[1] * 1.5,
        s: 0.5 + (i % 5) * 0.4,
      })),
    [def.underwater.rocks, def.radius],
  );

  return (
    <group>
      <mesh geometry={seabed} position={[def.position[0], seabedY, def.position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={def.seabed} roughness={0.95} metalness={0.02} />
      </mesh>
      {rocks.map((rock, i) => (
        <mesh key={i} position={[def.position[0] + rock.x, seabedY + rock.s * 0.3, def.position[1] + rock.z]} rotation={[0.3 * i, i, 0.2]}>
          <dodecahedronGeometry args={[rock.s, 0]} />
          <meshStandardMaterial color={def.seabed} roughness={0.95} />
        </mesh>
      ))}
      {def.underwater.vegetation &&
        Array.from({ length: 10 }, (_, i) => (
          <mesh
            key={`v${i}`}
            position={[
              def.position[0] + (Math.random() - 0.5) * def.radius[0] * 1.6,
              seabedY + 0.6,
              def.position[1] + (Math.random() - 0.5) * def.radius[1] * 1.6,
            ]}
            rotation={[0.1, i, 0.2]}
          >
            <coneGeometry args={[0.22, 1.2, 5]} />
            <meshStandardMaterial color="#3E6B4A" roughness={0.9} transparent opacity={0.75} />
          </mesh>
        ))}
      {def.underwater.fish > 0 && (
        <group position={[def.position[0], seabedY, def.position[1]]}>
          <Fish count={def.underwater.fish} seabedY={0} radius={def.radius[0]} />
        </group>
      )}
      {def.underwater.intakePipe && (
        <group>
          <mesh
            position={[def.position[0], seabedY + 0.9, def.position[1]]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.34, 0.34, def.radius[0] * 1.3, 14]} />
            <meshStandardMaterial color={INT.trim} emissive={INT.trim} emissiveIntensity={0.35} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[def.position[0] + def.radius[0] * 0.62, seabedY + 0.9, def.position[1]]}>
            <cylinderGeometry args={[0.5, 0.5, 0.7, 12]} />
            <meshStandardMaterial color={INT.steel} metalness={0.7} roughness={0.3} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[def.position[0] - def.radius[0] * 0.55 + i * (def.radius[0] * 0.22), seabedY + 0.9, def.position[1]]}>
              <torusGeometry args={[0.4, 0.05, 6, 12]} />
              <meshStandardMaterial color={INT.steel} metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
        </group>
      )}
      <group position={[def.position[0], seabedY + 1.2, def.position[1]]}>
        <Bubbles count={90} top={Math.abs(seabedY) + surfaceY + 1.2} />
      </group>
    </group>
  );
}

export function WaterBody({
  def,
  onSelect,
  active,
  submerged = false,
  trackers = false,
  heatmap = false,
  research = false,
}: {
  def: WaterBodyDef;
  onSelect?: (id: string) => void;
  active?: boolean;
  submerged?: boolean;
  trackers?: boolean;
  heatmap?: boolean;
  /** Marks a lakelet with an active research programme. */
  research?: boolean;
}) {
  const surfaceY = def.surfaceY ?? 0.3;
  return (
    <group>
      <Surface def={def} onSelect={onSelect} active={active} heatmap={heatmap} />
      {def.kind !== "intake" && <IceCollar def={def} />}
      {def.floes.length > 0 && <Floes def={def} trackers={trackers} />}
      {research && (
        <mesh position={[def.position[0], surfaceY + 0.9, def.position[1]]}>
          <octahedronGeometry args={[0.42]} />
          <meshStandardMaterial color={INT.trim} emissive={INT.trim} emissiveIntensity={1.4} />
        </mesh>
      )}
      {submerged && <Submerged def={def} />}
    </group>
  );
}
