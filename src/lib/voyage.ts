/**
 * DhruvaTwin resupply voyage model.
 *
 * The Indian Antarctic programme is supplied by sea: a chartered polar supply
 * vessel loads at Cape Town, runs the Southern Ocean to the station coast, and
 * either discharges to the station or helicopters cargo inland to Maitri.
 * Everything here is geometry and a schedule, computed from the route itself,
 * so the position on screen is always consistent with the distance, the speed
 * and the time.
 *
 * Vessel particulars are modelled for the twin. Live AIS is a keyed upgrade
 * (see the Resupply screen), which is why the twin draws its own route chart
 * and position rather than depending on an external position feed.
 */

export interface GeoPoint {
  name: string;
  lat: number;
  lon: number;
  /** Why the vessel stops or turns here. */
  note?: string;
}

export interface VoyageCargo {
  fuelTonnes: number;
  foodTonnes: number;
  scienceTonnes: number;
  constructionTonnes: number;
  containers: number;
  passengers: number;
}

export interface VoyageDef {
  id: string;
  name: string;
  /** Station being supplied. */
  target: "bharati" | "maitri";
  targetLabel: string;
  origin: string;
  originLabel: string;
  /** ISO departure time in UTC. */
  departure: string;
  /** Service speed in knots, used to derive the schedule. */
  serviceSpeedKn: number;
  /** Weather, ice transit and port contingency added to the pure passage time. */
  contingencyDays: number;
  /** Discharge method at the destination. */
  discharge: string;
  route: GeoPoint[];
  cargo: VoyageCargo;
  /** Destination coordinate used for the Google Maps deep links. */
  destination: GeoPoint;
}

const CAPE_TOWN: GeoPoint = { name: "Cape Town", lat: -33.9249, lon: 18.4241 };

const BHARATI_ANCHORAGE: GeoPoint = {
  name: "Bharati anchorage",
  lat: -69.4,
  lon: 76.3,
  note: "Deep water anchorage off North Grovnes Island.",
};

const MAITRI_ANCHORAGE: GeoPoint = {
  name: "Maitri shelf anchorage",
  lat: -70.7,
  lon: 11.25,
  note: "Shelf ice edge landing, then a helicopter shuttle about 100 km inland to Maitri.",
};

export const DESTINATIONS: Record<string, GeoPoint> = {
  bharati: { name: "Bharati", lat: -69.4114, lon: 76.1915 },
  maitri: { name: "Maitri", lat: -70.7644, lon: 11.7342 },
  "cape-town": CAPE_TOWN,
};

/** Modelled charter vessel used by the twin. */
export const VESSEL = {
  name: "MV Dhruva Sagar",
  class: "Chartered polar supply vessel, 1A Super ice class",
  lengthM: 134,
  beamM: 22,
  draftM: 7.9,
  deadweightTonnes: 6200,
  serviceSpeedKn: 13.5,
  maxSpeedKn: 16,
  crew: 42,
  helideck: "One medium helicopter, aft deck, day operations only",
  cranesTonnes: "2 x 30 t and 2 x 12 t deck cranes",
} as const;

