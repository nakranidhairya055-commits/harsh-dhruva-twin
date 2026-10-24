import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useStationLink, type StationLink } from "@/hooks/use-station-link";

/**
 * One MQTT link per browser session.
 *
 * The command centre, the twin and the mobile field views all publish and
 * queue through the same client so the broker sees a single station session
 * and the offline outbox has one writer.
 */
const IDLE_LINK: StationLink = {
  status: "idle",
  detail: "",
  online: true,
  broker: "broker.hivemq.com",
  pending: 0,
  byPriority: { 1: 0, 2: 0, 3: 0, 4: 0 },
  oldestAt: null,
  published: 0,
  lastPublishAt: null,
  messages: [],
  send: async () => {},
  clear: async () => {},
  flush: async () => {},
};

const StationLinkContext = createContext<StationLink>(IDLE_LINK);

export function StationLinkProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const readings = useQuery(api.telemetry.getLiveReadings, { slug });
  const channels = useMemo(
    () =>
      (readings ?? []).map((r) => ({
        equipmentId: r.equipmentId,
        sensorId: r.sensorId,
        parameter: r.parameter,
        value: r.value,
        unit: r.unit,
        status: r.status,
        decimals: r.decimals,
      })),
    [readings],
  );
  const link = useStationLink(slug, channels);
  return (
    <StationLinkContext.Provider value={link}>{children}</StationLinkContext.Provider>
  );
}

/** Access the shared station link. Safe to call outside a provider. */
export function useStationLinkContext(): StationLink {
  return useContext(StationLinkContext);
}
