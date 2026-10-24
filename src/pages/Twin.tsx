import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/AppShell";
import { MaitriScene } from "@/components/twin/MaitriScene";
import { BharatiScene } from "@/components/twin/BharatiScene";
import {
  CameraRig,
  TwinCanvas,
  getTwinDisplay,
  setTwinDisplay,
  useTwinDisplay,
  type CameraPreset,
} from "@/components/twin/twin-primitives";
import { DRONE_TOURS } from "@/components/twin/drone-tours";
import { Wildlife } from "@/components/twin/wildlife/Wildlife";
import { WildlifePanel } from "@/components/twin/wildlife/WildlifePanel";
import {
  COLONIES,
  DEV_PROFILE,
  colonyFocus,
  devFocus,
} from "@/components/twin/wildlife/wildlife-data";
import { DroneFlight, DroneTourPanel, useDroneTour } from "@/components/twin/DroneTour";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TwoAndHalfD } from "@/components/twin/TwoAndHalfD";
import { VIEW_MODES, type ViewMode } from "@/components/twin/view-modes";
import { FLEET, VEHICLE_CLASSES, fleetCount, vehiclePosition } from "@/components/twin/VehicleFleet";
import { vehicleInstances, vehicleById } from "@/components/twin/vehicle-data";
import { UnderwaterView } from "@/components/twin/water/UnderwaterView";
import { WATER_BODIES, stationWater } from "@/components/twin/water/water-data";
import { InteriorSystem } from "@/components/twin/interiors/InteriorSystem";
import { adminDeskPlacement } from "@/components/twin/interiors/rooms-ops";
import { WalkController } from "@/components/twin/interiors/WalkController";
import { siteColliders, siteSpawn } from "@/components/twin/site-walk";
import { FieldBadge } from "@/components/twin/FieldBadge";
import {
  clearPinnedLabels,
  usePinnedLabelCount,
} from "@/components/twin/scene-labels";
import {
  award,
  fieldLevel,
  recordDistance,
  recordRoom,
  recordSpecies,
  recordStation,
  useFieldProgress,
} from "@/lib/achievements";
import { floorPlan } from "@/components/twin/interiors/plans";
import type { InspectTarget } from "@/components/twin/interiors/kit";
import { CREW } from "@/components/twin/interiors/plans";
import {
  LakesOverlay,
  ObjectPanel,
  RoomPanel,
  VehiclePanel,
  WaterPanel,
} from "@/components/twin/TwinPanels";
import {
  MiniMap,
  TeleportMenu,
  type TeleportTarget,
} from "@/components/twin/navigation/TwinNav";
import { useBlackout } from "@/hooks/use-blackout";
import { useTimeOfDay, type Season } from "@/hooks/use-time-of-day";
import { useStationLinkContext } from "@/components/StationLinkProvider";
import {
  SUBSYSTEM_LABELS,
  formatAge,
  formatUtc,
  statusClasses,
  stationFromParams,
  type StationSlug,
} from "@/lib/station";
import {
  Box,
  ChevronDown,
  Cpu,
  Crosshair,
  DoorOpen,
  Eye,
  Footprints,
  Grid3x3,
  Layers,
  Loader2,
  Mountain,
  Radio,
  RotateCcw,
  Satellite,
  Thermometer,
  TriangleAlert,
  Video,
  X,
} from "lucide-react";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router";
import { cn } from "@/lib/utils";

/** Camera presets shared by both scenes, including the focus switches. */
const PRESETS: Array<CameraPreset & { station?: StationSlug }> = [
  { id: "overview", label: "Overview", position: [190, 120, 190], target: [0, 0, 0] },
  { id: "maitri", label: "Maitri Focus", position: [70, 38, 82], target: [0, 5, 0], station: "maitri" },
  { id: "bharati", label: "Bharati Focus", position: [72, 44, 84], target: [0, 8, 6], station: "bharati" },
  { id: "aerial", label: "Aerial", position: [60, 360, 80], target: [0, 0, 0] },
  { id: "zoom", label: "Component Zoom", position: [30, 14, -42], target: [16, 2, -26] },
  { id: "lake", label: "Lake Priyadarshini", position: [-58, 42, 92], target: [-58, 0, 36], station: "maitri" },
  { id: "fjord", label: "Thala Fjord", position: [-70, 58, 214], target: [-70, 0, 110], station: "bharati" },
  { id: "bay", label: "Quilty Bay", position: [120, 52, 196], target: [120, 0, 90], station: "bharati" },
];

/** Hotspot detail copy for both stations. */
const HOTSPOT_INFO: Record<string, { name: string; info: string; equipmentId?: string }> = {
  "main-station": {
    name: "Main Station",
    info:
      "Habitation and command core. Click the amber airlock marker on the building to walk inside; every room in the module is modelled and interactive.",
  },
  lake: {
    name: "Lake Priyadarshini",
    info:
      "Water source for the station, 0.297 square kilometres. Click the water surface for depth, ice thickness, purity and the twelve month ice coverage record.",
    equipmentId: "PIPE-MAITRI",
  },
  pipeline: {
    name: "Heated Pipeline",
    info:
      "Carries water from the lake. If trace heating trips, the line can freeze in roughly 45 minutes, so the temperature band is tight and critical alerts page immediately.",
    equipmentId: "PIPE-MAITRI",
  },
  fuel: {
    name: "Fuel Farm",
    info:
      "Bulk fuel storage with hydrocarbon leak detection. Level and leak channels are monitored against environmental safety bands.",
    equipmentId: "FUEL-MAITRI",
  },
  generators: {
    name: "Diesel Generators",
    info:
      "Four 62.5 kVA units carrying the station load. Output per unit is tracked; sustained low output raises a warning incident.",
    equipmentId: "GEN-1",
  },
  weather: {
    name: "Weather Mast",
    info:
      "Automatic weather station: temperature, wind and pressure feed both the environment channels and the decision context across the console.",
    equipmentId: "AWS-MAITRI",
  },
  "summer-camp": {
    name: "Summer Camp",
    info:
      "Containerised accommodation for the summer campaign, when station complement expands well beyond the winter-over crew.",
  },
  chp: {
    name: "CHP Units",
    info:
      "Three combined heat and power units, 100 kVA electrical plus 150 kW thermal each. Output and hot-water loop temperature are both instrumented.",
    equipmentId: "CHP-1",
  },
  seawater: {
    name: "Seawater Pump House",
    info:
      "Draws water through a 450-metre intake. Click the intake line or the bay surface for flow, filter state and trace heating readings.",
    equipmentId: "SWPUMP-BHARATI",
  },
  wastewater: {
    name: "Wastewater Treatment",
    info:
      "On-site treatment before discharge. Instrumented for process health; steam plumes are normal operation.",
  },
  laboratory: {
    name: "Laboratory Module",
    info:
      "Science workspace with regulated power. Silhouettes on the roof are atmospheric instruments serving the research programme.",
  },
  fjord: {
    name: "Thala Fjord",
    info:
      "The fjord Bharati overlooks. Click the water for salinity, ice coverage, depth and the iceberg tracker.",
  },
  bay: {
    name: "Quilty Bay",
    info:
      "Second water body on the shoreline. Forty-four Larsemann lakes are also modelled and individually clickable.",
  },
  "vehicle-fleet": {
    name: "Vehicle Fleet",
    info:
      "Twelve vehicle classes are rendered in the twin. Click any unit to open its maintenance record, fuel state and service interval.",
  },
  helipad: {
    name: "Helipad",
    info:
      "Rotorcraft apron with approach markings and perimeter lighting, used for medical evacuation and remote field party support.",
  },
};

