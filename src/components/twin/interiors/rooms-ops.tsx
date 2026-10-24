import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Label3D } from "../twin-primitives";
import {
  Bunk,
  CabinetUnit,
  Chair,
  Crate,
  Extinguisher,
  Figure,
  Locker,
  Monitor,
  PipeRun,
  RackUnit,
  Table,
  Toilet,
  WallClock,
  WallScreen,
  WashBasin,
  WorkstationDesk,
} from "./furniture";
import { Box, Cyl, INT, Interactive, Panel, Spinner, StairFlight, WallPlate } from "./kit";
import type { RoomDef } from "./plan-types";

/**
 * Operational rooms.
 *
 * Each room is furnished with the equipment it actually contains, and every
 * significant object is wrapped in `Interactive` so a click opens its live
 * detail panel. Positions are absolute plan coordinates so the room shell,
 * the generated walls and the contents agree on one layout.
 */

/** Absolute placement helper: local offset from the room centre. */
const at = (room: RoomDef, dx: number, dz: number, y = 0): [number, number, number] => [
  room.x + dx,
  y,
  room.z + dz,
];

/** A room's back wall is furthest from its door. */
function backZ(room: RoomDef): number {
  const side = room.doors[0]?.side ?? "s";
  return side === "s" ? -room.d / 2 + 0.6 : side === "n" ? room.d / 2 - 0.6 : 0;
}

/* ------------------------------------------------------------------ */
/* 1. Entrance vestibule                                               */
/* ------------------------------------------------------------------ */

function Vestibule({ room }: { room: RoomDef }) {
  return (
    <group>
      <Interactive label="Boot scraping mat" kind="mat" detail="Removes drifted snow before the inner door so meltwater never reaches the deck." position={at(room, 0.2, 0, 0.02)}>
        <Box p={[0, 0.012, 0]} s={[2.4, 0.02, 1.6]} color="#2E3A44" roughness={0.95} />
        <Box p={[0, 0.02, 0]} s={[2.3, 0.01, 1.5]} color={INT.rubber} roughness={0.98} />
      </Interactive>
      <BenchSeatBlock room={room} />
      <Interactive label="Airlock pressure gauge" kind="gauge" detail="Inner and outer door seal pressures, checked before each airlock cycle." position={at(room, 1.5, -1.4, 1.5)}>
        <Box p={[0, 0, 0]} s={[0.34, 0.24, 0.05]} color="#E8EEF4" roughness={0.4} />
        <Panel p={[0, 0, 0.03]} s={[0.24, 0.14]} tone={INT.trim} intensity={1.1} />
      </Interactive>
      <Crate p={at(room, -1.2, 1.1, 0)} s={[0.5, 0.44, 0.5]} tone="#26506E" />
      <WallPlate position={at(room, -0.1, -1.55, 2.2)} text="AIRLOCK PROCEDURE  2 PERSON" tone={INT.amber} width={2.6} />
    </group>
  );
}

/** Coat rail with twelve expedition parkas, used in both vestibules. */
function BenchSeatBlock({ room }: { room: RoomDef }) {
  return (
    <Interactive
      label="Gear bench and parka rail"
      kind="bench"
      detail="Twelve expedition parkas, over-trousers and boots, one per winter-over crew member."
      position={at(room, 0, -1.05, 0)}
      labelHeight={2.4}
    >
      <group>
        <Box p={[0, 0.44, 0]} s={[2.6, 0.08, 0.44]} color={INT.wood} roughness={0.8} />
        <Box p={[0, 0.22, 0]} s={[2.6, 0.06, 0.32]} color={INT.woodDark} roughness={0.85} />
        {[-1.1, 0, 1.1].map((x) => (
          <Box key={x} p={[x, 0.21, 0]} s={[0.12, 0.42, 0.38]} color={INT.dark} metalness={0.5} />
        ))}
        <Box p={[0, 2.1, -0.4]} s={[2.6, 0.08, 0.08]} color={INT.steel} metalness={0.8} roughness={0.3} />
        {Array.from({ length: 12 }, (_, i) => {
          const x = -1.15 + (2.3 / 11) * i;
          return (
            <group key={i} position={[x, 1.98, -0.36]}>
              <Cyl p={[0, -0.05, 0]} r={0.014} h={0.12} color={INT.steel} metalness={0.8} />
              <Box p={[0, -0.42, -0.05]} s={[0.3, 0.74, 0.18]} color={["#B3402F", "#27415C", "#D8A017"][i % 3]} roughness={0.9} />
              <Box p={[0, -0.86, -0.04]} s={[0.24, 0.36, 0.16]} color={INT.dark} roughness={0.9} />
              <Box p={[0, -0.34, 0.05]} s={[0.28, 0.05, 0.02]} color={INT.trim} emissive={INT.trim} emissiveIntensity={0.6} />
            </group>
          );
        })}
        {[-0.9, 0.9].map((x) => (
          <group key={`b${x}`} position={[x, 0.14, 0.55]}>
            <Box p={[0, 0.02, 0]} s={[0.4, 0.3, 0.7]} color={INT.dark} roughness={0.9} />
          </group>
        ))}
      </group>
    </Interactive>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Command centre                                                   */
/* ------------------------------------------------------------------ */

function CommandCentre({ room, extra = 6 }: { room: RoomDef; extra?: number }) {
  const rows = useMemo(() => {
    const half = Math.ceil(extra / 2);
    return Array.from({ length: extra }, (_, i) => {
      const row = i < half ? 0 : 1;
      const col = i < half ? i : i - half;
      const per = Math.max(1, row === 0 ? half : extra - half);
      const span = room.w - 2.4;
      return {
        x: -span / 2 + (span / Math.max(1, per - 1 || 1)) * col,
        z: row === 0 ? -room.d / 2 + 1.6 : -room.d / 2 + 3.9,
        rot: row === 0 ? 0 : 0,
      };
    });
  }, [extra, room.w, room.d]);

  const rowsFor = (i: number) => [
    { text: `CONSOLE ${i + 1}`, color: INT.trim },
    { text: "PWR  GEN ONLINE", color: INT.green },
    { text: "LINK  VSAT 62%", color: INT.screenAmber },
    { text: "TEMP  +18.4C", color: INT.trim },
  ];

  return (
    <group>
      {rows.map((r, i) => (
        <Interactive
          key={i}
          label={`Operator console ${i + 1}`}
          kind="console"
          detail="Twin monitor console with live power, link and life-support channels."
          position={at(room, r.x, r.z, 0)}
          labelHeight={1.9}
        >
          <WorkstationDesk p={[0, 0, 0]} rot={r.rot} rows={rowsFor(i)} />
        </Interactive>
      ))}

      <Interactive
        label="Antarctic wall map"
        kind="wall-screen"
        detail="Station positions across Dronning Maud Land and the Larsemann Hills, with the 3,098 km separation marked."
        position={at(room, 0, backZ(room) - 0.2, 2.1)}
      >
        <WallScreen p={[0, 0, 0]} w={4.4} h={2.0} tone="#12324A" />
        <Label3D
          position={[0, 0.9, 0.12]}
          border={INT.trim}
          px={0.055}
          rows={[
            { text: "ANTARCTIC OPERATIONS", color: INT.trim },
            { text: "MAITRI -70.7644 11.7342", color: INT.screenBlue },
            { text: "BHARATI -69.4114 76.1875", color: INT.screenBlue },
            { text: "3,098 KM SEPARATION", color: INT.amber },
          ]}
        />
      </Interactive>

      <Interactive
        label="Mission whiteboard"
        kind="whiteboard"
        detail="Daily tasking, field party movements and outstanding maintenance."
        position={at(room, room.w / 2 - 2.4, backZ(room) - 0.2, 1.9)}
      >
        <Box p={[0, 0, 0]} s={[2.6, 1.5, 0.06]} color="#E8EEF4" roughness={0.55} />
        <Label3D
          position={[0, 0, 0.06]}
          border={INT.trim}
          px={0.05}
          rows={[
            { text: "TODAY", color: INT.dark },
            { text: "0600 MET BALLOON", color: INT.dark },
            { text: "0930 LAKE ICE SURVEY", color: INT.dark },
            { text: "1400 TRACE HEAT CHECK", color: INT.dark },
            { text: "1800 AIRLOCK DRILL", color: INT.dark },
          ]}
        />
      </Interactive>

      <Interactive
        label="Coffee station"
        kind="coffee"
        detail="Filter machine and hot water urn, restocked from the dry stores."
        position={at(room, -room.w / 2 + 1.4, room.d / 2 - 1.0, 0)}
      >
        <CabinetUnit p={[0, 0, 0]} w={1.5} h={0.92} d={0.55} doors={2} tone={INT.steel} />
        <Cyl p={[-0.4, 1.05, 0]} r={0.16} h={0.3} color={INT.dark} metalness={0.6} />
        <Box p={[0.3, 0.98, 0]} s={[0.34, 0.14, 0.24]} color={INT.steel} metalness={0.7} />
        {[-0.1, 0.14, 0.38].map((x) => (
          <Cyl key={x} p={[x, 1.02, 0.24]} r={0.045} h={0.1} color="#E8EEF4" roughness={0.4} />
        ))}
      </Interactive>

      <TwinAdminDesk room={room} />

      <WallClock p={at(room, room.w / 2 - 0.6, 0, 2.4)} rot={-Math.PI / 2} />
      <WallClock p={at(room, room.w / 2 - 0.6, 1.2, 2.4)} rot={-Math.PI / 2} utc={false} />
      <PipeRun from={at(room, -room.w / 2 + 0.3, -room.d / 2 + 0.3, 2.9)} to={at(room, room.w / 2 - 0.3, -room.d / 2 + 0.3, 2.9)} tone={INT.amber} clamps={5} />
      <Extinguisher p={at(room, room.w / 2 - 0.8, room.d / 2 - 0.4, 0)} rot={Math.PI} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Communication room                                               */
/* ------------------------------------------------------------------ */

function CommsRoom({ room }: { room: RoomDef }) {
  return (
    <group>
      <Interactive
        label="Satellite modem rack"
        kind="modem-rack"
        detail="VSAT and Iridium modems with per-channel carrier and link-state LEDs."
        position={at(room, -room.w / 2 + 0.9, backZ(room) + 0.4, 0)}
        labelHeight={2.2}
      >
        <CabinetUnit p={[0, 0, 0]} w={1.1} h={1.9} d={0.6} doors={2} tone={INT.wallAccent} />
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i} position={[0, 0.35 + i * 0.26, 0.32]}>
            <Box p={[0, 0, 0]} s={[0.9, 0.2, 0.04]} color={INT.dark} roughness={0.6} />
            {[-0.3, -0.1, 0.1, 0.3].map((x, j) => (
              <Led key={j} p={[x, 0.04, 0.03]} tone={[INT.green, INT.green, INT.screenAmber, INT.trim][j]} />
            ))}
          </group>
        ))}
      </Interactive>

      <Interactive
        label="Radio console"
        kind="radio-console"
        detail="HF and VHF transceiver with microphone, keypad and channel presets."
        position={at(room, -0.6, -0.4, 0)}
        labelHeight={1.6}
      >
        <Table p={[0, 0, 0]} w={1.9} d={0.9} tone={INT.deskTop} />
        <Box p={[0, 0.86, -0.15]} s={[0.8, 0.28, 0.4]} color={INT.dark} roughness={0.6} />
        <Panel p={[0, 0.9, 0.06]} s={[0.5, 0.14]} tone={INT.screenAmber} intensity={1.2} />
        <Cyl p={[0.7, 0.85, 0.06]} r={0.03} h={0.26} axis="z" color={INT.dark} metalness={0.6} />
        <Box p={[0.7, 0.83, -0.16]} s={[0.08, 0.08, 0.08]} color={INT.veryDark} />
        <Chair p={[0.2, 0, 0.95]} rot={Math.PI} kind="task" />
        <Figure p={[0.2, 0, 0.95]} rot={Math.PI} seated role="operations" />
      </Interactive>

      <Interactive label="Iridium backup phone" kind="satellite-phone" detail="Short-burst data fallback: 340 bytes mobile-originated, 270 bytes mobile-terminated." position={at(room, room.w / 2 - 1.1, -0.2, 0.78)}>
        <Box p={[0, 0, 0]} s={[0.22, 0.1, 0.34]} color={INT.dark} roughness={0.6} />
        <Box p={[0, 0.06, -0.14]} s={[0.2, 0.06, 0.08]} color={INT.steel} metalness={0.7} />
        <Cyl p={[0.14, 0.1, 0.1]} r={0.008} h={0.24} color={INT.dark} metalness={0.6} />
      </Interactive>
      <CabinetUnit p={at(room, room.w / 2 - 1.1, -0.2, 0)} w={1.2} h={0.74} d={0.5} doors={1} tone={INT.wall} label="Desk" />

      <Interactive label="Frequency allocation chart" kind="wall-chart" detail="Allocated HF, VHF and satellite channels with the 6 minutes per month summer airtime limit." position={at(room, room.w / 2 - 0.9, 1.4, 1.9)}>
        <Box p={[0, 0, 0]} s={[1.1, 0.8, 0.04]} color="#E8EEF4" roughness={0.6} />
        <Label3D
          position={[0, 0, 0.04]}
          border={INT.trim}
          px={0.04}
          rows={[
            { text: "HF 8.215 MHz", color: INT.dark },
            { text: "VHF 156.8 MHz", color: INT.dark },
            { text: "VSAT Ku-BAND", color: INT.dark },
            { text: "IRIDIUM SBD", color: INT.dark },
          ]}
        />
      </Interactive>
      <Extinguisher p={at(room, -room.w / 2 + 0.5, room.d / 2 - 0.4, 0)} rot={Math.PI} />
    </group>
  );
}

