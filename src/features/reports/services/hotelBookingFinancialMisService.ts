import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";

export type HotelFinancialMisDatePreset = "THIS_MONTH" | "CUSTOM";

export type HotelFinancialMisDateAxis =
  | "BOOKING_DATE"
  | "CHECK_IN"
  | "CHECK_OUT";

export type HotelFinancialMisBookingStatus =
  | "ALL"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export type HotelFinancialMisBookingSource = "ALL" | "HOTEL" | "PACKAGE";

export type HotelFinancialMisPaymentStatus =
  | "ALL"
  | "PAID"
  | "PARTIAL"
  | "PENDING";

export type HotelFinancialMisRefundStatus = "ALL" | "PENDING" | "PROCESSED";

export type HotelFinancialMisSort =
  | "BOOKING_DATE"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "BOOKING_REF"
  | "HOTEL_NAME"
  | "CUSTOMER_SELLING_PRICE"
  | "HOTEL_PAYOUT"
  | "OTA_REVENUE"
  | "AMOUNT_COLLECTED"
  | "LAST_UPDATED";

export interface HotelFinancialMisMoney {
  amount: number;
  currency: string;
  ratePercent?: number | null;
  rateType?: string | null;
  fixedAmount?: number | null;
  rateLabel?: string | null;
}

export interface HotelFinancialMisPaymentEntry {
  status: string;
  paymentMethod?: string | null;
  paymentTransactionId?: string | null;
  paymentTime?: string | null;
  amount: HotelFinancialMisMoney;
}

export interface HotelFinancialMisPaymentInfo {
  status?: string | null;
  paymentMethod?: string | null;
  paymentTransactionId?: string | null;
  paymentTime?: string | null;
  payments: HotelFinancialMisPaymentEntry[];
}

export interface HotelFinancialMisCustomerBreakup {
  baseFare: HotelFinancialMisMoney;
  promotionDiscount: HotelFinancialMisMoney;
  hotelGst: HotelFinancialMisMoney;
  serviceFee: HotelFinancialMisMoney;
  serviceFeeGst: HotelFinancialMisMoney;
  couponDiscount: HotelFinancialMisMoney;
  finalCustomerPrice: HotelFinancialMisMoney;
  formula?: string | null;
}

export interface HotelFinancialMisAgencyIncentive {
  agencyTier?: string | null;
  incentivePercent?: number | null;
  incentiveType?: string | null;
  incentiveCategory?: string | null;
  grossAmount: HotelFinancialMisMoney;
  tds: HotelFinancialMisMoney;
  netAmount: HotelFinancialMisMoney;
}

export interface HotelFinancialMisAgentPaymentBreakup {
  sellingPrice: HotelFinancialMisMoney;
  grossAgentCommission: HotelFinancialMisMoney;
  agentTds: HotelFinancialMisMoney;
  netAgentCommission: HotelFinancialMisMoney;
  amountPayableByAgent: HotelFinancialMisMoney;
}

