import { API_ENDPOINTS } from "@/constants";
import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import {
  runReportExportJob,
  type ExportJobStatus,
  type ReportExportFormat,
} from "./reportExportService";

export type NetEarningsDatePreset =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "LAST_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LAST_30_DAYS"
  | "LAST_3_MONTHS"
  | "CUSTOM";

export type NetEarningsBookingStatus =
  | "ALL"
  | "CONFIRMED"
  | "CANCELLED"
  | "NO_SHOW";

export type NetEarningsBookingType = "ALL" | "HOTEL" | "PACKAGE";
export type NetEarningsPaymentStatus = "ALL" | "PENDING" | "SETTLED";

export interface NetEarningsSummary {
  netBookings: number;
  payableToProperty: number;
  paymentSettled: number;
  amountTransferred: number;
  amountAdjusted: number;
  paymentPending: number;
  currency: string;
}

export interface NetEarningsBookingRow {
  bookingRef: string;
  bookingId: string;
  pnr: string | null;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  bookingStatus: string;
  bookingAmount: number;
  payableToProperty: number;
  amountTransferred: number;
  paymentStatus: string;
  paymentStatusDate: string | null;
  paymentStatusNote: string | null;
}

export interface NetEarningsEarningsLine {
  code: string;
  label: string;
  amount: number;
  currency: string;
}

export interface NetEarningsBookingDetail {
  bookingRef: string;
  bookingId: string;
  pnr: string | null;
  guestName: string;
  guestCount: number | null;
  roomCount: number | null;
  roomName: string | null;
  checkInDate: string;
  checkOutDate: string;
  bookingStatus: string;
  bookingAmount: number;
  payableToProperty: number;
  paymentStatus: string;
  earningsLines: NetEarningsEarningsLine[];
  netPayable: number;
  currency: string;
}

