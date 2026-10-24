import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Label3D } from "../twin-primitives";
import {
  BenchSeat,
  Bunk,
  CabinetUnit,
  Chair,
  Crate,
  Extinguisher,
  Figure,
  Locker,
  PersonalDesk,
  Plant,
  Shower,
  SingleBed,
  Sofa,
  SpinningFan,
  Table,
  Toilet,
  WallClock,
  WallScreen,
  WashBasin,
} from "./furniture";
import { Box, Cyl, INT, Interactive, Panel, Spinner, WallPlate } from "./kit";
import type { RoomDef } from "./plan-types";

/**
 * Living deck rooms.
 *
 * These rooms carry the human side of the station: cabins with named doors,
 * the galley and mess, recreation, training, ablutions, laundry, the sauna and
 * the observation lounge. Every fixture is clickable, so an operator can read
 * a cabin's occupancy, a fridge's stock level or a treadmill's running hours.
 */

const at = (room: RoomDef, dx: number, dz: number, y = 0): [number, number, number] => [
  room.x + dx,
  y,
  room.z + dz,
];

const CABIN_NAMES = [
  "CMDR",
  "ENG-1",
  "ENG-2",
  "MED",
  "SCI-1",
  "SCI-2",
  "MET",
  "COMMS",
  "GLAC",
  "LOG-1",
  "LOG-2",
  "DUTY",
];

/* ------------------------------------------------------------------ */
/* Living quarters: a row of named cabins                              */
/* ------------------------------------------------------------------ */

/**
 * One cabin: partition walls, a door with the occupant's name plate, bunk,
 * desk with lamp, locker and a porthole with a blackout curtain.
 */
function Cabin({
  p,
  index,
  wide,
}: {
  p: [number, number, number];
  index: number;
  wide: boolean;
}) {
  const name = CABIN_NAMES[index % CABIN_NAMES.length];
  return (
    <group position={p}>
      {/* Partitions */}
      <Box p={[0, 1.3, -1.3]} s={[3.2, 2.6, 0.1]} color={INT.wall} roughness={0.8} />
      <Box p={[1.6, 1.3, 0]} s={[0.1, 2.6, 2.6]} color={INT.wall} roughness={0.8} />
      {/* Door and plate */}
      <Box p={[-0.6, 1.05, 1.29]} s={[0.9, 2.1, 0.08]} color="#C9A25A" roughness={0.6} />
      <Box p={[-0.6, 1.05, 1.24]} s={[0.98, 2.18, 0.04]} color={INT.steel} metalness={0.6} roughness={0.4} />
      <Label3D
        position={[-0.6, 2.35, 1.32]}
        border={INT.trim}
        px={0.055}
        rows={[{ text: name, color: INT.trim }]}
      />
      {/* Porthole with curtain */}
      <Cyl p={[-0.4, 1.75, -1.24]} r={0.28} h={0.06} axis="z" color={INT.steel} metalness={0.7} roughness={0.3} />
      <Panel p={[-0.4, 1.75, -1.2]} s={[0.44, 0.44]} tone="#8FD8FF" intensity={0.6} />
      <Box p={[-0.4, 1.75, -1.15]} s={[0.5, 0.5, 0.05]} color="#27415C" roughness={0.9} />
      {/* Personal photographs */}
      <Box p={[0.5, 1.85, -1.24]} s={[0.3, 0.22, 0.03]} color="#E8EEF4" roughness={0.6} />
      <Box p={[0.9, 1.7, -1.24]} s={[0.24, 0.3, 0.03]} color="#D8A017" roughness={0.6} />
      {/* Bunk, desk and locker */}
      <Bunk p={[-0.75, 0, -0.35]} rot={Math.PI / 2} tone={wide ? INT.fabric : INT.fabricAlt} />
      <PersonalDesk p={[0.95, 0, -0.75]} rot={0.2} label={`Cabin ${name}`} />
      <Locker p={[0.95, 0, 0.85]} rot={Math.PI} h={1.7} tone={INT.wallAccent} />
      <Chair p={[0.5, 0, -0.4]} rot={-1.2} kind="task" />
      <Plant p={[1.35, 0, 0.2]} />
    </group>
  );
}

function LivingQuarters({ room }: { room: RoomDef }) {
  const count = room.w > 12 ? 4 : 3;
  const cabins = useMemo(() => {
    const span = room.w - 0.6;
    return Array.from({ length: count }, (_, i) => ({
      x: -span / 2 + (span / Math.max(1, count)) * (i + 0.5) + 0.9,
      index: i,
    }));
  }, [count, room.w]);

  return (
    <group>
      {cabins.map((c) => (
        <Interactive
          key={c.index}
          label={`Cabin ${CABIN_NAMES[c.index % CABIN_NAMES.length]}`}
          kind="cabin"
          detail="Private cabin with bunk, desk, locker and a blackout curtain over the porthole."
          position={at(room, c.x, 0.9, 0)}
          labelHeight={2.9}
        >
          <Cabin p={[0, 0, 0]} index={c.index} wide={count === 4} />
        </Interactive>
      ))}
      <Interactive label="Occupancy board" kind="occupancy-board" detail="Cabin allocation, winter-over list and muster status." position={at(room, 0, 0, 2.75)} labelHeight={0.7}>
        <group>
          <Box p={[0, 0, 0]} s={[0.3, 0.5, 0.05]} color={INT.veryDark} roughness={0.6} />
          <Label3D position={[0, 0, -0.05]} border={INT.trim} px={0.04} rows={[{ text: "OCCUPANCY", color: INT.trim }, { text: "10 CABINS", color: INT.screenBlue }, { text: "9 OCCUPIED", color: INT.green }]} />
        </group>
      </Interactive>
    </group>
  );
}

