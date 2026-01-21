import { useEffect, useState, useReducer } from "react";
import { cn } from "@/lib/utils";
import { RoomDetailsStep } from "../steps/RoomsSteps/steps/RoomDetailsStep";
import { SleepingArrangementStep } from "../steps/RoomsSteps/steps/SleepingArrangementStep";
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
  submitPropertyInfoRoomAmenitiesStep,
} from "@/features/properties/submitter/propertyInfoRoomSubmitters";
import { adminService, type HotelRoomDetailsResponse } from "@/features/admin/services/adminService";
import { RoomDetailsReducer } from "@/features/properties/state/reducer";
import { initialRoomState, initialState } from "@/features/properties/state/initialState";
import { setRoomDetails, setAvailableRoomAmenities } from "@/features/properties/state/actionCreators";
import type { RoomInfoActionType } from "@/features/properties/state/actions";
import { FormContext } from "@/features/properties/context/FormContextProvider";
import { propertyService } from "@/features/properties/services/propertyService";

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
  { id: 3, name: "Room Amenities" },
];

// Helper to transform API response to form state
// Supports both direct hotel-admin response shape and wrapped onboarding-like shape
function transformRoomResponseToState(
  rawResponse: HotelRoomDetailsResponse | { data?: HotelRoomDetailsResponse }
): RoomStateType {
  // If API returns { data: { ... } } (onboarding style), unwrap it
  const response: HotelRoomDetailsResponse =
    (rawResponse as HotelRoomDetailsResponse).roomDetails
      ? (rawResponse as HotelRoomDetailsResponse)
      : (rawResponse as { data: HotelRoomDetailsResponse }).data;

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
      numberOfBathrooms: response.roomDetails?.numberOfBathrooms ?? 1,
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
      numberOfBathrooms: response.roomDetails?.numberOfBathrooms ?? 1, // Kept for backward compatibility
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

  // Fetch available room amenities once when the room form is opened
  useEffect(() => {
    async function fetchAvailableRoomAmenities() {
      try {
        const response = await propertyService.getAvailableRoomAmenities();
        dispatchRoomDetails(
          setAvailableRoomAmenities({
            availableAmenities: response,
          })
        );
      } catch (error) {
        console.error("Error fetching room amenities:", error);
      }
    }

    fetchAvailableRoomAmenities();
  }, []);

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
    // STEP 2 — Room Amenities
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
    formDataState: initialState,
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
        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === "CREATE" ? "Add New Room" : "Edit Room"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {mode === "CREATE" 
                ? "Create a new room type for your property" 
                : "Update room information"}
            </p>
          </div>
          <button 
            onClick={onCancel} 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Step Tabs */}
        <div className="flex items-center gap-3 pb-6 flex-wrap">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(index)}
              className={cn(
                "px-6 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all relative",
                currentStep === index
                  ? "bg-blue-600 text-white shadow-md"
                  : index <= ongoingStep
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-gray-50 text-gray-400 cursor-not-allowed",
                ongoingStep === index ? "ring-2 ring-blue-500 ring-offset-2" : "ring-0"
              )}
              disabled={index > ongoingStep}
            >
              <span className="flex items-center gap-2">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  currentStep === index 
                    ? "bg-white text-blue-600" 
                    : index <= ongoingStep
                    ? "bg-gray-200 text-gray-700"
                    : "bg-gray-100 text-gray-400"
                )}>
                  {step.id}
                </span>
                {step.name}
              </span>
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
        {currentStep === 2 && (
          <RoomAmenitiesStep errors={errors} resetFieldError={resetFieldError} />
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className={cn(
              "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all",
              currentStep === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400"
            )}
          >
            ← Previous
          </button>

          <div className="text-sm text-gray-500 font-medium">
            Step {currentStep + 1} of {steps.length}
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            className={cn(
              "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm",
              "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95"
            )}
          >
            {currentStep === steps.length - 1 ? "Save Room" : "Next →"}
          </button>
        </div>
      </div>
    </FormContext.Provider>
  );
}

