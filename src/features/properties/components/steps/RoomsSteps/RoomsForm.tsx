import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// import your step components here
import { RoomDetailsStep } from "./steps/RoomDetailsStep";
import { useFormContext } from "@/features/properties/context/useFormContext";
import type { roomStepErrors } from "@/features/properties/types";
import {
  amenitiesValidator,
  mealPlanValidator,
  roomDetailsValidator,
  sleepingArrangementValidator,
} from "@/features/properties/submitter/stepValidators";
import {
  submitBathroomDetailsStep,
  submitMealPlanStep,
  submitRoomAmenitiesStep,
  submitRoomDetailsStep,
  submitSleepingArrangementStep,
} from "@/features/properties/submitter/stepSubmitters";

import { SleepingArrangementStep } from "./steps/SleepingArrangementStep";
import { BathroomDetailsStep } from "./steps/BathroomDetailsStep";
import { MealPlanStep } from "./steps/MealPlanStep";
import { RoomAmenitiesStep } from "./steps/RoomAmenitiesStep";
import { useSearchParams } from "react-router";
import { propertyService } from "@/features/properties/services/propertyService";
import { setRoomDetails } from "@/features/properties/state/actionCreators";

interface RoomsFormProps {
  mode: "CREATE" | "EDIT";
  editingRoomKey?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const steps = [
  { id: 1, name: "Room Details" },
  { id: 2, name: "Sleeping Arrangement" },
  { id: 3, name: "Bathroom Details" },
  { id: 4, name: "Meal Plan & Pricing" },
  { id: 5, name: "Room Amenities" },
];

export function RoomsForm({
  mode,
  editingRoomKey,
  onCancel,
  onSuccess,
}: RoomsFormProps) {
  const [ongoingStep, setOngoingStep] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState(0);

  const { roomDetailsState, setRoomDetailsState } = useFormContext();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("draftId");
  const [errors, setErrors] = useState<roomStepErrors>({});
  const [roomKey, setRoomKey] = useState<string | undefined>(
    mode === "CREATE" ? undefined : editingRoomKey
  );
  useEffect(() => {
    async function fetchRoomDetails() {
      const response = await propertyService.getRoomDetails(
        hotelId!,
        editingRoomKey!
      );
      const selectedAmenities = response.data.amenities.reduce<
        Record<string, string[]>
      >((acc, item) => {
        if (!acc[item.categoryCode]) {
          acc[item.categoryCode] = [];
        }
        acc[item.categoryCode].push(item.amenityCode);
        return acc;
      }, {} as Record<string, string[]>);
      console.log(selectedAmenities);
      setRoomDetailsState(
        setRoomDetails({
          roomDetails: {
            roomName: response.data.roomDetails?.roomName || "",
            roomType: response.data.roomDetails?.roomType || "",
            roomView: response.data.roomDetails?.roomView || "",
            roomSize: response.data.roomDetails?.roomSize || 0,
            roomSizeUnit: response.data.roomDetails?.roomSizeUnit || "SQFT",
            totalRooms: response.data.roomDetails?.totalRooms || 0,
            description: response.data.roomDetails?.description || "",
          },
          sleepingArrangement: {
            standardBeds:
              response.data.beds
                ?.filter((bed) => bed.standard)
                .map((bed) => ({
                  bedType: bed.bedType,
                  numberOfBeds: bed.numberOfBeds,
                })) || [],
            canAccommodateExtraBed:
              response.data.occupancy?.extraBedAllowed || false,
            numberOfExtraBeds: response.data.occupancy?.maxOccupancy || 0,
            hasAlternateArrangement:
              response.data.occupancy?.alternateArrangement || false,
            alternateBeds:
              response.data.beds
                ?.filter((bed) => !bed.standard)
                .map((bed) => ({
                  bedType: bed.bedType,
                  numberOfBeds: bed.numberOfBeds,
                })) || [],
            baseAdults: response.data.occupancy?.baseAdults || 0,
            maxAdults: response.data.occupancy?.maxAdults || 0,
            baseChildren: response.data.occupancy?.baseChildren || 0,
            maxChildren: response.data.occupancy?.maxChildren || 0,
            maxOccupancy: response.data.occupancy?.maxOccupancy || 0,
          },
          bathroomDetails: {
            numberOfBathrooms: response.data.bathroom?.numberOfBathrooms || 0,
          },
          mealPlanDetails: {
            mealPlan: response.data.pricing?.mealPlan || "",
            baseRate: response.data.pricing?.baseRate || 0,
            extraAdultCharge: response.data.pricing?.extraAdultCharge || 0,
            paidChildCharge: response.data.pricing?.paidChildCharge || 0,

            startDate: response.data.inventory?.startDate || "",
            endDate: response.data.inventory?.endDate || "",
          },
          roomAmenities: {
            availableAmenities: [],
            selectedAmenities: selectedAmenities,
          },
        })
      );

    }
    if (editingRoomKey && hotelId) {
      fetchRoomDetails();
    }
  }, [editingRoomKey, hotelId, setRoomDetailsState]);

  const resetFieldError = <S extends keyof roomStepErrors, F extends string>(
    step: S,
    field: F
  ) => {
    setErrors((prev) => {
      const stepErrors = prev[step];
      if (!stepErrors || !stepErrors[field]) return prev;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [field]: _, ...rest } = stepErrors;

      return {
        ...prev,
        [step]: Object.keys(rest).length ? rest : undefined,
      };
    });
  };