function Dormitory({ room, beds = 6 }: { room: RoomDef; beds?: number }) {
  const positions = useMemo(() => {
    const half = Math.ceil(beds / 2);
    return Array.from({ length: beds }, (_, i) => {
      const row = i < half ? 0 : 1;
      const col = i < half ? i : i - half;
      const per = row === 0 ? half : beds - half;
      const span = room.w - 2.0;
      return {
        x: -span / 2 + (span / Math.max(1, per - 1 || 1)) * col,
        z: row === 0 ? -room.d / 2 + 1.4 : room.d / 2 - 1.4,
        rot: row === 0 ? 0 : Math.PI,
      };
    });
  }, [beds, room.w, room.d]);

  return (
    <group>
      {positions.map((p, i) => (
        <Interactive
          key={i}
          label={`Berth ${i + 1}`}
          kind="berth"
          detail="Single berth with reading lamp and shared dresser; summer campaign accommodation."
          position={at(room, p.x, p.z, 0)}
          rotation={[0, p.rot, 0]}
          labelHeight={1.9}
        >
          <group>
            <SingleBed p={[0, 0, 0]} tone={i % 2 === 0 ? INT.fabricAlt : INT.fabric} />
            <Locker p={[0.95, 0, 0]} h={1.5} tone={INT.wallAccent} />
          </group>
        </Interactive>
      ))}
      <Interactive label="Reading table" kind="reading-table" detail="Shared table with lamp; the mess schedule and a notice board are pinned beside it." position={at(room, 0, 0, 0)} labelHeight={1.5}>
        <group>
          <Table p={[0, 0, 0]} w={2.2} d={1.0} tone={INT.wood} />
          <Chair p={[-0.6, 0, 1.0]} rot={Math.PI} kind="dining" />
          <Chair p={[0.6, 0, 1.0]} rot={Math.PI} kind="dining" />
          <Chair p={[-0.6, 0, -1.0]} kind="dining" />
          <Chair p={[0.6, 0, -1.0]} kind="dining" />
          <Box p={[0, 0.8, 0]} s={[0.4, 0.06, 0.3]} color="#E8EEF4" roughness={0.6} />
        </group>
      </Interactive>
      <WallPlate position={at(room, 0, -room.d / 2 + 0.16, 2.6)} text="QUIET HOURS 2200 - 0600" tone={INT.screenBlue} width={3.2} />
      <Extinguisher p={at(room, room.w / 2 - 0.4, room.d / 2 - 0.4, 0)} rot={Math.PI} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Galley                                                             */
/* ------------------------------------------------------------------ */

function Galley({ room, burners = 6 }: { room: RoomDef; burners?: number }) {
  const fan = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (fan.current) fan.current.rotation.y += 0.06;
  });
  return (
    <group>
      <Interactive
        label="Range and oven"
        kind="stove"
        detail={`Industrial range with ${burners} burners, oven and extraction canopy. Gas and electrical load are both metered.`}
        position={at(room, -room.w / 2 + 1.5, -room.d / 2 + 0.9, 0)}
        labelHeight={2.2}
      >
        <group>
          <Box p={[0, 0.85, 0]} s={[2.7, 0.1, 1.0]} color="#3A4550" metalness={0.6} roughness={0.4} />
          <Box p={[0, 0.45, 0]} s={[2.7, 0.8, 1.0]} color={INT.metal} metalness={0.6} roughness={0.4} />
          <Box p={[0, 0.96, -0.2]} s={[2.6, 0.12, 0.6]} color={INT.veryDark} roughness={0.5} />
          {Array.from({ length: burners }, (_, i) => {
            const row = i < burners / 2 ? 0 : 1;
            const col = i < burners / 2 ? i : i - burners / 2;
            const per = Math.ceil(burners / 2);
            return (
              <group key={i} position={[-1.1 + (2.2 / Math.max(1, per - 1)) * col, 1.06, row === 0 ? -0.42 : 0.02]}>
                <Cyl p={[0, 0, 0]} r={0.22} h={0.05} color={INT.dark} metalness={0.7} />
                <Cyl p={[0, 0.03, 0]} r={0.15} h={0.02} color={row === 0 && col < 2 ? INT.red : "#4A9EFF"} emissive={row === 0 && col < 2 ? INT.red : "#4A9EFF"} emissiveIntensity={1.1} />
              </group>
            );
          })}
          {[-1.2, -0.4, 0.4, 1.2].map((x) => (
            <Cyl key={x} p={[x, 0.7, 0.52]} r={0.03} h={0.14} axis="z" color={INT.steel} metalness={0.85} />
          ))}
          <Box p={[0, 1.75, -0.2]} s={[2.9, 0.3, 1.3]} color={INT.metal} metalness={0.7} roughness={0.35} />
          <Cyl p={[0, 2.2, -0.6]} r={0.2} h={0.7} color={INT.metal} metalness={0.7} />
          <mesh ref={fan} position={[1.1, 1.5, 0.5]}>
            <torusGeometry args={[0.18, 0.04, 8, 16]} />
            <meshStandardMaterial color={INT.steel} metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Hanging pots and pans */}
          <Cyl p={[0.2, 2.0, 0.55]} r={0.02} h={2.4} axis="x" color={INT.steel} metalness={0.85} />
          {[-0.7, -0.25, 0.2, 0.65].map((x) => (
            <group key={`p${x}`} position={[x, 1.78, 0.55]}>
              <Cyl p={[0, 0.06, 0]} r={0.012} h={0.12} color={INT.steel} metalness={0.85} />
              <Cyl p={[0, -0.06, 0]} r={0.16} h={0.16} color={INT.metal} metalness={0.8} roughness={0.3} />
            </group>
          ))}
        </group>
      </Interactive>

      {Array.from({ length: room.w > 11 ? 3 : 2 }, (_, i) => (
        <Interactive
          key={i}
          label={`Refrigerator ${i + 1}`}
          kind="fridge"
          detail="Upright refrigerator with glass front; stock level is entered at each meal service."
          position={at(room, room.w / 2 - 0.9, -room.d / 2 + 1.0 + i * 1.3, 0)}
          labelHeight={2.4}
        >
          <CabinetUnit p={[0, 0, 0]} w={1.1} h={2.1} d={0.7} doors={1} tone={INT.ceramic} glass />
          <Panel p={[0, 1.4, 0.37]} s={[0.7, 0.7]} tone="#BFE8FF" intensity={0.55} opacity={0.5} />
          {[0.5, 0.9, 1.3].map((y, j) => (
            <Box key={j} p={[-0.2 + j * 0.2, y, 0.3]} s={[0.16, 0.2, 0.16]} color={["#B3402F", "#3E6B3A", "#D8A017"][j]} roughness={0.7} />
          ))}
        </Interactive>
      ))}

      <Interactive label="Chest freezer" kind="freezer" detail="Deep freezer for bulk meat and frozen vegetables." position={at(room, -room.w / 2 + 1.2, room.d / 2 - 0.9, 0)} labelHeight={1.4}>
        <group>
          <Box p={[0, 0.45, 0]} s={[1.6, 0.9, 0.8]} color={INT.ceramic} roughness={0.4} />
          <Box p={[0, 0.93, 0]} s={[1.62, 0.1, 0.82]} color={INT.steel} metalness={0.6} />
          <Box p={[0, 1.0, 0]} s={[0.4, 0.06, 0.1]} color={INT.dark} metalness={0.6} />
        </group>
      </Interactive>

      <Interactive label="Preparation counter" kind="prep-counter" detail="Stainless prep bench with chopping boards, scales and a potable water tap." position={at(room, 0.6, 0.2, 0)} labelHeight={1.6}>
        <group>
          <Box p={[0, 0.88, 0]} s={[2.6, 0.08, 0.9]} color={INT.metal} metalness={0.75} roughness={0.3} />
          {[-1.1, 1.1].map((x) => (
            <Box key={x} p={[x, 0.44, 0]} s={[0.1, 0.88, 0.8]} color={INT.steel} metalness={0.7} />
          ))}
          <Box p={[0, 0.56, 0.3]} s={[1.4, 0.5, 0.06]} color={INT.ceramic} roughness={0.6} />
          <Box p={[-0.7, 0.95, 0]} s={[0.5, 0.06, 0.34]} color={INT.wood} roughness={0.8} />
          <Box p={[0.5, 0.98, 0]} s={[0.3, 0.1, 0.3]} color={INT.ceramic} roughness={0.4} />
          <Cyl p={[1.1, 1.15, -0.2]} r={0.03} h={0.6} color={INT.metal} metalness={0.85} />
        </group>
      </Interactive>

      <Interactive label="Industrial sink" kind="sink" detail="Two-bowl stainless sink with drainer, used for wash-up after each service." position={at(room, -room.w / 2 + 1.2, 1.2, 0)}>
        <group>
          <Box p={[0, 0.88, 0]} s={[2.0, 0.08, 0.8]} color={INT.metal} metalness={0.75} roughness={0.3} />
          {[-0.4, 0.4].map((x) => (
            <Box key={x} p={[x, 0.84, 0]} s={[0.7, 0.1, 0.6]} color="#8A949E" metalness={0.8} />
          ))}
          <Cyl p={[0, 1.06, -0.24]} r={0.03} h={0.4} color={INT.metal} metalness={0.85} />
          <Cyl p={[0, 1.24, -0.06]} r={0.025} h={0.3} axis="z" color={INT.metal} metalness={0.85} />
          {[-0.8, 0.8].map((x) => (
            <Box key={`l${x}`} p={[x, 0.44, 0]} s={[0.1, 0.88, 0.7]} color={INT.steel} metalness={0.7} />
          ))}
        </group>
      </Interactive>

      <Interactive label="Coffee machine" kind="coffee" detail="Bean-to-cup machine kept running through the working watch." position={at(room, room.w / 2 - 0.8, 1.6, 0)} labelHeight={1.9}>
        <group>
          <Box p={[0, 0.9, 0]} s={[0.6, 0.7, 0.5]} color={INT.veryDark} roughness={0.5} />
          <Panel p={[0, 1.0, 0.26]} s={[0.4, 0.24]} tone={INT.screenCyan} intensity={1.0} />
          <Cyl p={[0, 0.5, 0.24]} r={0.09} h={0.12} color={INT.ceramic} roughness={0.4} />
        </group>
      </Interactive>

      <Interactive label="Microwave" kind="microwave" detail="Domestic microwave on the prep shelf." position={at(room, room.w / 2 - 1.9, 1.6, 1.05)} labelHeight={0.7}>
        <Box p={[0, 0, 0]} s={[0.55, 0.35, 0.4]} color={INT.metal} metalness={0.6} roughness={0.4} />
        <Panel p={[0, 0, 0.21]} s={[0.34, 0.24]} tone="#2E3A44" intensity={0.2} />
      </Interactive>

      <Interactive label="Walk-in pantry" kind="pantry" detail="Dry stores on steel shelving, indexed weekly against consumption." position={at(room, room.w / 2 - 0.6, room.d / 2 - 1.2, 0)} labelHeight={2.5}>
        <group>
          <Box p={[0, 1.2, 0]} s={[2.4, 2.4, 1.3]} color={INT.wall} roughness={0.7} />
          <Box p={[0, 1.2, -0.65]} s={[2.3, 2.3, 0.05]} color={INT.glass} opacity={0.3} roughness={0.2} />
          {[0.5, 1.1, 1.7].map((y) => (
            <group key={y}>
              <Box p={[0, y, 0]} s={[2.1, 0.05, 1.0]} color={INT.metal} metalness={0.6} />
              {[-0.7, -0.2, 0.3, 0.8].map((x) => (
                <Box key={`${y}-${x}`} p={[x, y + 0.2, 0]} s={[0.4, 0.34, 0.5]} color={["#8A6A44", "#B3402F", "#5A6C7C", "#D8A017"][Math.round(y * 2) % 4]} roughness={0.8} />
              ))}
            </group>
          ))}
        </group>
      </Interactive>

      <SpinningFan p={at(room, -room.w / 2 + 2.4, -room.d / 2 + 1.8, 1.4)} />
      <Figure p={at(room, 0.2, 0.9, 0)} rot={2.6} role="logistics" walking phase={0.7} />
      <Figure p={at(room, room.w / 4, -0.6, 0)} rot={-0.9} role="logistics" walking phase={3.1} />
      <Extinguisher p={at(room, -room.w / 2 + 0.4, -room.d / 2 + 0.5, 0)} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Dining mess                                                        */
/* ------------------------------------------------------------------ */

function DiningMess({ room, tables = 4 }: { room: RoomDef; tables?: number }) {
  const layout = useMemo(() => {
    const cols = tables > 4 ? 4 : 2;
    const rows = Math.ceil(tables / cols);
    return Array.from({ length: tables }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const spanX = room.w - 2.4;
      const spanZ = room.d - 3.0;
      return {
        x: -spanX / 2 + (spanX / Math.max(1, cols - 1 || 1)) * col,
        z: -spanZ / 2 + (spanZ / Math.max(1, rows - 1 || 1)) * row,
      };
    });
  }, [tables, room.w, room.d]);

  return (
    <group>
      {layout.map((t, i) => (
        <Interactive
          key={i}
          label={`Mess table ${i + 1}`}
          kind="mess-table"
          detail="Long mess table seating six; mess hours are posted on the board beside the serving counter."
          position={at(room, t.x, t.z, 0)}
          labelHeight={1.5}
        >
          <group>
            <Table p={[0, 0, 0]} w={2.4} d={1.0} tone={INT.wood} />
            {[-0.7, 0.7].map((x) => (
              <group key={x}>
                <Chair p={[x, 0, 1.0]} rot={Math.PI} kind="dining" />
                <Chair p={[x, 0, -1.0]} kind="dining" />
              </group>
            ))}
            <Cyl p={[-0.6, 0.82, 0]} r={0.07} h={0.12} color={INT.ceramic} roughness={0.4} />
            <Cyl p={[0, 0.82, 0.2]} r={0.06} h={0.14} color="#8A6A44" roughness={0.6} />
            <Box p={[0.7, 0.8, 0]} s={[0.3, 0.05, 0.24]} color="#D8DEE4" roughness={0.6} />
          </group>
        </Interactive>
      ))}

      <Interactive label="Serving counter" kind="serving-counter" detail="Hot and cold servery with bain-marie, trays and a waste separation point." position={at(room, 0, -room.d / 2 + 0.9, 0)} labelHeight={1.8}>
        <group>
          <Box p={[0, 0.88, 0]} s={[room.w - 1.6, 0.08, 1.0]} color={INT.metal} metalness={0.75} roughness={0.3} />
          <Box p={[0, 0.45, 0]} s={[room.w - 1.7, 0.8, 0.9]} color={INT.wall} roughness={0.6} />
          {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
            <Box key={x} p={[x, 1.0, 0]} s={[0.6, 0.16, 0.6]} color={INT.steel} metalness={0.7} />
          ))}
          {[-1.2, -0.4, 0.4, 1.2].map((x) => (
            <Panel key={`p${x}`} p={[x, 1.09, 0]} s={[0.5, 0.4]} rot={[-Math.PI / 2, 0, 0]} tone={INT.screenAmber} intensity={0.5} />
          ))}
        </group>
      </Interactive>

      <Interactive label="Meal schedule board" kind="meal-board" detail="Menu rotation and meal timings for the week." position={at(room, room.w / 2 - 1.4, -room.d / 2 + 0.16, 1.9)}>
        <Box p={[0, 0, 0]} s={[1.6, 1.0, 0.05]} color="#E8EEF4" roughness={0.6} />
        <Label3D position={[0, 0, 0.05]} border={INT.trim} px={0.04} rows={[
          { text: "MESS", color: INT.dark },
          { text: "0730  BREAKFAST", color: INT.dark },
          { text: "1230  LUNCH", color: INT.dark },
          { text: "1830  DINNER", color: INT.dark },
        ]} />
      </Interactive>

      <Interactive label="PA speaker" kind="pa-speaker" detail="Station public address for muster calls and schedule changes." position={at(room, -room.w / 2 + 1.2, -room.d / 2 + 0.16, 2.5)}>
        <Box p={[0, 0, 0]} s={[0.4, 0.4, 0.22]} color={INT.dark} roughness={0.6} />
        <Cyl p={[0, 0, 0.13]} r={0.12} h={0.03} axis="z" color="#3A4550" />
      </Interactive>

      <WallClock p={at(room, room.w / 2 - 0.6, 1.4, 2.4)} rot={-Math.PI / 2} />
      {Array.from({ length: 4 }, (_, i) => (
        <group key={`f${i}`} position={at(room, -room.w / 3 + i * 1.4, room.d / 2 - 1.2, 0)} rotation={[0, Math.PI, 0]}>
          <Figure p={[0, 0, 0]} rot={0} seated role={["scientist", "engineer", "operations", "logistics"][i]} />
        </group>
      ))}
      <Plant p={at(room, room.w / 2 - 0.9, room.d / 2 - 0.9, 0)} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Recreation and gym                                                 */
