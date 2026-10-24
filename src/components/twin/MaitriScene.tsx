import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  Aurora,
  BuildingEntrance,
  GroundShadow,
  Hotspot,
  Lighting,
  MAT,
  readingRows,
  SiteSurvey,
  Snowfall,
  Stars,
  TelemetryStrip,
  Terrain,
  ThermalReadout,
  TWIN_COLORS,
  type TwinSceneProps,
} from "./twin-primitives";
import { WaterBody } from "./water/WaterBody";
import { WATER_BODIES } from "./water/water-data";
import { VehicleFleet } from "./VehicleFleet";
import { MAITRI_MEP, MepOverlay } from "./MepOverlay";
import { ViewModeEffect, modeLighting } from "./view-modes";

/* ------------------------------------------------------------------ */
/* Reusable building blocks                                            */
/* ------------------------------------------------------------------ */

/** Sloped-roof main station on pillars with lit windows and orange trim. */
function MainStation({ onInfo }: { onInfo: () => void }) {
  // 24 windows across two decks.
  const windows = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        x: -14.9 + (i % 12) * 2.72,
        y: 3.3 + Math.floor(i / 12) * 2.5,
        z: i < 12 ? 10.05 : -10.05,
        rotY: i < 12 ? 0 : Math.PI,
      })),
    [],
  );
  return (
    <group
      userData={{ structural: true }}
      onClick={(e) => { e.stopPropagation(); onInfo(); }}
    >
      {/* 8 pillars */}
      {[
        [-15, -7], [-5, -7], [5, -7], [15, -7],
        [-15, 7], [-5, 7], [5, 7], [15, 7],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.7, z]}>
          <boxGeometry args={[1.6, 1.4, 1.6]} />
          <meshStandardMaterial color={TWIN_COLORS.rock} {...MAT.rock} />
        </mesh>
      ))}
      {/* Main hull */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[40, 4.4, 20]} />
        <meshStandardMaterial color={TWIN_COLORS.steelWhite} {...MAT.metal} />
      </mesh>
      {/* Orange trim bands */}
      <mesh position={[0, 2.1, 0]}>
        <boxGeometry args={[40.4, 0.5, 20.4]} />
        <meshStandardMaterial color={TWIN_COLORS.trimOrange} {...MAT.metal} />
      </mesh>
      <mesh position={[0, 5.9, 0]}>
        <boxGeometry args={[40.4, 0.5, 20.4]} />
        <meshStandardMaterial color={TWIN_COLORS.trimOrange} {...MAT.metal} />
      </mesh>
      {/* Sloped roof */}
      <mesh position={[0, 6.9, 0]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[41, 0.8, 21]} />
        <meshStandardMaterial color={TWIN_COLORS.steelWhite} {...MAT.metal} />
      </mesh>
      {/* Lit windows */}
      {windows.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, w.z]} rotation={[0, w.rotY, 0]}>
          <planeGeometry args={[1.7, 1.3]} />
          <meshStandardMaterial
            color={TWIN_COLORS.windowLit}
            emissive={TWIN_COLORS.windowLit}
            emissiveIntensity={1.4}
            {...MAT.glass}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Antenna mast with three dishes. */
