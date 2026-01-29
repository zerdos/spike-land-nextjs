/**
 * Pinterest OAuth 2.0 Callback Route
 *
 * Handles OAuth callback from Pinterest, exchanges code for tokens,
 * retrieves account info, and stores connected account in the database.
 * GET /api/social/pinterest/callback
 */

import { auth } from "@/auth";
import { safeEncryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { PinterestClient } from "@/lib/social/clients/pinterest";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Helper to build redirect URL - uses orbit settings if workspaceSlug is available
 */
function buildRedirectUrl(
  baseUrl: string,
  workspaceSlug: string | undefined,
  queryParams: Record<string, string>,
): URL {
  const params = new URLSearchParams(queryParams);
  const path = workspaceSlug
    ? `/orbit/${workspaceSlug}/settings/accounts`
    : "/admin/social-media/accounts";
  return new URL(`${path}?${params.toString()}`, baseUrl);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.redirect(
      new URL("/login?error=Unauthorized", request.url),
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Helper to clear OAuth cookies
  const clearOAuthCookies = (response: NextResponse): NextResponse => {
    response.cookies.delete("pinterest_oauth_nonce");
    return response;
  };

  // Handle OAuth errors from Pinterest (before we have state data)
  if (error) {
    console.error("Pinterest OAuth error:", error, errorDescription);
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL(
          `/admin/social-media/accounts?error=${encodeURIComponent(errorDescription || error)}`,
          request.url,
        ),
      ),
    );
  }

  if (!code || !state) {
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL(
          "/admin/social-media/accounts?error=Invalid callback parameters",
          request.url,
        ),
      ),
    );
  }

  // Verify state
  let stateData: {
    userId: string;
    workspaceId: string;
    workspaceSlug?: string;
    timestamp: number;
    nonce?: string;
  };
  try {
    stateData = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8"),
    );
  } catch {
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL(
          "/admin/social-media/accounts?error=Invalid state parameter",
          request.url,
        ),
      ),
    );
  }

  // Helper for redirects now that we have workspaceSlug
  const redirect = (queryParams: Record<string, string>) =>
    buildRedirectUrl(request.url, stateData.workspaceSlug, queryParams);

  // Verify user ID matches
  if (stateData.userId !== session.user.id) {
    return clearOAuthCookies(
      NextResponse.redirect(redirect({ error: "User mismatch" })),
    );
  }

  // Verify workspaceId is present
  if (!stateData.workspaceId) {
    return clearOAuthCookies(
      NextResponse.redirect(redirect({ error: "Missing workspace context" })),
    );
  }

  // Check timestamp (expire after 10 minutes)
  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    return clearOAuthCookies(
      NextResponse.redirect(redirect({ error: "OAuth session expired" })),
    );
  }

  // Verify nonce from cookie to prevent replay attacks
  const storedNonce = request.cookies.get("pinterest_oauth_nonce")?.value;
  if (stateData.nonce && stateData.nonce !== storedNonce) {
    return clearOAuthCookies(
      NextResponse.redirect(redirect({ error: "Invalid security token" })),
    );
  }

  // Determine redirect URI (must match the one used in connect)
  const redirectUri = process.env["PINTEREST_CALLBACK_URL"] || (() => {
    const baseUrl = process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    return `${
      baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
    }/api/social/pinterest/callback`;
  })();

  // Exchange code for tokens
  const client = new PinterestClient();
  const { data: tokens, error: tokenError } = await tryCatch(
    client.exchangeCodeForTokens(code, redirectUri),
  );

  if (tokenError || !tokens) {
    console.error("Pinterest token exchange failed:", tokenError);
    return clearOAuthCookies(
      NextResponse.redirect(
        redirect({
          error: "Failed to connect Pinterest account. Please try again.",
        }),
      ),
    );
  }

  // Get account info
  const { data: accountInfo, error: accountError } = await tryCatch(
    client.getAccountInfo(),
  );

  if (accountError || !accountInfo) {
    console.error("Failed to get Pinterest account info:", accountError);
    return clearOAuthCookies(
      NextResponse.redirect(
        redirect({ error: "Failed to retrieve Pinterest account information." }),
      ),
    );
  }

  // Encrypt tokens before storing
  const encryptedAccessToken = safeEncryptToken(tokens.accessToken);
  const encryptedRefreshToken = tokens.refreshToken
    ? safeEncryptToken(tokens.refreshToken)
    : null;

  // Upsert SocialAccount in database (using workspace-scoped unique constraint)
  const { error: dbError } = await tryCatch(
    prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_accountId: {
          workspaceId: stateData.workspaceId,
          platform: "PINTEREST",
          accountId: accountInfo.platformId,
        },
      },
      update: {
        accountName: accountInfo.displayName,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        status: "ACTIVE",
        connectedAt: new Date(),
        metadata: {
          username: accountInfo.username,
          displayName: accountInfo.displayName,
          avatarUrl: accountInfo.avatarUrl,
          profileUrl: accountInfo.profileUrl,
        },
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id, // Keep for audit trail
        workspaceId: stateData.workspaceId,
        platform: "PINTEREST",
        accountId: accountInfo.platformId,
        accountName: accountInfo.displayName,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        status: "ACTIVE",
        metadata: {
          username: accountInfo.username,
          displayName: accountInfo.displayName,
          avatarUrl: accountInfo.avatarUrl,
          profileUrl: accountInfo.profileUrl,
        },
      },
    }),
  );

  if (dbError) {
    console.error("Database save failed:", dbError);
    return clearOAuthCookies(
      NextResponse.redirect(
        redirect({
          error: "Failed to save Pinterest connection. Please try again.",
        }),
      ),
    );
  }

  // Build redirect query params with results
  const queryParams: Record<string, string> = {
    connected: "pinterest",
    account: accountInfo.username,
  };

  // Clear OAuth cookies and redirect to success page
  return clearOAuthCookies(NextResponse.redirect(redirect(queryParams)));
}
