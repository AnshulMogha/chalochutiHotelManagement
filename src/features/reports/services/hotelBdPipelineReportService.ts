import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import {
  runReportExportJob,
  type ExportJobStatus,
  type ReportExportFormat,
} from "./reportExportService";
import type { HotelBdOnboardingFunnel } from "./hotelBdDashboardReportService";

export type HotelBdPipelineStatus =
  | "ALL"
  | "DRAFT"
  | "UNDER_QC"
  | "QC_REJECTED"
  | "UNDER_ZONAL_REVIEW"
  | "ZONAL_REJECTED"
  | "LIVE"
  | "PIPELINE"
  | "REJECTED";

export type HotelBdPipelineSort =
  | "UPDATED_AT"
  | "CREATED_AT"
  | "HOTEL_CODE"
  | "STATUS"
  | "CURRENT_STEP";

export type HotelBdStepStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";

export interface HotelBdPipelineStep {
  step: string;
  status: HotelBdStepStatus;
  lastSavedAt?: string | null;
}

export interface HotelBdPipelineRow {
  hotelId?: string | null;
  hotelCode: string;
  hotelName: string;
  city?: string | null;
  status: string;
  currentStep?: string | null;
  locked: boolean;
  completedSteps: number;
  incompleteSteps: number;
  daysStuck?: number | null;
  rejectionReason?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  qcReviewedAt?: string | null;
  zonalApprovedAt?: string | null;
  steps: HotelBdPipelineStep[];
}

export interface HotelBdPipelineReportResponse {
  viewer?: string | null;
  funnel: HotelBdOnboardingFunnel;
  rows: HotelBdPipelineRow[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
    sort?: string;
    direction?: string;
  };
}

export interface HotelBdPipelineReportParams {
  status?: HotelBdPipelineStatus;
  search?: string;
  city?: string;
  sort?: HotelBdPipelineSort;
  direction?: "ASC" | "DESC";
  page?: number;
  size?: number;
  bdUserId?: string | number;
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

function normalizeStepStatus(value: unknown): HotelBdStepStatus {
  const normalized = String(value || "NOT_STARTED").toUpperCase();
  if (normalized === "COMPLETED" || normalized === "IN_PROGRESS") {
    return normalized;
  }
  return "NOT_STARTED";
}

function normalizeStep(raw: Record<string, unknown>): HotelBdPipelineStep {
  return {
    step: String(raw.step ?? ""),
    status: normalizeStepStatus(raw.status),
    lastSavedAt: (raw.lastSavedAt as string | null | undefined) ?? null,
  };
}

function normalizeRow(raw: Record<string, unknown>): HotelBdPipelineRow {
  const hotelNameRaw = raw.hotelName ?? raw.name ?? raw.propertyName;
  const stepsRaw = Array.isArray(raw.steps) ? raw.steps : [];

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
    locked: Boolean(raw.locked),
    completedSteps: toNumber(raw.completedSteps),
    incompleteSteps: toNumber(raw.incompleteSteps),
    daysStuck: raw.daysStuck != null ? toNumber(raw.daysStuck) : null,
    rejectionReason:
      (raw.rejectionReason as string | null | undefined)?.trim() || null,
    updatedAt: (raw.updatedAt as string | null | undefined) ?? null,
    createdAt: (raw.createdAt as string | null | undefined) ?? null,
    qcReviewedAt: (raw.qcReviewedAt as string | null | undefined) ?? null,
    zonalApprovedAt: (raw.zonalApprovedAt as string | null | undefined) ?? null,
    steps: stepsRaw.map((step) =>
      normalizeStep((step ?? {}) as Record<string, unknown>),
    ),
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

function normalizePipelineResponse(
  payload: Record<string, unknown>,
): HotelBdPipelineReportResponse {
  const hotelsRaw = payload.hotels ?? payload.rows ?? payload.content;
  const rows = Array.isArray(hotelsRaw)
    ? hotelsRaw.map((row) =>
        normalizeRow((row ?? {}) as Record<string, unknown>),
      )
    : [];

  const pageRaw =
    (payload.page as Record<string, unknown> | undefined) ?? {};
  const funnelRaw =
    (payload.funnel as Record<string, unknown> | undefined) ?? {};

  return {
    viewer: (payload.viewer as string | undefined) ?? null,
    funnel: normalizeFunnel(funnelRaw),
    rows,
    page: {
      number: toNumber(pageRaw.page ?? pageRaw.number, 0),
      size: toNumber(pageRaw.size, rows.length || 20),
      totalElements: toNumber(pageRaw.totalElements, rows.length),
      totalPages: toNumber(pageRaw.totalPages, 1),
      sort: (pageRaw.sort as string | undefined) ?? undefined,
      direction: (pageRaw.direction as string | undefined) ?? undefined,
    },
  };
}

function buildQuery(params: HotelBdPipelineReportParams): string {
  const search = new URLSearchParams();
  if (params.status && params.status !== "ALL") {
    search.set("status", params.status);
  }
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.city?.trim()) search.set("city", params.city.trim());
  if (params.sort) search.set("sort", params.sort);
  if (params.direction) search.set("direction", params.direction);
  if (params.page != null) search.set("page", String(params.page));
  if (params.size != null) search.set("size", String(params.size));
  if (params.bdUserId != null && String(params.bdUserId).trim()) {
    search.set("bdUserId", String(params.bdUserId));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const hotelBdPipelineReportService = {
  async getReport(
    params: HotelBdPipelineReportParams = {},
  ): Promise<HotelBdPipelineReportResponse> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(`${API_ENDPOINTS.REPORTS.HOTEL_BD_PIPELINE}${buildQuery(params)}`);
    const payload = unwrapPayload(response);
    return normalizePipelineResponse(
      (payload ?? {}) as Record<string, unknown>,
    );
  },

  async exportReport(
    params: HotelBdPipelineReportParams,
    format: ReportExportFormat = "EXCEL",
    onStatus?: (status: ExportJobStatus) => void,
  ): Promise<void> {
    const query = buildQuery({ ...params, page: undefined, size: undefined });
    const formatParam = query
      ? `${query}&format=${format}`
      : `?format=${format}`;

    await runReportExportJob({
      startUrl: `${API_ENDPOINTS.REPORTS.HOTEL_BD_PIPELINE_EXPORT}${formatParam}`,
      statusUrl: API_ENDPOINTS.REPORTS.HOTEL_BD_PIPELINE_EXPORT_JOB,
      downloadUrl: API_ENDPOINTS.REPORTS.HOTEL_BD_PIPELINE_EXPORT_DOWNLOAD,
      defaultFileName: "hotel-bd-pipeline",
      format,
      onStatus,
    });
  },
};
