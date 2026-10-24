import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Advance the DhruvaTwin sensor simulation every 10 seconds: new telemetry
 * rows for both instrumented stations plus threshold alert evaluation.
 */
crons.interval(
  "sensor simulation tick",
  { seconds: 10 },
  internal.telemetry.simulateTick,
);

/**
 * Microgrid, weather and satellite-pass simulation every 60 seconds. Kept on
 * a slower cadence than the sensor tick because these are plant-level series.
 */
crons.interval(
  "operations simulation tick",
  { seconds: 60 },
  internal.ops.simulateOpsTick,
);

export default crons;
