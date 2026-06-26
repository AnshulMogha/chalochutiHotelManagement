import { apiClient } from "@/services/api/client";
import { API_ENDPOINTS } from "@/constants";
import type { ApiSuccessResponse } from "@/services/api/types";

// Commission Types
export type CommissionScope =
  | "GLOBAL"
  | "HOTEL"
  | "CITY"
  | "CHANNEL"
  | "AGENCY_TIER";
export type CommissionType = "PERCENTAGE" | "FLAT";
export type AgencyTier = "DIAMOND" | "PLATINUM" | "GOLD" | "SILVER" | "BRONZE";

export interface CreateCommissionRequest {
  scope: CommissionScope;
  scopeValue: string | null;
  agencyTier?: AgencyTier | null;
  commissionType: CommissionType;
  commissionValue: number;
  effectiveFrom: string;
}

export interface Commission {
  id: string;
  scope: CommissionScope;
  scopeValue: string | null;
  agencyTier?: AgencyTier | null;
  commissionType: CommissionType;
  commissionValue: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version: number;
  active: boolean;
  createdAt: string;
}

export interface CommissionListResponse {
  commissions: Commission[];
  total: number;
  page?: number;
  size?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

// Tax Types
export type TaxType = "CGST" | "SGST" | "IGST";

export interface CreateTaxRequest {
  taxType: TaxType;
  percentage: number;
  stateCode: string | null; // Optional for IGST
  minAmount?: number | null;
  maxAmount?: number | null;
  effectiveFrom: string;
}

export interface Tax {
  id: string;
  taxType: TaxType;
  percentage: number;
  stateCode: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version: number;
  active: boolean;
  createdAt: string;
}

export interface TaxListResponse {
  taxes: Tax[];
  total: number;
}

// Service Fee Types
export type ServiceFeeScope = "GLOBAL" | "CUSTOMER_TYPE";
export type ServiceFeeCalculationType = "FLAT" | "PERCENTAGE";

export interface CreateServiceFeeRequest {
  scope: ServiceFeeScope;
  scopeValue?: string | null;
  calculationType: ServiceFeeCalculationType;
  feeValue: number;
  gstApplicable: boolean;
  gstRate: number;
  effectiveFrom: string;
}

export interface ServiceFee {
  id: string;
  scope: ServiceFeeScope;
  scopeValue?: string | null;
  calculationType: ServiceFeeCalculationType;
  feeValue: number;
  gstApplicable: boolean;
  gstRate: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version?: number;
  active?: boolean;
  createdAt?: string;
}

export interface ServiceFeeListResponse {
  serviceFees: ServiceFee[];
  total: number;
}

export const commissionTaxService = {
  // Commission APIs
  createCommission: async (data: CreateCommissionRequest): Promise<Commission> => {
    const response = await apiClient.post<ApiSuccessResponse<Commission>>(
      API_ENDPOINTS.ADMIN.CREATE_COMMISSION,
      data
    );
    return response.data;
  },
  getCommissions: async (
    params?: { page?: number; size?: number; active?: boolean },
  ): Promise<CommissionListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<Commission[] | CommissionListResponse>>(
      API_ENDPOINTS.ADMIN.GET_COMMISSIONS,
      { params }
    );
    // Handle both array and wrapped response
    if (Array.isArray(response.data)) {
      return {
        commissions: response.data,
        total: response.data.length,
        page: params?.page ?? 0,
        size: params?.size ?? response.data.length,
      };
    }
    // If it's an object with commissions array
    if (response.data && typeof response.data === 'object' && 'commissions' in response.data) {
      return response.data as CommissionListResponse;
    }
    // Backend pageable shape: { content, totalElements, totalPages, page, size, hasNext, hasPrevious }
    if (response.data && typeof response.data === "object" && "content" in response.data) {
      const paged = response.data as {
        content: Commission[];
        totalElements?: number;
        totalPages?: number;
        page?: number;
        size?: number;
        hasNext?: boolean;
        hasPrevious?: boolean;
      };
      return {
        commissions: paged.content || [],
        total: paged.totalElements ?? (paged.content || []).length,
        totalPages: paged.totalPages,
        page: paged.page,
        size: paged.size,
        hasNext: paged.hasNext,
        hasPrevious: paged.hasPrevious,
      };
    }
    // Fallback to empty array
    return {
      commissions: [],
      total: 0,
      page: params?.page ?? 0,
      size: params?.size ?? 10,
    };
  },
  getActiveCommissions: async (): Promise<CommissionListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<Commission[] | CommissionListResponse>>(
      API_ENDPOINTS.ADMIN.GET_ACTIVE_COMMISSIONS
    );
    // Handle both array and wrapped response
    if (Array.isArray(response.data)) {
      return { commissions: response.data, total: response.data.length };
    }
    return response.data as CommissionListResponse;
  },
  getCommissionById: async (id: string | number): Promise<Commission> => {
    const response = await apiClient.get<ApiSuccessResponse<Commission>>(
      API_ENDPOINTS.ADMIN.GET_COMMISSION_BY_ID(id)
    );
    return response.data;
  },
  deactivateCommission: async (id: string | number): Promise<void> => {
    await apiClient.delete<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.GET_COMMISSION_BY_ID(id),
    );
  },
  // Tax APIs
  createTax: async (data: CreateTaxRequest): Promise<Tax> => {
    const response = await apiClient.post<ApiSuccessResponse<Tax>>(
      API_ENDPOINTS.ADMIN.CREATE_TAX,
      data
    );
    return response.data;
  },
  getTaxes: async (): Promise<TaxListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<Tax[] | TaxListResponse>>(
      API_ENDPOINTS.ADMIN.GET_TAXES
    );
    // Handle both array and wrapped response
    if (Array.isArray(response.data)) {
      return { taxes: response.data, total: response.data.length };
    }
    return response.data as TaxListResponse;
  },
  getActiveTaxes: async (): Promise<TaxListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<Tax[] | TaxListResponse>>(
      API_ENDPOINTS.ADMIN.GET_ACTIVE_TAXES
    );
    // Handle both array and wrapped response
    if (Array.isArray(response.data)) {
      return { taxes: response.data, total: response.data.length };
    }
    return response.data as TaxListResponse;
  },
  getTaxById: async (id: string | number): Promise<Tax> => {
    const response = await apiClient.get<ApiSuccessResponse<Tax>>(
      API_ENDPOINTS.ADMIN.GET_TAX_BY_ID(id)
    );
    return response.data;
  },
  deactivateTax: async (id: string | number): Promise<void> => {
    await apiClient.delete<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.GET_TAX_BY_ID(id),
    );
  },
  // Service Fee APIs
  createServiceFee: async (data: CreateServiceFeeRequest): Promise<ServiceFee> => {
    const response = await apiClient.post<ApiSuccessResponse<ServiceFee>>(
      API_ENDPOINTS.ADMIN.CREATE_SERVICE_FEE,
      data
    );
    return response.data;
  },
  getServiceFees: async (): Promise<ServiceFeeListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<ServiceFee[] | ServiceFeeListResponse>>(
      API_ENDPOINTS.ADMIN.GET_SERVICE_FEES
    );
    if (Array.isArray(response.data)) {
      return { serviceFees: response.data, total: response.data.length };
    }
    if (response.data && typeof response.data === "object" && "serviceFees" in response.data) {
      return response.data as ServiceFeeListResponse;
    }
    // Fallback: backend may return { content: [...] }
    if (response.data && typeof response.data === "object" && "content" in response.data) {
      const content = (response.data as { content: ServiceFee[] }).content || [];
      return { serviceFees: content, total: content.length };
    }
    return { serviceFees: [], total: 0 };
  },
  getServiceFeeById: async (id: string | number): Promise<ServiceFee> => {
    const response = await apiClient.get<ApiSuccessResponse<ServiceFee>>(
      API_ENDPOINTS.ADMIN.GET_SERVICE_FEE_BY_ID(id)
    );
    return response.data;
  },
  deactivateServiceFee: async (id: string | number): Promise<void> => {
    await apiClient.delete<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.GET_SERVICE_FEE_BY_ID(id),
    );
  },
};

