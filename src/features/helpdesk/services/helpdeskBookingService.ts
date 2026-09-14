import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";

export interface HelpdeskMoney {
  amount: number;
  currency: string;
}

export interface HelpdeskRatedMoney extends HelpdeskMoney {
  ratePercent?: number | null;
  rateType?: string | null;
  fixedAmount?: number | null;
  rateLabel?: string | null;
}

export type HelpdeskVoucherAudience = "HOTEL" | "CUSTOMER" | "AGENT";
export type HelpdeskVoucherDocumentType = "BOOKING" | "CANCELLATION";

export interface HelpdeskVoucherOption {
  key: string;
  label: string;
  audience: HelpdeskVoucherAudience;
  documentType: HelpdeskVoucherDocumentType;
}

export interface HelpdeskBookingSearchItem {
  bookingRef: string;
  bookingStatus: string;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  hotelName?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  bookingDate?: string | null;
  amountCollected?: HelpdeskMoney | null;
  paymentStatus?: string | null;
}

export interface HelpdeskBookingSearchResponse {
  bookings: HelpdeskBookingSearchItem[];
  total?: number;
}

export interface HelpdeskTimelineEvent {
  event: string;
  at: string;
}

export interface HelpdeskSupportSummary {
  productName: string;
  bookingStatus: string;
  paymentStatus: string;
  headline: string;
}

