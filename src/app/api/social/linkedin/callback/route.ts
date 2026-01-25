/**
 * LinkedIn OAuth 2.0 Callback Route
 *
 * Handles OAuth callback from LinkedIn, exchanges code for tokens,
 * retrieves organization pages, and stores connected accounts in the database.
 * GET /api/social/linkedin/callback
 */

import { auth } from "@/auth";
import { safeEncryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { LinkedInClient } from "@/lib/social/clients/linkedin";
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
    response.cookies.delete("linkedin_oauth_nonce");
    return response;
  };

  // Handle OAuth errors from LinkedIn (before we have state data)
  if (error) {
    console.error("LinkedIn OAuth error:", error, errorDescription);
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
  const storedNonce = request.cookies.get("linkedin_oauth_nonce")?.value;
  if (stateData.nonce && stateData.nonce !== storedNonce) {
    return clearOAuthCookies(
      NextResponse.redirect(redirect({ error: "Invalid security token" })),
    );
  }

  // Determine redirect URI (must match the one used in connect)
  const redirectUri = process.env.LINKEDIN_CALLBACK_URL || (() => {
    const baseUrl = process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    return `${
      baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
    }/api/social/linkedin/callback`;
  })();

  // Exchange code for tokens
  const client = new LinkedInClient();
  const { data: tokens, error: tokenError } = await tryCatch(
    client.exchangeCodeForTokens(code, redirectUri),
  );

  if (tokenError || !tokens) {
    console.error("LinkedIn token exchange failed:", tokenError);
    return clearOAuthCookies(
      NextResponse.redirect(
        redirect({ error: "Failed to connect LinkedIn account. Please try again." }),
      ),
    );
  }

  // Get user's organizations (company pages they can manage)
  const { data: organizations, error: orgError } = await tryCatch(
    client.getOrganizations(),
  );

  if (orgError) {
    console.error("Failed to get LinkedIn organizations:", orgError);
    return clearOAuthCookies(
      NextResponse.redirect(
        redirect({ error: "Failed to retrieve LinkedIn organization pages." }),
      ),
    );
  }

  if (!organizations || organizations.length === 0) {
    return clearOAuthCookies(
      NextResponse.redirect(
        redirect({
          error:
            "No LinkedIn organization pages found. You need administrator access to at least one company page.",
        }),
      ),
    );
  }

  // Encrypt tokens before storing
  const encryptedAccessToken = safeEncryptToken(tokens.accessToken);
  const encryptedRefreshToken = tokens.refreshToken
    ? safeEncryptToken(tokens.refreshToken)
    : null;

  // Create SocialAccount entries for each organization
  const connectedOrgs: string[] = [];
  const errors: string[] = [];

  for (const org of organizations) {
    // Set organization on client to get detailed info
    client.setOrganization(org.id, org.urn);

    const { data: orgInfo, error: infoError } = await tryCatch(
      client.getAccountInfo(),
    );

    if (infoError) {
      console.error(`Failed to get info for org ${org.id}:`, infoError);
      errors.push(org.name);
      continue;
    }

    // Upsert SocialAccount in database (using workspace-scoped unique constraint)
    const { error: dbError } = await tryCatch(
      prisma.socialAccount.upsert({
        where: {
          workspaceId_platform_accountId: {
            workspaceId: stateData.workspaceId,
            platform: "LINKEDIN",
            accountId: org.id,
          },
        },
        update: {
          accountName: org.name,
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt: tokens.expiresAt,
          status: "ACTIVE",
          connectedAt: new Date(),
          metadata: {
            organizationUrn: org.urn,
            displayName: orgInfo?.displayName || org.name,
            avatarUrl: orgInfo?.avatarUrl,
            profileUrl: orgInfo?.profileUrl,
            followersCount: orgInfo?.followersCount,
          },
          updatedAt: new Date(),
        },
        create: {
          userId: session.user.id, // Keep for audit trail
          workspaceId: stateData.workspaceId,
          platform: "LINKEDIN",
          accountId: org.id,
          accountName: org.name,
          accessTokenEncrypted: encryptedAccessToken,
          refreshTokenEncrypted: encryptedRefreshToken,
          tokenExpiresAt: tokens.expiresAt,
          status: "ACTIVE",
          metadata: {
            organizationUrn: org.urn,
            displayName: orgInfo?.displayName || org.name,
            avatarUrl: orgInfo?.avatarUrl,
            profileUrl: orgInfo?.profileUrl,
            followersCount: orgInfo?.followersCount,
          },
        },
      }),
    );

    if (dbError) {
      console.error(`Database save failed for org ${org.id}:`, dbError);
      errors.push(org.name);
      continue;
    }

    connectedOrgs.push(org.name);
  }

  // Build redirect query params with results
  const queryParams: Record<string, string> = { connected: "linkedin" };

  if (connectedOrgs.length > 0) {
    queryParams["organizations"] = connectedOrgs.join(",");
  }

  if (errors.length > 0) {
    queryParams["warnings"] = `Failed to connect: ${errors.join(", ")}`;
  }

  // Clear OAuth cookies and redirect to success page
  return clearOAuthCookies(NextResponse.redirect(redirect(queryParams)));
}
