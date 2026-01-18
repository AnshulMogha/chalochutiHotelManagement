import type {
  FormStateType,
  Amenity,
  LocationInfo,

  metaInfo,
  starRatingOptions,
  PoliciesInfo,
  FinanceAndLegalInfo,
  BasicInfo,
  RoomStateType,
} from "../types";
export type FormActionType =
  | {
      type: "UPDATE_FORM_DATA";
      payload: Partial<FormStateType>;
    }
  | {
      type: "HOTEL_NAME_CHANGE";
      payload: { name: string };
    }
  | {
      type: "STAR_RATING_CHANGE";
      payload: { starRating: starRatingOptions };
    }
  | {
      type: "BUILT_YEAR_CHANGE";
      payload: { builtYear: string };
    }
  | {
      type: "ACCEPTING_BOOKINGS_SINCE_CHANGE";
      payload: { acceptingBookingsSince: string };
    }
  | {
      type: "EMAIL_CHANGE";
      payload: { email: string };
    }
  | {
      type: "MOBILE_NUMBER_CHANGE";
      payload: { mobileNumber: string };
    }
  | {
      type: "LANDLINE_NUMBER_CHANGE";
      payload: { landlineNumber: string };
    }
  | {
      type: "SET_META_INFO";
      payload: { metaInfo: metaInfo };
    }
  | {
      type: "SET_LOCATION_INFO";
      payload: { locationInfo: LocationInfo };
    }
  | {
      type: "SET_COUNTRY";
      payload: { country: string };
    }
  | {
      type: "SET_STATE";
      payload: { state: string };
    }
  | {
      type: "SET_CITY";
      payload: { city: string };
    }
  | {
      type: "SET_PINCODE";
      payload: { pincode: string };
    }
  | {
      type: "SET_ADDRESS";
      payload: { address: string };
    }
  | {
      type: "SET_LOCALITY";
      payload: { locality: string };
    }
  | {
      type: "SET_LATITUDE";
      payload: { latitude: number };
    }
  | {
      type: "SET_LONGITUDE";
      payload: { longitude: number };
    }
  | {
      type: "SET_TOGGLED_HOTEL_AMENITY";
      payload: { amenityType: string; amenityId: string };
    }
  | {
      type: "SET_AVAILABLE_HOTEL_AMENITIES";
      payload: {
        availableAmenities: Amenity[];
        selectedAmenities: Record<string, string[]>;
      };
    }
  |{
      type: "SET_SELECTED_HOTEL_AMENITIES";
      payload: { selectedAmenities: Record<string, string[]> };
    }
  | {
      type: "SET_POLICIES_INFO";
      payload: { policiesInfo: PoliciesInfo };
    }
  | {
      type: "UPDATE_POLICY";
      payload: { key: keyof PoliciesInfo; value: any };
    }
  | {
      type: "SET_FINANCE_AND_LEGAL_INFO";
      payload: { financeAndLegalInfo: FinanceAndLegalInfo };
    }
  | {
      type: "UPDATE_GSTIN";
      payload: { gstin: string };
    }
  | {
      type: "SET_BASIC_INFO";
      payload: { basicInfo: BasicInfo };
    }
  | {
      type: "ROOM_INFO";
    };

export type RoomInfoActionType =
  | {
      type: "SET_ROOM_DETAILS";
      payload: { roomDetails: RoomStateType };
    }
  | {
      type: "SET_ROOM_TYPE";
      payload: { roomType: string };
    }
  | {
      type: "SET_ROOM_VIEW";
      payload: { roomView: string };
    }
  | {
      type: "SET_ROOM_SIZE";
      payload: { roomSize: number };
    }
  | {
      type: "SET_ROOM_SIZE_UNIT";
      payload: { roomSizeUnit: "SQFT" | "SQM" };
    }
  | {
      type: "SET_TOTAL_ROOMS";
      payload: { totalRooms: number };
    }
  | {
      type: "SET_ROOM_NAME";
      payload: { roomName: string };
    }
  | {
      type: "SET_DESCRIPTION";
      payload: { description: string };
    }
  | {
      type: "SET_ROOM_KEY";
      payload: { roomKey: string };
    }
  | {
      type: "SET_STANDARD_BEDS_TYPE";
      payload: { bedType: string; index: number };
    }
  | {
      type: "SET_NUMBER_OF_STANDARD_BEDS";
      payload: { numberOfBeds: number; index: number };
    }
  | {
      type: "ADD_STANDARD_BED";
    }
  | {
      type: "REMOVE_STANDARD_BED";
      payload: { index: number };
    }
  | {
      type: "SET_CAN_ACCOMMODATE_EXTRA_BED";
      payload: { canAccommodateExtraBed: boolean };
    }
  | {
      type: "SET_NUMBER_OF_EXTRA_BEDS";
      payload: { numberOfExtraBeds: number };
    }
  | {
      type: "SET_HAS_ALTERNATE_ARRANGEMENT";
      payload: { hasAlternateArrangement: boolean };
    }
  | {
      type: "SET_ALTERNATE_BEDS_TYPE";
      payload: { bedType: string; index: number };
    }
  | {
      type: "SET_NUMBER_OF_ALTERNATE_BEDS";
      payload: { numberOfBeds: number; index: number };
    }
  | {
      type: "ADD_ALTERNATE_BED";
    }
  | {
      type: "REMOVE_ALTERNATE_BED";
      payload: { index: number };
    }
  | {
      type: "SET_BASE_ADULTS";
      payload: { baseAdults: number };
    }
  | {
      type: "SET_MAX_ADULTS";
      payload: { maxAdults: number };
    }
  | {
      type: "SET_BASE_CHILDREN";
      payload: { baseChildren: number };
    }
  | {
      type: "SET_MAX_CHILDREN";
      payload: { maxChildren: number };
    }
  | {
      type: "SET_MAX_OCCUPANCY";
      payload: { maxOccupancy: number };
    }
  | {
      type: "SET_NUMBER_OF_BATHROOMS";
      payload: { numberOfBathrooms: number };
    }
  | {
      type: "SET_MEAL_PLAN";
      payload: { mealPlan: string };
    }
  | {
      type: "SET_BASE_RATE";
      payload: { baseRate: number };
    }
  | {
      type: "SET_EXTRA_ADULT_CHARGE";
      payload: { extraAdultCharge: number };
    }
  | {
      type: "SET_PAID_CHILD_CHARGE";
      payload: { paidChildCharge: number };
    }
  | {
      type: "SET_START_DATE";
      payload: { startDate: string };
    }
  | {
      type: "SET_END_DATE";
      payload: { endDate: string };
    }
  | {
      type: "SET_AVAILABLE_ROOM_AMENITIES";
      payload: {
        availableAmenities: Amenity[];
     
      };
    }
  | {
      type: "SET_TOGGLED_ROOM_AMENITY";
      payload: { categoryCode: string; amenityId: string };
    };