export interface HelpdeskCustomer {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface HelpdeskBookingOwner {
  type: string;
  name: string;
  email: string | null;
  code: string | null;
  agencyName?: string | null;
}

export interface HelpdeskAgency {
  type: string;
  agencyName: string | null;
  contactName: string | null;
  email: string | null;
}

export interface HelpdeskPaymentAttempt {
  status: string;
  paymentMethod: string;
  paymentTransactionId: string | null;
  paymentTime: string | null;
  amount: HelpdeskMoney;
}

export interface HelpdeskPaymentSummary {
  status: string;
  paymentMethod: string | null;
  paymentTransactionId: string | null;
  paymentTime: string | null;
  payments: HelpdeskPaymentAttempt[];
}

export interface HelpdeskBreakupLine {
  key: string;
  label: string;
  amount: HelpdeskMoney | HelpdeskRatedMoney;
  emphasis?: boolean;
}

export interface HelpdeskFinancialBreakup {
  formula?: string | null;
  lines: HelpdeskBreakupLine[];
}

export interface HelpdeskPackageHotel {
  hotelId: string | null;
  hotelName: string;
  email: string | null;
  phone: string | null;
  phoneList: string[];
}

export interface HelpdeskPaymentAttemptsCount {
  successful: number;
  failed: number;
}

export interface HelpdeskAgencyIncentive {
  agencyTier: string | null;
  incentivePercent: number | null;
  incentiveType: string | null;
  incentiveCategory: string | null;
  grossAmount: HelpdeskMoney;
  tds: HelpdeskMoney;
  netAmount: HelpdeskMoney;
}

export interface HelpdeskMarkupDetails {
  packageMarkup: HelpdeskRatedMoney | null;
  agentMarkup: HelpdeskRatedMoney | null;
}

export interface HelpdeskSupplierCostLine {
  componentType: string;
  supplierName: string;
  bookingRef: string | null;
  baseFare: HelpdeskMoney;
}

export interface HelpdeskSupplierCostBreakup {
  formula?: string | null;
  reconciled?: boolean | null;
  total: HelpdeskMoney;
  calculatedTotal: HelpdeskMoney;
  difference: HelpdeskMoney;
  lines: HelpdeskSupplierCostLine[];
}

export interface HelpdeskHotelSellingComponent {
  hotelBookingId: number | null;
  hotelName: string;
  bookingRate: string | null;
  baseRate: HelpdeskMoney;
  hotelGst: HelpdeskMoney;
  promotionDiscount: HelpdeskMoney;
  customerSellingPrice: HelpdeskMoney;
}

export interface HelpdeskHotelSellingPriceBreakup {
  formula?: string | null;
  components: HelpdeskHotelSellingComponent[];
  totalBaseRate: HelpdeskMoney;
  totalHotelGst: HelpdeskMoney;
  totalPromotionDiscount: HelpdeskMoney;
  totalHotelSellingPrice: HelpdeskMoney;
}

export interface HelpdeskCancellationBreakupLine {
  componentType: string;
  componentRefId: number | null;
  hotelBookingId: number | null;
  label: string;
  originalAmount: HelpdeskMoney;
  cancellationCharge: HelpdeskMoney;
  refundAmount: HelpdeskMoney;
  cancellationPolicy: string | null;
  cancellationPolicyLines: string[];
}

export interface HelpdeskCancellationBreakup {
  cancellationDateTime: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  refundDateTime: string | null;
  refundStatus: string | null;
  cancellationPolicy: string | null;
  cancellationPolicyLines: string[];
  lines: HelpdeskCancellationBreakupLine[];
  cancellationCharge: HelpdeskMoney;
  refundAmount: HelpdeskMoney;
}

export interface HelpdeskPaymentInstallment {
  installmentNo: number;
  dueDate: string | null;
  amount: HelpdeskMoney;
  paid: HelpdeskMoney;
  status: string;
}

export interface HelpdeskPaymentBreakup {
  formula?: string | null;
  reconciled?: boolean | null;
  grandTotal: HelpdeskMoney;
  collected: HelpdeskMoney;
  refunded: HelpdeskMoney;
  outstanding: HelpdeskMoney;
  paymentStatus: string | null;
  paymentAttempts: HelpdeskPaymentAttemptsCount | null;
  nextDueDate: string | null;
  paymentMethod: string | null;
  transactionCount: number | null;
  installments: HelpdeskPaymentInstallment[];
}

export interface HelpdeskComponentSummary {
  hotelTotal: number;
  hotelWithValue: number;
  hotelZeroValue: number;
  transportTotal: number;
  transportWithValue: number;
  transportZeroValue: number;
  activityTotal: number;
  activityWithValue: number;
  activityZeroValue: number;
}

export interface HelpdeskHotelComponent {
  hotelName: string;
  hotelBookingId: number | null;
  bookingRef: string | null;
  checkIn: string | null;
  checkOut: string | null;
  nights: number | null;
  rooms: number | null;
  bookingRate: string | null;
  baseRate: HelpdeskMoney;
  hotelGst: HelpdeskRatedMoney;
  customerSellingPrice: HelpdeskMoney;
  supplierPayout: HelpdeskMoney;
  supplierCost: HelpdeskMoney;
  commission: HelpdeskMoney;
  hasMonetaryValue: boolean;
}

export interface HelpdeskTransportComponent {
  transferBookingId: number | null;
  bookingRef: string | null;
  transferType: string | null;
  vehicleType: string | null;
  passengerCount: number | null;
  supplierName: string | null;
  pickupLocation: string | null;
  dropLocation: string | null;
  pickupDateTime: string | null;
  supplierCost: HelpdeskMoney;
  customerPrice: HelpdeskMoney;
  supplierPayout: HelpdeskMoney;
  hasMonetaryValue: boolean;
  legCount: number | null;
}

export interface HelpdeskActivityComponent {
  activityBookingId: number | null;
  bookingRef: string | null;
  activityName: string;
  supplierName: string | null;
  activityDate: string | null;
  supplierCost: HelpdeskMoney;
  customerPrice: HelpdeskMoney;
  supplierPayout: HelpdeskMoney;
  hasMonetaryValue: boolean;
}

export interface HelpdeskFinancialDetail {
  bookingId: number;
  bookingRef: string;
  hotelName: string;
  hotelCode: string | null;
  hotelCity: string | null;
  hotelState: string | null;
  hotelId: string | null;
  customerName: string;
  bookingDate: string | null;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  destination?: string | null;
  packageId?: number | null;
  packageCode?: string | null;
  packageName?: string | null;
  checkIn: string | null;
  checkOut: string | null;
  nights: number | null;
  adult: number | null;
  children: number | null;
  bookingSource: string | null;
  bookingRate: string | null;
  bookedBy: string | null;
  bookingStatus: string;
  bookingStatusRaw?: string | null;
  customerSellingPrice: HelpdeskMoney;
  agentCustomerSellingPrice?: HelpdeskMoney | null;
  hotelPayout: HelpdeskMoney;
  transportPayout?: HelpdeskMoney | null;
  activityPayout?: HelpdeskMoney | null;
  packageSupplierCost?: HelpdeskMoney | null;
  hotelCost?: HelpdeskMoney | null;
  transportCost?: HelpdeskMoney | null;
  activityCost?: HelpdeskMoney | null;
  otaRevenue: HelpdeskMoney;
  amountCollected: HelpdeskMoney;
  outstandingAmount?: HelpdeskMoney | null;
  totalSupplierPayout?: HelpdeskMoney | null;
  grossProfit?: HelpdeskMoney | null;
  profitAfterSupplierPayout?: HelpdeskMoney | null;
  commission?: HelpdeskMoney | null;
  commissionGst?: HelpdeskRatedMoney | null;
  markup?: HelpdeskMoney | null;
  serviceFee?: HelpdeskMoney | null;
  taxes?: HelpdeskRatedMoney | null;
  promotionDiscount: HelpdeskMoney;
  paymentStatus: string;
  paymentAttempts?: HelpdeskPaymentAttemptsCount | null;
  payment: HelpdeskPaymentSummary;
  cancellationDateTime: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  cancellationPolicy: string | null;
  cancellationPolicyLines: string[];
  cancellationCharge: HelpdeskMoney;
  refundAmount: HelpdeskMoney;
  refundDateTime: string | null;
  refundStatus: string | null;
  lastUpdated: string | null;
  bookingOwner: HelpdeskBookingOwner | null;
  agencyIncentive?: HelpdeskAgencyIncentive | null;
  markupDetails?: HelpdeskMarkupDetails | null;
  customerSellingPriceBreakup: HelpdeskFinancialBreakup;
  hotelPayoutBreakup: HelpdeskFinancialBreakup;
  otaRevenueBreakup: HelpdeskFinancialBreakup;
  hotelSellingPriceBreakup?: HelpdeskHotelSellingPriceBreakup | null;
  supplierCostBreakup?: HelpdeskSupplierCostBreakup | null;
  grossProfitReconciliation?: HelpdeskFinancialBreakup | null;
  cancellationBreakup?: HelpdeskCancellationBreakup | null;
  paymentBreakup?: HelpdeskPaymentBreakup | null;
  componentSummary?: HelpdeskComponentSummary | null;
  hotelComponents?: HelpdeskHotelComponent[];
  transportComponents?: HelpdeskTransportComponent[];
  activityComponents?: HelpdeskActivityComponent[];
}

export interface HelpdeskBookingDetail {
  type: string;
  bookingId: number;
  bookingRef: string;
  support: HelpdeskSupportSummary;
  customer: HelpdeskCustomer;
  agency?: HelpdeskAgency | null;
  hotels?: HelpdeskPackageHotel[];
  timeline: HelpdeskTimelineEvent[];
  financial: HelpdeskFinancialDetail;
}

export interface HelpdeskBookingSearchParams {
  email?: string;
  phone?: string;
  limit?: number;
}

function toNumber(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function unwrapPayload<T>(response: ApiSuccessResponse<T> | T): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as ApiSuccessResponse<T>).data;
  }
  return response as T;
}

