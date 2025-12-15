/**
 * Google Ads API - OAuth Callback Route
 *
 * Handles OAuth callback from Google
 * GET /api/marketing/google/callback
 */

import { auth } from "@/auth";
import { safeEncryptToken } from "@/lib/crypto/token-encryption";
import { GoogleAdsClient } from "@/lib/marketing";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
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
      console.error("Google OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/admin/marketing?error=${encodeURIComponent(errorDescription || error)}`,
          request.url,
        ),
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/admin/marketing?error=Invalid callback parameters", request.url),
      );
    }

    // Verify state
    let stateData: { userId: string; timestamp: number; nonce?: string; };
    try {
      stateData = JSON.parse(
        Buffer.from(state, "base64url").toString("utf-8"),
      );
    } catch {
      return NextResponse.redirect(
        new URL("/admin/marketing?error=Invalid state parameter", request.url),
      );
    }

    // Verify user ID matches
    if (stateData.userId !== session.user.id) {
      return NextResponse.redirect(
        new URL("/admin/marketing?error=User mismatch", request.url),
      );
    }

    // Check timestamp (expire after 10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL("/admin/marketing?error=OAuth session expired", request.url),
      );
    }

    // Verify nonce from cookie to prevent replay attacks
    const storedNonce = request.cookies.get("google_oauth_nonce")?.value;
    if (stateData.nonce && stateData.nonce !== storedNonce) {
      return NextResponse.redirect(
        new URL("/admin/marketing?error=Invalid security token", request.url),
      );
    }

    // Exchange code for tokens
    const client = new GoogleAdsClient();
    // Use explicit callback URL if set, otherwise compute from base URL
    const redirectUri = process.env.GOOGLE_ADS_CALLBACK_URL || (() => {
      const baseUrl = process.env.NEXTAUTH_URL ||
        process.env.VERCEL_URL ||
        "http://localhost:3000";
      return `${
        baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
      }/api/marketing/google/callback`;
    })();

    const tokens = await client.exchangeCodeForTokens(code, redirectUri);

    // Get accessible customer accounts
    client.setAccessToken(tokens.accessToken);

    let accounts;
    try {
      accounts = await client.getAccounts();
    } catch (accountError) {
      // If we can't get accounts (e.g., no developer token), save connection with manual setup required
      console.warn("Could not fetch Google Ads accounts:", accountError);

      // Save a placeholder account that user can configure manually
      const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.trim() || "pending";

      // Encrypt tokens before storing
      const encryptedAccessToken = safeEncryptToken(tokens.accessToken);
      const encryptedRefreshToken = tokens.refreshToken
        ? safeEncryptToken(tokens.refreshToken)
        : null;

      await prisma.marketingAccount.upsert({
        where: {
          userId_platform_accountId: {
            userId: session.user.id,
            platform: "GOOGLE_ADS",
            accountId: customerId,
          },
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiresAt,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          platform: "GOOGLE_ADS",
          accountId: customerId,
          accountName: "Google Ads (Setup Required)",
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiresAt,
          isActive: true,
        },
      });

      return NextResponse.redirect(
        new URL(
          "/admin/marketing?success=Google Ads connected. Please configure your Customer ID in settings.",
          request.url,
        ),
      );
    }

    if (accounts.length === 0) {
      return NextResponse.redirect(
        new URL(
          "/admin/marketing?error=No Google Ads accounts found. Make sure you have access to at least one Google Ads account.",
          request.url,
        ),
      );
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = safeEncryptToken(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken
      ? safeEncryptToken(tokens.refreshToken)
      : null;

    // Save accounts to database
    for (const account of accounts) {
      await prisma.marketingAccount.upsert({
        where: {
          userId_platform_accountId: {
            userId: session.user.id,
            platform: "GOOGLE_ADS",
            accountId: account.accountId,
          },
        },
        update: {
          accountName: account.accountName,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiresAt,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          platform: "GOOGLE_ADS",
          accountId: account.accountId,
          accountName: account.accountName,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: tokens.expiresAt,
          isActive: true,
        },
      });
    }

    // Clear the nonce cookie after successful use
    const response = NextResponse.redirect(
      new URL(
        `/admin/marketing?success=Connected ${accounts.length} Google Ads account(s)`,
        request.url,
      ),
    );
    response.cookies.delete("google_oauth_nonce");
    return response;
  } catch (error) {
    console.error("Google callback error:", error);
    // Don't expose internal error details to client
    const response = NextResponse.redirect(
      new URL(
        "/admin/marketing?error=Failed to connect Google Ads account. Please try again.",
        request.url,
      ),
    );
    response.cookies.delete("google_oauth_nonce");
    return response;
  }
}
