import { apiClient } from "@/services/api/client";
import { API_ENDPOINTS } from "@/constants";
import type { ApiSuccessResponse } from "@/services/api/types/api";
import type { RatesData } from "../type";

const RATE_PLAN_DISPLAY_ORDER: Record<string, number> = {
  EP: 0,
  CP: 1,
  MAP: 2,
  AP: 3,
};

const getRatePlanOrder = (planCode?: string | null): number => {
  if (!planCode) return Number.MAX_SAFE_INTEGER;
  const normalizedPlanCode = planCode.trim().toUpperCase();
  return RATE_PLAN_DISPLAY_ORDER[normalizedPlanCode] ?? Number.MAX_SAFE_INTEGER;
};

export interface UpdateSingleRateRequest {
  roomId: number;
  ratePlanId: number;
  customerType: string;
  date: string; // YYYY-MM-DD
  currency: string | null;
  /** Only fields the user changed are sent (partial update). */
  baseRate?: number;
  singleOccupancyRate?: number | null;
  extraAdultCharge?: number;
  paidChildCharge?: number;
  minStay?: number | null;
  maxStay?: number | null;
  cutoffTime?: string | null;
}

export interface SingleDerivedRateRequest {
  roomId: number;
  ratePlanId: number;
  customerType: string;
  date: string;
  baseRate: number;
  singleOccupancyRate: number;
  extraAdultCharge: number;
  paidChildCharge: number;
  minStay: number;
  maxStay: number;
  cutoffTime: string;
  currency: string;
}

export interface BulkUpdateRatesRequest {
  roomId: number;
  ratePlanId: number;
  customerType: string;
  from: string; // YYYY-MM-DD (start date)
  to: string; // YYYY-MM-DD (end date)
  weekDays?: string[]; // ["MON","TUE","WED","THU","FRI","SAT","SUN"]
  baseRate?: number;
  singleOccupancyRate?: number;
  extraAdultCharge?: number;
  paidChildCharge?: number;
  minStay?: number | null;
  maxStay?: number | null;
  cutoffTime?: string | null;
  currency?: string;
}

export type TargetPricingRuleMode =
  | "SAME_AS_SOURCE"
  | "PERCENTAGE_DECREASE"
  | "PERCENTAGE_INCREASE"
  | "FIXED_DECREASE"
  | "FIXED_INCREASE";

export type TargetPricingRule =
  | { mode: "SAME_AS_SOURCE" }
  | { mode: "PERCENTAGE_DECREASE"; percentage: number }
  | { mode: "PERCENTAGE_INCREASE"; percentage: number }
  | { mode: "FIXED_DECREASE"; fixedAmount: number }
  | { mode: "FIXED_INCREASE"; fixedAmount: number };

export interface BulkUpdateDerivedRatesRequest {
  roomId: number;
  ratePlanId: number;
  from: string;
  to: string;
  weekDays: string[];
  currency: string;
  sourceCustomerType: string;
  targetCustomerType: string;
  sourceRates: {
    baseRate?: number;
    singleOccupancyRate?: number;
    extraAdultCharge?: number;
    paidChildCharge?: number;
  };
  targetPricingRules: {
    baseRate?: TargetPricingRule;
    singleOccupancyRate?: TargetPricingRule;
    extraAdultCharge?: TargetPricingRule;
    paidChildCharge?: TargetPricingRule;
  };
  previewOnly?: boolean;
}

export type LinkRatePlanAdjustmentDirection = "LOWER" | "HIGHER";
export type LinkRatePlanAdjustmentType = "FIXED" | "PERCENTAGE";

export interface LinkRatePlanLinkApiPayload {
  masterRatePlanId: number;
  slaveRatePlanId: number;
  adjustmentDirection: LinkRatePlanAdjustmentDirection;
  adjustmentType: LinkRatePlanAdjustmentType;
  adjustmentValue: number;
  linkExtraGuestRates: boolean;
  extraGuestAdjustmentType?: LinkRatePlanAdjustmentType;
  extraGuestAdjustmentValue?: number;
  copyRestrictions?: boolean;
}

export interface HotelRatePlanListItem {
  ratePlanId: number;
  ratePlanName: string;
  roomId?: number | string;
  roomName?: string | null;
  mealPlan?: string | null;
  paymentMode?: string | null;
  active?: boolean;
}

