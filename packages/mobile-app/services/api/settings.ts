/**
 * Settings API Service
 * Handles user settings, preferences, and API key management
 */

import type { ApiResponse } from "../api-client";
import { apiClient } from "../api-client";

// ============================================================================
// Types
// ============================================================================

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeyWithFullKey extends ApiKey {
  key: string;
}

export interface ListApiKeysResponse {
  apiKeys: ApiKey[];
}

export interface CreateApiKeyResponse {
  apiKey: ApiKeyWithFullKey;
  message: string;
}

export interface DeleteApiKeyResponse {
  success: boolean;
  message: string;
}

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  enhancementCompleteNotifications: boolean;
  marketingNotifications: boolean;
  publicProfile: boolean;
  showActivity: boolean;
}

export interface GetPreferencesResponse {
  preferences: UserPreferences;
}

export interface UpdatePreferencesResponse {
  success: boolean;
  preferences: UserPreferences;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// API Key Methods
// ============================================================================

/**
 * List all API keys for the current user
 */
export async function listApiKeys(): Promise<ApiResponse<ListApiKeysResponse>> {
  return apiClient.get<ListApiKeysResponse>("/api/settings/api-keys");
}

/**
 * Create a new API key
 */
export async function createApiKey(
  name: string,
): Promise<ApiResponse<CreateApiKeyResponse>> {
  return apiClient.post<CreateApiKeyResponse>("/api/settings/api-keys", {
    name,
  });
}

/**
 * Delete (revoke) an API key
 */
export async function deleteApiKey(
  keyId: string,
): Promise<ApiResponse<DeleteApiKeyResponse>> {
  return apiClient.delete<DeleteApiKeyResponse>(
    `/api/settings/api-keys/${keyId}`,
  );
}

// ============================================================================
// Preferences Methods
// ============================================================================

/**
 * Get user preferences
 */
export async function getPreferences(): Promise<
  ApiResponse<GetPreferencesResponse>
> {
  return apiClient.get<GetPreferencesResponse>("/api/settings/preferences");
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  preferences: Partial<UserPreferences>,
): Promise<ApiResponse<UpdatePreferencesResponse>> {
  return apiClient.patch<UpdatePreferencesResponse>(
    "/api/settings/preferences",
    preferences,
  );
}

// ============================================================================
// Account Methods
// ============================================================================

/**
 * Delete user account
 */
export async function deleteAccount(): Promise<
  ApiResponse<DeleteAccountResponse>
> {
  return apiClient.delete<DeleteAccountResponse>("/api/settings/account");
}
