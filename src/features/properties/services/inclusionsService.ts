import { apiClient } from "@/services/api/client";
import { API_ENDPOINTS } from "@/constants";
import type { ApiSuccessResponse } from "@/services/api/types";
import type {
  InclusionCatalogueCategory,
  InclusionCatalogueData,
  InclusionCatalogueItem,
  CreateHotelInclusionRequest,
  CreateRatePlanInclusionRequest,
  UpdateRatePlanInclusionRequest,
  RatePlanInclusionItem,
  RatePlanInclusionsData,
} from "./inclusionsTypes";

function unwrapPayload<T>(response: ApiSuccessResponse<T> | T): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as ApiSuccessResponse<T>).data;
  }
  return response as T;
}

function normalizeInclusion(raw: Record<string, unknown>): InclusionCatalogueItem {
  return {
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    description: (raw.description as string | null) ?? null,
    configurationType: String(raw.configurationType ?? "NONE"),
  };
}

function normalizeCategory(
  raw: Record<string, unknown>,
): InclusionCatalogueCategory {
  const inclusionsRaw = Array.isArray(raw.inclusions) ? raw.inclusions : [];
  return {
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    sortOrder: Number(raw.sortOrder ?? 0),
    inclusions: inclusionsRaw.map((item) =>
      normalizeInclusion(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {},
      ),
    ),
  };
}

function isEarlyLateCategory(cat: InclusionCatalogueCategory): boolean {
  const key = `${cat.code} ${cat.name}`.toUpperCase();
  return /EARLY|LATE|CHECK-?IN|CHECK-?OUT/.test(key);
}

function normalizeCatalogue(raw: Record<string, unknown>): InclusionCatalogueData {
  const categoriesRaw = Array.isArray(raw.categories) ? raw.categories : [];
  const categories = categoriesRaw
    .map((item) =>
      normalizeCategory(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {},
      ),
    )
    .sort((a, b) => {
      const aPin = isEarlyLateCategory(a) ? 0 : 1;
      const bPin = isEarlyLateCategory(b) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      return a.sortOrder - b.sortOrder;
    });
  return { categories };
}

export async function getInclusionsCatalogue(): Promise<InclusionCatalogueData> {
  const response = await apiClient.get<
    ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
  >(API_ENDPOINTS.MASTERS.INCLUSIONS);
  const payload = unwrapPayload(response);
  return normalizeCatalogue(
    payload && typeof payload === "object" ? payload : {},
  );
}

/**
 * GET /masters/inclusions/{inclusionCode}
 * Returns the full API envelope for inspection in the UI.
 */
export async function getInclusionDetailRaw(
  inclusionCode: string,
): Promise<unknown> {
  return apiClient.get<unknown>(
    API_ENDPOINTS.MASTERS.INCLUSION_DETAIL(inclusionCode),
  );
}

/**
 * GET /masters/inclusions/{inclusionCode}/configuration-schema
 * Returns the full API envelope for inspection in the UI.
 */
export async function getInclusionConfigurationSchemaRaw(
  inclusionCode: string,
): Promise<unknown> {
  return apiClient.get<unknown>(
    API_ENDPOINTS.MASTERS.INCLUSION_CONFIGURATION_SCHEMA(inclusionCode),
  );
}

/**
 * POST /hotel/{hotelId}/inclusions
 * Create with multi room/rate-plan assignments.
 */
export async function createHotelInclusion(
  hotelId: string,
  payload: CreateHotelInclusionRequest,
): Promise<unknown> {
  const response = await apiClient.post<
    ApiSuccessResponse<unknown> | unknown
  >(API_ENDPOINTS.HOTEL_ADMIN.CREATE_HOTEL_INCLUSION(hotelId), payload);
  return unwrapPayload(response);
}

/**
 * @deprecated Use createHotelInclusion
 * POST /hotel/{hotelId}/rooms/{roomKey}/rate-plans/{ratePlanId}/inclusions
 */
export async function createRatePlanInclusion(
  hotelId: string,
  roomKey: string,
  ratePlanId: string | number,
  payload: CreateRatePlanInclusionRequest,
): Promise<unknown> {
  return createHotelInclusion(hotelId, {
    ...payload,
    assignments: [
      {
        roomKey,
        ratePlanIds: [Number(ratePlanId)],
      },
    ],
  });
}

