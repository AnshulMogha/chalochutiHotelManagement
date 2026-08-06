import type {
  HotelRoom,
  RatePlan,
} from "@/features/admin/services/adminService";

/** Suspended/inactive rooms come back with `active: false`. */
export function isActiveRoom(room: HotelRoom): boolean {
  return room.active !== false;
}

/**
 * A rate plan is offerable only when both flags allow it; the room list and the
 * rate-plan endpoint each populate a different one.
 */
export function isActiveRatePlan(ratePlan: RatePlan): boolean {
  return ratePlan.active !== false && ratePlan.ratePlanActive !== false;
}
