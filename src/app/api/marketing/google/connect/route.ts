/**
 * Google Ads API - OAuth Connect Route
 *
 * Initiates OAuth flow to connect Google Ads accounts
 * GET /api/marketing/google/connect
 */

import { auth } from "@/auth";
import { GoogleAdsClient } from "@/lib/marketing";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = new GoogleAdsClient();

    // Generate cryptographic nonce for CSRF protection
    const nonce = crypto.randomBytes(16).toString("hex");

    // Generate state with user ID, timestamp, and nonce for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
        nonce,
      }),
    ).toString("base64url");

    // Determine redirect URI based on environment
    // Use explicit callback URL if set, otherwise compute from base URL
    const redirectUri = process.env.GOOGLE_ADS_CALLBACK_URL || (() => {
      const baseUrl = process.env.NEXTAUTH_URL ||
        process.env.VERCEL_URL ||
        "http://localhost:3000";
      return `${
        baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
      }/api/marketing/google/callback`;
    })();

    const authUrl = client.getAuthUrl(redirectUri, state);

    // Store nonce in a secure cookie for verification in callback
    // Cookie expires in 10 minutes (same as state timestamp validation)
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("google_oauth_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/api/marketing/google",
    });

    return response;
  } catch (error) {
    console.error("Google Ads connect error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to initiate OAuth",
      },
      { status: 500 },
    );
  }
}
