import type { RoomKind } from "./plan-types";
import type { RoomDef } from "./plan-types";
import { OpsRoomContents } from "./rooms-ops";
import { LivingRoomContents } from "./rooms-living";

/** Operational room kinds, furnished by the operations module. */
const OPS_KINDS: RoomKind[] = [
  "vestibule",
  "command",
  "comms",
  "server",
  "generator",
  "water",
  "medical",
  "storage",
  "stair",
  "atrium",
  "datacentre",
  "power",
  "wastewater",
  "laboratory",
  "workshop",
];

/** Render the contents of one room. */
export function RoomContents({
  room,
  plan,
  onStair,
}: {
  room: RoomDef;
  plan: { level: number; y: number; height: number };
  onStair?: (dir: 1 | -1) => void;
}) {
  if (OPS_KINDS.includes(room.kind)) {
    return <OpsRoomContents room={room} plan={plan} onStair={onStair} />;
  }
  return <LivingRoomContents room={room} />;
}
