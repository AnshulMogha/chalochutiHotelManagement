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
import type { FormActionType, RoomInfoActionType } from "./actions";

const updateFormData = (payload: Partial<FormStateType>): FormActionType => {
  return {
    type: "UPDATE_FORM_DATA" as const,
    payload,
  };
};
const changeHotelName = (value: string): FormActionType => {
  return {
    type: "HOTEL_NAME_CHANGE" as const,
    payload: { name: value },
  };
};
const changeStarRating = (value: starRatingOptions): FormActionType => {
  return {
    type: "STAR_RATING_CHANGE" as const,
    payload: { starRating: value },
  };
};
const changeBuiltYear = (value: string): FormActionType => {
  return {
    type: "BUILT_YEAR_CHANGE" as const,
    payload: { builtYear: value },
  };
};
const changeAcceptingBookingsSince = (value: string): FormActionType => {
  return {
    type: "ACCEPTING_BOOKINGS_SINCE_CHANGE" as const,
    payload: { acceptingBookingsSince: value },
  };
};
const changeEmail = (value: string): FormActionType => {
  return {
    type: "EMAIL_CHANGE" as const,
    payload: { email: value },
  };
};
const changeMobileNumber = (value: string): FormActionType => {
  return {
    type: "MOBILE_NUMBER_CHANGE" as const,
    payload: { mobileNumber: value },
  };
};
const changeLandlineNumber = (value: string): FormActionType => {
  return {
    type: "LANDLINE_NUMBER_CHANGE" as const,
    payload: { landlineNumber: value },
  };
};
const setMetaInfo = (value: metaInfo): FormActionType => {
  return {
    type: "SET_META_INFO" as const,
    payload: { metaInfo: value },
  };
};

const setCountry = (value: string): FormActionType => {
  return {
    type: "SET_COUNTRY" as const,
    payload: { country: value },
  };
};
const setState = (value: string): FormActionType => {
  return {
    type: "SET_STATE" as const,
    payload: { state: value },
  };
};
const setCity = (value: string): FormActionType => {
  return {
    type: "SET_CITY" as const,
    payload: { city: value },
  };
};
const setPincode = (value: string): FormActionType => {
  return {
    type: "SET_PINCODE" as const,
    payload: { pincode: value },
  };
};
const setAddress = (value: string): FormActionType => {
  return {
    type: "SET_ADDRESS" as const,
    payload: { address: value },
  };
};
const setLocality = (value: string): FormActionType => {
  return {
    type: "SET_LOCALITY" as const,
    payload: { locality: value },
  };
};
const setLatitude = (value: number): FormActionType => {
  return {
    type: "SET_LATITUDE" as const,
    payload: { latitude: value },
  };
};
const setLongitude = (value: number): FormActionType => {
  return {
    type: "SET_LONGITUDE" as const,
    payload: { longitude: value },
  };
};
const setLocationInfo = (value: LocationInfo): FormActionType => {
  return {
    type: "SET_LOCATION_INFO" as const,
    payload: { locationInfo: value },
  };
};
const setSelectedHotelAmenity = (
  value: string,
  amenityId: string
): FormActionType => {
  return {
    type: "SET_TOGGLED_HOTEL_AMENITY" as const,
    payload: { amenityType: value, amenityId: amenityId },
  };
};
const setAvailableHotelAmenities = (data: {
  availableAmenities: Amenity[];
  selectedAmenities: Record<string, string[]>;
}): FormActionType => {
  return {
    type: "SET_AVAILABLE_HOTEL_AMENITIES" as const,
    payload: {
      availableAmenities: data.availableAmenities,
      selectedAmenities: data.selectedAmenities,
    },
  };
};
const setSelectedHotelAmenities = (data: {
  selectedAmenities:Record<string, string[]>;
}): FormActionType => {
  return {
    type: "SET_SELECTED_HOTEL_AMENITIES" as const,
    payload: { selectedAmenities: data.selectedAmenities },
  };
};
  const setPoliciesInfo = (value: PoliciesInfo): FormActionType => {
  return {
    type: "SET_POLICIES_INFO" as const,
    payload: { policiesInfo: value },
  };
};
const updatePolicy = (key: keyof PoliciesInfo, value: any): FormActionType => {
  return {
    type: "UPDATE_POLICY" as const,
    payload: { key, value },
  };
};
const setFinanceAndLegalInfo = (value: FinanceAndLegalInfo): FormActionType => {
  return {
    type: "SET_FINANCE_AND_LEGAL_INFO" as const,
    payload: { financeAndLegalInfo: value },
  };
};
const updateGstin = (value: string): FormActionType => {
  return {
    type: "UPDATE_GSTIN" as const,
    payload: { gstin: value },
  };
};
const setBasicInfo = (value: BasicInfo): FormActionType => {
  return {
    type: "SET_BASIC_INFO" as const,
    payload: { basicInfo: value },
  };
};
export {
  updateFormData,
  changeHotelName,
  changeStarRating,
  changeBuiltYear,
  changeAcceptingBookingsSince,
  changeEmail,
  changeMobileNumber,
  changeLandlineNumber,
  setMetaInfo,
  setLocationInfo,
  setCountry,
  setState,
  setCity,
  setPincode,
  setAddress,
  setLocality,
  setLatitude,
  setLongitude,
  setSelectedHotelAmenity,
  setAvailableHotelAmenities,
  setSelectedHotelAmenities,
  setPoliciesInfo,
  updatePolicy,
  setFinanceAndLegalInfo,
  updateGstin,
  setBasicInfo,
};
// room details actions

