import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import {
  dismissLabel,
  pinLabel,
  useHoverHold,
  useLabelPinned,
  useLabelSuppressed,
} from "../scene-labels";
import { Label3D, TWIN_COLORS, useTwinDisplay } from "../twin-primitives";
import {
  COLONIES,
  DEV_PROFILE,
  SPECIES,
  type ColonyDef,
  type ColonyKind,
} from "./wildlife-data";
import type { StationSlug } from "@/lib/station";

/**
 * Antarctic wildlife.
 *
 * Every animal is built from a handful of shared primitives so the whole layer
 * costs a few hundred cheap meshes rather than a model file per species. The
 * proportions are deliberately on the cute side — round bodies, oversized
 * heads, eyes with a highlight — because the twin is read by people who should
 * want to look at it, and every colony is clickable, hoverable and animated.
 *
 * Placement follows the geography, not the wish list: marine fauna belongs to
 * the coastal station (Bharati), while the inland oasis (Maitri) gets the
 * flyers that nest on nunataks and the invertebrates in its lake.
 */

/* ------------------------------------------------------------------ */
/* Shared geometry and materials                                       */
/* ------------------------------------------------------------------ */

const G = {
  ball: new THREE.SphereGeometry(1, 18, 14),
  ballLow: new THREE.SphereGeometry(1, 10, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 12),
  spike: new THREE.ConeGeometry(1, 1, 6),
  tube: new THREE.CylinderGeometry(1, 1, 1, 8),
  wing: new THREE.BoxGeometry(1, 0.16, 1),
  fin: new THREE.ConeGeometry(1, 1, 4),
};

const mat = (color: string, roughness = 0.6, extras: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04, ...extras });

const M = {
  penguinBack: mat("#1D242E", 0.55),
  penguinBelly: mat("#F3F8FC", 0.72),
  emperorBack: mat("#2A3340", 0.5),
  gentooBack: mat("#2C3846", 0.52),
  emperorPatch: mat("#F2B233", 0.5, { emissive: "#E09A1F", emissiveIntensity: 0.18 }),
  blush: mat("#F2A2A2", 0.85, { emissive: "#E77E7E", emissiveIntensity: 0.12 }),
  beak: mat("#E2622C", 0.45),
  beakDark: mat("#2B3038", 0.4),
  feet: mat("#E8913A", 0.5),
  chick: mat("#B9C0C7", 0.9),
  seal: mat("#9AA6B1", 0.5),
  sealLight: mat("#C2CCD4", 0.55),
  sealDark: mat("#6E7B88", 0.55),
  sealPup: mat("#DCE3E9", 0.85),
  eye: mat("#0B0F14", 0.25),
  glint: mat("#FFFFFF", 0.1, { emissive: "#FFFFFF", emissiveIntensity: 0.75 }),
  whale: mat("#3A4A5A", 0.45),
  whaleBelly: mat("#C6D3DD", 0.55),
  minke: mat("#37424E", 0.42),
  minkeBelly: mat("#D3DEE6", 0.55),
  orca: mat("#14181E", 0.32),
  orcaWhite: mat("#F4F8FB", 0.6),
  bird: mat("#F6FAFD", 0.7),
  birdDark: mat("#2E3742", 0.6),
  birdBrown: mat("#7A6248", 0.75),
  fish: mat("#BFD7E2", 0.4, { emissive: "#7FB4E8", emissiveIntensity: 0.12 }),
  krill: mat("#F2A0AE", 0.4, { emissive: "#F27A93", emissiveIntensity: 0.4 }),
  parka: mat("#C46A2B", 0.62),
  parkaDark: mat("#27415C", 0.65),
  band: mat("#EFF4F8", 0.4, { emissive: "#EFF4F8", emissiveIntensity: 0.25 }),
  skin: mat("#D9A176", 0.7),
  fur: mat("#8C9299", 0.95),
  boot: mat("#20262E", 0.7),
};

/* ------------------------------------------------------------------ */
/* Penguins                                                            */
/* ------------------------------------------------------------------ */

type PenguinKind = "adelie" | "emperor" | "chinstrap" | "gentoo";

/**
 * One penguin.
 *
 * The proportions are pushed deliberately towards the cute end of the range: a
 * plump egg-shaped body, an oversized head, wide-set eyes with a bright glint,
 * a soft rosy cheek patch, and an idle that blinks, hops and looks around like
 * a real bird rather than a statue. The species markings stay correct, so the
 * same model reads as an Adelie, an emperor, a chinstrap or a gentoo.
 */
