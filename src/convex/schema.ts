import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/**
 * DhruvaTwin operator roles (v1):
 * - admin: full access, can manage users and thresholds
 * - commander: mission overview across stations
 * - scientist: read/write access to telemetry, alerts and analysis
 * - station: standard station personnel account
 */
export const DHruvaTwinRoles = {
  ADMIN: "admin",
  COMMANDER: "commander",
  SCIENTIST: "scientist",
  STATION: "station",
} as const;

export const twinRoleValidator = v.union(
  v.literal(DHruvaTwinRoles.ADMIN),
  v.literal(DHruvaTwinRoles.COMMANDER),
  v.literal(DHruvaTwinRoles.SCIENTIST),
  v.literal(DHruvaTwinRoles.STATION),
);

/** Alert severity ramp used across the dashboard. */
export const severityValidator = v.union(
  v.literal("critical"),
  v.literal("warning"),
  v.literal("watch"),
  v.literal("info"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // DhruvaTwin extensions
      twinRole: v.optional(twinRoleValidator),
      stationId: v.optional(v.id("stations")),
      organisation: v.optional(v.string()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    /**
     * Antarctic research stations. Seeded with the four Indian stations;
     * v1 dashboards focus on Maitri and Bharati.
     */
    stations: defineTable({
      slug: v.string(), // "maitri", "bharati", "dakshin-gangotri", "maitri-ii"
      name: v.string(),
      latitude: v.number(),
      longitude: v.number(),
      builtYear: v.optional(v.number()),
      capacity: v.optional(v.number()),
      status: v.string(), // "operational" | "seasonal" | "buried" | "planned"
      region: v.string(),
    }).index("by_slug", ["slug"]),

    /**
     * Rolling live telemetry produced by the station sensor simulation.
     * Kept to a working window via prunes so the table stays small.
     */
    telemetry: defineTable({
      stationId: v.id("stations"),
      subsystem: v.string(), // power | thermal | life_support | environment | comms | safety
      equipmentId: v.string(), // e.g. "GEN-1", "CHP-2", "AWS-MAITRI"
      sensorId: v.string(), // e.g. "power.output_kw", "thermal.cabin_temp"
      parameter: v.string(), // display label
      value: v.number(),
      unit: v.string(),
      qualityFlag: v.string(), // "good" | "suspect" | "offline"
      timestamp: v.number(),
    })
      .index("by_station_sensor", ["stationId", "sensorId", "timestamp"])
      .index("by_timestamp", ["timestamp"]),

    /**
     * Alerts raised by threshold evaluation or manual operator reports.
     */
    /**
     * Operator-authored content: field observations, maintenance logs and
     * questions attached to a station's equipment. Comments attach to notes.
     */
    stationNotes: defineTable({
      authorId: v.id("users"),
      stationId: v.id("stations"),
      equipmentId: v.string(),
      sensorId: v.optional(v.string()),
      title: v.string(),
      body: v.string(),
      kind: v.union(
        v.literal("observation"),
        v.literal("maintenance"),
        v.literal("question"),
      ),
      status: v.union(v.literal("published"), v.literal("removed")),
      createdAt: v.number(),
    })
      .index("by_station_created", ["stationId", "createdAt"])
      .index("by_equipment", ["stationId", "equipmentId"])
      .index("by_author", ["authorId", "createdAt"]),

    /** Threaded comments on station notes. */
    noteComments: defineTable({
      noteId: v.id("stationNotes"),
      authorId: v.id("users"),
      body: v.string(),
      status: v.union(v.literal("published"), v.literal("removed")),
      createdAt: v.number(),
    }).index("by_note", ["noteId", "createdAt"]),

    alerts: defineTable({
      stationId: v.id("stations"),
      incidentId: v.optional(v.string()),
      subsystem: v.string(),
      equipmentId: v.string(),
      sensorId: v.optional(v.string()),
      severity: severityValidator,
      message: v.string(),
      sensorReading: v.optional(v.string()),
      actuatorState: v.optional(v.string()),
      acknowledged: v.boolean(),
      acknowledgedBy: v.optional(v.id("users")),
      acknowledgedAt: v.optional(v.number()),
      resolved: v.boolean(),
      resolvedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_station_created", ["stationId", "createdAt"])
      .index("by_open", ["resolved", "createdAt"]),

    /**
     * Station personnel roster. Each member carries an RFID badge, a UHF
     * radio channel, a medical clearance state and a duty shift.
     */
    personnel: defineTable({
      stationId: v.id("stations"),
      badgeId: v.string(),
      name: v.string(),
      role: v.string(),
      sector: v.string(),
      rfidStatus: v.union(
        v.literal("valid"),
        v.literal("expired"),
        v.literal("unassigned"),
      ),
      uhfChannel: v.string(),
      medStatus: v.union(
        v.literal("fit"),
        v.literal("monitor"),
        v.literal("restricted"),
      ),
      dutyShift: v.string(),
      present: v.boolean(),
      lastSync: v.number(),
    })
      .index("by_station", ["stationId"])
      .index("by_badge", ["badgeId"]),

    /** Per-source microgrid output / thermal recovery / storage state. */
    microgridReadings: defineTable({
      stationId: v.id("stations"),
      source: v.string(),
      outputKw: v.number(),
      thermalKw: v.number(),
      soc: v.number(),
      loadKw: v.number(),
      timestamp: v.number(),
    })
      .index("by_station_time", ["stationId", "timestamp"])
      .index("by_station_source", ["stationId", "source", "timestamp"]),

    /** Automatic weather station history for the local environment screens. */
    weatherReadings: defineTable({
      stationId: v.id("stations"),
      temperature: v.number(),
      windSpeed: v.number(),
      windDirection: v.number(),
      pressure: v.number(),
      timestamp: v.number(),
    }).index("by_station_time", ["stationId", "timestamp"]),

    /** Scheduled satellite passes with pointing prediction and link budget. */
    satellitePasses: defineTable({
      stationId: v.id("stations"),
      satelliteName: v.string(),
      azimuth: v.number(),
      elevation: v.number(),
      scheduledAt: v.number(),
      durationSec: v.number(),
      linkBudget: v.number(),
    }).index("by_station_time", ["stationId", "scheduledAt"]),

    /** Hash-chained command log backing the audit trail screen. */
    commandLogs: defineTable({
      sequence: v.number(),
      node: v.string(),
      stationSlug: v.string(),
      category: v.string(),
      message: v.string(),
      timestamp: v.number(),
      hash: v.string(),
      prevHash: v.string(),
    })
      .index("by_sequence", ["sequence"])
      .index("by_time", ["timestamp"]),

    /** NCPOR / NPDC reference library. */
    documents: defineTable({
      title: v.string(),
      category: v.string(),
      url: v.string(),
      summary: v.string(),
      npdcStandard: v.optional(v.string()),
      tags: v.array(v.string()),
      publishedAt: v.number(),
    })
      .index("by_category", ["category"])
      .index("by_published", ["publishedAt"]),

    /** Indian Scientific Expedition to Antarctica (ISEA) log. */
    expeditions: defineTable({
      number: v.number(),
      year: v.string(),
      teamSize: v.number(),
      focus: v.string(),
      summary: v.string(),
      stationSlug: v.string(),
      leaderRole: v.string(),
    }).index("by_number", ["number"]),

    /**
     * Satellite blackout events. The AI continuity engine records the
     * prediction that preceded the drop and, after recovery, the measured
     * coverage so the two can be reconciled.
     */
    blackoutEvents: defineTable({
      stationId: v.id("stations"),
      startedAt: v.number(),
      endedAt: v.optional(v.number()),
      predictedAt: v.number(),
      confidence: v.number(),
      status: v.union(v.literal("active"), v.literal("reconciled")),
      trigger: v.string(),
      predictedCoverage: v.number(),
      actualCoverage: v.optional(v.number()),
      reconciliationNote: v.optional(v.string()),
      model: v.string(),
      accuracyTarget: v.number(),
    })
      .index("by_station_time", ["stationId", "startedAt"])
      .index("by_status", ["status"]),

    /** Audit record of every NPDC metadata export generated on the platform. */
    npdcExports: defineTable({
      stationSlug: v.string(),
      datasetId: v.string(),
      standard: v.string(),
      recordCount: v.number(),
      generatedAt: v.number(),
      generatedBy: v.optional(v.string()),
    }).index("by_station_time", ["stationSlug", "generatedAt"]),

    /**
     * Cascade drills. Each run stores the trigger, the isolation plan and the
     * full downstream propagation, so a drill can be replayed and compared.
     */
    cascadeRuns: defineTable({
      stationSlug: v.string(),
      triggerId: v.string(),
      triggerLabel: v.string(),
      severity: v.string(),
      impacted: v.number(),
      isolated: v.number(),
      minutesBought: v.number(),
      resilience: v.number(),
      crewRiskNode: v.optional(v.string()),
      recommendation: v.string(),
      impacts: v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          timeToImpactSec: v.number(),
          probability: v.number(),
          severity: v.string(),
          state: v.string(),
        }),
      ),
      runBy: v.string(),
      timestamp: v.number(),
    })
      .index("by_time", ["timestamp"])
      .index("by_station_time", ["stationSlug", "timestamp"]),

    /** One row per completed telemetry repair procedure. */
    repairLog: defineTable({
      stationSlug: v.string(),
      equipmentId: v.string(),
      sensorId: v.string(),
      parameter: v.string(),
      cause: v.string(),
      procedure: v.string(),
      steps: v.array(v.string()),
      readingBefore: v.string(),
      clearedAlerts: v.number(),
      repairedBy: v.string(),
      timestamp: v.number(),
    }).index("by_station_time", ["stationSlug", "timestamp"]),

    /**
     * Wildlife sightings recorded from the twin or reported by a field party,
     * with the count, the location and the observer.
     */
    sightings: defineTable({
      stationSlug: v.string(),
      speciesId: v.string(),
      speciesName: v.string(),
      count: v.number(),
      location: v.string(),
      note: v.string(),
      observer: v.string(),
      timestamp: v.number(),
    })
      .index("by_time", ["timestamp"])
      .index("by_station_time", ["stationSlug", "timestamp"]),

    /** FPGA self-healing and telemetry-integrity self-test results. */
    selfTests: defineTable({
      stationSlug: v.string(),
      suite: v.string(),
      trials: v.number(),
      corrected: v.number(),
      correctedTmr: v.number(),
      correctedScrub: v.number(),
      correctedDouble: v.number(),
      detectedUncorrectable: v.number(),
      undetected: v.number(),
      scrubs: v.number(),
      meanScrubMs: v.number(),
      pass: v.boolean(),
      notes: v.string(),
      runBy: v.string(),
      timestamp: v.number(),
    }).index("by_station_time", ["stationSlug", "timestamp"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
