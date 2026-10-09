import { API_ENDPOINTS } from "@/constants";
import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import {
  runReportExportJob,
  type ExportJobStatus,
  type ReportExportFormat,
} from "@/features/reports/services/reportExportService";

export type SettlementDatePreset =
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
  | "ALL_TIME"
  | "CUSTOM";

export type SettlementProduct = "ALL" | "HOTEL" | "PACKAGE";
export type SettlementSortDirection = "ASC" | "DESC";
export type SettlementBookingSort =
  | "bookingDate"
  | "serviceDate"
  | "bookingValue"
  | "customerCollected"
  | "customerOutstanding"
  | "supplierPayable"
  | "supplierPaid"
  | "supplierOutstanding"
  | "platformRevenue";

export interface SettlementMoney {
  amount: number;
  currency: string;
}

export interface SettlementMoneyKpi {
  available: boolean;
  amount: SettlementMoney | null;
  unavailableReason: string | null;
}

export interface SettlementSupplierComponent {
  component: string;
  payable: SettlementMoneyKpi;
  paid: SettlementMoneyKpi;
  outstanding: SettlementMoneyKpi;
}

export interface SettlementKpiGroup {
  bookingCount: number;
  [key: string]: number | SettlementMoneyKpi | SettlementSupplierComponent[] | string | null;
}

export interface SettlementStatusDistribution {
  status: string;
  bookingCount: number;
}

export interface SettlementDashboardResponse {
  viewer: string | null;
  dateRange: {
    preset: string | null;
    fromDate: string | null;
    toDate: string | null;
  };
  dateAxis: string;
  overall: SettlementKpiGroup;
  hotel: SettlementKpiGroup;
  packages: SettlementKpiGroup;
  statusDistribution: SettlementStatusDistribution[];
  definitions: string[];
  phase1Limitations: string[];
}

export interface SettlementDashboardParams {
  datePreset?: SettlementDatePreset;
  fromDate?: string;
  toDate?: string;
  product?: SettlementProduct;
  hotelId?: string;
  packageId?: string;
}

export interface SettlementBookingFilters {
  datePreset?: SettlementDatePreset;
  fromDate?: string;
  toDate?: string;
  productType?: SettlementProduct;
  hotelId?: string;
  packageId?: string;
  supplierId?: string;
  settlementStatus?: string;
  customerPaymentStatus?: string;
  supplierPaymentStatus?: string;
  bookingStatus?: string;
  paymentStatus?: string;
  channel?: string;
  businessType?: string;
  agencyId?: string;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: SettlementBookingSort;
  sortDirection?: SettlementSortDirection;
}

export interface SettlementBookingRow {
  productType: string;
  bookingId: string | number | null;
  bookingRef: string;
  settlementNo: string | null;
  bookingDate: string | null;
  serviceDate: string | null;
  customerName: string;
  customerEmail: string | null;
  customerMobile: string | null;
  customerId: string | number | null;
  bookedByUserId: string | number | null;
  bookedByName: string | null;
  businessType: string | null;
  channel: string | null;
  hotelId: string | null;
  hotelName: string | null;
  packageId: string | number | null;
  packageName: string | null;
  bookingStatus: string | null;
  paymentStatus: string | null;
  bookingValue: number;
  customerCollected: number;
  customerOutstanding: number;
  supplierPayable: number;
  trackedSupplierPayable: number;
  supplierPaid: number;
  supplierOutstanding: number;
  untrackedActivityPayable: number;
  platformRevenue: number;
  refundPending: boolean;
  refundPendingAmount: number;
  netSettlementPosition: number;
  settlementStatus: string | null;
  customerPaymentStatus: string | null;
  supplierPaymentStatus: string | null;
  supplierComponents: SettlementSupplierComponent[];
}

export interface SettlementBookingsResponse {
  content: SettlementBookingRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  summary: SettlementKpiGroup;
  dateRange: {
    preset: string | null;
    fromDate: string | null;
    toDate: string | null;
  };
  dateAxis: string;
  definitions: string[];
  limitations: string[];
}

const MONEY_KPI_KEYS = new Set([
  "totalBookingValue",
  "customerCollected",
  "customerOutstanding",
  "supplierPayable",
  "trackedSupplierPayable",
  "supplierPaid",
  "supplierOutstanding",
  "untrackedActivityPayable",
  "platformRevenue",
  "totalRefundPending",
  "netSettlementPosition",
  "hotelBookingValue",
  "hotelPayable",
  "hotelPaid",
  "hotelOutstanding",
  "otaCommission",
  "commissionGst",
  "refundPending",
  "packageBookingValue",
  "supplierCost",
  "packageRevenue",
  "bookingValue",
]);

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function unwrapPayload<T>(response: ApiSuccessResponse<T> | T): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as ApiSuccessResponse<T>).data;
  }
  return response as T;
}

