/**
 * API Client for Spike Land mobile app
 * Handles all HTTP communication with the backend
 */

import { API_CONFIG } from "@spike-npm-land/shared";
import * as SecureStore from "expo-secure-store";

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: "spike_access_token",
  REFRESH_TOKEN: "spike_refresh_token",
  API_KEY: "spike_api_key",
} as const;

// ============================================================================
// API Client Class
// ============================================================================

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_API_URL || API_CONFIG.PRODUCTION_URL;
    this.defaultTimeout = API_CONFIG.DEFAULT_TIMEOUT_MS;
  }

  /**
   * Get stored authentication token
   */
  async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  }

  /**
   * Store authentication token
   */
  async setAuthToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  /**
   * Clear authentication token
   */
  async clearAuthToken(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Get stored API key
   */
  async getApiKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.API_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Store API key
   */
  async setApiKey(apiKey: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.API_KEY, apiKey);
  }

  /**
   * Make an authenticated API request
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const { method = "GET", body, headers = {}, timeout } = options;

    const token = await this.getAuthToken();
    const apiKey = await this.getApiKey();

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    // Add authentication header
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    } else if (apiKey) {
      requestHeaders["X-API-Key"] = apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout || this.defaultTimeout,
    );

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          data: null,
          error: data?.error || data?.message || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      return {
        data: data as T,
        error: null,
        status: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        return {
          data: null,
          error: "Request timed out",
          status: 408,
        };
      }

      return {
        data: null,
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  /**
   * Upload a file to the API
   */
  async uploadFile<T>(
    endpoint: string,
    file: { uri: string; name: string; type: string; },
    additionalData?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const token = await this.getAuthToken();

    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          data: null,
          error: data?.error || data?.message || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      return {
        data: data as T,
        error: null,
        status: response.status,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Upload failed",
        status: 0,
      };
    }
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  get<T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  delete<T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
