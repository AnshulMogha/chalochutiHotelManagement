import type { Amenity } from "@/features/properties/types";

const initializeSelectedAmenities = (
    categories: Amenity[]
  ): Record<string, string[]> => {
    return categories.reduce((acc, category) => {
      acc[category.categoryCode] = [];
      return acc;
    }, {} as Record<string, string[]>);
  };
  export default initializeSelectedAmenities;