/** The three voyages the console tracks. */
export const VOYAGES: VoyageDef[] = [
  {
    id: "isea-2026-bharati",
    name: "ISEA 2026/27 relief - Cape Town to Bharati",
    target: "bharati",
    targetLabel: "Bharati",
    origin: "cape-town",
    originLabel: "Cape Town, South Africa",
    departure: "2026-09-18T05:30:00Z",
    serviceSpeedKn: 13.5,
    contingencyDays: 2,
    discharge: "Ship to shore by barge and helicopter, alongside the North Grovnes anchorage.",
    route: [
      CAPE_TOWN,
      { name: "Cape of Good Hope", lat: -34.3568, lon: 18.474, note: "Leaves harbour traffic and turns south-west into the Southern Ocean." },
      { name: "South Atlantic transit", lat: -40, lon: 24, note: "Long swell build across the west wind belt." },
      { name: "Agulhas retroflection", lat: -42, lon: 33, note: "Crosses the warm eddy field shed by the Agulhas current." },
      { name: "West wind belt", lat: -50, lon: 46, note: "Deepest part of the passage, sea state peaks here." },
      { name: "Ice edge crossing", lat: -58, lon: 62, note: "First ice. Speed reduces and the watch changes to continuous ice reporting." },
      { name: "Approaches", lat: -64, lon: 72, note: "Ice navigation through the Prydz Bay approaches." },
      { name: "Larsemann Hills landfall", lat: -67.5, lon: 76.5, note: "Landfall in the Larsemann Hills, station on the horizon." },
      BHARATI_ANCHORAGE,
    ],
    cargo: {
      fuelTonnes: 900,
      foodTonnes: 120,
      scienceTonnes: 75,
      constructionTonnes: 655,
      containers: 134,
      passengers: 28,
    },
    destination: DESTINATIONS.bharati,
  },
  {
    id: "isea-2026-maitri",
    name: "ISEA 2026/27 relief - Cape Town to Maitri",
    target: "maitri",
    targetLabel: "Maitri",
    origin: "cape-town",
    originLabel: "Cape Town, South Africa",
    departure: "2026-11-04T06:00:00Z",
    serviceSpeedKn: 14,
    contingencyDays: 3,
    discharge: "Shelf ice edge landing, then helicopter shuttle about 100 km inland to Maitri.",
    route: [
      CAPE_TOWN,
      { name: "Cape of Good Hope", lat: -34.3568, lon: 18.474, note: "Southern Ocean transit begins." },
      { name: "South Atlantic transit", lat: -42, lon: 10, note: "Heading south-west toward the Greenwich meridian." },
      { name: "Meridian crossing", lat: -52, lon: 4, note: "Crosses the prime meridian in the west wind belt." },
      { name: "Ice edge crossing", lat: -62, lon: 0, note: "First ice, speed reduces, continuous ice watch." },
      { name: "Princess Astrid coast", lat: -68, lon: 6, note: "Coastal approach along the Princess Astrid Coast." },
      { name: "Schirmacher approach", lat: -70, lon: 10.5, note: "Shelf ice edge position, station about 100 km inland." },
      MAITRI_ANCHORAGE,
    ],
    cargo: {
      fuelTonnes: 780,
      foodTonnes: 95,
      scienceTonnes: 60,
      constructionTonnes: 210,
      containers: 96,
      passengers: 21,
    },
    destination: DESTINATIONS.maitri,
  },
  {
    id: "isea-2026-interstation",
    name: "ISEA 2025/26 inter-station leg - Bharati to Maitri",
    target: "maitri",
    targetLabel: "Maitri",
    origin: "bharati",
    originLabel: "Bharati, Larsemann Hills",
    departure: "2026-02-14T08:00:00Z",
    serviceSpeedKn: 14,
    contingencyDays: 1,
    discharge: "Coastal transfer of the final stores after the Bharati discharge campaign.",
    route: [
      BHARATI_ANCHORAGE,
      { name: "Prydz Bay exit", lat: -68.4, lon: 66, note: "Clears the Prydz Bay ice tongue before turning west." },
      { name: "Coastal transit", lat: -68, lon: 45, note: "Follows the ice edge west along the coast." },
      { name: "Amery approach", lat: -68.6, lon: 25, note: "Crosses the Amery ice shelf outflow, icebergs present." },
      { name: "Princess Astrid coast", lat: -69.6, lon: 15, note: "Coastal transit under continuous ice watch." },
      MAITRI_ANCHORAGE,
    ],
    cargo: {
      fuelTonnes: 120,
      foodTonnes: 30,
      scienceTonnes: 18,
      constructionTonnes: 40,
      containers: 22,
      passengers: 9,
    },
    destination: DESTINATIONS.maitri,
  },
];

const EARTH_RADIUS_KM = 6371.0088;
const NM_PER_KM = 1 / 1.852;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, degrees true. */
export function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLon = toRadians(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Cumulative distance along a route, in kilometres. */
export function routeDistances(route: GeoPoint[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < route.length; i += 1) {
    out.push(out[i - 1] + haversineKm(route[i - 1], route[i]));
  }
  return out;
}

/** Position along the route at a fraction of the total distance. */
export function positionAt(route: GeoPoint[], fraction: number): GeoPoint {
  const cumulative = routeDistances(route);
  const total = cumulative[cumulative.length - 1] ?? 0;
  const target = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 1; i < cumulative.length; i += 1) {
    if (target <= cumulative[i]) {
      const legLength = cumulative[i] - cumulative[i - 1] || 1;
      const t = (target - cumulative[i - 1]) / legLength;
      const from = route[i - 1];
      const to = route[i];
      return {
        name: `At sea, leg ${i} of ${route.length - 1}`,
        lat: from.lat + (to.lat - from.lat) * t,
        lon: from.lon + (to.lon - from.lon) * t,
      };
    }
  }
  return route[route.length - 1];
}

/** Planned passage time in hours, from the route, the speed and the contingency. */
export function passageHours(voyage: VoyageDef): number {
  const total = routeDistances(voyage.route).slice(-1)[0] ?? 0;
  const pure = total * NM_PER_KM / voyage.serviceSpeedKn;
  return pure + voyage.contingencyDays * 24;
}

