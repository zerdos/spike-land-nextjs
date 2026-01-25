/**
 * YouTube OAuth 2.0 Callback Route
 *
 * Handles OAuth callback from Google, exchanges code for tokens,
 * stores the account in the database, and redirects to the accounts page.
 * GET /api/social/youtube/callback
 *
 * Uses Google OAuth 2.0 with offline access to get refresh tokens.
 */

import { auth } from "@/auth";
import { safeEncryptToken } from "@/lib/crypto/token-encryption";
import { YouTubeClient } from "@/lib/social/clients/youtube";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

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
    response.cookies.delete("youtube_oauth_nonce");
    return response;
  };

  // Handle OAuth errors from Google (before we have state data)
  if (error) {
    console.error("YouTube OAuth error:", error, errorDescription);
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
  const storedNonce = request.cookies.get("youtube_oauth_nonce")?.value;
  if (stateData.nonce && stateData.nonce !== storedNonce) {
    return clearOAuthCookies(
      NextResponse.redirect(redirect({ error: "Invalid security token" })),
    );
  }

  // Determine redirect URI (must match the one used in connect)
  const redirectUri = process.env.YOUTUBE_CALLBACK_URL || (() => {
    const baseUrl = process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    return `${
      baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
    }/api/social/youtube/callback`;
  })();

  // Exchange code for tokens
  const client = new YouTubeClient();
  const { data: tokens, error: tokenError } = await tryCatch(
    client.exchangeCodeForTokens(code, redirectUri),
  );

  if (tokenError || !tokens) {
    console.error("YouTube token exchange failed:", tokenError);
    return clearOAuthCookies(
      NextResponse.redirect(
        redirect({ error: "Failed to connect YouTube account. Please try again." }),
      ),
    );
  }

  // Verify we got a refresh token (required for long-term access)
  if (!tokens.refreshToken) {
    console.warn(
      "YouTube OAuth: No refresh token received. User may need to revoke access and reconnect.",
    );
  }

  // Get user's YouTube channel info with the new token
  const { data: channelInfo, error: channelError } = await tryCatch(
    client.getAccountInfo(),
  );

  if (channelError || !channelInfo) {
    console.error("Failed to get YouTube channel info:", channelError);
    // Pass through the detailed error message from the client if available
    const errorMessage = channelError instanceof Error
      ? channelError.message
      : "Failed to retrieve YouTube channel information. Make sure you have a YouTube channel.";
    return clearOAuthCookies(
      NextResponse.redirect(
        redirect({
          error: errorMessage,
        }),
      ),
    );
  }

  // Encrypt tokens for potential future storage
  const encryptedAccessToken = safeEncryptToken(tokens.accessToken);
  const encryptedRefreshToken = tokens.refreshToken
    ? safeEncryptToken(tokens.refreshToken)
    : null;

  // Log the successful connection (tokens are encrypted)
  console.info("YouTube channel connected:", {
    userId: session.user.id,
    channelId: channelInfo.platformId,
    channelName: channelInfo.displayName,
    hasRefreshToken: !!tokens.refreshToken,
    tokenExpiresAt: tokens.expiresAt?.toISOString(),
  });

  // Store the connected account in the database
  const { error: dbError } = await tryCatch(
    prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_accountId: {
          workspaceId: stateData.workspaceId,
          platform: "YOUTUBE",
          accountId: channelInfo.platformId,
        },
      },
      update: {
        accountName: channelInfo.displayName,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        status: "ACTIVE",
        connectedAt: new Date(),
        metadata: {
          username: channelInfo.username,
          displayName: channelInfo.displayName,
          avatarUrl: channelInfo.avatarUrl,
          profileUrl: channelInfo.profileUrl,
          subscriberCount: channelInfo.followersCount,
        },
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id, // Keep for audit trail
        workspaceId: stateData.workspaceId,
        platform: "YOUTUBE",
        accountId: channelInfo.platformId,
        accountName: channelInfo.displayName,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        status: "ACTIVE",
        metadata: {
          username: channelInfo.username,
          displayName: channelInfo.displayName,
          avatarUrl: channelInfo.avatarUrl,
          profileUrl: channelInfo.profileUrl,
          subscriberCount: channelInfo.followersCount,
        },
      },
    }),
  );

  if (dbError) {
    console.error("Database save failed:", dbError);
    return clearOAuthCookies(
      NextResponse.redirect(redirect({ error: "Failed to save account information." })),
    );
  }

  // Clear OAuth cookies and redirect to success page
  return clearOAuthCookies(
    NextResponse.redirect(
      redirect({
        connected: "youtube",
        channelName: channelInfo.displayName,
        channelId: channelInfo.platformId,
      }),
    ),
  );
}