function money(raw: unknown, fallbackCurrency = "INR"): HelpdeskMoney {
  if (raw == null) return { amount: 0, currency: fallbackCurrency };
  if (typeof raw === "number") {
    return { amount: raw, currency: fallbackCurrency };
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return {
      amount: toNumber(obj.amount),
      currency: String(obj.currency || fallbackCurrency),
    };
  }
  return { amount: 0, currency: fallbackCurrency };
}

function ratedMoney(raw: unknown): HelpdeskRatedMoney {
  const base = money(raw);
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  return {
    ...base,
    ratePercent:
      obj.ratePercent != null ? toNumber(obj.ratePercent) : null,
    rateType: (obj.rateType as string | undefined) ?? null,
    fixedAmount:
      obj.fixedAmount != null ? toNumber(obj.fixedAmount) : null,
    rateLabel: (obj.rateLabel as string | undefined) ?? null,
  };
}

function normalizeTimeline(raw: unknown): HelpdeskTimelineEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = (item && typeof item === "object" ? item : {}) as Record<
      string,
      unknown
    >;
    return {
      event: String(obj.event || obj.eventType || obj.type || ""),
      at: String(obj.at || obj.occurredAt || obj.timestamp || ""),
    };
  });
}

function normalizeBreakup(
  raw: Record<string, unknown> | null | undefined,
  emphasisKeys: string[] = [],
): HelpdeskFinancialBreakup {
  if (!raw) return { lines: [], formula: null };
  const formula = (raw.formula as string | undefined) ?? null;
  const lines: HelpdeskBreakupLine[] = [];

  for (const [key, value] of Object.entries(raw)) {
    if (key === "formula" || value == null || typeof value !== "object") {
      continue;
    }
    const candidate = value as Record<string, unknown>;
    if (
      !("amount" in candidate) ||
      (typeof candidate.amount !== "number" && typeof candidate.amount !== "string")
    ) {
      continue;
    }
    const rated = ratedMoney(value);
    lines.push({
      key,
      label: rated.rateLabel || formatBreakupKey(key),
      amount: rated,
      emphasis: emphasisKeys.includes(key),
    });
  }

  return { formula, lines };
}

function formatBreakupKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function normalizePayment(raw: Record<string, unknown>): HelpdeskPaymentSummary {
  const paymentsRaw = Array.isArray(raw.payments) ? raw.payments : [];
  return {
    status: String(raw.status || ""),
    paymentMethod: (raw.paymentMethod as string | undefined) ?? null,
    paymentTransactionId:
      (raw.paymentTransactionId as string | undefined) ?? null,
    paymentTime: (raw.paymentTime as string | undefined) ?? null,
    payments: paymentsRaw.map((item) => {
      const obj = (item || {}) as Record<string, unknown>;
      return {
        status: String(obj.status || ""),
        paymentMethod: String(obj.paymentMethod || ""),
        paymentTransactionId:
          (obj.paymentTransactionId as string | undefined) ?? null,
        paymentTime: (obj.paymentTime as string | undefined) ?? null,
        amount: money(obj.amount),
      };
    }),
  };
}

function normalizePaymentAttemptsCount(
  raw: unknown,
): HelpdeskPaymentAttemptsCount | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return {
    successful: toNumber(obj.successful),
    failed: toNumber(obj.failed),
  };
}

