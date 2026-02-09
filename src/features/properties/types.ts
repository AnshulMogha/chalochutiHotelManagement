export type starRatingOptions = 1 | 2 | 3 | 4 | 5 | null;

export interface BasicInfo {
  name: string;
  starRating: starRatingOptions;
  builtYear: string;
  acceptingBookingsSince: string;
  email: string;
  mobileNumber: string;
  landlineNumber: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhoneNumber: string;
}
export interface LocationInfo {
  latitude: number;
  longitude: number;
  address: string;
  locality: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
}
export interface AmenitiesInfo {
  availableAmenities: Amenity[];
  selectedAmenities: Record<string, string[]>;
  /** Flat list from API when room details only return amenityCode; mapped to selectedAmenities when availableAmenities load */
  selectedAmenityCodes?: string[];
}
export interface RoomDetails {
  roomName: string;
  roomType: string;
  roomView: string;
  roomSize: number;
  roomSizeUnit: "SQFT" | "SQM";
  totalRooms: number;
  numberOfBathrooms: number;
  description: string;
}

export interface PoliciesInfo {
  checkinTime: string;
  checkoutTime: string;
  cancellationPolicy: string;
  has24HourCheckin: boolean | undefined;
  allowUnmarriedCouples: boolean | undefined;
  allowGuestsBelow18: boolean | undefined;
  allowMaleOnlyGroups: boolean | undefined;
  acceptableIdentityProofs: string[];
  smokingAllowed: boolean | undefined;
  privatePartiesAllowed: boolean | undefined;
  outsideVisitorsAllowed: boolean | undefined;
  wheelchairAccessible: boolean | undefined;
  petsAllowed: boolean | undefined;
  petsOnProperty: boolean | undefined;
  includeInfantWithoutOccupancy: boolean | undefined;
  provideInfantFood: boolean | undefined;
  extraBedIncludedInRates: boolean | undefined;
  bedToExtraAdults: string | undefined;
  bedToExtraKids: string | undefined;
  customPolicy: string;
  breakfastPrice: string;
  lunchPrice: string;
  dinnerPrice: string;
}
export interface FinanceAndLegalInfo {
  gstin: string;
}
export type metaInfo = {
  hotelId: string;
};
export interface FormStateType {
  basicInfo: BasicInfo;
  metaInfo: metaInfo;
  locationInfo: LocationInfo;
  amenitiesInfo: AmenitiesInfo;
  policiesInfo: PoliciesInfo;
  financeAndLegalInfo: FinanceAndLegalInfo;
}
export interface BedArrangement {
  bedType: string;
  numberOfBeds: number;
}
export interface SleepingArrangement {
  standardBeds: BedArrangement[];
  canAccommodateExtraBed: boolean;
  numberOfExtraBeds: number;
  hasAlternateArrangement: boolean;
  alternateBeds: BedArrangement[];
  baseAdults: number;
  maxAdults: number;
  baseChildren: number;
  maxChildren: number;
  maxOccupancy: number;
}
export interface BathroomDetails {
  numberOfBathrooms: number;
}
export interface MealPlanDetails {
  mealPlan: string;
  baseRate: number;
  extraAdultCharge: number;
  paidChildCharge: number;
  startDate: string;
  endDate: string;
}
export interface RoomStateType {
  roomDetails: RoomDetails;

  sleepingArrangement: SleepingArrangement;
  bathroomDetails: BathroomDetails;
  mealPlanDetails: MealPlanDetails;
  roomAmenities: AmenitiesInfo;
}

export type StepKey =
  | "basicInfo"
  | "locationInfo"
  | "amenitiesInfo"
  | "policiesInfo"
  | "financeAndLegalInfo";

export type Errors = Partial<Record<StepKey, Record<string, string>>>;
export interface AmenityItem {
  id: string;
  label: string;
  icon: string; // emoji or icon string
}
export interface Amenity {
  categoryCode: string;
  categoryName: string;
  mandatory: boolean;
  items: AmenityItem[];
}
export type roomStepKeys =
  | "roomDetails"
  | "sleepingArrangement"
  | "bathroomDetails"
  | "mealPlanDetails"
  | "roomAmenities";
export type roomStepErrors = Partial<
  Record<roomStepKeys, Record<string, string>>
>;

// Hotel info type
export type HotelStatus = "DRAFT" | "UNDER_REVIEW" | "LIVE" | "REJECTED" | "SUSPENDED";

export interface HotelInfo {
  hotelId: string;
  hotelName: string;
  status: HotelStatus;
  currentStep: StepKey;
  locked: boolean;
}
export interface RoomList {
  roomKey: string;
  roomName: string;
  roomType: string;

  roomSize: number;
  roomSizeUnit: "SQFT" | "SQM";
  totalRooms: number;
  status: string;
  draft: boolean;
}
export interface HotelList {
  hotelId: string;
  hotelCode?: string;
  hotelName: string;
  status: HotelStatus;
  currentStep: string;
  locked: boolean;
  submittedAt?: string;
  requestedByEmail?: string;
  rejectionReason?: string;
}