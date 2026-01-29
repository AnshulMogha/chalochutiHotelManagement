export type GenerateDraftHotelResponse = {
  hotelId: string;
  hotelCode: string;
};

export interface SubmitBasicInfoRequest {
  propertyName: string;
  starRating: number;
  yearBuilt: number;
  acceptingBookingsSince: number;
  contactEmail: string;
  mobileNumber: string;
  landlineNumber: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone: string;
  draft: boolean;
}

export interface SubmitLocationInfoRequest {
  latitude: number;
  longitude: number;
  houseBuildingApartmentNo: string;
  localityAreaStreetSector: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
  draft: boolean;
}

export interface SubmitAmenitiesInfoRequest {
  amenities: Record<string, string[]>;
  draft: boolean;
}
export type AmenityPayload = {
  amenityCode: string;
  categoryCode: string;
};

export interface SubmitRoomDetailsRequest {
  roomKey?: string;
  draft: boolean;

  roomDetails?: {
    roomName: string;
    roomType: string;
    roomView: string;
    roomSize: number;
    roomSizeUnit: "SQFT" | "SQM";
    totalRooms: number;
    description: string;
  };
  occupancy?: {
    baseAdults: number;
    maxAdults: number;
    baseChildren: number;
    maxChildren: number;
    maxOccupancy: number;
    extraBedAllowed: boolean;
    alternateArrangement: boolean;
  };
  beds?: {
    bedType: string;
    numberOfBeds: number;
    standard: boolean;
  }[];
  bathroom?: {
    numberOfBathrooms: number;
  };
  pricing?: {
    mealPlan: string;
    baseRate: number;
    extraAdultCharge: number;
    paidChildCharge: number;
    refundable: boolean;
  };

  inventory?: {
    startDate: string;
    endDate: string;
    availableRooms: number;
  };
  amenities?: AmenityPayload[];
}

export interface PolicyRule {
  category: string;
  ruleCode: string;
  value: string | number | boolean | string[];
  active: boolean;
}

export interface SubmitPoliciesRequest {
  draft: boolean;
  rules: PolicyRule[];
}

export interface SubmitFinanceAndLegalRequest {
  gstin: string;
  draft: boolean;
}

export interface GetFinanceAndLegalResponse {
  gstin: string;
  draft: boolean;
}

export interface GetAllBasicInfoResponse {
  propertyName: string;
  starRating: number;
  yearBuilt: number;
  acceptingBookingsSince: string;
  contactEmail: string;
  mobileNumber: string;
  landlineNumber: string;
  ownerEmail?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  // Some backends may still return `ownerPhoneNumber`; others may return `ownerPhone`.
  ownerPhoneNumber?: string;
  ownerPhone?: string;
  draft: boolean;
}

export interface GetOnboardingStatusResponse {
  hotelId: string;
  hotelName: string;
  status: string;
  currentStep: string;
  locked: boolean;
  submittedAt: string;
  requestedByEmail: string;
}

export interface RoomListResponse {
  roomOnboardingId: number;
  hotelId: string;
  draft: boolean;
  status: string;
  data: {
    roomKey: string;
    draft: boolean;
    roomDetails: {
      roomName: string;
      roomType: string;
      roomView: string;
      roomSize: number;
      roomSizeUnit: "SQFT" | "SQM";
      totalRooms: number;
      description: string;
    };
    // "occupancy": null,
    // "beds": null,
    // "bathroom": null,
    // "pricing": null,
    // "inventory": null,
    // "amenities": null
  };
}

export interface GetSelectedHotelAmenitiesResponse {
  amenities: Record<string, string[]>;
}

export interface LocationInfoResponse {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  draft: boolean;
  houseBuildingApartmentNo: string;
  localityAreaStreetSector: string;
  pincode: string;
  state: string;
}

export interface HotelListResponse {
  hotelId: string;
  hotelCode: string;
  hotelName: string;
  status: string;
  currentStep: string;
  locked: boolean;
  submittedAt?: string;
  requestedByEmail?: string;
  rejectionReason?: string | null;
}

export interface GetRoomDetailsResponse {
  roomOnboardingId: number;
  hotelId: string;
  draft: boolean;
  status: string;
  data: {
    roomKey: string;
    draft: boolean;
    roomDetails: null | {
      roomName: string;
      roomType: string;
      roomView: string;
      roomSize: number;
      roomSizeUnit: "SQFT" | "SQM";
      totalRooms: number;
      description: string;
    };
    occupancy: null | {
      baseAdults: number;
      maxAdults: number;
      baseChildren: number;
      maxChildren: number;
      maxOccupancy: number;
      extraBedAllowed: boolean;
      alternateArrangement: boolean;
    };
    beds:
      | null
      | {
          bedType: string;
          numberOfBeds: number;
          standard: boolean;
        }[];
    bathroom: null | {
      numberOfBathrooms: number;
    };
    pricing: null | {
      mealPlan: string;
      baseRate: number;
      extraAdultCharge: number;
      paidChildCharge: number;
      refundable: boolean;
    };
    inventory: null | {
      startDate: string;
      endDate: string;
      availableRooms: number;
    };
    amenities: AmenityPayload[];
  };
}

export interface UploadMediaRequest {
  media: File;
 
}

export interface UploadMediaResponse {
  mediaId: number;
  fileUrl: string;
  fileType: "IMAGE" | "VIDEO";
}
export interface AssignMediaRequest {
  entityType: string;
  entityId: string;
  cover: boolean;
  sortOrder: number;
}
export interface MediaResponse  {
  mediaId: number;
  fileUrl: string;
  fileType: "IMAGE" | "VIDEO";
  cover: boolean;
  sortOrder: number;
  tags: string[];
  rooms?: {
    roomId: string;
    roomName: string;
  }[];
  hotel?: {
    hotelId: string;
    hotelName: string;
  };
}
  