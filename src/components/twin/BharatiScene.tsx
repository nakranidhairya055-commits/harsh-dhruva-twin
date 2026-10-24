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
  Label3D,
  TelemetryStrip,
  Terrain,
  ThermalReadout,
  TWIN_COLORS,
  type TwinSceneProps,
} from "./twin-primitives";
import { IcebergTracker } from "./water/IcebergTracker";
import { WaterBody } from "./water/WaterBody";
import { WATER_BODIES, stationWater } from "./water/water-data";
import { VehicleFleet } from "./VehicleFleet";
import { BHARATI_MEP, MepOverlay } from "./MepOverlay";
import { ViewModeEffect, modeLighting } from "./view-modes";

/* ------------------------------------------------------------------ */
/* Reusable building blocks                                            */
/* ------------------------------------------------------------------ */

/** Interlocked container main station with lit windows and yellow door. */
function ContainerStation({ onInfo }: { onInfo: () => void }) {
  const rows = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        z: -21 + i * 6,
        count: 5,
      })),
    [],
  );
  return (
    <group
      userData={{ structural: true }}
      onClick={(e) => { e.stopPropagation(); onInfo(); }}
    >
      {/* 8 container rows x 5 containers, two levels */}
      {rows.map((row, ri) =>
        Array.from({ length: row.count }, (_, ci) => {
          const x = -15 + ci * 7.5;
          const y = ri % 2 === 0 ? 2 : 5.4;
          return (
            <mesh key={`${ri}-${ci}`} position={[x, y, row.z]}>
              <boxGeometry args={[7.1, 3.2, 5.8]} />
              <meshStandardMaterial
                color={(ri + ci) % 3 === 0 ? TWIN_COLORS.containerBlue : TWIN_COLORS.steelWhite}
                {...MAT.metal}
              />
            </mesh>
          );
        }),
      )}
      {/* 40 lit windows across the sea-facing face */}
      {Array.from({ length: 40 }, (_, i) => {
        const ri = Math.floor(i / 10);
        const ci = i % 10;
        return (
          <mesh key={i} position={[-13.5 + ci * 3, 2.4 + (ri % 2) * 3.2, 25.2]} rotation={[0, 0, 0]}>
            <planeGeometry args={[1.5, 1.1]} />
            <meshStandardMaterial
              color="#7FB4E8"
              emissive={TWIN_COLORS.windowLit}
              emissiveIntensity={ri % 2 === 0 ? 1.3 : 0.55}
              {...MAT.glass}
            />
          </mesh>
        );
      })}
      {/* Main yellow door */}
      <mesh position={[0, 1.7, 25.4]}>
        <planeGeometry args={[2.4, 3.4]} />
        <meshStandardMaterial color={TWIN_COLORS.door} emissive={TWIN_COLORS.door} emissiveIntensity={0.25} />
      </mesh>
      {/* Roof railings */}
      {[-30, 30].map((x) => (
        <mesh key={x} position={[x, 7.6, 0]}>
          <boxGeometry args={[0.18, 1.2, 50]} />
          <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
        </mesh>
      ))}
      {/* 4 antenna dishes */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-9 + i * 6, 8.6, -8 + (i % 2) * 10]} rotation={[0.6, i * 0.4, 0]}>
          <sphereGeometry args={[1.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
          <meshStandardMaterial color="#B9C4CC" {...MAT.metal} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Three CHP units with exhaust stacks, heat-exchanger coils and status panels. */
function CHPUnits() {
  const panels = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (panels.current) {
      panels.current.children.forEach((c, i) => {
        const mesh = c as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.8 + Math.sin(clock.elapsedTime * 2 + i) * 0.4;
      });
    }
  });
  return (
    <group position={[34, 0, -20]}>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, 0, i * 8]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[6, 3, 3]} />
            <meshStandardMaterial color="#5B6670" {...MAT.metal} />
          </mesh>
          {/* exhaust stack */}
          <mesh position={[-2, 4.2, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 3.6, 10]} />
            <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
          </mesh>
          {/* heat exchanger coils */}
          {[0.4, 1.0, 1.6].map((y) => (
            <mesh key={y} position={[2.4, y + 0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.5, 0.09, 8, 18]} />
              <meshStandardMaterial color={TWIN_COLORS.amber} emissive={TWIN_COLORS.amber} emissiveIntensity={0.5} />
            </mesh>
          ))}
          {/* status panel */}
          <mesh ref={i === 0 ? panels : undefined} position={[0, 1.7, 1.6]}>
            <planeGeometry args={[1.3, 0.8]} />
            <meshStandardMaterial color={TWIN_COLORS.cyan} emissive={TWIN_COLORS.cyan} emissiveIntensity={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 13-tank fuel farm in two rows plus three yellow day tanks. */
function FuelFarm13() {
  const tanks = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => ({
        x: -3 + (i % 7) * 6.5,
        z: i < 7 ? 0 : 9,
        r: i < 7 ? 2.6 : 2.2,
      })),
    [],
  );
  return (
    <group position={[-44, 0, -18]}>
      {tanks.map((t, i) => (
        <mesh key={i} position={[t.x, t.r * 0.9, t.z]}>
          <cylinderGeometry args={[t.r, t.r, t.r * 1.8, 18]} />
          <meshStandardMaterial color={TWIN_COLORS.fuel} {...MAT.metal} />
        </mesh>
      ))}
      {/* day tanks */}
      {[-24, -21, -18].map((x, i) => (
        <mesh key={i} position={[x, 0.9, 16]}>
          <cylinderGeometry args={[0.8, 0.8, 1.6, 12]} />
          <meshStandardMaterial color={TWIN_COLORS.door} {...MAT.metal} />
        </mesh>
      ))}
    </group>
  );
}