/** Blinking status LED. */
function Led({ p, tone }: { p: [number, number, number]; tone: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.4 + Math.abs(Math.sin(clock.elapsedTime * (2 + p[0] * 6))) * 1.8;
  });
  return (
    <mesh ref={ref} position={p}>
      <sphereGeometry args={[0.026, 8, 8]} />
      <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={1} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Server room                                                      */
/* ------------------------------------------------------------------ */

function ServerRoom({ room, racks = 4 }: { room: RoomDef; racks?: number }) {
  const spread = (room.w - 1.6) / racks;
  return (
    <group>
      {Array.from({ length: racks }, (_, i) => (
        <Interactive
          key={i}
          label={`Server rack ${i + 1}`}
          kind="server-rack"
          detail="Telemetry ingest, historian and twin state store with cooling monitoring."
          position={at(room, -room.w / 2 + 0.9 + spread * i, backZ(room) + 0.5, 0)}
          labelHeight={2.3}
        >
          <group>
            <CabinetUnit p={[0, 0, 0]} w={0.78} h={2.05} d={0.9} doors={2} tone="#1B242E" />
            {Array.from({ length: 8 }, (_, j) => (
              <group key={j} position={[0, 0.28 + j * 0.22, 0.48]}>
                <Box p={[0, 0, 0]} s={[0.68, 0.16, 0.03]} color="#232E3A" roughness={0.6} />
                <Spinner speed={9 + j} axis="z">
                  <Cyl p={[0, 0, 0.03]} r={0.05} h={0.02} axis="z" color={INT.metal} metalness={0.7} seg={8} />
                </Spinner>
                <Led p={[-0.26, 0.04, 0.04]} tone={INT.screenBlue} />
                <Led p={[-0.18, 0.04, 0.04]} tone={INT.green} />
                <Led p={[0.28, 0.04, 0.04]} tone={INT.screenAmber} />
              </group>
            ))}
          </group>
        </Interactive>
      ))}

      <Interactive label="Ceiling cooling unit" kind="cooling-unit" detail="Split cooling with fan-coil airflow across the cold aisle; set point 18 degrees." position={at(room, 0, 0, 2.75)} labelHeight={0.9}>
        <Box p={[0, 0, 0]} s={[1.8, 0.42, 0.9]} color={INT.steel} metalness={0.6} roughness={0.4} />
        <Spinner speed={5}>
          <Cyl p={[0, -0.24, 0]} r={0.3} h={0.04} axis="y" color={INT.metal} metalness={0.7} seg={10} />
        </Spinner>
      </Interactive>

      <Interactive label="Room temperature gauge" kind="gauge" detail="Cold aisle temperature against the 18 to 24 degree band." position={at(room, room.w / 2 - 0.11, 0, 1.6)}>
        <Box p={[0, 0, 0]} s={[0.3, 0.24, 0.05]} color="#E8EEF4" roughness={0.4} />
        <Label3D position={[0, 0, 0.05]} border={INT.green} px={0.05} rows={[{ text: "18.0 C", color: INT.green }]} />
      </Interactive>

      <Interactive label="Emergency shutoff" kind="e-stop" detail="Cuts rack power and starts an orderly historian flush before shutdown." position={at(room, -room.w / 2 + 0.4, room.d / 2 - 0.9, 1.3)} labelHeight={0.6}>
        <Box p={[0, 0, 0]} s={[0.34, 0.3, 0.12]} color="#C4262E" roughness={0.6} />
        <Cyl p={[0, 0, 0.09]} r={0.1} h={0.06} axis="z" color="#FF6A6A" emissive={INT.red} emissiveIntensity={0.9} />
      </Interactive>

      <PipeRun from={at(room, -room.w / 2 + 0.3, -room.d / 2 + 0.3, 2.9)} to={at(room, room.w / 2 - 0.3, -room.d / 2 + 0.3, 2.9)} tone={INT.screenBlue} clamps={4} />
      <Extinguisher p={at(room, room.w / 2 - 0.5, room.d / 2 - 0.4, 0)} rot={Math.PI} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Generator room                                                   */
/* ------------------------------------------------------------------ */

/** Fully modelled diesel generator set. */
function GeneratorUnit({
  p,
  rot = 0,
  label,
  tag,
  on,
}: {
  p: [number, number, number];
  rot?: number;
  label: string;
  tag: string;
  on: boolean;
}) {
  const fan = useRef<THREE.Group>(null);
  const block = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (fan.current && on) fan.current.rotation.z += delta * 12;
    if (block.current) {
      block.current.position.y = on ? Math.sin(clock.elapsedTime * 18) * 0.012 : 0;
    }
  });
  return (
    <Interactive label={label} kind="generator" tag={tag} detail="Diesel generating set: engine block, injector lines, exhaust manifold, cooling fan and analogue control panel." position={p} rotation={[0, rot, 0]} labelHeight={2.5}>
      <group>
        {/* Base frame and anti-vibration mounts */}
        <Box p={[0, 0.14, 0]} s={[3.7, 0.28, 1.9]} color={INT.dark} metalness={0.5} roughness={0.6} />
        {[-1.6, -0.55, 0.55, 1.6].map((x) => (
          <Cyl key={x} p={[x, 0.05, 0]} r={0.11} h={0.1} color={INT.rubber} roughness={0.95} />
        ))}
        <group ref={block}>
          {/* Engine block */}
          <Box p={[-0.3, 0.95, 0]} s={[2.4, 1.2, 1.5]} color="#5B6670" metalness={0.55} roughness={0.45} />
          {/* Cylinder head cover */}
          <Box p={[-0.3, 1.62, 0]} s={[2.2, 0.22, 1.3]} color="#6E7A85" metalness={0.5} roughness={0.45} />
          {/* Six injector lines */}
          {Array.from({ length: 6 }, (_, i) => (
            <Cyl key={i} p={[-1.35 + i * 0.42, 1.5, 0.78]} r={0.028} h={0.62} axis="z" color={INT.steel} metalness={0.85} roughness={0.25} />
          ))}
          {/* Exhaust manifold and stack */}
          <Cyl p={[-0.3, 1.5, -0.86]} r={0.16} h={2.35} axis="x" color="#8A949E" metalness={0.8} roughness={0.3} />
          <Cyl p={[1.35, 1.95, -0.6]} r={0.14} h={1.9} color={INT.pole} metalness={0.75} roughness={0.35} />
          <Cyl p={[1.35, 2.9, -0.6]} r={0.18} h={0.12} color={INT.dark} metalness={0.7} />
          {/* Radiator and cooling fan */}
          <Box p={[1.35, 1.0, 0.15]} s={[0.5, 1.5, 1.4]} color="#4C5761" metalness={0.5} roughness={0.5} />
          <group position={[1.62, 1.0, 0.15]}>
            <group ref={fan}>
              {Array.from({ length: 7 }, (_, i) => (
                <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 7]}>
                  <boxGeometry args={[0.62, 0.14, 0.03]} />
                  <meshStandardMaterial color={INT.metal} metalness={0.7} roughness={0.4} />
                </mesh>
              ))}
            </group>
          </group>
          {/* Fuel filter and oil lines */}
          <Cyl p={[-1.5, 0.9, 0.5]} r={0.13} h={0.5} color={INT.amber} metalness={0.4} roughness={0.5} />
          <Cyl p={[-1.5, 0.55, -0.4]} r={0.12} h={0.4} color={INT.dark} metalness={0.5} roughness={0.5} />
          {/* Control panel with analogue gauges */}
          <group position={[-1.98, 1.0, 0]}>
            <Box p={[0, 0, 0]} s={[0.24, 1.2, 1.4]} color="#2B3540" metalness={0.5} roughness={0.5} />
            {[0.4, 0.1, -0.2, -0.5].map((y, i) => (
              <group key={i} position={[-0.14, y, 0.25 - i * 0.24]}>
                <Cyl p={[0, 0, 0.02]} r={0.09} h={0.05} axis="x" color={INT.ceramic} roughness={0.4} />
                <Panel p={[-0.03, 0, 0]} s={[0.11, 0.11]} rot={[0, -Math.PI / 2, 0]} tone={i === 0 ? INT.green : INT.screenAmber} intensity={1.0} />
              </group>
            ))}
            <Box p={[-0.16, 0.62, 0.5]} s={[0.06, 0.16, 0.16]} color={INT.dark} roughness={0.6} />
            <Led p={[-0.2, 0.78, 0.5]} tone={on ? INT.green : INT.red} />
          </group>
        </group>
        {/* Fuel line dropping from the ceiling */}
        <Cyl p={[-1.2, 2.2, 1.0]} r={0.09} h={1.3} color={INT.red} metalness={0.6} roughness={0.4} />
        <Cyl p={[-1.2, 2.8, 0.6]} r={0.09} h={0.9} axis="z" color={INT.red} metalness={0.6} roughness={0.4} />
        {/* Drip tray */}
        <Box p={[0, 0.02, 0]} s={[3.9, 0.04, 2.1]} color="#2A323A" metalness={0.4} roughness={0.7} />
      </group>
    </Interactive>
  );
}

