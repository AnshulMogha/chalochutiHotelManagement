import { addDays, format, startOfToday } from "date-fns";
import type { HotelRoom } from "@/features/admin/services/adminService";
import { rateService } from "../services/rateService";

export type RoomIdMapDateRange = { from: string; to: string };

/**
 * Maps admin `HotelRoom.roomId` (UUID string) to numeric `roomId` used by rate/inventory APIs,
 * by aligning room names with the rates calendar response.
 */
export async function mapHotelRoomUuidsToNumericRoomIds(
  hotelId: string,
  hotelRooms: HotelRoom[],
  customerType: string = "RETAIL",
  dateRange?: RoomIdMapDateRange,
): Promise<Record<string, number>> {
  const fromDate =
    dateRange?.from ?? format(startOfToday(), "yyyy-MM-dd");
  const toDate =
    dateRange?.to ?? format(addDays(startOfToday(), 6), "yyyy-MM-dd");
  const rateData = await rateService.getCalendar(
    hotelId,
    fromDate,
    toDate,
    customerType,
  );

  const nameToNumeric: Record<string, number> = {};
  for (const room of rateData.rooms) {
    const key = room.roomName.toLowerCase().trim();
    if (nameToNumeric[key] === undefined) {
      nameToNumeric[key] = room.roomId;
    }
  }

  const uuidToNumeric: Record<string, number> = {};
  for (const hr of hotelRooms) {
    const key = hr.roomName.toLowerCase().trim();
    const num = nameToNumeric[key];
    if (num !== undefined) {
      uuidToNumeric[hr.roomId] = num;
    }
  }
  return uuidToNumeric;
}