function AntennaMast() {
  return (
    <group position={[24, 0, -6]}>
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.22, 0.3, 12, 8]} />
        <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
      </mesh>
      {[
        { y: 9.5, r: 2.2, rotX: 0.5 },
        { y: 7.5, r: 1.7, rotX: -0.35 },
        { y: 11, r: 1.4, rotX: 0.15 },
      ].map((d, i) => (
        <mesh key={i} position={[0, d.y, 0.6]} rotation={[d.rotX, 0, 0]}>
          <sphereGeometry args={[d.r, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
          <meshStandardMaterial color="#B9C4CC" {...MAT.metal} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Heated water pipeline from the lake to the station with pulsing flow glow. */
function HeatedPipeline() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.7 + Math.sin(clock.elapsedTime * 2.4) * 0.45;
    }
  });
  // Runs from the Lake Priyadarshini shoreline to the station west wall.
  const start: [number, number, number] = [-18, 1.1, 34];
  const end: [number, number, number] = [-20, 1.1, 9];
  const mid = [(start[0] + end[0]) / 2, 1.1, (start[2] + end[2]) / 2] as [number, number, number];
  const angle = Math.atan2(end[0] - start[0], end[2] - start[2]);
  const length = Math.hypot(end[0] - start[0], end[2] - start[2]);
  return (
    <group>
      <mesh position={mid} rotation={[0, angle, 0]}>
        <cylinderGeometry args={[0.4, 0.4, length, 10]} />
        <meshStandardMaterial
          ref={matRef}
          color={TWIN_COLORS.cyan}
          emissive={TWIN_COLORS.cyan}
          emissiveIntensity={0.8}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>
      {/* Support bents */}
      {[0.2, 0.5, 0.8].map((t, i) => (
        <mesh key={i} position={[start[0] + (end[0] - start[0]) * t, 0.4, start[2] + (end[2] - start[2]) * t]}>
          <boxGeometry args={[0.5, 1.4, 0.5]} />
          <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
        </mesh>
      ))}
    </group>
  );
}

/** Fuel farm: six vertical tanks with fill indicators and railing. */
function FuelFarm() {
  const tanks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        x: -6 + (i % 3) * 7,
        z: i < 3 ? -2 : 4.5,
      })),
    [],
  );
  return (
    <group position={[42, 0, 30]}>
      {tanks.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, 4, 0]}>
            <cylinderGeometry args={[2.4, 2.4, 8, 18]} />
            <meshStandardMaterial color={TWIN_COLORS.fuel} {...MAT.metal} />
          </mesh>
          {/* fill-level band */}
          <mesh position={[0, 5.4, 0]}>
            <cylinderGeometry args={[2.45, 2.45, 1.1, 18, 1, true]} />
            <meshStandardMaterial color={TWIN_COLORS.amber} emissive={TWIN_COLORS.amber} emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
      {/* Safety railing */}
      {[-8, 8].map((x) => (
        <mesh key={x} position={[x, 1, 1]}>
          <boxGeometry args={[0.15, 2, 14]} />
          <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
        </mesh>
      ))}
    </group>
  );
}

/** Lake pump house with a rotating pump indicator. */
function PumpHouse() {
  const rotor = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (rotor.current) rotor.current.rotation.y += delta * 3;
  });
  return (
    <group position={[-12, 0, 36]}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[6, 3, 4]} />
        <meshStandardMaterial color={TWIN_COLORS.steelWhite} {...MAT.metal} />
      </mesh>
      <mesh ref={rotor} position={[0, 3.4, 0]}>
        <torusGeometry args={[0.7, 0.18, 8, 20]} />
        <meshStandardMaterial color={TWIN_COLORS.cyan} emissive={TWIN_COLORS.cyan} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

/** Four diesel generators with status LEDs, stacks and vibration animation. */
function Generators() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) {
      group.current.position.y = Math.sin(clock.elapsedTime * 14) * 0.035;
    }
  });
  return (
    <group ref={group} position={[16, 0, -26]}>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[(i % 2) * 7 - 3.5, 0, Math.floor(i / 2) * 6 - 3]}>
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[4, 2, 2]} />
            <meshStandardMaterial color="#5B6670" {...MAT.metal} />
          </mesh>
          <mesh position={[0, 2.4, -0.6]}>
            <cylinderGeometry args={[0.3, 0.3, 1.4, 8]} />
            <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
          </mesh>
          <mesh position={[1.4, 2.15, 0.6]}>
            <sphereGeometry args={[0.16, 8, 8]} />
            <meshStandardMaterial color={TWIN_COLORS.green} emissive={TWIN_COLORS.green} emissiveIntensity={2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 15 m weather mast with spinning anemometer cups and wind vane. */
function WeatherMast() {
  const cups = useRef<THREE.Group>(null);
  const vane = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (cups.current) cups.current.rotation.y += delta * 2.4;
    if (vane.current) vane.current.rotation.y = Math.sin(performance.now() / 2600) * 1.2;
  });
  return (
    <group position={[-8, 0, -30]}>
      <mesh position={[0, 7.5, 0]}>
        <cylinderGeometry args={[0.16, 0.24, 15, 8]} />
        <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
      </mesh>
      {/* sensor housing */}
      <mesh position={[0, 9.5, 0]}>
        <boxGeometry args={[0.9, 0.6, 0.9]} />
        <meshStandardMaterial color="#B9C4CC" {...MAT.metal} />
      </mesh>
      {/* anemometer */}
      <group ref={cups} position={[0, 14.6, 0]}>
        {[0, 2.09, 4.19].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8]}>
            <sphereGeometry args={[0.34, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#D6DDE2" {...MAT.metal} />
          </mesh>
        ))}
      </group>
      {/* wind vane */}
      <group ref={vane} position={[0, 13.6, 0]}>
        <mesh position={[0.9, 0, 0]}>
          <boxGeometry args={[1.6, 0.1, 0.4]} />
          <meshStandardMaterial color={TWIN_COLORS.trimOrange} {...MAT.metal} />
        </mesh>
      </group>
    </group>
  );
}