  const stepSubmit = [
    // STEP 0 — Room Details
    async () => {
      const stepErrors = roomDetailsValidator(roomDetailsState.roomDetails);

      if (stepErrors) {
        setErrors((prev) => ({
          ...prev,
          roomDetails: stepErrors,
        }));
        return false;
      }

      const { roomKey: newRoomKey } = await submitRoomDetailsStep(
        roomDetailsState.roomDetails,
        { hotelId: hotelId! },
        roomKey
      );

      setRoomKey(newRoomKey);
      return true;
    },

    // STEP 1 — Sleeping Arrangement
    async () => {
      const stepErrors = sleepingArrangementValidator(
        roomDetailsState.sleepingArrangement
      );

      if (stepErrors) {
        setErrors((prev) => ({
          ...prev,
          sleepingArrangement: stepErrors,
        }));
        return false;
      }
      await submitSleepingArrangementStep(
        roomDetailsState,
        { hotelId: hotelId! },
        roomKey
      );
      return true;
    },
    // STEP 2 — Bathroom Details
    async () => {
      await submitBathroomDetailsStep(
        roomDetailsState,
        { hotelId: hotelId! },
        roomKey
      );
      return true;
    },
    // STEP 3 — Meal Plan & Pricing
    async () => {
      const stepErrors = mealPlanValidator(roomDetailsState.mealPlanDetails);
      if (stepErrors) {
        setErrors((prev) => ({
          ...prev,
          mealPlanDetails: stepErrors,
        }));
        return false;
      }
      await submitMealPlanStep(
        roomDetailsState,
        { hotelId: hotelId! },
        roomKey
      );
      return true;
    },
    // STEP 4 — Room Amenities
    async () => {
      const stepErrors = amenitiesValidator(roomDetailsState.roomAmenities);
      if (stepErrors) {
        setErrors((prev) => ({
          ...prev,
          roomAmenities: stepErrors,
        }));
        return false;
      }
      await submitRoomAmenitiesStep(
        roomDetailsState,
        { hotelId: hotelId! },
        roomKey
      );
      return true;
    },
  ];

  const handleNextStep = async () => {
    const submitFn = stepSubmit[currentStep];
    if (submitFn) {
      const isValid = await submitFn();
      if (!isValid) return;
    }

    if (currentStep === steps.length - 1) {
      onSuccess();
      return;
    } else {
      setCurrentStep((prev) => prev + 1);
      setOngoingStep((prev) => prev + 1);
    }
  };
  const handleStepClick = (index: number) => {
    if (index <= ongoingStep) {
      setCurrentStep(index);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {mode === "CREATE" ? "Add New Room" : "Edit Room"}
        </h2>
        <button onClick={onCancel} className="text-sm text-gray-600">
          Cancel
        </button>
      </div>

      {/* Step Tabs */}
      <div className="flex items-center gap-2 pb-4 flex-wrap">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => handleStepClick(index)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
              currentStep === index
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
              ongoingStep === index ? "ring-2 ring-blue-500" : "ring-0"
            )}
          >
            {step.id}. {step.name}
          </button>
        ))}
      </div>

      {/* Steps */}
      {currentStep === 0 && (
        <RoomDetailsStep
          errors={errors}
          resetFieldError={resetFieldError}
          
        />
      )}

      {currentStep === 1 && (
        <SleepingArrangementStep
          errors={errors}
          resetFieldError={resetFieldError}
        />
      )}
      {currentStep === 2 && <BathroomDetailsStep />}
      {currentStep === 3 && (
        <MealPlanStep errors={errors} resetFieldError={resetFieldError} />
      )}
      {currentStep === 4 && (
        <RoomAmenitiesStep errors={errors} resetFieldError={resetFieldError} />
      )}
      {/* Footer */}
      <div className="flex justify-between items-center pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            currentStep === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          )}
        >
          Previous
        </button>

        <div className="text-sm text-gray-600">
          Step {currentStep + 1} of {steps.length}
        </div>

        <button
          type="button"
          onClick={handleNextStep}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {currentStep === steps.length - 1 ? "Submit" : "Next"}
        </button>
      </div>
    </div>
  );
}
