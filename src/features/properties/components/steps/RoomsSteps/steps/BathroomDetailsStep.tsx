import { Input } from "@/components/ui";
import { useFormContext } from "@/features/properties/context/useFormContext";
import { setNumberOfBathrooms } from "@/features/properties/state/actionCreators";
import { Minus, Plus } from "lucide-react";

export function BathroomDetailsStep() {
  const { roomDetailsState, setRoomDetailsState } = useFormContext();
  const { bathroomDetails } = roomDetailsState;

  const handleNumberOfBathroomsChange = (numberOfBathrooms: number) => {
    if (numberOfBathrooms >= 0) {
      setRoomDetailsState(setNumberOfBathrooms(numberOfBathrooms));
    }
  };
  const handleDecrementNumberOfBathrooms = () => {
    if (bathroomDetails.numberOfBathrooms > 0) {
      setRoomDetailsState(
        setNumberOfBathrooms(bathroomDetails.numberOfBathrooms - 1)
      );
    }
  };
  const handleIncrementNumberOfBathrooms = () => {
    setRoomDetailsState(
      setNumberOfBathrooms(bathroomDetails.numberOfBathrooms + 1)
    );
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Bathroom Details
      </h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Bathrooms
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDecrementNumberOfBathrooms}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Minus className="w-5 h-5" />
          </button>
          <Input
            type="number"
            value={bathroomDetails.numberOfBathrooms}
            onChange={(e) =>
              handleNumberOfBathroomsChange(Number(e.target.value))
            }
            className="w-24 text-center text-lg"
            min="0"
          />
          <button
            type="button"
            onClick={handleIncrementNumberOfBathrooms}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