/** Seawater pump house with the 450 m intake line running to the fjord. */
function SeawaterPumpHouse() {
  return (
    <group position={[10, 0, 44]}>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[10, 4, 6]} />
        <meshStandardMaterial color={TWIN_COLORS.steelWhite} {...MAT.metal} />
      </mesh>
      <mesh position={[0, 4.3, 0]}>
        <boxGeometry args={[10.6, 0.5, 6.6]} />
        <meshStandardMaterial color={TWIN_COLORS.containerBlue} {...MAT.metal} />
      </mesh>
      {/* intake pipe run toward the water */}
      {[0.25, 0.5, 0.75].map((t, i) => (
        <mesh key={i} position={[0, 0.45, 4 + t * 22]}>
          <cylinderGeometry args={[0.45, 0.45, 6, 10]} />
          <meshStandardMaterial color="#4C5860" {...MAT.metal} />
        </mesh>
      ))}
    </group>
  );
}

/** Wastewater treatment plant with three tanks and rising steam puffs. */
function WastewaterPlant() {
  const steam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (steam.current) {
      steam.current.children.forEach((c, i) => {
        const mesh = c as THREE.Mesh;
        const t = (clock.elapsedTime * 0.35 + i * 0.33) % 1;
        mesh.position.y = 2.2 + t * 4;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.4 * (1 - t);
      });
    }
  });
  return (
    <group position={[-20, 0, 40]}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[8, 3, 6]} />
        <meshStandardMaterial color="#77828C" {...MAT.metal} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-2.2 + i * 2.2, 2.1, -3.4]}>
          <cylinderGeometry args={[0.85, 0.85, 1.4, 12]} />
          <meshStandardMaterial color="#98A2AA" {...MAT.metal} />
        </mesh>
      ))}
      <group ref={steam}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 2.2, 0]}>
            <sphereGeometry args={[0.7, 10, 10]} />
            <meshStandardMaterial color="#DCE6EC" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Laboratory module with blue windows and equipment silhouettes. */
function Laboratory() {
  return (
    <group position={[46, 0, 26]}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[10, 3, 8]} />
        <meshStandardMaterial color={TWIN_COLORS.steelWhite} {...MAT.metal} />
      </mesh>
      {[-3, 0, 3].map((x) => (
        <mesh key={x} position={[x, 1.7, 4.05]}>
          <planeGeometry args={[1.8, 1.2]} />
          <meshStandardMaterial
            color="#7FB4E8"
            emissive="#7FB4E8"
            emissiveIntensity={1.1}
            {...MAT.glass}
          />
        </mesh>
      ))}
      {/* equipment silhouettes on the roof */}
      {[-2.5, 0.5, 3].map((x, i) => (
        <mesh key={i} position={[x, 3.5, -1]}>
          <boxGeometry args={[1.4, 1, 1.4]} />
          <meshStandardMaterial color="#5B6670" {...MAT.metal} />
        </mesh>
      ))}
    </group>
  );
}

