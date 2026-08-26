export type InclusionConfigurationType =
  | "NONE"
  | "MEAL"
  | "GENERIC"
  | "TRANSFER"
  | "TIME_OFFSET"
  | "ROOM_UPGRADE"
  | string;

export interface InclusionCatalogueItem {
  code: string;
  name: string;
  description: string | null;
  configurationType: InclusionConfigurationType;
}

export interface InclusionCatalogueCategory {
  code: string;
  name: string;
  sortOrder: number;
  inclusions: InclusionCatalogueItem[];
}

export interface InclusionCatalogueData {
  categories: InclusionCatalogueCategory[];
}

export type InclusionOfferType = "FREE" | "DISCOUNTED" | string;
export type InclusionAvailabilityType =
  | "GUARANTEED"
  | "SUBJECT_TO_AVAILABILITY"
  | string;
export type InclusionPaymentLocation = "NONE" | "PROPERTY" | string;
export type InclusionPricingUnit =
  | "PER_PERSON"
  | "PER_ROOM"
  | "PER_NIGHT"
  | "PER_STAY"
  | "PER_UNIT"
  | "PER_TRANSFER"
  | string;

/** POST /hotel/{hotelId}/inclusions */
export interface InclusionAssignment {
  roomKey: string;
  ratePlanIds: number[];
}

export interface CreateHotelInclusionRequest {
  inclusionCode: string;
  offerType: InclusionOfferType;
  paymentLocation: InclusionPaymentLocation;
  details: Record<string, unknown>;
  assignments: InclusionAssignment[];
  availabilityType?: InclusionAvailabilityType | null;
  price?: number | null;
  currency?: string | null;
  pricingUnit?: InclusionPricingUnit | null;
  validFrom?: string | null;
  validTo?: string | null;
}

/** @deprecated Prefer CreateHotelInclusionRequest for create */
export type CreateRatePlanInclusionRequest = Omit<
  CreateHotelInclusionRequest,
  "assignments"
>;

/** PUT update uses the same body without inclusionCode / assignments. */
export type UpdateRatePlanInclusionRequest = Omit<
  CreateRatePlanInclusionRequest,
  "inclusionCode"
>;

export interface EarlyCheckInDetails {
  hoursBeforeStandardCheckIn: number;
}

export interface LateCheckOutDetails {
  hoursAfterStandardCheckOut: number;
}

/** GET /hotel/{hotelId}/rooms/{roomKey}/rate-plans/{ratePlanId}/inclusions */
export interface RatePlanInclusionItem {
  id: number;
  code: string;
  name: string;
  category: string | null;
  offerType: InclusionOfferType;
  availabilityType: InclusionAvailabilityType | null;
  price: number | null;
  currency: string | null;
  pricingUnit: InclusionPricingUnit | null;
  paymentLocation: InclusionPaymentLocation | null;
  validFrom: string | null;
  validTo: string | null;
  details: Record<string, unknown>;
  active: boolean;
}

export interface RatePlanInclusionsData {
  ratePlanId: number;
  planCode: string | null;
  inclusions: RatePlanInclusionItem[];
}

export interface InclusionEditTarget {
  inclusionId: number;
  roomKey: string;
  ratePlanId: number;
  roomName: string;
  ratePlanName: string;
  item: RatePlanInclusionItem;
}

