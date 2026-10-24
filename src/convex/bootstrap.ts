import { action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Idempotent bootstrap: ensures the station catalog, telemetry history and the
 * full operations data set (rosters, microgrid, weather, satellite passes,
 * NCPOR library, ISEA expedition log and audit chain) exist. Called from the
 * dashboard when the station list is empty and from the sign-in flow.
 */
export const ensureSeeded = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    ok: boolean;
    operations: {
      personnel: number;
      microgrid: number;
      weather: number;
      passes: number;
      documents: number;
      expeditions: number;
      audit: number;
    };
  }> => {
    const now = Date.now();
    await ctx.runMutation(internal.seed.seedStations, { now });
    const operations = await ctx.runMutation(internal.seed.seedOperations, { now });
    return { ok: true, operations };
  },
});
