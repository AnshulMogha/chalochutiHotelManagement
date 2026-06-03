import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";

/** Single booking item from /reports/booking-list API */
export interface BookingListItem {
  id: number;
  bookingId: string;
  guestName: string;
  numberOfGuests: number;
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
  roomCharges: number;
  extraAdultChildCharges: number;
  netAccommodationAfterPromotion?: number;
  propertyTaxes: number;
  promotionDiscount?: number;
  appliedPromotions?: AppliedPromotion[];
  serviceChargePercent: number;
  serviceChargeAmount: number;
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
  hotelLocality: string | null;
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
  promotionDiscount: number;
  priceAfterPromo: number;
  gstAmount: number;
  commissionAmount: number;
  finalPayable: number;
  hotelPayout: number;
  otaGrossRevenue: number;
  otaNetRevenue: number;
  currency: string;
  rateBreakup: RateBreakup;
}

export interface AdminBookingFinancials {
  id: number;
  bookingId: number;
  basePrice: number;
  extraChildCharges: number;
  promotionDiscount: number;
  priceAfterPromo: number;
  gstPercent: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  serviceFeeAmount: number;
  serviceFeeGst: number;
  serviceFeeRuleName: string;
  commissionPercent: number;
  commissionAmount: number;
  commissionGst: number;
  commissionRuleName: string;
  tcsPercent: number;
  tcsAmount: number;
  tdsPercent: number;
  tdsAmount: number;
  taxRuleName: string;
  customerSellingPrice: number;
  finalPayable: number;
  hotelPayout: number;
  otaGrossRevenue: number;
  otaNetRevenue: number;
  agencyCommission: number;
  selectedCustomerType: string;
  selectedPricingSource: string;
  channelType: string;
  bookingMode: string;
  currencyCode: string;
  promotionRuleName: string;
}

export interface AdminRoomDayFinancial {
  id: number;
  bookingId: number;
  roomInstanceIndex: number;
  stayDate: string;
  roomCharges: number;
  extraCharges: number;
  promotionDiscount: number;
  netAccommodation: number;
  hotelGst: number;
  propertyGross: number;
  commission: number;
  propertyNetPayable: number;
  appliedPromotionCodes: string;
}

export interface AdminBookingPayment {
  paymentStatus: string;
  paymentType: string;
  transactionId: string | null;
  paidAt: string | null;
  paidAmount: number;
}

export interface AdminBookingFullDetail {
  bookingSummary: AdminBookingSummary;
  guest: AdminBookingGuest;
  rooms: BookingDetailRoomType[];
  pricing: AdminBookingPricing;
  financials: AdminBookingFinancials;
  roomDayFinancials: AdminRoomDayFinancial[];
  payment: AdminBookingPayment;
  cancellation: { cancellationPolicy: string | null };
  audit: {
    createdAt: string;
    updatedAt: string;
    pricingEngineVersion: string;
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
  totalAmount: number;
  cancellationDatetime?: string | null;
  cancelAmount?: number | null;
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

/** Server-side list params */
export interface BookingListParams {
  hotelId: string;
  guestName?: string;
  bookingId?: string;
  checkInDate?: string;
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
      page = 0,
      size = 10,
    } = params;
    const search = new URLSearchParams();
    search.set("hotelId", hotelId);
    if (guestName != null && guestName.trim() !== "") {
      search.set("guestName", guestName.trim());
    }
    if (bookingId != null && bookingId.trim() !== "") {
      search.set("bookingId", bookingId.trim());
    }
    if (checkInDate != null && checkInDate.trim() !== "") {
      search.set("checkInDate", checkInDate.trim());
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
    return response.data;
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
