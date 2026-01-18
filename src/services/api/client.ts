import axios from "axios";
import type { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import type { ApiFailureResponse } from "./types/api";

// Base URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// Error shape

export class ApiClient {
  static accessToken: string | null = null;
  private client: AxiosInstance;

  static setAccessToken(accessToken: string) {
    this.accessToken = accessToken;
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

  private setupInterceptors() {
    /* ============================
       REQUEST INTERCEPTOR
    ============================ */
    this.client.interceptors.request.use((config) => {
      const token = ApiClient.getAccessToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    /* ============================
       RESPONSE INTERCEPTOR
    ============================ */
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiFailureResponse>) => {
        const apiError: ApiFailureResponse = {
          traceId: error.response?.data.traceId || "",
          statusCode: error.response?.data.statusCode || 0,
          timestamp: error.response?.data.timestamp || "",
          data: error.response?.data.data || null,
          message:
            error.response?.data?.message ||
            error.message ||
            "Something went wrong",
          status: error.response?.data.statusCode || 0,
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