function normalizePackageHotels(raw: unknown): HelpdeskPackageHotel[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = (item || {}) as Record<string, unknown>;
    const phoneList = Array.isArray(obj.phoneList)
      ? obj.phoneList.map(String).filter(Boolean)
      : [];
    return {
      hotelId: (obj.hotelId as string | undefined) ?? null,
      hotelName: String(obj.hotelName || "—"),
      email: (obj.email as string | undefined) ?? null,
      phone: (obj.phone as string | undefined) ?? null,
      phoneList,
    };
  });
}

function normalizeAgencyIncentive(
  raw: unknown,
): HelpdeskAgencyIncentive | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return {
    agencyTier: (obj.agencyTier as string | undefined) ?? null,
    incentivePercent:
      obj.incentivePercent != null ? toNumber(obj.incentivePercent) : null,
    incentiveType: (obj.incentiveType as string | undefined) ?? null,
    incentiveCategory: (obj.incentiveCategory as string | undefined) ?? null,
    grossAmount: money(obj.grossAmount),
    tds: money(obj.tds),
    netAmount: money(obj.netAmount),
  };
}

function normalizeMarkupDetails(raw: unknown): HelpdeskMarkupDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return {
    packageMarkup:
      obj.packageMarkup != null ? ratedMoney(obj.packageMarkup) : null,
    agentMarkup: obj.agentMarkup != null ? ratedMoney(obj.agentMarkup) : null,
  };
}

function normalizeSupplierCostBreakup(
  raw: unknown,
): HelpdeskSupplierCostBreakup | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const linesRaw = Array.isArray(obj.lines) ? obj.lines : [];
  return {
    formula: (obj.formula as string | undefined) ?? null,
    reconciled: typeof obj.reconciled === "boolean" ? obj.reconciled : null,
    total: money(obj.total),
    calculatedTotal: money(obj.calculatedTotal),
    difference: money(obj.difference),
    lines: linesRaw.map((item) => {
      const line = (item || {}) as Record<string, unknown>;
      return {
        componentType: String(line.componentType || ""),
        supplierName: String(line.supplierName || "—"),
        bookingRef: (line.bookingRef as string | undefined) ?? null,
        baseFare: money(line.baseFare),
      };
    }),
  };
}

function normalizeHotelSellingPriceBreakup(
  raw: unknown,
): HelpdeskHotelSellingPriceBreakup | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const componentsRaw = Array.isArray(obj.components) ? obj.components : [];
  return {
    formula: (obj.formula as string | undefined) ?? null,
    components: componentsRaw.map((item) => {
      const row = (item || {}) as Record<string, unknown>;
      return {
        hotelBookingId:
          row.hotelBookingId != null ? toNumber(row.hotelBookingId) : null,
        hotelName: String(row.hotelName || "—"),
        bookingRate: (row.bookingRate as string | undefined) ?? null,
        baseRate: money(row.baseRate),
        hotelGst: money(row.hotelGst),
        promotionDiscount: money(row.promotionDiscount),
        customerSellingPrice: money(row.customerSellingPrice),
      };
    }),
    totalBaseRate: money(obj.totalBaseRate),
    totalHotelGst: money(obj.totalHotelGst),
    totalPromotionDiscount: money(obj.totalPromotionDiscount),
    totalHotelSellingPrice: money(obj.totalHotelSellingPrice),
  };
}

function normalizeCancellationBreakup(
  raw: unknown,
): HelpdeskCancellationBreakup | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const linesRaw = Array.isArray(obj.lines) ? obj.lines : [];
  return {
    cancellationDateTime:
      (obj.cancellationDateTime as string | undefined) ?? null,
    cancelledBy: (obj.cancelledBy as string | undefined) ?? null,
    cancellationReason: (obj.cancellationReason as string | undefined) ?? null,
    refundDateTime: (obj.refundDateTime as string | undefined) ?? null,
    refundStatus: (obj.refundStatus as string | undefined) ?? null,
    cancellationPolicy: (obj.cancellationPolicy as string | undefined) ?? null,
    cancellationPolicyLines: Array.isArray(obj.cancellationPolicyLines)
      ? obj.cancellationPolicyLines.map(String)
      : [],
    lines: linesRaw.map((item) => {
      const line = (item || {}) as Record<string, unknown>;
      return {
        componentType: String(line.componentType || ""),
        componentRefId:
          line.componentRefId != null ? toNumber(line.componentRefId) : null,
        hotelBookingId:
          line.hotelBookingId != null ? toNumber(line.hotelBookingId) : null,
        label: String(line.label || "—"),
        originalAmount: money(line.originalAmount),
        cancellationCharge: money(line.cancellationCharge),
        refundAmount: money(line.refundAmount),
        cancellationPolicy:
          (line.cancellationPolicy as string | undefined) ?? null,
        cancellationPolicyLines: Array.isArray(line.cancellationPolicyLines)
          ? line.cancellationPolicyLines.map(String)
          : [],
      };
    }),
    cancellationCharge: money(obj.cancellationCharge),
    refundAmount: money(obj.refundAmount),
  };
}

