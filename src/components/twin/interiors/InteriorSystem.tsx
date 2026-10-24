import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Corridor, DoorLeaf, INT, RoomShell } from "./kit";
import type { OnInspect } from "./kit";
import { Occupants } from "./Occupant";
import { floorGeometry, floorPlan } from "./plans";
import { RoomContents } from "./rooms";
import { WalkController, type DoorStateRef } from "./WalkController";

/**
 * Interior system.
 *
 * One deck of one station, assembled from its floor plan: the generated walls,
 * the hinged door leaves, the furnished rooms, the animated crew roster and —
 * when the operator is walking — the first-person controller.
 *
 * The interior is its own world. It is mounted instead of the exterior scene
 * rather than inside it, which is what lets every room be fully modelled at
 * walkable detail without paying for it while the operator is outside.
 */
export interface InteriorSystemProps {
  slug: string;
  level: number;
  /** "walk" is first person; "deck" is an overhead plan view of the same level. */
  view: "walk" | "deck";
  spawn: [number, number, number];
  onInspect?: OnInspect;
  onLevel: (level: number) => void;
  onRoomChange: (roomId: string | null) => void;
  onPosition: (x: number, z: number, yaw: number) => void;
  onLockChange: (locked: boolean) => void;
  onExitWalk: () => void;
  /** Room ids whose light switch is currently thrown, keyed room id. */
  lightsOut: Record<string, boolean>;
  onToggleLights: (roomId: string) => void;
}

export function InteriorSystem({
  slug,
  level,
  view,
  spawn,
  onInspect,
  onLevel,
  onRoomChange,
  onPosition,
  onLockChange,
  onExitWalk,
  lightsOut,
  onToggleLights,
}: InteriorSystemProps) {
  const plan = floorPlan(slug, level);
  const geometry = useMemo(() => floorGeometry(slug, level), [slug, level]);
  const deckTarget = useMemo(
    () => new THREE.Vector3(0, plan?.y ?? 0, 0),
    [plan?.y],
  );
  const doorState: DoorStateRef = useRef<Record<string, boolean>>({});

  const onStair = useCallback(
    (dir: 1 | -1) => {
      const next = level + dir;
      if (next >= 0 && next <= 1) onLevel(next);
    },
    [level, onLevel],
  );

  if (!plan) {
    return (
      <group>
        <ambientLight intensity={0.5} />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={INT.red} emissive={INT.red} emissiveIntensity={1} />
        </mesh>
      </group>
    );
  }

  const showCeiling = view === "walk";

  return (
    <group>
      {/* Interior lighting base: enough ambient that no corridor goes black
          even with every room switch thrown. */}
      <ambientLight intensity={0.34} />
      <hemisphereLight args={["#1E2C42", "#4A4436", 0.45]} />
      <pointLight position={[0, plan.y + 2.6, 0]} intensity={8} distance={22} color="#DCEBFF" />

      {/* Deck slab under everything, so the plan reads as a floor even where
          the corridor and room slabs meet. */}
      <mesh position={[plan.shell.x, plan.y - 0.16, plan.shell.z]} receiveShadow>
        <boxGeometry args={[plan.shell.w, 0.14, plan.shell.d]} />
        <meshStandardMaterial color="#3A4550" roughness={0.85} metalness={0.2} />
      </mesh>

      {/* Walls generated from the plan */}
      {geometry.walls.map((wall) => (
        <mesh
          key={wall.id}
          position={[wall.x, wall.y + wall.h / 2, wall.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[wall.sx, wall.h, wall.sz]} />
          <meshStandardMaterial
            color={wall.roomId === "shell" ? INT.steel : INT.wall}
            roughness={0.82}
            metalness={wall.roomId === "shell" ? 0.3 : 0.12}
          />
        </mesh>
      ))}

      {/* Skirting band on every interior wall face */}
      {geometry.walls
        .filter((w) => w.roomId !== "shell")
        .map((wall) => (
          <mesh key={`s-${wall.id}`} position={[wall.x, wall.y + 0.12, wall.z]}>
            <boxGeometry args={[wall.sx + 0.02, 0.24, wall.sz + 0.02]} />
            <meshStandardMaterial color={INT.wallAccent} roughness={0.7} />
          </mesh>
        ))}

      {/* Corridor and rooms */}
      <Corridor plan={plan} lightsOn={!lightsOut.corridor} showCeiling={showCeiling} />
      {plan.rooms.map((room) => (
        <RoomShell
          key={room.id}
          room={room}
          plan={plan}
          lightsOn={!lightsOut[room.id]}
          onToggleLights={() => onToggleLights(room.id)}
          showCeiling={showCeiling}
        >
          <RoomContents room={room} plan={plan} onStair={onStair} />
        </RoomShell>
      ))}

      {/* Door leaves */}
      {geometry.doors.map((door) => (
        <DoorLeaf key={door.id} door={door} openRef={doorState} />
      ))}

      {/* Crew walking their defined routes */}
      <Occupants slug={slug} level={level} />

      {view === "walk" && (
        <WalkController
          spawn={spawn}
          colliders={geometry.colliders}
          doors={geometry.doors}
          rooms={plan.rooms}
          doorState={doorState}
          onExit={onExitWalk}
          onLockChange={onLockChange}
          onRoomChange={onRoomChange}
          onPosition={(x, z, yaw) => onPosition(x, z, yaw)}
        />
      )}

      {view === "deck" && <DeckCamera plan={plan} />}
      {view === "deck" && (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          target={deckTarget}
          minDistance={12}
          maxDistance={90}
          maxPolarAngle={Math.PI / 2.2}
        />
      )}
    </group>
  );
}

/** Overhead camera for the deck plan view, looking straight down the module. */
function DeckCamera({ plan }: { plan: ReturnType<typeof floorPlan> }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (!plan) return;
    camera.position.set(plan.shell.w * 0.75, 34, plan.shell.d * 0.75);
    camera.lookAt(plan.shell.x, plan.y, plan.shell.z);
  }, [camera, plan]);
  return null;
}

/** Room list for one deck, for the console's deck directory. */
export function deckRooms(slug: string, level: number) {
  return floorPlan(slug, level)?.rooms ?? [];
}
