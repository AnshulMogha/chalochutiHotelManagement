import axios from "axios";
import type { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import type { ApiFailureResponse, ApiSuccessResponse } from "./types/api";
import { API_ENDPOINTS } from "@/constants";
import { canEditPath, canEditHotelFinanceDetails, shouldBlockBasicInfoWriteRequest } from "@/lib/permissions";
import { canVerifyHotelBank } from "@/constants/roles";
import { getStoredUserProfile } from "@/lib/userProfileStorage";

// Base URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

type AccessTokenPayload = {
  accessToken: string;
  accessTokenExpiry: string;
};

type AuthSessionHandlers = {
  onAccessToken: (accessToken: string, accessTokenExpiry: string) => void;
  onSessionExpired: () => void;
};

type RetriableRequestConfig = AxiosRequestConfig & { _authRetry?: boolean };

let authSessionHandlers: AuthSessionHandlers | null = null;

export function bindAuthSessionHandlers(handlers: AuthSessionHandlers | null) {
  authSessionHandlers = handlers;
}

function requestUrl(config?: AxiosRequestConfig): string {
  return String(config?.url || "");
}

function isRefreshTokenRequest(url?: string): boolean {
  const path = String(url || "").toLowerCase();
  return (
    path.includes("refreshtoken") ||
    path.includes(API_ENDPOINTS.AUTH.GET_ACCESS_TOKEN.toLowerCase())
  );
}

function shouldAttemptTokenRefresh(
  config?: RetriableRequestConfig,
): boolean {
  if (!config || config._authRetry) return false;
  const path = requestUrl(config).toLowerCase();
  if (isRefreshTokenRequest(path)) return false;
  const skipFragments = [
    "/auth/login",
    "auth/login",
    "/auth/logout",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-reset-otp",
    "/auth/resend-password-reset-otp",
    "/auth/verify-otp",
    "/auth/resend-otp",
    "/auth/login/otp/resend",
  ];
  return !skipFragments.some((fragment) => path.includes(fragment));
}

function httpStatus(error: AxiosError<ApiFailureResponse>): number {
  const fromHttp = error.response?.status;
  if (typeof fromHttp === "number" && fromHttp > 0) return fromHttp;
  const fromBody = error.response?.data?.statusCode;
  return typeof fromBody === "number" ? fromBody : 0;
}

export class ApiClient {
  static accessToken: string | null = null;
  private static refreshInFlight: Promise<AccessTokenPayload> | null = null;
  private client: AxiosInstance;

  static setAccessToken(accessToken: string) {
    this.accessToken = accessToken || null;
  }

  static getAccessToken() {
    return this.accessToken;
  }

  constructor(baseURL: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true, 
    });

    this.setupInterceptors();
  }

  refreshAccessToken(): Promise<AccessTokenPayload> {
    if (ApiClient.refreshInFlight) return ApiClient.refreshInFlight;
    ApiClient.refreshInFlight = this.client
      .post<ApiSuccessResponse<AccessTokenPayload>>(
        API_ENDPOINTS.AUTH.GET_ACCESS_TOKEN,
      )
      .then((response) => {
        const payload = response.data?.data;
        if (!payload?.accessToken || !payload.accessTokenExpiry) {
          throw new Error("Invalid refresh response");
        }
        ApiClient.setAccessToken(payload.accessToken);
        authSessionHandlers?.onAccessToken(
          payload.accessToken,
          payload.accessTokenExpiry,
        );
        return payload;
      })
      .finally(() => {
        ApiClient.refreshInFlight = null;
      });
    return ApiClient.refreshInFlight;
  }

  private setupInterceptors() {
    /* ============================
       REQUEST INTERCEPTOR
    ============================ */
    this.client.interceptors.request.use((config) => {
      const token = ApiClient.getAccessToken();

      if (token && !isRefreshTokenRequest(config.url)) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Enforce view-only mode for non-owner/non-super-admin users on mapped modules.
      // If route module has no edit access, block write calls from UI.
      if (typeof window !== "undefined") {
        const method = (config.method || "get").toLowerCase();
        const isWriteMethod =
          method === "post" ||
          method === "put" ||
          method === "patch" ||
          method === "delete";
        if (isWriteMethod) {
          const requestUrl = String(config.url || "");
          const isAuthEndpoint =
            requestUrl.startsWith("/auth/") || requestUrl.startsWith("auth/");
          if (isAuthEndpoint) {
            return config;
          }
          const user = getStoredUserProfile();
          if (
            user &&
            shouldBlockBasicInfoWriteRequest(
              requestUrl,
              config.method || "get",
              user,
            )
          ) {
            return Promise.reject({
              message:
                "You cannot modify this section. Edit contact details in Property Contact Details, or ask a Super Admin.",
              statusCode: 403,
              status: "FORBIDDEN",
              traceId: "",
              timestamp: new Date().toISOString(),
              data: null,
            } satisfies ApiFailureResponse);
          }
          const isHotelFinanceUpdate =
            (method === "put" || method === "patch") &&
            /\/hotel\/[^/]+\/finance$/i.test(requestUrl);
          if (isHotelFinanceUpdate && !canEditHotelFinanceDetails(user)) {
            return Promise.reject({
              message:
                "You cannot modify finance details. You can verify the bank account only.",
              statusCode: 403,
              status: "FORBIDDEN",
              traceId: "",
              timestamp: new Date().toISOString(),
              data: null,
            } satisfies ApiFailureResponse);
          }
          const isFinanceVerifyBank =
            method === "post" &&
            /\/hotel\/[^/]+\/finance\/verify-bank$/i.test(requestUrl);
          if (isFinanceVerifyBank && canVerifyHotelBank(user?.roles)) {
            return config;
          }
          if (!canEditPath(user, window.location.pathname)) {
            return Promise.reject({
              message: "You have view-only access for this feature.",
              statusCode: 403,
              status: "FORBIDDEN",
              traceId: "",
              timestamp: new Date().toISOString(),
              data: null,
            } satisfies ApiFailureResponse);
          }
        }
      }

      return config;
    });

    /* ============================
       RESPONSE INTERCEPTOR
    ============================ */
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiFailureResponse>) => {
        const original = error.config as RetriableRequestConfig | undefined;
        const status = httpStatus(error);

        if (status === 401 && shouldAttemptTokenRefresh(original) && original) {
          try {
            const payload = await this.refreshAccessToken();
            original._authRetry = true;
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${payload.accessToken}`;
            return this.client.request(original);
          } catch {
            authSessionHandlers?.onSessionExpired();
          }
        } else if (
          status === 401 &&
          (isRefreshTokenRequest(original?.url) || original?._authRetry)
        ) {
          authSessionHandlers?.onSessionExpired();
        }

        const body = error.response?.data;
        const apiError: ApiFailureResponse = {
          traceId: body?.traceId || "",
          statusCode: body?.statusCode || 0,
          timestamp: body?.timestamp || "",
          data: body?.data || null,
          message:
            body?.message ||
            error.message ||
            "Something went wrong",
          status: body?.statusCode || 0,
        };

        return Promise.reject(apiError);
      }
    );
  }

  /* ============================
     HTTP METHODS
  ============================ */

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

// Singleton instance
export const apiClient = new ApiClient();
