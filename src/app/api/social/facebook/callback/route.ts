/**
 * Facebook Social API - OAuth Callback Route
 *
 * Handles OAuth callback from Facebook, exchanges tokens,
 * and creates SocialAccount entries for Facebook Pages and Instagram Business accounts
 * GET /api/social/facebook/callback
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { safeEncryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { FacebookClient } from "@/lib/social/clients/facebook";
import { tryCatch } from "@/lib/try-catch";

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

  // Handle OAuth errors
  if (error) {
    console.error("Facebook OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/admin/social-media/accounts?error=${encodeURIComponent(errorDescription || error)}`,
        request.url,
      ),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(
        "/admin/social-media/accounts?error=Invalid callback parameters",
        request.url,
      ),
    );
  }

  // Verify state
  let stateData: { userId: string; workspaceId: string; timestamp: number; nonce?: string; };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
  } catch {
    return NextResponse.redirect(
      new URL(
        "/admin/social-media/accounts?error=Invalid state parameter",
        request.url,
      ),
    );
  }

  // Verify user ID matches
  if (stateData.userId !== session.user.id) {
    return NextResponse.redirect(
      new URL("/admin/social-media/accounts?error=User mismatch", request.url),
    );
  }

  // Verify workspaceId is present
  if (!stateData.workspaceId) {
    return NextResponse.redirect(
      new URL(
        "/admin/social-media/accounts?error=Missing workspace context",
        request.url,
      ),
    );
  }

  // Check timestamp (expire after 10 minutes)
  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    return NextResponse.redirect(
      new URL(
        "/admin/social-media/accounts?error=OAuth session expired",
        request.url,
      ),
    );
  }

  // Verify nonce from cookie to prevent replay attacks
  const storedNonce = request.cookies.get("facebook_social_oauth_nonce")?.value;
  if (stateData.nonce && stateData.nonce !== storedNonce) {
    return NextResponse.redirect(
      new URL(
        "/admin/social-media/accounts?error=Invalid security token",
        request.url,
      ),
    );
  }

  // Exchange code for tokens
  const client = new FacebookClient();

  // Determine redirect URI (must match the one used in connect)
  const redirectUri = process.env.FACEBOOK_SOCIAL_CALLBACK_URL ||
    (() => {
      const baseUrl = process.env.NEXTAUTH_URL ||
        process.env.VERCEL_URL ||
        "http://localhost:3000";
      return `${
        baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
      }/api/social/facebook/callback`;
    })();

  // Step 1: Exchange code for short-lived token
  const { data: shortLivedTokens, error: tokenError } = await tryCatch(
    client.exchangeCodeForTokens(code, redirectUri),
  );

  if (tokenError || !shortLivedTokens) {
    console.error("Token exchange failed:", tokenError);
    const response = NextResponse.redirect(
      new URL(
        "/admin/social-media/accounts?error=Failed to connect Facebook account. Please try again.",
        request.url,
      ),
    );
    response.cookies.delete("facebook_social_oauth_nonce");
    return response;
  }

  // Step 2: Exchange for long-lived token (~60 days)
  const { data: longLivedTokens, error: longLivedError } = await tryCatch(
    client.exchangeForLongLivedToken(shortLivedTokens.accessToken),
  );

  if (longLivedError || !longLivedTokens) {
    console.error("Long-lived token exchange failed:", longLivedError);
    const response = NextResponse.redirect(
      new URL(
        "/admin/social-media/accounts?error=Failed to get long-lived token. Please try again.",
        request.url,
      ),
    );
    response.cookies.delete("facebook_social_oauth_nonce");
    return response;
  }

  // Step 3: Get user's Facebook Pages
  const { data: pages, error: pagesError } = await tryCatch(
    client.getPages(longLivedTokens.accessToken),
  );

  if (pagesError || !pages) {
    console.error("Failed to get pages:", pagesError);
    const response = NextResponse.redirect(
      new URL(
        "/admin/social-media/accounts?error=Failed to retrieve Facebook Pages.",
        request.url,
      ),
    );
    response.cookies.delete("facebook_social_oauth_nonce");
    return response;
  }

  if (pages.length === 0) {
    // Log for debugging why no pages were returned
    console.warn("No Facebook Pages found for user", {
      userId: session.user.id,
      hasLongLivedToken: !!longLivedTokens,
    });

    const response = NextResponse.redirect(
      new URL(
        "/admin/social-media/accounts?error=" + encodeURIComponent(
          "No Facebook Pages found. Please ensure you: " +
            "1) Have access to at least one Facebook Page, " +
            "2) Granted page permissions during login, and " +
            "3) The page has proper admin access.",
        ),
        request.url,
      ),
    );
    response.cookies.delete("facebook_social_oauth_nonce");
    return response;
  }

  // Step 4: Create SocialAccount entries for each page and Instagram account
  type AccountMetadata = {
    category?: string;
    hasInstagram?: boolean;
    igUserId?: string;
    linkedFacebookPageId?: string;
    linkedFacebookPageName?: string;
    username?: string;
    profilePictureUrl?: string;
  };

  const accountsToCreate: Array<{
    platform: "FACEBOOK" | "INSTAGRAM";
    accountId: string;
    accountName: string;
    accessTokenEncrypted: string;
    tokenExpiresAt: Date | null;
    metadata: AccountMetadata;
  }> = [];

  for (const page of pages) {
    // Page access tokens from /me/accounts don't expire when the user token is long-lived
    const encryptedPageToken = safeEncryptToken(page.access_token);

    // Add Facebook Page
    accountsToCreate.push({
      platform: "FACEBOOK",
      accountId: page.id,
      accountName: page.name,
      accessTokenEncrypted: encryptedPageToken,
      tokenExpiresAt: null, // Page tokens don't expire
      metadata: {
        category: page.category,
        hasInstagram: !!page.instagram_business_account,
      },
    });

    // If page has linked Instagram Business Account, add it too
    if (page.instagram_business_account?.id) {
      // Get Instagram account details
      const igAccountId = page.instagram_business_account.id;
      const { data: igInfo } = await tryCatch(
        getInstagramAccountInfo(igAccountId, page.access_token),
      );

      accountsToCreate.push({
        platform: "INSTAGRAM",
        accountId: igAccountId,
        accountName: igInfo?.username || `${page.name} (Instagram)`,
        accessTokenEncrypted: encryptedPageToken, // Instagram uses the page token
        tokenExpiresAt: null,
        metadata: {
          igUserId: igAccountId,
          linkedFacebookPageId: page.id,
          linkedFacebookPageName: page.name,
          username: igInfo?.username,
          profilePictureUrl: igInfo?.profile_picture_url,
        },
      });
    }
  }

  // Save all accounts to database (using workspace-scoped unique constraint)
  const { error: dbError } = await tryCatch(
    Promise.all(
      accountsToCreate.map((account) =>
        prisma.socialAccount.upsert({
          where: {
            workspaceId_platform_accountId: {
              workspaceId: stateData.workspaceId,
              platform: account.platform,
              accountId: account.accountId,
            },
          },
          update: {
            accountName: account.accountName,
            accessTokenEncrypted: account.accessTokenEncrypted,
            tokenExpiresAt: account.tokenExpiresAt,
            metadata: account.metadata,
            status: "ACTIVE",
            updatedAt: new Date(),
          },
          create: {
            userId: session.user.id, // Keep for audit trail
            workspaceId: stateData.workspaceId,
            platform: account.platform,
            accountId: account.accountId,
            accountName: account.accountName,
            accessTokenEncrypted: account.accessTokenEncrypted,
            tokenExpiresAt: account.tokenExpiresAt,
            metadata: account.metadata,
            status: "ACTIVE",
          },
        })
      ),
    ),
  );

  if (dbError) {
    console.error("Database save failed:", dbError);
    const response = NextResponse.redirect(
      new URL(
        "/admin/social-media/accounts?error=Failed to save account information.",
        request.url,
      ),
    );
    response.cookies.delete("facebook_social_oauth_nonce");
    return response;
  }

  // Count created accounts
  const fbCount = accountsToCreate.filter((a) => a.platform === "FACEBOOK")
    .length;
  const igCount = accountsToCreate.filter((a) => a.platform === "INSTAGRAM")
    .length;

  let successMessage = `Connected ${fbCount} Facebook Page${fbCount !== 1 ? "s" : ""}`;
  if (igCount > 0) {
    successMessage += ` and ${igCount} Instagram account${igCount !== 1 ? "s" : ""}`;
  }

  // Clear the nonce cookie and redirect with success
  const response = NextResponse.redirect(
    new URL(
      `/admin/social-media/accounts?connected=facebook&message=${
        encodeURIComponent(successMessage)
      }`,
      request.url,
    ),
  );
  response.cookies.delete("facebook_social_oauth_nonce");
  return response;
}

/**
 * Helper function to get Instagram Business Account info
 */
async function getInstagramAccountInfo(
  igUserId: string,
  pageAccessToken: string,
): Promise<{ username?: string; profile_picture_url?: string; } | null> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
    fields: "username,profile_picture_url",
  });

  const { data: response, error } = await tryCatch(
    fetch(
      `https://graph.facebook.com/v21.0/${igUserId}?${params.toString()}`,
      { method: "GET" },
    ),
  );

  if (error) {
    console.error("Failed to fetch Instagram account info", {
      igUserId,
      error,
    });
    return null;
  }

  if (!response.ok) {
    let errorBody: string | undefined;
    try {
      errorBody = await response.text();
    } catch {
      // ignore body parsing errors
    }

    console.error("Non-OK response from Instagram account info endpoint", {
      igUserId,
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
    });
    return null;
  }

  return response.json();
}
