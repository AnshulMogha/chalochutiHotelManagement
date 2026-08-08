import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";

export type PerformanceDatePreset =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_15_DAYS"
  | "LAST_30_DAYS"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "CUSTOM";

export type PerformanceDateAxis = "BOOKING" | "STAY";

export type PerformanceComparisonType =
  | "SAME_TIME_LAST_YEAR"
  | "PREVIOUS_PERIOD";

export type PerformanceMetric =
  | "ROOM_NIGHTS"
  | "REVENUE"
  | "ASP"
  | "PROPERTY_VISITS"
  | "CONVERSION";

export type PerformanceDimensionType =
  | "BUSINESS_CHANNEL"
  | "ROOM_RATE_PLAN"
  | "DAY_OF_WEEK"
  | "MEAL_PLAN"
  | "TRAVELLER_MIX"
  | "LENGTH_OF_STAY"
  | "ADVANCE_PURCHASE";

export interface PerformanceDateRange {
  preset: string;
  fromDate: string;
  toDate: string;
}

export interface PerformanceKpi {
  metric: PerformanceMetric;
  value: number;
  changePercent: number | null;
  improved: boolean;
  previousValue?: number | null;
}

export interface PerformanceSeriesPoint {
  fromDate: string;
  toDate: string;
  label: string;
  yourProperty: number | null;
  competitorsAvg: number | null;
}

export interface PerformanceOverviewResponse {
  dateRange: PerformanceDateRange;
  comparisonDateRange: PerformanceDateRange;
  dateAxis: PerformanceDateAxis;
  comparisonType: PerformanceComparisonType;
  selectedMetric: PerformanceMetric;
  kpis: PerformanceKpi[];
  metricDetail: {
    metric: PerformanceMetric;
    value: number;
    changePercent: number | null;
    improved?: boolean;
    previousValue?: number | null;
    insight: string;
  };
  competitorShare: {
    eligible: boolean;
    competitorCount: number;
    yourSharePercent: number | null;
    message?: string | null;
  };
  series: PerformanceSeriesPoint[];
}

export interface PerformanceRanking {
  rank: number;
  key: string;
  label: string;
  yourPercent: number | null;
  competitorsPercent: number | null;
}

export interface PerformanceBreakdownCard {
  dimensionType: PerformanceDimensionType;
  title: string;
  insight: string;
  rankings: PerformanceRanking[];
}

export interface PerformanceBreakdownsResponse {
  dateRange: PerformanceDateRange;
  dateAxis: PerformanceDateAxis;
  competitorComparisonEligible: boolean;
  cards: PerformanceBreakdownCard[];
}

export interface PerformanceCompetitor {
  hotelId: string;
  name: string;
  address: string | null;
  thumbnailUrl: string | null;
  sortOrder?: number;
}

export interface PerformanceCompetitorsResponse {
  hotelId: string;
  minCompetitors: number;
  maxCompetitors: number;
  comparisonEligible: boolean;
  competitors: PerformanceCompetitor[];
}

export interface PerformanceFilterParams {
  hotelId: string;
  datePreset?: PerformanceDatePreset;
  fromDate?: string;
  toDate?: string;
  dateAxis?: PerformanceDateAxis;
  comparisonType?: PerformanceComparisonType;
  metric?: PerformanceMetric;
}

function buildCommonParams(params: PerformanceFilterParams): URLSearchParams {
  const {
    hotelId,
    datePreset = "LAST_30_DAYS",
    fromDate,
    toDate,
    dateAxis = "BOOKING",
    comparisonType = "SAME_TIME_LAST_YEAR",
    metric = "ROOM_NIGHTS",
  } = params;

  const search = new URLSearchParams();
  search.set("hotelId", hotelId);
  search.set("datePreset", datePreset);
  search.set("dateAxis", dateAxis);
  search.set("comparisonType", comparisonType);
  search.set("metric", metric);

  if (datePreset === "CUSTOM") {
    if (fromDate) search.set("fromDate", fromDate);
    if (toDate) search.set("toDate", toDate);
  }

  return search;
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

function toFiniteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickChangePercent(raw: Record<string, unknown>): number | null {
  return (
    toFiniteNumber(raw.changePercent) ??
    toFiniteNumber(raw.changePercentage) ??
    toFiniteNumber(raw.yoyChangePercent) ??
    toFiniteNumber(raw.comparisonChangePercent) ??
    toFiniteNumber(raw.percentChange) ??
    null
  );
}

function pickPreviousValue(raw: Record<string, unknown>): number | null {
  return (
    toFiniteNumber(raw.previousValue) ??
    toFiniteNumber(raw.comparisonValue) ??
    toFiniteNumber(raw.lastYearValue) ??
    toFiniteNumber(raw.priorValue) ??
    null
  );
}

function computeChangePercent(
  current: number | null,
  previous: number | null,
): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
}