export interface HotelFinancialMisMatchedBracket {
  cancellationPolicyId?: number | null;
  id?: number | null;
  label?: string | null;
  penaltyType?: string | null;
  penaltyPercent?: number | null;
  fixedPenaltyAmount?: number | HotelFinancialMisMoney | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export interface HotelFinancialMisHotelPayoutBreakup {
  originalHotelBaseRate: HotelFinancialMisMoney;
  originalHotelGst: HotelFinancialMisMoney;
  hotelBaseRate: HotelFinancialMisMoney;
  hotelGst: HotelFinancialMisMoney;
  otaCommission: HotelFinancialMisMoney;
  otaCommissionGst: HotelFinancialMisMoney;
  otaCommissionInclusiveGst: HotelFinancialMisMoney;
  tds: HotelFinancialMisMoney;
  tcs: HotelFinancialMisMoney;
  finalHotelPayout: HotelFinancialMisMoney;
  formula?: string | null;
}

export interface HotelFinancialMisOtaRevenueBreakup {
  commission: HotelFinancialMisMoney;
  commissionGst: HotelFinancialMisMoney;
  commissionInclusiveGst: HotelFinancialMisMoney;
  markup: HotelFinancialMisMoney;
  serviceFee: HotelFinancialMisMoney;
  serviceFeeGst: HotelFinancialMisMoney;
  cancellationIncome: HotelFinancialMisMoney;
  refundAdjustment: HotelFinancialMisMoney;
  agencyCommission: HotelFinancialMisMoney;
  netOtaRevenue: HotelFinancialMisMoney;
  netOtaRevenueGst: HotelFinancialMisMoney;
  netOtaRevenueInclusiveGst: HotelFinancialMisMoney;
  formula?: string | null;
}

export interface HotelFinancialMisBookingRow {
  bookingId: number;
  bookingRef: string;
  hotelId?: string | null;
  hotelName: string;
  hotelCode?: string | null;
  hotelCity?: string | null;
  hotelState?: string | null;
  customerName?: string | null;
  bookingDate?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  nights: number;
  rooms?: number | null;
  adult?: number | null;
  children?: number | null;
  bookingSource: string;
  bookingRate?: string | null;
  bookedBy: string;
  bookingStatus: string;
  bookingStatusRaw?: string | null;
  customerSellingPrice: HotelFinancialMisMoney;
  originalHotelBaseRate: HotelFinancialMisMoney;
  originalHotelGst: HotelFinancialMisMoney;
  hotelBaseCost: HotelFinancialMisMoney;
  hotelBaseRate: HotelFinancialMisMoney;
  hotelGst: HotelFinancialMisMoney;
  serviceFee: HotelFinancialMisMoney;
  serviceFeeGst: HotelFinancialMisMoney;
  promotionDiscount: HotelFinancialMisMoney;
  couponDiscount: HotelFinancialMisMoney;
  hotelPayout: HotelFinancialMisMoney;
  otaRevenue: HotelFinancialMisMoney;
  otaRevenueGst: HotelFinancialMisMoney;
  otaRevenueInclusiveGst: HotelFinancialMisMoney;
  commission: HotelFinancialMisMoney;
  commissionGst: HotelFinancialMisMoney;
  commissionInclusiveGst: HotelFinancialMisMoney;
  markup: HotelFinancialMisMoney;
  tcs: HotelFinancialMisMoney;
  tds: HotelFinancialMisMoney;
  agentCommission: HotelFinancialMisMoney;
  agentTds: HotelFinancialMisMoney;
  agentNetCommission: HotelFinancialMisMoney;
  agencyIncentive: HotelFinancialMisAgencyIncentive | null;
  agentPaymentBreakup: HotelFinancialMisAgentPaymentBreakup | null;
  paymentStatus: string;
  amountCollected: HotelFinancialMisMoney;
  payment: HotelFinancialMisPaymentInfo | null;
  cancellationDateTime?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  cancellationPolicy?: string | null;
  cancellationPolicyLines: string[];
  cancellationCharge: HotelFinancialMisMoney;
  matchedBracket?: HotelFinancialMisMatchedBracket | null;
  cancellationEvaluatedAt?: string | null;
  refundAmount: HotelFinancialMisMoney;
  refundDateTime?: string | null;
  refundStatus: string;
  lastUpdated?: string | null;
  customerSellingPriceBreakup: HotelFinancialMisCustomerBreakup;
  hotelPayoutBreakup: HotelFinancialMisHotelPayoutBreakup;
  otaRevenueBreakup: HotelFinancialMisOtaRevenueBreakup;
}

export interface HotelFinancialMisSummary {
  totalBookings: number;
  grossBookingValue: HotelFinancialMisMoney;
  hotelPayout: HotelFinancialMisMoney;
  otaRevenue: HotelFinancialMisMoney;
  otaRevenueGst: HotelFinancialMisMoney;
  otaRevenueInclusiveGst: HotelFinancialMisMoney;
  agencyCommission: HotelFinancialMisMoney;
  cancellationAmount: HotelFinancialMisMoney;
  refundAmount: HotelFinancialMisMoney;
  outstandingHotelPayout: HotelFinancialMisMoney;
  outstandingCustomerRefund: HotelFinancialMisMoney;
  currency: string;
}

export interface HotelFinancialMisReportResponse {
  viewer?: string | null;
  dateRange: {
    preset?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
  };
  dateAxis?: string | null;
  filtersApplied?: Record<string, unknown>;
  summary: HotelFinancialMisSummary;
  bookings: HotelFinancialMisBookingRow[];
  page: {
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
    sort: string;
    direction: string;
  };
}

export interface HotelFinancialMisReportParams {
  datePreset?: HotelFinancialMisDatePreset;
  fromDate?: string;
  toDate?: string;
  dateAxis?: HotelFinancialMisDateAxis;
  checkInFrom?: string;
  checkInTo?: string;
  checkOutFrom?: string;
  checkOutTo?: string;
  bookingStatus?: HotelFinancialMisBookingStatus;
  bookingSource?: HotelFinancialMisBookingSource;
  hotelIds?: string[];
  cityIds?: number[];
  stateIds?: number[];
  paymentStatus?: HotelFinancialMisPaymentStatus;
  refundStatus?: HotelFinancialMisRefundStatus;
  search?: string;
  sort?: HotelFinancialMisSort;
  sortDir?: "asc" | "desc";
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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = toNumber(value, Number.NaN);
  return Number.isNaN(parsed) ? null : parsed;
}

function money(raw: unknown, fallbackCurrency = "INR"): HotelFinancialMisMoney {
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    return {
      amount: toNumber(record.amount),
      currency: String(record.currency || fallbackCurrency),
      ratePercent:
        record.ratePercent == null ? null : toNumber(record.ratePercent),
      rateType: (record.rateType as string | null | undefined) ?? null,
      fixedAmount:
        record.fixedAmount == null ? null : toNumber(record.fixedAmount),
      rateLabel: (record.rateLabel as string | null | undefined) ?? null,
    };
  }
  return { amount: toNumber(raw), currency: fallbackCurrency };
}

