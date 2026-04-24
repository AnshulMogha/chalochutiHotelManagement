import { apiClient } from "@/services/api/client";
import { API_ENDPOINTS } from "@/constants";
import type { ApiSuccessResponse } from "@/services/api/types/api";
import type { InventoryRoom } from "../type";
import type { HotelRoomsResponse } from "@/features/admin/services/adminService";

const ROOM_TYPE_DISPLAY_ORDER: Record<string, number> = {
  DORMITORY: 0,
  SHARED_ROOM: 1,
  STUDIO: 2,
  STANDARD: 3,
  DELUXE: 4,
  SUPER_DELUXE: 5,
  PREMIUM: 6,
  EXECUTIVE: 7,
  CLUB: 8,
  JUNIOR_SUITE: 9,
  SUITE: 10,
  FAMILY_SUITE: 11,
  PRESIDENTIAL_SUITE: 12,
  COTTAGE: 13,
  BUNGALOW: 14,
  VILLA: 15,
};

const normalizeForOrdering = (value?: string | null): string => {
  if (!value) return "";
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const getRoomTypeOrder = (roomTypeCode?: string | null): number => {
  const trimmedCode = roomTypeCode?.trim().toUpperCase();
  if (!trimmedCode) return Number.MAX_SAFE_INTEGER;

  if (ROOM_TYPE_DISPLAY_ORDER[trimmedCode] !== undefined) {
    return ROOM_TYPE_DISPLAY_ORDER[trimmedCode];
  }

  // Support alternate code formats if API sends variants.
  const normalized = normalizeForOrdering(trimmedCode);
  const roomTypeAliases: Record<string, keyof typeof ROOM_TYPE_DISPLAY_ORDER> = {
    SHAREDROOM: "SHARED_ROOM",
    STUDIOROOM: "STUDIO",
    STANDARDROOM: "STANDARD",
    DELUXEROOM: "DELUXE",
    SUPERDELUXEROOM: "SUPER_DELUXE",
    PREMIUMROOM: "PREMIUM",
    EXECUTIVEROOM: "EXECUTIVE",
    CLUBROOM: "CLUB",
    JUNIORSUITE: "JUNIOR_SUITE",
    FAMILYSUITE: "FAMILY_SUITE",
    PRESIDENTIALSUITE: "PRESIDENTIAL_SUITE",
  };

  const aliasKey = roomTypeAliases[normalized];
  if (!aliasKey) return Number.MAX_SAFE_INTEGER;
  return ROOM_TYPE_DISPLAY_ORDER[aliasKey];
};

export interface InventoryCalendarApiResponse {
  data: {
    hotelId: string;
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
    rooms: Array<{
      roomId: number;
      roomName: string;
      room_type_code?: string | null;
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

/** Weekday values expected by POST /hotel/inventory/bulk/rooms */
export type InventoryBulkRoomsWeekDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface BulkUpdateInventoryRoomPayload {
  roomId: number;
  totalRooms: number;
}

export interface BulkUpdateInventoryRoomsRequest {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  rooms: BulkUpdateInventoryRoomPayload[];
  totalRooms: number;
  weekDays: InventoryBulkRoomsWeekDay[];
}

export interface BulkUpdateRestrictionsRequest {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  status: "OPEN" | "CLOSED";
  cta: boolean;
  ctd: boolean;
  minStay: number | null;
  maxStay: number | null;
  cutoffTime: string | null; // HH:mm:ss format
}

export const inventoryService = {
  getHotelRooms: async (hotelId: string) => {
    const response = await apiClient.get<ApiSuccessResponse<HotelRoomsResponse>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_HOTEL_ROOMS(hotelId)
    );
    return response.data.rooms || [];
  },

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
    return [...apiData.rooms]
      .map((room) => ({
        roomId: room.roomId,
        roomName: room.roomName,
        room_type_code: room.room_type_code,
        days: room.days.map((day) => ({
          date: day.date,
          total: day.total,
          sold: day.sold,
          blocked: day.blocked,
          available: day.available,
          status: day.status,
          minStay: day.minStay ?? null,
          maxStay: day.maxStay ?? null,
          cta: day.cta,
          ctd: day.ctd,
        })),
      }))
      .sort((firstRoom, secondRoom) => {
        const orderDiff =
          getRoomTypeOrder(firstRoom.room_type_code) -
          getRoomTypeOrder(secondRoom.room_type_code);
        if (orderDiff !== 0) return orderDiff;
        return firstRoom.roomName.localeCompare(secondRoom.roomName);
      });
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

  bulkUpdateInventoryRooms: async (
    request: BulkUpdateInventoryRoomsRequest
  ): Promise<void> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.INVENTORY.UPDATE_BULK_ROOMS,
      request
    );
  },

  bulkUpdateRestrictions: async (
    hotelId: string,
    request: BulkUpdateRestrictionsRequest
  ): Promise<void> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.INVENTORY.UPDATE_BULK_RESTRICTIONS(hotelId),
      request
    );
    // API returns: { statusCode: 200, status: "SUCCESS", message: "Inventory restrictions bulk updated successfully." }
  },
};

