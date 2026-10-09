import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import {
  runReportExportJob,
  type ExportJobStatus,
  type ReportExportFormat,
} from "./reportExportService";

export type RevenueDatePreset =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "LAST_WEEK"
  | "LAST_7_DAYS"
  | "LAST_14_DAYS"
  | "LAST_15_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "LAST_30_DAYS"
  | "LAST_180_DAYS"
  | "LAST_365_DAYS"
  | "NEXT_7_DAYS"
  | "NEXT_30_DAYS"
  | "ALL_TIME"
  | "CUSTOM";

export type RevenueDateAxis =
  | "REVENUE_DATE"
  | "CHECK_OUT"
  | "TRAVEL_END_DATE"
  | "BOOKING_DATE";
export type RevenueProduct = "ALL" | "HOTEL" | "PACKAGE";
export type RevenueChannel = "ALL" | "B2C" | "B2B";
export type RevenuePaymentStatus = "ALL" | "PAID" | "PARTIAL" | "PENDING";

export interface RevenueMoney {
  amount: number;
  currency: string;
}

export interface RevenuePrimaryKpis {
  completedBookings: number;
  grossBookingValue: RevenueMoney | null;
  collectedRevenue: RevenueMoney | null;
  outstanding: RevenueMoney | null;
  outstandingSupported: boolean;
  outstandingScope: string | null;
  supplierCost: RevenueMoney | null;
  supplierCostSupported: boolean;
  supplierCostScope: string | null;
  otaRevenue: RevenueMoney | null;
  grossProfit: RevenueMoney | null;
  grossProfitSupported: boolean;
  grossProfitScope: string | null;
  refunded: RevenueMoney | null;
  currency: string;
}

export interface RevenueProductRow extends RevenuePrimaryKpis {
  product: string;
  supplierOutstanding: RevenueMoney | null;
}

export interface RevenueSecondary {
  cancelledBookings: number | null;
  cancellationAmount: RevenueMoney | null;
  pendingRefund: RevenueMoney | null;
  tds: RevenueMoney | null;
  tcs: RevenueMoney | null;
  otaGst: RevenueMoney | null;
  otaRevenueIncludingGst: RevenueMoney | null;
  agencyCommission: RevenueMoney | null;
  commissionReversal: RevenueMoney | null;
  discountAmount: RevenueMoney | null;
}

export interface RevenueDefinitionView {
  hotelRevenueDate: string;
  packageRevenueDate: string;
  hotelCompletion: string;
  packageCompletion: string;
  cancellationDate: string;
}

export interface RevenueDashboardResponse {
  viewer: string | null;
  dateRange: {
    preset: string | null;
    fromDate: string | null;
    toDate: string | null;
  };
  dateAxis: string | null;
  product: string | null;
  notes: string[];
  definition: RevenueDefinitionView;
  primaryKpis: RevenuePrimaryKpis;
  productBreakdown: RevenueProductRow[];
  secondary: RevenueSecondary;
}

export interface RevenueDashboardParams {
  datePreset?: RevenueDatePreset;
  fromDate?: string;
  toDate?: string;
  dateAxis?: RevenueDateAxis;
  product?: RevenueProduct;
  hotelId?: string;
  packageId?: string;
  supplierId?: string;
  stateId?: string;
  cityId?: string;
  channel?: RevenueChannel;
  paymentStatus?: RevenuePaymentStatus;
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

function money(raw: unknown): RevenueMoney | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (record.amount == null || record.amount === "") return null;
  const amount = Number(record.amount);
  if (!Number.isFinite(amount)) return null;
  return {
    amount,
    currency: String(record.currency || "INR"),
  };
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function supportFlag(
  record: Record<string, unknown>,
  key: string,
  value: RevenueMoney | null,
): boolean {
  if (typeof record[key] === "boolean") return Boolean(record[key]);
  return value != null;
}

function normalizePrimary(
  raw: Record<string, unknown> | null | undefined,
): RevenuePrimaryKpis {
  const record = raw ?? {};
  const outstanding = money(record.outstanding);
  const grossProfit = money(record.grossProfit);
  const supplierCost = money(record.supplierCost);
  return {
    completedBookings: toNumber(record.completedBookings),
    grossBookingValue: money(record.grossBookingValue),
    collectedRevenue: money(record.collectedRevenue),
    outstanding,
    outstandingSupported: supportFlag(
      record,
      "outstandingSupported",
      outstanding,
    ),
    outstandingScope: nullableText(record.outstandingScope),
    supplierCost,
    supplierCostSupported: supportFlag(
      record,
      "supplierCostSupported",
      supplierCost,
    ),
    supplierCostScope: nullableText(record.supplierCostScope),
    otaRevenue: money(record.otaRevenue),
    grossProfit,
    grossProfitSupported: supportFlag(
      record,
      "grossProfitSupported",
      grossProfit,
    ),
    grossProfitScope: nullableText(record.grossProfitScope),
    refunded: money(record.refunded),
    currency: String(record.currency || "INR"),
  };
}

function normalizeProductRow(raw: unknown): RevenueProductRow {
  const record = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    product: String(record.product || "—"),
    ...normalizePrimary(record),
    supplierOutstanding: money(
      record.outstandingHotelPayout ?? record.supplierOutstanding,
    ),
  };
}

