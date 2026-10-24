import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Collider2D, DoorDef, RoomDef } from "./plan-types";

/**
 * First-person walk controller.
 *
 * Pointer lock is handled directly rather than through a helper so the lock
 * state is unambiguous: the page shows a "click to look around" plate while
 * the pointer is free, and hides it the moment the browser confirms the lock.
 *
 * Movement is resolved per axis against the wall colliders generated from the
 * floor plan, which gives sliding along walls instead of sticking, and door
 * leaves drop out of the collider set as they swing open.
 */

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 3.1;
const SPRINT_SPEED = 6.0;
const ACCEL = 14;
const RADIUS = 0.34;
const DOOR_SENSE = 2.3;

/** A mutable per-frame door state box shared with the door leaves. */
export type DoorStateRef = { current: Record<string, boolean> };

export interface WalkControllerProps {
  spawn: [number, number, number];
  colliders: Collider2D[];
  doors: DoorDef[];
  rooms: RoomDef[];
  doorState: DoorStateRef;
  onExit: () => void;
  onLockChange: (locked: boolean) => void;
  onRoomChange: (roomId: string | null) => void;
  onPosition: (x: number, z: number, yaw: number) => void;
}

interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function overlaps(px: number, pz: number, r: number, b: Bounds): boolean {
  return px + r > b.minX && px - r < b.maxX && pz + r > b.minZ && pz - r < b.maxZ;
}

export function WalkController({
  spawn,
  colliders,
  doors,
  rooms,
  doorState,
  onExit,
  onLockChange,
  onRoomChange,
  onPosition,
}: WalkControllerProps) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector2(0, 0));
  const position = useRef(new THREE.Vector2(spawn[0], spawn[2]));
  const jump = useRef(0);
  const lastReport = useRef(0);
  const roomRef = useRef<string | null>(null);
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);

  // Place the camera at the spawn point facing along the corridor.
  useEffect(() => {
    camera.position.set(spawn[0], spawn[1], spawn[2]);
    euler.set(0, 0, 0);
    camera.quaternion.setFromEuler(euler);
    position.current.set(spawn[0], spawn[2]);
  }, [camera, euler, spawn]);

  // Keyboard.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "Space") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Pointer lock look.
  useEffect(() => {
    const el = gl.domElement;
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= e.movementX * 0.0021;
      euler.x -= e.movementY * 0.0021;
      euler.x = Math.max(-Math.PI / 2 + 0.06, Math.min(Math.PI / 2 - 0.06, euler.x));
      camera.quaternion.setFromEuler(euler);
    };
    const handleLockChange = () => {
      const locked = document.pointerLockElement === el;
      onLockChange(locked);
      if (!locked) keys.current = {};
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("pointerlockchange", handleLockChange);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerlockchange", handleLockChange);
    };
  }, [camera, euler, gl, onLockChange]);

  // Expose a lock handle on the canvas so the page overlay can trigger it.
  useEffect(() => {
    const el = gl.domElement;
    const request = () => {
      // Browsers reject a lock requested during the unlock cooldown; swallow the
      // rejection so the console stays clean and the next click retries.
      const result = el.requestPointerLock() as unknown as Promise<void> | undefined;
      if (result && typeof result.catch === "function") result.catch(() => undefined);
    };
    el.addEventListener("click", request);
    return () => el.removeEventListener("click", request);
  }, [gl]);

  // Per-frame movement, door proximity and collision.
  const frame = (delta: number) => {
    const dt = Math.min(delta, 0.05);
    const forward = (keys.current.KeyW ? 1 : 0) - (keys.current.KeyS ? 1 : 0);
    const strafe = (keys.current.KeyD ? 1 : 0) - (keys.current.KeyA ? 1 : 0);
    const sprint = keys.current.ShiftLeft || keys.current.ShiftRight;
    const speed = sprint ? SPRINT_SPEED : WALK_SPEED;

    euler.setFromQuaternion(camera.quaternion);
    const yaw = euler.y;
    const target = new THREE.Vector2(0, 0);
    if (forward !== 0 || strafe !== 0) {
      const dirX = -Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
      const dirZ = -Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      const len = Math.hypot(dirX, dirZ) || 1;
      target.set((dirX / len) * speed, (dirZ / len) * speed);
    }
    const k = 1 - Math.exp(-ACCEL * dt);
    velocity.current.lerp(target, k);

    // Door proximity: leaves swing open ahead of the player and close behind.
    const doorBlockers: Bounds[] = [];
    for (const door of doors) {
      const dx = position.current.x - door.x;
      const dz = position.current.y - door.z;
      const open = Math.hypot(dx, dz) < DOOR_SENSE;
      doorState.current[door.id] = open;
      if (!open) {
        const halfW = door.width / 2;
        doorBlockers.push(
          door.run === "x"
            ? {
                minX: door.x - halfW,
                maxX: door.x + halfW,
                minZ: door.z - 0.09,
                maxZ: door.z + 0.09,
              }
            : {
                minX: door.x - 0.09,
                maxX: door.x + 0.09,
                minZ: door.z - halfW,
                maxZ: door.z + halfW,
              },
        );
      }
    }

    // Resolve each axis separately so the player slides along a wall.
    const nextX = position.current.x + velocity.current.x * dt;
    let blockedX = false;
    for (const c of colliders) {
      if (overlaps(nextX, position.current.y, RADIUS, c)) {
        blockedX = true;
        break;
      }
    }
    if (!blockedX) {
      for (const b of doorBlockers) {
        if (overlaps(nextX, position.current.y, RADIUS, b)) {
          blockedX = true;
          break;
        }
      }
    }
    if (!blockedX) position.current.x = nextX;
    else velocity.current.x = 0;

    const nextZ = position.current.y + velocity.current.y * dt;
    let blockedZ = false;
    for (const c of colliders) {
      if (overlaps(position.current.x, nextZ, RADIUS, c)) {
        blockedZ = true;
        break;
      }
    }
    if (!blockedZ) {
      for (const b of doorBlockers) {
        if (overlaps(position.current.x, nextZ, RADIUS, b)) {
          blockedZ = true;
          break;
        }
      }
    }
    if (!blockedZ) position.current.y = nextZ;
    else velocity.current.y = 0;

    // Jump: a short hop that settles back to the deck.
    if (keys.current.Space && jump.current <= 0) jump.current = 0.42;
    jump.current = Math.max(0, jump.current - dt);
    const hop = Math.sin(Math.min(1, jump.current / 0.42) * Math.PI) * 0.35;

    camera.position.set(position.current.x, spawn[1] + hop, position.current.y);

    // Report room occupancy and position to the console at a low rate.
    const now = performance.now();
    if (now - lastReport.current > 120) {
      lastReport.current = now;
      const room = rooms.find(
        (r) =>
          position.current.x > r.x - r.w / 2 &&
          position.current.x < r.x + r.w / 2 &&
          position.current.y > r.z - r.d / 2 &&
          position.current.y < r.z + r.d / 2,
      );
      const roomId = room?.id ?? null;
      if (roomId !== roomRef.current) {
        roomRef.current = roomId;
        onRoomChange(roomId);
      }
      onPosition(position.current.x, position.current.y, yaw);
    }
  };

  // The renderer's own loop drives movement, so camera updates land in the
  // same frame the scene is drawn.
  useFrame((_, delta) => frame(delta));

  return null;
}

export { EYE_HEIGHT };
