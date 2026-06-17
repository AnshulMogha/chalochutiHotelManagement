import type { HotelRatePlanListItem } from "../services/rateService";

/** Rate plans that can be chosen as the base for linking (excludes the plan being edited). */
export function filterLinkableRatePlans(
  allRatePlans: HotelRatePlanListItem[],
  currentRatePlanId: number,
): HotelRatePlanListItem[] {
  return allRatePlans.filter((rp) => rp.ratePlanId !== currentRatePlanId);
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