function normalizePaymentBreakup(raw: unknown): HelpdeskPaymentBreakup | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const installmentsRaw = Array.isArray(obj.installments) ? obj.installments : [];
  return {
    formula: (obj.formula as string | undefined) ?? null,
    reconciled: typeof obj.reconciled === "boolean" ? obj.reconciled : null,
    grandTotal: money(obj.grandTotal),
    collected: money(obj.collected),
    refunded: money(obj.refunded),
    outstanding: money(obj.outstanding),
    paymentStatus: (obj.paymentStatus as string | undefined) ?? null,
    paymentAttempts: normalizePaymentAttemptsCount(obj.paymentAttempts),
    nextDueDate: (obj.nextDueDate as string | undefined) ?? null,
    paymentMethod: (obj.paymentMethod as string | undefined) ?? null,
    transactionCount:
      obj.transactionCount != null ? toNumber(obj.transactionCount) : null,
    installments: installmentsRaw.map((item) => {
      const row = (item || {}) as Record<string, unknown>;
      return {
        installmentNo: toNumber(row.installmentNo, 0),
        dueDate: (row.dueDate as string | undefined) ?? null,
        amount: money(row.amount),
        paid: money(row.paid),
        status: String(row.status || ""),
      };
    }),
  };
}

function normalizeComponentSummary(
  raw: unknown,
): HelpdeskComponentSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return {
    hotelTotal: toNumber(obj.hotelTotal),
    hotelWithValue: toNumber(obj.hotelWithValue),
    hotelZeroValue: toNumber(obj.hotelZeroValue),
    transportTotal: toNumber(obj.transportTotal),
    transportWithValue: toNumber(obj.transportWithValue),
    transportZeroValue: toNumber(obj.transportZeroValue),
    activityTotal: toNumber(obj.activityTotal),
    activityWithValue: toNumber(obj.activityWithValue),
    activityZeroValue: toNumber(obj.activityZeroValue),
  };
}

function normalizeHotelComponents(raw: unknown): HelpdeskHotelComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = (item || {}) as Record<string, unknown>;
    return {
      hotelName: String(obj.hotelName || "—"),
      hotelBookingId:
        obj.hotelBookingId != null ? toNumber(obj.hotelBookingId) : null,
      bookingRef: (obj.bookingRef as string | undefined) ?? null,
      checkIn: (obj.checkIn as string | undefined) ?? null,
      checkOut: (obj.checkOut as string | undefined) ?? null,
      nights: obj.nights != null ? toNumber(obj.nights) : null,
      rooms: obj.rooms != null ? toNumber(obj.rooms) : null,
      bookingRate: (obj.bookingRate as string | undefined) ?? null,
      baseRate: money(obj.baseRate),
      hotelGst: ratedMoney(obj.hotelGst),
      customerSellingPrice: money(obj.customerSellingPrice),
      supplierPayout: money(obj.supplierPayout),
      supplierCost: money(obj.supplierCost),
      commission: money(obj.commission),
      hasMonetaryValue: Boolean(obj.hasMonetaryValue),
    };
  });
}

function normalizeTransportComponents(
  raw: unknown,
): HelpdeskTransportComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = (item || {}) as Record<string, unknown>;
    return {
      transferBookingId:
        obj.transferBookingId != null ? toNumber(obj.transferBookingId) : null,
      bookingRef: (obj.bookingRef as string | undefined) ?? null,
      transferType: (obj.transferType as string | undefined) ?? null,
      vehicleType: (obj.vehicleType as string | undefined) ?? null,
      passengerCount:
        obj.passengerCount != null ? toNumber(obj.passengerCount) : null,
      supplierName: (obj.supplierName as string | undefined) ?? null,
      pickupLocation: (obj.pickupLocation as string | undefined) ?? null,
      dropLocation: (obj.dropLocation as string | undefined) ?? null,
      pickupDateTime: (obj.pickupDateTime as string | undefined) ?? null,
      supplierCost: money(obj.supplierCost),
      customerPrice: money(obj.customerPrice),
      supplierPayout: money(obj.supplierPayout),
      hasMonetaryValue: Boolean(obj.hasMonetaryValue),
      legCount: obj.legCount != null ? toNumber(obj.legCount) : null,
    };
  });
}

function normalizeActivityComponents(
  raw: unknown,
): HelpdeskActivityComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = (item || {}) as Record<string, unknown>;
    return {
      activityBookingId:
        obj.activityBookingId != null ? toNumber(obj.activityBookingId) : null,
      bookingRef: (obj.bookingRef as string | undefined) ?? null,
      activityName: String(obj.activityName || "—"),
      supplierName: (obj.supplierName as string | undefined) ?? null,
      activityDate: (obj.activityDate as string | undefined) ?? null,
      supplierCost: money(obj.supplierCost),
      customerPrice: money(obj.customerPrice),
      supplierPayout: money(obj.supplierPayout),
      hasMonetaryValue: Boolean(obj.hasMonetaryValue),
    };
  });
}

