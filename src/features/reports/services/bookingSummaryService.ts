import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";

export type BookingSummaryDatePreset =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "LAST_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "LAST_30_DAYS"
  | "CUSTOM";

export type BookingSummarySortField =
  | "todaysBookings"
  | "todaysCheckins"
  | "stayingToday"
  | "todaysCheckouts"
  | "netBookings"
  | "otaEarnings"
  | "hotelEarnings"
  | "hotelName";

export type BookingSummarySortDir = "asc" | "desc";

export type BookingListDrillView =
  | "TODAYS_BOOKINGS"
  | "TODAYS_CHECKINS"
  | "STAYING_TODAY"
  | "TODAYS_CHECKOUTS"
  | "NET_BOOKINGS"
  | "NET_EARNINGS";

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface BookingSummaryDrillFilters {
  bookingDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  today?: string;
  checkOutFrom?: string;
  checkOutTo?: string;
  bookingStatus?: string;
  [key: string]: string | undefined;
}

export interface BookingSummaryDrillDown {
  view: BookingListDrillView | string;
  filters: BookingSummaryDrillFilters;
}

export interface BookingSummaryHotelMetrics {
  todaysBookings: number;
  todaysCheckins: number;
  stayingToday: number;
  todaysCheckouts: number;
  netBookings: number;
  /** Commission + fees kept by the OTA. */
  otaEarnings: MoneyAmount;
  /** Amount payable to the property. */
  hotelEarnings: MoneyAmount;
}

export interface BookingSummaryHotelRow {
  hotelId: string;
  hotelName: string;
  hotelCode?: string | null;
  city?: string | null;
  state?: string | null;
  metrics: BookingSummaryHotelMetrics;
  drillDown: {
    todaysBookings?: BookingSummaryDrillDown;
    todaysCheckins?: BookingSummaryDrillDown;
    stayingToday?: BookingSummaryDrillDown;
    todaysCheckouts?: BookingSummaryDrillDown;
    netBookings?: BookingSummaryDrillDown;
    otaEarnings?: BookingSummaryDrillDown;
    hotelEarnings?: BookingSummaryDrillDown;
  };
}

export interface BookingSummaryResponse {
  summary: {
    totalHotels: number;
    netBookings: number;
    otaEarnings: MoneyAmount;
    hotelEarnings: MoneyAmount;
  };
  hotels: BookingSummaryHotelRow[];
  page: {
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
    sort?: string;
    direction?: string;
  };
  dateRange: {
    preset?: string | null;
    fromDate: string;
    toDate: string;
  };
}

export interface BookingSummaryParams {
  page?: number;
  size?: number;
  sort?: BookingSummarySortField;
  sortDir?: BookingSummarySortDir;
  datePreset?: BookingSummaryDatePreset;
  fromDate?: string;
  toDate?: string;
  propertyIds?: string[];
  cityIds?: number[];
  stateIds?: number[];
  search?: string;
}

/** The API omits money objects and metric blocks when a hotel has no activity. */
type RawMoney = Partial<MoneyAmount> | number | null;

/** Earnings were a single `netEarnings` figure before the OTA/hotel split. */
interface RawEarnings {
  otaEarnings?: RawMoney;
  hotelEarnings?: RawMoney;
  netEarnings?: RawMoney;
}

interface RawHotelRow
  extends Omit<Partial<BookingSummaryHotelRow>, "metrics" | "drillDown"> {
  metrics?:
    | (Partial<
        Omit<BookingSummaryHotelMetrics, "otaEarnings" | "hotelEarnings">
      > &
        RawEarnings)
    | null;
  drillDown?:
    | (BookingSummaryHotelRow["drillDown"] & {
        netEarnings?: BookingSummaryDrillDown;
      })
    | null;
}

interface RawBookingSummaryResponse
  extends Omit<Partial<BookingSummaryResponse>, "summary" | "hotels"> {
  summary?:
    | ({ totalHotels?: number; netBookings?: number } & RawEarnings)
    | null;
  hotels?: RawHotelRow[] | null;
}