function Penguin({
  kind,
  phase,
  yaw,
  chick = false,
}: {
  kind: PenguinKind;
  phase: number;
  yaw: number;
  chick?: boolean;
}) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const flippers = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const tall = kind === "emperor" ? 1.32 : 1;
  const back =
    kind === "gentoo" ? M.gentooBack : kind === "emperor" ? M.emperorBack : M.penguinBack;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (kind === "emperor" ? 1.5 : 2.3) + phase;
    if (body.current) {
      // Waddle: rock side to side, bob, and hop every so often.
      const hop = Math.max(0, Math.sin(t * 0.19)) ** 44;
      body.current.rotation.z = Math.sin(t) * (chick ? 0.12 : 0.16);
      body.current.position.y =
        Math.abs(Math.sin(t * 2)) * (chick ? 0.03 : 0.05) + hop * 0.14;
      body.current.rotation.y = yaw + Math.sin(t * 0.33) * 0.55;
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.47 + 1.2) * 0.5;
      head.current.rotation.x = Math.sin(t * 0.29) * 0.12;
      head.current.rotation.z = Math.sin(t * 0.23) * 0.08;
    }
    if (flippers.current) {
      flippers.current.rotation.x = Math.sin(t * 1.35) * 0.2;
    }
    // Blink: the eye group squashes flat for a few frames every few seconds.
    if (eyes.current) eyes.current.scale.y = 1 - 0.82 * Math.max(0, Math.sin(t * 0.31)) ** 30;
  });

  if (chick) {
    return (
      <group ref={body} scale={0.62 * tall}>
        {/* Fluffy grey juvenile: rounder than the adult, with a soft down coat. */}
        <mesh geometry={G.ball} material={M.chick} position={[0, 0.34, 0]} scale={[0.31, 0.37, 0.32]} />
        <mesh geometry={G.ball} material={M.chick} position={[0, 0.63, 0.01]} scale={[0.2, 0.2, 0.2]} />
        <mesh geometry={G.ball} material={M.penguinBelly} position={[0, 0.58, 0.14]} scale={[0.12, 0.13, 0.09]} />
        <mesh geometry={G.cone} material={M.beakDark} position={[0, 0.6, 0.25]} rotation={[Math.PI / 2, 0, 0]} scale={[0.04, 0.11, 0.04]} />
        <group ref={eyes}>
          <mesh geometry={G.ball} material={M.eye} position={[0.08, 0.64, 0.16]} scale={0.033} />
          <mesh geometry={G.ball} material={M.eye} position={[-0.08, 0.64, 0.16]} scale={0.033} />
          <mesh geometry={G.ball} material={M.glint} position={[0.09, 0.655, 0.18]} scale={0.012} />
          <mesh geometry={G.ball} material={M.glint} position={[-0.07, 0.655, 0.18]} scale={0.012} />
        </group>
        <mesh geometry={G.ball} material={M.blush} position={[0.13, 0.6, 0.13]} scale={[0.04, 0.028, 0.016]} />
        <mesh geometry={G.ball} material={M.blush} position={[-0.13, 0.6, 0.13]} scale={[0.04, 0.028, 0.016]} />
        <mesh geometry={G.box} material={M.feet} position={[0.09, 0.03, 0.07]} scale={[0.09, 0.05, 0.16]} />
        <mesh geometry={G.box} material={M.feet} position={[-0.09, 0.03, 0.07]} scale={[0.09, 0.05, 0.16]} />
      </group>
    );
  }

  return (
    <group ref={body} scale={tall}>
      {/* Plump egg-shaped body with a white belly patch and a short tail. */}
      <mesh geometry={G.ball} material={back} position={[0, 0.44, 0]} scale={[0.32, 0.44, 0.34]} />
      <mesh geometry={G.ball} material={M.penguinBelly} position={[0, 0.4, 0.075]} scale={[0.26, 0.38, 0.28]} />
      <mesh geometry={G.ball} material={back} position={[0, 0.17, -0.3]} scale={[0.12, 0.09, 0.13]} />
      {/* Head, deliberately oversized for the cute ratio. */}
      <group ref={head} position={[0, 0.92, 0.02]}>
        <mesh geometry={G.ball} material={back} scale={[0.25, 0.26, 0.26]} />
        <mesh geometry={G.ball} material={M.penguinBelly} position={[0, -0.03, 0.1]} scale={[0.18, 0.19, 0.18]} />
        <group ref={eyes}>
          <mesh geometry={G.ball} material={M.eye} position={[0.1, 0.03, 0.17]} scale={0.042} />
          <mesh geometry={G.ball} material={M.eye} position={[-0.1, 0.03, 0.17]} scale={0.042} />
          <mesh geometry={G.ball} material={M.glint} position={[0.11, 0.05, 0.19]} scale={0.015} />
          <mesh geometry={G.ball} material={M.glint} position={[-0.09, 0.05, 0.19]} scale={0.015} />
        </group>
        {/* Adelie white eye ring. */}
        {kind === "adelie" && (
          <>
            <mesh geometry={G.ball} material={M.penguinBelly} position={[0.1, 0.03, 0.155]} scale={0.078} />
            <mesh geometry={G.ball} material={M.penguinBelly} position={[-0.1, 0.03, 0.155]} scale={0.078} />
          </>
        )}
        {/* Emperor yellow-orange neck patch. */}
        {kind === "emperor" && (
          <>
            <mesh geometry={G.ball} material={M.emperorPatch} position={[0.15, -0.15, 0.07]} scale={[0.1, 0.14, 0.13]} />
            <mesh geometry={G.ball} material={M.emperorPatch} position={[-0.15, -0.15, 0.07]} scale={[0.1, 0.14, 0.13]} />
          </>
        )}
        {/* Chinstrap: one thin dark strap under the chin, up past each cheek. */}
        {kind === "chinstrap" && (
          <>
            <mesh geometry={G.ball} material={M.penguinBack} position={[0, -0.14, 0.06]} scale={[0.21, 0.03, 0.21]} />
            <mesh geometry={G.ball} material={M.penguinBack} position={[0.18, -0.06, 0.07]} rotation={[0, 0, -0.5]} scale={[0.03, 0.085, 0.16]} />
            <mesh geometry={G.ball} material={M.penguinBack} position={[-0.18, -0.06, 0.07]} rotation={[0, 0, 0.5]} scale={[0.03, 0.085, 0.16]} />
          </>
        )}
        {/* Gentoo: white bonnet patch above each eye. */}
        {kind === "gentoo" && (
          <>
            <mesh geometry={G.ball} material={M.penguinBelly} position={[0.11, 0.125, 0.15]} scale={[0.085, 0.055, 0.075]} />
            <mesh geometry={G.ball} material={M.penguinBelly} position={[-0.11, 0.125, 0.15]} scale={[0.085, 0.055, 0.075]} />
          </>
        )}
        {/* Rosy cheeks: the single biggest contributor to the cute read. */}
        <mesh geometry={G.ball} material={M.blush} position={[0.16, -0.055, 0.12]} scale={[0.05, 0.035, 0.02]} />
        <mesh geometry={G.ball} material={M.blush} position={[-0.16, -0.055, 0.12]} scale={[0.05, 0.035, 0.02]} />
        <mesh
          geometry={G.cone}
          material={kind === "gentoo" ? M.beak : M.beakDark}
          position={[0, -0.03, 0.28]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[
            kind === "emperor" ? 0.05 : 0.045,
            kind === "emperor" ? 0.26 : kind === "gentoo" ? 0.2 : 0.17,
            kind === "emperor" ? 0.05 : 0.045,
          ]}
        />
      </group>
      <group ref={flippers}>
        <mesh geometry={G.ball} material={back} position={[0.29, 0.48, 0]} rotation={[0, 0, -0.3]} scale={[0.05, 0.24, 0.12]} />
        <mesh geometry={G.ball} material={back} position={[-0.29, 0.48, 0]} rotation={[0, 0, 0.3]} scale={[0.05, 0.24, 0.12]} />
      </group>
      <mesh geometry={G.box} material={M.feet} position={[0.1, 0.04, 0.1]} scale={[0.11, 0.06, 0.18]} />
      <mesh geometry={G.box} material={M.feet} position={[-0.1, 0.04, 0.1]} scale={[0.11, 0.06, 0.18]} />
    </group>
  );
}

