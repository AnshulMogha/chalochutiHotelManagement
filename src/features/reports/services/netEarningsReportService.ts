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

export type NetEarningsBookingStatus = "CONFIRMED" | "CANCELLED";

export type NetEarningsBookingType = "ALL" | "HOTEL" | "PACKAGE";
export type NetEarningsPaymentStatus = "PENDING" | "SETTLED";

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

export interface NetEarningsMoney {
  amount: number;
  currency: string;
}

export interface NetEarningsLineItem {
  code: string;
  label: string;
  amount: number;
}

export interface NetEarningsChargeGroup {
  total: NetEarningsMoney;
  details: NetEarningsLineItem[];
}

export interface NetEarningsBookingDetail {
  booking: {
    bookingId: string;
    bookingRef: string;
    pnr: string | null;
    hotelId: string | null;
    hotelName: string | null;
    checkIn: string;
    checkOut: string;
    stayDurationDays: number | null;
    guestCount: number | null;
    guestName: string;
    bookingStatus: string;
    roomCount: number | null;
    roomNames: string[];
  };
  earnings: {
    propertyGrossCharges: NetEarningsChargeGroup;
    commissionIncludingGst: NetEarningsChargeGroup;
    taxDeduction: NetEarningsChargeGroup;
    payableToProperty: NetEarningsMoney;
    formula: string | null;
  };
  payout: {
    paymentStatus: string;
    amountTransferred: NetEarningsMoney;
    amountAdjusted: NetEarningsMoney;
    dueDate: string | null;
    settledAt: string | null;
  };
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
  bookingStatuses?: NetEarningsBookingStatus[];
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
  if (params.bookingStatuses?.length) {
    search.set("bookingStatus", params.bookingStatuses.join(","));
  }
  if (params.paymentStatus) {
    search.set("paymentStatus", params.paymentStatus);
  }
  if (params.bookingType && params.bookingType !== "ALL") {
    search.set("bookingType", params.bookingType);
  }
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

function toMoneyObject(
  raw: unknown,
  fallbackCurrency = "INR",
): NetEarningsMoney {
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    return {
      amount: toMoney(record.amount ?? record),
      currency: String(record.currency ?? fallbackCurrency),
    };
  }
  return { amount: toMoney(raw), currency: fallbackCurrency };
}

function normalizeLineItems(raw: unknown): NetEarningsLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const record = (item ?? {}) as Record<string, unknown>;
    return {
      code: String(record.code ?? String.fromCharCode(65 + index)),
      label: String(record.label ?? "Line item"),
      amount: toMoney(record.amount),
    };
  });
}

function normalizeChargeGroup(
  raw: unknown,
  fallbackCurrency = "INR",
): NetEarningsChargeGroup {
  const record = (raw ?? {}) as Record<string, unknown>;
  const details = normalizeLineItems(record.details);
  const total = toMoneyObject(record.total, fallbackCurrency);
  if (!details.length && total.amount) {
    return {
      total,
      details: [{ code: "", label: "Total", amount: total.amount }],
    };
  }
  return { total, details };
}

function normalizeBookingDetail(payload: unknown): NetEarningsBookingDetail {
  const data = payload as Record<string, unknown>;
  const bookingRaw = (data.booking ?? data) as Record<string, unknown>;
  const earningsRaw = (data.earnings ?? {}) as Record<string, unknown>;
  const payoutRaw = (data.payout ?? data) as Record<string, unknown>;
  const currency = String(
    (earningsRaw.payableToProperty as { currency?: string } | undefined)
      ?.currency ??
      data.currency ??
      "INR",
  );
  const roomNamesRaw = bookingRaw.roomNames;
  const roomNames = Array.isArray(roomNamesRaw)
    ? roomNamesRaw.map((name) => String(name ?? "").trim()).filter(Boolean)
    : bookingRaw.roomName
      ? [String(bookingRaw.roomName)]
      : [];

  const legacyLines = normalizeLineItems(data.earningsLines);
  const propertyGrossCharges = normalizeChargeGroup(
    earningsRaw.propertyGrossCharges,
    currency,
  );
  if (!propertyGrossCharges.details.length && legacyLines.length) {
    propertyGrossCharges.details = legacyLines;
    propertyGrossCharges.total = {
      amount: legacyLines.reduce((sum, line) => sum + line.amount, 0),
      currency,
    };
  }

  return {
    booking: {
      bookingId: String(bookingRaw.bookingId ?? bookingRaw.bookingRef ?? ""),
      bookingRef: String(bookingRaw.bookingRef ?? bookingRaw.bookingId ?? ""),
      pnr: bookingRaw.pnr != null ? String(bookingRaw.pnr) : null,
      hotelId: bookingRaw.hotelId != null ? String(bookingRaw.hotelId) : null,
      hotelName:
        bookingRaw.hotelName != null ? String(bookingRaw.hotelName) : null,
      checkIn: String(bookingRaw.checkIn ?? bookingRaw.checkInDate ?? ""),
      checkOut: String(bookingRaw.checkOut ?? bookingRaw.checkOutDate ?? ""),
      stayDurationDays:
        bookingRaw.stayDurationDays != null
          ? Number(bookingRaw.stayDurationDays)
          : null,
      guestCount:
        bookingRaw.guestCount != null ? Number(bookingRaw.guestCount) : null,
      guestName: String(bookingRaw.guestName ?? "—"),
      bookingStatus: String(bookingRaw.bookingStatus ?? "—"),
      roomCount:
        bookingRaw.roomCount != null ? Number(bookingRaw.roomCount) : null,
      roomNames,
    },
    earnings: {
      propertyGrossCharges,
      commissionIncludingGst: normalizeChargeGroup(
        earningsRaw.commissionIncludingGst,
        currency,
      ),
      taxDeduction: normalizeChargeGroup(earningsRaw.taxDeduction, currency),
      payableToProperty: toMoneyObject(
        earningsRaw.payableToProperty ?? data.payableToProperty,
        currency,
      ),
      formula:
        earningsRaw.formula != null ? String(earningsRaw.formula) : null,
    },
    payout: {
      paymentStatus: String(payoutRaw.paymentStatus ?? data.paymentStatus ?? "—"),
      amountTransferred: toMoneyObject(payoutRaw.amountTransferred, currency),
      amountAdjusted: toMoneyObject(payoutRaw.amountAdjusted, currency),
      dueDate: payoutRaw.dueDate != null ? String(payoutRaw.dueDate) : null,
      settledAt:
        payoutRaw.settledAt != null ? String(payoutRaw.settledAt) : null,
    },
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