function toMoney(value: RawMoney | undefined, currency: string): MoneyAmount {
  if (typeof value === "number") return { amount: value, currency };
  return {
    amount: value?.amount ?? 0,
    currency: value?.currency || currency,
  };
}

function normalizeHotelRow(
  row: RawHotelRow,
  currency: string,
): BookingSummaryHotelRow {
  const metrics = row.metrics ?? {};
  const drillDown = row.drillDown ?? {};
  return {
    hotelId: row.hotelId ?? "",
    hotelName: row.hotelName ?? "—",
    hotelCode: row.hotelCode ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    metrics: {
      todaysBookings: metrics.todaysBookings ?? 0,
      todaysCheckins: metrics.todaysCheckins ?? 0,
      stayingToday: metrics.stayingToday ?? 0,
      todaysCheckouts: metrics.todaysCheckouts ?? 0,
      netBookings: metrics.netBookings ?? 0,
      otaEarnings: toMoney(metrics.otaEarnings, currency),
      hotelEarnings: toMoney(
        metrics.hotelEarnings ?? metrics.netEarnings,
        currency,
      ),
    },
    drillDown: {
      ...drillDown,
      otaEarnings: drillDown.otaEarnings ?? drillDown.netEarnings,
      hotelEarnings: drillDown.hotelEarnings ?? drillDown.netEarnings,
    },
  };
}

function appendCsvParam(
  search: URLSearchParams,
  key: string,
  values?: Array<string | number>,
) {
  if (!values?.length) return;
  search.set(key, values.map(String).join(","));
}

export const bookingSummaryService = {
  getBookingSummary: async (
    params: BookingSummaryParams = {},
  ): Promise<BookingSummaryResponse> => {
    const {
      page = 0,
      size = 20,
      sort = "netBookings",
      sortDir = "desc",
      datePreset = "LAST_30_DAYS",
      fromDate,
      toDate,
      propertyIds,
      cityIds,
      stateIds,
      search,
    } = params;

    const searchParams = new URLSearchParams();
    searchParams.set("page", String(page));
    searchParams.set("size", String(size));
    searchParams.set("sort", sort);
    searchParams.set("sortDir", sortDir);
    searchParams.set("datePreset", datePreset);

    if (datePreset === "CUSTOM") {
      if (fromDate) searchParams.set("fromDate", fromDate);
      if (toDate) searchParams.set("toDate", toDate);
    }
    appendCsvParam(searchParams, "propertyIds", propertyIds);
    appendCsvParam(searchParams, "cityIds", cityIds);
    appendCsvParam(searchParams, "stateIds", stateIds);
    if (search?.trim()) {
      searchParams.set("search", search.trim());
    }

    const response = await apiClient.get<
      ApiSuccessResponse<RawBookingSummaryResponse>
    >(`${API_ENDPOINTS.REPORTS.BOOKING_SUMMARY}?${searchParams.toString()}`);

    const payload = response.data;
    const hotelEarnings = toMoney(
      payload?.summary?.hotelEarnings ?? payload?.summary?.netEarnings,
      "INR",
    );
    const otaEarnings = toMoney(
      payload?.summary?.otaEarnings,
      hotelEarnings.currency,
    );
    return {
      summary: {
        totalHotels: payload?.summary?.totalHotels ?? 0,
        netBookings: payload?.summary?.netBookings ?? 0,
        otaEarnings,
        hotelEarnings,
      },
      hotels: Array.isArray(payload?.hotels)
        ? payload.hotels.map((row) =>
            normalizeHotelRow(row, hotelEarnings.currency),
          )
        : [],
      page: payload?.page ?? {
        page,
        size,
        totalPages: 0,
        totalElements: 0,
        sort,
        direction: sortDir.toUpperCase(),
      },
      dateRange: payload?.dateRange ?? {
        preset: datePreset,
        fromDate: fromDate ?? "",
        toDate: toDate ?? "",
      },
    };
  },
};
