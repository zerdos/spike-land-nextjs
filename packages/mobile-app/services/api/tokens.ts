/**
 * Tokens API Service
 * Handles token balance, purchases, and transactions
 */

import type { SubscriptionTier, TokensPackage, TokenTransaction } from "@spike-npm-land/shared";
import { apiClient, ApiResponse } from "../api-client";

// ============================================================================
// Types
// ============================================================================

export interface TokenBalanceResponse {
  balance: number;
  tier: SubscriptionTier;
  lastRegeneration: string;
  maxBalance: number;
  timeUntilNextRegen: number;
}

export interface TokenHistoryResponse {
  transactions: TokenTransaction[];
  total: number;
  page: number;
  limit: number;
}

export interface TokenPackagesResponse {
  packages: TokensPackage[];
}

export interface RedeemVoucherResponse {
  success: boolean;
  tokensGranted: number;
  newBalance: number;
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Get current token balance
 */
export async function getTokenBalance(): Promise<
  ApiResponse<TokenBalanceResponse>
> {
  return apiClient.get<TokenBalanceResponse>("/api/tokens/balance");
}

/**
 * Get token transaction history
 */
export async function getTokenHistory(params?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse<TokenHistoryResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return apiClient.get<TokenHistoryResponse>(
    `/api/tokens/history${query ? `?${query}` : ""}`,
  );
}

/**
 * Get available token packages
 */
export async function getTokenPackages(): Promise<
  ApiResponse<TokenPackagesResponse>
> {
  return apiClient.get<TokenPackagesResponse>("/api/tokens/packages");
}

/**
 * Redeem a voucher code
 */
export async function redeemVoucher(
  code: string,
): Promise<ApiResponse<RedeemVoucherResponse>> {
  return apiClient.post<RedeemVoucherResponse>("/api/vouchers/redeem", {
    code,
  });
}

/**
 * Validate a voucher code without redeeming
 */
export async function validateVoucher(code: string): Promise<
  ApiResponse<{
    valid: boolean;
    type: string;
    value: number;
  }>
> {
  return apiClient.post<{ valid: boolean; type: string; value: number; }>(
    "/api/vouchers/validate",
    { code },
  );
}
