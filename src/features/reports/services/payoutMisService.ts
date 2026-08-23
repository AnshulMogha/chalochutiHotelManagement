import { API_ENDPOINTS } from "@/constants";
import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import {
  runReportExportJob,
  type ExportJobStatus,
  type ReportExportFormat,
} from "./reportExportService";
import type {
  PayoutMisDashboardResponse,
  PayoutMisDetailParams,
  PayoutMisDetailResponse,
  PayoutMisListParams,
  PayoutMisPageMeta,
  PayoutMisPaymentRow,
  PayoutMisSummary,
} from "./payoutMisTypes";

export type PayoutMisVariant = "hotel" | "transport";

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

function toMoney(value: unknown, currency = "INR") {
  if (typeof value === "number") {
    return { amount: value, currency };
  }
  if (value && typeof value === "object" && "amount" in value) {
    const obj = value as { amount?: number; currency?: string };
    return {
      amount: Number(obj.amount ?? 0),
      currency: String(obj.currency ?? currency),
    };
  }
  return { amount: Number(value ?? 0), currency };
}

function computeTotalPages(totalElements: number, size: number): number {
  if (size <= 0) return 0;
  return Math.ceil(totalElements / size);
}

function normalizePageMeta(
  raw: Record<string, unknown> | undefined,
  page: number,
  size: number,
): PayoutMisPageMeta {
  const totalElements = Number(raw?.totalElements ?? 0);
  const resolvedSize = Number(raw?.size ?? size);
  const totalPagesRaw = raw?.totalPages;
  return {
    page: Number(raw?.page ?? page),
    size: resolvedSize,
    totalElements,
    totalPages:
      totalPagesRaw != null
        ? Number(totalPagesRaw)
        : computeTotalPages(totalElements, resolvedSize),
  };
}

function normalizeSummary(raw: Record<string, unknown> | undefined): PayoutMisSummary {
  const currency = String(raw?.currency ?? "INR");
  return {
    paymentsMade: Number(raw?.paymentsMade ?? 0),
    bookingsCount: Number(raw?.bookingsCount ?? 0),
    paymentSettled: toMoney(raw?.paymentSettled, currency),
    amountTransferred: toMoney(raw?.amountTransferred, currency),
    amountAdjusted: toMoney(raw?.amountAdjusted, currency),
  };
}

function normalizePaymentRow(raw: Record<string, unknown>): PayoutMisPaymentRow {
  const currency = String(
    (raw.paymentsSettled as { currency?: string } | undefined)?.currency ?? "INR",
  );
  return {
    settlementNo: String(raw.settlementNo ?? ""),
    paymentReferenceNumber: String(
      raw.paymentReferenceNumber ?? raw.paymentReference ?? "",
    ),
    paymentDate: String(raw.paymentDate ?? ""),
    bookingCount: Number(raw.bookingCount ?? 0),
    paymentsSettled: toMoney(raw.paymentsSettled, currency),
    amountTransferred: toMoney(raw.amountTransferred, currency),
    amountAdjusted: toMoney(raw.amountAdjusted, currency),
    paymentStatus: String(raw.paymentStatus ?? ""),
  };
}

function normalizeDashboardResponse(
  payload: unknown,
  page: number,
  size: number,
): PayoutMisDashboardResponse {
  const data =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const dateRangeRaw =
    data.dateRange && typeof data.dateRange === "object"
      ? (data.dateRange as Record<string, unknown>)
      : {};
  const summaryRaw =
    data.summary && typeof data.summary === "object"
      ? (data.summary as Record<string, unknown>)
      : undefined;
  const paymentsRaw = Array.isArray(data.payments) ? data.payments : [];
  const pageRaw =
    data.page && typeof data.page === "object"
      ? (data.page as Record<string, unknown>)
      : undefined;

  return {
    dateRange: {
      fromDate: String(dateRangeRaw.fromDate ?? dateRangeRaw.from ?? ""),
      toDate: String(dateRangeRaw.toDate ?? dateRangeRaw.to ?? ""),
    },
    summary: normalizeSummary(summaryRaw),
    payments: paymentsRaw.map((row) =>
      normalizePaymentRow(row as Record<string, unknown>),
    ),
    page: normalizePageMeta(pageRaw, page, size),
  };
}

function normalizeBookingLine(raw: Record<string, unknown>) {
  const currency = String(
    (raw.bookingAmount as { currency?: string } | undefined)?.currency ?? "INR",
  );
  return {
    bookingId: String(raw.bookingId ?? ""),
    bookingReference: String(raw.bookingReference ?? raw.bookingId ?? ""),
    checkIn: raw.checkIn != null ? String(raw.checkIn) : null,
    checkOut: raw.checkOut != null ? String(raw.checkOut) : null,
    startDate: raw.startDate != null ? String(raw.startDate) : null,
    endDate: raw.endDate != null ? String(raw.endDate) : null,
    bookingAmount: toMoney(raw.bookingAmount, currency),
    amountTransferred: toMoney(raw.amountTransferred, currency),
    amountAdjusted: toMoney(raw.amountAdjusted, currency),
    adjustmentReason:
      raw.adjustmentReason != null ? String(raw.adjustmentReason) : null,
    creditStatus: raw.creditStatus != null ? String(raw.creditStatus) : null,
  };
}

