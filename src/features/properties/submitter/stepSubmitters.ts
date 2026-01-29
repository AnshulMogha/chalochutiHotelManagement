import {
  type BasicInfo,
  type LocationInfo,
  type metaInfo,
  type RoomDetails,
  type RoomStateType,
  type PoliciesInfo,
  type FinanceAndLegalInfo,
} from "../types";

import { propertyService } from "../services/propertyService";
import type { AmenityPayload, PolicyRule } from "../services/api.types";

async function submitBasicInfo(basicInfo: BasicInfo, metaInfo: metaInfo) {
  await propertyService.submitBasicInfo(
    {
      propertyName: basicInfo.name,
      starRating: Number(basicInfo.starRating),
      yearBuilt: Number(basicInfo.builtYear),
      acceptingBookingsSince: Number(basicInfo.acceptingBookingsSince),
      contactEmail: basicInfo.email,
      mobileNumber: basicInfo.mobileNumber,
      landlineNumber: basicInfo.landlineNumber,
      ownerEmail: basicInfo.ownerEmail,
      ownerFirstName: basicInfo.ownerFirstName,
      ownerLastName: basicInfo.ownerLastName,
      ownerPhone: basicInfo.ownerPhoneNumber,
      draft: false,
    },
    metaInfo.hotelId
  );
}
async function submitLocationInfo(
  locationInfo: LocationInfo,
  metaInfo: metaInfo
) {
  await propertyService.submitLocationInfo(
    {
      latitude: locationInfo.latitude,
      longitude: locationInfo.longitude,
      houseBuildingApartmentNo: locationInfo.address,
      localityAreaStreetSector: locationInfo.locality,
      pincode: locationInfo.pincode,
      city: locationInfo.city,
      state: locationInfo.state,
      country: locationInfo.country,
      draft: false,
    },
    metaInfo.hotelId
  );
}
function filterAmenitiesWithMoreThanOne(
  selectedAmenities: Record<string, string[]>
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(selectedAmenities).filter(([, values]) => values.length > 1)
  );
}

async function submitAmenitiesInfo(
  selectedAmenities: Record<string, string[]>,
  metaInfo: metaInfo
) {
  const filteredAmenities = filterAmenitiesWithMoreThanOne(selectedAmenities);

  await propertyService.submitAmenitiesInfo(
    {
      amenities: filteredAmenities,
      draft: false,
    },
    metaInfo.hotelId
  );
}

export {
  submitBasicInfo as submitBasicInfoStep,
  submitLocationInfo as submitLocationInfoStep,
  submitAmenitiesInfo as submitAmenitiesInfoStep,
};

// room step submitters
function buildRoomDetails(roomDetails: RoomDetails) {
  return {
    roomName: roomDetails.roomName,
    roomType: roomDetails.roomType,
    roomView: roomDetails.roomView,
    roomSize: roomDetails.roomSize,
    roomSizeUnit: roomDetails.roomSizeUnit,
    totalRooms: roomDetails.totalRooms,
    description: roomDetails.description,
  };
}

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

function buildBathroom(bathroom: RoomStateType["bathroomDetails"]) {
  return {
    bathroom: {
      numberOfBathrooms: bathroom.numberOfBathrooms,
    },
  };
}