function normalizePaymentEntry(raw: unknown): HotelFinancialMisPaymentEntry {
  const record = (raw ?? {}) as Record<string, unknown>;
  return {
    status: String(record.status ?? "—"),
    paymentMethod: (record.paymentMethod as string | null | undefined) ?? null,
    paymentTransactionId:
      (record.paymentTransactionId as string | null | undefined) ?? null,
    paymentTime: (record.paymentTime as string | null | undefined) ?? null,
    amount: money(record.amount),
  };
}

function normalizePayment(raw: unknown): HotelFinancialMisPaymentInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const paymentsRaw = record.payments;
  return {
    status: (record.status as string | null | undefined) ?? null,
    paymentMethod: (record.paymentMethod as string | null | undefined) ?? null,
    paymentTransactionId:
      (record.paymentTransactionId as string | null | undefined) ?? null,
    paymentTime: (record.paymentTime as string | null | undefined) ?? null,
    payments: Array.isArray(paymentsRaw)
      ? paymentsRaw.map(normalizePaymentEntry)
      : [],
  };
}

function normalizeCustomerBreakup(
  raw: unknown,
): HotelFinancialMisCustomerBreakup {
  const record = (raw ?? {}) as Record<string, unknown>;
  return {
    // API renamed baseFare → hotelBaseFare; keep both for compatibility.
    baseFare: money(record.hotelBaseFare ?? record.baseFare),
    promotionDiscount: money(record.promotionDiscount),
    hotelGst: money(record.hotelGst),
    serviceFee: money(record.serviceFee),
    serviceFeeGst: money(record.serviceFeeGst),
    couponDiscount: money(record.couponDiscount),
    finalCustomerPrice: money(record.finalCustomerPrice),
    formula: (record.formula as string | null | undefined) ?? null,
  };
}

function normalizeAgencyIncentive(
  raw: unknown,
  fallbackCurrency = "INR",
): HotelFinancialMisAgencyIncentive | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  return {
    agencyTier:
      (typeof record.agencyTier === "string" && record.agencyTier) ||
      (typeof record.agencyTer === "string" && record.agencyTer) ||
      null,
    incentivePercent:
      record.incentivePercent == null
        ? null
        : toNumber(record.incentivePercent),
    incentiveType: (record.incentiveType as string | null | undefined) ?? null,
    incentiveCategory:
      (record.incentiveCategory as string | null | undefined) ?? null,
    grossAmount: money(record.grossAmount, fallbackCurrency),
    tds: money(record.tds, fallbackCurrency),
    netAmount: money(record.netAmount, fallbackCurrency),
  };
}

