import { Check } from "lucide-react";
import { cn } from "@/lib/utils";


import { useEffect, useState } from "react";
import { propertyService } from "@/features/properties/services/propertyService";
import { useFormContext } from "@/features/properties/context/useFormContext";
import { setAvailableRoomAmenities, setSelectedRoomAmenity } from "@/features/properties/state/actionCreators";
import type { roomStepErrors, roomStepKeys } from "@/features/properties/types";
export function RoomAmenitiesStep({
  errors,
  resetFieldError,
}: {
  errors: roomStepErrors;
  resetFieldError: (step: roomStepKeys, field: string) => void;
}) {
  const { roomDetailsState, setRoomDetailsState } = useFormContext();
  const { availableAmenities, selectedAmenities } =
    roomDetailsState.roomAmenities;
  const [activeCategory, setActiveCategory] = useState<string>("mandatory");
  const [loading, setLoading] = useState(false);
  const roomAmenitiesErrors = errors.roomAmenities;

  const toggleAmenity = (amenityId: string) => {
    setRoomDetailsState(setSelectedRoomAmenity(activeCategory, amenityId));
    resetFieldError("roomAmenities", activeCategory);
  };
  useEffect(() => {
    async function fetchAvailableRoomAmenities() {
      setLoading(true);
      try {
        const response = await propertyService.getAvailableRoomAmenities();
        setRoomDetailsState(
          setAvailableRoomAmenities({
            availableAmenities: response,
            // selectedAmenities: initializeSelectedAmenities(response),
          })
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchAvailableRoomAmenities();
  }, [ setRoomDetailsState]);
  const getCategoryCount = (categoryCode: string) => {
    const category = availableAmenities.find(
      (category) => category.categoryCode === categoryCode
    );
    const selected = category?.items.filter((item) =>
      selectedAmenities[categoryCode]?.includes(item.id)
    ).length;
    return { selected, total: category?.items.length };
  };

  const currentCategory = availableAmenities.find(
    (category) => category.categoryCode === activeCategory
  );

  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <div className="flex gap-6 h-[600px]">
      {/* Category Sidebar */}
      <div className="w-64 shrink-0 border-r border-gray-200 overflow-y-auto">
        <div className="space-y-1 p-2">
          {availableAmenities.map((category) => {
            const count = getCategoryCount(category.categoryCode);
            const isActive = activeCategory === category.categoryCode; // You can add active category state if needed
            return (
              <button
                key={category.categoryCode}
                type="button"
                onClick={() => setActiveCategory(category.categoryCode)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg transition-all",
                  "hover:bg-gray-50",
                  isActive
                    ? "bg-blue-50 text-blue-900 border-l-4 border-blue-600 font-medium"
                    : "text-gray-700"
                    ,
                    roomAmenitiesErrors?.[category.categoryCode]
                      ? "border-red-500 border-2"
                      : ""
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{category.categoryName}</span>
                  <span className="text-xs text-gray-500">
                    {count.selected} of {count.total}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amenities Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Room Amenities
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {currentCategory?.items.map((amenity) => {
              const isSelected = selectedAmenities[activeCategory]?.includes(
                amenity.id
              );
              return (
                <button
                  key={amenity.id}
                  type="button"
                  onClick={() => toggleAmenity(amenity.id)}
                  className={cn(
                    "flex items-center gap-1 p-2 rounded-lg border-2 transition-all",
                    "hover:border-blue-400 hover:bg-blue-50",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-gray-200 bg-white text-gray-700"
                  )}
                >
                  <span>{amenity.icon}</span>
                  <span className="text-xs flex-1 text-left">
                    {amenity.label}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
