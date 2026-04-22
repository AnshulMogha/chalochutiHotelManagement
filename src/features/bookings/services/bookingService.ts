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

/** Rate breakup in booking detail */
export interface RateBreakup {
  currency: string;
  hotelGrossCharges: number;
  roomCharges: number;
  extraAdultChildCharges: number;
  propertyTaxes: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  commissionTotal: number;
  commissionAmount: number;
  commissionGst: number;
  taxDeductions: number;
  tcsAmount: number;
  tdsAmount: number;
  payableToHotel: number;
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
  getBookingList: async (params: BookingListParams): Promise<BookingListResponse> => {
    const { hotelId, guestName, bookingId, checkInDate, page = 0, size = 10 } = params;
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
    const response = await apiClient.get<ApiSuccessResponse<BookingListResponse>>(
      `${API_ENDPOINTS.REPORTS.BOOKING_LIST}?${search.toString()}`
    );
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

  getBookingDetail: async (hotelId: string, bookingId: string): Promise<BookingDetail> => {
    const url = `${API_ENDPOINTS.REPORTS.BOOKING_DETAIL(bookingId)}?hotelId=${encodeURIComponent(hotelId)}`;
    const response = await apiClient.get<ApiSuccessResponse<BookingDetail>>(url);
    const data = response.data;
    if (!data) {
      throw new Error("Booking not found");
    }
    return data;
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
