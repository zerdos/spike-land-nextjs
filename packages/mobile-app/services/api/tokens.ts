/**
 * Tokens API Service
 * Handles token balance, purchases, and transactions
 */

import type { SubscriptionTier, TokenTransaction } from "@spike-npm-land/shared";
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
 * Redeem a voucher code
 */
export async function redeemVoucher(
  code: string,
): Promise<ApiResponse<RedeemVoucherResponse>> {
  return apiClient.post<RedeemVoucherResponse>("/api/vouchers/redeem", {
    code,
  });
}