/* ------------------------------------------------------------------ */

function Recreation({ room }: { room: RoomDef }) {
  const tv = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!tv.current) return;
    const m = tv.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.9 + Math.sin(clock.elapsedTime * 1.6) * 0.25;
  });
  return (
    <group>
      <Interactive label="Home theatre" kind="tv" detail="Wall-mounted display with satellite feed and a film library." position={at(room, 0, -room.d / 2 + 0.2, 1.5)} labelHeight={2.4}>
        <group>
          <Box p={[0, 0, 0]} s={[2.0, 1.2, 0.08]} color={INT.veryDark} roughness={0.5} />
          <mesh ref={tv} position={[0, 0, 0.06]}>
            <planeGeometry args={[1.9, 1.1]} />
            <meshStandardMaterial color={INT.screenBlue} emissive={INT.screenBlue} emissiveIntensity={1.0} />
          </mesh>
        </group>
      </Interactive>
      <Interactive label="Sectional sofa" kind="sofa" detail="Seating for six, arranged around the screen for evening film sessions." position={at(room, 0, 0.6, 0)} labelHeight={1.4}>
        <group>
          <Sofa p={[0, 0, 0]} tone={INT.fabric} />
          <Sofa p={[-1.7, 0, 0.9]} rot={Math.PI / 2} tone={INT.fabricAlt} />
        </group>
      </Interactive>
      <Interactive label="Bookshelf" kind="bookshelf" detail="Station library and reference collection on open shelving." position={at(room, -room.w / 2 + 0.7, -0.4, 0)} labelHeight={2.3}>
        <group>
          <Box p={[0, 1.0, 0]} s={[0.5, 2.0, 1.8]} color={INT.woodDark} roughness={0.85} />
          {[0.4, 0.85, 1.3, 1.75].map((y) => (
            <group key={y}>
              <Box p={[0, y, 0]} s={[0.4, 0.04, 1.7]} color={INT.wood} roughness={0.85} />
              {Array.from({ length: 12 }, (_, j) => (
                <Box key={j} p={[0.05, y + 0.14, -0.75 + j * 0.14]} s={[0.24, 0.24, 0.08]} color={["#B3402F", "#27415C", "#3E6B3A", "#D8A017", "#5A4A64"][j % 5]} roughness={0.9} />
              ))}
            </group>
          ))}
        </group>
      </Interactive>
      <Interactive label="Card table" kind="card-table" detail="Board games and card sets; the station tournament ladder is pinned alongside." position={at(room, 1.6, 0.2, 0)} labelHeight={1.3}>
        <group>
          <Table p={[0, 0, 0]} w={1.2} d={1.2} tone={INT.wood} />
          <Chair p={[-0.9, 0, 0]} rot={Math.PI / 2} kind="dining" />
          <Chair p={[0.9, 0, 0]} rot={-Math.PI / 2} kind="dining" />
          <Box p={[0, 0.8, 0]} s={[0.4, 0.04, 0.3]} color="#E8EEF4" roughness={0.6} />
          <Box p={[0.1, 0.84, 0.05]} s={[0.12, 0.04, 0.2]} color="#B3402F" roughness={0.7} />
        </group>
      </Interactive>
      <Interactive label="Film and music collection" kind="media-shelf" detail="Disc archive and portable audio for the winter-over crew." position={at(room, room.w / 2 - 0.7, 0.6, 0)} labelHeight={2.0}>
        <group>
          <Box p={[0, 0.9, 0]} s={[0.5, 1.8, 1.4]} color={INT.wallAccent} roughness={0.6} />
          {[0.5, 0.9, 1.3].map((y) => (
            <group key={y}>
              <Box p={[0, y, 0]} s={[0.44, 0.03, 1.3]} color={INT.metal} metalness={0.6} />
              {Array.from({ length: 10 }, (_, j) => (
                <Box key={j} p={[0.05, y + 0.09, -0.6 + j * 0.13]} s={[0.2, 0.16, 0.05]} color={["#4A9EFF", "#3EE07F", "#FFB020"][j % 3]} roughness={0.8} />
              ))}
            </group>
          ))}
        </group>
      </Interactive>
      {Array.from({ length: 3 }, (_, i) => (
        <group key={i} position={at(room, -0.6 + i * 0.9, 1.2, 0)} rotation={[0, Math.PI, 0]}>
          <Figure p={[0, 0, 0]} rot={0} seated role={["engineer", "scientist", "logistics"][i]} />
        </group>
      ))}
      <SpinningFan p={at(room, 1.6, -room.d / 2 + 1.6, 1.4)} />
    </group>
  );
}

