/**
 * Google Ads API - OAuth Callback Route
 *
 * Handles OAuth callback from Google
 * GET /api/marketing/google/callback
 */

import { auth } from "@/auth";
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
    let stateData: { userId: string; timestamp: number; };
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

    // Exchange code for tokens
    const client = new GoogleAdsClient();
    const baseUrl = process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    const redirectUri = `${
      baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
    }/api/marketing/google/callback`;

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

      await prisma.marketingAccount.upsert({
        where: {
          userId_platform_accountId: {
            userId: session.user.id,
            platform: "GOOGLE_ADS",
            accountId: customerId,
          },
        },
        update: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          platform: "GOOGLE_ADS",
          accountId: customerId,
          accountName: "Google Ads (Setup Required)",
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
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
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          platform: "GOOGLE_ADS",
          accountId: account.accountId,
          accountName: account.accountName,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          isActive: true,
        },
      });
    }

    return NextResponse.redirect(
      new URL(
        `/admin/marketing?success=Connected ${accounts.length} Google Ads account(s)`,
        request.url,
      ),
    );
  } catch (error) {
    console.error("Google callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/admin/marketing?error=${
          encodeURIComponent(
            error instanceof Error ? error.message : "Failed to connect Google Ads",
          )
        }`,
        request.url,
      ),
    );
  }
}