function normalizeFinancial(raw: Record<string, unknown>): HelpdeskFinancialDetail {
  const paymentRaw = (raw.payment || {}) as Record<string, unknown>;
  const ownerRaw = (raw.bookingOwner || null) as Record<string, unknown> | null;

  return {
    bookingId: toNumber(raw.bookingId),
    bookingRef: String(raw.bookingRef || ""),
    hotelName: String(raw.hotelName || raw.packageName || ""),
    hotelCode: (raw.hotelCode as string | undefined) ?? null,
    hotelCity: (raw.hotelCity as string | undefined) ?? null,
    hotelState: (raw.hotelState as string | undefined) ?? null,
    hotelId: (raw.hotelId as string | undefined) ?? null,
    customerName: String(raw.customerName || ""),
    bookingDate: (raw.bookingDate as string | undefined) ?? null,
    travelStartDate: (raw.travelStartDate as string | undefined) ?? null,
    travelEndDate: (raw.travelEndDate as string | undefined) ?? null,
    destination: (raw.destination as string | undefined) ?? null,
    packageId: raw.packageId != null ? toNumber(raw.packageId) : null,
    packageCode: (raw.packageCode as string | undefined) ?? null,
    packageName: (raw.packageName as string | undefined) ?? null,
    checkIn:
      (raw.checkIn as string | undefined) ??
      (raw.travelStartDate as string | undefined) ??
      null,
    checkOut:
      (raw.checkOut as string | undefined) ??
      (raw.travelEndDate as string | undefined) ??
      null,
    nights: raw.nights != null ? toNumber(raw.nights) : null,
    adult: raw.adult != null ? toNumber(raw.adult) : null,
    children: raw.children != null ? toNumber(raw.children) : null,
    bookingSource: (raw.bookingSource as string | undefined) ?? null,
    bookingRate: (raw.bookingRate as string | undefined) ?? null,
    bookedBy: (raw.bookedBy as string | undefined) ?? null,
    bookingStatus: String(raw.bookingStatus || raw.bookingStatusRaw || ""),
    bookingStatusRaw: (raw.bookingStatusRaw as string | undefined) ?? null,
    customerSellingPrice: money(raw.customerSellingPrice),
    agentCustomerSellingPrice:
      raw.agentCustomerSellingPrice != null
        ? money(raw.agentCustomerSellingPrice)
        : null,
    hotelPayout: money(raw.hotelPayout),
    transportPayout:
      raw.transportPayout != null ? money(raw.transportPayout) : null,
    activityPayout:
      raw.activityPayout != null ? money(raw.activityPayout) : null,
    packageSupplierCost:
      raw.packageSupplierCost != null ? money(raw.packageSupplierCost) : null,
    hotelCost: raw.hotelCost != null ? money(raw.hotelCost) : null,
    transportCost: raw.transportCost != null ? money(raw.transportCost) : null,
    activityCost: raw.activityCost != null ? money(raw.activityCost) : null,
    otaRevenue: money(raw.otaRevenue),
    amountCollected: money(raw.amountCollected),
    outstandingAmount:
      raw.outstandingAmount != null ? money(raw.outstandingAmount) : null,
    totalSupplierPayout:
      raw.totalSupplierPayout != null ? money(raw.totalSupplierPayout) : null,
    grossProfit: raw.grossProfit != null ? money(raw.grossProfit) : null,
    profitAfterSupplierPayout:
      raw.profitAfterSupplierPayout != null
        ? money(raw.profitAfterSupplierPayout)
        : null,
    commission: raw.commission != null ? money(raw.commission) : null,
    commissionGst:
      raw.commissionGst != null ? ratedMoney(raw.commissionGst) : null,
    markup: raw.markup != null ? money(raw.markup) : null,
    serviceFee: raw.serviceFee != null ? money(raw.serviceFee) : null,
    taxes: raw.taxes != null ? ratedMoney(raw.taxes) : null,
    promotionDiscount: money(raw.promotionDiscount),
    paymentStatus: String(raw.paymentStatus || ""),
    paymentAttempts: normalizePaymentAttemptsCount(raw.paymentAttempts),
    payment: normalizePayment(paymentRaw),
    cancellationDateTime:
      (raw.cancellationDateTime as string | undefined) ?? null,
    cancelledBy: (raw.cancelledBy as string | undefined) ?? null,
    cancellationReason: (raw.cancellationReason as string | undefined) ?? null,
    cancellationPolicy: (raw.cancellationPolicy as string | undefined) ?? null,
    cancellationPolicyLines: Array.isArray(raw.cancellationPolicyLines)
      ? raw.cancellationPolicyLines.map(String)
      : [],
    cancellationCharge: money(raw.cancellationCharge),
    refundAmount: money(raw.refundAmount),
    refundDateTime: (raw.refundDateTime as string | undefined) ?? null,
    refundStatus: (raw.refundStatus as string | undefined) ?? null,
    lastUpdated: (raw.lastUpdated as string | undefined) ?? null,
    bookingOwner: ownerRaw
      ? {
          type: String(ownerRaw.type || ""),
          name: String(ownerRaw.name || ""),
          email: (ownerRaw.email as string | undefined) ?? null,
          code: (ownerRaw.code as string | undefined) ?? null,
          agencyName: (ownerRaw.agencyName as string | undefined) ?? null,
        }
      : null,
    agencyIncentive: normalizeAgencyIncentive(raw.agencyIncentive),
    markupDetails: normalizeMarkupDetails(raw.markupDetails),
    customerSellingPriceBreakup: normalizeBreakup(
      raw.customerSellingPriceBreakup as Record<string, unknown> | undefined,
      ["finalCustomerPayable", "finalCustomerPrice"],
    ),
    hotelPayoutBreakup: normalizeBreakup(
      raw.hotelPayoutBreakup as Record<string, unknown> | undefined,
      ["finalHotelPayout"],
    ),
    otaRevenueBreakup: normalizeBreakup(
      raw.otaRevenueBreakup as Record<string, unknown> | undefined,
      ["netOtaRevenueInclusiveGst", "netOtaRevenue"],
    ),
    hotelSellingPriceBreakup: normalizeHotelSellingPriceBreakup(
      raw.hotelSellingPriceBreakup,
    ),
    supplierCostBreakup: normalizeSupplierCostBreakup(raw.supplierCostBreakup),
    grossProfitReconciliation: normalizeBreakup(
      raw.grossProfitReconciliation as Record<string, unknown> | undefined,
      ["grossProfit", "profitAfterSupplierPayout"],
    ),
    cancellationBreakup: normalizeCancellationBreakup(raw.cancellationBreakup),
    paymentBreakup: normalizePaymentBreakup(raw.paymentBreakup),
    componentSummary: normalizeComponentSummary(raw.componentSummary),
    hotelComponents: normalizeHotelComponents(raw.hotelComponents),
    transportComponents: normalizeTransportComponents(raw.transportComponents),
    activityComponents: normalizeActivityComponents(raw.activityComponents),
  };
}

