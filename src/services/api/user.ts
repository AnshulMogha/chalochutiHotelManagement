import { apiClient } from "./client";
import type { User } from "@/types";
import { API_ENDPOINTS } from "@/constants";
import type { ApiSuccessResponse } from "./types";

const userApi = {
  getUser: async (): Promise<User> => {
    const response = await apiClient.get<ApiSuccessResponse<User>>(
      API_ENDPOINTS.USER.GET_USER
    );
    return response.data;
  },
};

export default userApi;