function normalizeKpi(raw: Partial<PerformanceKpi> & Record<string, unknown>): PerformanceKpi {
  const metric = (raw.metric as PerformanceMetric) || "ROOM_NIGHTS";
  const value = toFiniteNumber(raw.value) ?? 0;
  const previousValue = pickPreviousValue(raw);
  const changePercent =
    pickChangePercent(raw) ?? computeChangePercent(value, previousValue);
  const improved =
    typeof raw.improved === "boolean"
      ? raw.improved
      : changePercent == null
        ? false
        : changePercent >= 0;

  return {
    metric,
    value,
    changePercent,
    improved,
    previousValue,
  };
}

function normalizeMetricDetail(
  raw: Partial<PerformanceOverviewResponse["metricDetail"]> &
    Record<string, unknown>,
  fallbackMetric: PerformanceMetric,
): PerformanceOverviewResponse["metricDetail"] {
  const metric = (raw.metric as PerformanceMetric) || fallbackMetric;
  const value = toFiniteNumber(raw.value) ?? 0;
  const previousValue = pickPreviousValue(raw);
  const changePercent =
    pickChangePercent(raw) ?? computeChangePercent(value, previousValue);
  const improved =
    typeof raw.improved === "boolean"
      ? raw.improved
      : changePercent == null
        ? undefined
        : changePercent >= 0;

  return {
    metric,
    value,
    changePercent,
    improved,
    previousValue,
    insight: typeof raw.insight === "string" ? raw.insight : "",
  };
}

