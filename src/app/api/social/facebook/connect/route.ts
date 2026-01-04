/**
 * Facebook Social API - OAuth Connect Route
 *
 * Initiates OAuth flow to connect Facebook Pages and Instagram Business accounts
 * GET /api/social/facebook/connect
 */

import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { FacebookClient } from "@/lib/social/clients/facebook";
import { tryCatch } from "@/lib/try-catch";

export async function GET(): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = new FacebookClient();

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
  const redirectUri = process.env.FACEBOOK_SOCIAL_CALLBACK_URL ||
    (() => {
      const baseUrl = process.env.NEXTAUTH_URL ||
        process.env.VERCEL_URL ||
        "http://localhost:3000";
      return `${
        baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
      }/api/social/facebook/callback`;
    })();

  const authUrl = client.getAuthUrl(redirectUri, state);

  // Store nonce in a secure cookie for verification in callback
  // Cookie expires in 10 minutes (same as state timestamp validation)
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("facebook_social_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/api/social/facebook",
  });

  return response;
}