export interface VoyageStatus {
  voyage: VoyageDef;
  state: "in port" | "at sea" | "arrived";
  fraction: number;
  /** 0 to 100, rounded for display. */
  percent: number;
  position: GeoPoint;
  headingDeg: number;
  speedKn: number;
  totalKm: number;
  runKm: number;
  remainingKm: number;
  dayOfVoyage: number;
  daysAtSea: number;
  totalDays: number;
  departureMs: number;
  plannedArrivalMs: number;
  etaMs: number;
  overnightMs: number;
  nextWaypoint: GeoPoint | null;
  distanceToNextKm: number;
  iceState: "before ice" | "in ice" | "cleared ice";
  marginHours: number;
}

/** Ice edge used by the twin, September to March sector average. */
export const ICE_EDGE_LAT = -59.6;

/** Effective progress: actual when under way, clamped in port and on arrival. */
export function statusAt(voyage: VoyageDef, now: number): VoyageStatus {
  const departureMs = Date.parse(voyage.departure);
  const hours = passageHours(voyage);
  const plannedArrivalMs = departureMs + hours * 3600 * 1000;
  const total = routeDistances(voyage.route).slice(-1)[0] ?? 0;
  const rawFraction = (now - departureMs) / (plannedArrivalMs - departureMs);
  const fraction = Math.max(0, Math.min(1, rawFraction));
  const state: VoyageStatus["state"] =
    now < departureMs ? "in port" : rawFraction >= 1 ? "arrived" : "at sea";
  const position = positionAt(voyage.route, fraction);

  // Heading from the next route point, so it reads as a real course.
  const cumulative = routeDistances(voyage.route);
  const target = fraction * total;
  let headingDeg = 180;
  let nextWaypoint: GeoPoint | null = voyage.route[voyage.route.length - 1];
  let distanceToNextKm = 0;
  for (let i = 1; i < cumulative.length; i += 1) {
    if (target <= cumulative[i]) {
      nextWaypoint = voyage.route[i];
      headingDeg = bearing(position, voyage.route[i]);
      distanceToNextKm = haversineKm(position, voyage.route[i]);
      break;
    }
  }

  const runKm = total * fraction;
  const daysAtSea = Math.max(0, (now - departureMs) / 86400000);
  return {
    voyage,
    state,
    fraction,
    percent: Math.round(fraction * 100),
    position,
    headingDeg: Math.round(headingDeg),
    speedKn: state === "at sea" ? voyage.serviceSpeedKn : 0,
    totalKm: Math.round(total),
    runKm: Math.round(runKm),
    remainingKm: Math.round(total - runKm),
    dayOfVoyage: state === "in port" ? 0 : Math.floor(daysAtSea) + 1,
    daysAtSea: Math.round(daysAtSea * 10) / 10,
    totalDays: Math.round((hours / 24) * 10) / 10,
    departureMs,
    plannedArrivalMs,
    etaMs: state === "arrived" ? plannedArrivalMs : plannedArrivalMs,
    overnightMs: plannedArrivalMs - now,
    nextWaypoint,
    distanceToNextKm: Math.round(distanceToNextKm),
    iceState:
      position.lat > ICE_EDGE_LAT ? "before ice" : state === "arrived" ? "cleared ice" : "in ice",
    marginHours: Math.round((hours - (now - departureMs) / 3600000) * 10) / 10,
  };
}

export interface SeaState {
  windKn: number;
  windDir: number;
  swellM: number;
  airTempC: number;
  visibilityNm: number;
  note: string;
}

/**
 * Modelled sea state along the route.
 *
 * Deterministic function of position, so the same point always reports the same
 * conditions and the noon reports stay consistent with the chart.
 */
export function seaStateAt(point: { lat: number; lon: number }): SeaState {
  const absLat = Math.abs(point.lat);
  const windKn = 8 + 16 * Math.abs(Math.sin(toRadians(absLat))) + 4 * Math.sin(toRadians(point.lon * 3));
  const swellM = 1.4 + 3.1 * Math.abs(Math.sin(toRadians(absLat * 0.8))) + 0.5 * Math.cos(toRadians(point.lon * 2));
  const airTempC = -1.5 - (absLat - 45) * 0.9 + 2.4 * Math.sin(toRadians(point.lon * 1.7));
  const visibilityNm = windKn > 30 ? 2.5 : windKn > 22 ? 6 : 11;
  return {
    windKn: Math.round(windKn * 10) / 10,
    windDir: Math.round((220 + 40 * Math.sin(toRadians(point.lon))) % 360),
    swellM: Math.round(swellM * 10) / 10,
    airTempC: Math.round(airTempC * 10) / 10,
    visibilityNm,
    note:
      windKn > 34
        ? "Storm force: reduce speed and secure the deck cargo."
        : windKn > 25
          ? "Near gale: heavy roll period, helicopter operations suspended."
          : windKn > 18
            ? "Fresh breeze with a working swell, normal passage."
            : "Moderate conditions, good for deck work.",
  };
}

