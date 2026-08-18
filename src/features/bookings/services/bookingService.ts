import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";
import {
  runReportExportJob,
  type ExportJobStatus,
  type ReportExportFormat,
} from "@/features/reports/services/reportExportService";

/** Single booking item from /reports/booking-list API */
export interface BookingListItem {
  id: number;
  bookingId: string;
  guestName: string;
  numberOfGuests: number;
  bookingDate?: string;
  checkInDate: string;
  checkOutDate: string;
  roomDisplay: string;
  mealPlan: string;
  guestContact: string;
  netAmount: number;
  bookingSource: string;
  bookingMode?: string | null;
  status: string;
}

/** Room type line in booking detail */
export interface BookingDetailRoomType {
  quantity: number;
  roomName: string;
  occupancyDisplay: string;
  mealPlan: string;
}

/** Applied promotion line in rate breakup / financials */
export interface AppliedPromotion {
  promotionName: string;
  promotionType: string;
  discountPercentage: number;
  percentLabel: string;
  offerType: string;
  discountAmount: number;
  displayLine: string;
  id?: number;
  bookingFinancialId?: number;
  promotionRuleId?: string;
  priority?: number;
  stackable?: boolean;
  createdAt?: string;
}

/** Rate breakup in booking detail */
export interface RateBreakup {
  currency: string;
  hotelGrossCharges: number;
  roomChargesBeforePromotion?: number;
  extraAdultChildChargesBeforePromotion?: number;
  extraAdultChargesBeforePromotion?: number;
  roomCharges: number;
  extraAdultCount?: number;
  extraAdultChildCharges: number;
  netAccommodationAfterPromotion?: number;
  propertyTaxes: number;
  promotionDiscount?: number;
  appliedPromotions?: AppliedPromotion[];
  serviceChargePercent?: number;
  /** Legacy field name */
  serviceChargeAmount?: number;
  /** Service fee including GST (multi-stream pricing) */
  serviceFeeIncludingGst?: number;
  commissionTotal: number;
  commissionAmount: number;
  commissionGst: number;
  taxDeductions: number;
  tcsAmount: number;
  tdsAmount: number;
  payableToHotel: number;
  agentCommission?: number | null;
  agencyCommission?: number | null;
  agencyIncentivePercent?: number | null;
  agencyIncentiveType?: string | null;
  agencyIncentiveSource?: string | null;
  agencyIncentiveCategory?: string | null;
  agencyTier?: string | null;
  agentTdsPercent?: number | null;
  agentTdsAmount?: number | null;
  agentNetCommission?: number | null;
  agentPayable?: number | null;
}

export interface AdminRatedMoney {
  amount: number;
  currency: string;
  ratePercent?: number | null;
  rateType?: string | null;
  fixedAmount?: number | null;
  rateLabel?: string | null;
}

export interface AdminMoney {
  amount: number;
  currency: string;
}

export type AdminMoneyLike = number | AdminMoney | null | undefined;

export function moneyAmount(value: AdminMoneyLike): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "object" && typeof value.amount === "number") {
    return Number.isFinite(value.amount) ? value.amount : undefined;
  }
  return undefined;
}

/** Super Admin full-details — nested admin API payload */
export interface AdminBookingSummary {
  bookingId: number;
  bookingRef: string;
  bookingStatus: string;
  hotelName: string;
  hotelLocality?: string | null;
  hotelCity: string;
  hotelAddress: string;
  checkInDate: string;
  checkOutDate: string;
  nightsDisplay: string;
  occupancyDisplay: string;
  bookedVia: string;
  bookedOn: string;
  totalAmount: number;
}

