import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import {
  runReportExportJob,
  type ExportJobStatus,
  type ReportExportFormat,
} from "./reportExportService";

export type RateHealthDatePreset =
  | "NEXT_7_DAYS"
  | "NEXT_15_DAYS"
  | "NEXT_30_DAYS"
  | "NEXT_3_MONTHS"
  | "NEXT_6_MONTHS"
  | "CUSTOM";

export interface RateHealthInsight {
  code: string;
  severity: string;
  title: string;
  message: string;
  recommendation?: string | null;
}

export interface RateHealthSummary {
  roomTypes: number;
  ratePlans: number;
  healthy: number;
  missingRates: number;
  highDisparities: number;
  notSaleable: number;
  averageDifference: number | null;
  maximumDifference: number | null;
}

export interface RateHealthRow {
  stayDate: string;
  roomType: string;
  ratePlan: string;
  totalRooms: number;
  allocated: number;
  sold: number;
  availableRooms: number;
  b2cRate: number | null;
  b2bRate: number | null;
  bundleRate: number | null;
  healthStatus: string;
}

export interface RateHealthReportResponse {
  dateRange: {
    preset?: string | null;
    fromDate: string;
    toDate: string;
  };
  summary: RateHealthSummary;
  insights: RateHealthInsight[];
  rates: RateHealthRow[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
    sort?: string;
    direction?: string;
  };
}

export interface RateHealthReportParams {
  propertyIds: string[];
  datePreset?: RateHealthDatePreset;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}

type RawRateRow = Partial<{
  stayDate: string;
  roomType: string;
  ratePlan: string;
  totalHotelRooms: number;
  allocatedRooms: number;
  soldRooms: number;
  availableRooms: number;
  b2cRate: number | null;
  b2bRate: number | null;
  bundleRate: number | null;
  status: string;
}>;

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

function appendPropertyIds(search: URLSearchParams, propertyIds: string[]) {
  if (propertyIds.length) {
    search.set("propertyIds", propertyIds.join(","));
  }
}

function normalizeRow(raw: RawRateRow): RateHealthRow {
  return {
    stayDate: raw.stayDate ?? "",
    roomType: raw.roomType ?? "—",
    ratePlan: raw.ratePlan ?? "—",
    totalRooms: raw.totalHotelRooms ?? 0,
    allocated: raw.allocatedRooms ?? 0,
    sold: raw.soldRooms ?? 0,
    availableRooms: raw.availableRooms ?? 0,
    b2cRate: raw.b2cRate ?? null,
    b2bRate: raw.b2bRate ?? null,
    bundleRate: raw.bundleRate ?? null,
    healthStatus: raw.status ?? "—",
  };
}

function normalizeSummary(raw: Partial<RateHealthSummary> | null | undefined): RateHealthSummary {
  return {
    roomTypes: raw?.roomTypes ?? 0,
    ratePlans: raw?.ratePlans ?? 0,
    healthy: raw?.healthy ?? 0,
    missingRates: raw?.missingRates ?? 0,
    highDisparities: raw?.highDisparities ?? 0,
    notSaleable: raw?.notSaleable ?? 0,
    averageDifference: raw?.averageDifference ?? null,
    maximumDifference: raw?.maximumDifference ?? null,
  };
}

function normalizeResponse(
  payload: unknown,
  fallbackPage = 0,
  fallbackSize = 20,
): RateHealthReportResponse {
  const data = payload as Partial<{
    dateRange: RateHealthReportResponse["dateRange"];
    summary: RateHealthSummary;
    insights: RateHealthInsight[];
    rates: RawRateRow[];
    page: {
      page?: number;
      number?: number;
      size?: number;
      totalPages?: number;
      totalElements?: number;
      sort?: string;
      direction?: string;
    };
  }>;

  const rawRates = data.rates ?? [];
  const pageMeta = data.page ?? {};

  return {
    dateRange: data.dateRange ?? { preset: null, fromDate: "", toDate: "" },
    summary: normalizeSummary(data.summary),
    insights: data.insights ?? [],
    rates: rawRates.map(normalizeRow),
    page: {
      number: pageMeta.page ?? pageMeta.number ?? fallbackPage,
      size: pageMeta.size ?? fallbackSize,
      totalElements: pageMeta.totalElements ?? rawRates.length,
      totalPages: pageMeta.totalPages ?? 1,
      sort: pageMeta.sort,
      direction: pageMeta.direction,
    },
  };
}

function buildSearchParams(
  params: RateHealthReportParams,
  forExport = false,
): URLSearchParams {
  const search = new URLSearchParams();
  search.set("datePreset", params.datePreset ?? "NEXT_30_DAYS");
  appendPropertyIds(search, params.propertyIds);
  if (!forExport) {
    search.set("page", String(params.page ?? 0));
    search.set("size", String(params.size ?? 20));
  }
  if (params.datePreset === "CUSTOM") {
    if (params.fromDate) search.set("fromDate", params.fromDate);
    if (params.toDate) search.set("toDate", params.toDate);
  }
  return search;
}

export const rateHealthReportService = {
  getReport: async (
    params: RateHealthReportParams,
  ): Promise<RateHealthReportResponse> => {
    const search = buildSearchParams(params);
    const response = await apiClient.get<
      ApiSuccessResponse<unknown> | unknown
    >(`${API_ENDPOINTS.REPORTS.RATE_HEALTH}?${search.toString()}`);
    return normalizeResponse(
      unwrapPayload(response),
      params.page ?? 0,
      params.size ?? 20,
    );
  },

  exportReport: async (options: {
    params: Omit<RateHealthReportParams, "page" | "size">;
    format?: ReportExportFormat;
    defaultFileName: string;
    onStatus?: (status: ExportJobStatus) => void;
  }): Promise<void> => {
    const search = buildSearchParams(
      { ...options.params, page: undefined, size: undefined },
      true,
    );
    search.set("format", options.format ?? "EXCEL");

    await runReportExportJob({
      startUrl: `${API_ENDPOINTS.REPORTS.RATE_HEALTH_EXPORT}?${search.toString()}`,
      statusUrl: API_ENDPOINTS.REPORTS.RATE_HEALTH_EXPORT_JOB,
      downloadUrl: API_ENDPOINTS.REPORTS.RATE_HEALTH_EXPORT_DOWNLOAD,
      defaultFileName: options.defaultFileName,
      format: options.format ?? "EXCEL",
      onStatus: options.onStatus,
    });
  },
};
