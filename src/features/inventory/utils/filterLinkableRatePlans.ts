import type { RatePlan } from "@/features/admin/services/adminService";

/** Rate plans that can be chosen as the base for linking (excludes the plan being edited). */
export function filterLinkableRatePlans(
  allRatePlans: RatePlan[],
  currentRatePlanId: number,
): RatePlan[] {
  return allRatePlans.filter((rp) => rp.ratePlanId !== currentRatePlanId);
}

export function ratePlansToSelectOptions(
  ratePlans: RatePlan[],
): Array<{ value: string; label: string }> {
  return ratePlans.map((rp) => ({
    value: String(rp.ratePlanId),
    label: rp.ratePlanName,
  }));
}
