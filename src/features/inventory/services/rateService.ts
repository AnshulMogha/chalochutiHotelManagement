import { apiClient } from "@/services/api/client";
import { API_ENDPOINTS } from "@/constants";
import type { ApiSuccessResponse } from "@/services/api/types/api";
import type { RatesData } from "../type";

export interface UpdateSingleRateRequest {
  roomId: number;
  ratePlanId: number;
  customerType: string;
  date: string; // YYYY-MM-DD
  baseRate: number;
  extraAdultCharge: number;
  paidChildCharge: number;
  minStay: number | null;
  maxStay: number | null;
  cutoffTime: string | null;
  currency: string | null;
}

export interface BulkUpdateRatesRequest {
  roomId: number;
  ratePlanId: number;
  customerType: string;
  from: string; // YYYY-MM-DD (start date)
  to: string; // YYYY-MM-DD (end date)
  baseRate?: number;
  extraAdultCharge?: number;
  paidChildCharge?: number;
  minStay?: number | null;
  maxStay?: number | null;
  cutoffTime?: string | null;
  currency?: string;
}

export const rateService = {
  getCalendar: async (
    hotelId: string,
    fromDate: string,
    toDate: string,
    customerType: string = "RETAIL"
  ): Promise<RatesData> => {
    const response = await apiClient.get<ApiSuccessResponse<RatesData>>(
      API_ENDPOINTS.RATES.GET_CALENDAR(hotelId, fromDate, toDate, customerType)
    );

    // API response: ApiSuccessResponse wraps { data: { hotelId, customerType, from, to, ratePlans } }
    // So response.data = { hotelId, customerType, from, to, ratePlans }
    return response.data;
  },

  updateSingleRate: async (
    request: UpdateSingleRateRequest
  ): Promise<void> => {
    await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.RATES.UPDATE_SINGLE,
      request
    );
  },

  bulkUpdateRates: async (
    request: BulkUpdateRatesRequest
  ): Promise<void> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.RATES.UPDATE_BULK,
      request
    );
  },
};