function nullableText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeMoney(value: unknown): SettlementMoney | null {
  const raw = objectValue(value);
  if (raw.amount == null || raw.amount === "") return null;
  const amount = Number(raw.amount);
  if (!Number.isFinite(amount)) return null;
  return {
    amount,
    currency: String(raw.currency || "INR"),
  };
}

export function normalizeSettlementMoneyKpi(
  value: unknown,
): SettlementMoneyKpi {
  const raw = objectValue(value);
  const normalizedAmount =
    raw.amount && typeof raw.amount === "object"
      ? normalizeMoney(raw.amount)
      : normalizeMoney(value);
  const available =
    typeof raw.available === "boolean"
      ? raw.available
      : normalizedAmount != null;
  return {
    available,
    amount: available ? normalizedAmount : null,
    unavailableReason: nullableText(raw.unavailableReason),
  };
}

function normalizeTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeComponent(value: unknown): SettlementSupplierComponent {
  const raw = objectValue(value);
  return {
    component: String(raw.component || "UNKNOWN"),
    payable: normalizeSettlementMoneyKpi(raw.payable),
    paid: normalizeSettlementMoneyKpi(raw.paid),
    outstanding: normalizeSettlementMoneyKpi(raw.outstanding),
  };
}

function normalizeComponents(value: unknown): SettlementSupplierComponent[] {
  if (Array.isArray(value)) return value.map(normalizeComponent);
  const raw = objectValue(value);
  return Object.values(raw)
    .filter((item) => item && typeof item === "object")
    .map(normalizeComponent);
}

function normalizeKpiGroup(value: unknown): SettlementKpiGroup {
  const raw = objectValue(value);
  const normalized: SettlementKpiGroup = {
    bookingCount: numberValue(raw.bookingCount),
  };

  for (const [key, item] of Object.entries(raw)) {
    if (key === "bookingCount") continue;
    if (key === "supplierComponents") {
      normalized[key] = normalizeComponents(item);
    } else if (MONEY_KPI_KEYS.has(key)) {
      normalized[key] = normalizeSettlementMoneyKpi(item);
    } else if (
      typeof item === "number" ||
      typeof item === "string" ||
      item == null
    ) {
      normalized[key] = item as number | string | null;
    }
  }
  return normalized;
}

function normalizeDateRange(value: unknown) {
  const raw = objectValue(value);
  return {
    preset: nullableText(raw.preset),
    fromDate: nullableText(raw.fromDate),
    toDate: nullableText(raw.toDate),
  };
}

function normalizeDashboard(value: unknown): SettlementDashboardResponse {
  const raw = objectValue(value);
  return {
    viewer: nullableText(raw.viewer),
    dateRange: normalizeDateRange(raw.dateRange),
    dateAxis: String(raw.dateAxis || "BOOKING"),
    overall: normalizeKpiGroup(raw.overall),
    hotel: normalizeKpiGroup(raw.hotel),
    packages: normalizeKpiGroup(raw.packages),
    statusDistribution: Array.isArray(raw.statusDistribution)
      ? raw.statusDistribution.map((item) => {
          const row = objectValue(item);
          return {
            status: String(row.status || "UNKNOWN"),
            bookingCount: numberValue(row.bookingCount),
          };
        })
      : [],
    definitions: normalizeTextList(raw.definitions),
    phase1Limitations: normalizeTextList(raw.phase1Limitations),
  };
}

function normalizeBookingRow(value: unknown): SettlementBookingRow {
  const raw = objectValue(value);
  return {
    productType: String(raw.productType || "UNKNOWN"),
    bookingId:
      typeof raw.bookingId === "number" || typeof raw.bookingId === "string"
        ? raw.bookingId
        : null,
    bookingRef: String(raw.bookingRef || "—"),
    settlementNo: nullableText(
      raw.settlementNo ?? raw.settlementNumber ?? raw.settlementId,
    ),
    bookingDate: nullableText(raw.bookingDate),
    serviceDate: nullableText(raw.serviceDate),
    customerName: String(raw.customerName || "—"),
    customerEmail: nullableText(raw.customerEmail),
    customerMobile: nullableText(raw.customerMobile),
    customerId:
      typeof raw.customerId === "number" || typeof raw.customerId === "string"
        ? raw.customerId
        : null,
    bookedByUserId:
      typeof raw.bookedByUserId === "number" ||
      typeof raw.bookedByUserId === "string"
        ? raw.bookedByUserId
        : null,
    bookedByName: nullableText(raw.bookedByName),
    businessType: nullableText(raw.businessType),
    channel: nullableText(raw.channel),
    hotelId: nullableText(raw.hotelId),
    hotelName: nullableText(raw.hotelName),
    packageId:
      typeof raw.packageId === "number" || typeof raw.packageId === "string"
        ? raw.packageId
        : null,
    packageName: nullableText(raw.packageName),
    bookingStatus: nullableText(raw.bookingStatus),
    paymentStatus: nullableText(raw.paymentStatus),
    bookingValue: numberValue(raw.bookingValue),
    customerCollected: numberValue(raw.customerCollected),
    customerOutstanding: numberValue(raw.customerOutstanding),
    supplierPayable: numberValue(raw.supplierPayable),
    trackedSupplierPayable: numberValue(raw.trackedSupplierPayable),
    supplierPaid: numberValue(raw.supplierPaid),
    supplierOutstanding: numberValue(raw.supplierOutstanding),
    untrackedActivityPayable: numberValue(raw.untrackedActivityPayable),
    platformRevenue: numberValue(raw.platformRevenue),
    refundPending: booleanValue(raw.refundPending),
    refundPendingAmount: numberValue(raw.refundPendingAmount),
    netSettlementPosition: numberValue(raw.netSettlementPosition),
    settlementStatus: nullableText(raw.settlementStatus),
    customerPaymentStatus: nullableText(raw.customerPaymentStatus),
    supplierPaymentStatus: nullableText(raw.supplierPaymentStatus),
    supplierComponents: normalizeComponents(raw.supplierComponents),
  };
}

