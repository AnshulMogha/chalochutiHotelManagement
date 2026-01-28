import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";

export type TeamRole = 
  | "HOTEL_MANAGER"
  | "FRONT_DESK_EXEC"
  | "HOUSEKEEPING_STAFF"
  | "ACCOUNTANT"
  | "BOOKING_AGENT"
  | "READ_ONLY";

export type PermissionModule = 
  | "BOOKINGS"
  | "RATES_INVENTORY"
  | "OFFERS"
  | "CONTENT"
  | "ANALYTICS"
  | "MESSAGES"
  | "DASHBOARD"
  | "FINANCE";

export interface Permission {
  module: PermissionModule;
  canView: boolean;
  canEdit: boolean;
}

export interface TeamMember {
  accessId: number;
  userId: number;
  role: string;
  permissions: Permission[];
  email: string;
  mobile: string | null;
  accountStatus: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  gender: string | null;
  dob: string | null;
  roles: string[];
  createdAt: string;
}

export interface CreateTeamMemberRequest {
  email: string;
  role: TeamRole;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface UpdateTeamMemberRequest {
  role: TeamRole;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface AssignPermissionsRequest {
  permissions: Permission[];
}

export const teamService = {
  getTeamMembers: async (hotelId: string): Promise<TeamMember[]> => {
    const response = await apiClient.get<ApiSuccessResponse<TeamMember[]>>(
      API_ENDPOINTS.HOTEL_ADMIN.GET_TEAM_MEMBERS(hotelId)
    );
    return response.data;
  },

  assignHotelToUser: async (
    hotelId: string,
    userId: string | number
  ): Promise<TeamMember> => {
    const response = await apiClient.post<ApiSuccessResponse<TeamMember>>(
      API_ENDPOINTS.HOTEL_ADMIN.ASSIGN_HOTEL_TO_USER(hotelId, userId)
    );
    return response.data;
  },

  assignPermissions: async (
    accessId: string | number,
    data: AssignPermissionsRequest
  ): Promise<null> => {
    const response = await apiClient.put<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.ASSIGN_PERMISSIONS(accessId),
      data.permissions
    );
    return response.data;
  },

  revokeAccess: async (accessId: string | number): Promise<null> => {
    const response = await apiClient.delete<ApiSuccessResponse<null>>(
      API_ENDPOINTS.HOTEL_ADMIN.REVOKE_ACCESS(accessId)
    );
    return response.data;
  },
};