/** Summer camp: 15 red-white containers in a 5x3 block. */
function SummerCamp15() {
  return (
    <group position={[-12, 0, -52]} rotation={[0, -0.2, 0]}>
      {Array.from({ length: 15 }, (_, i) => (
        <mesh key={i} position={[(i % 5) * 6.5, 1.5, Math.floor(i / 5) * 5]}>
          <boxGeometry args={[6, 3, 4.2]} />
          <meshStandardMaterial color={i % 2 === 0 ? TWIN_COLORS.moduleRed : TWIN_COLORS.moduleWhite} {...MAT.metal} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Thala Fjord, Quilty Bay, the seawater intake line and the forty-four
 * Larsemann lakelets.
 *
 * Every body is interactive: a click opens its survey panel, the iceberg
 * tracker overlay and ice thickness heatmap are driven by the same catalogue,
 * and the lakelets are coloured by measured ice thickness when the survey
 * overlay is switched on.
 */
function WaterFeatures({
  onWaterSelect,
  activeWater,
  submergedWater,
  trackedWater,
  showLakes,
}: {
  onWaterSelect?: (id: string) => void;
  activeWater?: string | null;
  submergedWater?: string | null;
  trackedWater?: string | null;
  showLakes?: boolean;
}) {
  const fjord = WATER_BODIES["thala-fjord"];
  const bay = WATER_BODIES["quilty-bay"];
  const intake = WATER_BODIES["seawater-intake"];
  const lakelets = stationWater("bharati").filter((body) => body.kind === "lakelet");

  return (
    <group>
      <WaterBody
        def={fjord}
        onSelect={onWaterSelect}
        active={activeWater === fjord.id}
        submerged={submergedWater === fjord.id}
        trackers={trackedWater === fjord.id}
      />
      <WaterBody
        def={bay}
        onSelect={onWaterSelect}
        active={activeWater === bay.id}
        submerged={submergedWater === bay.id}
        trackers={trackedWater === bay.id}
      />
      <WaterBody
        def={intake}
        onSelect={onWaterSelect}
        active={activeWater === intake.id}
        submerged={submergedWater === intake.id}
      />

      {/* Intake line running from the pump house out into the fjord */}
      <mesh position={[10, 0.75, 62]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 38, 12]} />
        <meshStandardMaterial
          color={TWIN_COLORS.cyan}
          emissive={TWIN_COLORS.cyan}
          emissiveIntensity={0.45}
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      {[52, 62, 72].map((z) => (
        <mesh key={z} position={[10, 0.3, z]}>
          <boxGeometry args={[1.1, 0.9, 0.5]} />
          <meshStandardMaterial color={TWIN_COLORS.pole} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {lakelets.map((body) => (
        <WaterBody
          key={body.id}
          def={body}
          onSelect={onWaterSelect}
          active={activeWater === body.id}
          submerged={submergedWater === body.id}
          heatmap={showLakes}
          research={body.metrics.some((m) => m.value.startsWith("Cyanobacteria"))}
        />
      ))}

      {trackedWater === fjord.id && <IcebergTracker def={fjord} />}
      {trackedWater === bay.id && <IcebergTracker def={bay} />}
    </group>
  );
}

/** Larsemann Hills outcrops including the 104 m hill. */
function LarsemannHills() {
  const hills = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: -230 + ((i * 71) % 460),
        z: -250 + ((i * 29) % 90),
        s: 7 + ((i * 17) % 20),
      })),
    [],
  );
  return (
    <group>
      {hills.map((h, i) => (
        <mesh key={i} position={[h.x, h.s * 0.3, h.z]} rotation={[0.15, i, 0.12]}>
          <dodecahedronGeometry args={[h.s, 0]} />
          <meshStandardMaterial color={TWIN_COLORS.rock} {...MAT.rock} />
        </mesh>
      ))}
      {/* the 104 m outcrop */}
      <mesh position={[-160, 12, -210]} rotation={[0.1, 0.7, 0.06]}>
        <dodecahedronGeometry args={[34, 0]} />
        <meshStandardMaterial color={TWIN_COLORS.rock} {...MAT.rock} />
      </mesh>
    </group>
  );
}

/** Distance marker for a neighbouring station. */
function NeighbourMarker({
  position,
  name,
}: {
  position: [number, number, number];
  name: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 6, 6]} />
        <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
      </mesh>
      <mesh position={[0, 6.6, 0]}>
        <octahedronGeometry args={[0.9]} />
        <meshStandardMaterial color={TWIN_COLORS.amber} emissive={TWIN_COLORS.amber} emissiveIntensity={0.8} />
      </mesh>
      <Label3D
        position={[0, 8.6, 0]}
        border={TWIN_COLORS.amber}
        px={0.2}
        ambient
        rows={[{ text: name, color: TWIN_COLORS.amber }]}
      />
    </group>
  );
}

/** Cargo and cold-store containers stacked behind the main building. */
function CargoYard() {
  return (
    <group position={[-24, 0, -78]} rotation={[0, 0.1, 0]}>
      {Array.from({ length: 10 }, (_, i) => (
        <group key={i} position={[(i % 5) * 6.6, 0, Math.floor(i / 5) * 3.6]}>
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[6, 2.8, 2.9]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? TWIN_COLORS.moduleRed : i % 3 === 1 ? "#26506E" : TWIN_COLORS.moduleWhite}
              {...MAT.metal}
            />
          </mesh>
          <mesh position={[0, 2.85, 0]}>
            <boxGeometry args={[6.1, 0.2, 3]} />
            <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Helipad apron with approach markings and perimeter lights. */
function Helipad() {
  return (
    <group position={[-74, 0, -34]}>
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7.5, 28]} />
        <meshStandardMaterial color="#2A333C" {...MAT.snow} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.6, 7.2, 32]} />
        <meshStandardMaterial color="#E8EEF4" side={THREE.DoubleSide} />
      </mesh>
      {[0, 0.35, 1].map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a * 6.28) * 1.3, 0.21, Math.sin(a * 6.28) * 1.1]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
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

/** Ice runway marker used by the summer air link. */
function IceRunway() {
  return (
    <group position={[120, 0, -140]} rotation={[0, -0.18, 0]}>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 220]} />
        <meshStandardMaterial color="#D3E0E8" {...MAT.snow} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} position={[i % 2 === 0 ? -12 : 12, 0.4, -100 + i * 22]}>
          <boxGeometry args={[0.4, 0.7, 0.4]} />
          <meshStandardMaterial color={TWIN_COLORS.amber} emissive={TWIN_COLORS.amber} emissiveIntensity={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 26]} />
        <meshStandardMaterial color="#8A949E" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Wind-carved sastrugi ridges across the Larsemann apron. */
