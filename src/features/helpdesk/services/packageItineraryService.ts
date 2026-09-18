import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";

export type PackageItineraryItemType =
  | "TRANSFER"
  | "HOTEL_CHECKIN"
  | "HOTEL_CHECKOUT"
  | "ACTIVITY"
  | string;

export type PackageItineraryIcon = "CAR" | "HOTEL" | "ACTIVITY" | string;

export interface PackageItineraryItem {
  type: PackageItineraryItemType;
  icon: PackageItineraryIcon;
  title: string;
  description: string | null;
  timeText: string | null;
  cityName: string | null;
  referenceType: string | null;
  referenceId: number | null;
}

export interface PackageItineraryDay {
  dayNumber: number;
  date: string | null;
  displayDate: string | null;
  items: PackageItineraryItem[];
}

export interface PackageItinerarySection {
  routeLabel: string;
  title: string;
  cityName: string | null;
  nights: number | null;
  startDayNumber: number | null;
  endDayNumber: number | null;
  days: PackageItineraryDay[];
}

export interface PackageItinerarySummary {
  packageId: number | null;
  packageInstanceId: number | null;
  packageBookingId: number | null;
  sections: PackageItinerarySection[];
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Unwrap ApiSuccessResponse envelopes (and accidental double-wraps). */
function unwrapPayload(response: unknown): unknown {
  let current = response;
  for (let i = 0; i < 4; i++) {
    if (typeof current === "string") {
      try {
        current = JSON.parse(current);
        continue;
      } catch {
        return current;
      }
    }
    if (!current || typeof current !== "object") return current;
    const obj = current as Record<string, unknown>;
    if (Array.isArray(obj.sections)) return current;
    if ("data" in obj && obj.data != null) {
      current = obj.data;
      continue;
    }
    return current;
  }
  return current;
}

function normalizeItem(raw: unknown): PackageItineraryItem {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    type: String(obj.type || ""),
    icon: String(obj.icon || ""),
    title: String(obj.title || "—"),
    description:
      obj.description != null && String(obj.description).trim()
        ? String(obj.description)
        : null,
    timeText:
      obj.timeText != null && String(obj.timeText).trim()
        ? String(obj.timeText)
        : null,
    cityName:
      obj.cityName != null && String(obj.cityName).trim()
        ? String(obj.cityName)
        : null,
    referenceType:
      obj.referenceType != null ? String(obj.referenceType) : null,
    referenceId: toNumber(obj.referenceId),
  };
}

function normalizeDay(raw: unknown): PackageItineraryDay {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const itemsRaw = Array.isArray(obj.items) ? obj.items : [];
  return {
    dayNumber: toNumber(obj.dayNumber) ?? 0,
    date: obj.date != null ? String(obj.date) : null,
    displayDate: obj.displayDate != null ? String(obj.displayDate) : null,
    items: itemsRaw.map(normalizeItem),
  };
}

function normalizeSection(raw: unknown): PackageItinerarySection {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const daysRaw = Array.isArray(obj.days) ? obj.days : [];
  return {
    routeLabel: String(obj.routeLabel || ""),
    title: String(obj.title || "—"),
    cityName:
      obj.cityName != null && String(obj.cityName).trim()
        ? String(obj.cityName)
        : null,
    nights: toNumber(obj.nights),
    startDayNumber: toNumber(obj.startDayNumber),
    endDayNumber: toNumber(obj.endDayNumber),
    days: daysRaw.map(normalizeDay),
  };
}

function normalizeSummary(raw: unknown): PackageItinerarySummary {
  const unwrapped = unwrapPayload(raw);
  const obj = (
    unwrapped && typeof unwrapped === "object" ? unwrapped : {}
  ) as Record<string, unknown>;
  const sectionsRaw = Array.isArray(obj.sections)
    ? obj.sections
    : Array.isArray(obj.itinerarySections)
      ? obj.itinerarySections
      : [];
  return {
    packageId: toNumber(obj.packageId),
    packageInstanceId: toNumber(obj.packageInstanceId),
    packageBookingId: toNumber(obj.packageBookingId),
    sections: sectionsRaw.map(normalizeSection),
  };
}

export const packageItineraryService = {
  async getItinerarySummary(
    packageBookingId: string | number,
  ): Promise<PackageItinerarySummary> {
    const response = await apiClient.get<
      | ApiSuccessResponse<Record<string, unknown>>
      | Record<string, unknown>
    >(API_ENDPOINTS.CUSTOMER.PACKAGE_ITINERARY_SUMMARY(packageBookingId));
    return normalizeSummary(response);
  },
};
