import { mapZodErrorsFlat } from "@/utils/mapZodErrors";
import type {
  AmenitiesInfo,
  BasicInfo,
  LocationInfo,
  MealPlanDetails,
  RoomDetails,
  SleepingArrangement,
  PoliciesInfo,
  FinanceAndLegalInfo,
} from "../types";
import basicInfoSchema from "../validator/basicInfo.schema";
import locationInfoSchema from "../validator/loacationInfo.schema";
import roomDetailsSchema from "../validator/roomStepValidators/roomDetails.schema";
import mealPlanDetailsSchema from "../validator/roomStepValidators/mealPlanDetailsSchema";
import { financeAndLegalSchema } from "../validator/financeAndLegal.schema";

const basicInfoValidator = (basicInfo: BasicInfo) => {
  const result = basicInfoSchema.safeParse(basicInfo);
  if (!result.success) {
    const parsedErrors = mapZodErrorsFlat(result.error);
    return parsedErrors;
  }
  return null;
};

const locationValidator = (locationInfo: LocationInfo) => {
  const result = locationInfoSchema.safeParse(locationInfo);
  if (!result.success) {
    const parsedErrors = mapZodErrorsFlat(result.error);
    return parsedErrors;
  }
  return null;
};

const amenitiesValidator = (amenitiesInfo: AmenitiesInfo) => {
  const errors: Record<string, string> = {};

  amenitiesInfo.availableAmenities.forEach((category) => {
    if (!category.mandatory) return;

    const selected =
      amenitiesInfo.selectedAmenities[category.categoryCode] ?? [];

    if (selected.length === 0) {
      errors[category.categoryCode] = `${category.categoryName} is required`;
    }
  });

  return Object.keys(errors).length > 0 ? errors : null;
};
const policiesValidator = (policiesInfo: PoliciesInfo) => {
  const errors: Record<string, string> = {};

  // Check-in and Check-out times are required
  if (!policiesInfo.checkinTime || policiesInfo.checkinTime.trim() === "") {
    errors.checkinTime = "Check-in time is required";
  }
  if (!policiesInfo.checkoutTime || policiesInfo.checkoutTime.trim() === "") {
    errors.checkoutTime = "Check-out time is required";
  }

  // Cancellation policy is required
  if (
    !policiesInfo.cancellationPolicy ||
    policiesInfo.cancellationPolicy.trim() === ""
  ) {
    errors.cancellationPolicy = "Cancellation policy is required";
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

const financeAndLegalValidator = (financeAndLegalInfo: FinanceAndLegalInfo) => {
  const result = financeAndLegalSchema.safeParse(financeAndLegalInfo);
  if (!result.success) {
    return mapZodErrorsFlat(result.error);
  }
  return null;
};

export { basicInfoValidator, locationValidator, amenitiesValidator, policiesValidator, financeAndLegalValidator };

// room step validators
const roomDetailsValidator = (roomDetails: RoomDetails) => {
  const result = roomDetailsSchema.safeParse(roomDetails);
  if (!result.success) {
    const parsedErrors = mapZodErrorsFlat(result.error);
    return parsedErrors;
  }
  return null;
};

export const sleepingArrangementValidator = (
  sleepingArrangement: SleepingArrangement
) => {
  const errors: Record<string, string> = {};

  /* =====================================================
     REQUIRED STRUCTURE VALIDATIONS
     ===================================================== */

  // 1️⃣ Standard beds
  if (sleepingArrangement.standardBeds.length === 0) {
    errors.standardBeds = "At least one standard bed is required.";
  } else {
    const invalidIndex = sleepingArrangement.standardBeds.findIndex(
      (bed) => bed.bedType === "" || bed.numberOfBeds < 1
    );

    if (invalidIndex !== -1) {
      errors.standardBeds =
        `Bed must have a bed type and quantity of at least 1.|${invalidIndex}`;
    }
  }

  // 2️⃣ Extra beds
  if (
    sleepingArrangement.canAccommodateExtraBed &&
    sleepingArrangement.numberOfExtraBeds < 1
  ) {
    errors.numberOfExtraBeds =
      "Please specify number of extra beds.";
  }

  // 3️⃣ Alternate arrangement
  if (sleepingArrangement.hasAlternateArrangement) {
    if (sleepingArrangement.alternateBeds.length === 0) {
      errors.alternateBeds =
        "At least one alternate bed is required.";
    } else {
      const invalidIndex = sleepingArrangement.alternateBeds.findIndex(
        (bed) => bed.bedType === "" || bed.numberOfBeds < 1
      );

      if (invalidIndex !== -1) {
        errors.alternateBeds =
          `Alternate bed must have a bed type and quantity of at least 1.|${invalidIndex}`;
      }
    }
  }

  /* =====================================================
     OCCUPANCY VALIDATIONS
     ===================================================== */

  // Occupancy is prefilled from the beds, then the user can adjust it.
  // Do not require an exact match to the bed total — that blocked Next when
  // a room had two beds and a different valid occupancy.
  if (sleepingArrangement.baseAdults < 1) {
    errors.baseAdults = "Base adults must be at least 1.";
  } else if (sleepingArrangement.baseAdults > sleepingArrangement.maxAdults) {
    errors.baseAdults =
      "Base adults cannot be more than maximum adults.";
  }

  if (sleepingArrangement.maxAdults < 1) {
    errors.maxAdults = "Maximum adults must be at least 1.";
  } else if (sleepingArrangement.maxAdults > sleepingArrangement.maxOccupancy) {
    errors.maxAdults =
      "Maximum adults cannot be more than maximum occupancy.";
  }

  if (sleepingArrangement.maxOccupancy < 1) {
    errors.maxOccupancy = "Maximum occupancy must be at least 1.";
  }

  // Ensure max children < max occupancy (at least 1 adult required)
  if (
    sleepingArrangement.maxOccupancy > 0 &&
    sleepingArrangement.maxChildren >= sleepingArrangement.maxOccupancy
  ) {
    errors.maxChildren =
      "Maximum children must be less than maximum occupancy (at least 1 adult is required).";
  }

  // Ensure base children <= max children
  if (
    sleepingArrangement.baseChildren >
    sleepingArrangement.maxChildren
  ) {
    errors.baseChildren =
      "Base children cannot be more than maximum children.";
  }

  /* =====================================================
     RESULT
     ===================================================== */

  return Object.keys(errors).length > 0 ? errors : null;
};

export const mealPlanValidator = (mealPlanDetails: MealPlanDetails) => {
  const result = mealPlanDetailsSchema.safeParse(mealPlanDetails);
  if (!result.success) {
    const parsedErrors = mapZodErrorsFlat(result.error);
    return parsedErrors;
  }
  return null;
};
export { roomDetailsValidator };
export { documentsValidator } from "../validator/onboardingDocuments";
