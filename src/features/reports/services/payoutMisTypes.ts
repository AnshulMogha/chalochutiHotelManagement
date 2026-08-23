export type PayoutMisDatePreset =
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

export type PayoutMisSortField =
  | "PAYMENT_DATE"
  | "PAYMENTS_SETTLED"
  | "AMOUNT_TRANSFERRED"
  | "AMOUNT_ADJUSTED"
  | "BOOKING_COUNT";

export type PayoutMisSortDir = "asc" | "desc";

export interface PayoutMoney {
  amount: number;
  currency: string;
}

export interface PayoutMisDateRange {
  fromDate: string;
  toDate: string;
}

export interface PayoutMisSummary {
  paymentsMade: number;
  bookingsCount: number;
  paymentSettled: PayoutMoney;
  amountTransferred: PayoutMoney;
  amountAdjusted: PayoutMoney;
}

export interface PayoutMisPaymentRow {
  settlementNo: string;
  paymentReferenceNumber: string;
  paymentDate: string;
  bookingCount: number;
  paymentsSettled: PayoutMoney;
  amountTransferred: PayoutMoney;
  amountAdjusted: PayoutMoney;
  paymentStatus: string;
}

export interface PayoutMisPageMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PayoutMisDashboardResponse {
  dateRange: PayoutMisDateRange;
  summary: PayoutMisSummary;
  payments: PayoutMisPaymentRow[];
  page: PayoutMisPageMeta;
}

export interface PayoutMisBookingLine {
  bookingId: string;
  bookingReference: string;
  checkIn?: string | null;
  checkOut?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  bookingAmount: PayoutMoney;
  amountTransferred: PayoutMoney;
  amountAdjusted: PayoutMoney;
  adjustmentReason?: string | null;
  creditStatus?: string | null;
}

export interface PayoutMisDetailResponse {
  settlementNo: string;
  paymentStatus: string;
  paymentReferenceNumber: string;
  paymentDate: string;
  paymentType: string;
  bookingCount: number;
  bankAccountMasked: string;
  netEarnings: PayoutMoney;
  amountAdjusted: PayoutMoney;
  amountTransferred: PayoutMoney;
  bookings: PayoutMisBookingLine[];
}

export interface PayoutMisListParams {
  page?: number;
  size?: number;
  sort?: PayoutMisSortField;
  sortDir?: PayoutMisSortDir;
  datePreset?: PayoutMisDatePreset;
  fromDate?: string;
  toDate?: string;
  search?: string;
  propertyIds?: string[];
  vendorId?: number;
}

export interface PayoutMisDetailParams {
  paymentReference: string;
  hotelId?: string;
  vendorId?: number;
}
