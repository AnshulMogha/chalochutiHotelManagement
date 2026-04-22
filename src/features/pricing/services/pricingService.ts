import { apiClient } from "@/services/api/client";
import { API_ENDPOINTS } from "@/constants";
import type { ApiSuccessResponse } from "@/services/api/types";

export interface PricingQuoteRequest {
  hotelId?: string;
  roomId?: string;
  ratePlanId?: number;
  checkIn?: string;
  checkOut?: string;
  channel?: string;
  loggedInUser?: boolean;
  userStateCode?: string;
  companyStateCode?: string;
  bookingDate?: string;
}

export interface PricingQuoteResponse {
  // The response structure will depend on the API
  // Adding common fields that might be returned
  totalPrice?: number;
  basePrice?: number;
  taxes?: number;
  commission?: number;
  discount?: number;
  finalPrice?: number;
  [key: string]: any; // Allow for flexible response structure
}

export const pricingService = {
  getQuote: async (data: PricingQuoteRequest): Promise<PricingQuoteResponse> => {
    // Remove undefined/null values before sending
    const cleanedData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined && value !== null && value !== "")
    ) as PricingQuoteRequest;
    
    const response = await apiClient.post<ApiSuccessResponse<PricingQuoteResponse>>(
      API_ENDPOINTS.PRICING.GET_QUOTE,
      cleanedData
    );
    return response.data;
  },
};