function Sastrugi() {
  const ridges = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: -160 + ((i * 59) % 360),
        z: 60 + ((i * 43) % 220),
        rot: (i * 0.41) % Math.PI,
        len: 9 + ((i * 7) % 18),
        h: 0.45 + ((i * 5) % 7) * 0.15,
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

/** Fjord-side jetty used by the Zodiac and resupply lighters. */
function Jetty() {
  return (
    <group position={[52, 0, 96]} rotation={[0, 0.4, 0]}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[4, 0.4, 26]} />
        <meshStandardMaterial color="#6B4E2E" {...MAT.metal} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[i % 2 === 0 ? -1.6 : 1.6, 0.2, -12 + i * 4.8]}>
          <cylinderGeometry args={[0.28, 0.28, 1.4, 8]} />
          <meshStandardMaterial color={TWIN_COLORS.pole} {...MAT.metal} />
        </mesh>
      ))}
      <mesh position={[0, 1.5, 12]}>
        <cylinderGeometry args={[0.2, 0.2, 2, 8]} />
        <meshStandardMaterial color={TWIN_COLORS.amber} emissive={TWIN_COLORS.amber} emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The assembled Bharati scene                                         */
/* ------------------------------------------------------------------ */

/**
 * Bharati station twin: the 134-container main building, three CHP units,
 * the 13-tank fuel farm, seawater pump house with intake line, wastewater
 * plant, laboratory, summer camp, Thala Fjord, Quilty Bay, scattered lakes,
 * Larsemann Hills and neighbour-station markers.
 */
/** Thermal readout targets for Bharati. */
const BHARATI_THERMAL: Array<{ tag: string; position: [number, number, number] }> = [
  { tag: "HAB-BHARATI", position: [0, 16, 0] },
  { tag: "CHP-1", position: [34, 9, -20] },
  { tag: "FUEL-BHARATI", position: [-44, 14, -12] },
  { tag: "SWPUMP-BHARATI", position: [10, 10, 44] },
  { tag: "AWS-BHARATI", position: [-8, 20, -60] },
  { tag: "VSAT-BHARATI", position: [30, 16, 8] },
];

