import { useEffect, useState, useReducer } from "react";
import { cn } from "@/lib/utils";
import { RoomDetailsStep } from "../steps/RoomsSteps/steps/RoomDetailsStep";
import { SleepingArrangementStep } from "../steps/RoomsSteps/steps/SleepingArrangementStep";
import { BathroomDetailsStep } from "../steps/RoomsSteps/steps/BathroomDetailsStep";
import { RoomAmenitiesStep } from "../steps/RoomsSteps/steps/RoomAmenitiesStep";
import type { roomStepErrors, RoomStateType } from "@/features/properties/types";
import {
  amenitiesValidator,
  roomDetailsValidator,
  sleepingArrangementValidator,
} from "@/features/properties/submitter/stepValidators";
import {
  submitPropertyInfoRoomDetailsStep,
  submitPropertyInfoSleepingArrangementStep,
  submitPropertyInfoBathroomDetailsStep,
  submitPropertyInfoRoomAmenitiesStep,
} from "@/features/properties/submitter/propertyInfoRoomSubmitters";
import { adminService, type HotelRoomDetailsResponse } from "@/features/admin/services/adminService";
import { RoomDetailsReducer } from "@/features/properties/state/reducer";
import { initialRoomState } from "@/features/properties/state/initialState";
import { setRoomDetails } from "@/features/properties/state/actionCreators";
import type { RoomInfoActionType } from "@/features/properties/state/actions";
import { FormContext } from "@/features/properties/context/FormContextProvider";

interface PropertyInfoRoomsFormProps {
  mode: "CREATE" | "EDIT";
  hotelId: string;
  editingRoomId?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const steps = [
  { id: 1, name: "Room Details" },
  { id: 2, name: "Sleeping Arrangement" },
  { id: 3, name: "Bathroom Details" },
  { id: 4, name: "Room Amenities" },
];

// Helper to transform API response to form state
// Supports both direct hotel-admin response shape and wrapped onboarding-like shape
function transformRoomResponseToState(rawResponse: HotelRoomDetailsResponse | any): RoomStateType {
  // If API returns { data: { ... } } (onboarding style), unwrap it
  const response: HotelRoomDetailsResponse =
    rawResponse && rawResponse.roomDetails
      ? rawResponse
      : rawResponse?.data ?? rawResponse;

  const selectedAmenities = (response.amenities || []).reduce<
    Record<string, string[]>
  >(
    (acc, item) => {
      const categoryCode = item.categoryCode || "MANDATORY"; // Default category if not provided
      if (!acc[categoryCode]) {
        acc[categoryCode] = [];
      }
      acc[categoryCode].push(item.amenityCode);
      return acc;
    },
    {} as Record<string, string[]>
  );

  return {
    roomDetails: {
      roomName: response.roomDetails?.roomName ?? "",
      roomType: response.roomDetails?.roomType ?? "",
      roomView: response.roomDetails?.roomView ?? "",
      roomSize: response.roomDetails?.roomSize ?? 0,
      roomSizeUnit: response.roomDetails?.roomSizeUnit ?? "SQFT",
      totalRooms: response.roomDetails?.totalRooms ?? 0,
      description: response.roomDetails?.description ?? "",
    },
    sleepingArrangement: {
      standardBeds:
        response.beds
          ?.filter((bed) => bed.standard)
          .map((bed) => ({
            bedType: bed.bedType,
            numberOfBeds: bed.numberOfBeds,
          })) || [],
      canAccommodateExtraBed: response.occupancy?.extraBedAllowed ?? false,
      numberOfExtraBeds: response.occupancy?.maxOccupancy ?? 0,
      hasAlternateArrangement: response.occupancy?.alternateArrangement ?? false,
      alternateBeds:
        response.beds
          ?.filter((bed) => !bed.standard)
          .map((bed) => ({
            bedType: bed.bedType,
            numberOfBeds: bed.numberOfBeds,
          })) || [],
      baseAdults: response.occupancy?.baseAdults ?? 0,
      maxAdults: response.occupancy?.maxAdults ?? 0,
      baseChildren: response.occupancy?.baseChildren ?? 0,
      maxChildren: response.occupancy?.maxChildren ?? 0,
      maxOccupancy: response.occupancy?.maxOccupancy ?? 0,
    },
    bathroomDetails: {
      numberOfBathrooms: response.roomDetails?.numberOfBathrooms ?? 1,
    },
    mealPlanDetails: {
      mealPlan: "",
      baseRate: 0,
      extraAdultCharge: 0,
      paidChildCharge: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    },
    roomAmenities: {
      availableAmenities: [],
      selectedAmenities: selectedAmenities,
    },
  };
}

export function PropertyInfoRoomsForm({
  mode,
  hotelId,
  editingRoomId,
  onCancel,
  onSuccess,
}: PropertyInfoRoomsFormProps) {
  const [ongoingStep, setOngoingStep] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [roomDetailsState, dispatchRoomDetails] = useReducer(
    RoomDetailsReducer,
    initialRoomState
  );
  const [errors, setErrors] = useState<roomStepErrors>({});
  const [roomKey, setRoomKey] = useState<string | undefined>(
    mode === "CREATE" ? undefined : editingRoomId
  );
  const [isLoading, setIsLoading] = useState(false);

  // Fetch room details when editing
  useEffect(() => {
    async function fetchRoomDetails() {
      if (!editingRoomId || !hotelId) return;
      
      try {
        setIsLoading(true);
        const response = await adminService.getRoomDetails(hotelId, editingRoomId);
        const state = transformRoomResponseToState(response);
        dispatchRoomDetails(setRoomDetails(state));
        setRoomKey(response.roomKey);
      } catch (error) {
        console.error("Error fetching room details:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (editingRoomId && hotelId) {
      fetchRoomDetails();
    }
  }, [editingRoomId, hotelId]);

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

      const { roomKey: newRoomKey } = await submitPropertyInfoRoomDetailsStep(
        roomDetailsState.roomDetails,
        roomDetailsState.bathroomDetails.numberOfBathrooms,
        hotelId,
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
      const { roomKey: newRoomKey } = await submitPropertyInfoSleepingArrangementStep(
        roomDetailsState,
        hotelId,
        roomKey
      );
      setRoomKey(newRoomKey);
      return true;
    },
    // STEP 2 — Bathroom Details
    async () => {
      const { roomKey: newRoomKey } = await submitPropertyInfoBathroomDetailsStep(
        roomDetailsState,
        hotelId,
        roomKey
      );
      setRoomKey(newRoomKey);
      return true;
    },
    // STEP 3 — Room Amenities
    async () => {
      const stepErrors = amenitiesValidator(roomDetailsState.roomAmenities);
      if (stepErrors) {
        setErrors((prev) => ({
          ...prev,
          roomAmenities: stepErrors,
        }));
        return false;
      }
      await submitPropertyInfoRoomAmenitiesStep(
        roomDetailsState,
        hotelId,
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

  // Create a local context value for the form components
  const contextValue = {
    formDataState: {} as any,
    setFormDataState: () => {},
    roomDetailsState,
    setRoomDetailsState: (action: RoomInfoActionType) => {
      dispatchRoomDetails(action);
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <p className="text-gray-500">Loading room details...</p>
        </div>
      </div>
    );
  }

  return (
    <FormContext.Provider value={contextValue}>
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
    </FormContext.Provider>
  );
}

