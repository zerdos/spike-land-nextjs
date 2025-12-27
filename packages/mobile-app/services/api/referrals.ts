/**
 * Referrals API Service
 * Handles referral program functionality
 */

import type { Referral, ReferralStatus } from "@spike-land/shared";
import { apiClient, ApiResponse } from "../api-client";

// ============================================================================
// Types
// ============================================================================

export interface ReferralCodeResponse {
  code: string;
  url: string;
}

export interface ReferralStatsResponse {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  tokensEarned: number;
}

export interface ReferredUser {
  id: string;
  email: string;
  name: string | null;
  status: ReferralStatus;
  createdAt: string;
  tokensGranted: number;
}

export interface ReferredUsersResponse {
  users: ReferredUser[];
  total: number;
  page: number;
  limit: number;
}

export interface ValidateReferralResponse {
  valid: boolean;
  referrerName?: string;
  bonusTokens: number;
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Get current user's referral code and link
 */
export async function getReferralCode(): Promise<
  ApiResponse<ReferralCodeResponse>
> {
  return apiClient.get<ReferralCodeResponse>("/api/referral/link");
}

/**
 * Get referral statistics
 */
export async function getReferralStats(): Promise<
  ApiResponse<ReferralStatsResponse>
> {
  return apiClient.get<ReferralStatsResponse>("/api/referral/stats");
}

/**
 * Get list of referred users
 */
export async function getReferredUsers(params?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse<ReferredUsersResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return apiClient.get<ReferredUsersResponse>(
    `/api/referral/users${query ? `?${query}` : ""}`,
  );
}

/**
 * Validate a referral code (for use during signup)
 */
export async function validateReferralCode(
  code: string,
): Promise<ApiResponse<ValidateReferralResponse>> {
  return apiClient.post<ValidateReferralResponse>("/api/referral/validate", {
    code,
  });
}

/**
 * Apply referral code during signup
 */
export async function applyReferralCode(
  code: string,
): Promise<ApiResponse<{ success: boolean; tokensGranted: number; }>> {
  return apiClient.post<{ success: boolean; tokensGranted: number; }>(
    "/api/referral/apply",
    { code },
  );
}
