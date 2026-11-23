import { apiClient } from "./client";
import type { User } from "@/types";
import { API_ENDPOINTS } from "@/constants";
import { resolveStaycoreUploadUrl } from "@/features/reviews/services/reviewMediaUrl";
import type { ApiSuccessResponse } from "./types";

export interface UpdateMyProfileRequest {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: "MALE" | "FEMALE" | "OTHER";
}

function normalizeRolesFromApi(
  user?: Partial<User> & { role?: string | string[] },
): string[] {
  if (Array.isArray(user?.roles) && user.roles.length > 0) {
    return user.roles.filter(
      (r) => typeof r === "string" && r.trim().length > 0,
    );
  }
  const single = user?.role;
  if (Array.isArray(single)) {
    return single.filter((r) => typeof r === "string" && r.trim().length > 0);
  }
  if (typeof single === "string" && single.trim().length > 0) {
    return [single.trim()];
  }
  return [];
}

function readAvatarValue(
  user?: (Partial<User> & Record<string, unknown>) | null,
): string | null {
  if (!user) return null;
  const candidates = [
    user.avatarUrl,
    user.profileImageUrl,
    user.profileImage,
    user.profilePicture,
    user.pictureUrl,
    user.imageUrl,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return null;
}

function normalizeUser(user?: Partial<User> | null, fallback: Partial<User> = {}): User {
  const rawAvatar = readAvatarValue(user) ?? fallback.avatarUrl ?? null;
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
    avatarUrl: resolveStaycoreUploadUrl(rawAvatar),
    gender: user?.gender ?? fallback.gender ?? null,
    dob: user?.dob ?? fallback.dob ?? null,
    roles: normalizeRolesFromApi(user) ?? fallback.roles ?? [],
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