function normalizeDetailResponse(payload: unknown): PayoutMisDetailResponse {
  const data =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const currency = String(
    (data.netEarnings as { currency?: string } | undefined)?.currency ?? "INR",
  );
  const bookingsRaw = Array.isArray(data.bookings) ? data.bookings : [];

  return {
    settlementNo: String(data.settlementNo ?? ""),
    paymentStatus: String(data.paymentStatus ?? ""),
    paymentReferenceNumber: String(
      data.paymentReferenceNumber ?? data.paymentReference ?? "",
    ),
    paymentDate: String(data.paymentDate ?? ""),
    paymentType: String(data.paymentType ?? ""),
    bookingCount: Number(data.bookingCount ?? 0),
    bankAccountMasked: String(data.bankAccountMasked ?? ""),
    netEarnings: toMoney(data.netEarnings, currency),
    amountAdjusted: toMoney(data.amountAdjusted, currency),
    amountTransferred: toMoney(data.amountTransferred, currency),
    bookings: bookingsRaw.map((row) =>
      normalizeBookingLine(row as Record<string, unknown>),
    ),
  };
}

function endpointsForVariant(variant: PayoutMisVariant) {
  if (variant === "transport") {
    return {
      list: API_ENDPOINTS.REPORTS.TRANSPORT_PAYOUTS,
      detail: API_ENDPOINTS.REPORTS.TRANSPORT_PAYOUTS_DETAIL,
      export: API_ENDPOINTS.REPORTS.TRANSPORT_PAYOUTS_EXPORT,
      exportJob: API_ENDPOINTS.REPORTS.TRANSPORT_PAYOUTS_EXPORT_JOB,
      exportDownload: API_ENDPOINTS.REPORTS.TRANSPORT_PAYOUTS_EXPORT_DOWNLOAD,
    };
  }
  return {
    list: API_ENDPOINTS.REPORTS.HOTEL_PAYOUTS,
    detail: API_ENDPOINTS.REPORTS.HOTEL_PAYOUTS_DETAIL,
    export: API_ENDPOINTS.REPORTS.HOTEL_PAYOUTS_EXPORT,
    exportJob: API_ENDPOINTS.REPORTS.HOTEL_PAYOUTS_EXPORT_JOB,
    exportDownload: API_ENDPOINTS.REPORTS.HOTEL_PAYOUTS_EXPORT_DOWNLOAD,
  };
}

function buildSearchParams(
  params: PayoutMisListParams,
  forExport = false,
): URLSearchParams {
  const search = new URLSearchParams();
  search.set("datePreset", params.datePreset ?? "THIS_MONTH");
  if (!forExport) {
    search.set("page", String(params.page ?? 0));
    search.set("size", String(params.size ?? 20));
  }
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.propertyIds?.length) {
    search.set("propertyIds", params.propertyIds.join(","));
  }
  if (params.vendorId != null) {
    search.set("vendorId", String(params.vendorId));
  }
  if (params.datePreset === "CUSTOM") {
    if (params.fromDate) search.set("fromDate", params.fromDate);
    if (params.toDate) search.set("toDate", params.toDate);
  }
  return search;
}

function createPayoutMisService(variant: PayoutMisVariant) {
  const endpoints = endpointsForVariant(variant);

  return {
    getDashboard: async (
      params: PayoutMisListParams,
    ): Promise<PayoutMisDashboardResponse> => {
      const search = buildSearchParams(params);
      const response = await apiClient.get<ApiSuccessResponse<unknown> | unknown>(
        `${endpoints.list}?${search.toString()}`,
      );
      return normalizeDashboardResponse(
        unwrapPayload(response),
        params.page ?? 0,
        params.size ?? 20,
      );
    },

    getDetail: async (
      params: PayoutMisDetailParams,
    ): Promise<PayoutMisDetailResponse> => {
      const search = new URLSearchParams();
      if (params.hotelId) search.set("hotelId", params.hotelId);
      if (params.vendorId != null) search.set("vendorId", String(params.vendorId));
      const qs = search.toString();
      const url = qs
        ? `${endpoints.detail(params.paymentReference)}?${qs}`
        : endpoints.detail(params.paymentReference);
      const response = await apiClient.get<ApiSuccessResponse<unknown> | unknown>(
        url,
      );
      return normalizeDetailResponse(unwrapPayload(response));
    },

    exportDashboard: async (options: {
      params: PayoutMisListParams;
      format?: ReportExportFormat;
      defaultFileName: string;
      onStatus?: (status: ExportJobStatus) => void;
    }): Promise<void> => {
      const search = buildSearchParams(options.params, true);
      search.set("format", options.format ?? "EXCEL");
      await runReportExportJob({
        startUrl: `${endpoints.export}?${search.toString()}`,
        statusUrl: endpoints.exportJob,
        downloadUrl: endpoints.exportDownload,
        defaultFileName: options.defaultFileName,
        format: options.format ?? "EXCEL",
        onStatus: options.onStatus,
      });
    },
  };
}

export const hotelPayoutMisService = createPayoutMisService("hotel");
export const transportPayoutMisService = createPayoutMisService("transport");
