// Custom hook for properties feature
// This demonstrates how to create feature-specific hooks

import { useApi } from "@/hooks";
import { propertyService } from "../services/propertyService";
import type { HotelFilters } from "../types";

export function useProperties(filters?: HotelFilters, immediate = true) {
  return useApi(
    () => propertyService.getAll(filters as Record<string, unknown>),
    { immediate }
  );
}

export function useProperty(id: string, immediate = true) {
  return useApi(
    () => propertyService.getById(id),
    { immediate }
  );
}

