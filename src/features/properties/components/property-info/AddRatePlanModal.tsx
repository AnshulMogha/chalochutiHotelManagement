import { useState, useEffect } from "react";
import { X, Pencil } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { mealPlanOptions } from "@/features/properties/components/steps/RoomsSteps/constants/mealPlanOptions";
import type { MealPlanOption } from "@/features/admin/services/adminService";

interface AddRatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    ratePlanName: string;
    mealPlan: string;
    active?: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
  mode?: "create" | "edit";
  initialData?: {
    ratePlanName: string;
    mealPlan: string;
    cancellationPolicyId: number | null;
    active: boolean;
  };
  onLoadData?: () => Promise<{
    ratePlanName: string;
    mealPlan: string;
    active: boolean;
    mealPlans?: MealPlanOption[];
  }>;
  mealPlans?: MealPlanOption[];
}

export function AddRatePlanModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  mode = "create",
  initialData,
  onLoadData,
  mealPlans: propMealPlans,
}: AddRatePlanModalProps) {
  const [ratePlanName, setRatePlanName] = useState("");
  const [mealPlan, setMealPlan] = useState("");
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [availableMealPlans, setAvailableMealPlans] = useState<MealPlanOption[]>(propMealPlans || []);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && onLoadData) {
        // Load data for edit mode
        setIsLoadingData(true);
        onLoadData()
          .then((data) => {
            setRatePlanName(data.ratePlanName);
            setMealPlan(data.mealPlan);
            setActive(data.active);
            // Update meal plans if provided in response
            if (data.mealPlans && data.mealPlans.length > 0) {
              setAvailableMealPlans(data.mealPlans);
            }
            setErrors({});
          })
          .catch((error) => {
            console.error("Error loading rate plan data:", error);
            setErrors({ general: "Failed to load rate plan data" });
          })
          .finally(() => {
            setIsLoadingData(false);
          });
      } else if (initialData) {
        // Use provided initial data
        setRatePlanName(initialData.ratePlanName);
        setMealPlan(initialData.mealPlan);
        setActive(initialData.active);
        setErrors({});
      } else {
        // Reset form for create mode
        setRatePlanName("");
        setMealPlan("");
        setActive(true);
        setErrors({});
        setApiError(null);
        // Reset meal plans to default if no prop provided
        if (!propMealPlans) {
          setAvailableMealPlans([]);
        }
      }
    }
  }, [isOpen, mode]); // Removed onLoadData and initialData from dependencies to prevent loop

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!ratePlanName.trim()) {
      newErrors.ratePlanName = "Rate plan name is required";
    }

    if (!mealPlan) {
      newErrors.mealPlan = "Meal plan is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setApiError(null); // Clear any previous errors
      await onSubmit({
        ratePlanName: ratePlanName.trim(),
        mealPlan,
        ...(mode === "create" && { active }),
      });
      // Form will be reset by useEffect when modal closes
    } catch (error: any) {
      console.error("Error submitting rate plan:", error);
      
      // Extract error message from API response
      // API response structure:
      // {
      //   data: {
      //     mealPlan: "error.rate.plan.duplicate.meal.plan"
      //   }
      // }
      // After interceptor: error.data contains the full ApiFailureResponse
      // error.data.data contains the field-specific errors
      const errorData = error?.data?.data || {};
      
      // Get the exact error message from the error data
      // Priority: field-specific errors first, then general message
      const errorMessage = 
        errorData.mealPlan ||
        errorData.ratePlanName ||
        error?.data?.message ||
        error?.message ||
        "Failed to save rate plan. Please try again.";
      
      // Show the exact error message from API
      setApiError(errorMessage);
    }
  };

  const handleClose = () => {
    setRatePlanName("");
    setMealPlan("");
    setActive(true);
    setErrors({});
    setApiError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              {mode === "edit" ? (
                <Pencil className="w-5 h-5 text-white" />
              ) : (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === "edit" ? "Edit Rate Plan" : "Add Rate Plan"}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === "edit"
                  ? "Update rate plan details"
                  : "Create a new rate plan for this room"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {isLoadingData ? (
          <div className="p-6 flex items-center justify-center min-h-[200px]">
            <p className="text-gray-500">Loading rate plan details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}
            {apiError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1">{apiError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApiError(null)}
                    className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
                    aria-label="Dismiss error"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            )}

            {/* Rate Plan Name */}
            <div>
              <Input
                label="Rate Plan Name"
                value={ratePlanName}
                onChange={(e) => {
                  setRatePlanName(e.target.value);
                  if (errors.ratePlanName) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.ratePlanName;
                      return newErrors;
                    });
                  }
                }}
                error={errors.ratePlanName}
                placeholder="e.g., CP Saver, MAP Deluxe"
                required
              />
            </div>

            {/* Meal Plan */}
            <div>
              <Select
                label="Meal Plan"
                value={mealPlan}
                onChange={(e) => {
                  setMealPlan(e.target.value);
                  if (errors.mealPlan) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.mealPlan;
                      return newErrors;
                    });
                  }
                }}
                options={
                  availableMealPlans.length > 0
                    ? availableMealPlans.map((mp) => ({ value: mp.code, label: mp.label }))
                    : mealPlanOptions
                }
                error={errors.mealPlan}
                required
              />
            </div>


            {/* Active Toggle - Only show in create mode */}
            {mode === "create" && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Active Status
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Enable this rate plan for bookings
                  </p>
                </div>
                <Toggle
                  checked={active}
                  onChange={(checked) => setActive(checked)}
                  label="Active"
                />
              </div>
            )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading || isLoadingData}
            >
              {isLoading
                ? mode === "edit"
                  ? "Updating..."
                  : "Creating..."
                : mode === "edit"
                ? "Update Rate Plan"
                : "Create Rate Plan"}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