/** Group of penguins, standing or huddled, with chicks in front. */
function PenguinFlock({
  kind,
  count,
  chicks,
  huddled,
}: {
  kind: PenguinKind;
  count: number;
  chicks: number;
  huddled: boolean;
}) {
  const birds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // Clustered ring for a huddle, loose scatter for a waddle.
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.21;
        const radius = huddled ? 0.7 + (i % 3) * 0.55 : 1.4 + (i % 5) * 1.25;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius * 0.8,
          yaw: angle + Math.PI,
          phase: i * 1.37,
        };
      }),
    [count, huddled],
  );

  return (
    <group>
      {birds.map((bird, i) => (
        <group key={i} position={[bird.x, 0, bird.z]}>
          <Penguin kind={kind} phase={bird.phase} yaw={bird.yaw} />
        </group>
      ))}
      {Array.from({ length: chicks }, (_, i) => (
        <group key={`chick-${i}`} position={[(i - (chicks - 1) / 2) * 1.1, 0, 1.9 + (i % 2) * 0.6]}>
          <Penguin kind={kind} phase={2 + i * 1.9} yaw={0.2} chick />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Seals                                                               */
/* ------------------------------------------------------------------ */

function Seal({
  phase,
  pup = false,
  tone = M.seal,
  spots = 0,
}: {
  phase: number;
  pup?: boolean;
  tone?: THREE.MeshStandardMaterial;
  /** Number of dark blotches drawn along the back (leopard seal). */
  spots?: number;
}) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const skin = pup ? M.sealPup : tone;
  const scale = pup ? 0.55 : 1;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.9 + phase;
    if (body.current) {
      body.current.rotation.x = Math.sin(t * 0.7) * 0.05;
      body.current.position.y = Math.sin(t * 0.9) * 0.03;
    }
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 0.6) * 0.14;
      head.current.position.y = 0.42 + Math.max(0, Math.sin(t * 0.32)) * 0.18;
    }
    if (tail.current) tail.current.rotation.y = Math.sin(t * 1.6) * 0.35;
  });

  return (
    <group ref={body} scale={scale} rotation={[0, 0, 0]}>
      <mesh geometry={G.ball} material={skin} position={[0, 0.36, 0]} scale={[0.44, 0.42, 1.15]} />
      <mesh geometry={G.ball} material={pup ? M.sealPup : M.sealDark} position={[0, 0.3, -0.5]} scale={[0.36, 0.3, 0.6]} />
      {/* Leopard-seal spotting: dark blotches along the back. */}
      {spots > 0 &&
        Array.from({ length: spots }, (_, i) => (
          <mesh
            key={`spot-${i}`}
            geometry={G.ball}
            material={M.sealDark}
            position={[Math.sin(i * 2.1) * 0.28, 0.66 - (i % 3) * 0.07, -0.72 + i * 0.26]}
            scale={[0.075, 0.022, 0.095]}
          />
        ))}
      <group ref={head} position={[0, 0.42, 1.02]}>
        <mesh geometry={G.ball} material={skin} scale={[0.3, 0.28, 0.34]} />
        <mesh geometry={G.ball} material={skin} position={[0, -0.08, 0.22]} scale={[0.17, 0.13, 0.18]} />
        <mesh geometry={G.ball} material={M.eye} position={[0.14, 0.06, 0.24]} scale={0.045} />
        <mesh geometry={G.ball} material={M.eye} position={[-0.14, 0.06, 0.24]} scale={0.045} />
        <mesh geometry={G.ball} material={M.glint} position={[0.15, 0.08, 0.27]} scale={0.016} />
        <mesh geometry={G.ball} material={M.glint} position={[-0.13, 0.08, 0.27]} scale={0.016} />
        {/* Whiskers: six thin rods, the detail that makes the face read. */}
        {[0.55, 1.05, 1.55, 2.05, 2.55, 3.05].map((angle, i) => (
          <mesh
            key={i}
            geometry={G.tube}
            material={M.bird}
            position={[Math.cos(angle) * 0.1, -0.06, 0.34]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[0.008, 0.22, 0.008]}
          />
        ))}
      </group>
      {/* Front flippers and the tail fluke. */}
      <mesh geometry={G.ball} material={skin} position={[0.34, 0.24, 0.5]} rotation={[0, 0, -0.5]} scale={[0.06, 0.16, 0.3]} />
      <mesh geometry={G.ball} material={skin} position={[-0.34, 0.24, 0.5]} rotation={[0, 0, 0.5]} scale={[0.06, 0.16, 0.3]} />
      <group ref={tail} position={[0, 0.28, -1.05]}>
        <mesh geometry={G.fin} material={skin} rotation={[-Math.PI / 2, 0, 0]} scale={[0.34, 0.5, 0.34]} />
        <mesh geometry={G.fin} material={skin} position={[0.3, 0, 0]} rotation={[Math.PI / 2, 0, 0.6]} scale={[0.24, 0.42, 0.24]} />
        <mesh geometry={G.fin} material={skin} position={[-0.3, 0, 0]} rotation={[Math.PI / 2, 0, -0.6]} scale={[0.24, 0.42, 0.24]} />
      </group>
    </group>
  );
}

/**
 * A seal working the waterline.
 *
 * Slow circle with the head up and the back just breaking the surface, which
 * is exactly how a leopard seal patrols past a penguin colony.
 */
function CruisingSeal({
  phase,
  radius,
  centre,
}: {
  phase: number;
  radius: number;
  centre: [number, number];
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.22 + phase;
    if (group.current) {
      group.current.position.set(
        centre[0] + Math.cos(t) * radius,
        -0.34 + Math.sin(t * 1.7) * 0.08,
        centre[1] + Math.sin(t) * radius,
      );
      group.current.rotation.y = -t + Math.PI / 2;
      group.current.rotation.z = Math.sin(t * 1.7) * 0.07;
    }
  });

  return (
    <group ref={group} scale={0.95}>
      <Seal phase={phase} tone={M.sealLight} spots={9} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Whales and dolphins                                                 */
/* ------------------------------------------------------------------ */

/**
 * Blowhole spout.
 *
 * Animated inside the component so the cloud rises, spreads and vanishes on
 * its own clock, driven by the same surfacing cycle as the body it sits on.
 */
function Spout({ phase, speed = 0.24 }: { phase: number; speed?: number }) {
  const group = useRef<THREE.Group>(null);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#EAF4FA", transparent: true, opacity: 0.45 }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase;
    const cycle = (Math.sin(t) + 1) / 2;
    const intensity = Math.max(0, (cycle - 0.84) / 0.16);
    if (group.current) {
      group.current.visible = intensity > 0.02;
      group.current.scale.setScalar(Math.max(0.001, intensity * 1.5));
    }
    material.opacity = 0.5 * intensity;
  });

  return (
    <group ref={group}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          geometry={G.ballLow}
          material={material}
          position={[(i - 2) * 0.24, 0.5 + i * 0.2, (i % 2) * 0.22]}
          scale={0.34 - i * 0.03}
        />
      ))}
    </group>
  );
}

