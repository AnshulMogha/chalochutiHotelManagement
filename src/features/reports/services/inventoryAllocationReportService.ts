import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import {
  runReportExportJob,
  type ExportJobStatus,
  type ReportExportFormat,
} from "./reportExportService";

export type InventoryAllocationDatePreset =
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

export interface InventoryAllocationInsight {
  code: string;
  severity: string;
  title: string;
  message: string;
  recommendation?: string | null;
}

export interface InventoryAllocationSummary {
  totalRooms: number;
  allocatedRooms: number;
  soldRooms: number;
  availableRooms: number;
  blockedRooms: number;
  remainingRooms: number;
  allocationPercentage: number;
  utilizationPercentage: number;
  occupancyPercentage: number;
  lostOpportunityRooms: number;
}

export interface InventoryAllocationRow {
  date: string;
  hotelId?: string | null;
  hotelName?: string | null;
  roomTypeId?: number | null;
  roomType: string;
  ratePlanId?: number | null;
  ratePlan: string;
  total: number;
  allocated: number;
  sold: number;
  blocked: number;
  available: number;
  remaining: number;
  allocationPercentage: number;
  utilizationPercentage: number;
  occupancyPercentage: number;
  lostOpportunityRooms: number;
  status: string;
}

export interface InventoryAllocationChartPoint {
  date: string;
  allocated: number;
  sold: number;
  remaining: number;
}

export interface InventoryAllocationReportResponse {
  dateRange: {
    preset?: string | null;
    fromDate: string;
    toDate: string;
  };
  summary: InventoryAllocationSummary;
  insights: InventoryAllocationInsight[];
  chart: InventoryAllocationChartPoint[];
  inventory: InventoryAllocationRow[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
    sort?: string;
    direction?: string;
  };
}

export interface InventoryAllocationReportParams {
  propertyIds: string[];
  datePreset?: InventoryAllocationDatePreset;
  fromDate?: string;
  toDate?: string;
  roomTypeIds?: number[];
  ratePlanIds?: number[];
  page?: number;
  size?: number;
}

type RawInventoryRow = Partial<{
  date: string;
  stayDate: string;
  hotelId: string;
  hotelName: string;
  roomTypeId: number;
  roomType: string;
  roomTypeName: string;
  ratePlanId: number;
  ratePlan: string;
  ratePlanName: string;
  totalRooms: number;
  total: number;
  allocatedRooms: number;
  allocated: number;
  soldRooms: number;
  sold: number;
  blockedRooms: number;
  blocked: number;
  availableRooms: number;
  available: number;
  remainingRooms: number;
  remaining: number;
  allocationPercentage: number;
  utilizationPercentage: number;
  occupancyPercentage: number;
  lostOpportunityRooms: number;
  status: string;
}>;