function normalizeBookings(value: unknown): SettlementBookingsResponse {
  const raw = objectValue(value);
  const page = numberValue(raw.page);
  const size = numberValue(raw.size, 20);
  const totalElements = numberValue(raw.totalElements);
  const totalPages = numberValue(
    raw.totalPages,
    size > 0 ? Math.ceil(totalElements / size) : 0,
  );
  return {
    content: Array.isArray(raw.content)
      ? raw.content.map(normalizeBookingRow)
      : [],
    page,
    size,
    totalElements,
    totalPages,
    first: booleanValue(raw.first, page === 0),
    last: booleanValue(raw.last, totalPages === 0 || page >= totalPages - 1),
    hasNext: booleanValue(raw.hasNext, page + 1 < totalPages),
    hasPrevious: booleanValue(raw.hasPrevious, page > 0),
    summary: normalizeKpiGroup(raw.summary),
    dateRange: normalizeDateRange(raw.dateRange),
    dateAxis: String(raw.dateAxis || "BOOKING"),
    definitions: normalizeTextList(raw.definitions),
    limitations: normalizeTextList(raw.limitations),
  };
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    if ((key === "fromDate" || key === "toDate") && params.datePreset !== "CUSTOM") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const settlementDashboardService = {
  async getDashboard(
    params: SettlementDashboardParams,
  ): Promise<SettlementDashboardResponse> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(
      `${API_ENDPOINTS.REPORTS.SETTLEMENT_DASHBOARD}${buildQuery(
        params as Record<string, unknown>,
      )}`,
    );
    return normalizeDashboard(unwrapPayload(response));
  },

  async exportDashboard(
    params: SettlementDashboardParams,
    format: ReportExportFormat = "EXCEL",
    onStatus?: (status: ExportJobStatus) => void,
  ): Promise<void> {
    const query = buildQuery(params as Record<string, unknown>);
    const formatParam = query
      ? `${query}&format=${format}`
      : `?format=${format}`;
    await runReportExportJob({
      startUrl: `${API_ENDPOINTS.REPORTS.SETTLEMENT_DASHBOARD_EXPORT}${formatParam}`,
      statusUrl: API_ENDPOINTS.REPORTS.SETTLEMENT_DASHBOARD_EXPORT_JOB,
      downloadUrl: API_ENDPOINTS.REPORTS.SETTLEMENT_DASHBOARD_EXPORT_DOWNLOAD,
      defaultFileName: "settlement-dashboard-kpis",
      format,
      onStatus,
    });
  },

  async getBookings(
    params: SettlementBookingFilters,
  ): Promise<SettlementBookingsResponse> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(
      `${API_ENDPOINTS.REPORTS.SETTLEMENT_DASHBOARD_BOOKINGS}${buildQuery(
        params as Record<string, unknown>,
      )}`,
    );
    return normalizeBookings(unwrapPayload(response));
  },

  async exportBookings(
    params: SettlementBookingFilters,
    format: ReportExportFormat = "EXCEL",
    onStatus?: (status: ExportJobStatus) => void,
  ): Promise<void> {
    const query = buildQuery({
      ...(params as Record<string, unknown>),
      page: undefined,
      size: undefined,
    });
    const formatParam = query
      ? `${query}&format=${format}`
      : `?format=${format}`;
    await runReportExportJob({
      startUrl: `${API_ENDPOINTS.REPORTS.SETTLEMENT_DASHBOARD_BOOKINGS_EXPORT}${formatParam}`,
      statusUrl:
        API_ENDPOINTS.REPORTS.SETTLEMENT_DASHBOARD_BOOKINGS_EXPORT_JOB,
      downloadUrl:
        API_ENDPOINTS.REPORTS.SETTLEMENT_DASHBOARD_BOOKINGS_EXPORT_DOWNLOAD,
      defaultFileName: "settlement-booking-mis",
      format,
      onStatus,
    });
  },
};
