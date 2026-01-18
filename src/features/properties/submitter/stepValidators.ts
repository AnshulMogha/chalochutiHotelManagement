import { mapZodErrorsFlat } from "@/utils/mapZodErrors";
import type {
  AmenitiesInfo,
  BasicInfo,
  BedArrangement,
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
import { roomCapacityOptions } from "../components/steps/RoomsSteps/constants/roomBedsOptions";
import mealPlanDetailsSchema from "../validator/roomStepValidators/mealPlanDetailsSchema";

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
  const errors: Record<string, string> = {};

  // GSTIN validation: 15 characters, alphanumeric
  // const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!financeAndLegalInfo.gstin || financeAndLegalInfo.gstin.trim() === "") {
    errors.gstin = "GSTIN is required";
  } 

  return Object.keys(errors).length > 0 ? errors : null;
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

//
type Capacity = {
  baseAdults: number;
  maxAdults: number;
  baseChildren: number;
  maxChildren: number;
  maxOccupancy: number;
};

function calculateStandardCapacity(beds: BedArrangement[]): Capacity {
  return beds.reduce(
    (acc, bed) => {
      const cap =
        roomCapacityOptions[bed.bedType as keyof typeof roomCapacityOptions];
      if (!cap || bed.numberOfBeds <= 0) return acc;

      acc.baseAdults += cap.baseAdults * bed.numberOfBeds;
      acc.maxAdults += cap.maxAdults * bed.numberOfBeds;
      acc.baseChildren += cap.baseChildren * bed.numberOfBeds;
      acc.maxChildren += cap.maxChildren * bed.numberOfBeds;
      acc.maxOccupancy += cap.maxOccupancy * bed.numberOfBeds;

      return acc;
    },
    {
      baseAdults: 0,
      maxAdults: 0,
      baseChildren: 0,
      maxChildren: 0,
      maxOccupancy: 0,
    }
  );
}
function calculateExtraBedCapacity(
  canAccommodateExtraBed: boolean,
  numberOfExtraBeds: number
): Capacity {
  if (!canAccommodateExtraBed || numberOfExtraBeds <= 0) {
    return {
      baseAdults: 0,
      maxAdults: 0,
      baseChildren: 0,
      maxChildren: 0,
      maxOccupancy: 0,
    };
  }

  return {
    baseAdults: 0,
    maxAdults: numberOfExtraBeds,
    baseChildren: 0,
    maxChildren: numberOfExtraBeds,
    maxOccupancy: numberOfExtraBeds,
  };
}

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
        `Bed must have a bed type and quantity of at least 1.${invalidIndex}`;
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
          `Alternate bed must have a bed type and quantity of at least 1.${invalidIndex}`;
      }
    }
  }

  /* =====================================================
     CAPACITY CALCULATION (STANDARD + EXTRA ONLY)
     ===================================================== */

  const standardCapacity = calculateStandardCapacity(
    sleepingArrangement.standardBeds
  );

  const extraCapacity = calculateExtraBedCapacity(
    sleepingArrangement.canAccommodateExtraBed,
    sleepingArrangement.numberOfExtraBeds
  );

  const totalCapacity: Capacity = {
    baseAdults: standardCapacity.baseAdults + extraCapacity.baseAdults,
    maxAdults: standardCapacity.maxAdults + extraCapacity.maxAdults,
    baseChildren:
      standardCapacity.baseChildren + extraCapacity.baseChildren,
    maxChildren:
      standardCapacity.maxChildren + extraCapacity.maxChildren,
    maxOccupancy:
      standardCapacity.maxOccupancy + extraCapacity.maxOccupancy,
  };

  /* =====================================================
     OCCUPANCY VALIDATIONS
     ===================================================== */

  // Base ≤ Max
  if (sleepingArrangement.baseAdults > sleepingArrangement.maxAdults) {
    errors.baseAdults =
      "Base adults cannot be more than maximum adults.";
  }

  if (
    sleepingArrangement.baseChildren >
    sleepingArrangement.maxChildren
  ) {
    errors.baseChildren =
      "Base children cannot be more than maximum children.";
  }

  // Capacity limits
  if (sleepingArrangement.maxAdults > totalCapacity.maxAdults) {
    errors.maxAdults =
      "Maximum adults exceed bed capacity.";
  }

  if (sleepingArrangement.maxChildren > totalCapacity.maxChildren) {
    errors.maxChildren =
      "Maximum children exceed bed capacity.";
  }

  // Children < Occupancy
  if (
    sleepingArrangement.maxChildren >=
    sleepingArrangement.maxOccupancy
  ) {
    errors.maxChildren =
      "Maximum children must be less than maximum occupancy.";
  }

  // Occupancy math
  if (
    sleepingArrangement.maxOccupancy !==
    sleepingArrangement.maxAdults +
      sleepingArrangement.maxChildren
  ) {
    errors.maxOccupancy =
      "Maximum occupancy must equal max adults + max children.";
  }

  // Occupancy capacity
  if (
    sleepingArrangement.maxOccupancy >
    totalCapacity.maxOccupancy
  ) {
    errors.maxOccupancy =
      "Maximum occupancy exceeds bed capacity.";
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