export interface NetEarningsReportResponse {
  dateRange: {
    preset?: string | null;
    fromDate: string;
    toDate: string;
  };
  summary: NetEarningsSummary;
  bookings: NetEarningsBookingRow[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface NetEarningsReportParams {
  propertyIds: string[];
  datePreset?: NetEarningsDatePreset;
  fromDate?: string;
  toDate?: string;
  bookingStatus?: NetEarningsBookingStatus;
  bookingType?: NetEarningsBookingType;
  paymentStatus?: NetEarningsPaymentStatus;
  brand?: string;
  search?: string;
  page?: number;
  size?: number;
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

function toMoney(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "amount" in value) {
    return Number((value as { amount?: number }).amount ?? 0);
  }
  return Number(value ?? 0);
}

function buildSearchParams(
  params: NetEarningsReportParams,
  forExport = false,
): URLSearchParams {
  const search = new URLSearchParams();
  search.set("datePreset", params.datePreset ?? "THIS_MONTH");
  search.set("bookingStatus", params.bookingStatus ?? "CONFIRMED");
  search.set("paymentStatus", params.paymentStatus ?? "ALL");
  if (params.bookingType) search.set("bookingType", params.bookingType);
  if (params.brand) search.set("brand", params.brand);
  if (!forExport) {
    search.set("page", String(params.page ?? 0));
    search.set("size", String(params.size ?? 20));
  }
  if (params.propertyIds.length) {
    search.set("propertyIds", params.propertyIds.join(","));
  }
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.datePreset === "CUSTOM") {
    if (params.fromDate) search.set("fromDate", params.fromDate);
    if (params.toDate) search.set("toDate", params.toDate);
  }
  return search;
}

function normalizeSummary(raw: Record<string, unknown> | undefined): NetEarningsSummary {
  return {
    netBookings: Number(raw?.netBookings ?? 0),
    payableToProperty: toMoney(raw?.payableToProperty),
    paymentSettled: toMoney(raw?.paymentSettled),
    amountTransferred: toMoney(raw?.amountTransferred),
    amountAdjusted: toMoney(raw?.amountAdjusted),
    paymentPending: toMoney(raw?.paymentPending),
    currency: String(raw?.currency ?? "INR"),
  };
}

function normalizeBookingRow(raw: Record<string, unknown>): NetEarningsBookingRow {
  const bookingRef = String(raw.bookingRef ?? raw.bookingId ?? "");
  const guestNameRaw = raw.guestName;
  return {
    bookingRef,
    bookingId: String(raw.bookingId ?? bookingRef),
    pnr: raw.pnr != null ? String(raw.pnr) : null,
    guestName:
      guestNameRaw == null || String(guestNameRaw).trim() === ""
        ? "—"
        : String(guestNameRaw),
    checkInDate: String(raw.checkInDate ?? raw.checkIn ?? ""),
    checkOutDate: String(raw.checkOutDate ?? raw.checkOut ?? ""),
    bookingStatus: String(raw.bookingStatus ?? "—"),
    bookingAmount: toMoney(raw.bookingAmount),
    payableToProperty: toMoney(raw.payableToProperty),
    amountTransferred: toMoney(raw.amountTransferred),
    paymentStatus: String(raw.paymentStatus ?? "—"),
    paymentStatusDate:
      raw.paymentStatusDate != null
        ? String(raw.paymentStatusDate)
        : raw.dueDate != null
          ? String(raw.dueDate)
          : raw.settledAt != null
            ? String(raw.settledAt)
            : null,
    paymentStatusNote:
      raw.paymentStatusNote != null ? String(raw.paymentStatusNote) : null,
  };
}

function normalizeReportResponse(
  payload: unknown,
  fallbackPage = 0,
  fallbackSize = 20,
): NetEarningsReportResponse {
  const data = payload as Record<string, unknown>;
  const bookings =
    (data.bookings as Record<string, unknown>[] | undefined) ??
    (data.content as Record<string, unknown>[] | undefined) ??
    [];
  const page = (data.page as Record<string, unknown> | undefined) ?? {};

  return {
    dateRange: (data.dateRange as NetEarningsReportResponse["dateRange"]) ?? {
      preset: null,
      fromDate: "",
      toDate: "",
    },
    summary: normalizeSummary(data.summary as Record<string, unknown> | undefined),
    bookings: bookings.map((row) => normalizeBookingRow(row)),
    page: {
      number: Number(page.page ?? page.number ?? fallbackPage),
      size: Number(page.size ?? fallbackSize),
      totalElements: Number(page.totalElements ?? bookings.length),
      totalPages: Number(page.totalPages ?? 1),
    },
  };
}

function normalizeBookingDetail(payload: unknown): NetEarningsBookingDetail {
  const data = payload as Record<string, unknown>;
  const linesRaw =
    (data.earningsLines as Record<string, unknown>[] | undefined) ?? [];
  const currency = String(data.currency ?? "INR");
  const earningsLines = linesRaw.map((line, index) => ({
    code: String(line.code ?? String.fromCharCode(65 + index)),
    label: String(line.label ?? "Line item"),
    amount: toMoney(line.amount),
    currency: String(line.currency ?? currency),
  }));

  return {
    bookingRef: String(data.bookingRef ?? data.bookingId ?? ""),
    bookingId: String(data.bookingId ?? data.bookingRef ?? ""),
    pnr: data.pnr != null ? String(data.pnr) : null,
    guestName: String(data.guestName ?? "—"),
    guestCount: data.guestCount != null ? Number(data.guestCount) : null,
    roomCount: data.roomCount != null ? Number(data.roomCount) : null,
    roomName: data.roomName != null ? String(data.roomName) : null,
    checkInDate: String(data.checkInDate ?? ""),
    checkOutDate: String(data.checkOutDate ?? ""),
    bookingStatus: String(data.bookingStatus ?? "—"),
    bookingAmount: toMoney(data.bookingAmount),
    payableToProperty: toMoney(data.payableToProperty),
    paymentStatus: String(data.paymentStatus ?? "—"),
    earningsLines,
    netPayable: toMoney(data.netPayable ?? data.payableToProperty),
    currency,
  };
}

export const netEarningsReportService = {
  getReportRaw: async (params: NetEarningsReportParams): Promise<unknown> => {
    const search = buildSearchParams(params);
    return apiClient.get(`${API_ENDPOINTS.REPORTS.NET_EARNINGS}?${search.toString()}`);
  },

  getReport: async (
    params: NetEarningsReportParams,
  ): Promise<NetEarningsReportResponse> => {
    const search = buildSearchParams(params);
    const response = await apiClient.get<ApiSuccessResponse<unknown> | unknown>(
      `${API_ENDPOINTS.REPORTS.NET_EARNINGS}?${search.toString()}`,
    );
    return normalizeReportResponse(
      unwrapPayload(response),
      params.page ?? 0,
      params.size ?? 20,
    );
  },

  getBookingDetailRaw: async (bookingRef: string): Promise<unknown> => {
    return apiClient.get(API_ENDPOINTS.REPORTS.NET_EARNINGS_DETAIL(bookingRef));
  },

  getBookingDetail: async (
    bookingRef: string,
  ): Promise<NetEarningsBookingDetail> => {
    const response = await apiClient.get<ApiSuccessResponse<unknown> | unknown>(
      API_ENDPOINTS.REPORTS.NET_EARNINGS_DETAIL(bookingRef),
    );
    return normalizeBookingDetail(unwrapPayload(response));
  },

  exportReport: async (options: {
    params: Omit<NetEarningsReportParams, "page" | "size" | "search">;
    format?: ReportExportFormat;
    defaultFileName: string;
    onStatus?: (status: ExportJobStatus) => void;
  }): Promise<void> => {
    const search = buildSearchParams(
      { ...options.params, page: undefined, size: undefined, search: undefined },
      true,
    );
    search.set("format", options.format ?? "EXCEL");
    await runReportExportJob({
      startUrl: `${API_ENDPOINTS.REPORTS.NET_EARNINGS_EXPORT}?${search.toString()}`,
      statusUrl: API_ENDPOINTS.REPORTS.NET_EARNINGS_EXPORT_JOB,
      downloadUrl: API_ENDPOINTS.REPORTS.NET_EARNINGS_EXPORT_DOWNLOAD,
      defaultFileName: options.defaultFileName,
      format: options.format ?? "EXCEL",
      onStatus: options.onStatus,
    });
  },
};
