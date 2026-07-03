import type { HotelRatePlanListItem } from "../services/rateService";
import type { RatePlanLinkPeer, RoomRatePlan } from "../type";

export const LINKED_SLAVE_RATE_TOOLTIP =
  "This plan is linked, to make changes, update the Parent meal plan in bulk update rate page as well";

type SlaveLinkSource = Pick<RoomRatePlan, "ratePlanLink" | "isSlave"> & {
  role?: string | null;
};

/** When true, this rate plan is a linked slave; its rates are derived from the master plan. */
export function isSlaveLinkedRatePlan(ratePlan: SlaveLinkSource): boolean {
  const role = (ratePlan.role ?? ratePlan.ratePlanLink?.role)?.toUpperCase();
  if (role === "SLAVE") return true;
  if (role === "MASTER" || role === "BOTH") return false;
  return ratePlan.isSlave === true;
}

export function formatLinkedMasterLabel(master: RatePlanLinkPeer): string {
  const meal = master.plan_code?.trim();
  const name = master.ratePlanName?.trim() || "Parent plan";
  const planLabel = meal ? `${meal} (${name})` : name;
  const roomName = master.roomName?.trim();
  return roomName ? `${planLabel} — ${roomName}` : planLabel;
}

export function formatRatePlanLinkAdjustment(peer: RatePlanLinkPeer): string {
  const unit =
    peer.adjustmentType === "PERCENTAGE"
      ? `${peer.adjustmentValue}%`
      : `₹${peer.adjustmentValue}`;
  const direction = peer.adjustmentDirection === "LOWER" ? "Lower" : "Higher";
  return `${direction} by ${unit}`;
}

export function buildBulkRatePlanLinkKey(
  roomId: string | number,
  ratePlanId: number,
): string {
  return `${roomId}-${ratePlanId}`;
}

export interface RatePlanLinkDisplayMeta {
  isSlave: boolean;
  masterLabel: string | null;
}

export function buildRatePlanLinkMetaMap(
  hotelRatePlans: HotelRatePlanListItem[],
  roomUuidByNumericId: Record<number, string> = {},
): Map<string, RatePlanLinkDisplayMeta> {
  const map = new Map<string, RatePlanLinkDisplayMeta>();

  const register = (
    roomId: string | number | undefined,
    ratePlanId: number,
    meta: RatePlanLinkDisplayMeta,
  ) => {
    if (roomId == null || roomId === "") return;
    map.set(buildBulkRatePlanLinkKey(roomId, ratePlanId), meta);
  };

  for (const plan of hotelRatePlans) {
    if (!isSlaveLinkedRatePlan(plan)) continue;

    const master = plan.ratePlanLink?.masters?.[0];
    const meta: RatePlanLinkDisplayMeta = {
      isSlave: true,
      masterLabel: master ? formatLinkedMasterLabel(master) : null,
    };

    register(plan.roomId, plan.ratePlanId, meta);

    const numericRoomId =
      typeof plan.roomId === "number" ? plan.roomId : Number(plan.roomId);
    if (
      Number.isFinite(numericRoomId) &&
      roomUuidByNumericId[numericRoomId]
    ) {
      register(roomUuidByNumericId[numericRoomId], plan.ratePlanId, meta);
    }
  }

  return map;
}