function buildMealPlan(meal: RoomStateType["mealPlanDetails"], roomDetails: RoomDetails) {
  return {
    pricing: {
      mealPlan: meal.mealPlan,
      baseRate: meal.baseRate,
      extraAdultCharge: meal.extraAdultCharge,
      paidChildCharge: meal.paidChildCharge,
      refundable: false,
    },
    inventory: {
      startDate: meal.startDate,
      endDate: meal.endDate,
      availableRooms: roomDetails.totalRooms,
    },
  };
}
function transformAmenitiesPayload(
  amenities?: Record<string, string[]>
): AmenityPayload[] {
  if (!amenities) return [];

  return Object.entries(amenities).flatMap(([categoryCode, amenityCodes]) =>
    amenityCodes.map((amenityCode) => ({
      amenityCode,
      categoryCode,
    }))
  );
}
function buildAmenities(amenities: Record<string, string[]>) {
  return {
    amenities: transformAmenitiesPayload(
      filterAmenitiesWithMoreThanOne(amenities)
    ),
  };
}
async function submitRoomDetailsStep(
  roomDetails: RoomDetails,
  metaInfo: metaInfo,
  roomKey?: string
) {
  return propertyService.submitRoomDetails(
    {
      roomKey,
      roomDetails: buildRoomDetails(roomDetails),
      draft: true,
    },
    metaInfo.hotelId
  );
}
async function submitSleepingArrangementStep(
  state: RoomStateType,
  metaInfo: metaInfo,
  roomKey?: string
) {
  return propertyService.submitRoomDetails(
    {
      roomKey,
      roomDetails: buildRoomDetails(state.roomDetails),
      ...buildSleepingArrangement(state.sleepingArrangement),
      draft: true,
    },
    metaInfo.hotelId
  );
}
async function submitBathroomDetailsStep(
  state: RoomStateType,
  metaInfo: metaInfo,
  roomKey?: string
) {
  return propertyService.submitRoomDetails(
    {
      roomKey,
      roomDetails: buildRoomDetails(state.roomDetails),
      ...buildSleepingArrangement(state.sleepingArrangement),
      ...buildBathroom(state.bathroomDetails),
      draft: true,
    },
    metaInfo.hotelId
  );
}
async function submitMealPlanStep(
  state: RoomStateType,
  metaInfo: metaInfo,
  roomKey?: string
) {
  return propertyService.submitRoomDetails(
    {
      roomKey,
      roomDetails: buildRoomDetails(state.roomDetails),
      ...buildSleepingArrangement(state.sleepingArrangement),
      ...buildBathroom(state.bathroomDetails),
      ...buildMealPlan(state.mealPlanDetails, state.roomDetails),
      draft: true,
    },
    metaInfo.hotelId
  );
}
async function submitRoomAmenitiesStep(
  state: RoomStateType,
  metaInfo: metaInfo,
  roomKey?: string
) {
  return propertyService.submitRoomDetails(
    {
      roomKey,
      roomDetails: buildRoomDetails(state.roomDetails),
      ...buildSleepingArrangement(state.sleepingArrangement),
      ...buildBathroom(state.bathroomDetails),
      ...buildMealPlan(state.mealPlanDetails, state.roomDetails),
      ...buildAmenities(state.roomAmenities.selectedAmenities),
      draft: false,
    },
    metaInfo.hotelId
  );
}

// Helper function to map cancellation policy to hours
function mapCancellationPolicyToHours(policy: string): number | null {
  const policyMap: Record<string, number> = {
    free_till_checkin: 0,
    free_24h: 24,
    free_48h: 48,
    free_72h: 72,
    free_7d: 168, // 7 days = 168 hours
    non_refundable: -1,
  };
  return policyMap[policy] ?? null;
}

// Helper function to map identity proof values to API format
function mapIdentityProofs(proofs: string[]): string[] {
  const proofMap: Record<string, string> = {
    aadhar: "AADHAR",
    passport: "PASSPORT",
    driving_license: "DRIVING_LICENSE",
    voter_id: "VOTER_ID",
    pan_card: "PAN_CARD",
  };
  return proofs.map((proof) => proofMap[proof] || proof.toUpperCase());
}

