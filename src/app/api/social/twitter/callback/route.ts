/**
 * Twitter/X OAuth 2.0 Callback Route
 *
 * Handles OAuth callback from Twitter, exchanges code for tokens,
 * and stores the connected account in the database.
 * GET /api/social/twitter/callback
 */

import { auth } from "@/auth";
import { safeEncryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { TwitterClient } from "@/lib/social/clients/twitter";
import { getOAuthRedirectUri } from "@/lib/social/utils";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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
    response.cookies.delete("twitter_oauth_code_verifier");
    response.cookies.delete("twitter_oauth_nonce");
    return response;
  };

  // Handle OAuth errors from Twitter
  if (error) {
    console.error("Twitter OAuth error:", error, errorDescription);
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
  let stateData: { userId: string; workspaceId: string; timestamp: number; nonce?: string; };
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

  // Verify user ID matches
  if (stateData.userId !== session.user.id) {
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL("/admin/social-media/accounts?error=User mismatch", request.url),
      ),
    );
  }

  // Verify workspaceId is present
  if (!stateData.workspaceId) {
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL(
          "/admin/social-media/accounts?error=Missing workspace context",
          request.url,
        ),
      ),
    );
  }

  // Check timestamp (expire after 10 minutes)
  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL(
          "/admin/social-media/accounts?error=OAuth session expired",
          request.url,
        ),
      ),
    );
  }

  // Verify nonce from cookie to prevent replay attacks
  const storedNonce = request.cookies.get("twitter_oauth_nonce")?.value;
  if (stateData.nonce && stateData.nonce !== storedNonce) {
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL(
          "/admin/social-media/accounts?error=Invalid security token",
          request.url,
        ),
      ),
    );
  }

  // Get code_verifier from cookie (required for PKCE)
  const codeVerifier = request.cookies.get("twitter_oauth_code_verifier")?.value;
  if (!codeVerifier) {
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL(
          "/admin/social-media/accounts?error=Missing PKCE code verifier",
          request.url,
        ),
      ),
    );
  }

  // Determine redirect URI (must match the one used in connect)
  const redirectUri = getOAuthRedirectUri(
    "/api/social/twitter/callback",
    "TWITTER_CALLBACK_URL",
  );

  // Exchange code for tokens
  const client = new TwitterClient();
  const { data: tokens, error: tokenError } = await tryCatch(
    client.exchangeCodeForTokens(code, redirectUri, codeVerifier),
  );

  if (tokenError || !tokens) {
    console.error("Twitter token exchange failed:", tokenError);
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL(
          "/admin/social-media/accounts?error=Failed to connect Twitter account. Please try again.",
          request.url,
        ),
      ),
    );
  }

  // Get user info with the new token
  const { data: userInfo, error: userError } = await tryCatch(
    client.getAccountInfo(),
  );

  if (userError || !userInfo) {
    console.error("Failed to get Twitter user info:", userError);
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL(
          "/admin/social-media/accounts?error=Failed to retrieve Twitter account information.",
          request.url,
        ),
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
          platform: "TWITTER",
          accountId: userInfo.platformId,
        },
      },
      update: {
        accountName: userInfo.username,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        status: "ACTIVE",
        connectedAt: new Date(),
        metadata: {
          displayName: userInfo.displayName,
          avatarUrl: userInfo.avatarUrl,
          profileUrl: userInfo.profileUrl,
          followersCount: userInfo.followersCount,
          followingCount: userInfo.followingCount,
        },
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id, // Keep for audit trail
        workspaceId: stateData.workspaceId,
        platform: "TWITTER",
        accountId: userInfo.platformId,
        accountName: userInfo.username,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        status: "ACTIVE",
        metadata: {
          displayName: userInfo.displayName,
          avatarUrl: userInfo.avatarUrl,
          profileUrl: userInfo.profileUrl,
          followersCount: userInfo.followersCount,
          followingCount: userInfo.followingCount,
        },
      },
    }),
  );

  if (dbError) {
    console.error("Database save failed:", dbError);
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL(
          "/admin/social-media/accounts?error=Failed to save account information.",
          request.url,
        ),
      ),
    );
  }

  // Clear OAuth cookies and redirect to success page
  return clearOAuthCookies(
    NextResponse.redirect(
      new URL(
        `/admin/social-media/accounts?connected=twitter&username=${
          encodeURIComponent(userInfo.username)
        }`,
        request.url,
      ),
    ),
  );
}