function normalizeDetail(raw: Record<string, unknown>): HelpdeskBookingDetail {
  const supportRaw = (raw.support || {}) as Record<string, unknown>;
  const customerRaw = (raw.customer || {}) as Record<string, unknown>;
  const agencyRaw = (raw.agency || null) as Record<string, unknown> | null;
  const financialRaw = (raw.financial || raw) as Record<string, unknown>;

  return {
    type: String(raw.type || "HOTEL"),
    bookingId: toNumber(raw.bookingId ?? financialRaw.bookingId),
    bookingRef: String(
      raw.bookingRef || financialRaw.bookingRef || raw.bookingReference || "",
    ),
    support: {
      productName: String(
        supportRaw.productName ||
          financialRaw.packageName ||
          financialRaw.hotelName ||
          "",
      ),
      bookingStatus: String(
        supportRaw.bookingStatus || financialRaw.bookingStatus || "",
      ),
      paymentStatus: String(
        supportRaw.paymentStatus || financialRaw.paymentStatus || "",
      ),
      headline: String(supportRaw.headline || ""),
    },
    customer: {
      name: String(customerRaw.name || financialRaw.customerName || "—"),
      email: (customerRaw.email as string | undefined) ?? null,
      phone: (customerRaw.phone as string | undefined) ?? null,
    },
    agency: agencyRaw
      ? {
          type: String(agencyRaw.type || ""),
          agencyName: (agencyRaw.agencyName as string | undefined) ?? null,
          contactName: (agencyRaw.contactName as string | undefined) ?? null,
          email: (agencyRaw.email as string | undefined) ?? null,
        }
      : null,
    hotels: normalizePackageHotels(raw.hotels),
    timeline: normalizeTimeline(raw.timeline),
    financial: normalizeFinancial(financialRaw),
  };
}

function normalizeSearchItem(raw: Record<string, unknown>): HelpdeskBookingSearchItem {
  const support = (raw.support || {}) as Record<string, unknown>;
  const customer = (raw.customer || {}) as Record<string, unknown>;
  const financial = (raw.financial || {}) as Record<string, unknown>;

  const bookingRef = String(
    raw.bookingRef ||
      raw.bookingReference ||
      financial.bookingRef ||
      raw.bookingId ||
      financial.bookingId ||
      "",
  );

  const bookingStatus = String(
    support.bookingStatus ||
      raw.bookingStatus ||
      financial.bookingStatus ||
      raw.status ||
      "",
  );

  const paymentStatusRaw =
    support.paymentStatus || raw.paymentStatus || financial.paymentStatus;
  const paymentStatus =
    paymentStatusRaw != null && paymentStatusRaw !== ""
      ? String(paymentStatusRaw)
      : null;

  const guestName =
    (customer.name as string | undefined) ??
    (raw.guestName as string | undefined) ??
    (raw.customerName as string | undefined) ??
    (financial.customerName as string | undefined) ??
    null;

  const guestEmail =
    (customer.email as string | undefined) ??
    (raw.guestEmail as string | undefined) ??
    (raw.email as string | undefined) ??
    null;

  const guestPhone =
    (customer.phone as string | undefined) ??
    (raw.guestPhone as string | undefined) ??
    (raw.phone as string | undefined) ??
    null;

  const hotelName =
    (support.productName as string | undefined) ??
    (raw.hotelName as string | undefined) ??
    (financial.hotelName as string | undefined) ??
    null;

  const checkIn =
    (raw.checkIn as string | undefined) ??
    (raw.checkInDate as string | undefined) ??
    (financial.checkIn as string | undefined) ??
    null;

  const checkOut =
    (raw.checkOut as string | undefined) ??
    (raw.checkOutDate as string | undefined) ??
    (financial.checkOut as string | undefined) ??
    null;

  const amountSource =
    raw.amountCollected ??
    financial.amountCollected ??
    raw.customerSellingPrice ??
    financial.customerSellingPrice;

  return {
    bookingRef,
    bookingStatus,
    guestName,
    guestEmail,
    guestPhone,
    hotelName,
    checkIn,
    checkOut,
    bookingDate:
      (raw.bookingDate as string | undefined) ??
      (financial.bookingDate as string | undefined) ??
      null,
    amountCollected: amountSource ? money(amountSource) : null,
    paymentStatus,
  };
}