// Transform policies data to API format
function transformPoliciesToRules(policiesInfo: PoliciesInfo): PolicyRule[] {
  const rules: PolicyRule[] = [];

  // Check-in & Check-out Times
  if (policiesInfo.checkinTime) {
    rules.push({
      category: "CHECKIN_CHECKOUT",
      ruleCode: "CHECKIN_TIME",
      value: policiesInfo.checkinTime,
      active: true,
    });
  }

  if (policiesInfo.checkoutTime) {
    rules.push({
      category: "CHECKIN_CHECKOUT",
      ruleCode: "CHECKOUT_TIME",
      value: policiesInfo.checkoutTime,
      active: true,
    });
  }

  if (policiesInfo.has24HourCheckin !== undefined) {
    rules.push({
      category: "CHECKIN_CHECKOUT",
      ruleCode: "TWENTY_FOUR_HOUR_CHECKIN",
      value: policiesInfo.has24HourCheckin,
      active: true,
    });
  }

  // Cancellation Policy
  if (policiesInfo.cancellationPolicy) {
    const hours = mapCancellationPolicyToHours(policiesInfo.cancellationPolicy);
    if (hours !== null && hours >= 0) {
      rules.push({
        category: "CANCELLATION",
        ruleCode: "FREE_CANCEL_BEFORE_HOURS",
        value: hours,
        active: true,
      });
    }
  }

  // Meal Prices
  if (
    policiesInfo.breakfastPrice &&
    policiesInfo.breakfastPrice.trim() !== ""
  ) {
    rules.push({
      category: "MEAL_POLICY",
      ruleCode: "BREAKFAST_PRICE",
      value: Number(policiesInfo.breakfastPrice),
      active: true,
    });
  }

  if (policiesInfo.lunchPrice && policiesInfo.lunchPrice.trim() !== "") {
    rules.push({
      category: "MEAL_POLICY",
      ruleCode: "LUNCH_PRICE",
      value: Number(policiesInfo.lunchPrice),
      active: true,
    });
  }

  if (policiesInfo.dinnerPrice && policiesInfo.dinnerPrice.trim() !== "") {
    rules.push({
      category: "MEAL_POLICY",
      ruleCode: "DINNER_PRICE",
      value: Number(policiesInfo.dinnerPrice),
      active: true,
    });
  }

  // Extra Bed Policies
  if (policiesInfo.bedToExtraAdults !== undefined) {
    const value =
      policiesInfo.bedToExtraAdults === "yes"
        ? true
        : policiesInfo.bedToExtraAdults === "no"
        ? false
        : policiesInfo.bedToExtraAdults === "subject_to_availability"
        ? true
        : false;
    rules.push({
      category: "EXTRA_BED",
      ruleCode: "EXTRA_BED_ADULT_ALLOWED",
      value: value,
      active: true,
    });
  }

  if (policiesInfo.bedToExtraKids !== undefined) {
    const value =
      policiesInfo.bedToExtraKids === "yes"
        ? true
        : policiesInfo.bedToExtraKids === "no"
        ? false
        : policiesInfo.bedToExtraKids === "subject_to_availability"
        ? true
        : false;
    rules.push({
      category: "EXTRA_BED",
      ruleCode: "EXTRA_BED_CHILD_ALLOWED",
      value: value,
      active: true,
    });
  }

  if (policiesInfo.extraBedIncludedInRates !== undefined) {
    rules.push({
      category: "EXTRA_BED",
      ruleCode: "EXTRA_BED_INCLUDED_IN_RATE",
      value: policiesInfo.extraBedIncludedInRates,
      active: true,
    });
  }

  // Infant Policy
  if (policiesInfo.includeInfantWithoutOccupancy !== undefined) {
    rules.push({
      category: "INFANT_POLICY",
      ruleCode: "INFANT_ALLOWED_FREE",
      value: policiesInfo.includeInfantWithoutOccupancy,
      active: true,
    });
  }

  if (policiesInfo.provideInfantFood !== undefined) {
    rules.push({
      category: "INFANT_POLICY",
      ruleCode: "INFANT_COMPLIMENTARY_FOOD",
      value: policiesInfo.provideInfantFood,
      active: true,
    });
  }

  // Pet Policy
  if (policiesInfo.petsAllowed !== undefined) {
    rules.push({
      category: "PET_POLICY",
      ruleCode: "PETS_ALLOWED",
      value: policiesInfo.petsAllowed,
      active: true,
    });
  }

  if (policiesInfo.petsOnProperty !== undefined) {
    rules.push({
      category: "PET_POLICY",
      ruleCode: "PETS_LIVING_ON_PROPERTY",
      value: policiesInfo.petsOnProperty,
      active: true,
    });
  }

  // Property Restrictions
  if (policiesInfo.smokingAllowed !== undefined) {
    rules.push({
      category: "PROPERTY_RESTRICTIONS",
      ruleCode: "SMOKING_ALLOWED",
      value: policiesInfo.smokingAllowed,
      active: true,
    });
  }

  if (policiesInfo.privatePartiesAllowed !== undefined) {
    rules.push({
      category: "PROPERTY_RESTRICTIONS",
      ruleCode: "PRIVATE_PARTIES_ALLOWED",
      value: policiesInfo.privatePartiesAllowed,
      active: true,
    });
  }

  if (policiesInfo.outsideVisitorsAllowed !== undefined) {
    rules.push({
      category: "PROPERTY_RESTRICTIONS",
      ruleCode: "OUTSIDE_VISITORS_ALLOWED",
      value: policiesInfo.outsideVisitorsAllowed,
      active: true,
    });
  }

  if (policiesInfo.wheelchairAccessible !== undefined) {
    rules.push({
      category: "PROPERTY_RESTRICTIONS",
      ruleCode: "WHEELCHAIR_ACCESSIBLE",
      value: policiesInfo.wheelchairAccessible,
      active: true,
    });
  }

  // Guest Profile
  if (policiesInfo.allowUnmarriedCouples !== undefined) {
    rules.push({
      category: "GUEST_PROFILE",
      ruleCode: "UNMARRIED_COUPLES_ALLOWED",
      value: policiesInfo.allowUnmarriedCouples,
      active: true,
    });
  }

  if (policiesInfo.allowGuestsBelow18 !== undefined) {
    rules.push({
      category: "GUEST_PROFILE",
      ruleCode: "BELOW_18_ALLOWED",
      value: policiesInfo.allowGuestsBelow18,
      active: true,
    });
  }

  if (policiesInfo.allowMaleOnlyGroups !== undefined) {
    rules.push({
      category: "GUEST_PROFILE",
      ruleCode: "ONLY_MALE_GROUP_ALLOWED",
      value: policiesInfo.allowMaleOnlyGroups,
      active: true,
    });
  }

  // Identity Proof
  if (
    policiesInfo.acceptableIdentityProofs &&
    policiesInfo.acceptableIdentityProofs.length > 0
  ) {
    rules.push({
      category: "IDENTITY_PROOF",
      ruleCode: "ACCEPTABLE_ID_PROOFS",
      value: mapIdentityProofs(policiesInfo.acceptableIdentityProofs),
      active: true,
    });
  }

  // Custom Policy
  if (policiesInfo.customPolicy && policiesInfo.customPolicy.trim() !== "") {
    rules.push({
      category: "CUSTOM_POLICY",
      ruleCode: "CUSTOM_POLICY_TEXT",
      value: policiesInfo.customPolicy,
      active: true,
    });
  }

  return rules;
}

async function submitPoliciesStep(
  policiesInfo: PoliciesInfo,
  metaInfo: metaInfo
) {
  const rules = transformPoliciesToRules(policiesInfo);
  await propertyService.submitPolicies(
    {
      draft: false,
      rules,
    },
    metaInfo.hotelId
  );
}

async function submitFinanceAndLegalStep(
  financeAndLegalInfo: FinanceAndLegalInfo,
  metaInfo: metaInfo
) {
  await propertyService.submitFinanceAndLegal(
    {
      gstin: financeAndLegalInfo.gstin.toUpperCase(),
      draft: false,
    },
    metaInfo.hotelId
  );
}

export {
  submitRoomDetailsStep,
  submitSleepingArrangementStep,
  submitBathroomDetailsStep,
  submitMealPlanStep,
  submitRoomAmenitiesStep,
  submitPoliciesStep,
  submitFinanceAndLegalStep,
};