function Gym({ room }: { room: RoomDef }) {
  const belt = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (belt.current) belt.current.position.z = (belt.current.position.z + delta * 0.6) % 1.2;
  });
  return (
    <group>
      <Interactive label="Treadmill" kind="treadmill" detail="Running machine with live speed, incline and elapsed time; the belt animates while running." position={at(room, -room.w / 2 + 1.1, -room.d / 4, 0)} labelHeight={1.8}>
        <group>
          <Box p={[0, 0.14, 0]} s={[0.9, 0.3, 2.2]} color={INT.dark} metalness={0.5} roughness={0.5} />
          <mesh ref={belt} position={[0, 0.31, 0]}>
            <boxGeometry args={[0.7, 0.04, 0.9]} />
            <meshStandardMaterial color={INT.rubber} roughness={0.95} />
          </mesh>
          {[-0.35, 0.35].map((x) => (
            <Box key={x} p={[x, 0.85, 1.0]} s={[0.06, 1.1, 0.06]} color={INT.metal} metalness={0.75} />
          ))}
          <Box p={[0, 1.4, 1.0]} s={[0.8, 0.28, 0.1]} color={INT.veryDark} roughness={0.6} />
          <Panel p={[0, 1.4, 0.94]} s={[0.66, 0.2]} tone={INT.screenCyan} intensity={1.1} />
        </group>
      </Interactive>

      <Interactive label="Weight bench" kind="weight-bench" detail="Flat bench with a loaded olympic bar and a pair of adjustable dumbbells." position={at(room, room.w / 4, -room.d / 4, 0)} labelHeight={1.6}>
        <group>
          <Box p={[0, 0.45, 0]} s={[0.4, 0.12, 1.8]} color={INT.dark} roughness={0.7} />
          {[-0.7, 0.7].map((z) => (
            <Box key={z} p={[0, 0.22, z]} s={[0.5, 0.44, 0.1]} color={INT.metal} metalness={0.6} />
          ))}
          <Cyl p={[0, 0.8, 0]} r={0.03} h={2.1} axis="z" color={INT.metal} metalness={0.85} />
          {[-0.95, 0.95].map((z) => (
            <group key={`d${z}`} position={[0, 0.8, z]}>
              <Cyl p={[0, 0, 0]} r={0.22} h={0.16} axis="z" color={INT.rubber} roughness={0.95} />
              <Cyl p={[0, 0, z > 0 ? 0.1 : -0.1]} r={0.22} h={0.16} axis="z" color={INT.rubber} roughness={0.95} />
            </group>
          ))}
          <group position={[1.2, 0, 0.4]}>
            <Cyl p={[0, 0.16, 0]} r={0.07} h={0.3} axis="z" color={INT.steel} metalness={0.8} />
            {[-0.22, 0.22].map((z) => (
              <Cyl key={z} p={[0, 0.16, z]} r={0.14} h={0.2} axis="z" color={INT.rubber} roughness={0.95} />
            ))}
          </group>
        </group>
      </Interactive>

      <Interactive label="Exercise bike" kind="exercise-bike" detail="Stationary bike with a live power readout in watts." position={at(room, -room.w / 2 + 1.2, room.d / 4, 0)} labelHeight={1.7}>
        <group>
          <Box p={[0, 0.2, 0]} s={[0.6, 0.4, 1.2]} color={INT.dark} metalness={0.5} />
          <Spinner speed={4} axis="z">
            <Cyl p={[0, 0.55, -0.35]} r={0.28} h={0.04} axis="z" color={INT.metal} metalness={0.7} seg={12} />
          </Spinner>
          <Box p={[0, 1.05, 0.35]} s={[0.44, 0.1, 0.3]} color={INT.rubber} roughness={0.9} />
          <Cyl p={[0, 0.85, 0.5]} r={0.04} h={0.7} color={INT.metal} metalness={0.75} />
          <Box p={[0, 1.2, 0.55]} s={[0.5, 0.2, 0.1]} color={INT.veryDark} roughness={0.6} />
          <Panel p={[0, 1.2, 0.61]} s={[0.4, 0.14]} tone={INT.screenAmber} intensity={1.0} />
        </group>
      </Interactive>

      <Interactive label="Dumbbell rack" kind="dumbbell-rack" detail="Two-tier rack from four to twenty-four kilograms." position={at(room, room.w / 2 - 0.8, 0.4, 0)} labelHeight={1.6}>
        <group>
          {[0.55, 0.95].map((y, r) => (
            <group key={y}>
              <Box p={[0, y, 0]} s={[0.5, 0.06, 1.6]} color={INT.dark} metalness={0.5} />
              {Array.from({ length: 5 }, (_, i) => (
                <group key={i} position={[0, y + 0.12, -0.6 + i * 0.3]}>
                  <Cyl p={[0, 0, 0]} r={0.1 + i * 0.012} h={0.24} axis="x" color={INT.rubber} roughness={0.95} />
                  <Cyl p={[0, 0, 0.1]} r={0.1 + i * 0.012} h={0.06} axis="x" color={INT.steel} metalness={0.8} />
                </group>
              ))}
            </group>
          ))}
        </group>
      </Interactive>

      <Interactive label="Yoga mats" kind="yoga-mat" detail="Rolled mats and a stretch band for the acclimatisation programme." position={at(room, room.w / 2 - 1.6, -room.d / 2 + 1.0, 0.02)} labelHeight={0.8}>
        <group>
          {[0, 1, 2].map((i) => (
            <Cyl key={i} p={[i * 0.24, 0.06, 0]} r={0.09} h={1.6} axis="z" color={["#3E6B3A", "#5A4A64", "#26506E"][i]} roughness={0.95} />
          ))}
        </group>
      </Interactive>

      <Interactive label="Wall mirror" kind="mirror" detail="Full-height mirror for lift technique checks." position={at(room, room.w / 2 - 0.2, 0, 1.2)}>
        <Box p={[0, 0, 0]} s={[0.06, 1.8, 3.0]} color="#BFD3E0" metalness={0.9} roughness={0.1} />
      </Interactive>

      <Figure p={at(room, -room.w / 4, 0.4, 0)} rot={1.4} role="medical" walking phase={1.2} />
      <WallPlate position={at(room, 0, -room.d / 2 + 0.16, 2.6)} text="ACCLIMATISATION PROGRAMME" tone={INT.trim} width={4.0} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Bathrooms and laundry                                              */
/* ------------------------------------------------------------------ */

function Bathrooms({ room, stalls = 3, showers = 2 }: { room: RoomDef; stalls?: number; showers?: number }) {
  return (
    <group>
      {Array.from({ length: stalls }, (_, i) => (
        <Interactive
          key={i}
          label={`WC cubicle ${i + 1}`}
          kind="wc"
          detail="Cubicle with low-flush cistern; greywater is routed to the treatment plant."
          position={at(room, -room.w / 2 + 0.9 + i * 1.05, -room.d / 2 + 0.9, 0)}
          labelHeight={2.3}
        >
          <Toilet p={[0, 0, 0]} rot={0} />
        </Interactive>
      ))}
      {Array.from({ length: showers }, (_, i) => (
        <Interactive
          key={`s${i}`}
          label={`Shower ${i + 1}`}
          kind="shower"
          detail="Metered shower; water is heated by the recovered thermal loop."
          position={at(room, room.w / 2 - 0.95, -room.d / 2 + 1.0 + i * 1.3, 0)}
          labelHeight={2.4}
        >
          <Shower p={[0, 0, 0]} rot={0} />
        </Interactive>
      ))}
      <Interactive
        label="Wash trough"
        kind="basin"
        detail="Communal wash basins with mirrors and soap dispensers."
        position={at(room, 0, room.d / 2 - 0.7, 0)}
        labelHeight={2.0}
      >
        <WashBasin p={[0, 0, 0]} rot={Math.PI} taps={stalls} />
      </Interactive>
      <Interactive label="Cleaning store" kind="cleaning-store" detail="Mops, buckets, sanitiser and the daily cleaning log." position={at(room, -room.w / 2 + 0.7, room.d / 2 - 0.8, 0)} labelHeight={1.8}>
        <group>
          <Box p={[0, 0.9, 0]} s={[0.8, 1.8, 0.6]} color={INT.wallAccent} roughness={0.7} />
          <Cyl p={[0, 0.6, 0.4]} r={0.04} h={1.2} color={INT.wood} roughness={0.9} />
          <Box p={[0.25, 0.2, 0.4]} s={[0.3, 0.4, 0.3]} color={INT.metal} metalness={0.5} />
        </group>
      </Interactive>
      <Box p={at(room, 0, 0, 0.01)} s={[room.w - 0.4, 0.02, room.d - 0.4]} color="#C7D6E0" roughness={0.35} />
    </group>
  );
}

function Laundry({ room, washers = 2 }: { room: RoomDef; washers?: number }) {
  return (
    <group>
      {Array.from({ length: washers }, (_, i) => (
        <Interactive
          key={i}
          label={`Washing machine ${i + 1}`}
          kind="washer"
          detail="Front-loading machine on a metered circuit; the drum rotates while running."
          position={at(room, -room.w / 2 + 0.8 + i * 0.95, -room.d / 2 + 0.6, 0)}
          labelHeight={1.5}
        >
          <group>
            <Box p={[0, 0.44, 0]} s={[0.85, 0.88, 0.75]} color={INT.ceramic} roughness={0.4} />
            <Cyl p={[0, 0.46, 0.38]} r={0.24} h={0.06} axis="z" color={INT.dark} metalness={0.6} />
            <Spinner speed={3} axis="z">
              <Cyl p={[0, 0.46, 0.41]} r={0.17} h={0.03} axis="z" color={INT.steel} metalness={0.7} seg={10} />
            </Spinner>
            <Box p={[0, 0.94, 0]} s={[0.86, 0.08, 0.76]} color={INT.metal} metalness={0.6} />
            <Panel p={[0, 0.8, 0.39]} s={[0.3, 0.1]} tone={INT.screenCyan} intensity={0.9} />
          </group>
        </Interactive>
      ))}
      {Array.from({ length: 2 }, (_, i) => (
        <Interactive
          key={`d${i}`}
          label={`Dryer ${i + 1}`}
          kind="dryer"
          detail="Tumble dryer with lint trap logged at each cycle."
          position={at(room, -room.w / 2 + 0.8 + i * 0.95, room.d / 2 - 0.7, 0)}
          labelHeight={1.5}
        >
          <group>
            <Box p={[0, 0.44, 0]} s={[0.85, 0.88, 0.75]} color={INT.steel} roughness={0.45} />
            <Cyl p={[0, 0.46, -0.38]} r={0.24} h={0.06} axis="z" color={INT.dark} metalness={0.6} />
            <Panel p={[0, 0.8, -0.39]} s={[0.3, 0.1]} tone={INT.screenAmber} intensity={0.9} />
          </group>
        </Interactive>
      ))}
      <Interactive label="Folding table" kind="folding-table" detail="Folding bench and laundry baskets for sorting." position={at(room, room.w / 4, 0, 0)} labelHeight={1.4}>
        <group>
          <Box p={[0, 0.85, 0]} s={[1.8, 0.08, 0.9]} color={INT.wall} roughness={0.6} />
          {[-0.8, 0.8].map((x) => (
            <Box key={x} p={[x, 0.42, 0]} s={[0.08, 0.85, 0.85]} color={INT.metal} metalness={0.6} />
          ))}
          <Box p={[-0.4, 0.98, 0]} s={[0.4, 0.16, 0.4]} color={INT.fabric} roughness={0.95} />
          <Box p={[0.1, 0.95, 0]} s={[0.35, 0.1, 0.35]} color={INT.fabricAlt} roughness={0.95} />
        </group>
      </Interactive>
      <Interactive label="Detergent shelf" kind="detergent" detail="Detergent, conditioner and sanitiser, dosed to protect the treatment plant." position={at(room, room.w / 2 - 0.5, -room.d / 2 + 0.5, 1.4)} labelHeight={0.6}>
        <group>
          <Box p={[0, 0, 0]} s={[0.8, 0.1, 0.4]} color={INT.metal} metalness={0.6} />
          {[0, 1, 2].map((i) => (
            <Cyl key={i} p={[-0.25 + i * 0.25, 0.2, 0]} r={0.09} h={0.3} color={["#4A9EFF", "#3EE07F", "#FFB020"][i]} roughness={0.6} />
          ))}
        </group>
      </Interactive>
      <Interactive label="Laundry baskets" kind="basket" detail="Segregated baskets for station linen and personal kit." position={at(room, room.w / 2 - 0.7, 0.6, 0)} labelHeight={1.1}>
        <group>
          {[0, 1].map((i) => (
            <Cyl key={i} p={[0, 0.3, -0.4 + i * 0.8]} r={0.28} h={0.6} color={["#26506E", "#5A4A64"][i]} roughness={0.9} />
          ))}
        </group>
      </Interactive>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Sauna and observation lounge                                        */
/* ------------------------------------------------------------------ */

function Sauna({ room }: { room: RoomDef }) {
  return (
    <group>
      {/* Cedar lining */}
      {[-1, 0, 1].map((i) => (
        <Box key={i} p={[room.x - room.w / 2 + 0.09, 1.3, room.z + i * 2.0]} s={[0.06, 2.5, 1.9]} color="#B98A54" roughness={0.85} />
      ))}
      <Box p={[room.x, 1.3, room.z - room.d / 2 + 0.09]} s={[room.w - 0.2, 2.5, 0.06]} color="#B98A54" roughness={0.85} />
      <Box p={[room.x, 1.3, room.z + room.d / 2 - 0.09]} s={[room.w - 0.2, 2.5, 0.06]} color="#B98A54" roughness={0.85} />
      <Box p={[room.x, 0.02, room.z]} s={[room.w - 0.2, 0.04, room.d - 0.2]} color="#C79A62" roughness={0.9} />

      <Interactive label="Tiered bench seating" kind="sauna-bench" detail="Two-level cedar bench with headrests, seating six." position={at(room, -0.4, 0, 0)} labelHeight={2.0}>
        <group>
          {[0.48, 0.95].map((y, i) => (
            <group key={y}>
              <Box p={[i * 0.55, y, 0]} s={[1.7, 0.09, 2.6]} color="#C79A62" roughness={0.85} />
              {[-1.1, 0, 1.1].map((z) => (
                <Box key={z} p={[i * 0.55, y / 2, z]} s={[0.08, y, 0.08]} color="#A87A46" roughness={0.9} />
              ))}
            </group>
          ))}
          {[-0.8, 0, 0.8].map((z) => (
            <Box key={`h${z}`} p={[0.35, 1.12, z]} s={[0.5, 0.12, 0.3]} color="#A87A46" roughness={0.9} />
          ))}
        </group>
      </Interactive>

      <Interactive label="Finnish stove" kind="sauna-stove" detail="Electric stove with volcanic stones; the core glows while heating." position={at(room, room.w / 2 - 0.9, -room.d / 4, 0)} labelHeight={1.6}>
        <group>
          <Box p={[0, 0.45, 0]} s={[0.7, 0.9, 0.7]} color="#3A4550" metalness={0.6} roughness={0.5} />
          <Cyl p={[0, 0.62, 0]} r={0.26} h={0.3} color={INT.red} emissive={INT.red} emissiveIntensity={1.2} />
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[-0.16 + (i % 3) * 0.16, 0.82, -0.16 + Math.floor(i / 3) * 0.16]}>
              <dodecahedronGeometry args={[0.08, 0]} />
              <meshStandardMaterial color="#4A4E52" roughness={0.95} />
            </mesh>
          ))}
          <Cyl p={[0, 1.0, 0.3]} r={0.03} h={0.5} color={INT.metal} metalness={0.8} />
        </group>
      </Interactive>

      <Interactive label="Water bucket and ladle" kind="sauna-bucket" detail="Birch bucket and ladle; water is drawn from the treated store." position={at(room, room.w / 2 - 1.9, room.d / 4, 0)} labelHeight={1.1}>
        <group>
          <Cyl p={[0, 0.18, 0]} r={0.2} h={0.36} color="#8A6A44" roughness={0.9} />
          <Cyl p={[0, 0.36, 0]} r={0.21} h={0.03} color="#A87A46" roughness={0.9} />
          <Cyl p={[0.5, 0.1, 0]} r={0.06} h={0.2} axis="z" color="#C79A62" roughness={0.9} />
        </group>
      </Interactive>

      <Interactive label="Thermometer and hygrometer" kind="sauna-gauge" detail="Cabin temperature and humidity against the 85 degrees and 20 percent envelope." position={at(room, room.w / 2 - 0.11, 0.8, 1.7)}>
        <Box p={[0, 0, 0]} s={[0.28, 0.36, 0.05]} color="#E8EEF4" roughness={0.5} />
        <Label3D position={[0, 0, -0.04]} border={INT.amber} px={0.04} rows={[{ text: "85 C", color: INT.amber }, { text: "18% RH", color: INT.trim }]} />
      </Interactive>

      <group position={at(room, 0.4, 0.4, 0)} rotation={[0, -1.6, 0]}>
        <Figure p={[0, 0, 0]} rot={0} seated role="scientist" />
      </group>
      <Interactive label="Timber door" kind="sauna-door" detail="Glazed door to the shower area, kept closed to hold the heat." position={at(room, -room.w / 2 + 0.2, 0, 1.05)}>
        <Box p={[0, 0, 0]} s={[0.08, 2.1, 0.9]} color="#C79A62" roughness={0.85} />
        <Box p={[0.05, 1.2, 0]} s={[0.03, 0.9, 0.6]} color={INT.glass} opacity={0.35} roughness={0.15} />
      </Interactive>
    </group>
  );
}

