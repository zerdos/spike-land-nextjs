/**
 * YouTube OAuth 2.0 Callback Route
 *
 * Handles OAuth callback from Google, exchanges code for tokens,
 * and returns channel information.
 * GET /api/social/youtube/callback
 *
 * IMPORTANT: YouTube is NOT in the Prisma SocialPlatform enum.
 * Database storage requires a schema migration to add YOUTUBE.
 * For now, this route returns success with channel info but does NOT
 * persist to the database. To enable persistence:
 * 1. Add YOUTUBE to the SocialPlatform enum in prisma/schema.prisma
 * 2. Run prisma migrate
 * 3. Uncomment the database storage code below
 */

import { auth } from "@/auth";
import { safeEncryptToken } from "@/lib/crypto/token-encryption";
import { YouTubeClient } from "@/lib/social/clients/youtube";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Uncomment when YOUTUBE is added to SocialPlatform enum:
// import prisma from "@/lib/prisma";

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

  // Handle OAuth errors from Google
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
  let stateData: { userId: string; timestamp: number; nonce?: string; };
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
  const storedNonce = request.cookies.get("youtube_oauth_nonce")?.value;
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
        new URL(
          "/admin/social-media/accounts?error=Failed to connect YouTube account. Please try again.",
          request.url,
        ),
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
    return clearOAuthCookies(
      NextResponse.redirect(
        new URL(
          "/admin/social-media/accounts?error=Failed to retrieve YouTube channel information. Make sure you have a YouTube channel.",
          request.url,
        ),
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

  // ============================================================================
  // DATABASE STORAGE - DISABLED UNTIL YOUTUBE IS ADDED TO SocialPlatform ENUM
  // ============================================================================
  // To enable database storage:
  // 1. Add YOUTUBE to the SocialPlatform enum in prisma/schema.prisma:
  //    enum SocialPlatform {
  //      TWITTER
  //      LINKEDIN
  //      FACEBOOK
  //      INSTAGRAM
  //      TIKTOK
  //      YOUTUBE  // <-- Add this
  //    }
  // 2. Run: npx prisma migrate dev --name add-youtube-platform
  // 3. Uncomment the code below:
  //
  // const { error: dbError } = await tryCatch(
  //   prisma.socialAccount.upsert({
  //     where: {
  //       userId_platform_accountId: {
  //         userId: session.user.id,
  //         platform: "YOUTUBE",
  //         accountId: channelInfo.platformId,
  //       },
  //     },
  //     update: {
  //       accountName: channelInfo.displayName,
  //       accessTokenEncrypted: encryptedAccessToken,
  //       refreshTokenEncrypted: encryptedRefreshToken,
  //       tokenExpiresAt: tokens.expiresAt,
  //       status: "ACTIVE",
  //       connectedAt: new Date(),
  //       metadata: {
  //         username: channelInfo.username,
  //         displayName: channelInfo.displayName,
  //         avatarUrl: channelInfo.avatarUrl,
  //         profileUrl: channelInfo.profileUrl,
  //         subscriberCount: channelInfo.followersCount,
  //       },
  //       updatedAt: new Date(),
  //     },
  //     create: {
  //       userId: session.user.id,
  //       platform: "YOUTUBE",
  //       accountId: channelInfo.platformId,
  //       accountName: channelInfo.displayName,
  //       accessTokenEncrypted: encryptedAccessToken,
  //       refreshTokenEncrypted: encryptedRefreshToken,
  //       tokenExpiresAt: tokens.expiresAt,
  //       status: "ACTIVE",
  //       metadata: {
  //         username: channelInfo.username,
  //         displayName: channelInfo.displayName,
  //         avatarUrl: channelInfo.avatarUrl,
  //         profileUrl: channelInfo.profileUrl,
  //         subscriberCount: channelInfo.followersCount,
  //       },
  //     },
  //   }),
  // );
  //
  // if (dbError) {
  //   console.error("Database save failed:", dbError);
  //   return clearOAuthCookies(
  //     NextResponse.redirect(
  //       new URL(
  //         "/admin/social-media/accounts?error=Failed to save account information.",
  //         request.url,
  //       ),
  //     ),
  //   );
  // }
  // ============================================================================

  // Suppress unused variable warnings - these are prepared for future use
  // when YOUTUBE is added to the SocialPlatform enum
  void encryptedAccessToken;
  void encryptedRefreshToken;

  // Clear OAuth cookies and redirect to success page
  return clearOAuthCookies(
    NextResponse.redirect(
      new URL(
        `/admin/social-media/accounts?connected=youtube&channelName=${
          encodeURIComponent(channelInfo.displayName)
        }&channelId=${encodeURIComponent(channelInfo.platformId)}&note=${
          encodeURIComponent("YouTube connected! Note: Database storage requires schema migration.")
        }`,
        request.url,
      ),
    ),
  );
}
