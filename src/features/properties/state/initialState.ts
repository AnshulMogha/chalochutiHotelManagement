import type { FormStateType, Errors, RoomStateType } from "../types";
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
export const initialState: FormStateType = {
  basicInfo: {
    name: "",
    starRating: null,
    builtYear: "",
    acceptingBookingsSince: "",
    email: "",
    mobileNumber: "",
    landlineNumber: "",
    ownerEmail: "",
    ownerFirstName: "",
    ownerLastName: "",
    ownerPhoneNumber: "",
  },
  metaInfo: {
    hotelId: "",
   
  },

  locationInfo: {
    latitude: DEFAULT_CENTER.lat,
    longitude: DEFAULT_CENTER.lng,
    address: "",
    locality: "",
    pincode: "",
    city: "",
    state: "",
    country: "",
  },
  amenitiesInfo: {
    availableAmenities: [],
    selectedAmenities: {},
  },
  policiesInfo: {
    checkinTime: "12:00",
    checkoutTime: "12:00",
    cancellationPolicy: "free_till_checkin",
    has24HourCheckin: undefined,
    allowUnmarriedCouples: undefined,
    allowGuestsBelow18: undefined,
    allowMaleOnlyGroups: undefined,
    acceptableIdentityProofs: [],
    smokingAllowed: undefined,
    privatePartiesAllowed: undefined,
    outsideVisitorsAllowed: undefined,
    wheelchairAccessible: undefined,
    petsAllowed: undefined,
    petsOnProperty: undefined,
    includeInfantWithoutOccupancy: undefined,
    provideInfantFood: undefined,
    extraBedIncludedInRates: undefined,
    bedToExtraAdults: undefined,
    bedToExtraKids: undefined,
    customPolicy: "",
    breakfastPrice: "",
    lunchPrice: "",
    dinnerPrice: "",
  },
  financeAndLegalInfo: {
    gstin: "",
  },
};

export const initialRoomState: RoomStateType = {
  roomDetails: {
    roomName: "",
    roomType: "",
    roomView: "",
    roomSize: 0,
    roomSizeUnit: "SQFT",
    totalRooms: 0,
    numberOfBathrooms: 1,
    description: "",
  },
 
  sleepingArrangement: {
    standardBeds: [{ bedType: "", numberOfBeds: 1 }],
    canAccommodateExtraBed: false,
    numberOfExtraBeds: 0,
    hasAlternateArrangement: false,
    alternateBeds: [],
    baseAdults: 0,
    maxAdults: 0,
    baseChildren: 0,
    maxChildren: 0,
    maxOccupancy: 0,
  },
  bathroomDetails: {
    numberOfBathrooms: 1,
  },
  mealPlanDetails: {
    mealPlan: "",
    baseRate: 0,
    extraAdultCharge: 0,
    paidChildCharge: 0,
    // today's date
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  },
  roomAmenities: {
    availableAmenities: [],
    selectedAmenities: {},
  },
};
export const errorsState: Errors = {
  basicInfo: {
    name: "",
    starRating: "",
    builtYear: "",
    acceptingBookingsSince: "",
    email: "",
    mobileNumber: "",
    landlineNumber: "",
    ownerEmail: "",
    ownerFirstName: "",
    ownerLastName: "",
    ownerPhoneNumber: "",
  },
  locationInfo: {
    address: "",
    locality: "",
    pincode: "",
    city: "",
    state: "",
    country: "",
  },
};