const setRoomDetails = (value: RoomStateType): RoomInfoActionType => {
  return {
    type: "SET_ROOM_DETAILS" as const,
    payload: { roomDetails: value },
  };
};
const setRoomType = (value: string): RoomInfoActionType => {
  return {
    type: "SET_ROOM_TYPE" as const,
    payload: { roomType: value },
  };
};
const setRoomView = (value: string): RoomInfoActionType => {
  return {
    type: "SET_ROOM_VIEW" as const,
    payload: { roomView: value },
  };
};
const setRoomSize = (value: number): RoomInfoActionType => {
  return {
    type: "SET_ROOM_SIZE" as const,
    payload: { roomSize: value },
  };
};

const setRoomSizeUnit = (value: "SQFT" | "SQM"): RoomInfoActionType => {
  return {
    type: "SET_ROOM_SIZE_UNIT" as const,
    payload: { roomSizeUnit: value },
  };
};
const setRoomName = (value: string): RoomInfoActionType => {
  return {
    type: "SET_ROOM_NAME" as const,
    payload: { roomName: value },
  };
};
const setTotalRooms = (value: number): RoomInfoActionType => {
  return {
    type: "SET_TOTAL_ROOMS" as const,
    payload: { totalRooms: value },
  };
};
const setDescription = (value: string): RoomInfoActionType => {
  return {
    type: "SET_DESCRIPTION" as const,
    payload: { description: value },
  };
};
const setRoomKey = (value: string): RoomInfoActionType => {
  return {
    type: "SET_ROOM_KEY" as const,
    payload: { roomKey: value },
  };
};
const setStandardBedsType = (
  bedType: string,
  index: number
): RoomInfoActionType => {
  return {
    type: "SET_STANDARD_BEDS_TYPE" as const,
    payload: { bedType: bedType, index: index },
  };
};
const setNumberOfStandardBeds = (
  numberOfBeds: number,
  index: number
): RoomInfoActionType => {
  return {
    type: "SET_NUMBER_OF_STANDARD_BEDS" as const,
    payload: { numberOfBeds: numberOfBeds, index: index },
  };
};
const addStandardBed = (): RoomInfoActionType => {
  return {
    type: "ADD_STANDARD_BED" as const,
  };
};
const removeStandardBed = (index: number): RoomInfoActionType => {
  return {
    type: "REMOVE_STANDARD_BED" as const,
    payload: { index: index },
  };
};
const setCanAccommodateExtraBed = (canAccommodateExtraBed: boolean): RoomInfoActionType => {
  return {
    type: "SET_CAN_ACCOMMODATE_EXTRA_BED" as const,
    payload: { canAccommodateExtraBed: canAccommodateExtraBed },
  };
};
const setNumberOfExtraBeds = (numberOfExtraBeds: number): RoomInfoActionType => {
  return {
    type: "SET_NUMBER_OF_EXTRA_BEDS" as const,
    payload: { numberOfExtraBeds: numberOfExtraBeds },
  };
};
const setHasAlternateArrangement = (hasAlternateArrangement: boolean): RoomInfoActionType => {
  return {
    type: "SET_HAS_ALTERNATE_ARRANGEMENT" as const,
    payload: { hasAlternateArrangement: hasAlternateArrangement },
  };
};
const setAlternateBedsType = (bedType: string, index: number): RoomInfoActionType => {
  return {
    type: "SET_ALTERNATE_BEDS_TYPE" as const,
    payload: { bedType: bedType, index: index },
  };
};
const setNumberOfAlternateBeds = (numberOfBeds: number, index: number): RoomInfoActionType => {
  return {
    type: "SET_NUMBER_OF_ALTERNATE_BEDS" as const,
    payload: { numberOfBeds: numberOfBeds, index: index },
  };
};
const addAlternateBed = (): RoomInfoActionType => {
  return {
    type: "ADD_ALTERNATE_BED" as const,
  };
};
const removeAlternateBed = (index: number): RoomInfoActionType => {
  return {
    type: "REMOVE_ALTERNATE_BED" as const,
    payload: { index: index },
  };
};
const setBaseAdults = (baseAdults: number): RoomInfoActionType => {
  return {
    type: "SET_BASE_ADULTS" as const,
    payload: { baseAdults: baseAdults },
  };
};
const setMaxAdults = (maxAdults: number): RoomInfoActionType => {
  return {
    type: "SET_MAX_ADULTS" as const,
    payload: { maxAdults: maxAdults },
  };
};
const setBaseChildren = (baseChildren: number): RoomInfoActionType => {
  return {
    type: "SET_BASE_CHILDREN" as const,
    payload: { baseChildren: baseChildren },
  };
};
const setMaxChildren = (maxChildren: number): RoomInfoActionType => {
  return {
    type: "SET_MAX_CHILDREN" as const,
    payload: { maxChildren: maxChildren },
  };
};
const setMaxOccupancy = (maxOccupancy: number): RoomInfoActionType => {
  return {
    type: "SET_MAX_OCCUPANCY" as const,
    payload: { maxOccupancy: maxOccupancy },
  };
};
const setNumberOfBathrooms = (numberOfBathrooms: number): RoomInfoActionType => {
  return {
    type: "SET_NUMBER_OF_BATHROOMS" as const,
    payload: { numberOfBathrooms: numberOfBathrooms },
  };

};
const setMealPlan = (mealPlan: string): RoomInfoActionType => {
  return {
    type: "SET_MEAL_PLAN" as const,
    payload: { mealPlan: mealPlan },
  };
};
const setBaseRate = (baseRate: number): RoomInfoActionType => {
  return {
    type: "SET_BASE_RATE" as const,
    payload: { baseRate: baseRate },
  };
};
const setExtraAdultCharge = (extraAdultCharge: number): RoomInfoActionType => {
  return {
    type: "SET_EXTRA_ADULT_CHARGE" as const,
    payload: { extraAdultCharge: extraAdultCharge },
  };
};
const setPaidChildCharge = (paidChildCharge: number): RoomInfoActionType => {
  return {
    type: "SET_PAID_CHILD_CHARGE" as const,
    payload: { paidChildCharge: paidChildCharge },
  };
};
const setStartDate = (startDate: string): RoomInfoActionType => {
  return {
    type: "SET_START_DATE" as const,
    payload: { startDate: startDate },
  };
};
const setEndDate = (endDate: string): RoomInfoActionType => {
  return {
    type: "SET_END_DATE" as const,
    payload: { endDate: endDate },
  };
};
const setAvailableRoomAmenities = (data: {
  availableAmenities: Amenity[];
  
}): RoomInfoActionType => {
  return {
    type: "SET_AVAILABLE_ROOM_AMENITIES" as const,
    payload: { availableAmenities: data.availableAmenities },
  };
};
const setSelectedRoomAmenity = (categoryCode: string, amenityId: string): RoomInfoActionType => {
  return {
    type: "SET_TOGGLED_ROOM_AMENITY" as const,
    payload: { categoryCode: categoryCode, amenityId: amenityId },
  };
};
export {
  setRoomDetails,
  setRoomType,
  setRoomView,
  setRoomSize,
  setRoomSizeUnit,
  setRoomName,
  setTotalRooms,
  setDescription,
  setRoomKey,
  setStandardBedsType,
  setNumberOfStandardBeds,
  addStandardBed,
  removeStandardBed,
  setCanAccommodateExtraBed,
  setNumberOfExtraBeds,
  setHasAlternateArrangement,
  setAlternateBedsType,
  setNumberOfAlternateBeds,
  addAlternateBed,
  removeAlternateBed,
  setBaseAdults,
  setMaxAdults,
  setBaseChildren,
  setMaxChildren,
  setMaxOccupancy,
  setNumberOfBathrooms,
  setMealPlan,
  setBaseRate,
  setExtraAdultCharge,
  setPaidChildCharge,
  setStartDate,
  setEndDate,
  setAvailableRoomAmenities,
  setSelectedRoomAmenity,
};
