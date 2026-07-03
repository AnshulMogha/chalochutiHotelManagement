import type { HotelRatePlanListItem } from "../services/rateService";
import type { RatesRoom, RoomRatePlan } from "../type";

export type LinkRatePlanFilterMode = "add" | "update";

export function buildLinkedRatePlanKey(
  roomId: number,
  ratePlanId: number,
): string {
  return `${roomId}:${ratePlanId}`;
}

export function isLinkedRatePlanForBaseSelection(
  ratePlan: Pick<RoomRatePlan, "ratePlanLink" | "isSlave">,
  _mode: LinkRatePlanFilterMode = "update",
): boolean {
  const role = ratePlan.ratePlanLink?.role?.toUpperCase();
  // Slaves cannot be chosen as a base plan; masters remain selectable so slaves can switch parent.
  return role === "SLAVE" || role === "BOTH" || ratePlan.isSlave === true;
}

/** Keys for rate plans excluded from the base-plan dropdown. */
export function getLinkedRatePlanKeysFromCalendar(
  rateRooms: RatesRoom[],
  mode: LinkRatePlanFilterMode = "update",
): Set<string> {
  const keys = new Set<string>();
  for (const room of rateRooms) {
    for (const plan of room.ratePlans) {
      if (isLinkedRatePlanForBaseSelection(plan, mode)) {
        keys.add(buildLinkedRatePlanKey(room.roomId, plan.ratePlanId));
      }
    }
  }
  return keys;
}

function getHotelRatePlanLinkRole(
  ratePlan: Pick<HotelRatePlanListItem, "role" | "ratePlanLink" | "isSlave">,
): string | null {
  const role = ratePlan.role ?? ratePlan.ratePlanLink?.role;
  if (!role) return ratePlan.isSlave === true ? "SLAVE" : null;
  return role.toUpperCase();
}

/** True when the rate plan should be hidden from the base-plan dropdown. */
export function shouldExcludeRatePlanFromBaseDropdown(
  ratePlan: Pick<HotelRatePlanListItem, "role" | "ratePlanLink" | "isSlave">,
  _mode: LinkRatePlanFilterMode,
): boolean {
  const role = getHotelRatePlanLinkRole(ratePlan);
  return role === "SLAVE" || role === "BOTH" || ratePlan.isSlave === true;
}

/** @deprecated Use shouldExcludeRatePlanFromBaseDropdown with mode instead. */
export function isHotelRatePlanAlreadyLinked(
  ratePlan: Pick<HotelRatePlanListItem, "role" | "ratePlanLink" | "isSlave">,
): boolean {
  return shouldExcludeRatePlanFromBaseDropdown(ratePlan, "update");
}

function isHotelRatePlanLinked(
  ratePlan: HotelRatePlanListItem,
  linkedRatePlanKeys: Set<string>,
): boolean {
  if (linkedRatePlanKeys.size === 0) return false;

  if (ratePlan.roomId != null) {
    return linkedRatePlanKeys.has(
      buildLinkedRatePlanKey(Number(ratePlan.roomId), ratePlan.ratePlanId),
    );
  }

  for (const key of linkedRatePlanKeys) {
    const [, planId] = key.split(":");
    if (Number(planId) === ratePlan.ratePlanId) return true;
  }

  return false;
}

/** Rate plans that can be chosen as the base for linking (excludes current + linked plans). */
export function filterLinkableRatePlans(
  allRatePlans: HotelRatePlanListItem[],
  currentRatePlanId: number,
  linkedRatePlanKeys?: Set<string>,
  mode: LinkRatePlanFilterMode = "add",
): HotelRatePlanListItem[] {
  return allRatePlans.filter((ratePlan) => {
    if (ratePlan.ratePlanId === currentRatePlanId) return false;
    if (shouldExcludeRatePlanFromBaseDropdown(ratePlan, mode)) return false;
    if (linkedRatePlanKeys && isHotelRatePlanLinked(ratePlan, linkedRatePlanKeys)) {
      return false;
    }
    return true;
  });
}

export function ratePlansToSelectOptions(
  ratePlans: HotelRatePlanListItem[],
): Array<{ value: string; label: string }> {
  return ratePlans.map((rp) => ({
    value: String(rp.ratePlanId),
    label: `${rp.ratePlanName} (${rp.roomName || "Unknown room"})`,
  }));
}

/** Resolve a rate plan from the hotel list using ratePlanId and optional room hints. */
export function findRatePlanByIdAndRoom(
  plans: HotelRatePlanListItem[],
  ratePlanId: number,
  roomId?: number | string | null,
  roomName?: string | null,
): HotelRatePlanListItem | undefined {
  const matches = plans.filter((rp) => rp.ratePlanId === ratePlanId);
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  if (roomId != null) {
    const byRoomId = matches.find(
      (rp) => String(rp.roomId) === String(roomId),
    );
    if (byRoomId) return byRoomId;
  }
  if (roomName) {
    const normalizedRoomName = roomName.trim();
    const byRoomName = matches.find(
      (rp) => rp.roomName?.trim() === normalizedRoomName,
    );
    if (byRoomName) return byRoomName;
  }
  return matches[0];
}
