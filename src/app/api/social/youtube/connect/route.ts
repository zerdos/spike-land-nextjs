/**
 * YouTube OAuth 2.0 Connect Route
 *
 * Initiates Google OAuth flow to connect YouTube channels
 * GET /api/social/youtube/connect
 *
 * Uses Google OAuth 2.0 with offline access to get refresh tokens.
 * YouTube shares credentials with Google OAuth.
 */

import { auth } from "@/auth";
import { tryCatch } from "@/lib/try-catch";
import crypto from "crypto";
import { NextResponse } from "next/server";

import { YouTubeClient } from "@/lib/social/clients/youtube";

export async function GET(): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const redirectUri = process.env.YOUTUBE_CALLBACK_URL || (() => {
    const baseUrl = process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    return `${
      baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
    }/api/social/youtube/callback`;
  })();

  // Create YouTube client and get auth URL
  // The client will use access_type=offline and prompt=consent
  // to ensure we get a refresh token
  const client = new YouTubeClient();
  const authUrl = client.getAuthUrl(redirectUri, state);

  // Store nonce in secure cookie for verification in callback
  // Cookie expires in 10 minutes (same as state timestamp validation)
  const response = NextResponse.redirect(authUrl);

  // Store nonce for CSRF verification
  response.cookies.set("youtube_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/api/social/youtube",
  });

  return response;
}