/**
 * Error boundary for the WebGL scene tree.
 *
 * The renderer inside <Canvas> is its own React root, so a fault there is not
 * caught by the app-level boundary and would otherwise take the whole preview
 * down. Failing quiet keeps the command panels usable.
 */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[Twin] 3D scene error, falling back to panels only:", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type ViewKind = "exterior" | "interior" | "isometric" | "drone";

/** Injected camera preset used when a species or the expedition member is picked. */
const WILDLIFE_FOCUS = "wildlife-focus";

/** Injected camera preset used when a body with no preset of its own is picked. */
const WATER_FOCUS = "water-focus";

/** Injected camera preset used when a parked unit is picked from a list. */
const VEHICLE_FOCUS = "vehicle-focus";

/** Digital Twin view: exterior world, walkable interior and isometric cutaway. */
export default function Twin() {
  const [params, setParams] = useSearchParams();
  const slug = stationFromParams(params);
  const stationLabel = slug === "maitri" ? "Maitri" : "Bharati";
  const latitude = slug === "maitri" ? -70.7644 : -69.4114;

  const [view, setView] = useState<ViewKind>("exterior");
  const [deckView, setDeckView] = useState<"walk" | "deck">("walk");
  const [level, setLevel] = useState(0);
  const [spawn, setSpawn] = useState<[number, number, number]>([0, 1.7, 0]);
  const [locked, setLocked] = useState(false);
  const [position, setPosition] = useState({ x: 0, z: 0, yaw: 0 });
  const [roomId, setRoomId] = useState<string | null>(null);
  /** Walking the ground outside the station, an alternative to orbiting it. */
  const [siteWalk, setSiteWalk] = useState(false);
  const siteDoorState = useRef<Record<string, boolean>>({});
  /** Collision boxes and spawn point for the site walk, one set per station. */
  const siteWalkColliders = useMemo(() => siteColliders(slug), [slug]);
  const siteWalkSpawn = useMemo(() => siteSpawn(slug), [slug]);
  const [lightsOut, setLightsOut] = useState<Record<string, boolean>>({});
  const [inspect, setInspect] = useState<InspectTarget | null>(null);
  const [activeVehicle, setActiveVehicle] = useState<string | null>(null);
  const [runningVehicles, setRunningVehicles] = useState<string[]>([]);
  const [activeWater, setActiveWater] = useState<string | null>(null);
  const [submergedWater, setSubmergedWater] = useState<string | null>(null);
  const [trackedWater, setTrackedWater] = useState<string | null>(null);
  const [lakesOpen, setLakesOpen] = useState(false);
  const [teleportOpen, setTeleportOpen] = useState(false);

  const [preset, setPreset] = useState("overview");
  const [viewMode, setViewMode] = useState<ViewMode>("exterior");
  const [active, setActive] = useState<string | null>(null);
  /** Bumped on every explicit camera request so a preset can re-fly. */
  const [flyKey, setFlyKey] = useState(0);
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const display = useTwinDisplay();
  /** Labels the operator pinned by clicking objects in the scene. */
  const pinnedLabelCount = usePinnedLabelCount();
  const drone = useDroneTour(DRONE_TOURS[slug]);

  const time = useTimeOfDay(latitude);
  const readingsRaw = useQuery(api.telemetry.getLiveReadings, { slug });
  const blackout = useBlackout(slug);
  const link = useStationLinkContext();

  const readings = useMemo(
    () =>
      (readingsRaw ?? []).map((r) => ({
        equipmentId: r.equipmentId,
        parameter: r.parameter,
        value: r.value,
        unit: r.unit,
        decimals: r.decimals,
        status: r.status,
      })),
    [readingsRaw],
  );

  const plan = floorPlan(slug, level);
  const room = plan?.rooms.find((r) => r.id === roomId) ?? null;
  const water = activeWater ? WATER_BODIES[activeWater] : null;
  const submergedBody = submergedWater ? WATER_BODIES[submergedWater] : null;
  /** The body currently shown in the water panel, dive included. */
  const displayBody = submergedBody ?? water;
  const vehicle = activeVehicle ? vehicleById(activeVehicle) : null;

  const crewHere = useMemo(() => {
    if (!room) return [];
    return (CREW[slug] ?? [])
      .filter((c) => c.level === level && c.route.roomIds.includes(room.id))
      .map((c) => c.name);
  }, [room, slug, level]);

  const liveWater = useMemo(() => {
    if (!displayBody?.live) return null;
    const match = (readingsRaw ?? []).find(
      (r) =>
        r.equipmentId === displayBody.live?.tag &&
        r.parameter === displayBody.live?.parameter,
    );
    if (!match) return null;
    return {
      value: match.value,
      unit: match.unit,
      decimals: match.decimals,
      status: match.status,
    };
  }, [readingsRaw, displayBody]);

  const reconciliation = blackout.reconciliation ?? blackout.lastReconciliation;
  const activeMode = VIEW_MODES.find((m) => m.id === viewMode) ?? VIEW_MODES[0];

  /* ---------------------------------------------------------------- */
  /* Navigation                                                        */
  /* ---------------------------------------------------------------- */

  const teleportTargets = useMemo<TeleportTarget[]>(() => {
    const targets: TeleportTarget[] = [];
    for (const floor of [0, 1]) {
      const floorDef = floorPlan(slug, floor);
      if (!floorDef) continue;
      targets.push({
        id: `deck-${floor}`,
        label: `Deck ${floor + 1} landing`,
        group: "Interior",
        level: floor,
        spawn: floorDef.spawn,
      });
      for (const r of floorDef.rooms) {
        targets.push({
          id: `room-${floor}-${r.id}`,
          label: `${r.name} (deck ${floor + 1})`,
          group: "Interior",
          level: floor,
          spawn: [r.x, floorDef.y + 1.7, r.z],
        });
      }
    }
    for (const body of stationWater(slug)) {
      targets.push({
        id: `water-${body.id}`,
        label: body.name,
        group: "Water",
        waterId: body.id,
      });
    }
    for (const unit of vehicleInstances(slug)) {
      targets.push({ id: `vehicle-${unit.id}`, label: unit.label, group: "Vehicle", vehicleId: unit.id });
    }
    for (const p of PRESETS) {
      targets.push({ id: `preset-${p.id}`, label: p.label, group: "Exterior", preset: p.id });
    }
    return targets;
  }, [slug]);

  /**
   * Request a camera pose. The rig flies there once and then releases the
   * camera completely, so free orbiting always wins over the last preset.
   */
  const flyTo = useCallback((id: string) => {
    setPreset(id);
    setFlyKey((key) => key + 1);
  }, []);

  /**
   * Camera pose for the selected animal or for the expedition member.
   * Colony positions come from the wildlife catalogue, so the flight always
   * lands on the group the operator actually clicked.
   */
  const wildlifePose = useMemo(() => {
    if (!speciesId) return null;
    if (speciesId === DEV_PROFILE.id) return devFocus(slug);
    const colony = (COLONIES[slug] ?? []).find((entry) => entry.speciesId === speciesId);
    return colony ? colonyFocus(colony) : null;
  }, [speciesId, slug]);

  /** Select an animal in the scene and fly the camera onto its group. */
  const selectWildlife = useCallback(
    (id: string) => {
      setSpeciesId(id);
      recordSpecies(id);
      if (id === DEV_PROFILE.id) award("dev-outside");
      setActive(null);
      setInspect(null);
      if (view === "drone") setView("exterior");
      setPreset(WILDLIFE_FOCUS);
      setFlyKey((key) => key + 1);
    },
    [view],
  );

  /**
   * Interior clicks.
   *
   * Every fixture reports itself to the inspector as before, and the twin admin
   * desk additionally opens the expedition member's profile, so the same card
   * follows him from the penguin colony to his desk indoors.
   */
  const handleInteriorInspect = useCallback((target: InspectTarget) => {
    setInspect(target);
    if (target.kind === "twin-admin-desk") {
      setSpeciesId(DEV_PROFILE.id);
      award("dev-desk");
    }
  }, []);

  /**
   * Open a structure picked on the station plot.
   *
   * The plot block carries the hotspot id, so clicking it selects the object and
   * flies the camera to the matching viewpoint when one exists.
   */
  const openPlotObject = useCallback(
    (hotspotId: string) => {
      setView("exterior");
      setSubmergedWater(null);
      setActive(hotspotId);
      setInspect(null);
      const presetFor: Record<string, string> = {
        "main-station": slug === "maitri" ? "maitri" : "bharati",
        lake: "lake",
        fjord: "fjord",
        bay: "bay",
      };
      const next = presetFor[hotspotId];
      if (next) flyTo(next);
    },
    [flyTo, slug],
  );

  const applyTarget = useCallback(
    (target: TeleportTarget) => {
      setTeleportOpen(false);
      award("teleport");
      if (target.preset) {
        const presetDef = PRESETS.find((p) => p.id === target.preset);
        if (presetDef?.station && presetDef.station !== slug) {
          setParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.set("station", presetDef.station as string);
              return next;
            },
            { replace: true },
          );
        }
        setView("exterior");
        setSubmergedWater(null);
        flyTo(target.preset);
      }
      if (target.level !== undefined && target.spawn) {
        setView("interior");
        setDeckView("walk");
        setLevel(target.level);
        setSpawn(target.spawn);
        setRoomId(null);
      }
      if (target.waterId) {
        setView("exterior");
        setSubmergedWater(null);
        setActiveWater(target.waterId);
        const body = WATER_BODIES[target.waterId];
        const matching =
          body?.kind === "fjord" ? "fjord" : body?.kind === "bay" ? "bay" : "lake";
        if (body?.station === slug) flyTo(matching);
      }
      if (target.vehicleId) {
        setView("exterior");
        setActiveVehicle(target.vehicleId);
        setInspect(null);
        flyTo(VEHICLE_FOCUS);
      }
    },
    [flyTo, setParams, slug],
  );

  const applyPreset = useCallback(
    (next: CameraPreset & { station?: StationSlug }) => {
      if (next.station && next.station !== slug) {
        setParams(
          (prev) => {
            const params2 = new URLSearchParams(prev);
            params2.set("station", next.station as string);
            return params2;
          },
          { replace: true },
        );
      }
      setView("exterior");
      setSubmergedWater(null);
      flyTo(next.id);
    },
    [flyTo, setParams, slug],
  );

  const enterInterior = useCallback(() => {
    const ground = floorPlan(slug, 0);
    setSiteWalk(false);
    setView("interior");
    setDeckView("walk");
    setLevel(0);
    setRoomId(null);
    setInspect(null);
    setSpawn(ground?.spawn ?? [0, 1.7, 0]);
    award("inside");
  }, [slug]);

  const leaveInterior = useCallback(() => {
    setView("exterior");
    setLocked(false);
    setRoomId(null);
    setInspect(null);
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  /** Brief confirmation whenever the label shortcut is pressed. */
  const [togglesHint, setTogglesHint] = useState(false);
  useEffect(() => {
    if (!togglesHint) return;
    const timer = window.setTimeout(() => setTogglesHint(false), 2200);
    return () => window.clearTimeout(timer);
  }, [togglesHint]);

  /* Keyboard shortcuts: T teleport, L toggles every label, Esc leaves walk mode. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;
      if (e.code === "KeyT") setTeleportOpen((v) => !v);
      // One key to strip every floating label off the scene and put it back.
      if (e.code === "KeyL") {
        setTwinDisplay({ labels: !getTwinDisplay().labels });
        setTogglesHint(true);
      }
      // Esc also takes every label the operator pinned by clicking back off.
      if (e.code === "Escape" && !locked) clearPinnedLabels();
      if (e.code === "Escape" && view === "interior" && deckView === "walk" && !locked) {
        leaveInterior();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deckView, leaveInterior, locked, view]);

  /**
   * Walking suppresses floating labels entirely until the operator asks for
   * them again from the Layers menu, so walk mode is never covered by the
   * nameplates that used to stay on screen.
   */
  useEffect(() => {
    setTwinDisplay({ walkMode: locked });
  }, [locked]);

  /** The overhead deck plan keeps its room plates even with titles off. */
  useEffect(() => {
    setTwinDisplay({ deckPlan: view === "interior" && deckView === "deck" });
  }, [view, deckView]);

  /** A station switch restarts the tour so every pose matches the site. */
  const restartDrone = drone.restart;
  useEffect(() => {
    restartDrone();
  }, [slug, restartDrone]);

  /**
   * Entering the drone view starts the tour from the top; leaving it pauses the
   * tour so it is not running unseen behind another screen.
   */
  const previousView = useRef<ViewKind>("exterior");
  const droneRef = useRef(drone);
  droneRef.current = drone;
  useEffect(() => {
    const wasDrone = previousView.current === "drone";
    previousView.current = view;
    if (view === "drone" && !wasDrone) {
      droneRef.current.restart();
      return;
    }
    if (view !== "drone" && wasDrone && droneRef.current.playing) {
      droneRef.current.toggle();
    }
  }, [view]);

  const onWaterAction = useCallback(
    (bodyId: string, action: { id: string; label: string }) => {
      switch (action.id) {
        case "underwater":
          setView("exterior");
          setSubmergedWater((current) => (current === bodyId ? null : bodyId));
          break;
        case "icebergs":
        case "floes":
          setTrackedWater((current) => (current === bodyId ? null : bodyId));
          break;
        case "lakes":
          setLakesOpen((open) => !open);
          break;
        default:
          setActiveWater(bodyId);
          break;
      }
    },
    [],
  );

  const toggleEngine = useCallback((id: string) => {
    setRunningVehicles((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );
  }, []);

  /**
   * The Larsemann lakelets and the parked units have no entry in the fixed
   * preset list, so picking one appends a focus preset aimed at its own world
   * coordinates. Everything else flies along the standard list.
   */
  const cameraPresets = useMemo<CameraPreset[]>(() => {
    if (preset === WILDLIFE_FOCUS && wildlifePose) {
      return [
        ...PRESETS,
        {
          id: WILDLIFE_FOCUS,
          label: speciesId === DEV_PROFILE.id ? DEV_PROFILE.name : "Wildlife",
          position: wildlifePose.position,
          target: wildlifePose.target,
        },
      ];
    }
    if (preset === WATER_FOCUS && water) {
      const [x, z] = water.position;
      return [
        ...PRESETS,
        {
          id: WATER_FOCUS,
          label: water.name,
          position: [x + 26, 24, z + 26],
          target: [x, 0, z],
        },
      ];
    }
    if (preset === VEHICLE_FOCUS && activeVehicle) {
      const station = activeVehicle.startsWith("maitri") ? "maitri" : "bharati";
      const at = vehiclePosition(station, activeVehicle);
      if (at) {
        return [
          ...PRESETS,
          {
            id: VEHICLE_FOCUS,
            label: "Yard unit",
            position: [at[0] + 13, 7, at[1] + 13],
            target: [at[0], 1, at[1]],
          },
        ];
      }
    }
    return PRESETS;
  }, [preset, water, activeVehicle, wildlifePose, speciesId]);

  /** Sun state memoised on its primitives so the scene element stays stable. */
  const sun = useMemo(
    () => ({
      position: time.position,
      intensity: time.intensity,
      night: time.night,
      label: time.label,
      auroraOpacity: time.auroraOpacity,
    }),
    [time.position, time.intensity, time.night, time.label, time.auroraOpacity],
  );

  const handleVehicleSelect = useCallback((id: string) => {
    setActiveVehicle(id);
    setInspect(null);
  }, []);

  /** Select a parked unit from a list and fly the camera to its bay. */
  const focusVehicle = useCallback(
    (id: string) => {
      setView("exterior");
      setSubmergedWater(null);
      setActiveVehicle(id);
      setInspect(null);
      flyTo(VEHICLE_FOCUS);
    },
    [flyTo],
  );

  const closeVehicle = useCallback(() => {
    setActiveVehicle(null);
    setPreset((current) => (current === VEHICLE_FOCUS ? "overview" : current));
  }, []);

  const handleLevel = useCallback(
    (next: number) => {
      const nextPlan = floorPlan(slug, next);
      setLevel(next);
      setSpawn(nextPlan?.spawn ?? [0, 1.7, 0]);
      setRoomId(null);
    },
    [slug],
  );

  const handlePosition = useCallback((x: number, z: number, yaw: number) => {
    setPosition({ x, z, yaw });
  }, []);

  /** Room changes are also badge progress: ten rooms, then twenty-five. */
  const handleRoomChange = useCallback(
    (id: string | null) => {
      setRoomId(id);
      if (id) recordRoom(`${slug}:${id}`);
    },
    [slug],
  );

  /**
   * Steps taken outside count towards the field badge. The walk controller
   * reports its position every 120 ms, so a stride is the distance between two
   * of those reports while the site walk is running.
   */
  const lastWalkStep = useRef<{ x: number; z: number } | null>(null);
  useEffect(() => {
    if (!siteWalk) {
      lastWalkStep.current = null;
      return;
    }
    const last = lastWalkStep.current;
    lastWalkStep.current = { x: position.x, z: position.z };
    if (!last) return;
    const step = Math.hypot(position.x - last.x, position.z - last.z);
    // Ignore the teleport-sized jump of a fresh spawn or a station switch.
    if (step > 0.05 && step < 24) recordDistance(step);
  }, [position, siteWalk]);

  /** Both stations count towards the field badge. */
  useEffect(() => {
    recordStation(slug);
  }, [slug]);

  /** Three distinct tour stops watched earns the narrated-survey badge. */
  const watchedStops = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (view !== "drone") return;
    watchedStops.current.add(drone.index);
    if (watchedStops.current.size >= 3) award("tour");
  }, [view, drone.index]);

  /** The cutaway badge is won by opening the 2.5D lens. */
  useEffect(() => {
    if (view === "isometric") award("cutaway");
  }, [view]);

  /** Field badge progress, read by the rail card and the walk plate. */
  const badgeProgress = useFieldProgress();
  const badgeLevel = fieldLevel(badgeProgress.xp);

  /**
   * The site walk only exists in the exterior view: changing view, diving
   * under water or entering the station releases the pointer and puts the
   * camera back under orbit control.
   */
  useEffect(() => {
    if (!siteWalk) return;
    if (view !== "exterior" || submergedBody) {
      setSiteWalk(false);
      setLocked(false);
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }, [siteWalk, view, submergedBody]);

  /**
   * Any requested camera flight ends a walk in progress: the orbit rig owns
   * the camera again, so a preset, a minimap click or a species focus all
   * release the pointer instead of fighting a controller that is moving the
   * camera every frame.
   */
  const lastFlightRequest = useRef(`${preset}:${flyKey}`);
  useEffect(() => {
    const current = `${preset}:${flyKey}`;
    const changed = lastFlightRequest.current !== current;
    lastFlightRequest.current = current;
    if (!changed || !siteWalk) return;
    setSiteWalk(false);
    setLocked(false);
    if (document.pointerLockElement) document.exitPointerLock();
  }, [preset, flyKey, siteWalk]);

  /** Wall switches live here so the room panel reports the real light state. */
  const toggleRoomLights = useCallback((id: string) => {
    setLightsOut((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Room ids repeat between the stations, so a switch thrown at Maitri must
  // not darken the same-named room at Bharati.
  useEffect(() => {
    setLightsOut({});
  }, [slug]);

  /**
   * The exterior scene is memoised on its real inputs. Walking inside the
   * station updates the player position several times a second, and without
   * this the whole station scene would re-render with every step.
   */
  const exteriorScene = useMemo(
    () =>
      slug === "maitri" ? (
        <MaitriScene
          readings={readings}
          onSelect={setActive}
          activeHotspot={active}
          viewMode={viewMode}
          sun={sun}
          onWaterSelect={setActiveWater}
          activeWater={activeWater}
          submergedWater={submergedWater}
          trackedWater={trackedWater}
          onVehicleSelect={handleVehicleSelect}
          activeVehicle={activeVehicle}
          onEnterBuilding={enterInterior}
        />
      ) : (
        <BharatiScene
          readings={readings}
          onSelect={setActive}
          activeHotspot={active}
          viewMode={viewMode}
          sun={sun}
          onWaterSelect={setActiveWater}
          activeWater={activeWater}
          submergedWater={submergedWater}
          trackedWater={trackedWater}
          showLakes={lakesOpen}
          onVehicleSelect={handleVehicleSelect}
          activeVehicle={activeVehicle}
          onEnterBuilding={enterInterior}
        />
      ),
    [
      slug,
      readings,
      active,
      viewMode,
      sun,
      activeWater,
      submergedWater,
      trackedWater,
      lakesOpen,
      activeVehicle,
      handleVehicleSelect,
      enterInterior,
    ],
  );

  /**
   * Wildlife layer, shared between the free-view canvas and the drone canvas,
   * memoised so a walking player never rebuilds the colonies.
   */
  const wildlifeScene = useMemo(
    () => (
      <Wildlife slug={slug} activeId={speciesId} onSelect={selectWildlife} />
    ),
    [slug, speciesId, selectWildlife],
  );

  /** The furnished deck, memoised so a step does not rebuild every room. */
  const interiorScene = useMemo(
    () => (
      <InteriorSystem
        slug={slug}
        level={level}
        view={deckView}
        spawn={spawn}
        onInspect={handleInteriorInspect}
        onLevel={handleLevel}
        onRoomChange={handleRoomChange}
        onPosition={handlePosition}
        onLockChange={setLocked}
        onExitWalk={leaveInterior}
        lightsOut={lightsOut}
        onToggleLights={toggleRoomLights}
      />
    ),
    [
      slug,
      level,
      deckView,
      spawn,
      lightsOut,
      handleLevel,
      handlePosition,
      handleRoomChange,
      handleInteriorInspect,
      leaveInterior,
      toggleRoomLights,
    ],
  );

  const interior = view === "interior";
  const underwater = Boolean(submergedBody);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="cc-label">Digital Twin</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {stationLabel} 3D twin
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              One interactive world: orbitable terrain outside with a walkable apron, the survey
              grid and range rings over the ground, every room of the station walkable inside,
              every water body clickable, every vehicle modelled with its own maintenance record,
              twenty-two species of wildlife and a field badge that tracks what you have seen and
              done. Free camera by default, a narrated drone tour, seven view modes, a 2.5D
              cutaway, a time of day slider, a ten second seasonal timelapse, and every floating
              label removable with a single key.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
              {(
                [
                  { id: "exterior", label: "Exterior", icon: Mountain },
                  { id: "drone", label: "Drone Tour", icon: Video },
                  { id: "interior", label: "Interior", icon: DoorOpen },
                  { id: "isometric", label: "2.5D", icon: Layers },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.id}
                    variant="ghost"
                    size="sm"
                    className={cn("text-xs", view === option.id && "bg-primary/15 text-primary")}
                    onClick={() => {
                      if (option.id === "interior") enterInterior();
                      else {
                        setView(option.id);
                        if (option.id !== "exterior") setSubmergedWater(null);
                      }
                    }}
                  >
                    <Icon className="mr-1.5 size-3.5" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
              {(["maitri", "bharati"] as const).map((s) => (
                <Button
                  key={s}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn("cursor-pointer text-xs", slug === s && "bg-primary/15 text-primary")}
                >
                  <a href={`/twin?station=${s}`}>{s === "maitri" ? "Maitri" : "Bharati"}</a>
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className={cn("text-xs", teleportOpen && "border-primary/60 text-primary")}
              onClick={() => setTeleportOpen((v) => !v)}
            >
              <Crosshair className="mr-1.5 size-3.5" />
              Teleport
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Viewport */}
          <Card className="cc-panel border-border p-0 shadow-none lg:col-span-3">
            <div className="relative h-[620px] w-full overflow-hidden rounded-lg">
              <SceneBoundary>
                <Suspense fallback={null}>
                  {view === "isometric" ? (
                    <TwoAndHalfD
                      slug={slug}
                      readings={readings}
                      onSelect={setActive}
                      activeHotspot={active}
                    />
                  ) : view === "interior" ? (
                    <TwinCanvas fogColor="#05080D" fogNear={30} fogFar={120} cameraPosition={[0, 1.7, 0]}>
                      {interiorScene}
                    </TwinCanvas>
                  ) : view === "drone" ? (
                    <TwinCanvas
                      fogColor="#0B1622"
                      fogNear={180}
                      fogFar={420}
                      cameraPosition={DRONE_TOURS[slug][0].position}
                    >
                      {exteriorScene}
                      {wildlifeScene}
                      <DroneFlight tour={drone} />
                    </TwinCanvas>
                  ) : (
                    <TwinCanvas
                      fogColor={underwater ? "#04141F" : "#0B1622"}
                      fogNear={underwater ? 4 : 180}
                      fogFar={underwater ? 90 : 420}
                      cameraPosition={[150, 95, 150]}
                    >
                      {exteriorScene}
                      {wildlifeScene}
                      {submergedBody ? (
                        <UnderwaterView def={submergedBody} />
                      ) : siteWalk ? (
                        <WalkController
                          spawn={siteWalkSpawn}
                          colliders={siteWalkColliders}
                          doors={[]}
                          rooms={[]}
                          doorState={siteDoorState}
                          onExit={() => setSiteWalk(false)}
                          onLockChange={setLocked}
                          onRoomChange={() => undefined}
                          onPosition={handlePosition}
                        />
                      ) : (
                        <CameraRig preset={preset} presets={cameraPresets} flyKey={flyKey} />
                      )}
                    </TwinCanvas>
                  )}
                </Suspense>
              </SceneBoundary>

              {/* Underwater tint */}
              {underwater && (
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(159,228,255,0.22),rgba(4,20,31,0.85))]" />
              )}

              {/*
                Scene toolbar.

                The seven view modes, the camera presets and the scene layers
                live in three compact menus instead of three open columns, so
                the viewport stays readable while every control is still one
                click away.
              */}
              {view === "exterior" && !underwater && (
                <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded border border-border bg-[#060B14]/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur transition-colors hover:border-primary/40"
                      >
                        <Eye className="size-3" />
                        {activeMode.label}
                        <ChevronDown className="size-3 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        View mode
                      </DropdownMenuLabel>
                      {VIEW_MODES.map((mode) => (
                        <DropdownMenuItem
                          key={mode.id}
                          className="flex flex-col items-start gap-0.5"
                          onSelect={() => setViewMode(mode.id)}
                        >
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              viewMode === mode.id && "text-primary",
                            )}
                          >
                            {mode.label}
                          </span>
                          <span className="text-[10px] leading-snug text-muted-foreground">
                            {mode.hint}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded border border-border bg-[#060B14]/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur transition-colors hover:border-primary/40"
                      >
                        <Crosshair className="size-3" />
                        Camera
                        <ChevronDown className="size-3 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Fly to a viewpoint
                      </DropdownMenuLabel>
                      {PRESETS.map((p) => (
                        <DropdownMenuItem key={p.id} onSelect={() => applyPreset(p)}>
                          <span
                            className={cn("text-xs", preset === p.id && "text-primary")}
                          >
                            {p.label}
                          </span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => flyTo("overview")}>
                        <RotateCcw className="mr-2 size-3" />
                        <span className="text-xs">Reset to overview</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded border border-border bg-[#060B14]/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur transition-colors hover:border-primary/40"
                      >
                        <Grid3x3 className="size-3" />
                        Layers
                        <ChevronDown className="size-3 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Scene layers
                      </DropdownMenuLabel>
                      <DropdownMenuCheckboxItem
                        checked={display.labels}
                        onCheckedChange={(value) => setTwinDisplay({ labels: Boolean(value) })}
                      >
                        <span className="text-xs">Telemetry and object labels</span>
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={display.titles}
                        onCheckedChange={(value) => setTwinDisplay({ titles: Boolean(value) })}
                      >
                        <span className="text-xs">Place titles and telemetry strips</span>
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuItem
                        disabled={pinnedLabelCount === 0}
                        onSelect={() => clearPinnedLabels()}
                      >
                        <span className="text-xs">
                          {pinnedLabelCount === 0
                            ? "No clicked labels to remove"
                            : `Remove ${pinnedLabelCount} clicked label${pinnedLabelCount === 1 ? "" : "s"}`}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuCheckboxItem
                        checked={display.survey}
                        onCheckedChange={(value) => setTwinDisplay({ survey: Boolean(value) })}
                      >
                        <span className="text-xs">Survey grid, rings and contours</span>
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={display.hotspots}
                        onCheckedChange={(value) => setTwinDisplay({ hotspots: Boolean(value) })}
                      >
                        <span className="text-xs">Hotspot markers</span>
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={display.wildlife}
                        onCheckedChange={(value) => setTwinDisplay({ wildlife: Boolean(value) })}
                      >
                        <span className="text-xs">Wildlife and expedition member</span>
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={display.wildlifeLabels}
                        onCheckedChange={(value) =>
                          setTwinDisplay({ wildlifeLabels: Boolean(value) })
                        }
                      >
                        <span className="text-xs">Species name labels</span>
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() =>
                          setTwinDisplay({
                            labels: true,
                            titles: true,
                            survey: true,
                            hotspots: true,
                            wildlife: true,
                            wildlifeLabels: true,
                          })
                        }
                      >
                        <span className="text-xs">Show every layer</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <button
                    type="button"
                    onClick={() => {
                      if (siteWalk) {
                        setSiteWalk(false);
                        setLocked(false);
                        if (document.pointerLockElement) document.exitPointerLock();
                        setPreset("overview");
                        setFlyKey((key) => key + 1);
                      } else {
                        setSubmergedWater(null);
                        setSiteWalk(true);
                      }
                    }}
                    title="Walk the ground outside the station"
                    className={cn(
                      "flex items-center gap-1.5 rounded border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur transition-colors",
                      siteWalk
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border bg-[#060B14]/80 text-foreground hover:border-primary/40",
                    )}
                  >
                    <Footprints className="size-3" />
                    {siteWalk ? "Orbit view" : "Walk the site"}
                  </button>

                  <span className="cc-mono rounded border border-[#00E0C6]/30 bg-[#060B14]/80 px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#00E0C6] backdrop-blur">
                    free view
                  </span>
                  <button
                    type="button"
                    onClick={() => setTwinDisplay({ labels: !display.labels })}
                    title="Remove every floating label (L)"
                    className={cn(
                      "cc-mono rounded border px-2.5 py-1 text-[10px] uppercase tracking-wider backdrop-blur transition-colors",
                      display.labels
                        ? "border-border bg-[#060B14]/80 text-muted-foreground hover:text-foreground"
                        : "border-[#00E0C6]/40 bg-[#060B14]/80 text-[#7DF3E4]",
                    )}
                  >
                    labels {display.labels ? "on" : "off"}
                  </button>
                  {/* Clicked labels: the count, and one click to clear them (Esc). */}
                  {pinnedLabelCount > 0 && (
                    <button
                      type="button"
                      onClick={() => clearPinnedLabels()}
                      title="Remove every label you opened by clicking (Esc)"
                      className="cc-mono flex items-center gap-1.5 rounded border border-[#FFB020]/40 bg-[#060B14]/80 px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#FFB020] backdrop-blur transition-colors hover:border-[#FFB020]/80"
                    >
                      <X className="size-3" />
                      clear {pinnedLabelCount} label{pinnedLabelCount === 1 ? "" : "s"}
                    </button>
                  )}
                </div>
              )}

              {/* Connectivity overlay */}
              <div
                className={cn(
                  "absolute right-3 top-3 rounded border px-3 py-2 backdrop-blur",
                  blackout.active
                    ? "border-[#FF3B47]/70 bg-[#3A1218]/85"
                    : "border-[#00E0C6]/40 bg-[#060B14]/80",
                )}
              >
                <div className="flex items-center gap-2">
                  <Satellite
                    className={cn("size-3.5", blackout.active ? "text-[#FF3B47]" : "text-[#3EE07F]")}
                  />
                  <span className="cc-label text-[9px]">
                    {blackout.active ? "BLACKOUT" : "VSAT NOMINAL"}
                  </span>
                </div>
                <div className="cc-mono mt-1 text-[10px] text-foreground">
                  {blackout.active
                    ? `restore in ${blackout.remainingSec}s`
                    : `drop predicted in ${blackout.minutesToDrop} min - ${blackout.confidence}% confidence`}
                </div>
                <div className="cc-mono text-[9px] text-muted-foreground">
                  MQTT {link.status} - {link.pending} queued
                </div>
              </div>

              {/* Transitions */}


              {/* Blackout border */}
              {blackout.active && (
                <div className="pointer-events-none absolute inset-0 animate-pulse rounded-lg ring-4 ring-inset ring-[#FF3B47]" />
              )}

              {/* Interior controls */}
              {interior && (
                <div className="absolute left-3 top-3 flex flex-col gap-1">
                  <span className="cc-label px-1 pb-0.5 text-[9px]">Deck</span>
                  {[0, 1].map((deck) => (
                    <button
                      key={deck}
                      type="button"
                      onClick={() => {
                        const nextPlan = floorPlan(slug, deck);
                        setLevel(deck);
                        setSpawn(nextPlan?.spawn ?? [0, 1.7, 0]);
                        setRoomId(null);
                      }}
                      className={cn(
                        "rounded border px-2.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wider backdrop-blur",
                        level === deck
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border bg-[#060B14]/70 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Deck {deck + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDeckView((v) => (v === "walk" ? "deck" : "walk"))}
                    className={cn(
                      "rounded border px-2.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wider backdrop-blur",
                      deckView === "deck"
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border bg-[#060B14]/70 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {deckView === "walk" ? "Deck plan" : "Walk mode"}
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 text-[10px]"
                    onClick={() => setTwinDisplay({ labels: !display.labels })}
                  >
                    {display.labels ? "Hide labels" : "Show labels"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 text-[10px]"
                    onClick={leaveInterior}
                  >
                    Exit to apron
                  </Button>
                </div>
              )}

              {/* Walk mode plate */}
              {interior && deckView === "walk" && (
                <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
                  {locked ? (
                    <div className="relative flex size-10 items-center justify-center">
                      <span className="absolute h-px w-8 bg-primary/70" />
                      <span className="absolute h-8 w-px bg-primary/70" />
                      <span className="size-1.5 rounded-full bg-primary" />
                    </div>
                  ) : (
                    <div className="rounded border border-border bg-[#060B14]/90 px-5 py-4 text-center backdrop-blur">
                      <div className="flex items-center justify-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-foreground">
                        <Footprints className="size-4 text-primary" />
                        Click anywhere to look around
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        WASD to move - mouse to look - Shift to sprint - Space to jump -
                        doors open as you approach - click objects with the crosshair -
                        Esc to release the pointer
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Label toggle confirmation (L) */}
              {togglesHint && (
                <div className="pointer-events-none absolute left-1/2 top-14 -translate-x-1/2">
                  <span className="cc-mono rounded border border-[#00E0C6]/40 bg-[#060B14]/90 px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#7DF3E4] backdrop-blur">
                    {display.labels ? "press L to hide every label - red cross removes one" : "labels off - press L to restore"}
                  </span>
                </div>
              )}

              {/* Site walk plate: the ground-level view outside the station */}
              {view === "exterior" && siteWalk && (
                <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
                  {locked ? (
                    <div className="relative flex size-10 items-center justify-center">
                      <span className="absolute h-px w-8 bg-primary/70" />
                      <span className="absolute h-8 w-px bg-primary/70" />
                      <span className="size-1.5 rounded-full bg-primary" />
                    </div>
                  ) : (
                    <div className="rounded border border-border bg-[#060B14]/90 px-5 py-4 text-center backdrop-blur">
                      <div className="flex items-center justify-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-foreground">
                        <Footprints className="size-4 text-primary" />
                        Click to walk the site
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        WASD to walk - mouse to look - Shift to sprint - Space to jump -
                        Esc releases the pointer - click the amber airlock marker to go inside
                      </p>
                      <p className="cc-mono mt-2 text-[10px] text-muted-foreground">
                        {Math.round(badgeProgress.walked)} m on foot - level {badgeLevel}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 text-[10px]"
                        onClick={() => {
                          setSiteWalk(false);
                          setPreset("overview");
                          setFlyKey((key) => key + 1);
                        }}
                      >
                        Back to orbit view
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Teleport menu */}
              <TeleportMenu
                open={teleportOpen}
                targets={teleportTargets}
                onTeleport={applyTarget}
                onClose={() => setTeleportOpen(false)}
              />

              {/* Mini-map */}
              <div className="absolute bottom-3 right-3 w-56">
                <MiniMap
                  slug={slug}
                  mode={underwater ? "underwater" : interior ? "interior" : "exterior"}
                  level={level}
                  position={position}
                  activeWater={activeWater}
                  onTeleport={applyTarget}
                  onSelectObject={openPlotObject}
                  onSelectWater={(bodyId) => {
                    setView("exterior");
                    setSubmergedWater(null);
                    setActiveWater(bodyId);
                    flyTo(WATER_FOCUS);
                  }}
                />
              </div>

              {/* Drone tour narration */}
              {view === "drone" && (
                <div className="absolute bottom-3 left-3">
                  <DroneTourPanel tour={drone} onExit={() => setView("exterior")} />
                </div>
              )}

              {/* Legend and context line, merged into one block */}
              {view !== "drone" && (
                <div className="absolute bottom-3 left-3 max-w-[420px] rounded border border-border bg-[#060B14]/80 px-3 py-1.5 backdrop-blur">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="size-2 rounded-full bg-[#00E0C6]" /> Hotspot
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="size-2 rounded-full bg-[#FFB020]" /> Airlock
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="size-2 rounded-full bg-[#FF3B47]" /> Selected
                    </span>
                    <span className="cc-label text-[9px]">
                      {underwater
                        ? "Underwater view"
                        : interior
                          ? plan?.name ?? "Interior"
                          : view === "isometric"
                            ? "2.5D isometric cutaway"
                            : activeMode.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {underwater
                      ? `${submergedBody?.name}: seabed relief, boulders, fish, bubbles and the submerged intake line.`
                      : interior
                        ? `Click any fixture inside the room to open its detail panel and pin its label. ${plan?.rooms.length ?? 0} rooms on this deck.`
                        : view === "isometric"
                          ? "Terrain as flat tiles with each room extruded as a cutaway block and live data floating above it."
                          : `${activeMode.hint} Nothing floats over the site by default: click an object to pin its label and the numbers behind it, then use the cross on the label or Esc to take it off. Free view: drag to orbit, right-drag to pan, scroll to zoom.`}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Right rail */}
          <div className="space-y-4">
            {speciesId && (
              <WildlifePanel
                slug={slug}
                selectedId={speciesId}
                onClose={() => {
                  setSpeciesId(null);
                  setPreset((current) => (current === WILDLIFE_FOCUS ? "overview" : current));
                }}
                onFocus={(id) => {
                  setSpeciesId(id);
                  recordSpecies(id);
                  if (id === DEV_PROFILE.id) award("dev-outside");
                  setView("exterior");
                  setSubmergedWater(null);
                  setPreset(WILDLIFE_FOCUS);
                  setFlyKey((key) => key + 1);
                }}
                onFocusDesk={() => {
                  const plan = floorPlan(slug, 0);
                  const command = plan?.rooms.find(
                    (room) => room.id === DEV_PROFILE.deskRoomId,
                  );
                  setView("interior");
                  setDeckView("walk");
                  setLevel(0);
                  setRoomId(command?.id ?? null);
                  if (!plan || !command) {
                    setSpawn([0, 1.7, 0]);
                    return;
                  }
                  // Stand in front of his desk, looking at him rather than at a wall.
                  const { view: deskView } = adminDeskPlacement(command);
                  setSpawn([
                    command.x + deskView[0],
                    plan.y + 1.7,
                    command.z + deskView[1],
                  ]);
                }}
              />
            )}
            {/* Field badge: progress through the twin */}
            <FieldBadge />

            {water && !underwater && (
              <WaterPanel
                def={water}
                live={liveWater}
                trackers={trackedWater === water.id}
                submerged={false}
                lakesOpen={lakesOpen}
                onClose={() => {
                  setActiveWater(null);
                  setTrackedWater(null);
                  // A focus preset only exists while its body is selected.
                  setPreset((current) => (current === WATER_FOCUS ? "overview" : current));
                }}
                onAction={(action) => onWaterAction(water.id, action)}
              />
            )}

            {underwater && submergedBody && (
              <WaterPanel
                def={submergedBody}
                live={liveWater}
                trackers={trackedWater === submergedBody.id}
                submerged
                lakesOpen={lakesOpen}
                onClose={() => setSubmergedWater(null)}
                onAction={(action) => onWaterAction(submergedBody.id, action)}
              />
            )}

            {vehicle && (
              <VehiclePanel
                vehicle={vehicle}
                running={
                  runningVehicles.includes(vehicle.id) || vehicle.running
                }
                onToggleEngine={() => toggleEngine(vehicle.id)}
                onFocus={() => focusVehicle(vehicle.id)}
                onClose={closeVehicle}
              />
            )}

            {interior && room && plan && (
              <RoomPanel
                slug={slug}
                room={room}
                level={level}
                lightsOn={!lightsOut[room.id]}
                crewHere={crewHere}
                onLevel={(next) => {
                  const nextPlan = floorPlan(slug, next);
                  setLevel(next);
                  setSpawn(nextPlan?.spawn ?? [0, 1.7, 0]);
                  setRoomId(null);
                }}
                onClose={() => setRoomId(null)}
              />
            )}

            {inspect && (
              <ObjectPanel
                target={inspect}
                readings={readings}
                slug={slug}
                onClose={() => setInspect(null)}
              />
            )}

            {lakesOpen && slug === "bharati" && (
              <LakesOverlay
                lakes={stationWater("bharati").filter((b) => b.kind === "lakelet")}
                onSelect={(id) => {
                  setView("exterior");
                  setSubmergedWater(null);
                  setActiveWater(id);
                  setPreset(WATER_FOCUS);
                }}
                onClose={() => setLakesOpen(false)}
              />
            )}

            {!water && !vehicle && !inspect && !underwater && !room && (
              <Card className="cc-panel border-border shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
                    <Box className="size-4 text-primary" />
                    World interaction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                  <p>
                    Click the amber airlock on the station to walk inside, or any water surface,
                    vehicle, hotspot or crew member to open its record.
                  </p>
                  <div className="flex items-center justify-between rounded border border-border bg-card px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <Thermometer className="size-3 text-primary" />
                      Sun
                    </span>
                    <span className="cc-mono text-[10px] text-foreground">
                      {time.clockLabel} - {time.label} - {time.altitude.toFixed(1)} deg
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-border bg-card px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <Footprints className="size-3 text-primary" />
                      Interiors
                    </span>
                    <span className="cc-mono text-[10px] text-foreground">
                      2 decks - {floorPlan(slug, 0)?.rooms.length ?? 0} +{" "}
                      {floorPlan(slug, 1)?.rooms.length ?? 0} rooms
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-border bg-card px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <Radio className="size-3 text-primary" />
                      Water bodies
                    </span>
                    <span className="cc-mono text-[10px] text-foreground">
                      {stationWater(slug).length} clickable
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Time of day */}
            <Card className="cc-panel border-border shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
                  <Thermometer className="size-4 text-primary" />
                  Time of day and season
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Local solar clock</span>
                  <span className="cc-mono text-lg text-foreground">{time.clockLabel}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1439}
                  value={time.minutes}
                  onChange={(e) => time.setMinutes(Number(e.target.value))}
                  className="w-full accent-[#00E0C6]"
                  aria-label="Hour of day"
                />
                <div className="flex items-center gap-1">
                  {(["summer", "shoulder", "winter"] as Season[]).map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant="outline"
                      className={cn(
                        "flex-1 text-[10px] capitalize",
                        time.season === option && "border-primary/60 text-primary",
                      )}
                      onClick={() => time.setSeason(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{time.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {time.night ? "dark" : "lit"}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("w-full text-xs", time.timelapse && "border-primary/60 text-primary")}
                  onClick={time.toggleTimelapse}
                >
                  {time.timelapse ? "Stop 24 hour timelapse" : "Run 24 hour timelapse"}
                </Button>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  The sun follows real solar geometry for {latitude.toFixed(2)} degrees latitude,
                  so summer gives the midnight sun, winter gives the polar night, and the aurora
                  fades out under the summer sky.
                </p>
              </CardContent>
            </Card>

            {/* AI continuity engine */}
            <Card
              className={cn(
                "cc-panel shadow-none",
                blackout.riskLevel === "imminent" || blackout.riskLevel === "high"
                  ? "border-[#FFB020]/50"
                  : "border-border",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
                  <Cpu className="size-4 text-[#FFB020]" />
                  AI Continuity Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {!blackout.ready ? (
                  <div className="flex h-16 items-center justify-center">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Link drop</span>
                      <span className="cc-mono text-lg text-foreground">
                        {blackout.minutesToDrop} min
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="cc-mono text-lg text-[#FFB020]">{blackout.confidence}%</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Risk level</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase",
                          blackout.riskLevel === "imminent"
                            ? "border-[#FF3B47]/50 text-[#FF3B47]"
                            : blackout.riskLevel === "high"
                              ? "border-[#FFB020]/50 text-[#FFB020]"
                              : "border-[#3EE07F]/50 text-[#3EE07F]",
                        )}
                      >
                        {blackout.riskLevel}
                      </Badge>
                    </div>
                    <div className="space-y-1 border-t border-border pt-2">
                      {blackout.drivers.map((driver) => (
                        <div key={driver.label} className="flex items-center justify-between gap-2">
                          <span className="truncate text-muted-foreground">{driver.label}</span>
                          <span className="cc-mono text-[10px] text-foreground">
                            {driver.value}
                            {driver.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="cc-mono border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
                      {blackout.model} - target {blackout.accuracyTarget}% accuracy -{" "}
                      {blackout.eventCount} events recorded
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="cc-panel border-border shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
                  <Radio className="size-4 text-primary" />
                  Station link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">MQTT broker</span>
                  <span className="cc-mono text-[10px] text-foreground">{link.broker}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Link state</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] uppercase",
                      link.status === "connected"
                        ? "border-[#3EE07F]/50 text-[#3EE07F]"
                        : "border-[#FFB020]/50 text-[#FFB020]",
                    )}
                  >
                    {link.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Published frames</span>
                  <span className="cc-mono text-[10px] text-foreground">{link.published}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Offline queue</span>
                  <span className="cc-mono text-[10px] text-foreground">
                    {link.pending} (SOS {link.byPriority[1] ?? 0})
                  </span>
                </div>
                {readingsRaw === undefined ? (
                  <div className="flex h-12 items-center justify-center">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-1.5 border-t border-border pt-2">
                    {(
                      ["power", "thermal", "life_support", "environment", "comms", "safety"] as const
                    ).map((sub) => {
                      const group = readingsRaw.filter((r) => r.subsystem === sub);
                      const worst = group.some((c) => c.status === "critical")
                        ? "critical"
                        : group.some((c) => c.status === "warning")
                          ? "warning"
                          : group.some((c) => c.status === "watch")
                            ? "watch"
                            : group.length > 0
                              ? "nominal"
                              : "offline";
                      const cls = statusClasses(worst);
                      return (
                        <div
                          key={sub}
                          className="flex items-center justify-between gap-2 border-b border-border pb-1 last:border-0"
                        >
                          <span className="text-muted-foreground">
                            {SUBSYSTEM_LABELS[sub] ?? sub}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px] uppercase", cls.text, cls.border)}>
                            {worst}
                          </Badge>
                        </div>
                      );
                    })}
                    {readingsRaw.length > 0 && (
                      <div className="cc-mono pt-1 text-[10px] text-muted-foreground">
                        as of {formatAge(Math.max(...readingsRaw.map((r) => r.timestamp)))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {active && HOTSPOT_INFO[active] && (
              <Card className="cc-panel border-border shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
                    {HOTSPOT_INFO[active].name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                  <p>{HOTSPOT_INFO[active].info}</p>
                  {HOTSPOT_INFO[active].equipmentId && (
                    <div className="space-y-1 border-t border-border pt-2">
                      {readings
                        .filter((r) => r.equipmentId === HOTSPOT_INFO[active].equipmentId)
                        .map((r) => (
                          <div key={r.parameter} className="flex items-center justify-between gap-2">
                            <span className="truncate text-muted-foreground">{r.parameter}</span>
                            <span className={cn("cc-mono text-sm", statusClasses(r.status).text)}>
                              {r.value.toFixed(r.decimals)}
                              {r.unit}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Continuity actions and reconciliation */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="cc-panel border-border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
                Continuity drill
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Runs a {blackout.durationSec} second satellite blackout on {stationLabel}. The VSAT
                channel drops, the twin overlays a red pulsing border, telemetry switches to the
                forecast line and a critical incident is raised. When the window closes the
                platform reconciles predicted against measured coverage.
              </p>
              <Button
                variant="outline"
                className="w-full border-[#FF3B47]/60 text-[#FF3B47] hover:bg-[#FF3B47]/10"
                disabled={blackout.active || blackout.busy}
                onClick={() => void blackout.start()}
              >
                <TriangleAlert className="mr-2 size-4" />
                {blackout.active
                  ? `Blackout active - ${blackout.remainingSec}s remaining`
                  : "Simulate Satellite Blackout"}
              </Button>
              {blackout.active && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => void blackout.stop()}
                >
                  End early and reconcile
                </Button>
              )}
            </CardContent>
          </Card>

          <Card
            className={cn(
              "cc-panel shadow-none lg:col-span-2",
              reconciliation ? "border-[#3EE07F]/40" : "border-border",
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
                Reconciliation - predicted vs actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!reconciliation ? (
                <p className="text-xs text-muted-foreground">
                  No reconciliation yet. Run a continuity drill to compare the model forecast with
                  the coverage measured during the outage.
                </p>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="cc-label">Predicted</div>
                      <div className="cc-mono text-xl text-[#FFB020]">
                        {reconciliation.predictedCoverage}%
                      </div>
                    </div>
                    <div>
                      <div className="cc-label">Measured</div>
                      <div className="cc-mono text-xl text-[#3EE07F]">
                        {reconciliation.actualCoverage}%
                      </div>
                    </div>
                    <div>
                      <div className="cc-label">Delta</div>
                      <div
                        className={cn(
                          "cc-mono text-xl",
                          reconciliation.delta <= 5 ? "text-[#3EE07F]" : "text-[#FFB020]",
                        )}
                      >
                        {reconciliation.delta} pp
                      </div>
                    </div>
                  </div>
                  <p className="leading-relaxed text-muted-foreground">{reconciliation.note}</p>
                  <p className="cc-mono text-[10px] text-muted-foreground">
                    reconciled {formatUtc(reconciliation.endedAt)} - target {blackout.accuracyTarget}%
                    accuracy
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fleet inventory */}
        <Card className="cc-panel border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm font-bold uppercase tracking-wider">
              Vehicle fleet - {fleetCount(slug)} units in {FLEET[slug]?.length ?? 0} classes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {VEHICLE_CLASSES.map((cls) => {
                const entry = (FLEET[slug] ?? []).find((f) => f.id === cls.id);
                if (!entry) return null;
                return (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between rounded border border-border bg-card px-3 py-2"
                  >
                    <span className="text-xs text-muted-foreground">{cls.label}</span>
                    <span className="cc-mono text-sm text-foreground">{entry.count}</span>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {vehicleInstances(slug).map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                onClick={() => focusVehicle(unit.id)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded border px-3 py-2 text-left transition-colors",
                    activeVehicle === unit.id
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <span className="truncate text-xs text-foreground">{unit.tail}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        background:
                          unit.status === "operational"
                            ? "#3EE07F"
                            : unit.status === "standby"
                              ? "#4A9EFF"
                              : unit.status === "maintenance"
                                ? "#FFB020"
                                : "#00E0C6",
                      }}
                    />
                    <span className="cc-mono text-[10px] text-muted-foreground">
                      {unit.fuelPercent}%
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}