export interface NoonReport {
  day: number;
  timestamp: number;
  position: GeoPoint;
  distanceRunKm: number;
  averageSpeedKn: number;
  sea: SeaState;
  iceCrossing: boolean;
}

/** Noon reports for the days actually run so far. */
export function noonReports(status: VoyageStatus, now: number): NoonReport[] {
  const reports: NoonReport[] = [];
  const total = status.totalKm;
  const dayMs = 86400000;
  let previousFraction = 0;
  let previousLat = status.voyage.route[0].lat;
  for (let day = 1; day <= Math.ceil(status.daysAtSea); day += 1) {
    const stamp = status.departureMs + day * dayMs;
    if (stamp > now) break;
    const fraction = Math.min(1, (stamp - status.departureMs) / (status.plannedArrivalMs - status.departureMs));
    const position = positionAt(status.voyage.route, fraction);
    const distanceRunKm = Math.round((fraction - previousFraction) * total);
    const hours = (stamp - (status.departureMs + (day - 1) * dayMs)) / 3600000;
    reports.push({
      day,
      timestamp: stamp,
      position,
      distanceRunKm,
      averageSpeedKn: Math.round(((distanceRunKm * NM_PER_KM) / hours) * 10) / 10,
      sea: seaStateAt(position),
      iceCrossing: previousLat > ICE_EDGE_LAT && position.lat <= ICE_EDGE_LAT,
    });
    previousFraction = fraction;
    previousLat = position.lat;
  }
  return reports;
}

/* ------------------------------------------------------------------ */
/* Google Maps and Google Earth links (keyless)                        */
/* ------------------------------------------------------------------ */

/** Satellite embed centred on a coordinate. Works without an API key. */
export function googleMapsEmbedUrl(point: { lat: number; lon: number }, zoom = 4): string {
  return `https://maps.google.com/maps?q=${point.lat.toFixed(4)},${point.lon.toFixed(4)}&z=${zoom}&t=k&output=embed`;
}

/** Open the coordinate in Google Maps. */
export function googleMapsUrl(point: { lat: number; lon: number }, zoom = 6): string {
  return `https://www.google.com/maps/@${point.lat.toFixed(4)},${point.lon.toFixed(4)},${zoom}z/data=!3m1!1e3`;
}

/** Open a turn-by-turn style route between two coordinates in Google Maps. */
export function googleMapsRouteUrl(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat.toFixed(4)},${from.lon.toFixed(4)}&destination=${to.lat.toFixed(4)},${to.lon.toFixed(4)}`;
}

/** Open Google Earth at a coordinate, with the camera height in metres. */
export function googleEarthUrl(
  point: { lat: number; lon: number },
  altitudeM = 2500000,
): string {
  return `https://earth.google.com/web/@${point.lat.toFixed(5)},${point.lon.toFixed(5)},${Math.round(
    altitudeM,
  )}a,0d,35y,0h,0t,0r`;
}

/** Great-circle midpoint, used to frame the whole passage on one map. */
export function midpoint(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const lat1 = toRadians(a.lat);
  const lon1 = toRadians(a.lon);
  const lat2 = toRadians(b.lat);
  const dLon = toRadians(b.lon - a.lon);
  const bx = Math.cos(lat2) * Math.cos(dLon);
  const by = Math.cos(lat2) * Math.sin(dLon);
  const lat = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) ** 2 + by ** 2),
  );
  const lon = lon1 + Math.atan2(by, Math.cos(lat1) + bx);
  return { lat: (lat * 180) / Math.PI, lon: ((lon * 180) / Math.PI + 540) % 360 - 180 };
}

/** Formatted position string, the way a bridge would read it out. */
export function formatPosition(point: { lat: number; lon: number }): string {
  const lat = `${Math.abs(point.lat).toFixed(4)} ${point.lat < 0 ? "S" : "N"}`;
  const lon = `${Math.abs(point.lon).toFixed(4)} ${point.lon < 0 ? "W" : "E"}`;
  return `${lat} ${lon}`;
}

/** Compass label for a course in degrees. */
export function compass(degrees: number): string {
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return points[Math.round(degrees / 22.5) % 16];
}
