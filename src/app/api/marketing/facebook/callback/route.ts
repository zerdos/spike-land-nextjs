/**
 * Facebook Marketing API - OAuth Callback Route
 *
 * Handles OAuth callback from Facebook
 * GET /api/marketing/facebook/callback
 */

import { auth } from "@/auth";
import { safeEncryptToken } from "@/lib/crypto/token-encryption";
import { FacebookMarketingClient } from "@/lib/marketing";
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
      console.error("Facebook OAuth error:", error, errorDescription);
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
    const storedNonce = request.cookies.get("facebook_oauth_nonce")?.value;
    if (stateData.nonce && stateData.nonce !== storedNonce) {
      return NextResponse.redirect(
        new URL("/admin/marketing?error=Invalid security token", request.url),
      );
    }

    // Exchange code for tokens
    const client = new FacebookMarketingClient();
    // Use explicit callback URL if set, otherwise compute from base URL
    const redirectUri = process.env.FACEBOOK_CALLBACK_URL || (() => {
      const baseUrl = process.env.NEXTAUTH_URL ||
        process.env.VERCEL_URL ||
        "http://localhost:3000";
      return `${
        baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
      }/api/marketing/facebook/callback`;
    })();

    const tokens = await client.exchangeCodeForTokens(code, redirectUri);

    // Get accessible ad accounts
    client.setAccessToken(tokens.accessToken);
    const accounts = await client.getAccounts();

    if (accounts.length === 0) {
      return NextResponse.redirect(
        new URL(
          "/admin/marketing?error=No ad accounts found. Make sure you have access to at least one Facebook Ad account.",
          request.url,
        ),
      );
    }

    // Encrypt token before storing
    const encryptedAccessToken = safeEncryptToken(tokens.accessToken);

    // Save accounts to database
    for (const account of accounts) {
      await prisma.marketingAccount.upsert({
        where: {
          userId_platform_accountId: {
            userId: session.user.id,
            platform: "FACEBOOK",
            accountId: account.accountId,
          },
        },
        update: {
          accountName: account.accountName,
          accessToken: encryptedAccessToken,
          expiresAt: tokens.expiresAt,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          platform: "FACEBOOK",
          accountId: account.accountId,
          accountName: account.accountName,
          accessToken: encryptedAccessToken,
          expiresAt: tokens.expiresAt,
          isActive: true,
        },
      });
    }

    // Clear the nonce cookie after successful use
    const response = NextResponse.redirect(
      new URL(
        `/admin/marketing?success=Connected ${accounts.length} Facebook ad account(s)`,
        request.url,
      ),
    );
    response.cookies.delete("facebook_oauth_nonce");
    return response;
  } catch (error) {
    console.error("Facebook callback error:", error);
    // Don't expose internal error details to client
    const response = NextResponse.redirect(
      new URL(
        "/admin/marketing?error=Failed to connect Facebook account. Please try again.",
        request.url,
      ),
    );
    response.cookies.delete("facebook_oauth_nonce");
    return response;
  }
}