/** Summer camp: eight red-white containerised modules in a 4x2 grid. */
function SummerCamp() {
  return (
    <group position={[-44, 0, -12]} rotation={[0, 0.35, 0]}>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[(i % 4) * 7, 1.5, Math.floor(i / 4) * 5]}>
          <boxGeometry args={[6, 3, 4]} />
          <meshStandardMaterial color={i % 2 === 0 ? TWIN_COLORS.moduleRed : TWIN_COLORS.moduleWhite} {...MAT.metal} />
        </mesh>
      ))}
    </group>
  );
}

/** Background Schirmacher rock formations. */
function RockHills() {
  const rocks = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        x: -220 + ((i * 37) % 440),
        z: -170 - ((i * 53) % 120),
        s: 6 + ((i * 13) % 18),
      })),
    [],
  );
  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} position={[r.x, r.s * 0.25, r.z]} rotation={[0.2, i, 0.1]}>
          <dodecahedronGeometry args={[r.s, 0]} />
          <meshStandardMaterial color={TWIN_COLORS.rock} {...MAT.rock} />
        </mesh>
      ))}
    </group>
  );
}

/** Fuel station canopy near the generators. */
function FuelStation() {
  return (
    <group position={[30, 0, -18]}>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[8, 4, 8]} />
        <meshStandardMaterial color={TWIN_COLORS.steelWhite} {...MAT.metal} />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <boxGeometry args={[9, 0.7, 9]} />
        <meshStandardMaterial color={TWIN_COLORS.trimOrange} {...MAT.metal} />
      </mesh>
    </group>
  );
}

/** Vehicle garage and maintenance workshop east of the pads. */
function Garage() {
  return (
    <group position={[58, 0, -40]} rotation={[0, -0.12, 0]}>
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[14, 4.8, 10]} />
        <meshStandardMaterial color={TWIN_COLORS.steelWhite} {...MAT.metal} />
      </mesh>
      <mesh position={[0, 5.05, 0]}>
        <boxGeometry args={[14.6, 0.5, 10.6]} />
        <meshStandardMaterial color={TWIN_COLORS.trimOrange} {...MAT.metal} />
      </mesh>
      {[-4.2, 0, 4.2].map((x) => (
        <mesh key={x} position={[x, 1.9, 5.02]}>
          <boxGeometry args={[3.4, 3.6, 0.12]} />
          <meshStandardMaterial color="#4A555F" {...MAT.metal} />
        </mesh>
      ))}
      {/* roof-mounted exhaust extraction */}
      {[-4, 4].map((x) => (
        <mesh key={`v${x}`} position={[x, 6.2, -3]}>
          <cylinderGeometry args={[0.45, 0.45, 2.2, 10]} />
          <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
        </mesh>
      ))}
    </group>
  );
}

