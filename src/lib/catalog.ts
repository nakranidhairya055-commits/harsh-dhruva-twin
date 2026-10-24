import { sensorDefsFor } from "@/convex/sensors";

/**
 * Catalog metadata for the DhruvaTwin Platform equipment registry. One entry
 * per instrumented equipment tag; live sensor definitions come from the
 * shared sensor catalog so the registry and the simulation never diverge.
 */
export interface CatalogEntry {
  equipmentId: string;
  name: string;
  subsystem: string;
  tagline: string;
  description: string;
  specs: Array<{ label: string; value: string }>;
  sensors: Array<{ sensorId: string; parameter: string; unit: string }>;
}

/** Build the full equipment catalog for a station slug. */
export function catalogFor(slug: string): CatalogEntry[] {
  const defs = sensorDefsFor(slug);
  const byEquipment = new Map<string, typeof defs>();
  for (const def of defs) {
    const list = byEquipment.get(def.equipmentId) ?? [];
    list.push(def);
    byEquipment.set(def.equipmentId, list);
  }

  const meta: Record<string, { name: string; tagline: string; description: string; specs: CatalogEntry["specs"] }> = {
    ...(slug === "maitri"
      ? {
          "GEN-1": {
            name: "Diesel Generator 1",
            tagline: "Primary 62.5 kVA power unit",
            description:
              "One of four diesel generators that carry Maitri's electrical load. Output, bus frequency share and vibration trends are streamed here; sustained low output against the band raises a warning incident.",
            specs: [
              { label: "Rated output", value: "62.5 kVA" },
              { label: "Fleet", value: "4 units (GEN-1 to GEN-4)" },
              { label: "Installed", value: "1989 station commissioning" },
            ],
          },
          "GEN-2": {
            name: "Diesel Generator 2",
            tagline: "Primary 62.5 kVA power unit",
            description:
              "Second of the four-unit generation fleet. Load sharing across the fleet keeps the bus near 50 Hz; this unit's contribution is monitored against the same low-output bands as its siblings.",
            specs: [
              { label: "Rated output", value: "62.5 kVA" },
              { label: "Fleet", value: "4 units (GEN-1 to GEN-4)" },
              { label: "Cooling", value: "Forced air, generator bay" },
            ],
          },
          "GEN-3": {
            name: "Diesel Generator 3",
            tagline: "Primary 62.5 kVA power unit",
            description:
              "Third of the four-unit generation fleet, typically rotated with the others to even out running hours across the winter-over season.",
            specs: [
              { label: "Rated output", value: "62.5 kVA" },
              { label: "Fleet", value: "4 units (GEN-1 to GEN-4)" },
              { label: "Rotation", value: "Hours-balanced rotation" },
            ],
          },
          "GEN-4": {
            name: "Diesel Generator 4",
            tagline: "Standby-grade 62.5 kVA power unit",
            description:
              "Fourth generator, often held in warm standby. Its output channel doubles as the fleet's redundancy indicator: a flat zero while others run is expected, zero while rotated in is an incident.",
            specs: [
              { label: "Rated output", value: "62.5 kVA" },
              { label: "Fleet", value: "4 units (GEN-1 to GEN-4)" },
              { label: "Role", value: "Rotating standby" },
            ],
          },
          "PIPE-MAITRI": {
            name: "Lake Priyadarshini Heated Pipeline",
            tagline: "Station water supply - freeze-critical",
            description:
              "The heated pipeline that carries water from Lake Priyadarshini into the main station. This is Maitri's best-known single point of failure: if trace heating trips in extreme cold, the line can freeze in roughly 45 minutes. Temperature is monitored continuously against a hard critical band.",
            specs: [
              { label: "Source", value: "Lake Priyadarshini (0.297 sq km)" },
              { label: "Freeze risk window", value: "~45 min if heat trace trips" },
              { label: "Critical band", value: "Below 2 degrees C" },
            ],
          },
          "PDU-MAITRI": {
            name: "Main Power Distribution Unit",
            tagline: "Station bus frequency monitor",
            description:
              "Watches the station's main bus frequency. The generator fleet keeps the bus near 50 Hz; sustained drift beyond half a hertz indicates load imbalance or governor trouble and raises warnings before protection trips.",
            specs: [
              { label: "Nominal", value: "50 Hz" },
              { label: "Warning band", value: "49.5 to 50.5 Hz" },
              { label: "Critical band", value: "49.0 to 51.0 Hz" },
            ],
          },
        }
      : {
          "CHP-1": {
            name: "Combined Heat and Power Unit 1",
            tagline: "100 kVA electrical plus 150 kW thermal",
            description:
              "Bharati's primary CHP unit: a 100 kVA generator whose jacket heat is recovered through a hot-water loop to heat the habitat. Both the electrical output and the loop temperature are instrumented, because losing heat recovery matters as much as losing power.",
            specs: [
              { label: "Electrical", value: "100 kVA" },
              { label: "Thermal recovery", value: "150 kW" },
              { label: "Fleet", value: "3 units (CHP-1 to CHP-3)" },
            ],
          },
          "CHP-2": {
            name: "Combined Heat and Power Unit 2",
            tagline: "100 kVA electrical plus 150 kW thermal",
            description:
              "Second CHP unit, load-sharing with its siblings. The hot-water loop temperature channel shows how much of the station's heating burden this unit is currently carrying.",
            specs: [
              { label: "Electrical", value: "100 kVA" },
              { label: "Thermal recovery", value: "150 kW" },
              { label: "Loop", value: "Hot water, habitat heating" },
            ],
          },
          "CHP-3": {
            name: "Combined Heat and Power Unit 3",
            tagline: "100 kVA electrical plus 150 kW thermal",
            description:
              "Third CHP unit. Together the three units cover Bharati's electrical and heating demand for a complement of 47, with margins enforced by the threshold bands on both output and loop temperature.",
            specs: [
              { label: "Electrical", value: "100 kVA" },
              { label: "Thermal recovery", value: "150 kW" },
              { label: "Loop high limit", value: "85 degrees C warning" },
            ],
          },
          "PDU-BHARATI": {
            name: "Main Power Distribution Unit",
            tagline: "Station bus frequency monitor",
            description:
              "Bharati's main bus frequency channel. Three CHP units in parallel hold the bus near 50 Hz; drift beyond the band points at load imbalance or a governing fault.",
            specs: [
              { label: "Nominal", value: "50 Hz" },
              { label: "Warning band", value: "49.5 to 50.5 Hz" },
              { label: "Critical band", value: "49.0 to 51.0 Hz" },
            ],
          },
          "SWPUMP-BHARATI": {
            name: "Seawater Pump House",
            tagline: "Intake flow monitor - 450 m line",
            description:
              "Bharati draws all fresh and process water directly from the sea through a 450-metre intake and discharge. Flow through the pump house is a safety channel: a collapse toward the critical band means ice blockage or pump failure and triggers an incident.",
            specs: [
              { label: "Intake", value: "450 m sea line" },
              { label: "Warning band", value: "Below 28 cubic metres per hour" },
              { label: "Critical band", value: "Below 15 cubic metres per hour" },
            ],
          },
        }),
  };

  const entries: CatalogEntry[] = [];
  for (const [equipmentId, sensorDefs] of byEquipment) {
    const m = meta[equipmentId];
    entries.push({
      equipmentId,
      name: m?.name ?? equipmentId,
      subsystem: sensorDefs[0].subsystem,
      tagline:
        m?.tagline ??
        `${sensorDefs[0].parameter} instrumentation`,
      description:
        m?.description ??
        `Instrumentation cluster reporting ${sensorDefs.map((d) => d.parameter.toLowerCase()).join(", ")} at ${slug === "maitri" ? "Maitri" : "Bharati"}. Channels are evaluated against per-sensor threshold bands every simulation tick.`,
      specs: m?.specs ?? [
        { label: "Subsystem", value: sensorDefs[0].subsystem },
        { label: "Channels", value: String(sensorDefs.length) },
      ],
      sensors: sensorDefs.map((d) => ({
        sensorId: d.sensorId,
        parameter: d.parameter,
        unit: d.unit,
      })),
    });
  }
  return entries.sort((a, b) => a.equipmentId.localeCompare(b.equipmentId));
}