function Whale({
  kind,
  phase,
  offset,
}: {
  kind: "humpback" | "orca" | "minke";
  phase: number;
  offset: [number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const big = kind === "humpback";
  const minke = kind === "minke";
  const length = big ? 6.4 : minke ? 3.4 : 4.2;
  const speed = big ? 0.24 : minke ? 0.29 : 0.33;
  const skin = big ? M.whale : minke ? M.minke : M.orca;
  const belly = big ? M.whaleBelly : minke ? M.minkeBelly : M.orcaWhite;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase;
    const cycle = (Math.sin(t) + 1) / 2;
    if (group.current) {
      group.current.position.set(
        offset[0] + Math.sin(t * 0.7) * 3.4,
        -2.6 + cycle * 3.6,
        offset[1] + Math.cos(t * 0.55) * 2.2,
      );
      group.current.rotation.x = (cycle - 0.5) * 0.3;
      group.current.rotation.y = Math.sin(t * 0.5) * 0.5;
    }
  });

  return (
    <group ref={group} scale={big ? 1 : minke ? 0.66 : 0.82}>
      <group rotation={[0, 0, 0]}>
        <mesh geometry={G.ball} material={skin} scale={[0.85, 0.9, length / 2]} />
        <mesh geometry={G.ball} material={belly} position={[0, -0.34, 0.2]} scale={[0.7, 0.5, length / 2.2]} />
        {big ? (
          <>
            {/* Humpback: long pectorals and a small dorsal, plus throat grooves. */}
            <mesh geometry={G.ball} material={M.whale} position={[1.5, 0.1, 0.6]} rotation={[0, 0.4, -0.35]} scale={[0.5, 0.08, 1.5]} />
            <mesh geometry={G.ball} material={M.whale} position={[-1.5, 0.1, 0.6]} rotation={[0, -0.4, 0.35]} scale={[0.5, 0.08, 1.5]} />
            <mesh geometry={G.fin} material={M.whale} position={[0, 0.7, -0.6]} scale={[0.28, 0.5, 0.28]} />
            {[0.5, 0.9, 1.3].map((z) => (
              <mesh key={z} geometry={G.ball} material={M.whaleBelly} position={[0, -0.55, z]} scale={[0.5, 0.16, 0.5]} />
            ))}
          </>
        ) : minke ? (
          <>
            {/* Minke: pointed rostrum, taller curved dorsal, white flipper bands. */}
            <mesh geometry={G.cone} material={M.minke} position={[0, 0.02, 1.85]} rotation={[Math.PI / 2, 0, 0]} scale={[0.34, 0.9, 0.3]} />
            <mesh geometry={G.fin} material={M.minke} position={[0, 0.72, -0.5]} rotation={[0, 0, -0.24]} scale={[0.24, 0.62, 0.26]} />
            <mesh geometry={G.ball} material={M.minkeBelly} position={[0, -0.42, 1.2]} scale={[0.56, 0.1, 0.5]} />
            <mesh geometry={G.ball} material={M.minke} position={[0.98, -0.12, 0.3]} rotation={[0, 0.2, -0.22]} scale={[0.6, 0.06, 0.19]} />
            <mesh geometry={G.ball} material={M.minke} position={[-0.98, -0.12, 0.3]} rotation={[0, -0.2, 0.22]} scale={[0.6, 0.06, 0.19]} />
            <mesh geometry={G.ball} material={M.minkeBelly} position={[0.52, -0.2, 0.55]} rotation={[0, 0.2, -0.22]} scale={[0.34, 0.05, 0.1]} />
            <mesh geometry={G.ball} material={M.minkeBelly} position={[-0.52, -0.2, 0.55]} rotation={[0, -0.2, 0.22]} scale={[0.34, 0.05, 0.1]} />
          </>
        ) : (
          <>
            {/* Orca: tall dorsal, white eye patch and grey saddle. */}
            <mesh geometry={G.fin} material={M.orca} position={[0, 0.95, -0.2]} scale={[0.32, 1.6, 0.32]} />
            <mesh geometry={G.ball} material={M.orcaWhite} position={[0.42, 0.34, 0.9]} rotation={[0, 0, -0.3]} scale={[0.1, 0.06, 0.34]} />
            <mesh geometry={G.ball} material={M.orcaWhite} position={[-0.42, 0.34, 0.9]} rotation={[0, 0, 0.3]} scale={[0.1, 0.06, 0.34]} />
            <mesh geometry={G.ball} material={M.sealDark} position={[0.3, 0.42, -0.7]} scale={[0.16, 0.05, 0.4]} />
            <mesh geometry={G.ball} material={M.eye} position={[0.66, 0.16, 1.25]} scale={0.07} />
            <mesh geometry={G.ball} material={M.eye} position={[-0.66, 0.16, 1.25]} scale={0.07} />
            <mesh geometry={G.ball} material={M.orca} position={[1.05, -0.05, 0.4]} rotation={[0, 0, -0.2]} scale={[0.7, 0.07, 0.2]} />
            <mesh geometry={G.ball} material={M.orca} position={[-1.05, -0.05, 0.4]} rotation={[0, 0, 0.2]} scale={[0.7, 0.07, 0.2]} />
          </>
        )}
        <group position={[0, big ? 0.9 : 0.7, 0.4]}>
          <Spout phase={phase} speed={speed} />
        </group>
      </group>
      <group position={[0, 0.05, -length / 2 - 0.3]}>
        <mesh geometry={G.fin} material={skin} rotation={[-Math.PI / 2, 0, 0]} scale={[0.7, 0.9, 0.7]} />
        <mesh geometry={G.fin} material={skin} position={[0.7, 0, 0]} rotation={[Math.PI / 2, 0, 0.9]} scale={[0.45, 0.8, 0.45]} />
        <mesh geometry={G.fin} material={skin} position={[-0.7, 0, 0]} rotation={[Math.PI / 2, 0, -0.9]} scale={[0.45, 0.8, 0.45]} />
      </group>
    </group>
  );
}

