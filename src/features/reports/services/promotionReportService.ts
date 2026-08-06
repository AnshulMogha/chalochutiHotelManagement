import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";

export type PromotionLifecycleTab = "ACTIVE" | "EXPIRED";

export type PromotionTier = "TIER_1" | "TIER_2" | "TIER_3";

export type PromotionSortField =
  | "roomNights"
  | "revenue"
  | "name"
  | "type"
  | "expiring"
  | "deactivatedOn"
  | "lastModified";

export type PromotionSortDir = "asc" | "desc";

export type PromotionDatePreset =
  | "THIS_WEEK"
  | "LAST_7_DAYS"
  | "LAST_14_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LAST_180_DAYS"
  | "LAST_365_DAYS"
  | "ALL_TIME"
  | "CUSTOM";

export type PromotionPerformanceAxis = "BOOKING" | "STAY";

export type PromotionApplicabilityFilter =
  | "NAME"
  | "BOOKING_WINDOW"
  | "STAY_WINDOW";

export interface PromotionMoney {
  amount: number;
  currency: string;
}

export interface PromotionReportRow {
  promotionId: string;
  hotelId: string;
  hotelName?: string | null;
  promotionName: string;
  promotionType: string;
  tier: PromotionTier | string;
  promotionTypeLabel?: string | null;
  status: string;
  bookingStartDate?: string | null;
  bookingEndDate?: string | null;
  noEndDateBooking?: boolean;
  bookingDateLabel?: string | null;
  stayStartDate?: string | null;
  stayEndDate?: string | null;
  noEndDateStay?: boolean;
  stayDateLabel?: string | null;
  offerType?: string | null;
  offerMode?: string | null;
  discountAllUsers?: number | null;
  extraLoggedDiscount?: number | null;
  discountLabel?: string | null;
  audienceLabel?: string | null;
  expiringLabel?: string | null;
  daysToExpire?: number | null;
  deactivatedOn?: string | null;
  deactivatedOnLabel?: string | null;
  roomNights: number;
  revenue?: PromotionMoney | null;
  discountGiven?: number | null;
  lastModified?: string | null;
}

export interface PromotionReportResponse {
  lifecycleTab: PromotionLifecycleTab;
  performanceDateAxis: PromotionPerformanceAxis;
  summary: {
    activeCount: number;
    expiredCount: number;
    roomNights: number;
    revenue: number;
    currency: string;
  };
  promotions: PromotionReportRow[];
  page: {
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
    sort?: string;
    direction?: string;
  };
  performanceDateRange: {
    preset?: string | null;
    fromDate: string;
    toDate: string;
  };
}

export interface PromotionReportParams {
  hotelId: string;
  lifecycleTab?: PromotionLifecycleTab;
  page?: number;
  size?: number;
  sort?: PromotionSortField;
  sortDir?: PromotionSortDir;
  promotionTiers?: PromotionTier[];
  datePreset?: PromotionDatePreset;
  fromDate?: string;
  toDate?: string;
  performanceDateAxis?: PromotionPerformanceAxis;
  applicabilityFilter?: PromotionApplicabilityFilter;
  promotionName?: string;
  applicabilityFrom?: string;
  applicabilityTo?: string;
}

const EMPTY_SUMMARY = {
  activeCount: 0,
  expiredCount: 0,
  roomNights: 0,
  revenue: 0,
  currency: "INR",
};

export const promotionReportService = {
  getPromotionReport: async (
    params: PromotionReportParams,
  ): Promise<PromotionReportResponse> => {
    const {
      hotelId,
      lifecycleTab = "ACTIVE",
      page = 0,
      size = 20,
      sort = "roomNights",
      sortDir = "desc",
      promotionTiers,
      datePreset = "LAST_365_DAYS",
      fromDate,
      toDate,
      performanceDateAxis = "BOOKING",
      applicabilityFilter,
      promotionName,
      applicabilityFrom,
      applicabilityTo,
    } = params;

    const search = new URLSearchParams();
    search.set("hotelId", hotelId);
    search.set("lifecycleTab", lifecycleTab);
    search.set("page", String(page));
    search.set("size", String(size));
    search.set("sort", sort);
    search.set("sortDir", sortDir);
    search.set("datePreset", datePreset);
    search.set("performanceDateAxis", performanceDateAxis);

    // Backend accepts repeated params for tiers.
    promotionTiers?.forEach((tier) => search.append("promotionTiers", tier));

    if (datePreset === "CUSTOM") {
      if (fromDate) search.set("fromDate", fromDate);
      if (toDate) search.set("toDate", toDate);
    }

    if (applicabilityFilter) {
      search.set("applicabilityFilter", applicabilityFilter);
      if (applicabilityFilter === "NAME") {
        if (promotionName?.trim()) {
          search.set("promotionName", promotionName.trim());
        }
      } else {
        if (applicabilityFrom) search.set("applicabilityFrom", applicabilityFrom);
        if (applicabilityTo) search.set("applicabilityTo", applicabilityTo);
      }
    }

    const response = await apiClient.get<
      ApiSuccessResponse<PromotionReportResponse>
    >(`${API_ENDPOINTS.REPORTS.PROMOTION_SUMMARY}?${search.toString()}`);

    const payload = response.data;
    return {
      lifecycleTab: payload?.lifecycleTab ?? lifecycleTab,
      performanceDateAxis: payload?.performanceDateAxis ?? performanceDateAxis,
      summary: payload?.summary ?? EMPTY_SUMMARY,
      promotions: Array.isArray(payload?.promotions) ? payload.promotions : [],
      page: payload?.page ?? {
        page,
        size,
        totalPages: 0,
        totalElements: 0,
        sort,
        direction: sortDir.toUpperCase(),
      },
      performanceDateRange: payload?.performanceDateRange ?? {
        preset: datePreset,
        fromDate: fromDate ?? "",
        toDate: toDate ?? "",
      },
    };
  },
};
