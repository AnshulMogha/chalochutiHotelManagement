import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";

export type HotelBdDashboardDatePreset =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_15_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "CUSTOM";

export type HotelBdInboxCategory =
  | "QC_REJECTED"
  | "ZONAL_REJECTED"
  | "ONBOARDING_STUCK"
  | "INCOMPLETE_STEPS"
  | "UNDER_QC"
  | "UNDER_ZONAL_REVIEW";

export type HotelBdInboxSeverity = "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface HotelBdPortfolioKpis {
  assignedHotels: number;
  liveHotels: number;
  hotelsInPipeline: number;
  rejectedHotels: number;
  goLivesInPeriod: number;
}

export interface HotelBdOnboardingFunnel {
  draft: number;
  underQc: number;
  qcRejected: number;
  underZonalReview: number;
  zonalRejected: number;
  live: number;
}

export interface HotelBdActionInboxItem {
  hotelId?: string | null;
  hotelCode: string;
  hotelName: string;
  city?: string | null;
  status: string;
  currentStep?: string | null;
  incompleteSteps: number;
  daysStuck?: number | null;
  rejectionReason?: string | null;
  category: HotelBdInboxCategory;
  severity?: HotelBdInboxSeverity | null;
  message?: string | null;
  updatedAt?: string | null;
}

export interface HotelBdDashboardReportResponse {
  viewer?: string | null;
  allHotels?: boolean;
  dateRange: {
    preset?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
  };
  stuckDaysThreshold: number;
  portfolioKpis: HotelBdPortfolioKpis;
  onboardingFunnel: HotelBdOnboardingFunnel;
  actionInbox: HotelBdActionInboxItem[];
}

export interface HotelBdDashboardReportParams {
  datePreset?: HotelBdDashboardDatePreset;
  fromDate?: string;
  toDate?: string;
  stuckDaysThreshold?: number;
  bdUserId?: string | number;
  search?: string;
  city?: string;
}