export function BharatiScene({
  readings,
  onSelect,
  activeHotspot,
  viewMode = "exterior",
  sun,
  onWaterSelect,
  activeWater,
  submergedWater,
  trackedWater,
  showLakes,
  onVehicleSelect,
  activeVehicle,
  onEnterBuilding,
}: TwinSceneProps) {
  const rises = [
    { x: -240, z: -280, r: 260, h: 11 },
    { x: 260, z: -210, r: 200, h: 7 },
    { x: 40, z: -320, r: 170, h: 8 },
    { x: 320, z: 180, r: 150, h: 5 },
  ];
  return (
    <group>
      <Terrain size={900} color="#C7D3DA" rises={rises} />
      <SiteSurvey size={420} rings={[25, 50, 100, 200]} rises={rises} />
      <Lighting
        {...modeLighting(viewMode)}
        sunPosition={sun?.position ?? [120, 140, 60]}
        night={Boolean(sun?.night)}
      />
      <Stars count={1200} />
      <Aurora z={-240} scale={1.25} opacity={sun?.auroraOpacity ?? 0.32} />
      {/* Tuned to the frame budget: see the note in the Maitri scene. */}
      <Snowfall count={2400} spread={360} />
      <GroundShadow />

      <ContainerStation onInfo={() => onSelect("main-station")} />
      <BuildingEntrance
        position={[0, 2.7, 25.6]}
        label="Bharati main airlock"
        onEnter={() => onEnterBuilding?.()}
      />
      <CHPUnits />
      <FuelFarm13 />
      <SeawaterPumpHouse />
      <WastewaterPlant />
      <Laboratory />
      <SummerCamp15 />
      <WaterFeatures
        onWaterSelect={onWaterSelect}
        activeWater={activeWater}
        submergedWater={submergedWater}
        trackedWater={trackedWater}
        showLakes={showLakes}
      />
      <LarsemannHills />
      <CargoYard />
      <Helipad />
      <IceRunway />
      <Sastrugi />
      <Jetty />
      <VehicleFleet
        station="bharati"
        onSelect={onVehicleSelect}
        activeVehicle={activeVehicle ?? null}
      />

      {viewMode === "mep" && <MepOverlay {...BHARATI_MEP} />}
      {viewMode === "thermal" && (
        <ThermalReadout targets={BHARATI_THERMAL} readings={readings} />
      )}

      {/* Neighbour stations */}
      <NeighbourMarker position={[150, 0, -40]} name="PROGRESS 8 KM" />
      <NeighbourMarker position={[230, 0, -90]} name="ZHONGSHAN" />

      {/* Hotspots */}
      {/*
        Hotspots. Clicking one selects the object and pins a label carrying the
        live readings for that plant, so nothing floats over the site until the
        operator asks for it.
      */}
      <Hotspot
        position={[0, 14, 10]}
        label="main-station"
        title="Bharati container station"
        detail={readingRows(["HAB-BHARATI", "AWS-BHARATI", "VSAT-BHARATI"], readings)}
        onSelect={onSelect}
        active={activeHotspot === "main-station"}
      />
      <Hotspot
        position={[34, 10, -20]}
        label="chp"
        title="CHP plant"
        detail={readingRows(["CHP-1", "CHP-2", "CHP-3"], readings)}
        onSelect={onSelect}
        active={activeHotspot === "chp"}
      />
      <Hotspot
        position={[-44, 12, -12]}
        label="fuel"
        title="Fuel farm"
        detail={readingRows(["FUEL-BHARATI"], readings)}
        onSelect={onSelect}
        active={activeHotspot === "fuel"}
      />
      <Hotspot
        position={[10, 9, 44]}
        label="seawater"
        title="Seawater intake"
        detail={readingRows(["SWPUMP-BHARATI"], readings)}
        onSelect={onSelect}
        active={activeHotspot === "seawater"}
      />
      <Hotspot position={[-20, 8, 40]} label="wastewater" onSelect={onSelect} active={activeHotspot === "wastewater"} />
      <Hotspot position={[46, 7, 26]} label="laboratory" onSelect={onSelect} active={activeHotspot === "laboratory"} />
      <Hotspot position={[-12, 7, -52]} label="summer-camp" onSelect={onSelect} active={activeHotspot === "summer-camp"} />
      <Hotspot position={[-70, 6, 110]} label="fjord" onSelect={onSelect} active={activeHotspot === "fjord"} />
      <Hotspot position={[120, 6, 90]} label="bay" onSelect={onSelect} active={activeHotspot === "bay"} />
      <Hotspot position={[-80, 8, 16]} label="vehicle-fleet" onSelect={onSelect} active={activeHotspot === "vehicle-fleet"} />
      <Hotspot position={[-74, 8, -34]} label="helipad" onSelect={onSelect} active={activeHotspot === "helipad"} />

      {/* Live telemetry readout above the station, drawn in-canvas */}
      <TelemetryStrip
        position={[0, 17, 10]}
        tags={["CHP-1", "CHP-2", "SWPUMP-BHARATI", "AWS-BHARATI"]}
        readings={readings}
      />

      <ViewModeEffect mode={viewMode} />
    </group>
  );
}
