import {
  type RoomDetails,
  type RoomStateType,
} from "../types";

import { adminService } from "@/features/admin/services/adminService";
import type { HotelRoomDetailsRequest } from "@/features/admin/services/adminService";
import type { AmenityPayload } from "../services/api.types";

// Helper function to transform amenities
function transformAmenitiesPayload(
  amenities?: Record<string, string[]>
): { amenityCode: string; categoryCode?: string }[] {
  if (!amenities) return [];

  return Object.entries(amenities).flatMap(([categoryCode, amenityCodes]) =>
    amenityCodes.map((amenityCode) => ({
      amenityCode,
      categoryCode,
    }))
  );
}

// Build room details payload
function buildRoomDetails(roomDetails: RoomDetails) {
  return {
    roomName: roomDetails.roomName,
    roomType: roomDetails.roomType,
    roomView: roomDetails.roomView,
    roomSize: roomDetails.roomSize,
    roomSizeUnit: roomDetails.roomSizeUnit,
    totalRooms: roomDetails.totalRooms,
    numberOfBathrooms: roomDetails.numberOfBathrooms,
    description: roomDetails.description,
  };
}

// Build sleeping arrangement payload
function buildSleepingArrangement(sa: RoomStateType["sleepingArrangement"]) {
  const standardBeds = sa.standardBeds.map((b) => ({
    bedType: b.bedType,
    numberOfBeds: b.numberOfBeds,
    standard: true,
  }));

  const alternateBeds = sa.alternateBeds.map((b) => ({
    bedType: b.bedType,
    numberOfBeds: b.numberOfBeds,
    standard: false,
  }));

  return {
    occupancy: {
      baseAdults: sa.baseAdults,
      maxAdults: sa.maxAdults,
      baseChildren: sa.baseChildren,
      maxChildren: sa.maxChildren,
      maxOccupancy: sa.maxOccupancy,
      extraBedAllowed: sa.canAccommodateExtraBed,
      alternateArrangement: sa.hasAlternateArrangement,
    },
    beds: [...standardBeds, ...alternateBeds],
  };
}

// Build amenities payload
function buildAmenities(amenities: Record<string, string[]>) {
  return {
    amenities: transformAmenitiesPayload(amenities),
  };
}

// Submit room details step
export async function submitPropertyInfoRoomDetailsStep(
  roomDetails: RoomDetails,
  hotelId: string,
  roomKey?: string
): Promise<{ roomKey: string }> {
  const payload: HotelRoomDetailsRequest = {
    roomKey,
    draft: false,
    roomDetails: buildRoomDetails(roomDetails),
    occupancy: {
      baseAdults: 0,
      maxAdults: 0,
      baseChildren: 0,
      maxChildren: 0,
      maxOccupancy: 0,
      extraBedAllowed: false,
      alternateArrangement: false,
    },
    beds: [],
    amenities: [],
  };

  const result = await adminService.createOrUpdateRoom(hotelId, payload);
  return result;
}

// Submit sleeping arrangement step
export async function submitPropertyInfoSleepingArrangementStep(
  state: RoomStateType,
  hotelId: string,
  roomKey?: string
): Promise<{ roomKey: string }> {
  const payload: HotelRoomDetailsRequest = {
    roomKey,
    draft: false,
    roomDetails: buildRoomDetails(state.roomDetails),
    ...buildSleepingArrangement(state.sleepingArrangement),
    amenities: [],
  };

  const result = await adminService.createOrUpdateRoom(hotelId, payload);
  return result;
}


// Submit room amenities step (final step)
export async function submitPropertyInfoRoomAmenitiesStep(
  state: RoomStateType,
  hotelId: string,
  roomKey?: string
): Promise<{ roomKey: string }> {
  const payload: HotelRoomDetailsRequest = {
    roomKey,
    draft: false,
    roomDetails: buildRoomDetails(state.roomDetails),
    ...buildSleepingArrangement(state.sleepingArrangement),
    ...buildAmenities(state.roomAmenities.selectedAmenities),
  };

  const result = await adminService.createOrUpdateRoom(hotelId, payload);
  return result;
}

