import type { MealPlanRateInput } from "../types";

export function parseMealPlanRateInput(value: string): MealPlanRateInput {
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly === "") return "";
  const normalized = digitsOnly.replace(/^0+(?=\d)/, "");
  return Number(normalized);
}

export function formatMealPlanRateValue(value: MealPlanRateInput): string {
  return value === "" ? "" : String(value);
}

export function toMealPlanRateNumber(value: MealPlanRateInput): number {
  return value === "" ? 0 : value;
}