function normalizeSearchResponse(
  payload: Record<string, unknown> | unknown[],
): HelpdeskBookingSearchResponse {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const bookingsRaw =
    root.bookings ??
    root.content ??
    root.items ??
    root.results ??
    (Array.isArray(payload) ? payload : []);

  const bookings = Array.isArray(bookingsRaw)
    ? bookingsRaw
        .map((item) =>
          normalizeSearchItem((item || {}) as Record<string, unknown>),
        )
        .filter((item) => item.bookingRef.trim().length > 0)
    : [];

  return {
    bookings,
    total: toNumber(root.total ?? root.totalElements, bookings.length),
  };
}

function buildSearchQuery(params: HelpdeskBookingSearchParams): string {
  const search = new URLSearchParams();
  if (params.email?.trim()) search.set("email", params.email.trim());
  if (params.phone?.trim()) search.set("phone", params.phone.trim());
  if (params.limit != null) search.set("limit", String(params.limit));
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getHelpdeskVoucherOptions(
  detail: HelpdeskBookingDetail,
): HelpdeskVoucherOption[] {
  const status = detail.support.bookingStatus.toUpperCase();
  const isCancelled = status.includes("CANCEL");
  const isAgentBooking =
    detail.financial.bookingRate?.toUpperCase() === "B2B" ||
    ["AGENT", "DISTRIBUTOR"].includes(
      detail.financial.bookingOwner?.type?.toUpperCase() || "",
    );

  const options: HelpdeskVoucherOption[] = [
    {
      key: "hotel-booking",
      label: "Hotel voucher",
      audience: "HOTEL",
      documentType: "BOOKING",
    },
    {
      key: "customer-booking",
      label: "Customer voucher",
      audience: "CUSTOMER",
      documentType: "BOOKING",
    },
  ];

  if (isAgentBooking) {
    options.push({
      key: "agent-booking",
      label: "Agent voucher",
      audience: "AGENT",
      documentType: "BOOKING",
    });
  }

  if (isCancelled) {
    options.push(
      {
        key: "hotel-cancellation",
        label: "Hotel cancellation",
        audience: "HOTEL",
        documentType: "CANCELLATION",
      },
      {
        key: "customer-cancellation",
        label: "Customer cancellation",
        audience: "CUSTOMER",
        documentType: "CANCELLATION",
      },
    );
    if (isAgentBooking) {
      options.push({
        key: "agent-cancellation",
        label: "Agent cancellation",
        audience: "AGENT",
        documentType: "CANCELLATION",
      });
    }
  }

  return options;
}

export const helpdeskBookingService = {
  async searchBookings(
    params: HelpdeskBookingSearchParams,
  ): Promise<HelpdeskBookingSearchResponse> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(`${API_ENDPOINTS.HELPDESK.BOOKINGS}${buildSearchQuery(params)}`);
    const payload = unwrapPayload(response);
    return normalizeSearchResponse(
      (payload ?? {}) as Record<string, unknown> | unknown[],
    );
  },

  async getBookingByReference(
    bookingReference: string,
  ): Promise<HelpdeskBookingDetail> {
    const response = await apiClient.get<
      ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
    >(API_ENDPOINTS.HELPDESK.BOOKING_BY_ID(bookingReference.trim()));
    const payload = unwrapPayload(response);
    return normalizeDetail((payload ?? {}) as Record<string, unknown>);
  },

  async getVoucher(
    bookingReference: string,
    audience: HelpdeskVoucherAudience,
    documentType: HelpdeskVoucherDocumentType,
  ): Promise<Blob> {
    const url = API_ENDPOINTS.HELPDESK.BOOKING_VOUCHER(
      bookingReference.trim(),
      audience,
      documentType,
    );
    return apiClient.get<Blob>(url, {
      responseType: "blob",
      headers: { Accept: "application/pdf" },
    });
  },
};