/** Dolphin leaping out of the water in a low arc. */
function Dolphin({ phase, centre, radius }: { phase: number; centre: [number, number]; radius: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.5 + phase;
    const angle = t;
    const arc = Math.max(0, Math.sin(t * 2.4));
    if (group.current) {
      group.current.position.set(
        centre[0] + Math.cos(angle) * radius,
        -0.6 + arc * 3.2,
        centre[1] + Math.sin(angle) * radius,
      );
      group.current.rotation.y = -angle + Math.PI / 2;
      group.current.rotation.z = (arc - 0.5) * 0.9;
    }
  });
  return (
    <group ref={group} scale={0.62}>
      <mesh geometry={G.ball} material={M.orca} scale={[0.34, 0.36, 1.15]} />
      <mesh geometry={G.ball} material={M.orcaWhite} position={[0, -0.16, 0.1]} scale={[0.28, 0.2, 1]} />
      <mesh geometry={G.ball} material={M.orcaWhite} position={[0.34, 0.14, 0.3]} scale={[0.09, 0.05, 0.4]} />
      <mesh geometry={G.ball} material={M.orcaWhite} position={[-0.34, 0.14, 0.3]} scale={[0.09, 0.05, 0.4]} />
      <mesh geometry={G.fin} material={M.orca} position={[0, 0.36, -0.1]} scale={[0.16, 0.5, 0.16]} />
      <mesh geometry={G.cone} material={M.orca} position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]} scale={[0.22, 0.55, 0.22]} />
      <mesh geometry={G.fin} material={M.orca} position={[0, 0, -1.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.34, 0.44, 0.34]} />
      <mesh geometry={G.ball} material={M.eye} position={[0.22, 0.06, 0.85]} scale={0.04} />
      <mesh geometry={G.ball} material={M.eye} position={[-0.22, 0.06, 0.85]} scale={0.04} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Birds and shoals                                                    */
/* ------------------------------------------------------------------ */

type BirdKind = "petrel" | "skua" | "fulmar" | "tern" | "cape" | "storm";

/** One bird flying a circular patrol: petrel, skua, tern, cape or storm petrel. */
function Bird({
  kind,
  phase,
  radius,
  height,
  centre,
}: {
  kind: BirdKind;
  phase: number;
  radius: number;
  height: number;
  centre: [number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const wings = useRef<THREE.Group>(null);
  const speed = kind === "skua" ? 0.36 : kind === "tern" ? 0.42 : kind === "storm" ? 0.4 : 0.26;
  const flapRate = kind === "skua" ? 6.2 : kind === "storm" ? 8.6 : kind === "tern" ? 7.2 : kind === "cape" ? 5.4 : 4.4;
  const flapAmp = kind === "skua" ? 0.75 : kind === "storm" ? 0.7 : kind === "tern" ? 0.68 : 0.55;
  const bodyTone =
    kind === "petrel"
      ? M.bird
      : kind === "skua"
        ? M.birdBrown
        : kind === "tern"
          ? M.bird
          : M.birdDark;
  const scale = kind === "skua" ? 1.05 : kind === "cape" ? 0.92 : kind === "tern" ? 0.78 : kind === "storm" ? 0.52 : 0.85;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    const angle = t * speed;
    if (group.current) {
      group.current.position.set(
        centre[0] + Math.cos(angle) * radius,
        height + Math.sin(t * 0.8) * 1.9,
        centre[1] + Math.sin(angle) * radius,
      );
      group.current.rotation.y = -angle + (kind === "skua" ? Math.PI / 2 : -Math.PI / 2);
      group.current.rotation.z = -0.28 + Math.sin(t * 1.1) * 0.1;
    }
    if (wings.current) {
      const flap = Math.sin(t * flapRate) * flapAmp;
      wings.current.children.forEach((child, i) => {
        child.rotation.z = i === 0 ? flap : -flap;
      });
    }
  });

  return (
    <group ref={group} scale={scale}>
      <mesh geometry={G.ball} material={bodyTone} scale={[0.2, 0.19, 0.52]} />
      <mesh geometry={G.ball} material={M.bird} position={[0, 0.06, 0.34]} scale={[0.14, 0.13, 0.16]} />
      <mesh geometry={G.cone} material={M.beakDark} position={[0, 0.04, 0.5]} rotation={[Math.PI / 2, 0, 0]} scale={[0.03, 0.16, 0.03]} />
      <mesh geometry={G.fin} material={bodyTone} position={[0, 0.02, -0.6]} rotation={[Math.PI / 2, 0, 0]} scale={[0.22, 0.4, 0.22]} />
      {/* Tern: black cap and long tail streamers. */}
      {kind === "tern" && (
        <>
          <mesh geometry={G.ball} material={M.birdDark} position={[0, 0.13, 0.31]} scale={[0.12, 0.06, 0.14]} />
          <mesh geometry={G.box} material={M.bird} position={[0.05, 0.02, -0.82]} rotation={[0.25, 0, 0]} scale={[0.03, 0.02, 0.5]} />
          <mesh geometry={G.box} material={M.bird} position={[-0.05, 0.02, -0.82]} rotation={[0.25, 0, 0]} scale={[0.03, 0.02, 0.5]} />
        </>
      )}
      {/* Storm petrel: bright white rump that flashes as it banks. */}
      {kind === "storm" && (
        <mesh geometry={G.ball} material={M.bird} position={[0, 0.09, -0.44]} scale={[0.14, 0.08, 0.12]} />
      )}
      {/* Cape petrel: white checkered patches along the upper wing. */}
      {kind === "cape" && (
        <>
          <mesh geometry={G.wing} material={M.bird} position={[0.72, 0.11, 0]} scale={[0.55, 1.6, 0.42]} />
          <mesh geometry={G.wing} material={M.bird} position={[-0.72, 0.11, 0]} scale={[0.55, 1.6, 0.42]} />
          <mesh geometry={G.ball} material={M.bird} position={[0, 0.12, 0.16]} scale={[0.11, 0.06, 0.16]} />
        </>
      )}
      <mesh geometry={G.ball} material={M.eye} position={[0.1, 0.1, 0.4]} scale={0.028} />
      <mesh geometry={G.ball} material={M.eye} position={[-0.1, 0.1, 0.4]} scale={0.028} />
      <group ref={wings}>
        <mesh geometry={G.wing} material={bodyTone} position={[0.55, 0.04, 0]} scale={[1.05, 1, 0.5]} />
        <mesh geometry={G.wing} material={bodyTone} position={[-0.55, 0.04, 0]} scale={[1.05, 1, 0.5]} />
        {kind === "petrel" && (
          <>
            <mesh geometry={G.wing} material={M.birdDark} position={[0.98, 0.04, 0]} scale={[0.32, 1.05, 0.5]} />
            <mesh geometry={G.wing} material={M.birdDark} position={[-0.98, 0.04, 0]} scale={[0.32, 1.05, 0.5]} />
          </>
        )}
      </group>
    </group>
  );
}