/**
 * GET /hotel/{hotelId}/rooms/{roomKey}/rate-plans/{ratePlanId}/inclusions
 * Returns the full API envelope for inspection in the UI.
 */
export async function getRatePlanInclusionsRaw(
  hotelId: string,
  roomKey: string,
  ratePlanId: string | number,
): Promise<unknown> {
  return apiClient.get<unknown>(
    API_ENDPOINTS.HOTEL_ADMIN.LIST_ROOM_RATE_PLAN_INCLUSIONS(
      hotelId,
      roomKey,
      ratePlanId,
    ),
  );
}

function normalizeRatePlanInclusionItem(
  raw: Record<string, unknown>,
): RatePlanInclusionItem {
  const detailsRaw =
    raw.details && typeof raw.details === "object"
      ? (raw.details as Record<string, unknown>)
      : {};
  return {
    id: Number(raw.id ?? 0),
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    category: raw.category != null ? String(raw.category) : null,
    offerType: String(raw.offerType ?? "FREE"),
    availabilityType:
      raw.availabilityType != null ? String(raw.availabilityType) : null,
    price: typeof raw.price === "number" ? raw.price : null,
    currency: raw.currency != null ? String(raw.currency) : null,
    pricingUnit: raw.pricingUnit != null ? String(raw.pricingUnit) : null,
    paymentLocation:
      raw.paymentLocation != null ? String(raw.paymentLocation) : null,
    validFrom: raw.validFrom != null ? String(raw.validFrom) : null,
    validTo: raw.validTo != null ? String(raw.validTo) : null,
    details: detailsRaw,
    active: typeof raw.active === "boolean" ? raw.active : true,
  };
}

function normalizeRatePlanInclusions(
  raw: Record<string, unknown>,
): RatePlanInclusionsData {
  const inclusionsRaw = Array.isArray(raw.inclusions) ? raw.inclusions : [];
  return {
    ratePlanId: Number(raw.ratePlanId ?? 0),
    planCode: raw.planCode != null ? String(raw.planCode) : null,
    inclusions: inclusionsRaw.map((item) =>
      normalizeRatePlanInclusionItem(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {},
      ),
    ),
  };
}

/** GET /hotel/{hotelId}/rooms/{roomKey}/rate-plans/{ratePlanId}/inclusions */
export async function getRatePlanInclusions(
  hotelId: string,
  roomKey: string,
  ratePlanId: string | number,
): Promise<RatePlanInclusionsData> {
  const response = await apiClient.get<
    ApiSuccessResponse<Record<string, unknown>> | Record<string, unknown>
  >(
    API_ENDPOINTS.HOTEL_ADMIN.LIST_ROOM_RATE_PLAN_INCLUSIONS(
      hotelId,
      roomKey,
      ratePlanId,
    ),
  );
  const payload = unwrapPayload(response);
  return normalizeRatePlanInclusions(
    payload && typeof payload === "object" ? payload : {},
  );
}

/**
 * PUT /hotel/{hotelId}/rooms/{roomKey}/rate-plans/{ratePlanId}/inclusions/{inclusionId}
 * Same body as create, without inclusionCode.
 */
export async function updateRatePlanInclusion(
  hotelId: string,
  roomKey: string,
  ratePlanId: string | number,
  inclusionId: string | number,
  payload: UpdateRatePlanInclusionRequest,
): Promise<unknown> {
  const response = await apiClient.put<
    ApiSuccessResponse<unknown> | unknown
  >(
    API_ENDPOINTS.HOTEL_ADMIN.UPDATE_ROOM_RATE_PLAN_INCLUSION(
      hotelId,
      roomKey,
      ratePlanId,
      inclusionId,
    ),
    payload,
  );
  return unwrapPayload(response);
}

/**
 * PUT …/inclusions/{inclusionId}/active-status
 * Body: { active: true | false }
 */
export async function updateRatePlanInclusionActiveStatus(
  hotelId: string,
  roomKey: string,
  ratePlanId: string | number,
  inclusionId: string | number,
  active: boolean,
): Promise<unknown> {
  const response = await apiClient.put<
    ApiSuccessResponse<unknown> | unknown
  >(
    API_ENDPOINTS.HOTEL_ADMIN.UPDATE_ROOM_RATE_PLAN_INCLUSION_ACTIVE_STATUS(
      hotelId,
      roomKey,
      ratePlanId,
      inclusionId,
    ),
    { active },
  );
  return unwrapPayload(response);
}
