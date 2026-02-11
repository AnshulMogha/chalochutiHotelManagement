import { Plus, Minus } from "lucide-react";
import { Input, Select } from "@/components/ui";
// import { useFormContext } from "../context/useFormContext";
import { roomTypeOptions, roomViewOptions } from "../constants/roomOptions";
import { useFormContext } from "@/features/properties/context/useFormContext";


import {
  setRoomType,
  setRoomView,
  setRoomSize,
  setRoomSizeUnit,
  setRoomName,
  setTotalRooms,
  setDescription,
  setNumberOfBathrooms,
} from "@/features/properties/state/actionCreators";
import type { roomStepErrors, roomStepKeys } from "@/features/properties/types";

export function RoomDetailsStep({
  errors,
  resetFieldError,
  showBathroomField = true,
}: {
  errors: roomStepErrors;
  resetFieldError: (step: roomStepKeys, field: string) => void;
  showBathroomField?: boolean;
}) {
  const { roomDetailsState, setRoomDetailsState } = useFormContext();
  const roomDetails = roomDetailsState.roomDetails;



  function handleRoomTypeChange(value: string) {
    if (errors.roomDetails?.roomType) {
      resetFieldError("roomDetails", "roomType");
    }
    setRoomDetailsState(setRoomType(value));
  }

  function handleRoomViewChange(value: string) {
    if (errors.roomDetails?.roomView) {
      resetFieldError("roomDetails", "roomView");
    }
    setRoomDetailsState(setRoomView(value));
  }

  function handleRoomSizeChange(value: number) {
    if (errors.roomDetails?.roomSize) {
      resetFieldError("roomDetails", "roomSize");
    }
    setRoomDetailsState(setRoomSize(value));
  }

  function handleRoomSizeUnitChange(value: "SQFT" | "SQM") {
    if (errors.roomDetails?.roomSizeUnit) {
      resetFieldError("roomDetails", "roomSizeUnit");
    }
    setRoomDetailsState(setRoomSizeUnit(value));
  }

  function handleRoomNameChange(value: string) {
    if (errors.roomDetails?.roomName) {
      resetFieldError("roomDetails", "roomName");
    }
    setRoomDetailsState(setRoomName(value));
  }

  function handleTotalRoomsChange(value: number) {
    if (value >= 0) {
      if (errors.roomDetails?.totalRooms) {
        resetFieldError("roomDetails", "totalRooms");
      }
      setRoomDetailsState(setTotalRooms(value));
    }
  }

  function handleDescriptionChange(value: string) {
    if (errors.roomDetails?.description) {
      resetFieldError("roomDetails", "description");
    }
    setRoomDetailsState(setDescription(value));
  }
  function handleIncrementTotalRooms() {
    if (errors.roomDetails?.totalRooms) {
      resetFieldError("roomDetails", "totalRooms");
    }
    setRoomDetailsState(setTotalRooms(roomDetails.totalRooms + 1));
  }
  function handleDecrementTotalRooms() {
    if (roomDetails.totalRooms > 0) {
      if (errors.roomDetails?.totalRooms) {
        resetFieldError("roomDetails", "totalRooms");
      }
      setRoomDetailsState(setTotalRooms(roomDetails.totalRooms - 1));
    }
  }

  function handleNumberOfBathroomsChange(value: number) {
    if (value >= 1) {
      if (errors.roomDetails?.numberOfBathrooms) {
        resetFieldError("roomDetails", "numberOfBathrooms");
      }
      setRoomDetailsState(setNumberOfBathrooms(value));
    }
  }

  function handleIncrementNumberOfBathrooms() {
    if (errors.roomDetails?.numberOfBathrooms) {
      resetFieldError("roomDetails", "numberOfBathrooms");
    }
    setRoomDetailsState(setNumberOfBathrooms(roomDetails.numberOfBathrooms + 1));
  }

  function handleDecrementNumberOfBathrooms() {
    if (roomDetails.numberOfBathrooms > 1) {
      if (errors.roomDetails?.numberOfBathrooms) {
        resetFieldError("roomDetails", "numberOfBathrooms");
      }
      setRoomDetailsState(setNumberOfBathrooms(roomDetails.numberOfBathrooms - 1));
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-8">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Room Details</h3>
        <p className="text-sm text-gray-500">Provide comprehensive information about your room</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Room Type */}
        <Select
          label="Room Type"
          value={roomDetails.roomType}
          error={errors.roomDetails?.roomType}
          options={roomTypeOptions}
          required
          onChange={(e) => handleRoomTypeChange(e.target.value)}
        />

        {/* Room View */}
        <Select
          label="Room View"
          value={roomDetails.roomView}
          error={errors.roomDetails?.roomView}
          options={roomViewOptions}
          required
          onChange={(e) => handleRoomViewChange(e.target.value)}
        />

        {/* Room Size */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Room Size <span className="text-red-500">*</span>
          </label>

          <div className="flex gap-3">
            <Input
              type="number"
              placeholder="Enter room size"
              value={roomDetails.roomSize}
              error={errors.roomDetails?.roomSize}
              className="flex-1"
              required
              onChange={(e) => handleRoomSizeChange(Number(e.target.value))}
            />

            <Select
              value={roomDetails.roomSizeUnit}
              className="w-40"
              error={errors.roomDetails?.roomSizeUnit}
              options={[
                { value: "SQFT", label: "Square Feet" },
                { value: "SQM", label: "Square Meter" },
              ]}
              onChange={(e) =>
                handleRoomSizeUnitChange(e.target.value as "SQFT" | "SQM")
              }
            />
          </div>
        </div>

        {/* Room Name */}
        <Input
          label="Room Name Shown to User"
          placeholder="e.g., Deluxe Ocean View Room"
          value={roomDetails.roomName}
          required
          error={errors.roomDetails?.roomName}
          onChange={(e) => handleRoomNameChange(e.target.value)}
        />

        {/* Number of Rooms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            No. of Rooms of This Type (Inventory) <span className="text-red-500">*</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleDecrementTotalRooms()}
              disabled={roomDetails.totalRooms === 0}
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>

            <Input
              type="number"
              className="w-24 text-center font-medium"
              error={errors.roomDetails?.totalRooms}
              min={0}
              value={roomDetails.totalRooms}
              onChange={(e) => handleTotalRoomsChange(Number(e.target.value))}
            />

            <button
              type="button"
              className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors"
              onClick={() => handleIncrementTotalRooms()}
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {showBathroomField && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Bathrooms <span className="text-red-500">*</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleDecrementNumberOfBathrooms()}
                disabled={roomDetails.numberOfBathrooms <= 1}
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>

              <Input
                type="number"
                className="w-24 text-center font-medium"
                error={errors.roomDetails?.numberOfBathrooms}
                min={1}
                value={roomDetails.numberOfBathrooms}
                onChange={(e) => handleNumberOfBathroomsChange(Number(e.target.value))}
              />

              <button
                type="button"
                className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors"
                onClick={() => handleIncrementNumberOfBathrooms()}
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>

          <textarea
            rows={4}
            value={roomDetails.description}
            placeholder="Enter a detailed description of the room, including features, amenities, and any special characteristics..."
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}
