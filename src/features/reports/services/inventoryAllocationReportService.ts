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
  total: number;
  allocated: number;
  sold: number;
  remaining: number;
  status: string;
}

export interface InventoryAllocationChartPoint {
  date: string;
  total?: number;
  allocated?: number;
  sold?: number;
  remaining?: number;
  [key: string]: string | number | undefined;
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
  page?: number;
  size?: number;
}

type RawInventoryRow = Partial<{
  date: string;
  stayDate: string;
  totalRooms: number;
  total: number;
  allocatedRooms: number;
  allocated: number;
  soldRooms: number;
  sold: number;
  remainingRooms: number;
  remaining: number;
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

function normalizeRow(raw: RawInventoryRow): InventoryAllocationRow {
  return {
    date: raw.date ?? raw.stayDate ?? "",
    total: raw.totalRooms ?? raw.total ?? 0,
    allocated: raw.allocatedRooms ?? raw.allocated ?? 0,
    sold: raw.soldRooms ?? raw.sold ?? 0,
    remaining: raw.remainingRooms ?? raw.remaining ?? 0,
    status: raw.status ?? "—",
  };
}

function normalizeSummary(
  raw: Partial<InventoryAllocationSummary> | null | undefined,
): InventoryAllocationSummary {
  return {
    totalRooms: raw?.totalRooms ?? 0,
    allocatedRooms: raw?.allocatedRooms ?? 0,
    soldRooms: raw?.soldRooms ?? 0,
    availableRooms: raw?.availableRooms ?? 0,
    blockedRooms: raw?.blockedRooms ?? 0,
    remainingRooms: raw?.remainingRooms ?? 0,
    allocationPercentage: raw?.allocationPercentage ?? 0,
    utilizationPercentage: raw?.utilizationPercentage ?? 0,
    occupancyPercentage: raw?.occupancyPercentage ?? 0,
    lostOpportunityRooms: raw?.lostOpportunityRooms ?? 0,
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
    chart: InventoryAllocationChartPoint[];
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
    chart: data.chart ?? [],
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
