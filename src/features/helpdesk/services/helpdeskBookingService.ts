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
  checkIn: string | null;
  checkOut: string | null;
  nights: number | null;
  adult: number | null;
  children: number | null;
  bookingSource: string | null;
  bookingRate: string | null;
  bookedBy: string | null;
  bookingStatus: string;
  customerSellingPrice: HelpdeskMoney;
  hotelPayout: HelpdeskMoney;
  otaRevenue: HelpdeskMoney;
  amountCollected: HelpdeskMoney;
  promotionDiscount: HelpdeskMoney;
  paymentStatus: string;
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
  customerSellingPriceBreakup: HelpdeskFinancialBreakup;
  hotelPayoutBreakup: HelpdeskFinancialBreakup;
  otaRevenueBreakup: HelpdeskFinancialBreakup;
}

export interface HelpdeskBookingDetail {
  type: string;
  bookingId: number;
  bookingRef: string;
  support: HelpdeskSupportSummary;
  customer: HelpdeskCustomer;
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

function normalizeFinancial(raw: Record<string, unknown>): HelpdeskFinancialDetail {
  const paymentRaw = (raw.payment || {}) as Record<string, unknown>;
  const ownerRaw = (raw.bookingOwner || null) as Record<string, unknown> | null;

  return {
    bookingId: toNumber(raw.bookingId),
    bookingRef: String(raw.bookingRef || ""),
    hotelName: String(raw.hotelName || ""),
    hotelCode: (raw.hotelCode as string | undefined) ?? null,
    hotelCity: (raw.hotelCity as string | undefined) ?? null,
    hotelState: (raw.hotelState as string | undefined) ?? null,
    hotelId: (raw.hotelId as string | undefined) ?? null,
    customerName: String(raw.customerName || ""),
    bookingDate: (raw.bookingDate as string | undefined) ?? null,
    checkIn: (raw.checkIn as string | undefined) ?? null,
    checkOut: (raw.checkOut as string | undefined) ?? null,
    nights: raw.nights != null ? toNumber(raw.nights) : null,
    adult: raw.adult != null ? toNumber(raw.adult) : null,
    children: raw.children != null ? toNumber(raw.children) : null,
    bookingSource: (raw.bookingSource as string | undefined) ?? null,
    bookingRate: (raw.bookingRate as string | undefined) ?? null,
    bookedBy: (raw.bookedBy as string | undefined) ?? null,
    bookingStatus: String(raw.bookingStatus || raw.bookingStatusRaw || ""),
    customerSellingPrice: money(raw.customerSellingPrice),
    hotelPayout: money(raw.hotelPayout),
    otaRevenue: money(raw.otaRevenue),
    amountCollected: money(raw.amountCollected),
    promotionDiscount: money(raw.promotionDiscount),
    paymentStatus: String(raw.paymentStatus || ""),
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
        }
      : null,
    customerSellingPriceBreakup: normalizeBreakup(
      raw.customerSellingPriceBreakup as Record<string, unknown> | undefined,
      ["finalCustomerPrice"],
    ),
    hotelPayoutBreakup: normalizeBreakup(
      raw.hotelPayoutBreakup as Record<string, unknown> | undefined,
      ["finalHotelPayout"],
    ),
    otaRevenueBreakup: normalizeBreakup(
      raw.otaRevenueBreakup as Record<string, unknown> | undefined,
      ["netOtaRevenueInclusiveGst"],
    ),
  };
}

function normalizeDetail(raw: Record<string, unknown>): HelpdeskBookingDetail {
  const supportRaw = (raw.support || {}) as Record<string, unknown>;
  const customerRaw = (raw.customer || {}) as Record<string, unknown>;
  const financialRaw = (raw.financial || raw) as Record<string, unknown>;

  return {
    type: String(raw.type || "HOTEL"),
    bookingId: toNumber(raw.bookingId ?? financialRaw.bookingId),
    bookingRef: String(
      raw.bookingRef || financialRaw.bookingRef || raw.bookingReference || "",
    ),
    support: {
      productName: String(supportRaw.productName || financialRaw.hotelName || ""),
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
