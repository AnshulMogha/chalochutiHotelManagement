import { apiClient } from "@/services/api/client";
import { API_ENDPOINTS } from "@/constants";
import type { User } from "@/types";
import type {
  GetAccessTokenResponse,
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  VerifyResetOtpRequest,
  VerifyResetOtpResponse,
  ResetPasswordRequest,
  ResendPasswordResetOtpRequest,
} from "./api.types";
import type { ApiSuccessResponse} from "@/services/api/types";

export const authService = {
  refreshAccessToken: async (): Promise<GetAccessTokenResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<GetAccessTokenResponse>>(
      API_ENDPOINTS.AUTH.GET_ACCESS_TOKEN
    );
    return response.data;
  },
  sendOtp: async (email: string): Promise<SendOtpResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<SendOtpResponse>>(
      API_ENDPOINTS.AUTH.LOGIN_WITH_EMAIL,
      {
        email,
      } as SendOtpRequest
    );
    return response.data;
  },
  resendOtp: async (tempToken: string): Promise<ApiSuccessResponse<null>> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.AUTH.RESEND_OTP,
      {
        tempToken,
      }
    );
    return response;
  },
  verifyOtpAdmin: async (payload: {
    tempToken: string;
    otp: string;
  }): Promise<VerifyOtpResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<VerifyOtpResponse>>(
      API_ENDPOINTS.AUTH.VERIFY_OTP_ADMIN,
      {
        tempToken: payload.tempToken,
        otp: payload.otp,
      }
    );
    return response.data;
  },
  resendOtpAdmin: async (tempToken: string): Promise<ApiSuccessResponse<null>> => {
    const response = await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.AUTH.RESEND_OTP_ADMIN,
      {
        tempToken,
      }
    );
    return response;
  },
  verifyOtp: async (payload: {
    tempToken: string;
    otp: string;
  }): Promise<VerifyOtpResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<VerifyOtpResponse>>(
      API_ENDPOINTS.AUTH.VERIFY_OTP,
      {
        otp: payload.otp,
        tempToken: payload.tempToken,
      } as VerifyOtpRequest
    );
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    return apiClient.get<User>(API_ENDPOINTS.AUTH.ME);
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Even if API call fails, clear local storage
      console.error("Logout error:", error);
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    localStorage.removeItem("auth_session");
  },
  login: async (
    payload: LoginRequest
  ): Promise<LoginResponse> => {
    const response = await apiClient.post<
      ApiSuccessResponse<LoginResponse>
    >(API_ENDPOINTS.AUTH.LOGIN, payload);
    return response.data;
  },
  changePassword: async (payload: ChangePasswordRequest): Promise<void> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      payload
    );
  },
  forgotPassword: async (
    payload: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<ForgotPasswordResponse>>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      payload
    );
    return response.data;
  },
  verifyResetOtp: async (
    payload: VerifyResetOtpRequest
  ): Promise<VerifyResetOtpResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<VerifyResetOtpResponse>>(
      API_ENDPOINTS.AUTH.VERIFY_RESET_OTP,
      payload
    );
    return response.data;
  },
  resetPassword: async (payload: ResetPasswordRequest): Promise<void> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      payload
    );
  },
  resendPasswordResetOtp: async (
    payload: ResendPasswordResetOtpRequest
  ): Promise<void> => {
    await apiClient.post<ApiSuccessResponse<null>>(
      API_ENDPOINTS.AUTH.RESEND_PASSWORD_RESET_OTP,
      payload
    );
  },
};
