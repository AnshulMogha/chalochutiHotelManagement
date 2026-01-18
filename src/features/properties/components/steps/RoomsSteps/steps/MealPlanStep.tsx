import { Input, Select } from "@/components/ui";

import { mealPlanOptions } from "../constants";
import { useFormContext } from "@/features/properties/context/useFormContext";
import {
  setBaseRate,
  setEndDate,
  setExtraAdultCharge,
  setMealPlan,
  setPaidChildCharge,
  setStartDate,
} from "@/features/properties/state/actionCreators";
import type { roomStepErrors, roomStepKeys } from "@/features/properties/types";

export function MealPlanStep({
  errors,
  resetFieldError,
}: {
  errors: roomStepErrors;
  resetFieldError: (step: roomStepKeys, field: string) => void;
}) {
  const { roomDetailsState, setRoomDetailsState } = useFormContext();
  const { mealPlanDetails } = roomDetailsState;

  const handleMealPlanChange = (value: string) => {
    if (errors.mealPlanDetails?.mealPlan) {
      resetFieldError("mealPlanDetails", "mealPlan");
    }
    setRoomDetailsState(setMealPlan(value));
  };
  const handleBaseRateChange = (value: string) => {
    if (Number(value) < 0) return;
    if (errors.mealPlanDetails?.baseRate) {
      resetFieldError("mealPlanDetails", "baseRate");
    }
    setRoomDetailsState(setBaseRate(Number(value)));
  };
  const handleExtraAdultChargeChange = (value: string) => {
    if (Number(value) < 0) return;
    if (errors.mealPlanDetails?.extraAdultCharge) {
      resetFieldError("mealPlanDetails", "extraAdultCharge");
    }
    setRoomDetailsState(setExtraAdultCharge(Number(value)));
  };
  const handlePaidChildChargeChange = (value: string) => {
    if (Number(value) < 0) return;
    if (errors.mealPlanDetails?.paidChildCharge) {
      resetFieldError("mealPlanDetails", "paidChildCharge");
    }
    setRoomDetailsState(setPaidChildCharge(Number(value)));
  };
  const handleStartDateChange = (value: string) => {
    //start date will not be in the past
    if (new Date(value) < new Date()) return;
    if (errors.mealPlanDetails?.startDate) {
      resetFieldError("mealPlanDetails", "startDate");
    }
    setRoomDetailsState(setStartDate(value));
  };
  const handleEndDateChange = (value: string) => {
    //end date will not be in the past and equal to or greater than start date
    if (
      new Date(value) < new Date() ||
      new Date(value) < new Date(mealPlanDetails.startDate)
    )
      return;
    if (errors.mealPlanDetails?.endDate) {
      resetFieldError("mealPlanDetails", "endDate");
    }
    setRoomDetailsState(setEndDate(value));
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Meal Plan, Rates & Inventory Details
        </h3>
        <p className="text-sm text-gray-600">
          Set up the meal plan, pricing, and inventory to make this room ready
          to sell.
        </p>
      </div>

      {/* Meal Options */}
      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-2">
          Meal Options
        </h4>
        <label className="block text-sm text-gray-600 mb-1">
          Select a meal plan
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Choose the meal plan included with this room type, such as Breakfast
          Only, MAP, or All Meals.
        </p>
        <Select
          label=""
          error={errors.mealPlanDetails?.mealPlan}
          value={mealPlanDetails.mealPlan}
          
          onChange={(e) => handleMealPlanChange(e.target.value)}
          options={mealPlanOptions}
        />
      </div>

      {/* Room Prices */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-base font-semibold text-gray-900 mb-4">
          Room Prices
        </h4>
        <div className="space-y-4">
          {[
            {
              key: "baseRate",
              label: "Base Rate for 2 adults",
              description: "Enter the standard room rate for 2 adults.",
              placeholder: "Enter base rate",
              onChange: handleBaseRateChange,
              error: errors.mealPlanDetails?.baseRate,
            },
            {
              key: "extraAdultCharge",
              label: "Extra Adult Charge",
              description:
                "Additional charge for each adult guest aged 18 years or older.",
              placeholder: "Enter extra adult charge",
              onChange: handleExtraAdultChargeChange,
              error: errors.mealPlanDetails?.extraAdultCharge,
            },
            {
              key: "paidChildCharge",
              label: "Paid Child Charge",
              description: "Charge per child aged 7 to 17 years.",
              placeholder: "Enter charge for child",
              onChange: handlePaidChildChargeChange,
              error: errors.mealPlanDetails?.paidChildCharge,
            },
          ].map((item) => (
            <div key={item.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {item.label}
              </label>
              <p className="text-xs text-gray-500 mb-2">{item.description}</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₹
                </span>
                <Input
                  type="number"
                  value={
                    mealPlanDetails[item.key as keyof typeof mealPlanDetails] ||
                    ""
                  }
                  onChange={(e) => item.onChange(e.target.value)}
                  placeholder={item.placeholder}
                  className="pl-8"
                  error={item.error}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Calendar */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-base font-semibold text-gray-900 mb-4">
          Inventory Calendar
        </h4>
        <label className="block text-sm text-gray-600 mb-3">
          Select a date range.
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>

            <div className="relative">
              <Input
                error={errors.mealPlanDetails?.startDate}
                type="date"
                value={mealPlanDetails.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className=""
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <div className="relative">
              <Input
                error={errors.mealPlanDetails?.endDate}
                type="date"
                value={mealPlanDetails.endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className=""
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