/** Shoaling fish, or a krill cloud, drifting in a slow circle. */
function Shoal({
  count,
  radius,
  kind,
  centre,
}: {
  count: number;
  radius: number;
  kind: "fish" | "krill" | "invertebrate";
  centre: [number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const members = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return {
          angle,
          depth: kind === "fish" ? -0.55 + (i % 3) * 0.18 : -0.75 - (i % 4) * 0.22,
          radius: radius * (0.45 + ((i * 7) % 10) / 14),
          phase: i * 0.9,
          scale: kind === "fish" ? 0.22 + ((i * 3) % 4) * 0.03 : 0.05 + ((i * 5) % 3) * 0.01,
        };
      }),
    [count, radius, kind],
  );
  const material = kind === "krill" ? M.krill : kind === "invertebrate" ? M.glint : M.fish;

  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.elapsedTime * 0.06;
  });

  return (
    <group ref={group} position={[centre[0], 0, centre[1]]}>
      {members.map((member, i) => (
        <mesh
          key={i}
          geometry={G.ballLow}
          material={material}
          position={[
            Math.cos(member.angle) * member.radius,
            member.depth + Math.sin(member.phase) * 0.1,
            Math.sin(member.angle) * member.radius,
          ]}
          scale={
            kind === "fish"
              ? [member.scale * 0.4, member.scale * 0.5, member.scale]
              : member.scale
          }
        />
      ))}
    </group>
  );
}

/**
 * A bird on the ground: upright stance, tail braced, wings flicking open.
 *
 * Used for nesting colonies, which are the one place on this coast where you
 * can watch the same species that otherwise only passes overhead.
 */
function GroundBird({ kind, phase }: { kind: "cape" | "storm"; phase: number }) {
  const group = useRef<THREE.Group>(null);
  const wings = useRef<THREE.Group>(null);
  const small = kind === "storm";

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (group.current) {
      group.current.position.y = Math.abs(Math.sin(t * 1.4)) * 0.03;
      group.current.rotation.y = Math.sin(t * 0.24) * 0.8;
    }
    if (wings.current) {
      // A brief wing-flick every few seconds, then folded.
      const flap = Math.max(0, Math.sin(t * 0.42 + 1)) ** 6;
      wings.current.children.forEach((child, i) => {
        child.rotation.z = (i === 0 ? 1 : -1) * flap * 1.15;
      });
    }
  });

  return (
    <group ref={group} scale={small ? 0.62 : 1}>
      <mesh geometry={G.ball} material={M.birdDark} position={[0, 0.36, 0]} scale={[0.17, 0.2, 0.3]} />
      <mesh geometry={G.ball} material={M.bird} position={[0, 0.38, 0.09]} scale={[0.12, 0.13, 0.18]} />
      {/* Cape petrel: checkered white patches on the shoulders and wing coverts. */}
      {!small && (
        <>
          <mesh geometry={G.ball} material={M.bird} position={[0.1, 0.44, 0.04]} scale={[0.07, 0.08, 0.16]} />
          <mesh geometry={G.ball} material={M.bird} position={[-0.1, 0.44, 0.04]} scale={[0.07, 0.08, 0.16]} />
        </>
      )}
      {/* Storm petrel: white rump above the tail. */}
      {small && (
        <mesh geometry={G.ball} material={M.bird} position={[0, 0.4, -0.24]} scale={[0.13, 0.07, 0.1]} />
      )}
      <group ref={wings}>
        <mesh geometry={G.wing} material={M.birdDark} position={[0.24, 0.4, 0]} rotation={[0, 0, -0.1]} scale={[0.6, 0.7, 0.42]} />
        <mesh geometry={G.wing} material={M.birdDark} position={[-0.24, 0.4, 0]} rotation={[0, 0, 0.1]} scale={[0.6, 0.7, 0.42]} />
      </group>
      <mesh geometry={G.ball} material={M.birdDark} position={[0, 0.62, 0.06]} scale={[0.12, 0.12, 0.12]} />
      <mesh geometry={G.cone} material={M.beakDark} position={[0, 0.6, 0.2]} rotation={[Math.PI / 2, 0, 0]} scale={[0.028, 0.14, 0.028]} />
      <mesh geometry={G.ball} material={M.eye} position={[0.07, 0.65, 0.12]} scale={0.026} />
      <mesh geometry={G.ball} material={M.eye} position={[-0.07, 0.65, 0.12]} scale={0.026} />
      <mesh geometry={G.ball} material={M.glint} position={[0.075, 0.66, 0.135]} scale={0.009} />
      <mesh geometry={G.ball} material={M.glint} position={[-0.065, 0.66, 0.135]} scale={0.009} />
      <mesh geometry={G.fin} material={M.birdDark} position={[0, 0.3, -0.4]} rotation={[Math.PI / 2.2, 0, 0]} scale={[0.1, 0.34, 0.1]} />
      {[0.07, -0.07].map((x) => (
        <mesh key={x} geometry={G.tube} material={M.beakDark} position={[x, 0.14, 0.03]} scale={[0.017, 0.28, 0.017]} />
      ))}
      {[-0.08, 0.08].map((x) => (
        <mesh key={`f${x}`} geometry={G.box} material={M.beakDark} position={[x, 0.02, 0.12]} scale={[0.09, 0.025, 0.16]} />
      ))}
    </group>
  );
}

/** A nesting ledge: pebble scrape, adults standing, wings flicking. */
function NestLedge({
  kind,
  count,
}: {
  kind: "cape" | "storm";
  count: number;
}) {
  return (
    <group>
      {/* Rock shelf the colony is sitting on. */}
      <mesh geometry={G.ball} material={M.sealDark} position={[0, -0.06, 0]} scale={[2.6, 0.18, 1.9]} />
      <mesh geometry={G.ball} material={M.seal} position={[0.6, 0.02, 0.5]} scale={[1.2, 0.12, 0.9]} />
      <mesh geometry={G.ball} material={M.sealLight} position={[-1.1, 0.03, -0.4]} scale={[0.9, 0.1, 0.7]} />
      {Array.from({ length: count }, (_, i) => (
        <group
          key={i}
          position={[
            Math.cos(i * 1.9) * (0.75 + (i % 3) * 0.45),
            0.06,
            Math.sin(i * 1.9) * (0.6 + (i % 2) * 0.5),
          ]}
          rotation={[0, i * 1.4, 0]}
        >
          <GroundBird kind={kind} phase={i * 1.7} />
        </group>
      ))}
    </group>
  );
}

/**
 * Seafloor life: pycnogonids walking the bottom on eight long legs.
 *
 * Each animal wanders its own small loop, so a group reads as a patch of
 * moving seafloor rather than a static prop.
 */
