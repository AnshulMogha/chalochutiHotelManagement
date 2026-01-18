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
} from "@/features/properties/state/actionCreators";
import type { roomStepErrors, roomStepKeys } from "@/features/properties/types";

export function RoomDetailsStep({
  errors,
  resetFieldError,
 
}: {
  errors: roomStepErrors;
  resetFieldError: (step: roomStepKeys, field: string) => void;
  
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
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Room Details</h3>

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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Room Size
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            No. of Rooms of This Type (Inventory)
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="w-8 h-8 border rounded-md hover:bg-gray-50 flex items-center justify-center"
              onClick={() => handleDecrementTotalRooms()}
            >
              <Minus className="w-4 h-4" />
            </button>

            <Input
              type="number"
              className="w-20 text-center"
              error={errors.roomDetails?.totalRooms}
              min={0}
              value={roomDetails.totalRooms}
              onChange={(e) => handleTotalRoomsChange(Number(e.target.value))}
            />

            <button
              type="button"
              className="w-8 h-8 border rounded-md hover:bg-gray-50 flex items-center justify-center"
              onClick={() => handleIncrementTotalRooms()}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>

          <textarea
            rows={4}
            value={roomDetails.description}
            placeholder="Enter room description..."
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

      
      </div>
    </div>
  );
}
