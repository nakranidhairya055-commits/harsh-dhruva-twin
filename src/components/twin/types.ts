/** Live sensor summary passed into twin scenes for hotspot readouts. */
export interface SensorSummary {
  equipmentId: string;
  parameter: string;
  value: number;
  unit: string;
  decimals: number;
  status: string;
}

/** Descriptor for one clickable hotspot in a twin scene. */
export interface TwinHotspotDef {
  id: string;
  label: string;
  /** Optional equipment tag linking the hotspot to live telemetry. */
  equipmentId?: string;
  /** Short line describing the object, shown in the detail panel. */
  info: string;
}

import type { ViewMode } from "./view-modes";

/** Sun placement for the selected time of day. */
export interface SunState {
  position: [number, number, number];
  intensity: number;
  night: boolean;
  /** Human readable label such as "Midnight sun" or "Polar night". */
  label: string;
  /** Aurora opacity for the selected season. */
  auroraOpacity: number;
}

/** Props every station scene component accepts. */
export interface TwinSceneProps {
  readings: SensorSummary[];
  onSelect: (hotspotId: string) => void;
  activeHotspot: string | null;
  /** Active display mode; defaults to the photographic exterior view. */
  viewMode?: ViewMode;
  /** Sun position and intensity for the selected hour and season. */
  sun?: SunState;
  /** Called when the operator clicks a water body. */
  onWaterSelect?: (bodyId: string) => void;
  /** Currently selected water body, highlighted in the scene. */
  activeWater?: string | null;
  /** Water body currently shown from below the surface. */
  submergedWater?: string | null;
  /** Water body whose iceberg tracker overlay is active. */
  trackedWater?: string | null;
  /** Shows the ice thickness heatmap across the Larsemann lakes. */
  showLakes?: boolean;
  /** Called when the operator clicks a vehicle. */
  onVehicleSelect?: (vehicleId: string) => void;
  /** Currently selected vehicle instance. */
  activeVehicle?: string | null;
  /** Called when the operator clicks a building airlock. */
  onEnterBuilding?: () => void;
}