type RawChartPoint = Partial<{
  date: string;
  allocatedRooms: number;
  allocated: number;
  soldRooms: number;
  sold: number;
  remainingRooms: number;
  remaining: number;
  totalRooms: number;
  total: number;
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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function appendPropertyIds(search: URLSearchParams, propertyIds: string[]) {
  if (propertyIds.length) {
    search.set("propertyIds", propertyIds.join(","));
  }
}

function appendIdList(
  search: URLSearchParams,
  key: string,
  ids?: number[],
) {
  const unique = [...new Set((ids ?? []).filter((id) => Number.isFinite(id)))];
  if (unique.length) {
    search.set(key, unique.join(","));
  }
}

function normalizeRow(raw: RawInventoryRow): InventoryAllocationRow {
  return {
    date: raw.date ?? raw.stayDate ?? "",
    hotelId: raw.hotelId ?? null,
    hotelName: raw.hotelName ?? null,
    roomTypeId: raw.roomTypeId ?? null,
    roomType: raw.roomType ?? raw.roomTypeName ?? "—",
    ratePlanId: raw.ratePlanId ?? null,
    ratePlan: raw.ratePlan ?? raw.ratePlanName ?? "—",
    total: toNumber(raw.totalRooms ?? raw.total),
    allocated: toNumber(raw.allocatedRooms ?? raw.allocated),
    sold: toNumber(raw.soldRooms ?? raw.sold),
    blocked: toNumber(raw.blockedRooms ?? raw.blocked),
    available: toNumber(raw.availableRooms ?? raw.available),
    remaining: toNumber(raw.remainingRooms ?? raw.remaining),
    allocationPercentage: toNumber(raw.allocationPercentage),
    utilizationPercentage: toNumber(raw.utilizationPercentage),
    occupancyPercentage: toNumber(raw.occupancyPercentage),
    lostOpportunityRooms: toNumber(raw.lostOpportunityRooms),
    status: raw.status ?? "—",
  };
}

function normalizeChartPoint(
  raw: RawChartPoint,
): InventoryAllocationChartPoint {
  return {
    date: raw.date ?? "",
    allocated: toNumber(raw.allocatedRooms ?? raw.allocated),
    sold: toNumber(raw.soldRooms ?? raw.sold),
    remaining: toNumber(raw.remainingRooms ?? raw.remaining),
  };
}

function normalizeSummary(
  raw: Partial<InventoryAllocationSummary> | null | undefined,
): InventoryAllocationSummary {
  return {
    totalRooms: toNumber(raw?.totalRooms),
    allocatedRooms: toNumber(raw?.allocatedRooms),
    soldRooms: toNumber(raw?.soldRooms),
    availableRooms: toNumber(raw?.availableRooms),
    blockedRooms: toNumber(raw?.blockedRooms),
    remainingRooms: toNumber(raw?.remainingRooms),
    allocationPercentage: toNumber(raw?.allocationPercentage),
    utilizationPercentage: toNumber(raw?.utilizationPercentage),
    occupancyPercentage: toNumber(raw?.occupancyPercentage),
    lostOpportunityRooms: toNumber(raw?.lostOpportunityRooms),
  };
}

function normalizeResponse(
  payload: unknown,
  fallbackPage = 0,
  fallbackSize = 20,
): InventoryAllocationReportResponse {
  const data = payload as Partial<{
    dateRange: InventoryAllocationReportResponse["dateRange"];
    summary: InventoryAllocationSummary;
    insights: InventoryAllocationInsight[];
    chart: RawChartPoint[];
    inventory: RawInventoryRow[];
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

  const rawRows = data.inventory ?? [];
  const pageMeta = data.page ?? {};

  return {
    dateRange: data.dateRange ?? { preset: null, fromDate: "", toDate: "" },
    summary: normalizeSummary(data.summary),
    insights: data.insights ?? [],
    chart: (data.chart ?? []).map(normalizeChartPoint),
    inventory: rawRows.map(normalizeRow),
    page: {
      number: pageMeta.page ?? pageMeta.number ?? fallbackPage,
      size: pageMeta.size ?? fallbackSize,
      totalElements: pageMeta.totalElements ?? rawRows.length,
      totalPages: pageMeta.totalPages ?? 0,
      sort: pageMeta.sort,
      direction: pageMeta.direction,
    },
  };
}

function buildSearchParams(
  params: InventoryAllocationReportParams,
  forExport = false,
): URLSearchParams {
  const search = new URLSearchParams();
  search.set("datePreset", params.datePreset ?? "LAST_30_DAYS");
  if (!forExport) {
    search.set("page", String(params.page ?? 0));
    search.set("size", String(params.size ?? 20));
  }
  appendPropertyIds(search, params.propertyIds);
  if (params.datePreset === "CUSTOM") {
    if (params.fromDate) search.set("fromDate", params.fromDate);
    if (params.toDate) search.set("toDate", params.toDate);
  }
  appendIdList(search, "roomTypeIds", params.roomTypeIds);
  appendIdList(search, "ratePlanIds", params.ratePlanIds);
  return search;
}

export const inventoryAllocationReportService = {
  getReport: async (
    params: InventoryAllocationReportParams,
  ): Promise<InventoryAllocationReportResponse> => {
    const search = buildSearchParams(params);
    const response = await apiClient.get<
      ApiSuccessResponse<unknown> | unknown
    >(`${API_ENDPOINTS.REPORTS.INVENTORY_ALLOCATION}?${search.toString()}`);
    return normalizeResponse(
      unwrapPayload(response),
      params.page ?? 0,
      params.size ?? 20,
    );
  },

  exportReport: async (options: {
    params: Omit<InventoryAllocationReportParams, "page" | "size">;
    format: ReportExportFormat;
    defaultFileName: string;
    onStatus?: (status: ExportJobStatus) => void;
  }): Promise<void> => {
    const search = buildSearchParams(
      { ...options.params, page: undefined, size: undefined },
      true,
    );
    search.set("format", options.format);

    await runReportExportJob({
      startUrl: `${API_ENDPOINTS.REPORTS.INVENTORY_ALLOCATION_EXPORT}?${search.toString()}`,
      statusUrl: API_ENDPOINTS.REPORTS.INVENTORY_ALLOCATION_EXPORT_JOB,
      downloadUrl: API_ENDPOINTS.REPORTS.INVENTORY_ALLOCATION_EXPORT_DOWNLOAD,
      defaultFileName: options.defaultFileName,
      format: options.format,
      onStatus: options.onStatus,
    });
  },
};
