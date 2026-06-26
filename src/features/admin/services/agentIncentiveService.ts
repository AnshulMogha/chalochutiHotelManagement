import { apiClient } from "@/services/api/client";
import { API_ENDPOINTS } from "@/constants";
import type { ApiSuccessResponse } from "@/services/api/types";

export type AgentAgencyTier =
  | "DIAMOND"
  | "PLATINUM"
  | "GOLD"
  | "SILVER"
  | "BRONZE";

export type IncentiveCategory = "HOTEL" | "PACKAGE";

export type IncentiveSource = "OTA_COMMISSION" | "PACKAGE_MARKUP";

export type IncentiveType = "PERCENTAGE" | "FLAT";

export interface AgentIncentiveConfigRequest {
  agencyTier: AgentAgencyTier;
  incentiveCategory: IncentiveCategory;
  incentiveSource: IncentiveSource;
  incentiveType: IncentiveType;
  incentiveValue: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface AgentIncentive {
  id: string;
  agencyTier: AgentAgencyTier;
  incentiveCategory: IncentiveCategory;
  incentiveSource: IncentiveSource;
  incentiveType: IncentiveType;
  incentiveValue: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version?: number;
  active?: boolean;
  createdAt?: string;
}

export interface AgentIncentiveListResponse {
  incentives: AgentIncentive[];
  total: number;
  page?: number;
  size?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function incentiveSourceForCategory(
  category: IncentiveCategory,
): IncentiveSource {
  return category === "HOTEL" ? "OTA_COMMISSION" : "PACKAGE_MARKUP";
}

function parseIncentiveList(
  data: unknown,
  params?: { page?: number; size?: number },
): AgentIncentiveListResponse {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;

  if (Array.isArray(data)) {
    return {
      incentives: data as AgentIncentive[],
      total: data.length,
      page,
      size,
    };
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.incentives)) {
      return {
        incentives: obj.incentives as AgentIncentive[],
        total: (obj.total as number) ?? obj.incentives.length,
        page: obj.page as number | undefined,
        size: obj.size as number | undefined,
        totalPages: obj.totalPages as number | undefined,
        hasNext: obj.hasNext as boolean | undefined,
        hasPrevious: obj.hasPrevious as boolean | undefined,
      };
    }
    if (Array.isArray(obj.content)) {
      const content = obj.content as AgentIncentive[];
      return {
        incentives: content,
        total: (obj.totalElements as number) ?? content.length,
        page: (obj.page as number) ?? page,
        size: (obj.size as number) ?? size,
        totalPages: obj.totalPages as number | undefined,
        hasNext: obj.hasNext as boolean | undefined,
        hasPrevious: obj.hasPrevious as boolean | undefined,
      };
    }
  }

  return { incentives: [], total: 0, page, size };
}

export const agentIncentiveService = {
  create: async (
    data: AgentIncentiveConfigRequest,
  ): Promise<AgentIncentive> => {
    const response = await apiClient.post<ApiSuccessResponse<AgentIncentive>>(
      API_ENDPOINTS.ADMIN.CREATE_AGENT_INCENTIVE,
      data,
    );
    return response.data;
  },

  getList: async (params?: {
    page?: number;
    size?: number;
    active?: boolean;
  }): Promise<AgentIncentiveListResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<AgentIncentive[] | AgentIncentiveListResponse>
    >(API_ENDPOINTS.ADMIN.GET_AGENT_INCENTIVES, { params });
    return parseIncentiveList(response.data, params);
  },

  getActive: async (): Promise<AgentIncentiveListResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<AgentIncentive[] | AgentIncentiveListResponse>
    >(API_ENDPOINTS.ADMIN.GET_ACTIVE_AGENT_INCENTIVES);
    return parseIncentiveList(response.data);
  },

  getById: async (id: string | number): Promise<AgentIncentive> => {
    const response = await apiClient.get<ApiSuccessResponse<AgentIncentive>>(
      API_ENDPOINTS.ADMIN.GET_AGENT_INCENTIVE_BY_ID(id),
    );
    return response.data;
  },

  deactivate: async (id: string | number): Promise<void> => {
    await apiClient.delete<ApiSuccessResponse<null>>(
      API_ENDPOINTS.ADMIN.GET_AGENT_INCENTIVE_BY_ID(id),
    );
  },
};