function sumSeriesField(
  series: PerformanceSeriesPoint[] | undefined,
  field: "yourProperty" | "competitorsAvg",
): number {
  if (!series?.length) return 0;
  return series.reduce((sum, point) => {
    const raw = point[field];
    const n = typeof raw === "number" ? raw : Number(raw);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function seriesDerivedValue(
  metric: PerformanceMetric,
  series: PerformanceSeriesPoint[] | undefined,
): number | null {
  if (!series?.length) return null;
  const values = series
    .map((point) => {
      const raw = point.yourProperty;
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? n : null;
    })
    .filter((n): n is number => n != null);
  if (!values.length) return null;
  const total = values.reduce((sum, n) => sum + n, 0);
  if (total === 0) return 0;
  // ASP / conversion are period rates — use a simple mean of bucket values.
  if (metric === "ASP" || metric === "CONVERSION") {
    return total / values.length;
  }
  return total;
}

/**
 * Backend sometimes returns kpi/metricDetail as 0 while series has real points.
 * Fill the selected metric from series so the overview isn't blank.
 * Also normalize YoY change % from alternate field names / previousValue.
 */
function enrichOverview(
  data: PerformanceOverviewResponse,
): PerformanceOverviewResponse {
  const selected = data.selectedMetric ?? "ROOM_NIGHTS";
  const derived = seriesDerivedValue(selected, data.series);
  const yourSum = sumSeriesField(data.series, "yourProperty");
  const competitorsSum = sumSeriesField(data.series, "competitorsAvg");

  const kpis = (data.kpis ?? []).map((kpi) => {
    const normalized = normalizeKpi(kpi as PerformanceKpi & Record<string, unknown>);
    if (
      normalized.metric === selected &&
      (normalized.value == null || normalized.value === 0) &&
      derived != null &&
      derived !== 0
    ) {
      return { ...normalized, value: derived };
    }
    return normalized;
  });

  let metricDetail = data.metricDetail
    ? normalizeMetricDetail(
        data.metricDetail as PerformanceOverviewResponse["metricDetail"] &
          Record<string, unknown>,
        selected,
      )
    : undefined;

  if (
    metricDetail &&
    (metricDetail.value == null || metricDetail.value === 0) &&
    derived != null &&
    derived !== 0
  ) {
    metricDetail = { ...metricDetail, value: derived };
  }

  // Keep selected KPI and metricDetail change% in sync when one side has it.
  const selectedKpi = kpis.find((k) => k.metric === selected);
  if (metricDetail && selectedKpi) {
    if (metricDetail.changePercent == null && selectedKpi.changePercent != null) {
      metricDetail = {
        ...metricDetail,
        changePercent: selectedKpi.changePercent,
        improved: selectedKpi.improved,
        previousValue: selectedKpi.previousValue ?? metricDetail.previousValue,
      };
    } else if (
      selectedKpi.changePercent == null &&
      metricDetail.changePercent != null
    ) {
      const idx = kpis.findIndex((k) => k.metric === selected);
      if (idx >= 0) {
        kpis[idx] = {
          ...selectedKpi,
          changePercent: metricDetail.changePercent,
          improved: metricDetail.improved ?? metricDetail.changePercent >= 0,
          previousValue: metricDetail.previousValue ?? selectedKpi.previousValue,
        };
      }
    }
  }

  let competitorShare = data.competitorShare;
  if (
    competitorShare?.eligible &&
    (competitorShare.yourSharePercent == null ||
      competitorShare.yourSharePercent === 0) &&
    yourSum > 0
  ) {
    const denom = yourSum + competitorsSum;
    if (denom > 0) {
      competitorShare = {
        ...competitorShare,
        yourSharePercent: Math.round((yourSum / denom) * 10000) / 100,
      };
    }
  }

  return {
    ...data,
    kpis,
    metricDetail: metricDetail ?? data.metricDetail,
    competitorShare,
  };
}

async function getRawPayload<T>(url: string): Promise<T> {
  const response = await apiClient.get<ApiSuccessResponse<T> | T>(url);
  return unwrapPayload(response);
}

export const performanceDashboardService = {
  getOverview: async (
    params: PerformanceFilterParams,
  ): Promise<PerformanceOverviewResponse> => {
    const search = buildCommonParams(params);
    const data = await getRawPayload<PerformanceOverviewResponse>(
      `${API_ENDPOINTS.REPORTS.PERFORMANCE_OVERVIEW}?${search.toString()}`,
    );
    return enrichOverview(data);
  },

  getBreakdowns: async (
    params: Pick<
      PerformanceFilterParams,
      "hotelId" | "datePreset" | "fromDate" | "toDate" | "dateAxis"
    >,
  ): Promise<PerformanceBreakdownsResponse> => {
    const search = new URLSearchParams();
    search.set("hotelId", params.hotelId);
    search.set("datePreset", params.datePreset ?? "LAST_30_DAYS");
    search.set("dateAxis", params.dateAxis ?? "BOOKING");
    if (params.datePreset === "CUSTOM") {
      if (params.fromDate) search.set("fromDate", params.fromDate);
      if (params.toDate) search.set("toDate", params.toDate);
    }
    return getRawPayload(
      `${API_ENDPOINTS.REPORTS.PERFORMANCE_BREAKDOWNS}?${search.toString()}`,
    );
  },

  listCompetitors: async (
    hotelId: string,
  ): Promise<PerformanceCompetitorsResponse> => {
    const search = new URLSearchParams();
    search.set("hotelId", hotelId);
    return getRawPayload(
      `${API_ENDPOINTS.REPORTS.PERFORMANCE_COMPETITORS}?${search.toString()}`,
    );
  },

  replaceCompetitors: async (
    hotelId: string,
    competitorHotelIds: string[],
  ): Promise<PerformanceCompetitorsResponse> => {
    const search = new URLSearchParams();
    search.set("hotelId", hotelId);
    const response = await apiClient.put<
      ApiSuccessResponse<PerformanceCompetitorsResponse> | PerformanceCompetitorsResponse
    >(`${API_ENDPOINTS.REPORTS.PERFORMANCE_COMPETITORS}?${search.toString()}`, {
      competitorHotelIds,
    });
    return unwrapPayload(response);
  },

  searchCompetitors: async (
    hotelId: string,
    q: string,
  ): Promise<PerformanceCompetitor[]> => {
    const search = new URLSearchParams();
    search.set("hotelId", hotelId);
    if (q.trim()) search.set("q", q.trim());
    const data = await getRawPayload<PerformanceCompetitor[] | { competitors?: PerformanceCompetitor[] }>(
      `${API_ENDPOINTS.REPORTS.PERFORMANCE_COMPETITORS_SEARCH}?${search.toString()}`,
    );
    if (Array.isArray(data)) return data;
    return data?.competitors ?? [];
  },
};