function unwrapPayload<T>(response: ApiSuccessResponse<T> | T): T {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    (response as ApiSuccessResponse<T>).status === "SUCCESS"
  ) {
    return (response as ApiSuccessResponse<T>).data as T;
  }
  return response as T;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function normalizeInboxKey(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

function normalizeInboxCategory(value: unknown): HotelBdInboxCategory {
  const normalized = normalizeInboxKey(value || "INCOMPLETE_STEPS");
  const allowed: HotelBdInboxCategory[] = [
    "QC_REJECTED",
    "ZONAL_REJECTED",
    "ONBOARDING_STUCK",
    "INCOMPLETE_STEPS",
    "UNDER_QC",
    "UNDER_ZONAL_REVIEW",
  ];
  return allowed.includes(normalized as HotelBdInboxCategory)
    ? (normalized as HotelBdInboxCategory)
    : "INCOMPLETE_STEPS";
}

/** Match action-inbox tab — status tabs (Under QC) use hotel status, not only category. */
export function matchesHotelBdInboxTab(
  item: HotelBdActionInboxItem,
  tab: HotelBdInboxCategory,
): boolean {
  const status = normalizeInboxKey(item.status);
  const category = item.category;

  switch (tab) {
    case "UNDER_QC":
      return status === "UNDER_QC" || category === "UNDER_QC";
    case "UNDER_ZONAL_REVIEW":
      return (
        status === "UNDER_ZONAL_REVIEW" || category === "UNDER_ZONAL_REVIEW"
      );
    case "QC_REJECTED":
      return category === "QC_REJECTED" || status === "QC_REJECTED";
    case "ZONAL_REJECTED":
      return category === "ZONAL_REJECTED" || status === "ZONAL_REJECTED";
    default:
      return category === tab;
  }
}

function normalizeSeverity(value: unknown): HotelBdInboxSeverity | null {
  if (value == null) return null;
  const normalized = String(value).toUpperCase();
  if (
    normalized === "HIGH" ||
    normalized === "MEDIUM" ||
    normalized === "LOW" ||
    normalized === "INFO"
  ) {
    return normalized;
  }
  return null;
}

function normalizeInboxItem(raw: Record<string, unknown>): HotelBdActionInboxItem {
  const hotelNameRaw = raw.hotelName ?? raw.name ?? raw.propertyName;
  return {
    hotelId: (raw.hotelId as string | undefined) ?? null,
    hotelCode: String(raw.hotelCode ?? raw.code ?? "—"),
    hotelName:
      hotelNameRaw != null && String(hotelNameRaw).trim()
        ? String(hotelNameRaw).trim()
        : "Untitled hotel",
    city: (raw.city as string | null | undefined) ?? null,
    status: String(raw.status ?? raw.hotelStatus ?? "—"),
    currentStep: (raw.currentStep as string | undefined) ?? null,
    incompleteSteps: toNumber(raw.incompleteSteps),
    daysStuck: raw.daysStuck != null ? toNumber(raw.daysStuck) : null,
    rejectionReason:
      (raw.rejectionReason as string | null | undefined)?.trim() || null,
    category: normalizeInboxCategory(raw.type ?? raw.category),
    severity: normalizeSeverity(raw.severity),
    message: (raw.message as string | null | undefined) ?? null,
    updatedAt: (raw.updatedAt as string | null | undefined) ?? null,
  };
}

function normalizeFunnel(
  funnelRaw: Record<string, unknown>,
): HotelBdOnboardingFunnel {
  return {
    draft: toNumber(funnelRaw.draft),
    underQc: toNumber(funnelRaw.underQc),
    qcRejected: toNumber(funnelRaw.qcRejected),
    underZonalReview: toNumber(funnelRaw.underZonalReview),
    zonalRejected: toNumber(funnelRaw.zonalRejected),
    live: toNumber(funnelRaw.live),
  };
}

function normalizeDashboardResponse(
  payload: Record<string, unknown>,
): HotelBdDashboardReportResponse {
  const portfolioRaw =
    (payload.portfolio as Record<string, unknown> | undefined) ??
    (payload.portfolioKpis as Record<string, unknown> | undefined) ??
    {};
  const funnelRaw =
    (payload.funnel as Record<string, unknown> | undefined) ??
    (payload.onboardingFunnel as Record<string, unknown> | undefined) ??
    {};
  const dateRangeRaw =
    (payload.dateRange as Record<string, unknown> | undefined) ?? {};
  const inboxRaw = payload.actionInbox;

  return {
    viewer: (payload.viewer as string | undefined) ?? null,
    allHotels: Boolean(payload.allHotels),
    dateRange: {
      preset: (dateRangeRaw.preset as string | undefined) ?? null,
      fromDate: (dateRangeRaw.fromDate as string | undefined) ?? null,
      toDate: (dateRangeRaw.toDate as string | undefined) ?? null,
    },
    stuckDaysThreshold: toNumber(payload.stuckDaysThreshold, 7),
    portfolioKpis: {
      assignedHotels: toNumber(portfolioRaw.assignedHotels),
      liveHotels: toNumber(portfolioRaw.liveHotels),
      hotelsInPipeline: toNumber(
        portfolioRaw.inPipeline ?? portfolioRaw.hotelsInPipeline,
      ),
      rejectedHotels: toNumber(
        portfolioRaw.rejected ?? portfolioRaw.rejectedHotels,
      ),
      goLivesInPeriod: toNumber(portfolioRaw.goLivesInPeriod),
    },
    onboardingFunnel: normalizeFunnel(funnelRaw),
    actionInbox: Array.isArray(inboxRaw)
      ? inboxRaw.map((item) =>
          normalizeInboxItem((item ?? {}) as Record<string, unknown>),
        )
      : [],
  };
}

function buildQuery(params: HotelBdDashboardReportParams): string {
  const search = new URLSearchParams();
  if (params.datePreset) search.set("datePreset", params.datePreset);
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  if (params.stuckDaysThreshold != null) {
    search.set("stuckDaysThreshold", String(params.stuckDaysThreshold));
  }
  if (params.bdUserId != null && String(params.bdUserId).trim()) {
    search.set("bdUserId", String(params.bdUserId));
  }
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.city?.trim()) search.set("city", params.city.trim());
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const hotelBdDashboardReportService = {
  async getReport(
    params: HotelBdDashboardReportParams = {},
  ): Promise<HotelBdDashboardReportResponse> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(`${API_ENDPOINTS.REPORTS.HOTEL_BD_DASHBOARD}${buildQuery(params)}`);
    const payload = unwrapPayload(response);
    return normalizeDashboardResponse(
      (payload ?? {}) as Record<string, unknown>,
    );
  },
};
