import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";

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
  status: string;
}

/** Room type line in booking detail */
export interface BookingDetailRoomType {
  quantity: number;
  roomName: string;
  occupancyDisplay: string;
  mealPlan: string;
}

/** Applied promotion line in rate breakup */
export interface AppliedPromotion {
  promotionName: string;
  promotionType: string;
  discountPercentage: number;
  percentLabel: string;
  offerType: string;
  discountAmount: number;
  displayLine: string;
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
  agencyTier?: string | null;
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
  currency: string;
  rateBreakup?: RateBreakup;
}

export interface AdminBookingFinancials {
  id: number;
  bookingId: number;
  basePrice: number;
  extraAdultCount?: number;
  extraAdultCharges?: number;
  /** @deprecated prefer extraAdultCharges */
  extraChildCharges?: number;
  promotionDiscount?: number;
  priceAfterPromo: number;
  gstPercent?: number;
  gstAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  serviceFeeAmount?: number;
  serviceFeeGst?: number;
  effectiveServiceFeePercent?: number;
  serviceFeeRuleName?: string;
  serviceFeeRuleId?: string;
  commissionPercent?: number;
  commissionAmount?: number;
  commissionGst?: number;
  commissionRuleName?: string;
  commissionRuleId?: string;
  tcsPercent?: number;
  tcsAmount?: number;
  tdsPercent?: number;
  tdsAmount?: number;
  taxRuleName?: string;
  taxRuleId?: string;
  customerSellingPrice: number;
  finalPayable: number;
  hotelPayout: number;
  otaGrossRevenue: number;
  otaNetRevenue: number;
  agencyCommission?: number;
  agencyIncentivePercent?: number;
  selectedCustomerType: string;
  selectedPricingSource: string;
  channelType: string;
  bookingMode: string;
  currencyCode: string;
  promotionRuleName?: string;
  pricingEngineVersion?: string;
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
  pendingAmount?: number;
}

export interface AdminBookingCancellation {
  cancellationPolicy: string | null;
  nonRefundable?: boolean;
  cancellationDatetime?: string | null;
  cancelAmount?: number | null;
  originalReservationValue?: number | null;
  cancellationCharge?: number | null;
  amountPayableToProperty?: number | null;
  hotelCancellationBase?: number | null;
  hotelGrossCharges?: number | null;
  recalculatedFromFinancials?: boolean | null;
  refundAmount?: number | null;
}

export interface AdminBookingFullDetail {
  bookingSummary: AdminBookingSummary;
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
  bookedOn: string;
  paymentType: string | null;
  cancellationPolicy: string | null;
  /** Same policy split into display lines by the API. */
  cancellationPolicyLines?: string[] | null;
  totalAmount: number;
  /** Booking lifecycle status; may differ from paymentStatus. */
  status?: string | null;
  cancellationDatetime?: string | null;
  cancelAmount?: number | null;
  originalReservationValue?: number | null;
  cancellationCharge?: number | null;
  amountPayableToProperty?: number | null;
  refundAmount?: number | null;
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

/** Server-side list params */
export interface BookingListParams {
  hotelId: string;
  guestName?: string;
  bookingId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  bookingDate?: string;
  today?: string;
  checkOutFrom?: string;
  checkOutTo?: string;
  bookingStatus?: string;
  view?: string;
  orderBy?: BookingListOrderBy;
  sortDir?: BookingListSortDir;
  page?: number;
  size?: number;
}

export const bookingService = {
  getBookingList: async (
    params: BookingListParams,
  ): Promise<BookingListResponse> => {
    const {
      hotelId,
      guestName,
      bookingId,
      checkInDate,
      checkOutDate,
      bookingDate,
      today,
      checkOutFrom,
      checkOutTo,
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
    if (checkInDate != null && checkInDate.trim() !== "") {
      search.set("checkInDate", checkInDate.trim());
    }
    if (checkOutDate != null && checkOutDate.trim() !== "") {
      search.set("checkOutDate", checkOutDate.trim());
    }
    if (bookingDate != null && bookingDate.trim() !== "") {
      search.set("bookingDate", bookingDate.trim());
    }
    if (today != null && today.trim() !== "") {
      search.set("today", today.trim());
    }
    if (checkOutFrom != null && checkOutFrom.trim() !== "") {
      search.set("checkOutFrom", checkOutFrom.trim());
    }
    if (checkOutTo != null && checkOutTo.trim() !== "") {
      search.set("checkOutTo", checkOutTo.trim());
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
    search.set("page", String(page));
    search.set("size", String(size));
    const response = await apiClient.get<
      ApiSuccessResponse<BookingListResponse>
    >(`${API_ENDPOINTS.REPORTS.BOOKING_LIST}?${search.toString()}`);
    const payload = response.data;
    if (!payload || !Array.isArray(payload.data)) {
      return {
        data: [],
        page: page,
        size: size,
        totalElements: 0,
        totalPages: 0,
        checkInSummary: null,
      };
    }
    return payload;
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
