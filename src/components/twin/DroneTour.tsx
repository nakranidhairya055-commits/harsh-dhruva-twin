import { useFrame, useThree } from "@react-three/fiber";
import { Pause, Play, Plane, RotateCcw, SkipBack, SkipForward, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { DroneStop } from "./drone-tours";
import { cn } from "@/lib/utils";

/** Seconds a drone hop takes at 1x speed. */
const HOP_SECONDS = 3.2;

/** Tour state shared between the in-canvas flight and the narration panel. */
export interface DroneTourState {
  stops: DroneStop[];
  index: number;
  playing: boolean;
  speed: number;
  /** True once the drone has settled on the current stop. */
  arrived: boolean;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  toggle: () => void;
  restart: () => void;
  setSpeed: (speed: number) => void;
  markArrived: () => void;
}

/**
 * Owns the drone tour state.
 *
 * The flight (inside the canvas) and the narration panel (DOM) are separate
 * components, so the state lives in this hook and both sides read it. Dwell
 * timing lives here too, which keeps the flight purely about the camera.
 */
export function useDroneTour(stops: DroneStop[]): DroneTourState {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [arrived, setArrived] = useState(false);

  const goTo = useCallback(
    (next: number) => {
      setArrived(false);
      setIndex((current) => {
        if (stops.length === 0) return 0;
        if (next >= stops.length) return stops.length - 1;
        if (next < 0) return 0;
        return next;
      });
    },
    [stops.length],
  );

  const next = useCallback(() => {
    setArrived(false);
    setIndex((current) => {
      if (current + 1 >= stops.length) {
        setPlaying(false);
        return current;
      }
      return current + 1;
    });
  }, [stops.length]);

  const prev = useCallback(() => {
    setArrived(false);
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const restart = useCallback(() => {
    setArrived(false);
    setIndex(0);
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => setPlaying((value) => !value), []);
  const markArrived = useCallback(() => setArrived(true), []);

  // Advance when the dwell on a settled stop expires.
  useEffect(() => {
    if (!playing || !arrived || stops.length === 0) return;
    const dwell = (stops[index]?.dwell ?? 10) / speed;
    const timer = window.setTimeout(() => {
      setArrived(false);
      setIndex((current) => {
        if (current + 1 >= stops.length) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, dwell * 1000);
    return () => window.clearTimeout(timer);
  }, [arrived, playing, stops, index, speed]);

  useEffect(() => {
    if (stops.length === 0) setPlaying(false);
  }, [stops.length]);

  return {
    stops,
    index,
    playing,
    speed,
    arrived,
    goTo,
    next,
    prev,
    toggle,
    restart,
    setSpeed,
    markArrived,
  };
}

/**
 * Drone flight camera.
 *
 * Flies a hop from the current pose to the stop pose, arcing upward between
 * stops the way a multirotor does, then holds a slow hover over the target.
 * The rig replaces the orbit controls while the tour runs, so there is no
 * competing controller writing to the camera.
 */
export function DroneFlight({
  tour,
}: {
  tour: DroneTourState;
}) {
  const camera = useThree((state) => state.camera);
  const { index, speed, stops, markArrived } = tour;
  const stop = stops[index];
  const stopId = stop?.id ?? "";
  const flight = useRef<{
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
    progress: number;
    lift: number;
    reported: boolean;
  } | null>(null);
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (!stop) return;
    const toPos = new THREE.Vector3(...stop.position);
    const toTarget = new THREE.Vector3(...stop.target);
    const fromPos = camera.position.clone();
    flight.current = {
      fromPos,
      fromTarget: lookAt.current.clone(),
      toPos,
      toTarget,
      progress: 0,
      // Higher hops arc more, which reads as a climb out and a descent in.
      lift: THREE.MathUtils.clamp(fromPos.distanceTo(toPos) * 0.16, 6, 42),
      reported: false,
    };
    // `stopId` is the identity of the requested pose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopId, camera]);

  useFrame((_, delta) => {
    const active = flight.current;
    const current = stops[index];
    if (!active || !current) return;
    if (active.progress < 1) {
      active.progress = Math.min(1, active.progress + delta / (HOP_SECONDS / speed));
      const eased =
        active.progress < 0.5
          ? 4 * active.progress ** 3
          : 1 - Math.pow(-2 * active.progress + 2, 3) / 2;
      camera.position.lerpVectors(active.fromPos, active.toPos, eased);
      camera.position.y += Math.sin(Math.PI * eased) * active.lift;
      lookAt.current.lerpVectors(active.fromTarget, active.toTarget, eased);
      camera.lookAt(lookAt.current);
      if (active.progress >= 1 && !active.reported) {
        active.reported = true;
        markArrived();
      }
      return;
    }
    // Hover: a slow drift around the target keeps the shot alive without
    // moving the subject out of frame.
    const t = performance.now() / 1000;
    camera.position.x = active.toPos.x + Math.sin(t * 0.16) * 1.6;
    camera.position.z = active.toPos.z + Math.cos(t * 0.13) * 1.6;
    camera.position.y = active.toPos.y + Math.sin(t * 0.11) * 0.9;
    camera.lookAt(active.toTarget);
  });

  return null;
}

/**
 * Tour narration panel.
 *
 * Progress, controls and the written briefing for the current stop. The panel
 * is the only place the tour is driven from, and every control is a plain
 * button so it works with a keyboard and a touch screen alike.
 */
export function DroneTourPanel({
  tour,
  onExit,
  className,
}: {
  tour: DroneTourState;
  onExit: () => void;
  className?: string;
}) {
  const { stops, index, playing, speed, arrived } = tour;
  const stop = stops[index];
  const [progress, setProgress] = useState(0);

  // Dwell progress bar for the current stop.
  const dwell = stop?.dwell ?? 0;
  useEffect(() => {
    setProgress(0);
    if (!playing || !arrived || dwell === 0) return;
    const started = performance.now();
    const total = (dwell / speed) * 1000;
    const timer = window.setInterval(() => {
      setProgress(Math.min(1, (performance.now() - started) / total));
    }, 90);
    return () => window.clearInterval(timer);
  }, [arrived, playing, dwell, speed, index]);

  if (!stop) return null;
  const complete = !playing && index === stops.length - 1 && arrived;

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-[430px] rounded-md border border-border bg-[#060B14]/92 p-3.5 backdrop-blur",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Plane className="size-3.5 shrink-0 text-primary" />
          <span className="cc-label text-[9px]">Drone tour</span>
          <span className="cc-mono text-[9px] text-muted-foreground">
            stop {index + 1}/{stops.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="cc-mono text-[9px] uppercase tracking-wider text-primary">
          {stop.tag}
        </span>
        <span className="text-[13px] font-semibold leading-tight text-foreground">
          {stop.title}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        {stop.narration}
      </p>

      <ul className="mt-2 space-y-0.5 border-l-2 border-primary/40 pl-2">
        {stop.facts.map((fact) => (
          <li key={fact} className="text-[10px] leading-snug text-foreground/85">
            {fact}
          </li>
        ))}
      </ul>

      <div className="mt-2.5 h-0.5 w-full overflow-hidden rounded bg-border">
        <div
          className="h-full bg-primary transition-[width] duration-100 ease-linear"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={tour.prev}
          disabled={index === 0}
          className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <SkipBack className="size-3" />
          Prev
        </button>
        <button
          type="button"
          onClick={tour.toggle}
          className="flex items-center gap-1 rounded border border-primary/50 bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary"
        >
          {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
          {playing ? "Pause" : complete ? "Replay" : "Play"}
        </button>
        <button
          type="button"
          onClick={tour.next}
          disabled={index >= stops.length - 1}
          className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          Next
          <SkipForward className="size-3" />
        </button>
        <button
          type="button"
          onClick={tour.restart}
          className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          Restart
        </button>
        <div className="ml-auto flex items-center gap-1">
          {[0.5, 1, 2].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => tour.setSpeed(option)}
              className={cn(
                "rounded border px-1.5 py-1 text-[10px] font-semibold",
                speed === option
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {option}x
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[9px] leading-snug text-muted-foreground/80">
        Take control at any time with Free view to orbit, pan and zoom yourself.
      </p>
    </div>
  );
}