/** Helipad apron with approach markings and perimeter lights. */
function Helipad() {
  return (
    <group position={[74, 0, -30]}>
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7.5, 28]} />
        <meshStandardMaterial color="#2A333C" {...MAT.snow} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.6, 7.2, 32]} />
        <meshStandardMaterial color="#E8EEF4" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.7, 4.4]} />
        <meshStandardMaterial color="#E8EEF4" side={THREE.DoubleSide} />
      </mesh>
      {[0.35, 1].map((a, i) => (
        <mesh key={i} position={[Math.cos(a * 6.28) * 1.3, 0.21, Math.sin(a * 6.28) * 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.7, 4.4]} />
          <meshStandardMaterial color="#E8EEF4" side={THREE.DoubleSide} />
        </mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh key={`l${i}`} position={[Math.cos(angle) * 7.8, 0.3, Math.sin(angle) * 7.8]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color={TWIN_COLORS.amber} emissive={TWIN_COLORS.amber} emissiveIntensity={1.6} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Cargo yard: eight containerised stores with roof ribs. */
function CargoYard() {
  return (
    <group position={[42, 0, -50]} rotation={[0, 0.08, 0]}>
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[(i % 4) * 6.6, 0, Math.floor(i / 4) * 3.4]}>
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[6, 2.8, 2.8]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? TWIN_COLORS.moduleRed : i % 3 === 1 ? "#2F6B8C" : TWIN_COLORS.steelWhite}
              {...MAT.metal}
            />
          </mesh>
          <mesh position={[0, 2.85, 0]}>
            <boxGeometry args={[6.1, 0.2, 2.9]} />
            <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Waste incinerator with stack. */
function Incinerator() {
  return (
    <group position={[-2, 0, -46]}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[4, 3, 4]} />
        <meshStandardMaterial color="#5B6670" {...MAT.metal} />
      </mesh>
      <mesh position={[1, 5, -1]}>
        <cylinderGeometry args={[0.4, 0.5, 6, 10]} />
        <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <boxGeometry args={[4.4, 0.4, 4.4]} />
        <meshStandardMaterial color={TWIN_COLORS.trimOrange} {...MAT.metal} />
      </mesh>
    </group>
  );
}

/** Meteorological balloon shed and launch frame. */
function BalloonShed() {
  return (
    <group position={[-20, 0, -40]} rotation={[0, 0.22, 0]}>
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[7, 3.6, 5]} />
        <meshStandardMaterial color={TWIN_COLORS.moduleWhite} {...MAT.metal} />
      </mesh>
      {/* curved roof */}
      <mesh position={[0, 3.9, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[3.6, 3.6, 7, 14, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={TWIN_COLORS.steelWhite} {...MAT.metal} />
      </mesh>
      <mesh position={[4.4, 3.2, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.11, 0.11, 6.4, 6]} />
        <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
      </mesh>
    </group>
  );
}

/** Wind-carved sastrugi ridges across the station apron. */
function Sastrugi() {
  const ridges = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: -140 + ((i * 53) % 320),
        z: -120 + ((i * 41) % 260),
        rot: (i * 0.37) % Math.PI,
        len: 8 + ((i * 7) % 16),
        h: 0.5 + ((i * 3) % 7) * 0.16,
      })),
    [],
  );
  return (
    <group>
      {ridges.map((r, i) => (
        <mesh key={i} position={[r.x, r.h / 2, r.z]} rotation={[0, r.rot, 0]}>
          <boxGeometry args={[r.len, r.h, 1.6]} />
          <meshStandardMaterial color="#E6EFF5" {...MAT.snow} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The assembled Maitri scene                                          */
/* ------------------------------------------------------------------ */

/**
 * Maitri station twin: main building on pillars, Lake Priyadarshini with the
 * heated pipeline, fuel farm, four generators, weather mast, summer camp,
 * Schirmacher hills, windsock toward Novo airfield, aurora, stars and snow.
 */
/** Thermal readout targets for Maitri. */
const MAITRI_THERMAL: Array<{ tag: string; position: [number, number, number] }> = [
  { tag: "HAB-MAITRI", position: [0, 13, 0] },
  { tag: "PIPE-MAITRI", position: [-19, 6, 14] },
  { tag: "GEN-1", position: [16, 6, -26] },
  { tag: "FUEL-MAITRI", position: [42, 13, 30] },
  { tag: "AWS-MAITRI", position: [-8, 21, -30] },
  { tag: "VSAT-MAITRI", position: [24, 16, -6] },
];

export function MaitriScene({
  readings,
  onSelect,
  activeHotspot,
  viewMode = "exterior",
  sun,
  onWaterSelect,
  activeWater,
  submergedWater,
  trackedWater,
  onVehicleSelect,
  activeVehicle,
  onEnterBuilding,
}: TwinSceneProps) {
  const lake = WATER_BODIES.priyadarshini;
  const rises = [
    { x: -240, z: -220, r: 260, h: 9 },
    { x: 230, z: -260, r: 210, h: 6 },
    { x: -120, z: 300, r: 180, h: 4 },
    { x: 300, z: 240, r: 170, h: 5 },
  ];
  return (
    <group>
      <Terrain size={800} rises={rises} />
      <SiteSurvey size={400} rings={[25, 50, 100, 200]} rises={rises} />
      <Lighting
        {...modeLighting(viewMode)}
        sunPosition={sun?.position ?? [120, 140, 60]}
        night={Boolean(sun?.night)}
      />
      <Stars count={800} />
      <Aurora z={-240} opacity={sun?.auroraOpacity ?? 0.32} />
      {/*
        Snow density is tuned to the frame budget: every flake is a per-frame
        position write in JavaScript, and past about two and a half thousand
        the extra flakes are indistinguishable at camera distance.
      */}
      <Snowfall count={2400} spread={320} />
      <GroundShadow />

      <MainStation onInfo={() => onSelect("main-station")} />
      <WaterBody
        def={lake}
        onSelect={onWaterSelect}
        active={activeWater === lake.id}
        submerged={submergedWater === lake.id}
        trackers={trackedWater === lake.id}
      />
      <BuildingEntrance
        position={[0, 3.9, 10.5]}
        label="Maitri main airlock"
        onEnter={() => onEnterBuilding?.()}
      />
      <HeatedPipeline />
      <FuelFarm />
      <PumpHouse />
      <Generators />
      <WeatherMast />
      <SummerCamp />
      <RockHills />
      <FuelStation />
      <AntennaMast />
      <Garage />
      <Helipad />
      <CargoYard />
      <Incinerator />
      <BalloonShed />
      <Sastrugi />
      <VehicleFleet
        station="maitri"
        onSelect={onVehicleSelect}
        activeVehicle={activeVehicle ?? null}
      />

      {viewMode === "mep" && <MepOverlay {...MAITRI_MEP} />}
      {viewMode === "thermal" && (
        <ThermalReadout targets={MAITRI_THERMAL} readings={readings} />
      )}

      {/* Windsock marking Novo airfield 5.5 km out */}
      <group position={[60, 0, -60]}>
        <mesh position={[0, 4, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 8, 6]} />
          <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
        </mesh>
        <mesh position={[0.9, 7.4, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.55, 2.4, 10, 1, true]} />
          <meshStandardMaterial color={TWIN_COLORS.trimOrange} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Hotspots */}
      {/*
        Hotspots. Clicking one selects the object and pins a label carrying the
        live readings for that plant, so the numbers appear on demand instead of
        sitting over the site permanently.
      */}
      <Hotspot
        position={[0, 12, 0]}
        label="main-station"
        title="Maitri main building"
        detail={readingRows(["HAB-MAITRI", "AWS-MAITRI", "VSAT-MAITRI"], readings)}
        onSelect={onSelect}
        active={activeHotspot === "main-station"}
      />
      <Hotspot position={[-58, 7, 36]} label="lake" onSelect={onSelect} active={activeHotspot === "lake"} />
      <Hotspot
        position={[-19, 5, 22]}
        label="pipeline"
        title="Heated lake pipeline"
        detail={readingRows(["PIPE-MAITRI"], readings)}
        onSelect={onSelect}
        active={activeHotspot === "pipeline"}
      />
      <Hotspot
        position={[42, 12, 30]}
        label="fuel"
        title="Fuel farm"
        detail={readingRows(["FUEL-MAITRI"], readings)}
        onSelect={onSelect}
        active={activeHotspot === "fuel"}
      />
      <Hotspot
        position={[16, 7, -26]}
        label="generators"
        title="Generator hall"
        detail={readingRows(["GEN-1", "GEN-2", "GEN-3"], readings)}
        onSelect={onSelect}
        active={activeHotspot === "generators"}
      />
      <Hotspot position={[-8, 19, -30]} label="weather" onSelect={onSelect} active={activeHotspot === "weather"} />
      <Hotspot position={[-44, 7, -12]} label="summer-camp" onSelect={onSelect} active={activeHotspot === "summer-camp"} />
      <Hotspot position={[62, 7, 18]} label="vehicle-fleet" onSelect={onSelect} active={activeHotspot === "vehicle-fleet"} />
      <Hotspot position={[74, 8, -30]} label="helipad" onSelect={onSelect} active={activeHotspot === "helipad"} />

      {/* Live telemetry readout above the main station, drawn in-canvas */}
      <TelemetryStrip
        position={[0, 16, 0]}
        tags={["GEN-1", "PIPE-MAITRI", "AWS-MAITRI"]}
        readings={readings}
      />

      <ViewModeEffect mode={viewMode} />
    </group>
  );
}