function Lounge({ room }: { room: RoomDef }) {
  const auroraRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!auroraRef.current) return;
    const m = auroraRef.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.6 + Math.sin(clock.elapsedTime * 0.5) * 0.25;
  });
  return (
    <group>
      {/* Glazed seaward wall */}
      <Box p={[room.x, 1.35, room.z - room.d / 2 + 0.06]} s={[room.w - 0.2, 2.7, 0.06]} color={INT.glass} opacity={0.28} roughness={0.12} />
      <mesh ref={auroraRef} position={[room.x, 1.4, room.z - room.d / 2 - 0.4]}>
        <planeGeometry args={[room.w - 1.0, 2.0]} />
        <meshStandardMaterial color={INT.trim} emissive={INT.trim} emissiveIntensity={0.7} transparent opacity={0.28} />
      </mesh>
      <Interactive label="Lounge chairs" kind="lounge-chair" detail="Reclining chairs facing the fjord for aurora watching." position={at(room, -0.8, -0.3, 0)} labelHeight={1.4}>
        <group>
          {[-1.1, 0, 1.1].map((x) => (
            <group key={x} position={[x, 0, 0]} rotation={[0, Math.PI, 0]}>
              <Box p={[0, 0.36, 0]} s={[0.8, 0.14, 1.5]} color={INT.fabricAlt} roughness={0.92} />
              <Box p={[0, 0.7, 0.5]} s={[0.8, 0.7, 0.14]} rot={[-0.25, 0, 0]} color={INT.fabricAlt} roughness={0.92} />
              {[-0.3, 0.3].map((z) => (
                <Box key={z} p={[0, 0.18, z]} s={[0.7, 0.36, 0.08]} color={INT.metal} metalness={0.6} />
              ))}
            </group>
          ))}
        </group>
      </Interactive>
      <Interactive label="Telescope" kind="telescope" detail="80 mm refractor on an altazimuth mount for aurora and satellite observation." position={at(room, room.w / 2 - 1.2, 0.4, 0)} labelHeight={1.8}>
        <group>
          {[0, 1, 2].map((i) => (
            <Cyl key={i} p={[Math.cos(i * 2.1) * 0.35, 0.6, Math.sin(i * 2.1) * 0.35]} r={0.03} h={1.2} color={INT.dark} metalness={0.6} />
          ))}
          <Box p={[0, 1.22, 0]} s={[0.2, 0.1, 0.2]} color={INT.dark} metalness={0.7} />
          <Cyl p={[0, 1.34, 0.1]} r={0.09} h={1.0} axis="z" color={INT.steel} metalness={0.7} roughness={0.3} />
          <Cyl p={[0, 1.34, 0.62]} r={0.11} h={0.08} axis="z" color={INT.veryDark} />
          <Box p={[0.18, 1.24, 0.05]} s={[0.12, 0.12, 0.2]} color={INT.dark} metalness={0.6} />
        </group>
      </Interactive>
      <Interactive label="Aurora watch console" kind="watch-console" detail="Magnetometer trace, all-sky camera feed and the aurora forecast for the night watch." position={at(room, 0, room.d / 2 - 0.8, 0)} labelHeight={1.8}>
        <group>
          <Box p={[0, 0.74, 0]} s={[1.8, 0.06, 0.8]} color={INT.deskTop} metalness={0.4} roughness={0.5} />
          <Box p={[0, 1.2, -0.2]} s={[0.9, 0.6, 0.06]} color={INT.veryDark} roughness={0.5} />
          <Panel p={[0, 1.2, -0.16]} s={[0.82, 0.52]} tone="#1E4E6E" intensity={0.9} />
          <Label3D position={[0, 1.2, -0.12]} border={INT.trim} px={0.03} rows={[{ text: "KP 5.2", color: INT.trim }, { text: "AURORA LIKELY", color: INT.green }]} />
          {[-0.78, 0.78].map((x) => (
            <Box key={x} p={[x, 0.37, 0]} s={[0.08, 0.74, 0.75]} color={INT.dark} metalness={0.5} />
          ))}
          <Chair p={[0, 0, 0.9]} rot={Math.PI} kind="task" />
        </group>
      </Interactive>
      {Array.from({ length: 2 }, (_, i) => (
        <group key={i} position={at(room, -0.8 + i * 1.6, -0.3, 0)} rotation={[0, Math.PI, 0]}>
          <Figure p={[0, 0, 0]} rot={0} seated role={["scientist", "operations"][i]} />
        </group>
      ))}
      <WallPlate position={at(room, -room.w / 2 + 1.6, room.d / 2 - 0.16, 2.4)} text="AURORA WATCH 2200 - 0400" tone={INT.trim} width={3.4} />
      <Plant p={at(room, -room.w / 2 + 0.8, -0.9, 0)} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

/** Furnish a living-deck room according to its plan kind. */
export function LivingRoomContents({ room }: { room: RoomDef }) {
  switch (room.kind) {
    case "living":
      return <LivingQuarters room={room} />;
    case "dormitory":
      return <Dormitory room={room} beds={room.w > 10 ? 6 : 4} />;
    case "galley":
      return <Galley room={room} burners={room.w > 11 ? 8 : 6} />;
    case "dining":
      return <DiningMess room={room} tables={room.w > 12 ? 8 : 4} />;
    case "recreation":
      return <Recreation room={room} />;
    case "gym":
      return <Gym room={room} />;
    case "bathroom":
      return <Bathrooms room={room} stalls={room.w > 7 ? 4 : 3} showers={room.w > 7 ? 3 : 2} />;
    case "laundry":
      return <Laundry room={room} washers={room.w > 4 ? 3 : 2} />;
    case "sauna":
      return <Sauna room={room} />;
    case "lounge":
      return <Lounge room={room} />;
    default:
      return null;
  }
}

export { BenchSeat, Locker, WallScreen };
