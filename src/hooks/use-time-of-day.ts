import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Time of day and season.
 *
 * The sun position comes from the real solar geometry for each station's
 * latitude, so the twin reproduces the two things that dominate life at 70
 * degrees south: the midnight sun through December and the polar night
 * through June. The aurora follows the same seasonal logic — bright through
 * the dark months, absent under the summer sun.
 */

export type Season = "summer" | "shoulder" | "winter";

/** Solar declination in degrees for each season. */
const DECLINATION: Record<Season, number> = {
  summer: 23.44,
  shoulder: 0,
  winter: -23.44,
};

export interface SunState {
  /** Sun direction and distance for the scene's key light. */
  position: [number, number, number];
  intensity: number;
  night: boolean;
  label: string;
  /** Aurora opacity that matches the season. */
  auroraOpacity: number;
  /** Sun altitude in degrees, for the instrument readout. */
  altitude: number;
}

const SUN_DISTANCE = 240;

function radians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Sun altitude in degrees at a given hour and declination. */
function altitudeAt(hourAngleDeg: number, latitude: number, declination: number): number {
  const lat = radians(latitude);
  const dec = radians(declination);
  const h = radians(hourAngleDeg);
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h);
  return (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;
}

/** Sun azimuth in degrees measured from north, positive toward east. */
function azimuthAt(hourAngleDeg: number, latitude: number, declination: number): number {
  const lat = radians(latitude);
  const dec = radians(declination);
  const h = radians(hourAngleDeg);
  const y = -Math.sin(h);
  const x = Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(h);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export interface TimeOfDayApi extends SunState {
  /** Minutes past midnight, 0 to 1439. */
  minutes: number;
  setMinutes: (minutes: number) => void;
  season: Season;
  setSeason: (season: Season) => void;
  /** Compressed 24 hour cycle, ten seconds to the day. */
  timelapse: boolean;
  toggleTimelapse: () => void;
  /** Local solar clock used by the panels. */
  clockLabel: string;
}

export function useTimeOfDay(latitude: number): TimeOfDayApi {
  const [minutes, setMinutes] = useState(12 * 60);
  const [season, setSeason] = useState<Season>("summer");
  const [timelapse, setTimelapse] = useState(false);

  useEffect(() => {
    if (!timelapse) return;
    const handle = window.setInterval(() => {
      setMinutes((m) => (m + 24) % 1440);
    }, 166);
    return () => window.clearInterval(handle);
  }, [timelapse]);

  const toggleTimelapse = useCallback(() => setTimelapse((v) => !v), []);

  const state = useMemo<SunState>(() => {
    const declination = DECLINATION[season];
    const hourAngle = (minutes / 60 - 12) * 15;
    const altitude = altitudeAt(hourAngle, latitude, declination);
    const azimuth = azimuthAt(hourAngle, latitude, declination);
    const altRad = radians(altitude);
    const azRad = radians(azimuth);
    const horizon = Math.cos(altRad);
    const position: [number, number, number] = [
      horizon * Math.sin(azRad) * SUN_DISTANCE,
      Math.max(18, Math.sin(altRad) * SUN_DISTANCE),
      -horizon * Math.cos(azRad) * SUN_DISTANCE,
    ];

    const noonAltitude = 90 - Math.abs(latitude) + declination;
    const midnightAltitude = declination - (90 - Math.abs(latitude));

    let intensity: number;
    let night: boolean;
    if (altitude <= -6) {
      intensity = 0.07;
      night = true;
    } else if (altitude <= 6) {
      intensity = 0.07 + ((altitude + 6) / 12) * 0.5;
      night = true;
    } else {
      intensity = 0.6 + (altitude / 90) * 0.75;
      night = false;
    }

    let label: string;
    if (midnightAltitude > 0) label = "Midnight sun";
    else if (noonAltitude < 0) label = "Polar night";
    else if (noonAltitude < 6) label = "Civil twilight all day";
    else label = night ? "Twilight" : "Daylight";

    const auroraOpacity =
      season === "summer" ? 0.06 : season === "winter" ? 0.55 : 0.3;

    return { position, intensity, night, label, auroraOpacity, altitude };
  }, [minutes, season, latitude]);

  const clockLabel = useMemo(() => {
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.round(minutes % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }, [minutes]);

  return {
    ...state,
    minutes,
    setMinutes,
    season,
    setSeason,
    timelapse,
    toggleTimelapse,
    clockLabel,
  };
}