function normalizeAgentPaymentBreakup(
  raw: unknown,
  fallbackCurrency = "INR",
): HotelFinancialMisAgentPaymentBreakup | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const asMoney = (value: unknown) => {
    if (value && typeof value === "object")
      return money(value, fallbackCurrency);
    return { amount: toNumber(value), currency: fallbackCurrency };
  };
  return {
    sellingPrice: asMoney(record.sellingPrice),
    grossAgentCommission: asMoney(record.grossAgentCommission),
    agentTds: asMoney(record.agentTds),
    netAgentCommission: asMoney(record.netAgentCommission),
    amountPayableByAgent: asMoney(record.amountPayableByAgent),
  };
}

function normalizeMatchedBracket(
  raw: unknown,
): HotelFinancialMisMatchedBracket | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  return {
    cancellationPolicyId: toNullableNumber(record.cancellationPolicyId),
    id: toNullableNumber(record.id),
    label: (record.label as string | null | undefined) ?? null,
    penaltyType: (record.penaltyType as string | null | undefined) ?? null,
    penaltyPercent:
      record.penaltyPercent == null ? null : toNumber(record.penaltyPercent),
    fixedPenaltyAmount:
      record.fixedPenaltyAmount == null
        ? null
        : typeof record.fixedPenaltyAmount === "object"
          ? money(record.fixedPenaltyAmount)
          : toNumber(record.fixedPenaltyAmount),
    effectiveFrom: (record.effectiveFrom as string | null | undefined) ?? null,
    effectiveTo: (record.effectiveTo as string | null | undefined) ?? null,
  };
}

