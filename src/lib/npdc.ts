/**
 * NPDC metadata auto-tagging and export.
 *
 * Every package published from DhruvaTwin carries the National Polar Data
 * Centre submission fields, a CF-1.11 parameter mapping and GCMD keyword
 * tagging so the record can be ingested without manual rework. The payload is
 * schema.org Dataset JSON-LD plus an NPDC block, and the same object is what
 * the audit chain records when an operator publishes.
 */

export const NPDC_STANDARD = "NPDC-DS-01";
export const NPDC_SCHEMA_VERSION = "1.2";
export const GCMD_SCHEME = "GCMD Science Keywords v16.0";

export interface NpdcChannel {
  equipmentId: string;
  sensorId: string;
  parameter: string;
  unit: string;
  subsystem: string;
}

export interface NpdcPackageInput {
  stationSlug: string;
  stationName: string;
  latitude: number;
  longitude: number;
  region: string;
  channels: NpdcChannel[];
  generatedAt: number;
  recordCount: number;
  operator?: string;
}

export interface NpdcPackage {
  datasetId: string;
  standard: string;
  filename: string;
  keywords: string[];
  payload: Record<string, unknown>;
}

/** CF standard-name style map for the platform's parameter families. */
const CF_MAP: Record<string, { standard: string; cellMethods: string }> = {
  "power.output_kw": { standard: "electrical_power_output", cellMethods: "time: mean" },
  "power.bus_frequency": { standard: "electrical_grid_frequency", cellMethods: "time: point" },
  "thermal.pipeline_temp": { standard: "water_temperature", cellMethods: "time: point" },
  "thermal.loop_temp": { standard: "water_temperature", cellMethods: "time: point" },
  "thermal.cabin_temp": { standard: "air_temperature", cellMethods: "time: point" },
  "life.co2_ppm": { standard: "mole_fraction_of_carbon_dioxide_in_air", cellMethods: "time: mean" },
  "life.humidity_pct": { standard: "relative_humidity", cellMethods: "time: point" },
  "fuel.level_pct": { standard: "fuel_storage_fraction", cellMethods: "time: point" },
  "safety.leak_ppm": { standard: "mass_concentration_of_hydrocarbons_in_air", cellMethods: "time: point" },
  "safety.smoke_ppm": { standard: "mass_concentration_of_particulate_matter_in_air", cellMethods: "time: point" },
  "safety.intake_flow": { standard: "sea_water_volume_transport_into_sea_water", cellMethods: "time: mean" },
  "comms.snr_db": { standard: "signal_to_noise_ratio", cellMethods: "time: point" },
  "comms.latency_ms": { standard: "network_round_trip_time", cellMethods: "time: point" },
  "env.temperature": { standard: "air_temperature", cellMethods: "time: point" },
  "env.wind_speed": { standard: "wind_speed", cellMethods: "time: mean" },
  "env.pressure": { standard: "air_pressure_at_mean_sea_level", cellMethods: "time: point" },
};

/** GCMD keyword tagging per subsystem. */
const GCMD_TAGS: Record<string, string[]> = {
  power: ["ENERGY INFRASTRUCTURE", "ELECTRICITY", "POWER GENERATION"],
  thermal: ["THERMAL PROPERTIES", "WATER TEMPERATURE", "HEATING SYSTEMS"],
  life_support: ["ATMOSPHERIC CARBON DIOXIDE", "HUMIDITY", "HABITABILITY"],
  environment: ["AUTOMATIC WEATHER STATION", "AIR TEMPERATURE", "WIND SPEED"],
  comms: ["SATELLITE COMMUNICATIONS", "DATA LINKS", "TELECOMMUNICATIONS"],
  safety: ["FIRE DETECTION", "HAZARDOUS MATERIALS", "OCCUPATIONAL SAFETY"],
};

/** Build the export package with metadata auto-tagged from live channels. */
export function buildNpdcPackage(input: NpdcPackageInput): NpdcPackage {
  const subsystems = [...new Set(input.channels.map((c) => c.subsystem))];
  const keywords = [
    "ANTARCTICA",
    input.stationName.toUpperCase(),
    "POLAR SCIENCE",
    ...subsystems.flatMap((s) => GCMD_TAGS[s] ?? []),
  ];
  const datasetId = `NPDC-DT-${input.stationSlug.toUpperCase()}-${new Date(input.generatedAt)
    .toISOString()
    .slice(0, 10)}-${String(Math.round(input.recordCount)).padStart(5, "0")}`;

  const variables = input.channels.map((channel) => {
    const cf = CF_MAP[channel.sensorId];
    return {
      equipmentId: channel.equipmentId,
      sensorId: channel.sensorId,
      parameter: channel.parameter,
      unit: channel.unit,
      subsystem: channel.subsystem,
      cfStandardName: cf?.standard ?? "not_mapped",
      cellMethods: cf?.cellMethods ?? "time: point",
      gcmdKeywords: GCMD_TAGS[channel.subsystem] ?? [],
    };
  });

  const payload = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    identifier: datasetId,
    name: `${input.stationName} automatic telemetry package`,
    description: `DhruvaTwin station telemetry export for ${input.stationName} (${input.region}). ${input.channels.length} instrumented channels, ${input.recordCount} observations. Published under the National Polar Data Centre submission standard with CF-1.11 parameter mapping.`,
    url: "https://www.ncpor.res.in/",
    license: "https://www.ats.aq/e/protocol.html",
    creator: {
      "@type": "Organization",
      name: "National Centre for Polar and Ocean Research",
      parentOrganization: "Ministry of Earth Sciences, Government of India",
    },
    publisher: { "@type": "Organization", name: "National Polar Data Centre" },
    datePublished: new Date(input.generatedAt).toISOString(),
    spatialCoverage: {
      "@type": "Place",
      name: input.region,
      geo: {
        "@type": "GeoCoordinates",
        latitude: input.latitude,
        longitude: input.longitude,
      },
    },
    keywords,
    variableMeasured: variables,
    isPartOf: {
      "@type": "Dataset",
      name: "Indian Antarctic Programme automatic station observations",
    },
    npdc: {
      standard: NPDC_STANDARD,
      schemaVersion: NPDC_SCHEMA_VERSION,
      stationSlug: input.stationSlug,
      stationName: input.stationName,
      latitude: input.latitude,
      longitude: input.longitude,
      region: input.region,
      recordCount: input.recordCount,
      channelCount: input.channels.length,
      keywordScheme: GCMD_SCHEME,
      cfConvention: "CF-1.11",
      generatedAt: new Date(input.generatedAt).toISOString(),
      generatedBy: input.operator ?? "DhruvaTwin console",
      qualityFlagVocabulary: ["good", "suspect", "offline"],
      access: "open",
      platform: "DhruvaTwin offline-first digital twin",
    },
  };

  return {
    datasetId,
    standard: NPDC_STANDARD,
    filename: `${datasetId}.json`,
    keywords,
    payload,
  };
}

/** Trigger a browser download of a text payload. */
export function downloadText(filename: string, text: string, mime = "application/json") {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
