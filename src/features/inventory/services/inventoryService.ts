import { apiClient } from "@/services/api/client";
import { API_ENDPOINTS } from "@/constants";
import type { ApiSuccessResponse } from "@/services/api/types/api";
import type { InventoryRoom } from "../type";

export interface InventoryCalendarApiResponse {
  data: {
    hotelId: string;
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
    rooms: Array<{
      roomId: number;
      roomName: string;
      days: Array<{
        date: string; // YYYY-MM-DD
        total: number;
        sold: number;
        blocked: number;
        available: number;
        status: "OPEN" | "CLOSED";
        minStay: number | null;
        maxStay: number | null;
        cta: boolean;
        ctd: boolean;
      }>;
    }>;
  };
}

export interface UpdateInventoryRequest {
  roomId: number;
  date: string; // YYYY-MM-DD
  totalRooms: number;
  status: "OPEN" | "CLOSED";
}

export interface BulkUpdateInventoryRequest {
  roomId: number;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  totalRooms: number;
  status: "OPEN" | "CLOSED";
}

export const inventoryService = {
  getCalendar: async (
    hotelId: string,
    fromDate: string,
    toDate: string
  ): Promise<InventoryRoom[]> => {
    const response = await apiClient.get<
      ApiSuccessResponse<InventoryCalendarApiResponse["data"]>
    >(API_ENDPOINTS.INVENTORY.GET_CALENDAR(hotelId, fromDate, toDate));

    // API response: ApiSuccessResponse wraps { data: { hotelId, from, to, rooms } }
    // So response.data = { hotelId, from, to, rooms }
    const apiData = response.data;
    return apiData.rooms.map((room) => ({
      roomId: room.roomId,
      roomName: room.roomName,
      days: room.days.map((day) => ({
        date: day.date,
        total: day.total,
        sold: day.sold,
        blocked: day.blocked,
        available: day.available,
        status: day.status,
        minStay: day.minStay ?? 0,
        maxStay: day.maxStay ?? null,
        cta: day.cta,
        ctd: day.ctd,
      })),
    }));
  },

  updateInventory: async (
    request: UpdateInventoryRequest
  ): Promise<void> => {
    await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.INVENTORY.UPDATE_SINGLE,
      request
    );
    // API returns: { statusCode: 200, status: "SUCCESS", message: "..." }
    // Wrapped in ApiSuccessResponse, so response.data is null and message is in response.message
  },

  bulkUpdateInventory: async (
    request: BulkUpdateInventoryRequest
  ): Promise<void> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.INVENTORY.UPDATE_BULK,
      request
    );
    // API returns: { statusCode: 200, status: "SUCCESS", message: "Inventory bulk updated successfully." }
  },
};

