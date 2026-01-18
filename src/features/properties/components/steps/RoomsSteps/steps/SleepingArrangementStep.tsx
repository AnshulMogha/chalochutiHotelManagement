import { Input, Select } from "@/components/ui";

import { bedTypeOptions } from "../constants";
import { Minus, Plus, X } from "lucide-react";
import { useFormContext } from "@/features/properties/context/useFormContext";
import type {
  BedArrangement,
  roomStepErrors,
  roomStepKeys,
} from "@/features/properties/types";
import {
  addAlternateBed,
  addStandardBed,
  removeAlternateBed,
  removeStandardBed,
  setAlternateBedsType,
  setBaseAdults,
  setBaseChildren,
  setCanAccommodateExtraBed,
  setHasAlternateArrangement,
  setMaxAdults,
  setMaxChildren,
  setMaxOccupancy,
  setNumberOfAlternateBeds,
  setNumberOfExtraBeds,
  setNumberOfStandardBeds,
  setStandardBedsType,
} from "@/features/properties/state/actionCreators";

export function SleepingArrangementStep({
  errors,
  resetFieldError,
}: {
  errors: roomStepErrors;
  resetFieldError: (step: roomStepKeys, field: string) => void;
}) {
  const { roomDetailsState, setRoomDetailsState } = useFormContext();
  const { sleepingArrangement } = roomDetailsState;
  const handleBedTypeChange = (bedType: string, index: number) => {
    if (
      errors.sleepingArrangement?.standardBeds &&
      standardErrorIndex === index
    ) {
      resetFieldError("sleepingArrangement", "standardBeds");
    }
    setRoomDetailsState(setStandardBedsType(bedType, index));
  };
  const handleNumberOfStandardBedsChange = (
    numberOfBeds: number,
    index: number
  ) => {
    if (
      errors.sleepingArrangement?.standardBeds &&
      standardErrorIndex === index
    ) {
      resetFieldError("sleepingArrangement", "standardBeds");
    }
    if (numberOfBeds >= 0) {
      setRoomDetailsState(setNumberOfStandardBeds(numberOfBeds, index));
    }
  };
  const handleIncrementNumberOfStandardBeds = (index: number) => {
    if (
      errors.sleepingArrangement?.standardBeds &&
      standardErrorIndex === index
    ) {
      resetFieldError("sleepingArrangement", "standardBeds");
    }
    setRoomDetailsState(
      setNumberOfStandardBeds(
        sleepingArrangement.standardBeds[index].numberOfBeds + 1,
        index
      )
    );
  };
  const handleDecrementNumberOfStandardBeds = (index: number) => {
    if (sleepingArrangement.standardBeds[index].numberOfBeds > 0) {
      setRoomDetailsState(
        setNumberOfStandardBeds(
          sleepingArrangement.standardBeds[index].numberOfBeds - 1,
          index
        )
      );
    }
  };
  const handleAddStandardBed = () => {
    setRoomDetailsState(addStandardBed());
  };
  const handleRemoveStandardBed = (index: number) => {
    if (sleepingArrangement.standardBeds.length > 1) {
      setRoomDetailsState(removeStandardBed(index));
    }
  };
  const handleCanAccommodateExtraBedChange = (
    canAccommodateExtraBed: boolean
  ) => {
    setRoomDetailsState(setCanAccommodateExtraBed(canAccommodateExtraBed));
  };
  const handleDecrementNumberOfExtraBeds = () => {
    if (sleepingArrangement.numberOfExtraBeds > 0) {
      setRoomDetailsState(
        setNumberOfExtraBeds(sleepingArrangement.numberOfExtraBeds - 1)
      );
    }
  };
  const handleIncrementNumberOfExtraBeds = () => {
    setRoomDetailsState(
      setNumberOfExtraBeds(sleepingArrangement.numberOfExtraBeds + 1)
    );
  };
  const handleNumberOfExtraBedsChange = (numberOfExtraBeds: number) => {
    if (numberOfExtraBeds >= 0) {
      setRoomDetailsState(setNumberOfExtraBeds(numberOfExtraBeds));
    }
  };
  const handleHasAlternateArrangementChange = (
    hasAlternateArrangement: boolean
  ) => {
    if (hasAlternateArrangement) {
      setRoomDetailsState(setHasAlternateArrangement(true));
    } else {
      setRoomDetailsState(setHasAlternateArrangement(false));
    }
  };
  const handleAlternateBedTypeChange = (bedType: string, index: number) => {
    if (
      errors.sleepingArrangement?.alternateBeds &&
      alternateErrorIndex === index
    ) {
      resetFieldError("sleepingArrangement", "alternateBeds");
    }
    setRoomDetailsState(setAlternateBedsType(bedType, index));
  };
  const handleNumberOfAlternateBedsChange = (
    numberOfBeds: number,
    index: number
  ) => {
    if (numberOfBeds >= 0) {
      if (
        errors.sleepingArrangement?.alternateBeds &&
        alternateErrorIndex === index
      ) {
        resetFieldError("sleepingArrangement", "alternateBeds");
      }
      setRoomDetailsState(setNumberOfAlternateBeds(numberOfBeds, index));
    }
  };
  const handleIncrementNumberOfAlternateBeds = (index: number) => {
    if (
      errors.sleepingArrangement?.alternateBeds &&
      alternateErrorIndex === index
    ) {
      resetFieldError("sleepingArrangement", "alternateBeds");
    }
    setRoomDetailsState(
      setNumberOfAlternateBeds(
        sleepingArrangement.alternateBeds[index].numberOfBeds + 1,
        index
      )
    );
  };
  const handleDecrementNumberOfAlternateBeds = (index: number) => {
    if (sleepingArrangement.alternateBeds[index].numberOfBeds > 0) {
      setRoomDetailsState(
        setNumberOfAlternateBeds(
          sleepingArrangement.alternateBeds[index].numberOfBeds - 1,
          index
        )
      );
    }
  };
  const handleAddAlternateBed = () => {
    setRoomDetailsState(addAlternateBed());
  };
  const handleRemoveAlternateBed = (index: number) => {
    if (sleepingArrangement.alternateBeds.length > 1) {
      setRoomDetailsState(removeAlternateBed(index));
    }
  };
  const handleBaseAdultsChange = (baseAdults: number) => {
    if (errors.sleepingArrangement?.baseAdults) {
      resetFieldError("sleepingArrangement", "baseAdults");
    }
    if (baseAdults >= 0) {
      setRoomDetailsState(setBaseAdults(baseAdults));
    }
  };
  const handleMaxAdultsChange = (maxAdults: number) => {
    if (errors.sleepingArrangement?.maxAdults) {
      resetFieldError("sleepingArrangement", "maxAdults");
    }
    if (maxAdults >= 0) {
      setRoomDetailsState(setMaxAdults(maxAdults));
    }
  };
  const handleBaseChildrenChange = (baseChildren: number) => {
    if (errors.sleepingArrangement?.baseChildren) {
      resetFieldError("sleepingArrangement", "baseChildren");
    }
    if (baseChildren >= 0) {
      setRoomDetailsState(setBaseChildren(baseChildren));
    }
  };
  const handleMaxChildrenChange = (maxChildren: number) => {
    if (errors.sleepingArrangement?.maxChildren) {
      resetFieldError("sleepingArrangement", "maxChildren");
    }
    if (maxChildren >= 0) {
      setRoomDetailsState(setMaxChildren(maxChildren));
    }
  };
  const handleMaxOccupancyChange = (maxOccupancy: number) => {
    if (errors.sleepingArrangement?.maxOccupancy) {
      resetFieldError("sleepingArrangement", "maxOccupancy");
    }
    if (maxOccupancy >= 0) {
      setRoomDetailsState(setMaxOccupancy(maxOccupancy));
    }
  };
  const handleDecrementBaseAdults = () => {
    if (errors.sleepingArrangement?.baseAdults) {
      resetFieldError("sleepingArrangement", "baseAdults");
    }
    if (sleepingArrangement.baseAdults > 0) {
      setRoomDetailsState(setBaseAdults(sleepingArrangement.baseAdults - 1));
    }
  };
  const handleIncrementBaseAdults = () => {
    if (errors.sleepingArrangement?.baseAdults) {
      resetFieldError("sleepingArrangement", "baseAdults");
    }
    setRoomDetailsState(setBaseAdults(sleepingArrangement.baseAdults + 1));
  };
  const handleDecrementMaxAdults = () => {
    if (errors.sleepingArrangement?.maxAdults) {
      resetFieldError("sleepingArrangement", "maxAdults");
    }
    if (sleepingArrangement.maxAdults > 0) {
      setRoomDetailsState(setMaxAdults(sleepingArrangement.maxAdults - 1));
    }
  };
  const handleIncrementMaxAdults = () => {
    if (errors.sleepingArrangement?.maxAdults) {
      resetFieldError("sleepingArrangement", "maxAdults");
    }
    setRoomDetailsState(setMaxAdults(sleepingArrangement.maxAdults + 1));
  };
  const handleDecrementBaseChildren = () => {
    if (errors.sleepingArrangement?.baseChildren) {
      resetFieldError("sleepingArrangement", "baseChildren");
    }
    if (sleepingArrangement.baseChildren > 0) {
      setRoomDetailsState(
        setBaseChildren(sleepingArrangement.baseChildren - 1)
      );
    }
  };
  const handleIncrementBaseChildren = () => {
    if (errors.sleepingArrangement?.baseChildren) {
      resetFieldError("sleepingArrangement", "baseChildren");
    }
    setRoomDetailsState(setBaseChildren(sleepingArrangement.baseChildren + 1));
  };
  const handleDecrementMaxChildren = () => {
    if (errors.sleepingArrangement?.maxChildren) {
      resetFieldError("sleepingArrangement", "maxChildren");
    }
    if (sleepingArrangement.maxChildren > 0) {
      setRoomDetailsState(setMaxChildren(sleepingArrangement.maxChildren - 1));
    }
  };
  const handleIncrementMaxChildren = () => {
    if (errors.sleepingArrangement?.maxChildren) {
      resetFieldError("sleepingArrangement", "maxChildren");
    }
    setRoomDetailsState(setMaxChildren(sleepingArrangement.maxChildren + 1));
  };
  const handleDecrementMaxOccupancy = () => {
    if (errors.sleepingArrangement?.maxOccupancy) {
      resetFieldError("sleepingArrangement", "maxOccupancy");
    }
    if (sleepingArrangement.maxOccupancy > 0) {
      setRoomDetailsState(
        setMaxOccupancy(sleepingArrangement.maxOccupancy - 1)
      );
    }
  };
  const handleIncrementMaxOccupancy = () => {
    if (errors.sleepingArrangement?.maxOccupancy) {
      resetFieldError("sleepingArrangement", "maxOccupancy");
    }
    setRoomDetailsState(setMaxOccupancy(sleepingArrangement.maxOccupancy + 1));
  };

  const getStandardBedOptions = (currentIndex: number) => {
    const selectedTypes = sleepingArrangement.standardBeds
      .filter((_, index) => index !== currentIndex)
      .map((bed) => bed.bedType);

    return bedTypeOptions.filter(
      (option) => !selectedTypes.includes(option.value)
    );
  };
  const getAlternateBedOptions = (currentIndex: number) => {
    const selectedTypes = sleepingArrangement.alternateBeds
      .filter((_, index) => index !== currentIndex)
      .map((bed) => bed.bedType);

    return bedTypeOptions.filter(
      (option) => !selectedTypes.includes(option.value)
    );
  };
  const standardBedError = errors.sleepingArrangement?.standardBeds;
  const standardErrorIndex = Number(
    standardBedError ? standardBedError[standardBedError.length - 1] : -1
  );
  const parsedStandardErrorMessage = standardBedError?.slice(
    0,
    standardBedError.length - 1
  );
  //alternate bed error
  const alternateBedError = errors.sleepingArrangement?.alternateBeds;
  const alternateErrorIndex = Number(
    alternateBedError ? alternateBedError[alternateBedError.length - 1] : -1
  );
  const parsedAlternateErrorMessage = alternateBedError?.slice(
    0,
    alternateBedError.length - 1
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Sleeping Arrangement & Occupancy
      </h3>

      {/* Standard Arrangement */}
      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-4">
          Standard Arrangement
        </h4>
        <label className="block text-sm text-gray-600 mb-3">
          Select the types of beds available in this room
        </label>
        <div className="space-y-3">
          {sleepingArrangement.standardBeds.map(
            (bed: BedArrangement, index) => (
              <div key={index} className="flex items-center gap-3">
                <Select
                  label=""
                  value={bed.bedType}
                  error={
                    standardErrorIndex === index
                      ? parsedStandardErrorMessage
                      : undefined
                  }
                  onChange={(e) => handleBedTypeChange(e.target.value, index)}
                  options={getStandardBedOptions(index)}
                  className="flex-1"
                />

                {sleepingArrangement.standardBeds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStandardBed(index)}
                    className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <label className="text-sm text-gray-700 whitespace-nowrap">
                  Number of beds:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecrementNumberOfStandardBeds(index)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <Input
                    type="number"
                    value={bed.numberOfBeds}
                    onChange={(e) =>
                      handleNumberOfStandardBedsChange(
                        Number(e.target.value),
                        index
                      )
                    }
                    className="w-16 text-center"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={() => handleIncrementNumberOfStandardBeds(index)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          )}
          <button
            type="button"
            onClick={handleAddStandardBed}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Another Bed Type
          </button>
        </div>
      </div>

      {/* Extra Bed Accommodation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Can this room accommodate extra bed(s)?
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="extraBed"
              checked={!sleepingArrangement.canAccommodateExtraBed}
              onChange={() => handleCanAccommodateExtraBedChange(false)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">No</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="extraBed"
              checked={sleepingArrangement.canAccommodateExtraBed}
              onChange={() => handleCanAccommodateExtraBedChange(true)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Yes</span>
          </label>
        </div>
      </div>
      {sleepingArrangement.canAccommodateExtraBed && (
        <>
          <label className="text-sm text-gray-700 whitespace-nowrap">
            Number of beds:
          </label>
          <div className="flex items-center w-max gap-2">
            <button
              type="button"
              onClick={handleDecrementNumberOfExtraBeds}
              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div>
              {" "}
              <Input
                type="number"
                value={sleepingArrangement.numberOfExtraBeds}
                onChange={(e) =>
                  handleNumberOfExtraBedsChange(Number(e.target.value))
                }
                className="w-16 text-center bg"
                min="0"
              />
            </div>
            <button
              type="button"
              onClick={handleIncrementNumberOfExtraBeds}
              className="w-8 h-8 flex  items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Alternative Sleeping Arrangement */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-base font-semibold text-gray-900 mb-2">
          Alternative Sleeping Arrangement (Optional)
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          If the standard sleeping arrangement isn't available, the guest will
          get one of the alternative bed options below.
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Does this room offer an alternate sleeping arrangement?
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="alternateArrangement"
              checked={!sleepingArrangement.hasAlternateArrangement}
              onChange={() => handleHasAlternateArrangementChange(false)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">No</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="alternateArrangement"
              checked={sleepingArrangement.hasAlternateArrangement}
              onChange={() => handleHasAlternateArrangementChange(true)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Yes</span>
          </label>
        </div>
      </div>
      {sleepingArrangement.hasAlternateArrangement && (
        <div>
          <div className="space-y-3">
            {sleepingArrangement.alternateBeds.map(
              (bed: BedArrangement, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Select
                    label=""
                    value={bed.bedType}
                    error={
                      alternateErrorIndex === index
                        ? parsedAlternateErrorMessage
                        : undefined
                    }
                    onChange={(e) =>
                      handleAlternateBedTypeChange(e.target.value, index)
                    }
                    options={getAlternateBedOptions(index)}
                    className="flex-1"
                  />
                  {sleepingArrangement.alternateBeds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAlternateBed(index)}
                      className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <label className="text-sm text-gray-700 whitespace-nowrap">
                    Number of beds:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleDecrementNumberOfAlternateBeds(index)
                      }
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <Input
                      type="number"
                      value={bed.numberOfBeds}
                      onChange={(e) =>
                        handleNumberOfAlternateBedsChange(
                          Number(e.target.value),
                          index
                        )
                      }
                      className="w-16 text-center"
                      min="0"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleIncrementNumberOfAlternateBeds(index)
                      }
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            )}
            <button
              type="button"
              onClick={handleAddAlternateBed}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Another Bed Type
            </button>
          </div>
        </div>
      )}

      {/* Occupancy */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-base font-semibold text-gray-900 mb-2">
          Occupancy
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Occupancy details have been pre-filled based on the selected bed
          arrangement above.
        </p>
        <div className="space-y-4">
          {[
            {
              key: "baseAdults",
              label: "Base adults",
              error: errors.sleepingArrangement?.baseAdults,
              value: sleepingArrangement.baseAdults,
              onChange: (baseAdults: number) =>
                handleBaseAdultsChange(baseAdults),
              onDecrement: handleDecrementBaseAdults,
              onIncrement: handleIncrementBaseAdults,
              description:
                "Ideal number of adults supported by the standard sleeping arrangement.",
            },
            {
              key: "maxAdults",
              label: "Maximum adults",
              error: errors.sleepingArrangement?.maxAdults,
              value: sleepingArrangement.maxAdults,
              onChange: (maxAdults: number) => handleMaxAdultsChange(maxAdults),
              onDecrement: handleDecrementMaxAdults,
              onIncrement: handleIncrementMaxAdults,
              description:
                "Maximum number of adults that can be accommodated in this room.",
            },
            {
              key: "baseChildren",
              label: "Base children",
              error: errors.sleepingArrangement?.baseChildren,
              value: sleepingArrangement.baseChildren,
              onChange: (baseChildren: number) =>
                handleBaseChildrenChange(baseChildren),
              onDecrement: handleDecrementBaseChildren,
              onIncrement: handleIncrementBaseChildren,
              description:
                "Maximum number of free children that can be accommodated in this room.",
            },
            {
              key: "maxChildren",
              label: "Maximum children",
              error: errors.sleepingArrangement?.maxChildren,
              value: sleepingArrangement.maxChildren,
              onChange: (maxChildren: number) =>
                handleMaxChildrenChange(maxChildren),
              onDecrement: handleDecrementMaxChildren,
              onIncrement: handleIncrementMaxChildren,
              description:
                "Maximum number of children that can be accommodated in this room.",
            },
            {
              key: "maxOccupancy",
              label: "Maximum occupancy",
              error: errors.sleepingArrangement?.maxOccupancy,
              value: sleepingArrangement.maxOccupancy,
              onChange: (maxOccupancy: number) =>
                handleMaxOccupancyChange(maxOccupancy),
              onDecrement: handleDecrementMaxOccupancy,
              onIncrement: handleIncrementMaxOccupancy,
              description:
                "Maximum number of guests that can be accommodated in this room.",
            },
          ].map((item) => (
            <div key={item.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  {item.label}
                </label>
                {item.error && <p className="text-xs text-red-500">{item.error}</p>}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={item.onDecrement}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <Input
                    type="number"
                    value={item.value}
                    error={item.error&&" "}
                    onChange={(e) => item.onChange(Number(e.target.value))}
                    className="w-16 text-center"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={item.onIncrement}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
             
              <p className="text-xs text-gray-500">{item.description}</p>
              
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