function normalizePolicyLines(linesRaw: unknown, policyRaw: unknown): string[] {
  if (Array.isArray(linesRaw)) {
    return linesRaw.map((line) => String(line ?? "").trim()).filter(Boolean);
  }
  const policy = String(policyRaw ?? "").trim();
  if (!policy) return [];
  return policy
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeHotelPayoutBreakup(
  raw: unknown,
): HotelFinancialMisHotelPayoutBreakup {
  const record = (raw ?? {}) as Record<string, unknown>;
  return {
    originalHotelBaseRate: money(record.originalHotelBaseRate),
    originalHotelGst: money(record.originalHotelGst),
    hotelBaseRate: money(record.hotelBaseRate),
    hotelGst: money(record.hotelGst),
    otaCommission: money(record.otaCommission),
    otaCommissionGst: money(record.otaCommissionGst),
    otaCommissionInclusiveGst: money(record.otaCommissionInclusiveGst),
    tds: money(record.tds),
    tcs: money(record.tcs),
    finalHotelPayout: money(record.finalHotelPayout),
    formula: (record.formula as string | null | undefined) ?? null,
  };
}

function normalizeOtaRevenueBreakup(
  raw: unknown,
): HotelFinancialMisOtaRevenueBreakup {
  const record = (raw ?? {}) as Record<string, unknown>;
  return {
    commission: money(record.commission),
    commissionGst: money(record.commissionGst),
    commissionInclusiveGst: money(record.commissionInclusiveGst),
    markup: money(record.markup),
    serviceFee: money(record.serviceFee),
    serviceFeeGst: money(record.serviceFeeGst),
    cancellationIncome: money(record.cancellationIncome),
    refundAdjustment: money(record.refundAdjustment),
    agencyCommission: money(record.agencyCommission),
    netOtaRevenue: money(record.netOtaRevenue),
    netOtaRevenueGst: money(record.netOtaRevenueGst),
    netOtaRevenueInclusiveGst: money(record.netOtaRevenueInclusiveGst),
    formula: (record.formula as string | null | undefined) ?? null,
  };
}

function normalizeRow(raw: unknown): HotelFinancialMisBookingRow {
  const record = (raw ?? {}) as Record<string, unknown>;
  const hotelBaseRate = money(record.hotelBaseRate ?? record.hotelBaseCost);
  return {
    bookingId: toNumber(record.bookingId),
    bookingRef: String(record.bookingRef ?? "—"),
    hotelId: (record.hotelId as string | null | undefined) ?? null,
    hotelName: String(record.hotelName ?? "—"),
    hotelCode: (record.hotelCode as string | null | undefined) ?? null,
    hotelCity: (record.hotelCity as string | null | undefined) ?? null,
    hotelState: (record.hotelState as string | null | undefined) ?? null,
    customerName: (record.customerName as string | null | undefined) ?? null,
    bookingDate: (record.bookingDate as string | null | undefined) ?? null,
    checkIn: (record.checkIn as string | null | undefined) ?? null,
    checkOut: (record.checkOut as string | null | undefined) ?? null,
    nights: toNumber(record.nights),
    rooms: toNullableNumber(record.rooms),
    adult: toNullableNumber(record.adult),
    children: toNullableNumber(record.children),
    bookingSource: String(record.bookingSource ?? "—"),
    bookingRate: (record.bookingRate as string | null | undefined) ?? null,
    bookedBy: String(record.bookedBy ?? "—"),
    bookingStatus: String(record.bookingStatus ?? "—"),
    bookingStatusRaw:
      (record.bookingStatusRaw as string | null | undefined) ?? null,
    customerSellingPrice: money(record.customerSellingPrice),
    originalHotelBaseRate: money(record.originalHotelBaseRate),
    originalHotelGst: money(record.originalHotelGst),
    hotelBaseCost: hotelBaseRate,
    hotelBaseRate,
    hotelGst: money(record.hotelGst),
    serviceFee: money(record.serviceFee),
    serviceFeeGst: money(record.serviceFeeGst),
    promotionDiscount: money(record.promotionDiscount),
    couponDiscount: money(record.couponDiscount),
    hotelPayout: money(record.hotelPayout),
    otaRevenue: money(record.otaRevenue),
    otaRevenueGst: money(record.otaRevenueGst),
    otaRevenueInclusiveGst: money(record.otaRevenueInclusiveGst),
    commission: money(record.commission),
    commissionGst: money(record.commissionGst),
    commissionInclusiveGst: money(record.commissionInclusiveGst),
    markup: money(record.markup),
    tcs: money(record.tcs),
    tds: money(record.tds),
    agentCommission: money(record.agentCommission),
    agentTds: money(record.agentTds),
    agentNetCommission: money(record.agentNetCommission),
    agencyIncentive: normalizeAgencyIncentive(
      record.agencyIncentive,
      money(record.customerSellingPrice).currency,
    ),
    agentPaymentBreakup: normalizeAgentPaymentBreakup(
      record.agentPaymentBreakup,
      money(record.customerSellingPrice).currency,
    ),
    paymentStatus: String(record.paymentStatus ?? "—"),
    amountCollected: money(record.amountCollected),
    payment: normalizePayment(record.payment),
    cancellationDateTime:
      (record.cancellationDateTime as string | null | undefined) ?? null,
    cancelledBy: (record.cancelledBy as string | null | undefined) ?? null,
    cancellationReason:
      (record.cancellationReason as string | null | undefined) ?? null,
    cancellationPolicy:
      (record.cancellationPolicy as string | null | undefined) ?? null,
    cancellationPolicyLines: normalizePolicyLines(
      record.cancellationPolicyLines,
      record.cancellationPolicy,
    ),
    cancellationCharge: money(record.cancellationCharge),
    matchedBracket: normalizeMatchedBracket(record.matchedBracket),
    cancellationEvaluatedAt:
      (record.cancellationEvaluatedAt as string | null | undefined) ?? null,
    refundAmount: money(record.refundAmount),
    refundDateTime:
      (record.refundDateTime as string | null | undefined) ?? null,
    refundStatus: String(record.refundStatus ?? "NOT_APPLICABLE"),
    lastUpdated: (record.lastUpdated as string | null | undefined) ?? null,
    customerSellingPriceBreakup: normalizeCustomerBreakup(
      record.customerSellingPriceBreakup,
    ),
    hotelPayoutBreakup: normalizeHotelPayoutBreakup(record.hotelPayoutBreakup),
    otaRevenueBreakup: normalizeOtaRevenueBreakup(record.otaRevenueBreakup),
  };
}

function normalizeResponse(
  payload: Record<string, unknown>,
): HotelFinancialMisReportResponse {
  const summaryRaw =
    (payload.summary as Record<string, unknown> | undefined) ?? {};
  const dateRangeRaw =
    (payload.dateRange as Record<string, unknown> | undefined) ?? {};
  const pageRaw = (payload.page as Record<string, unknown> | undefined) ?? {};
  const bookingsRaw = payload.bookings;

  return {
    viewer: (payload.viewer as string | undefined) ?? null,
    dateRange: {
      preset: (dateRangeRaw.preset as string | undefined) ?? null,
      fromDate: (dateRangeRaw.fromDate as string | undefined) ?? null,
      toDate: (dateRangeRaw.toDate as string | undefined) ?? null,
    },
    dateAxis: (payload.dateAxis as string | undefined) ?? null,
    filtersApplied:
      (payload.filtersApplied as Record<string, unknown> | undefined) ?? {},
    summary: {
      totalBookings: toNumber(summaryRaw.totalBookings),
      grossBookingValue: money(summaryRaw.grossBookingValue),
      hotelPayout: money(summaryRaw.hotelPayout),
      otaRevenue: money(summaryRaw.otaRevenue),
      otaRevenueGst: money(summaryRaw.otaRevenueGst),
      otaRevenueInclusiveGst: money(summaryRaw.otaRevenueInclusiveGst),
      agencyCommission: money(summaryRaw.agencyCommission),
      cancellationAmount: money(summaryRaw.cancellationAmount),
      refundAmount: money(summaryRaw.refundAmount),
      outstandingHotelPayout: money(summaryRaw.outstandingHotelPayout),
      outstandingCustomerRefund: money(summaryRaw.outstandingCustomerRefund),
      currency: String(summaryRaw.currency || "INR"),
    },
    bookings: Array.isArray(bookingsRaw) ? bookingsRaw.map(normalizeRow) : [],
    page: {
      page: toNumber(pageRaw.page ?? pageRaw.number),
      size: toNumber(pageRaw.size, 20),
      totalPages: toNumber(pageRaw.totalPages),
      totalElements: toNumber(pageRaw.totalElements),
      sort: String(pageRaw.sort ?? "BOOKING_DATE"),
      direction: String(pageRaw.direction ?? "desc"),
    },
  };
}

function buildQuery(params: HotelFinancialMisReportParams): string {
  const search = new URLSearchParams();
  if (params.datePreset) search.set("datePreset", params.datePreset);
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  if (params.dateAxis) search.set("dateAxis", params.dateAxis);
  if (params.checkInFrom) search.set("checkInFrom", params.checkInFrom);
  if (params.checkInTo) search.set("checkInTo", params.checkInTo);
  if (params.checkOutFrom) search.set("checkOutFrom", params.checkOutFrom);
  if (params.checkOutTo) search.set("checkOutTo", params.checkOutTo);
  if (params.bookingStatus) search.set("bookingStatus", params.bookingStatus);
  if (params.bookingSource) search.set("bookingSource", params.bookingSource);
  if (params.paymentStatus) search.set("paymentStatus", params.paymentStatus);
  if (params.refundStatus) search.set("refundStatus", params.refundStatus);
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  if (params.page != null) search.set("page", String(params.page));
  if (params.size != null) search.set("size", String(params.size));
  params.hotelIds?.forEach((id) => {
    if (id.trim()) search.append("hotelIds", id.trim());
  });
  params.cityIds?.forEach((id) => search.append("cityIds", String(id)));
  params.stateIds?.forEach((id) => search.append("stateIds", String(id)));
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const hotelBookingFinancialMisService = {
  async getReport(
    params: HotelFinancialMisReportParams = {},
  ): Promise<HotelFinancialMisReportResponse> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(
      `${API_ENDPOINTS.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS}${buildQuery(params)}`,
    );
    const payload = unwrapPayload(response);
    return normalizeResponse((payload ?? {}) as Record<string, unknown>);
  },
};