function SeaSpiders({
  count,
  radius,
  centre,
}: {
  count: number;
  radius: number;
  centre: [number, number];
}) {
  const group = useRef<THREE.Group>(null);

  const spiders = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * Math.PI * 2,
        orbit: radius * (0.35 + ((i * 7) % 10) / 16),
        wander: 0.35 + ((i * 3) % 5) * 0.08,
        phase: i * 1.1,
        scale: 0.8 + ((i * 5) % 4) * 0.12,
      })),
    [count, radius],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const spider = spiders[i];
      if (!spider) return;
      const a = spider.angle + t * spider.wander;
      child.position.set(
        Math.cos(a) * spider.orbit,
        -0.62,
        Math.sin(a) * spider.orbit * 0.8,
      );
      child.rotation.y = -a + Math.PI / 2;
    });
  });

  return (
    <group ref={group} position={[centre[0], 0, centre[1]]}>
      {spiders.map((spider, i) => (
        <group key={i} scale={spider.scale}>
          <mesh geometry={G.ball} material={M.fish} scale={[0.08, 0.06, 0.1]} />
          {Array.from({ length: 8 }, (_, leg) => {
            const side = leg < 4 ? 1 : -1;
            const along = (leg % 4) - 1.5;
            return (
              <mesh
                key={`leg-${leg}`}
                geometry={G.tube}
                material={M.fish}
                position={[side * 0.2, -0.02, along * 0.11]}
                rotation={[0, 0, side * 1.15]}
                scale={[0.012, 0.44, 0.012]}
              />
            );
          })}
          <mesh geometry={G.tube} material={M.fish} position={[0, 0.02, 0.12]} scale={[0.02, 0.12, 0.02]} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Expedition member                                                   */
/* ------------------------------------------------------------------ */

/**
 * The expedition member on site.
 *
 * Warm parka, hood up, reflective bands: the standard field layer, plus a wave
 * now and then so he reads as a person rather than a bollard. Clicking opens
 * his profile, which also points at his desk inside the station.
 */
function ExpeditionMember({
  station,
  active,
  onSelect,
}: {
  station: StationSlug;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  const { hovered, over, out } = useHoverHold();
  const display = useTwinDisplay();
  const pinId = `wildlife:${DEV_PROFILE.id}`;
  const pinned = useLabelPinned(pinId);
  const suppressed = useLabelSuppressed(pinId);
  const position = DEV_PROFILE.positions[station];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.18) * 0.45;
      group.current.position.y = Math.sin(t * 1.1) * 0.015;
    }
    if (arm.current) {
      // A wave every so often, brief enough to feel natural.
      const cycle = (t % 14) / 14;
      arm.current.rotation.z = cycle > 0.82 ? -1.1 + Math.sin(t * 9) * 0.28 : -0.12;
    }
  });

  return (
    <group
      position={position}
      onPointerOver={(event) => {
        event.stopPropagation();
        over();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        out();
        document.body.style.cursor = "auto";
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(DEV_PROFILE.id);
        // Clicking him always brings his label back, even after it was closed.
        pinLabel(pinId);
      }}
    >
      <group ref={group}>
        {/* Boots and legs. */}
        <mesh geometry={G.box} material={M.boot} position={[0.12, 0.06, 0.02]} scale={[0.15, 0.12, 0.3]} />
        <mesh geometry={G.box} material={M.boot} position={[-0.12, 0.06, 0.02]} scale={[0.15, 0.12, 0.3]} />
        <mesh geometry={G.tube} material={M.parkaDark} position={[0.12, 0.52, 0]} scale={[0.1, 0.82, 0.1]} />
        <mesh geometry={G.tube} material={M.parkaDark} position={[-0.12, 0.52, 0]} scale={[0.1, 0.82, 0.1]} />
        {/* Parka with reflective bands. */}
        <mesh geometry={G.box} material={M.parka} position={[0, 1.18, 0]} scale={[0.48, 0.62, 0.32]} />
        <mesh geometry={G.box} material={M.band} position={[0, 1.32, 0.17]} scale={[0.46, 0.05, 0.02]} />
        <mesh geometry={G.box} material={M.band} position={[0, 1.03, 0.17]} scale={[0.46, 0.04, 0.02]} />
        {/* Arms and gloves; the right arm is the waving one. */}
        <mesh geometry={G.tube} material={M.parka} position={[0.3, 1.2, 0.02]} rotation={[0, 0, -0.22]} scale={[0.09, 0.7, 0.09]} />
        <mesh geometry={G.tube} material={M.parka} position={[-0.3, 1.2, 0.02]} rotation={[0, 0, 0.22]} scale={[0.09, 0.7, 0.09]} />
        <group ref={arm} position={[-0.34, 1.5, 0.02]}>
          <mesh geometry={G.ball} material={M.boot} position={[0, -0.28, 0]} scale={0.11} />
        </group>
        {/* Hood, fur trim and face with goggles pushed up. */}
        <mesh geometry={G.ball} material={M.parkaDark} position={[0, 1.68, 0]} scale={[0.22, 0.23, 0.22]} />
        <mesh geometry={G.ball} material={M.fur} position={[0, 1.7, 0.03]} scale={[0.23, 0.2, 0.2]} />
        <mesh geometry={G.ball} material={M.skin} position={[0, 1.64, 0.12]} scale={[0.13, 0.15, 0.12]} />
        {/* Goggles pushed up onto the hood. */}
        <mesh geometry={G.box} material={M.boot} position={[0, 1.73, 0.15]} scale={[0.2, 0.05, 0.07]} />
        <mesh geometry={G.ball} material={M.eye} position={[0.05, 1.65, 0.23]} scale={0.022} />
        <mesh geometry={G.ball} material={M.eye} position={[-0.05, 1.65, 0.23]} scale={0.022} />
        <mesh geometry={G.ball} material={M.glint} position={[0.055, 1.66, 0.245]} scale={0.009} />
        <mesh geometry={G.ball} material={M.glint} position={[-0.045, 1.66, 0.245]} scale={0.009} />
      </group>
      {(hovered || active || pinned) && display.wildlifeLabels && !suppressed && (
        <Label3D
          position={[0, 2.6, 0]}
          px={0.1}
          border={active ? TWIN_COLORS.red : TWIN_COLORS.amber}
          rows={[
            { text: DEV_PROFILE.name, color: TWIN_COLORS.amber },
            { text: hovered ? "click for his profile" : "expedition member", color: "#E8EEF4" },
          ]}
          onDismiss={() => dismissLabel(pinId)}
          requested={pinned}
        />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Layer                                                               */
/* ------------------------------------------------------------------ */

const LABEL_HEIGHT: Record<ColonyKind, number> = {
  waddle: 2.4,
  huddle: 3.4,
  rest: 2.4,
  cruise: 2.8,
  nest: 2.4,
  fly: 8,
  surface: 6,
  leap: 4,
  swim: 3.4,
};

/** Species id to model variant, so the catalogue drives the geometry. */
const PENGUIN_KIND: Record<string, PenguinKind> = {
  "emperor-penguin": "emperor",
  "chinstrap-penguin": "chinstrap",
  "gentoo-penguin": "gentoo",
};

const FLYER_KIND: Record<string, BirdKind> = {
  "south-polar-skua": "skua",
  "antarctic-petrel": "fulmar",
  "antarctic-tern": "tern",
  "cape-petrel": "cape",
  "wilsons-storm-petrel": "storm",
};

/** One colony: the animals, plus the hover label and the click target. */
function Colony({
  colony,
  active,
  onSelect,
}: {
  colony: ColonyDef;
  active: boolean;
  onSelect: (speciesId: string) => void;
}) {
  const { hovered, over, out } = useHoverHold();
  const display = useTwinDisplay();
  const pinId = `wildlife:${colony.id}`;
  const pinned = useLabelPinned(pinId);
  const suppressed = useLabelSuppressed(pinId);
  const species = SPECIES[colony.speciesId];
  const centre: [number, number] = [0, 0];

  let content: ReactNode = null;
  switch (colony.kind) {
    case "waddle":
    case "huddle":
      content = (
        <PenguinFlock
          kind={PENGUIN_KIND[colony.speciesId] ?? "adelie"}
          count={colony.count}
          chicks={colony.chicks ?? 0}
          huddled={colony.kind === "huddle"}
        />
      );
      break;
    case "rest":
      content = (
        <group>
          {Array.from({ length: colony.count }, (_, i) => (
            <group key={i} position={[(i - (colony.count - 1) / 2) * 3.6, 0, (i % 2) * 1.8]} rotation={[0, i * 1.1, 0]}>
              <Seal
                phase={i * 1.7}
                tone={colony.speciesId === "crabeater-seal" ? M.sealLight : M.seal}
                spots={colony.speciesId === "leopard-seal" ? 9 : 0}
              />
            </group>
          ))}
          {colony.chicks
            ? Array.from({ length: colony.chicks }, (_, i) => (
                <group key={`pup-${i}`} position={[1.6 + i * 1.2, 0, 2.4]} rotation={[0, -0.6, 0]}>
                  <Seal phase={3 + i} pup />
                </group>
              ))
            : null}
        </group>
      );
      break;
    case "cruise":
      content = (
        <group>
          {Array.from({ length: colony.count }, (_, i) => (
            <CruisingSeal
              key={i}
              phase={i * 3.1}
              radius={colony.radius ?? 10}
              centre={[i * 6 - 3, 0]}
            />
          ))}
        </group>
      );
      break;
    case "nest":
      content = (
        <NestLedge
          kind={colony.speciesId === "wilsons-storm-petrel" ? "storm" : "cape"}
          count={colony.count}
        />
      );
      break;
    case "surface":
      content = (
        <group>
          {Array.from({ length: colony.count }, (_, i) => (
            <Whale
              key={i}
              kind={
                colony.speciesId === "orca"
                  ? "orca"
                  : colony.speciesId === "minke-whale"
                    ? "minke"
                    : "humpback"
              }
              phase={i * 2.3}
              offset={[(i - 0.5) * 16, (i % 2) * 8]}
            />
          ))}
        </group>
      );
      break;
    case "leap":
      content = (
        <group>
          {Array.from({ length: colony.count }, (_, i) => (
            <Dolphin key={i} phase={i * 1.3} centre={centre} radius={colony.radius ?? 14} />
          ))}
        </group>
      );
      break;
    case "swim":
      content =
        colony.speciesId === "antarctic-sea-spider" ? (
          <SeaSpiders count={colony.count} radius={colony.radius ?? 8} centre={centre} />
        ) : (
          <Shoal
            count={colony.count}
            radius={colony.radius ?? 14}
            kind={
              colony.speciesId === "antarctic-krill"
                ? "krill"
                : colony.speciesId === "oasis-lake-invertebrates"
                  ? "invertebrate"
                  : "fish"
            }
            centre={centre}
          />
        );
      break;
    case "fly":
      content = (
        <group>
          {Array.from({ length: colony.count }, (_, i) => (
            <Bird
              key={i}
              kind={FLYER_KIND[colony.speciesId] ?? "petrel"}
              phase={i * 1.9}
              radius={(colony.radius ?? 40) * (0.65 + ((i * 3) % 5) / 8)}
              height={(colony.height ?? 12) + (i % 3) * 1.6}
              centre={centre}
            />
          ))}
        </group>
      );
      break;
  }

  return (
    <group
      position={colony.position}
      onPointerOver={(event) => {
        event.stopPropagation();
        over();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        out();
        document.body.style.cursor = "auto";
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(colony.speciesId);
        // Clicking the group always brings its label back.
        pinLabel(pinId);
      }}
    >
      {content}
      {(hovered || active || pinned) && species && display.wildlifeLabels && !suppressed && (
        <Label3D
          position={[0, LABEL_HEIGHT[colony.kind], 0]}
          px={0.1}
          border={active ? TWIN_COLORS.red : TWIN_COLORS.cyan}
          rows={[
            { text: species.name, color: active ? TWIN_COLORS.red : TWIN_COLORS.cyan },
            { text: hovered ? "click for the species card" : colony.label, color: "#E8EEF4" },
          ]}
          onDismiss={() => dismissLabel(pinId)}
          requested={pinned}
        />
      )}
    </group>
  );
}

/**
 * The wildlife layer for one station.
 *
 * Hidden as a whole by the Wildlife layer switch in the console, and each
 * colony reports its species id back so the console can open the right card.
 */
export function Wildlife({
  slug,
  activeId,
  onSelect,
}: {
  slug: StationSlug;
  activeId?: string | null;
  onSelect: (id: string) => void;
}) {
  const display = useTwinDisplay();
  if (!display.wildlife) return null;
  const colonies = COLONIES[slug] ?? [];

  return (
    <group userData={{ wildlife: true }}>
      {colonies.map((colony) => (
        <Colony
          key={colony.id}
          colony={colony}
          active={activeId === colony.speciesId}
          onSelect={onSelect}
        />
      ))}
      <ExpeditionMember
        station={slug}
        active={activeId === DEV_PROFILE.id}
        onSelect={onSelect}
      />
    </group>
  );
}