function normalizeSecondary(raw: unknown): RevenueSecondary {
  const record = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    cancelledBookings:
      record.cancelledBookings == null
        ? null
        : toNumber(record.cancelledBookings),
    cancellationAmount: money(record.cancellationAmount),
    pendingRefund: money(record.pendingRefund),
    tds: money(record.tds),
    tcs: money(record.tcs),
    otaGst: money(record.otaGst),
    otaRevenueIncludingGst: money(record.otaRevenueIncludingGst),
    agencyCommission: money(record.agencyCommission),
    commissionReversal: money(record.commissionReversal),
    discountAmount: money(record.discountAmount),
  };
}

function textFrom(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const text =
      record.label ?? record.description ?? record.text ?? record.value;
    if (typeof text === "string" && text.trim()) return text.trim();
  }
  return fallback;
}

function normalizeDefinition(raw: unknown): RevenueDefinitionView {
  const definition =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const nested =
    definition.definitions && typeof definition.definitions === "object"
      ? (definition.definitions as Record<string, unknown>)
      : definition;
  return {
    hotelRevenueDate: textFrom(
      nested.hotelRevenueDate ?? nested.hotelDate,
      "Checkout date",
    ),
    packageRevenueDate: textFrom(
      nested.packageRevenueDate ?? nested.packageDate,
      "Travel end date",
    ),
    hotelCompletion: textFrom(
      nested.hotelCompletion ?? nested.hotelRecognizedWhen,
      "Confirmed and checkout before today",
    ),
    packageCompletion: textFrom(
      nested.packageCompletion ?? nested.packageRecognizedWhen,
      "Confirmed or partial, and travel end before today",
    ),
    cancellationDate: textFrom(
      nested.cancellationDate ?? nested.cancelledAt,
      "cancelledAt",
    ),
  };
}
function normalizeNotes(payload: Record<string, unknown>): string[] {
  const direct = Array.isArray(payload.notes) ? payload.notes : [];
  const definition =
    payload.revenueDefinition && typeof payload.revenueDefinition === "object"
      ? (payload.revenueDefinition as Record<string, unknown>)
      : {};
  const definitionNotes = Array.isArray(definition.notes) ? definition.notes : [];
  return [...direct, ...definitionNotes]
    .map((note) => String(note || "").trim())
    .filter(Boolean);
}

function normalizeDashboard(raw: unknown): RevenueDashboardResponse {
  const payload = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const dateRange =
    payload.dateRange && typeof payload.dateRange === "object"
      ? (payload.dateRange as Record<string, unknown>)
      : {};
  const breakdown = Array.isArray(payload.productBreakdown)
    ? payload.productBreakdown.map(normalizeProductRow)
    : [];

  return {
    viewer: nullableText(payload.viewer),
    dateRange: {
      preset: nullableText(dateRange.preset),
      fromDate: nullableText(dateRange.fromDate),
      toDate: nullableText(dateRange.toDate),
    },
    dateAxis: nullableText(payload.dateAxis),
    product: nullableText(payload.product),
    notes: normalizeNotes(payload),
    definition: normalizeDefinition(payload.revenueDefinition),
    primaryKpis: normalizePrimary(
      payload.primaryKpis as Record<string, unknown> | undefined,
    ),
    productBreakdown: breakdown,
    secondary: normalizeSecondary(payload.secondary),
  };
}

function buildQuery(params: RevenueDashboardParams): string {
  const search = new URLSearchParams();
  if (params.datePreset) search.set("datePreset", params.datePreset);
  if (params.datePreset === "CUSTOM") {
    if (params.fromDate) search.set("fromDate", params.fromDate);
    if (params.toDate) search.set("toDate", params.toDate);
  }
  if (params.dateAxis) search.set("dateAxis", params.dateAxis);
  if (params.product) search.set("product", params.product);
  if (params.channel && params.channel !== "ALL") {
    search.set("channel", params.channel);
  }
  if (params.paymentStatus && params.paymentStatus !== "ALL") {
    search.set("paymentStatus", params.paymentStatus);
  }
  if (params.hotelId?.trim()) search.set("hotelId", params.hotelId.trim());
  if (params.packageId?.trim()) search.set("packageId", params.packageId.trim());
  if (params.supplierId?.trim()) {
    search.set("supplierId", params.supplierId.trim());
  }
  if (params.stateId?.trim()) search.set("stateId", params.stateId.trim());
  if (params.cityId?.trim()) search.set("cityId", params.cityId.trim());
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const revenueDashboardService = {
  async getDashboard(
    params: RevenueDashboardParams,
  ): Promise<RevenueDashboardResponse> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(`${API_ENDPOINTS.REPORTS.REVENUE_DASHBOARD}${buildQuery(params)}`);
    return normalizeDashboard(unwrapPayload(response));
  },

  async exportDashboard(
    params: RevenueDashboardParams,
    format: ReportExportFormat = "EXCEL",
    onStatus?: (status: ExportJobStatus) => void,
  ): Promise<void> {
    const query = buildQuery(params);
    const formatParam = query
      ? `${query}&format=${format}`
      : `?format=${format}`;
    await runReportExportJob({
      startUrl: `${API_ENDPOINTS.REPORTS.REVENUE_DASHBOARD_EXPORT}${formatParam}`,
      statusUrl: API_ENDPOINTS.REPORTS.REVENUE_DASHBOARD_EXPORT_JOB,
      downloadUrl: API_ENDPOINTS.REPORTS.REVENUE_DASHBOARD_EXPORT_DOWNLOAD,
      defaultFileName: "chalochutti-revenue-dashboard",
      format,
      onStatus,
    });
  },
};