export interface HotelRatePlansByRoomResponse {
  totalRooms?: number;
  totalRatePlans?: number;
  rooms?: Array<{
    roomId: string;
    roomName: string;
    roomTypeCode?: string | null;
    active?: boolean;
    totalRatePlans?: number;
    ratePlans?: Array<{
      ratePlanId: number;
      ratePlanName: string;
      mealPlan?: string | null;
      paymentMode?: string | null;
      active?: boolean;
    }>;
  }>;
}

export interface LinkRatePlanLinkAdvancedInput {
  linkExtraGuestRates: boolean;
  extraGuestAdjustment: number;
  extraGuestUnit: "PERCENT" | "INR";
  linkRestrictions: boolean;
}

/** Row from GET /hotel/rate-plan/link?masterRatePlanId=… */
export interface RatePlanLinkRecord {
  id: number;
  roomId?: number;
  masterRoomId?: number;
  slaveRoomId?: number;
  masterRatePlanId: number;
  slaveRatePlanId: number;
  adjustmentType: LinkRatePlanAdjustmentType;
  adjustmentDirection: LinkRatePlanAdjustmentDirection;
  adjustmentValue: number;
  linkExtraGuestRates: boolean;
  extraGuestAdjustmentType?: LinkRatePlanAdjustmentType;
  extraGuestAdjustmentValue?: number;
  copyRestrictions?: boolean;
  active?: boolean;
}

/** Maps link-rate sidebar state to POST /hotel/rate-plan/link body. */
export function toLinkRatePlanLinkPayload(
  masterRatePlanId: number,
  slaveRatePlanId: number,
  adjustmentDirection: LinkRatePlanAdjustmentDirection,
  unit: "PERCENT" | "INR",
  adjustmentValue: number,
  advanced: LinkRatePlanLinkAdvancedInput,
): LinkRatePlanLinkApiPayload {
  const adjustmentType: LinkRatePlanAdjustmentType =
    unit === "INR" ? "FIXED" : "PERCENTAGE";
  const base: LinkRatePlanLinkApiPayload = {
    masterRatePlanId,
    slaveRatePlanId,
    adjustmentDirection,
    adjustmentType,
    adjustmentValue,
    linkExtraGuestRates: advanced.linkExtraGuestRates,
  };
  if (!advanced.linkExtraGuestRates) return base;
  return {
    ...base,
    extraGuestAdjustmentType:
      advanced.extraGuestUnit === "INR" ? "FIXED" : "PERCENTAGE",
    extraGuestAdjustmentValue: advanced.extraGuestAdjustment,
    copyRestrictions: advanced.linkRestrictions,
  };
}