function GeneratorRoom({ room }: { room: RoomDef }) {
  const gens = room.w > 9 ? 2 : 1;
  return (
    <group>
      {Array.from({ length: gens }, (_, i) => (
        <GeneratorUnit
          key={i}
          p={at(room, 0, -room.d / 4 + i * (room.d / 2.2), 0)}
          label={`Generator G-${i + 1}`}
          tag={i === 0 ? "GEN-1" : "GEN-2"}
          on={i === 0}
        />
      ))}
      <Interactive label="Fuel day tank" kind="day-tank" detail="Day tank feeding the injector rail, refilled from the bulk farm on a level signal." position={at(room, -room.w / 2 + 0.8, room.d / 2 - 0.7, 0)} labelHeight={1.7}>
        <Cyl p={[0, 0.62, 0]} r={0.42} h={1.24} color={INT.red} metalness={0.4} roughness={0.5} />
        <Cyl p={[0, 1.3, 0]} r={0.44} h={0.06} color={INT.dark} metalness={0.6} />
        <Box p={[0.42, 0.9, 0]} s={[0.06, 0.6, 0.06]} color={INT.steel} metalness={0.8} />
      </Interactive>
      <Interactive label="Tool chest" kind="tool-chest" detail="General spanner and filter set for routine service on the four sets." position={at(room, room.w / 2 - 0.9, room.d / 2 - 0.6, 0)} labelHeight={1.2}>
        <Box p={[0, 0.35, 0]} s={[1.3, 0.7, 0.6]} color={INT.red} roughness={0.55} />
        <Box p={[0, 0.74, 0]} s={[1.32, 0.08, 0.62]} color={INT.dark} metalness={0.6} />
        {[-0.35, 0.35].map((x) => (
          <Box key={x} p={[x, 0.35, 0.31]} s={[0.3, 0.06, 0.02]} color={INT.steel} metalness={0.8} />
        ))}
      </Interactive>
      <Interactive label="Oil stains and bund" kind="bund" detail="Bunded floor with historic oil staining, inspected against the environmental plan." position={at(room, 0.6, 0, 0.02)} labelHeight={0.9}>
        <Box p={[0, 0.01, 0]} s={[2.4, 0.02, 1.6]} color="#2A2622" roughness={0.95} />
        <Box p={[0.4, 0.015, -0.3]} s={[1.1, 0.01, 0.7]} color="#241F1B" roughness={0.95} />
      </Interactive>
      <Extinguisher p={at(room, room.w / 2 - 0.4, -room.d / 2 + 0.5, 0)} />
      <WallPlate position={at(room, 0, -room.d / 2 + 0.16, 2.4)} text="FIRE POINT  CO2  GENERATOR HALL" tone={INT.red} width={3.4} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Water treatment room                                             */
/* ------------------------------------------------------------------ */

function WaterTreatmentRoom({ room, stations = 1 }: { room: RoomDef; stations?: number }) {
  return (
    <group>
      <Interactive
        label="Reverse osmosis plant"
        kind="ro-plant"
        detail="Three-stage RO with pre-filter, carbon block and membrane vessels, feeding the UV steriliser."
        position={at(room, -room.w / 4, backZ(room) + 0.9, 0)}
        labelHeight={2.4}
      >
        <Box p={[0, 0.75, 0]} s={[1.5, 1.5, 0.7]} color={INT.steel} metalness={0.55} roughness={0.45} />
        {[-0.42, 0, 0.42].map((x) => (
          <Cyl key={x} p={[x, 0.85, 0.44]} r={0.15} h={1.1} color="#C7D2DA" metalness={0.5} roughness={0.4} />
        ))}
        <Box p={[0, 1.55, 0]} s={[1.5, 0.12, 0.7]} color={INT.dark} metalness={0.6} />
        <Box p={[0, 1.1, 0.42]} s={[0.7, 0.3, 0.12]} color={INT.dark} roughness={0.6} />
        <Panel p={[0, 1.1, 0.49]} s={[0.6, 0.22]} tone={INT.screenCyan} intensity={1.1} />
        <Box p={[0, 0.02, 0.5]} s={[1.7, 0.05, 0.5]} color="#2A323A" metalness={0.4} />
      </Interactive>

      {Array.from({ length: stations === 1 ? 3 : 5 }, (_, i) => (
        <Interactive
          key={i}
          label={`Storage tank ${i + 1}`}
          kind="water-tank"
          detail="Treated water storage with level indication; feeds the galley and washrooms."
          position={at(room, room.w / 2 - 0.9 - (i % 2) * 0.0, backZ(room) + 0.9 + i * 0.95, 0)}
          labelHeight={2.0}
        >
          <Cyl p={[0, 0.72, 0]} r={0.4} h={1.44} color="#DDE7EE" metalness={0.35} roughness={0.5} />
          <Cyl p={[0, 1.46, 0]} r={0.42} h={0.08} color={INT.steel} metalness={0.6} />
          <Box p={[0.4, 0.72, 0]} s={[0.04, 1.2, 0.04]} color={INT.steel} metalness={0.8} />
          <Panel p={[0, 0.72, 0.41]} s={[0.1, 0.9]} tone={INT.screenBlue} intensity={0.7} />
        </Interactive>
      ))}

      <Interactive label="UV steriliser" kind="uv-steriliser" detail="In-line ultraviolet chamber downstream of the membranes, dosed on flow." position={at(room, -room.w / 2 + 1.0, room.d / 2 - 0.9, 1.1)} labelHeight={0.9}>
        <Cyl p={[0, 0, 0]} r={0.14} h={1.2} axis="z" color="#7FD8FF" emissive="#7FD8FF" emissiveIntensity={0.7} metalness={0.5} />
        <Box p={[0, 0, 0]} s={[0.3, 0.3, 0.3]} color={INT.dark} metalness={0.6} />
      </Interactive>

      <Interactive label="Flow meter panel" kind="flow-panel" detail="Treated water flow, recovery ratio and conductivity, logged to the historian." position={at(room, -room.w / 2 + 0.14, 0.6, 1.6)}>
        <Box p={[0, 0, 0]} s={[0.34, 0.5, 0.05]} color={INT.veryDark} roughness={0.6} />
        <Label3D position={[0, 0.1, 0.05]} border={INT.trim} px={0.045} rows={[{ text: "12 L/MIN", color: INT.trim }, { text: "REC 68%", color: INT.screenBlue }]} />
      </Interactive>

      <PipeRun from={at(room, -room.w / 2 + 0.3, -room.d / 2 + 0.3, 2.7)} to={at(room, room.w / 2 - 0.3, -room.d / 2 + 0.3, 2.7)} tone={INT.trim} clamps={4} />
      <PipeRun from={at(room, room.w / 2 - 0.3, -room.d / 2 + 0.3, 2.7)} to={at(room, room.w / 2 - 0.3, room.d / 2 - 0.3, 1.1)} tone={INT.screenBlue} clamps={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Medical bay                                                      */
/* ------------------------------------------------------------------ */

/** Hospital bed with frame, mattress, rails and monitor. */
function HospitalBed({ p, rot = 0, label }: { p: [number, number, number]; rot?: number; label: string }) {
  return (
    <Interactive label={label} kind="hospital-bed" detail="Adjustable bed with side rails, IV pole and bedside monitoring." position={p} rotation={[0, rot, 0]} labelHeight={1.5}>
      <group>
        <Box p={[0, 0.42, 0]} s={[2.0, 0.12, 0.9]} color={INT.steel} metalness={0.6} roughness={0.4} />
        <Box p={[0, 0.54, 0]} s={[1.9, 0.14, 0.84]} color={INT.ceramic} roughness={0.85} />
        <Box p={[0, 0.63, -0.3]} s={[0.5, 0.1, 0.28]} color="#E8EEF4" roughness={0.95} />
        <Box p={[0, 0.63, 0.3]} s={[1.2, 0.08, 0.78]} color="#7FB4E8" roughness={0.9} />
        {[-0.95, 0.95].map((z) => (
          <Box key={z} p={[0, 0.6, z]} s={[2.0, 0.9, 0.06]} color={INT.steel} metalness={0.7} roughness={0.35} />
        ))}
        <Box p={[-0.92, 0.65, 0]} s={[0.06, 0.5, 0.9]} color={INT.ceramic} roughness={0.5} />
        <Box p={[0.92, 0.65, 0]} s={[0.06, 0.5, 0.9]} color={INT.ceramic} roughness={0.5} />
        {[[-0.9, -0.42], [0.9, -0.42], [-0.9, 0.42], [0.9, 0.42]].map(([x, z]) => (
          <Cyl key={`${x}-${z}`} p={[x, 0.2, z]} r={0.035} h={0.4} color={INT.dark} metalness={0.6} />
        ))}
        <Cyl p={[-1.05, 0.9, -0.4]} r={0.03} h={1.8} color={INT.metal} metalness={0.8} />
        <Box p={[-1.05, 1.8, -0.4]} s={[0.2, 0.3, 0.2]} color={INT.ceramic} roughness={0.4} />
      </group>
    </Interactive>
  );
}

function MedicalBay({ room, beds = 3 }: { room: RoomDef; beds?: number }) {
  return (
    <group>
      {Array.from({ length: beds }, (_, i) => (
        <group key={i}>
          <HospitalBed
            p={at(room, -room.w / 2 + 1.4, -room.d / 2 + 1.4 + i * 2.3, 0)}
            label={`Bed ${i + 1}`}
          />
          {i < beds - 1 && (
            <Box p={at(room, 0.2, -room.d / 2 + 2.55 + i * 2.3, 1.3)} s={[2.4, 1.8, 0.04]} color="#9FB6C9" opacity={0.35} roughness={0.7} />
          )}
        </group>
      ))}

      <Interactive label="Medical cabinet" kind="medical-cabinet" detail="Glass-fronted supplies cabinet: dressings, analgesia, sutures, sterilising fluids." position={at(room, room.w / 2 - 0.8, backZ(room) + 0.5, 0)} labelHeight={2.1}>
        <CabinetUnit p={[0, 0, 0]} w={1.2} h={1.9} d={0.5} doors={2} tone={INT.ceramic} glass />
        {[0.5, 0.9, 1.3].map((y, i) => (
          <Box key={i} p={[0, y, 0.14]} s={[1.0, 0.05, 0.32]} color="#E8EEF4" roughness={0.6} />
        ))}
        {[0.56, 0.68, 0.96, 1.36].map((y, i) => (
          <Box key={`s${i}`} p={[-0.2 + i * 0.14, y, 0.2]} s={[0.14, 0.16, 0.14]} color={["#D8DEE4", "#B3402F", "#D8A017", "#7FB4E8"][i]} roughness={0.6} />
        ))}
      </Interactive>

      <Interactive label="X-ray unit" kind="xray" detail="Mobile analogue radiography unit with lead apron and film processor." position={at(room, -room.w / 2 + 0.9, room.d / 2 - 1.2, 0)} labelHeight={1.9}>
        <Box p={[0, 0.3, 0]} s={[0.8, 0.6, 0.6]} color={INT.steel} metalness={0.5} roughness={0.5} />
        <Cyl p={[0, 1.0, 0]} r={0.07} h={1.4} color={INT.metal} metalness={0.7} />
        <Box p={[0.3, 1.75, 0]} s={[0.7, 0.7, 0.12]} color={INT.veryDark} roughness={0.5} />
        <Cyl p={[-0.3, 0.35, 0.32]} r={0.14} h={0.1} axis="z" color={INT.dark} metalness={0.6} />
      </Interactive>

      <Interactive label="Clinical sink" kind="sink" detail="Hand wash station with elbow taps and medical soap dispenser." position={at(room, room.w / 2 - 1.6, room.d / 2 - 0.7, 0)}>
        <WashBasin p={[0, 0, 0]} rot={Math.PI} taps={1} />
      </Interactive>

      <Interactive label="Ultrasound machine" kind="ultrasound" detail="Portable scanner used for remote consultation with the mainland hospital." position={at(room, room.w / 2 - 0.7, 0.6, 0)} labelHeight={1.6}>
        <Box p={[0, 0.7, 0]} s={[0.5, 0.5, 0.4]} color={INT.ceramic} roughness={0.5} />
        <Panel p={[0, 0.86, 0.21]} s={[0.4, 0.3]} tone={INT.screenBlue} intensity={1.1} />
        <Cyl p={[0, 0.3, 0]} r={0.04} h={0.6} color={INT.metal} metalness={0.7} />
        <Box p={[0.25, 0.55, 0.2]} s={[0.1, 0.2, 0.08]} color={INT.dark} />
      </Interactive>

      <Interactive label="Duty doctor" kind="crew-doctor" detail="Station medical officer on clinic hours." position={at(room, 0.4, 0.6, 0)} labelHeight={2.0}>
        <group>
          <Chair p={[0, 0, 0]} rot={0.4} kind="task" />
          <Figure p={[0, 0, 0]} rot={0.4} seated role="medical" />
          <Table p={[0, 0, 0.85]} w={1.2} d={0.6} tone={INT.deskTop} />
          <Box p={[0, 0.78, 0.85]} s={[0.4, 0.06, 0.3]} color="#E8EEF4" roughness={0.5} />
        </group>
      </Interactive>
      <Extinguisher p={at(room, -room.w / 2 + 0.4, -room.d / 2 + 0.5, 0)} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Storage room                                                     */
/* ------------------------------------------------------------------ */

function StorageRoom({ room, pallets = false }: { room: RoomDef; pallets?: boolean }) {
  const units = pallets ? 3 : 3;
  return (
    <group>
      {Array.from({ length: units }, (_, i) =>
        pallets ? (
          <Interactive key={i} label={`Pallet racking ${i + 1}`} kind="pallet-rack" detail="Crated stores at four levels, indexed against the resupply manifest." position={at(room, -room.w / 2 + 1.1, -room.d / 2 + 1.2 + i * 2.4, 0)} labelHeight={3.4}>
            <group>
              {[-0.6, 0.6].map((x) => (
                <Box key={x} p={[x, 1.6, 0]} s={[0.08, 3.2, 1.0]} color={INT.wallAccent} metalness={0.6} roughness={0.4} />
              ))}
              {[0.3, 1.1, 1.9, 2.7].map((y) => (
                <group key={y}>
                  <Box p={[0, y, 0]} s={[1.3, 0.08, 1.0]} color={INT.metal} metalness={0.6} roughness={0.4} />
                  <Crate p={[-0.3, y + 0.04, 0]} s={[0.5, 0.45, 0.5]} tone="#8A6A44" />
                  <Crate p={[0.28, y + 0.04, 0.1]} s={[0.5, 0.45, 0.5]} tone="#5A6C7C" />
                </group>
              ))}
            </group>
          </Interactive>
        ) : (
          <Interactive key={i} label={`Shelving bank ${i + 1}`} kind="shelving" detail="Dry stores, spares bins and winter clothing in labelled locations." position={at(room, -room.w / 2 + 0.8, -room.d / 2 + 1.0 + i * 2.2, 0)} labelHeight={2.6}>
            <RackUnit p={[0, 0, 0]} w={1.3} h={2.2} d={0.55} levels={5} stocked={0.85} />
          </Interactive>
        ),
      )}

      <Interactive label="Food crates" kind="food-crate" detail="Dry goods and tinned stores sized for the winter-over period." position={at(room, room.w / 2 - 1.4, -room.d / 2 + 1.2, 0)} labelHeight={1.5}>
        <group>
          <Crate p={[0, 0, 0]} s={[0.7, 0.6, 0.7]} tone="#8A6A44" />
          <Crate p={[0.8, 0, 0.2]} s={[0.7, 0.6, 0.7]} tone="#5A6C7C" />
          <Crate p={[0.4, 0.6, 0.1]} s={[0.7, 0.6, 0.7]} tone="#B3402F" />
          <Crate p={[0.4, 1.2, 0.1]} s={[0.7, 0.6, 0.7]} tone="#8A6A44" />
        </group>
      </Interactive>

      <Interactive label="Spares bins" kind="spares" detail="Seals, bearings, fuses and fasteners in labelled bins." position={at(room, room.w / 2 - 1.4, room.d / 2 - 1.2, 0)} labelHeight={1.8}>
        <group>
          {Array.from({ length: 3 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => (
              <Box key={`${r}-${c}`} p={[-0.45 + c * 0.3, 0.25 + r * 0.42, 0]} s={[0.28, 0.4, 0.4]} color={["#5A6C7C", "#B3402F", "#8A6A44", "#D6DDE2"][(r + c) % 4]} roughness={0.75} />
            )),
          )}
          <Box p={[0, 0, 0]} s={[1.4, 0.06, 0.44]} color={INT.metal} metalness={0.6} />
        </group>
      </Interactive>

      <Interactive label="Winter clothing rack" kind="clothing-rack" detail="Spare over-trousers, mitts and face masks, issued per field party." position={at(room, room.w / 2 - 0.6, 0.4, 0)} labelHeight={2.3}>
        <group>
          <Cyl p={[-0.6, 1.0, 0]} r={0.03} h={2.0} color={INT.dark} metalness={0.6} />
          <Cyl p={[0.6, 1.0, 0]} r={0.03} h={2.0} color={INT.dark} metalness={0.6} />
          <Cyl p={[0, 2.0, 0]} r={0.025} h={1.3} axis="x" color={INT.steel} metalness={0.7} />
          {[-0.45, -0.15, 0.15, 0.45].map((x) => (
            <Box key={x} p={[x, 1.45, 0]} s={[0.24, 0.8, 0.16]} color="#27415C" roughness={0.9} />
          ))}
        </group>
      </Interactive>

      <Interactive label="Folding ladder" kind="ladder" detail="Steps and platform for the upper shelf levels." position={at(room, 0.2, room.d / 2 - 0.6, 0)} labelHeight={2.3}>
        <group>
          {[-0.22, 0.22].map((x) => (
            <Box key={x} p={[x, 0.9, 0]} s={[0.06, 1.8, 0.06]} color={INT.metal} metalness={0.7} roughness={0.4} />
          ))}
          {[0.35, 0.7, 1.05, 1.4].map((y) => (
            <Box key={y} p={[0, y, 0]} s={[0.5, 0.04, 0.3]} color={INT.metal} metalness={0.7} roughness={0.4} />
          ))}
          <Box p={[0, 1.82, 0.12]} s={[0.6, 0.06, 0.6]} color={INT.dark} metalness={0.5} />
        </group>
      </Interactive>
      <Extinguisher p={at(room, -room.w / 2 + 0.4, room.d / 2 - 0.4, 0)} rot={Math.PI} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Stairway                                                         */
/* ------------------------------------------------------------------ */

function StairRoom({ room, plan, onStair }: { room: RoomDef; plan: { level: number; y: number; height: number }; onStair?: (dir: 1 | -1) => void }) {
  const up = plan.level === 0;
  return (
    <group>
      <StairFlight
        from={[room.x - 1.6, plan.y, room.z + (up ? 2.4 : -2.4)]}
        to={[room.x - 1.6, plan.y + (up ? 3.8 : -3.8), room.z + (up ? -2.4 : 2.4)]}
      />
      <Interactive
        label={up ? "Stairway to the upper level" : "Stairway to the entrance level"}
        kind="stair"
        detail="Press to move between decks. Steel treads with LED edge strip and handrails both sides."
        position={at(room, -1.6, 0, 0)}
        labelHeight={2.6}
      >
        <group
          onClick={(e) => {
            e.stopPropagation();
            onStair?.(up ? 1 : -1);
          }}
        >
          <Box p={[0, 1.6, 0]} s={[2.2, 0.12, 5.2]} color={INT.trim} emissive={INT.trim} emissiveIntensity={0.4} opacity={0.25} />
        </group>
      </Interactive>
      <WallPlate position={at(room, -1.6, 0, 2.8)} text={up ? "LEVEL 2  UP" : "LEVEL 1  DOWN"} tone={INT.trim} width={2.4} />
      <Interactive label="Level directory" kind="directory" detail="Station deck plan with cabin allocations and muster points." position={at(room, room.w / 2 - 0.6, 0, 1.7)}>
        <Box p={[0, 0, 0]} s={[1.3, 0.9, 0.05]} color={INT.veryDark} roughness={0.6} />
        <Label3D position={[0, 0, 0.05]} border={INT.trim} px={0.04} rows={[{ text: "DECK PLAN", color: INT.trim }, { text: "MUSTER ALPHA", color: INT.green }, { text: "MUSTER BRAVO", color: INT.screenBlue }]} />
      </Interactive>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 10. Atrium (Bharati)                                                */
/* ------------------------------------------------------------------ */

function Atrium({ room, onStair }: { room: RoomDef; onStair?: (dir: 1 | -1) => void }) {
  return (
    <group>
      <Interactive label="Welcome desk" kind="welcome-desk" detail="Sign-in point for visitors with muster board and badge printer." position={at(room, -room.w / 2 + 2.2, 0, 0)} labelHeight={1.7}>
        <Table p={[0, 0, 0]} w={2.0} d={0.8} tone={INT.wood} />
        <Box p={[0, 0.8, -0.3]} s={[0.6, 0.34, 0.06]} color={INT.veryDark} roughness={0.6} />
        <Panel p={[0, 0.8, -0.26]} s={[0.5, 0.26]} tone={INT.screenCyan} intensity={1.0} />
      </Interactive>

      <Interactive label="Indian flag" kind="flag" detail="National flag on the atrium wall above the welcome desk." position={at(room, -room.w / 2 + 2.4, 1.4, 2.4)}>
        <Box p={[0, 0, 0]} s={[1.8, 1.2, 0.05]} color="#E8EEF4" roughness={0.7} />
        <Box p={[0, 0.26, 0.03]} s={[1.8, 0.42, 0.02]} color="#FF9933" roughness={0.8} />
        <Box p={[0, -0.26, 0.03]} s={[1.8, 0.42, 0.02]} color="#138808" roughness={0.8} />
        <Cyl p={[0, 0, 0.05]} r={0.16} h={0.04} axis="z" color="#000080" metalness={0.5} seg={14} />
      </Interactive>

      <group position={at(room, 0, 0, 0)}>
        <Figure p={[-2.2, 0, 0.4]} rot={1.2} role="operations" walking phase={0} />
        <Figure p={[2.6, 0, -0.6]} rot={-1.4} role="scientist" walking phase={2.1} />
      </group>

      <Interactive label="Glass-railed staircase" kind="stair" detail="Central stair connecting the operations level to the living deck." position={at(room, room.w / 2 - 3.0, -1.2, 0)} labelHeight={3.0}>
        <group
          onClick={(e) => {
            e.stopPropagation();
            onStair?.(1);
          }}
        >
          <Box p={[0, 1.0, 0]} s={[2.6, 2.0, 3.0]} color={INT.trim} emissive={INT.trim} emissiveIntensity={0.35} opacity={0.2} />
        </group>
      </Interactive>

      <Interactive label="Skylight" kind="skylight" detail="Glazed roof light over the atrium; aurora is visible through it on clear winter nights." position={at(room, 0, 0, 3.2)} labelHeight={0.6}>
        <Panel p={[0, 0, 0]} s={[3.2, 2.4]} rot={[Math.PI / 2, 0, 0]} tone="#8FD8FF" intensity={0.7} opacity={0.4} />
        <Box p={[0, 0.1, 0]} s={[3.4, 0.12, 2.6]} color={INT.dark} metalness={0.6} />
      </Interactive>

      <PipeRun from={at(room, -room.w / 2 + 0.4, 0, 3.0)} to={at(room, room.w / 2 - 0.4, 0, 3.0)} tone={INT.screenAmber} clamps={6} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* 11. Data centre, power room, wastewater, laboratory, workshop       */
/* ------------------------------------------------------------------ */

function DataCentre({ room }: { room: RoomDef }) {
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <Interactive
          key={i}
          label={`Data rack ${i + 1}`}
          kind="server-rack"
          detail="Raised-floor rack with structured cabling and redundant cooling."
          position={at(room, -room.w / 2 + 1.0, -room.d / 2 + 1.0 + i * 1.0, 0)}
          labelHeight={2.4}
        >
          <group>
            <CabinetUnit p={[0, 0, 0]} w={0.7} h={2.1} d={0.95} doors={2} tone="#1B242E" />
            {Array.from({ length: 9 }, (_, j) => (
              <group key={j} position={[0, 0.24 + j * 0.21, 0.5]}>
                <Box p={[0, 0, 0]} s={[0.6, 0.15, 0.03]} color="#232E3A" roughness={0.6} />
                <Led p={[-0.22, 0.03, 0.04]} tone={INT.screenBlue} />
                <Led p={[-0.15, 0.03, 0.04]} tone={INT.green} />
                <Spinner speed={7 + j} axis="z">
                  <Cyl p={[0.2, 0, 0.03]} r={0.04} h={0.02} axis="z" color={INT.metal} metalness={0.7} seg={8} />
                </Spinner>
              </group>
            ))}
          </group>
        </Interactive>
      ))}
      <Interactive label="Airflow floor tiles" kind="raised-floor" detail="Perforated tiles feeding the cold aisle; airflow is checked monthly." position={at(room, 1.6, 0, 0.02)} labelHeight={1.0}>
        <Box p={[0, 0.02, 0]} s={[2.4, 0.04, 6.0]} color="#3A4550" metalness={0.45} roughness={0.6} />
      </Interactive>
      <Interactive label="Uptime monitor" kind="ups" detail="Generator, UPS and link availability, with the twelve month rolling figure." position={at(room, room.w / 2 - 0.14, 0, 1.6)}>
        <Box p={[0, 0, 0]} s={[0.3, 0.44, 0.05]} color={INT.veryDark} roughness={0.6} />
        <Label3D position={[0, 0, 0.05]} border={INT.green} px={0.04} rows={[{ text: "99.98%", color: INT.green }, { text: "UPS OK", color: INT.trim }]} />
      </Interactive>
    </group>
  );
}

function PowerRoom({ room }: { room: RoomDef }) {
  return (
    <group>
      {Array.from({ length: 3 }, (_, i) => (
        <Interactive
          key={i}
          label={`CHP unit ${i + 1}`}
          kind="chp"
          tag={`CHP-${i + 1}`}
          detail="Combined heat and power unit behind the viewing panel: 100 kVA electrical with 150 kW thermal recovery."
          position={at(room, -room.w / 2 + 1.6, -room.d / 2 + 1.3 + i * 2.6, 0)}
          labelHeight={3.0}
        >
          <group>
            <Box p={[0, 0.2, 0]} s={[3.0, 0.4, 2.0]} color={INT.dark} metalness={0.5} roughness={0.6} />
            <Box p={[0, 1.3, 0]} s={[2.8, 1.8, 1.7]} color="#5B6670" metalness={0.55} roughness={0.45} />
            <Cyl p={[-1.0, 2.9, -0.5]} r={0.16} h={1.6} color={INT.pole} metalness={0.75} roughness={0.35} />
            {/* Heat exchanger coil */}
            {Array.from({ length: 6 }, (_, j) => (
              <Cyl key={j} p={[1.2, 0.6 + j * 0.26, 0.5]} r={0.08} h={1.5} axis="z" color={INT.screenAmber} metalness={0.6} roughness={0.4} />
            ))}
            <Box p={[0, 1.4, 0.9]} s={[1.4, 0.9, 0.06]} color={INT.glass} opacity={0.28} roughness={0.15} />
            <Box p={[0, 2.4, 0]} s={[2.9, 0.1, 1.8]} color={INT.metal} metalness={0.6} />
          </group>
        </Interactive>
      ))}
      <Interactive label="Switchgear panel" kind="switchgear" detail="Synchronising panel, breakers and metering for the three units." position={at(room, room.w / 2 - 0.5, -room.d / 2 + 2.0, 0)} labelHeight={2.4}>
        <group>
          <Box p={[0, 1.1, 0]} s={[0.5, 2.2, 3.4]} color="#2B3540" metalness={0.5} roughness={0.5} />
          {Array.from({ length: 4 }, (_, i) => (
            <group key={i} position={[-0.28, 1.7 - i * 0.4, -1.2 + i * 0.8]}>
              <Panel p={[0, 0, 0]} s={[0.2, 0.16]} rot={[0, -Math.PI / 2, 0]} tone={INT.screenAmber} intensity={1.0} />
              <Cyl p={[-0.05, -0.22, 0]} r={0.05} h={0.16} axis="x" color={INT.red} roughness={0.6} />
            </group>
          ))}
        </group>
      </Interactive>
      <Interactive label="Output monitors" kind="output-monitor" detail="Live electrical and thermal output for each unit." position={at(room, room.w / 2 - 0.2, 1.4, 1.6)}>
        <Box p={[0, 0, 0]} s={[0.3, 0.5, 0.05]} color={INT.veryDark} roughness={0.6} />
        <Label3D position={[0, 0, 0.05]} border={INT.amber} px={0.04} rows={[{ text: "CHP 1-3", color: INT.amber }, { text: "268 kW", color: INT.trim }, { text: "THERM 402 kW", color: INT.screenAmber }]} />
      </Interactive>
      <Figure p={at(room, 0.8, 1.0, 0)} rot={2.2} role="engineer" walking />
    </group>
  );
}

function WastewaterRoom({ room }: { room: RoomDef }) {
  const bubbles = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (bubbles.current) {
      bubbles.current.children.forEach((c, i) => {
        c.position.y = 0.35 + ((clock.elapsedTime * 0.6 + i * 0.24) % 1) * 0.7;
        (c as THREE.Mesh).scale.setScalar(0.6 + ((clock.elapsedTime * 0.6 + i * 0.24) % 1) * 0.7);
      });
    }
  });
  return (
    <group>
      <Interactive label="MBBR digester" kind="digester" detail="Moving bed biofilm reactor with visible aeration bubbling; process health is logged hourly." position={at(room, -room.w / 4, backZ(room) + 1.1, 0)} labelHeight={2.6}>
        <group>
          <Cyl p={[0, 0.9, 0]} r={0.85} h={1.8} color={INT.steel} metalness={0.5} roughness={0.5} />
          <Cyl p={[0, 1.84, 0]} r={0.88} h={0.12} color={INT.dark} metalness={0.6} />
          <group ref={bubbles}>
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i} position={[-0.5 + (i % 4) * 0.33, 0.5, -0.3 + Math.floor(i / 4) * 0.6]}>
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshStandardMaterial color="#BFE8FF" emissive="#7FD8FF" emissiveIntensity={0.7} transparent opacity={0.7} />
              </mesh>
            ))}
          </group>
        </group>
      </Interactive>
      <Interactive label="Clarifier tank" kind="clarifier" detail="Secondary clarifier with scraper bridge and settled sludge draw." position={at(room, room.w / 4, backZ(room) + 1.1, 0)} labelHeight={2.6}>
        <group>
          <Cyl p={[0, 0.8, 0]} r={0.8} h={1.6} color="#8A949E" metalness={0.5} roughness={0.5} />
          <Cyl p={[0, 1.64, 0]} r={0.83} h={0.1} color={INT.dark} metalness={0.6} />
          <Box p={[0, 1.75, 0]} s={[1.7, 0.08, 0.2]} color={INT.metal} metalness={0.7} />
          <Spinner speed={0.6}>
            <Box p={[0, 0.95, 0]} s={[1.5, 0.06, 0.1]} color={INT.metal} metalness={0.6} />
          </Spinner>
        </group>
      </Interactive>
      <Interactive label="UV discharge unit" kind="uv-discharge" detail="Final ultraviolet treatment before discharge under the Antarctic environmental protocol." position={at(room, room.w / 2 - 0.7, -room.d / 2 + 1.2, 1.2)} labelHeight={0.9}>
        <Cyl p={[0, 0, 0]} r={0.13} h={1.0} axis="z" color="#7FD8FF" emissive="#7FD8FF" emissiveIntensity={0.8} metalness={0.5} />
        <Box p={[0, 0, 0]} s={[0.28, 0.28, 0.28]} color={INT.dark} metalness={0.6} />
      </Interactive>
      <Interactive label="Chemical store" kind="chemical-store" detail="Coagulant and disinfectant in bunded containers." position={at(room, -room.w / 2 + 0.8, room.d / 2 - 0.8, 0)} labelHeight={1.6}>
        <group>
          <Cyl p={[0, 0.4, 0]} r={0.28} h={0.8} color="#4E8C46" roughness={0.5} />
          <Cyl p={[0.7, 0.36, 0.2]} r={0.26} h={0.72} color="#B3402F" roughness={0.5} />
          <Box p={[0, 0.02, 0]} s={[1.4, 0.04, 0.9]} color={INT.dark} metalness={0.4} />
        </group>
      </Interactive>
    </group>
  );
}

function LaboratoryRoom({ room, benches = 4 }: { room: RoomDef; benches?: number }) {
  return (
    <group>
      {Array.from({ length: benches }, (_, i) => (
        <Interactive
          key={i}
          label={`Laboratory bench ${i + 1}`}
          kind="lab-bench"
          detail="Bench with sink, reagent shelf and instrument space; fume hood above the wet end."
          position={at(room, -room.w / 2 + 1.6, -room.d / 2 + 1.0 + i * 1.35, 0)}
          labelHeight={2.2}
        >
          <group>
            <Box p={[0, 0.86, 0]} s={[2.6, 0.07, 0.85]} color="#2E3A44" roughness={0.4} metalness={0.3} />
            <Box p={[0, 0.72, 0]} s={[2.5, 0.22, 0.78]} color={INT.wall} roughness={0.6} />
            {[-1.1, 1.1].map((x) => (
              <Box key={x} p={[x, 0.42, 0]} s={[0.1, 0.6, 0.7]} color={INT.metal} metalness={0.55} />
            ))}
            <Box p={[0, 0.42, 0.36]} s={[1.2, 0.5, 0.05]} color={INT.wall} roughness={0.6} />
            <Box p={[0, 1.3, -0.35]} s={[2.5, 0.05, 0.28]} color={INT.metal} metalness={0.6} />
            {[-0.9, -0.6, -0.3].map((x, j) => (
              <Cyl key={j} p={[x, 1.45, -0.35]} r={0.04} h={0.22} color={[INT.trim, "#C4262E", "#4A9EFF"][j]} transparent opacity={0.8} />
            ))}
            <Box p={[0.85, 0.98, 0]} s={[0.3, 0.18, 0.24]} color={INT.dark} roughness={0.5} />
          </group>
        </Interactive>
      ))}

      <Interactive label="Fume hood" kind="fume-hood" detail="Extracted enclosure for acid digestion and solvent work." position={at(room, room.w / 2 - 0.9, -room.d / 2 + 1.4, 0)} labelHeight={2.7}>
        <group>
          <Box p={[0, 0.45, 0]} s={[1.4, 0.9, 0.9]} color={INT.steel} metalness={0.5} roughness={0.5} />
          <Box p={[0, 1.6, 0]} s={[1.5, 1.4, 1.0]} color={INT.glass} opacity={0.25} roughness={0.15} />
          <Box p={[0, 2.35, 0]} s={[1.5, 0.2, 1.0]} color={INT.metal} metalness={0.6} />
          <Cyl p={[0, 2.6, -0.3]} r={0.14} h={0.4} color={INT.metal} metalness={0.6} />
        </group>
      </Interactive>

      <Interactive label="Microscope station" kind="microscope" detail="Binocular microscope with prepared slides and a digital camera head." position={at(room, room.w / 2 - 1.2, 1.6, 1.3)} labelHeight={1.1}>
        <group>
          <Box p={[0, -0.36, 0]} s={[0.34, 0.1, 0.34]} color={INT.dark} roughness={0.5} />
          <Cyl p={[0, -0.1, 0]} r={0.04} h={0.4} color={INT.dark} metalness={0.6} />
          <Box p={[0, 0.14, 0]} s={[0.24, 0.08, 0.3]} color={INT.metal} metalness={0.6} />
          <Cyl p={[0, 0.3, -0.04]} r={0.045} h={0.3} color={INT.veryDark} metalness={0.7} />
          <Cyl p={[0, 0.48, 0.02]} r={0.035} h={0.14} axis="z" color={INT.veryDark} metalness={0.7} />
        </group>
      </Interactive>

      <Interactive label="Sample refrigerator" kind="sample-fridge" detail="Cold storage for ice cores, water samples and filtrates at four degrees." position={at(room, room.w / 2 - 0.8, room.d / 2 - 1.0, 0)} labelHeight={2.1}>
        <CabinetUnit p={[0, 0, 0]} w={1.0} h={1.8} d={0.7} doors={1} tone={INT.ceramic} glass />
        <Panel p={[0, 0.6, 0.37]} s={[0.3, 0.2]} tone={INT.screenBlue} intensity={0.9} />
      </Interactive>

      <Interactive label="Chemical cabinet" kind="chemical-cabinet" detail="Ventilated cabinet for acids, bases and solvents, segregated by hazard class." position={at(room, -room.w / 2 + 0.6, room.d / 2 - 1.2, 0)} labelHeight={2.0}>
        <CabinetUnit p={[0, 0, 0]} w={1.1} h={1.7} d={0.55} doors={2} tone="#F2C14E" />
        <Label3D position={[0, 0.9, 0.3]} border={INT.amber} px={0.045} rows={[{ text: "HAZARD", color: INT.amber }]} />
      </Interactive>

      {Array.from({ length: 3 }, (_, i) => (
        <group key={i} position={at(room, -room.w / 4 + i * 1.1, room.d / 2 - 1.3, 0)} rotation={[0, -Math.PI / 2.2 + i * 0.2, 0]}>
          <Figure p={[0, 0, 0]} rot={0} role="scientist" />
        </group>
      ))}
    </group>
  );
}

function WorkshopRoom({ room }: { room: RoomDef }) {
  const lathe = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (lathe.current) lathe.current.rotation.z += delta * 6;
  });
  return (
    <group>
      <Interactive label="Centre lathe" kind="lathe" detail="Metal turning lathe with a rotating chuck, used for impeller and shaft repairs." position={at(room, -room.w / 4, backZ(room) + 1.0, 0)} labelHeight={2.0}>
        <group>
          <Box p={[0, 0.5, 0]} s={[2.4, 0.6, 0.9]} color="#4E8C46" roughness={0.55} />
          <Box p={[0, 0.92, 0]} s={[2.2, 0.24, 0.7]} color={INT.metal} metalness={0.7} roughness={0.35} />
          {[-1.0, 1.0].map((x) => (
            <Box key={x} p={[x, 0.22, 0]} s={[0.24, 0.44, 0.8]} color="#3A4550" metalness={0.5} />
          ))}
          <mesh ref={lathe} position={[-0.75, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.3, 12]} />
            <meshStandardMaterial color={INT.metal} metalness={0.85} roughness={0.25} />
          </mesh>
          <Box p={[0.6, 1.1, 0]} s={[0.1, 0.2, 0.3]} color={INT.dark} metalness={0.7} />
          <Box p={[1.2, 1.15, 0]} s={[0.4, 0.3, 0.4]} color={INT.dark} roughness={0.6} />
        </group>
      </Interactive>

      <Interactive label="Welding station" kind="welding" detail="MIG set behind a flash curtain with fume extraction overhead." position={at(room, room.w / 4, backZ(room) + 1.2, 0)} labelHeight={2.0}>
        <group>
          <Box p={[0, 0.5, 0]} s={[1.0, 0.6, 0.6]} color={INT.red} roughness={0.55} />
          <Box p={[0, 0.95, 0]} s={[0.6, 0.3, 0.4]} color={INT.veryDark} roughness={0.6} />
          <Box p={[0, 1.15, 0.3]} s={[0.4, 0.06, 0.3]} color={INT.screenCyan} emissive={INT.screenCyan} emissiveIntensity={0.9} />
          <Box p={[0.9, 1.05, 0]} s={[0.06, 1.6, 2.0]} color="#8A6A44" opacity={0.9} roughness={0.95} />
          <Box p={[0, 0.32, 0]} s={[1.0, 0.8, 0.7]} color={INT.dark} metalness={0.4} />
        </group>
      </Interactive>

      <Interactive label="Tool chests" kind="tool-chest" detail="Roller cabinet with metric and imperial spanner sets, torque wrenches and pullers." position={at(room, -room.w / 2 + 0.9, room.d / 2 - 0.9, 0)} labelHeight={1.5}>
        <group>
          <Box p={[0, 0.4, 0]} s={[1.6, 0.8, 0.7]} color={INT.red} roughness={0.55} />
          <Box p={[0, 0.84, 0]} s={[1.62, 0.08, 0.72]} color={INT.dark} metalness={0.6} />
          {[0.2, 0.45, 0.7].map((y) => (
            <Box key={y} p={[0, y, 0.36]} s={[1.4, 0.03, 0.02]} color={INT.steel} metalness={0.8} />
          ))}
          {[-0.6, 0.6].map((x) => (
            <Cyl key={x} p={[x, 0.08, 0.3]} r={0.07} h={0.05} axis="z" color={INT.rubber} />
          ))}
        </group>
      </Interactive>

      <Interactive label="Workbench and vice" kind="workbench" detail="Heavy bench with a bench vice, grindstone and shadow board." position={at(room, room.w / 2 - 1.6, room.d / 2 - 0.9, 0)} labelHeight={1.6}>
        <group>
          <Box p={[0, 0.88, 0]} s={[2.4, 0.12, 0.8]} color="#8A6A44" roughness={0.8} />
          <Box p={[0, 0.44, -0.32]} s={[2.3, 0.8, 0.1]} color={INT.woodDark} roughness={0.85} />
          <Box p={[-1.0, 0.44, 0.2]} s={[0.12, 0.88, 0.7]} color={INT.woodDark} roughness={0.85} />
          <Box p={[1.0, 0.44, 0.2]} s={[0.12, 0.88, 0.7]} color={INT.woodDark} roughness={0.85} />
          <Box p={[0.7, 1.0, 0]} s={[0.3, 0.22, 0.24]} color="#2F6B3A" metalness={0.6} roughness={0.4} />
          <Cyl p={[0.7, 1.06, 0.18]} r={0.03} h={0.3} axis="z" color={INT.metal} metalness={0.8} />
          <Box p={[-0.6, 1.6, -0.3]} s={[1.2, 0.9, 0.05]} color="#3A4550" roughness={0.6} />
        </group>
      </Interactive>

      <Figure p={at(room, 0.6, -0.4, 0)} rot={0.8} role="engineer" walking />
      <Extinguisher p={at(room, -room.w / 2 + 0.4, -room.d / 2 + 0.5, 0)} />
      <WallPlate position={at(room, 0, -room.d / 2 + 0.16, 2.5)} text="WORKSHOP  EYE AND EAR PROTECTION" tone={INT.amber} width={3.6} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Digital twin admin desk                                             */
/* ------------------------------------------------------------------ */

/**
 * Where the twin admin desk sits inside a command room, in metres from the
 * room centre. The desk faces the door side of the room, so someone walking in
 * meets the administrator face on rather than the back of a monitor, and the
 * console can drop the operator straight in front of him.
 */
export function adminDeskPlacement(room: Pick<RoomDef, "w" | "d">): {
  /** Desk centre. */
  desk: [number, number];
  /** Where the seated administrator ends up. */
  seat: [number, number];
  /** Where a visitor stands to look at him. */
  view: [number, number];
} {
  // Off the console columns and clear of the desk rows, on the door side of
  // the room: Maitri's command room is 7.5 m deep, Bharati's 14.9 m, so the
  // offset is taken from the wall rather than a fixed number.
  const x = room.w * 0.2;
  const z = room.d / 2 - 2.1;
  return { desk: [x, z], seat: [x, z - 0.95], view: [x, z + 1.5] };
}

/**
 * The digital twin administrator's desk.
 *
 * One seat in the command room belongs to the twin itself. Dev Khandhediya
 * keeps the sensor ingest, the MQTT bridge and the offline outbox running from
 * here, and clicking the desk opens his profile: the same card the outdoor
 * scene opens when he is standing with the Adelie colony.
 */
function TwinAdminDesk({ room }: { room: RoomDef }) {
  const { desk } = adminDeskPlacement(room);
  const rows = [
    { text: "DIGITAL TWIN", color: INT.trim },
    { text: "INGEST  NOMINAL", color: INT.green },
    { text: "MQTT BRIDGE  UP", color: INT.screenBlue },
    { text: "OUTBOX  0 HELD", color: INT.screenAmber },
  ];

  return (
    <Interactive
      label="Dev Khandhediya - twin admin desk"
      kind="twin-admin-desk"
      detail="Expedition systems and digital twin administrator. Owns the sensor ingest, the MQTT bridge and the offline outbox; click for his profile."
      position={at(room, desk[0], desk[1], 0)}
      rotation={[0, Math.PI, 0]}
      labelHeight={2.9}
    >
      <WorkstationDesk p={[0, 0, 0]} rows={rows} seated={false} />
      {/* He sits facing the room, so the desk reads as his, not the monitors'.
          Local +z is the far side once the desk is turned to face the door. */}
      <group position={[0, 0, 0.95]}>
        <Chair p={[0, 0, 0]} rot={Math.PI} kind="task" />
        <Figure p={[0, 0, 0]} rot={Math.PI} role="engineer" seated />
      </group>
      {/* Side cabinet: hard hat, mug and the paper log he still keeps. */}
      <group position={[1.35, 0, 0.1]} rotation={[0, -0.4, 0]}>
        <CabinetUnit p={[0, 0, 0]} w={0.62} h={1.02} d={0.55} doors={2} tone={INT.steel} />
        <Cyl p={[0, 1.12, 0]} r={0.17} h={0.12} color={INT.amber} roughness={0.6} />
        <Box p={[0, 1.06, 0.16]} s={[0.3, 0.02, 0.12]} color={INT.amber} roughness={0.6} />
        <Cyl p={[-0.16, 1.07, -0.1]} r={0.055} h={0.11} color="#E8EEF4" roughness={0.4} />
        <Box p={[0.18, 1.07, -0.08]} s={[0.34, 0.03, 0.24]} color="#E8EEF4" roughness={0.5} />
      </group>
      {/* Nameplate on the visitor side, plus a sign you can find from anywhere. */}
      <Label3D
        position={[0, 0.62, -0.45]}
        border={INT.amber}
        px={0.05}
        rows={[{ text: "DEV KHANDHEDIYA", color: INT.amber }]}
      />
      <Label3D
        position={[0, 2.2, 0]}
        border={INT.amber}
        px={0.07}
        rows={[
          { text: "DEV KHANDHEDIYA", color: INT.amber },
          { text: "TWIN ADMIN DESK - CLICK FOR PROFILE", color: INT.trim },
        ]}
      />
    </Interactive>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

/** Furnish an operational room according to its plan kind. */
export function OpsRoomContents({
  room,
  plan,
  onStair,
}: {
  room: RoomDef;
  plan: { level: number; y: number; height: number };
  onStair?: (dir: 1 | -1) => void;
}) {
  switch (room.kind) {
    case "vestibule":
      return <Vestibule room={room} />;
    case "command":
      return <CommandCentre room={room} extra={room.w > 12 ? 6 : 8} />;
    case "comms":
      return <CommsRoom room={room} />;
    case "server":
      return <ServerRoom room={room} racks={4} />;
    case "generator":
      return <GeneratorRoom room={room} />;
    case "water":
      return <WaterTreatmentRoom room={room} stations={room.w > 8 ? 5 : 3} />;
    case "medical":
      return <MedicalBay room={room} beds={room.w > 11 ? 4 : 3} />;
    case "storage":
      return <StorageRoom room={room} pallets={room.w > 11} />;
    case "stair":
      return <StairRoom room={room} plan={plan} onStair={onStair} />;
    case "atrium":
      return <Atrium room={room} onStair={onStair} />;
    case "datacentre":
      return <DataCentre room={room} />;
    case "power":
      return <PowerRoom room={room} />;
    case "wastewater":
      return <WastewaterRoom room={room} />;
    case "laboratory":
      return <LaboratoryRoom room={room} benches={4} />;
    case "workshop":
      return <WorkshopRoom room={room} />;
    default:
      return null;
  }
}

export { Bunk, Locker, Monitor, Toilet };
