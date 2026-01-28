/**
 * Social Account Token Refresh Utility
 *
 * Provides automatic token refresh for social media accounts that use OAuth.
 * This utility ensures API calls don't fail due to expired access tokens.
 *
 * Resolves #885 - YouTube OAuth Token Refresh in Streams API
 */

import { safeDecryptToken, safeEncryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { createSocialClient } from "@/lib/social";
import { tryCatch } from "@/lib/try-catch";
import type { SocialAccount } from "@prisma/client";

/**
 * Buffer time before token expiration to trigger a refresh (5 minutes)
 */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Result of getting a valid access token
 */
export interface TokenRefreshResult {
  /** The valid (possibly refreshed) access token */
  accessToken: string;
  /** Whether the token was refreshed */
  wasRefreshed: boolean;
}

/**
 * Check if a token is expired or about to expire
 *
 * @param tokenExpiresAt - The token expiration date
 * @returns true if the token is expired or will expire within the buffer window
 */
export function isTokenExpired(tokenExpiresAt: Date | null): boolean {
  if (!tokenExpiresAt) {
    // If no expiry is set, assume the token is valid
    return false;
  }

  const expiryWithBuffer = new Date(tokenExpiresAt.getTime() - TOKEN_EXPIRY_BUFFER_MS);
  return new Date() >= expiryWithBuffer;
}

/**
 * Get a valid access token for a social account, refreshing if necessary
 *
 * This function:
 * 1. Checks if the token is expired (with a 5-minute buffer)
 * 2. If expired and a refresh token exists, attempts to refresh
 * 3. Updates the database with new tokens on success
 * 4. Marks the account as EXPIRED if refresh fails
 *
 * @param account - The social account to get a valid token for
 * @returns The valid access token and whether it was refreshed
 * @throws Error if token is expired and cannot be refreshed
 */
export async function getValidAccessToken(
  account: SocialAccount,
): Promise<TokenRefreshResult> {
  const currentToken = safeDecryptToken(account.accessTokenEncrypted);

  // If token is not expired, return it directly
  if (!isTokenExpired(account.tokenExpiresAt)) {
    return {
      accessToken: currentToken,
      wasRefreshed: false,
    };
  }

  // Token is expired - check if we have a refresh token
  if (!account.refreshTokenEncrypted) {
    // No refresh token available - mark account as expired and throw
    await markAccountExpired(account.id, "Token expired and no refresh token available");
    throw new Error(
      `Access token expired for ${account.platform} account ${account.accountName}. No refresh token available.`,
    );
  }

  // Attempt to refresh the token
  const refreshToken = safeDecryptToken(account.refreshTokenEncrypted);
  const { data: refreshResult, error: refreshError } = await tryCatch(
    refreshToken_(account, refreshToken),
  );

  if (refreshError || !refreshResult) {
    // Refresh failed - mark account as expired and throw
    const errorMessage = refreshError?.message || "Token refresh failed";
    await markAccountExpired(account.id, errorMessage);
    throw new Error(
      `Failed to refresh token for ${account.platform} account ${account.accountName}: ${errorMessage}`,
    );
  }

  console.info(
    `Refreshed token for ${account.platform} account ${account.accountName} (${account.id})`,
  );

  return {
    accessToken: refreshResult.accessToken,
    wasRefreshed: true,
  };
}

/**
 * Refresh the access token using the platform-specific client
 *
 * @param account - The social account
 * @param refreshToken - The decrypted refresh token
 * @returns The new token response
 */
async function refreshToken_(
  account: SocialAccount,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date; }> {
  // Create a minimal client just for token refresh
  const client = await createSocialClient(account.platform);

  // Check if the client supports token refresh
  if (!client.refreshAccessToken) {
    throw new Error(`Platform ${account.platform} does not support token refresh`);
  }

  // Refresh the token
  const tokenResponse = await client.refreshAccessToken(refreshToken);

  // Encrypt new tokens
  const encryptedAccessToken = safeEncryptToken(tokenResponse.accessToken);
  const encryptedRefreshToken = tokenResponse.refreshToken
    ? safeEncryptToken(tokenResponse.refreshToken)
    : account.refreshTokenEncrypted; // Keep existing if not returned

  // Update the database with new tokens
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      accessTokenEncrypted: encryptedAccessToken,
      refreshTokenEncrypted: encryptedRefreshToken,
      tokenExpiresAt: tokenResponse.expiresAt,
      status: "ACTIVE", // Ensure account is marked as active
      updatedAt: new Date(),
    },
  });

  return {
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken,
    expiresAt: tokenResponse.expiresAt,
  };
}

/**
 * Mark an account as expired in the database
 *
 * @param accountId - The account ID to mark as expired
 * @param reason - The reason for expiration (for logging)
 */
async function markAccountExpired(accountId: string, reason: string): Promise<void> {
  console.warn(`Marking account ${accountId} as EXPIRED: ${reason}`);

  const { error } = await tryCatch(
    prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        status: "EXPIRED",
        updatedAt: new Date(),
      },
    }),
  );

  if (error) {
    console.error(`Failed to mark account ${accountId} as expired:`, error);
  }
}