export const rateService = {
  getCalendar: async (
    hotelId: string,
    fromDate: string,
    toDate: string,
    customerType: string = "RETAIL"
  ): Promise<RatesData> => {
    const response = await apiClient.get<ApiSuccessResponse<RatesData>>(
      API_ENDPOINTS.RATES.GET_CALENDAR(hotelId, fromDate, toDate, customerType)
    );

    // API response: ApiSuccessResponse wraps { data: { hotelId, customerType, from, to, rooms } }
    // So response.data = { hotelId, customerType, from, to, rooms }
    // Structure: rooms[] → ratePlans[] → days[]
    return {
      ...response.data,
      rooms: response.data.rooms.map((room) => ({
        ...room,
        ratePlans: [...room.ratePlans].sort((firstPlan, secondPlan) => {
          const orderDiff =
            getRatePlanOrder(firstPlan.plan_code) -
            getRatePlanOrder(secondPlan.plan_code);

          if (orderDiff !== 0) return orderDiff;
          return firstPlan.ratePlanName.localeCompare(secondPlan.ratePlanName);
        }),
      })),
    };
  },

  updateSingleRate: async (
    request: UpdateSingleRateRequest
  ): Promise<void> => {
    await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.RATES.UPDATE_SINGLE_DERIVED,
      request
    );
  },

  bulkUpdateRates: async (
    request: BulkUpdateRatesRequest
  ): Promise<void> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.RATES.UPDATE_BULK,
      request
    );
  },

  bulkUpdateDerivedRates: async (
    request: BulkUpdateDerivedRatesRequest
  ): Promise<void> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.RATES.UPDATE_BULK_DERIVED,
      request
    );
  },

  createSingleDerivedRate: async (
    request: SingleDerivedRateRequest
  ): Promise<void> => {
    await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.RATES.UPDATE_SINGLE_DERIVED,
      request
    );
  },

  linkRatePlans: async (payload: LinkRatePlanLinkApiPayload): Promise<void> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.RATES.LINK_RATE_PLANS,
      payload,
    );
  },

  getHotelRatePlans: async (hotelId: string): Promise<HotelRatePlanListItem[]> => {
    const response = await apiClient.get<
      ApiSuccessResponse<
        | HotelRatePlanListItem[]
        | HotelRatePlansByRoomResponse
        | {
            ratePlans?: HotelRatePlanListItem[];
            content?: HotelRatePlanListItem[];
            data?: HotelRatePlanListItem[] | HotelRatePlansByRoomResponse;
          }
      >
    >(API_ENDPOINTS.RATES.GET_RATE_PLANS(hotelId));
    const raw = response.data;
    if (Array.isArray(raw)) return raw;

    const flattenRooms = (
      payload: HotelRatePlansByRoomResponse | null | undefined,
    ): HotelRatePlanListItem[] => {
      if (!payload?.rooms || !Array.isArray(payload.rooms)) return [];
      return payload.rooms.flatMap((room) =>
        (room.ratePlans || []).map((rp) => ({
          ratePlanId: rp.ratePlanId,
          ratePlanName: rp.ratePlanName,
          roomId: room.roomId,
          roomName: room.roomName,
          mealPlan: rp.mealPlan ?? null,
          paymentMode: rp.paymentMode ?? null,
          active: rp.active,
        })),
      );
    };

    if (raw && typeof raw === "object") {
      const fromRawRooms = flattenRooms(raw as HotelRatePlansByRoomResponse);
      if (fromRawRooms.length > 0) return fromRawRooms;
      if (Array.isArray(raw.ratePlans)) return raw.ratePlans;
      if (Array.isArray(raw.content)) return raw.content;
      if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
        const fromNestedDataRooms = flattenRooms(
          raw.data as HotelRatePlansByRoomResponse,
        );
        if (fromNestedDataRooms.length > 0) return fromNestedDataRooms;
      }
      if (Array.isArray(raw.data)) return raw.data;
    }
    return [];
  },

  getRatePlanLinksByMaster: async (
    masterRatePlanId: number,
  ): Promise<RatePlanLinkRecord[]> => {
    const response = await apiClient.get<
      ApiSuccessResponse<RatePlanLinkRecord[]>
    >(API_ENDPOINTS.RATES.GET_RATE_PLAN_LINKS_BY_MASTER(masterRatePlanId));
    const raw = response.data;
    return Array.isArray(raw) ? raw : [];
  },

  updateRatePlanLink: async (
    linkId: number,
    payload: LinkRatePlanLinkApiPayload,
  ): Promise<void> => {
    await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.RATES.UPDATE_RATE_PLAN_LINK(linkId),
      payload,
    );
  },

  /** DELETE /hotel/rate-plan/link/{linkId} — removes the link. */
  deleteRatePlanLink: async (linkId: number): Promise<void> => {
    await apiClient.delete<ApiSuccessResponse<null>>(
      API_ENDPOINTS.RATES.UPDATE_RATE_PLAN_LINK(linkId),
    );
  },

  getMissingRates: async (
    request: MissingRatesRequest,
  ): Promise<MissingRatesData> => {
    const response = await apiClient.post<ApiSuccessResponse<MissingRatesData>>(
      API_ENDPOINTS.RATES.MISSING_RATES,
      request,
    );
    return response.data;
  },
};

export interface MissingRatesRequest {
  hotelId: string;
  startDate: string;
  endDate: string;
  rateType: string;
}

export interface MissingRatePlanRef {
  ratePlanId: number;
  ratePlanName: string;
}

export interface MissingRatesRoom {
  roomId: number;
  roomName: string;
  missingRatePlans: MissingRatePlanRef[];
}

export interface MissingRatesDateEntry {
  date: string;
  missingRooms: MissingRatesRoom[];
}

export interface MissingRatesSummary {
  totalDatesChecked: number;
  totalMissingDates: number;
  totalMissingRateEntries: number;
}

export interface MissingRatesData {
  hotelId: string;
  hotelName: string;
  rateType: string;
  startDate: string;
  endDate: string;
  summary: MissingRatesSummary;
  missingDates: MissingRatesDateEntry[];
}