export interface AdminBookingGuestEntry {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface AdminBookingGuest {
  name: string;
  email: string | null;
  phone: string | null;
  guests: AdminBookingGuestEntry[];
}

export interface AdminBookingOwner {
  type: string;
  name: string;
  email: string | null;
  code?: string | null;
  agencyName?: string | null;
}

export interface AdminBookingPricing {
  basePrice: number;
  promotionDiscount?: number;
  priceAfterPromo: number;
  gstAmount?: number;
  serviceFeeAmount?: number;
  commissionAmount?: number;
  finalPayable: number;
  hotelPayout: number;
  otaGrossRevenue?: number;
  otaNetRevenue?: number;
  agencyCommission?: number;
  currency: string;
  rateBreakup?: RateBreakup;
}

export interface AdminBookingFinancials {
  id: number;
  bookingId: number;
  financialContext?: string;
  basePrice: number;
  extraAdultCount?: number;
  extraAdultCharges?: number;
  /** @deprecated prefer extraAdultCharges */
  extraChildCharges?: number;
  promotionDiscount?: number;
  priceAfterPromo: number;
  gstPercent?: number;
  gstAmount?: number;
  gst?: AdminRatedMoney;
  cgstAmount?: number;
  sgstAmount?: number;
  serviceFeeAmount?: number;
  serviceFee?: AdminRatedMoney;
  serviceFeeGst?: number;
  serviceFeeGstRated?: AdminRatedMoney;
  effectiveServiceFeePercent?: number;
  serviceFeeRuleName?: string;
  serviceFeeRuleId?: string;
  commissionPercent?: number;
  commissionAmount?: number;
  commission?: AdminRatedMoney;
  commissionGst?: number;
  commissionGstRated?: AdminRatedMoney;
  commissionInclusiveGst?: number;
  commissionRuleName?: string;
  commissionRuleId?: string;
  commissionConfigType?: string;
  commissionConfigValue?: number;
  commissionConfigPercent?: number;
  tcsPercent?: number;
  tcsAmount?: number;
  tcs?: AdminRatedMoney;
  tdsPercent?: number;
  tdsAmount?: number;
  tds?: AdminRatedMoney;
  taxRuleName?: string;
  taxRuleId?: string;
  taxConfigPercent?: number;
  customerSellingPrice: number;
  finalPayable: number;
  hotelPayout: number;
  otaGrossRevenue: number;
  otaNetRevenue: number;
  agencyCommission?: number;
  agencyTier?: string | null;
  agentIncentiveConfigId?: string | null;
  agencyIncentivePercent?: number;
  agencyIncentiveType?: string | null;
  agencyIncentiveSource?: string | null;
  agencyIncentiveCategory?: string | null;
  agentTdsPercent?: number | null;
  agentTdsAmount?: number | null;
  agentNetCommission?: number | null;
  selectedCustomerType: string;
  selectedPricingSource: string;
  channelType: string;
  bookingMode: string;
  currencyCode: string;
  promotionRuleName?: string;
  pricingEngineVersion?: string;
  appliedPromotions?: AppliedPromotion[];
}

export interface AdminRoomDayFinancial {
  id: number;
  bookingId: number;
  roomInstanceIndex: number;
  stayDate: string;
  roomCharges: number;
  extraCharges: number;
  promotionDiscount?: number;
  netAccommodation: number;
  hotelGst: number;
  propertyGross: number;
  commission: number;
  propertyNetPayable: number;
  appliedPromotionCodes?: string;
}

export interface AdminBookingPayment {
  paymentStatus: string;
  paymentType?: string;
  transactionId?: string | null;
  paidAt?: string | null;
  paidAmount?: number;
  refundedAmount?: number;
  customerOutstanding?: number;
  /** @deprecated prefer customerOutstanding */
  pendingAmount?: number;
}

export interface AdminCancellationSettlement {
  settlementContext?: string;
  cancellationAccommodationCharge?: AdminMoney | null;
  hotelGst?: AdminMoney | null;
  totalCancellationPropertyCharges?: AdminMoney | null;
  otaCommission?: AdminMoney | null;
  commissionGst?: AdminMoney | null;
  commissionInclusiveGst?: AdminMoney | null;
  tcs?: AdminMoney | null;
  tds?: AdminMoney | null;
  taxDeduction?: AdminMoney | null;
  amountPayableToProperty?: AdminMoney | null;
  customerRefund?: AdminMoney | null;
  recalculatedFromFinancials?: boolean | null;
}

export interface AdminCancellationMatchedBracket {
  cancellationPolicyId?: number | null;
  id?: number | null;
  label?: string | null;
  penaltyType?: string | null;
  penaltyPercent?: number | null;
  fixedPenaltyAmount?: AdminMoneyLike;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export interface AdminBookingCancellation {
  cancellationPolicy: string | null;
  isCancellationAllowed?: boolean;
  currentPolicyStage?: string | null;
  currentCancellationCharge?: AdminMoney | null;
  refundAmountIfCancelledNow?: AdminMoney | null;
  nonRefundable?: boolean;
  cancellationDatetime?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  cancelAmount?: number | null;
  originalReservationValue?: AdminMoneyLike;
  cancellationCharge?: AdminMoneyLike;
  amountPayableToProperty?: AdminMoneyLike;
  hotelCancellationBase?: number | null;
  hotelGrossCharges?: number | null;
  recalculatedFromFinancials?: boolean | null;
  refundAmount?: AdminMoneyLike;
  refundStatus?: string | null;
  refundDateTime?: string | null;
  matchedBracket?: AdminCancellationMatchedBracket | null;
  cancellationEvaluatedAt?: string | null;
  settlement?: AdminCancellationSettlement | null;
}

export interface AdminBookingFullDetail {
  bookingSummary: AdminBookingSummary;
  bookingOwner?: AdminBookingOwner | null;
  guest: AdminBookingGuest;
  rooms: BookingDetailRoomType[];
  pricing: AdminBookingPricing;
  financials: AdminBookingFinancials;
  roomDayFinancials: AdminRoomDayFinancial[];
  payment: AdminBookingPayment;
  cancellation: AdminBookingCancellation;
  audit: {
    createdAt: string;
    updatedAt: string;
    pricingEngineVersion?: string;
  };
}

function normalizeAdminBookingFullDetail(
  data: AdminBookingFullDetail,
): AdminBookingFullDetail {
  const fin = data.financials;
  const pricing = data.pricing ?? ({} as AdminBookingPricing);
  const rateBreakup = pricing.rateBreakup;
  const extraAdultCount =
    fin?.extraAdultCount ?? rateBreakup?.extraAdultCount ?? undefined;
  const extraAdult =
    fin?.extraAdultCharges ?? fin?.extraChildCharges ?? undefined;
  return {
    ...data,
    bookingSummary: {
      ...data.bookingSummary,
      hotelLocality: data.bookingSummary.hotelLocality ?? null,
    },
    bookingOwner: data.bookingOwner ?? null,
    pricing: {
      ...pricing,
      promotionDiscount:
        pricing.promotionDiscount ?? fin?.promotionDiscount ?? 0,
      gstAmount: pricing.gstAmount ?? fin?.gstAmount ?? 0,
      commissionAmount: pricing.commissionAmount ?? fin?.commissionAmount ?? 0,
      serviceFeeAmount:
        pricing.serviceFeeAmount ?? fin?.serviceFeeAmount ?? undefined,
      otaGrossRevenue: pricing.otaGrossRevenue ?? fin?.otaGrossRevenue ?? 0,
      otaNetRevenue: pricing.otaNetRevenue ?? fin?.otaNetRevenue ?? 0,
      agencyCommission:
        pricing.agencyCommission ?? fin?.agencyCommission ?? undefined,
      hotelPayout: pricing.hotelPayout ?? fin?.hotelPayout ?? 0,
      finalPayable: pricing.finalPayable ?? fin?.finalPayable ?? 0,
      rateBreakup: rateBreakup
        ? {
            ...rateBreakup,
            extraAdultCount: rateBreakup.extraAdultCount ?? extraAdultCount,
          }
        : undefined,
    },
    financials: {
      ...fin,
      extraAdultCount,
      extraAdultCharges: extraAdult,
      pricingEngineVersion:
        fin?.pricingEngineVersion ?? data.audit?.pricingEngineVersion,
    },
    payment: {
      ...data.payment,
      paidAmount: data.payment?.paidAmount ?? 0,
      refundedAmount: data.payment?.refundedAmount,
      customerOutstanding:
        data.payment?.customerOutstanding ?? data.payment?.pendingAmount ?? 0,
    },
    cancellation: data.cancellation ?? { cancellationPolicy: null },
    roomDayFinancials: Array.isArray(data.roomDayFinancials)
      ? data.roomDayFinancials
      : [],
    rooms: Array.isArray(data.rooms) ? data.rooms : [],
  };
}

/** Booking detail from GET /reports/booking-list/:id */
export interface BookingDetail {
  hotelName: string;
  hotelLocality: string | null;
  hotelCity: string;
  hotelAddress: string;
  guestName: string;
  guestStatus: string | null;
  contactNumber: string | null;
  emailAddress: string | null;
  gstDetails?: string | null;
  checkInDate: string;
  checkOutDate: string;
  nightsDisplay: string;
  occupancyDisplay: string;
  specialRequestByGuest: string | null;
  internalNote: string | null;
  paymentStatus: string;
  roomTypes: BookingDetailRoomType[];
  totalRooms: number;
  rateBreakup?: RateBreakup;
  bookingId: string;
  externalBookingId: string | null;
  bookedVia: string;
  bookingOwner?: AdminBookingOwner | null;
  bookedOn: string;
  paymentType: string | null;
  cancellationPolicy: string | null;
  /** Same policy split into display lines by the API. */
  cancellationPolicyLines?: string[] | null;
  isCancellationAllowed?: boolean;
  currentPolicyStage?: string | null;
  currentCancellationCharge?: AdminMoneyLike;
  refundAmountIfCancelledNow?: AdminMoneyLike;
  totalAmount: number;
  /** Booking lifecycle status; may differ from paymentStatus. */
  status?: string | null;
  cancellationDatetime?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  cancelAmount?: number | null;
  originalReservationValue?: AdminMoneyLike;
  cancellationCharge?: AdminMoneyLike;
  amountPayableToProperty?: AdminMoneyLike;
  refundAmount?: number | null;
  refundStatus?: string | null;
  refundDateTime?: string | null;
  matchedBracket?: AdminCancellationMatchedBracket | null;
  cancellationEvaluatedAt?: string | null;
  hotelPricingComputation?: "RETAIL_RATE" | "PACKAGE_RATE" | string | null;
  hotel_pricing_computation?: "RETAIL_RATE" | "PACKAGE_RATE" | string | null;
}

/** API response data wrapper (response.data) */
export interface BookingListResponse {
  data: BookingListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  checkInSummary: unknown;
}

/** Order keys accepted by /reports/booking-list */
export type BookingListOrderBy = "bookingDate" | "checkIn";
export type BookingListSortDir = "asc" | "desc";

export type BookingListDateFilter =
  | "BOOKING_DATE"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "STAYING";

/** Server-side list params */
export interface BookingListParams {
  hotelId: string;
  guestName?: string;
  bookingId?: string;
  dateFilter?: BookingListDateFilter;
  fromDate?: string;
  toDate?: string;
  bookingStatus?: string;
  view?: string;
  orderBy?: BookingListOrderBy;
  sortDir?: BookingListSortDir;
  page?: number;
  size?: number;
}

export type BookingListExportParams = Omit<
  BookingListParams,
  "page" | "size"
>;

function buildBookingListQuery(
  params: BookingListParams,
  options?: { includePagination?: boolean },
): string {
  const includePagination = options?.includePagination ?? true;
  const {
    hotelId,
    guestName,
    bookingId,
    dateFilter,
    fromDate,
    toDate,
    bookingStatus,
    view,
    orderBy,
    sortDir,
    page = 0,
    size = 10,
  } = params;

  const search = new URLSearchParams();
  search.set("hotelId", hotelId);
  if (view != null && view.trim() !== "") {
    search.set("view", view.trim());
  }
  if (guestName != null && guestName.trim() !== "") {
    search.set("guestName", guestName.trim());
  }
  if (bookingId != null && bookingId.trim() !== "") {
    search.set("bookingId", bookingId.trim());
  }
  if (dateFilter) {
    search.set("dateFilter", dateFilter);
  }
  if (fromDate != null && fromDate.trim() !== "") {
    search.set("fromDate", fromDate.trim());
  }
  if (toDate != null && toDate.trim() !== "") {
    search.set("toDate", toDate.trim());
  }
  if (bookingStatus != null && bookingStatus.trim() !== "") {
    search.set("bookingStatus", bookingStatus.trim());
  }
  if (orderBy) {
    search.set("orderBy", orderBy);
  }
  if (sortDir) {
    search.set("sortDir", sortDir);
  }
  if (includePagination) {
    search.set("page", String(page));
    search.set("size", String(size));
  }
  return search.toString();
}

export const bookingService = {
  getBookingList: async (
    params: BookingListParams,
  ): Promise<BookingListResponse> => {
    const query = buildBookingListQuery(params);
    const response = await apiClient.get<
      ApiSuccessResponse<BookingListResponse>
    >(`${API_ENDPOINTS.REPORTS.BOOKING_LIST}?${query}`);
    const payload = response.data;
    if (!payload || !Array.isArray(payload.data)) {
      return {
        data: [],
        page: params.page ?? 0,
        size: params.size ?? 10,
        totalElements: 0,
        totalPages: 0,
        checkInSummary: null,
      };
    }
    return payload;
  },

  exportBookingList: async (options: {
    params: BookingListExportParams;
    format?: ReportExportFormat;
    defaultFileName: string;
    onStatus?: (status: ExportJobStatus) => void;
  }): Promise<void> => {
    const format = options.format ?? "EXCEL";
    const query = buildBookingListQuery(
      { ...options.params, page: undefined, size: undefined },
      { includePagination: false },
    );
    const formatParam = query
      ? `?${query}&format=${format}`
      : `?format=${format}`;

    await runReportExportJob({
      startUrl: `${API_ENDPOINTS.REPORTS.BOOKING_LIST_EXPORT}${formatParam}`,
      statusUrl: API_ENDPOINTS.REPORTS.BOOKING_LIST_EXPORT_JOB,
      downloadUrl: API_ENDPOINTS.REPORTS.BOOKING_LIST_EXPORT_DOWNLOAD,
      defaultFileName: options.defaultFileName,
      format,
      onStatus: options.onStatus,
    });
  },

  getBookingDetail: async (
    hotelId: string,
    bookingId: string,
  ): Promise<BookingDetail> => {
    const url = `${API_ENDPOINTS.REPORTS.BOOKING_DETAIL(bookingId)}?hotelId=${encodeURIComponent(hotelId)}`;
    const response =
      await apiClient.get<ApiSuccessResponse<BookingDetail>>(url);
    return bookingService.normalizeBookingDetail(response.data);
  },

  /** Super Admin — GET /reports/admin/booking-list/:id/full-details (list item id) */
  getAdminBookingFullDetail: async (
    id: string,
  ): Promise<AdminBookingFullDetail> => {
    const url = API_ENDPOINTS.REPORTS.ADMIN_BOOKING_FULL_DETAILS(id);
    const response =
      await apiClient.get<ApiSuccessResponse<AdminBookingFullDetail>>(url);
    if (!response.data) {
      throw new Error("Booking not found");
    }
    return normalizeAdminBookingFullDetail(response.data);
  },

  normalizeBookingDetail: (data: BookingDetail | undefined): BookingDetail => {
    if (!data) {
      throw new Error("Booking not found");
    }
    return {
      ...data,
      bookingOwner: data.bookingOwner ?? null,
      hotelPricingComputation:
        data.hotelPricingComputation ?? data.hotel_pricing_computation ?? null,
    };
  },

  /** Fetch voucher as blob (PDF). id = list item id (numeric) from booking list. */
  getVoucher: async (id: string): Promise<Blob> => {
    const url = API_ENDPOINTS.REPORTS.BOOKING_VOUCHER(id);
    const blob = await apiClient.get<Blob>(url, {
      responseType: "blob",
      headers: { Accept: "application/pdf" },
    });
    return blob;
  },
};
