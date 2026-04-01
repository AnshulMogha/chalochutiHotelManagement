import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";
import { API_ENDPOINTS } from "@/constants";

export type TeamRole = 
  | "HOTEL_MANAGER"
  | "FRONT_DESK_EXEC"
  | "ACCOUNTANT";

export type PermissionModule = 
  | "BOOKINGS"
  | "MY_TEAM"
  | "RATES_INVENTORY"
  | "OFFERS"
  | "CONTENT"
  | "ANALYTICS"
  | "MESSAGES"
  | "DASHBOARD"
  | "FINANCE"
  // Property Information modules (Hotel Owner / Hotel Manager)
  // These are separate string keys so backend can grant permissions per section.
  | "PROPERTY_BASIC_INFO"
  | "PROPERTY_ROOMS_RATEPLANS"
  | "PROPERTY_PHOTOS_VIDEOS"
  | "PROPERTY_AMENITIES_RESTAURANTS"
  | "PROPERTY_POLICY_RULES"
  | "PROPERTY_FINANCE"
  | "PROPERTY_DOCUMENT";

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
  roles: TeamRole[];
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface UpdateTeamMemberRequest {
  roles: TeamRole[];
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
