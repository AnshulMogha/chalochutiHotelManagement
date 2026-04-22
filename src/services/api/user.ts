import { apiClient } from "./client";
import type { User } from "@/types";
import { API_ENDPOINTS } from "@/constants";
import type { ApiSuccessResponse } from "./types";

export interface UpdateMyProfileRequest {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: "MALE" | "FEMALE" | "OTHER";
}

function normalizeUser(user?: Partial<User> | null, fallback: Partial<User> = {}): User {
  return {
    userId: user?.userId ?? fallback.userId ?? 0,
    email: user?.email ?? fallback.email ?? "",
    mobile:
      user?.mobile ??
      user?.phoneNumber ??
      fallback.mobile ??
      fallback.phoneNumber ??
      null,
    phoneNumber:
      user?.phoneNumber ??
      user?.mobile ??
      fallback.phoneNumber ??
      fallback.mobile ??
      null,
    accountStatus: user?.accountStatus ?? fallback.accountStatus ?? "ACTIVE",
    firstName: user?.firstName ?? fallback.firstName ?? null,
    lastName: user?.lastName ?? fallback.lastName ?? null,
    avatarUrl: user?.avatarUrl ?? fallback.avatarUrl ?? null,
    gender: user?.gender ?? fallback.gender ?? null,
    dob: user?.dob ?? fallback.dob ?? null,
    roles: user?.roles ?? fallback.roles ?? [],
    permissions: user?.permissions ?? fallback.permissions ?? [],
    states: user?.states ?? fallback.states ?? [],
    createdAt: user?.createdAt ?? fallback.createdAt ?? "",
  };
}

const userApi = {
  getUser: async (): Promise<User> => {
    const response = await apiClient.get<ApiSuccessResponse<User>>(
      API_ENDPOINTS.USER.GET_USER
    );
    return normalizeUser(response.data);
  },
  updateProfile: async (data: UpdateMyProfileRequest): Promise<User> => {
    const response = await apiClient.put<ApiSuccessResponse<User>>(
      API_ENDPOINTS.USER.UPDATE_PROFILE,
      data,
    );
    return normalizeUser(response.data, {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      mobile: data.phoneNumber,
      dob: data.dob,
      gender: data.gender,
    });
  },
  updatePicture: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<ApiSuccessResponse<User>>(
      API_ENDPOINTS.USER.UPDATE_PICTURE,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return normalizeUser(response.data);
  },
};

export default userApi;
