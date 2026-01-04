/**
 * Twitter/X OAuth 2.0 Connect Route
 *
 * Initiates OAuth flow to connect Twitter accounts using PKCE
 * GET /api/social/twitter/connect
 */

import { auth } from "@/auth";
import { generatePKCE } from "@/lib/social";
import { TwitterClient } from "@/lib/social/clients/twitter";
import { getOAuthRedirectUri } from "@/lib/social/utils";
import { tryCatch } from "@/lib/try-catch";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate PKCE code verifier and challenge
  const { codeVerifier, codeChallenge } = generatePKCE();

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

  // Get redirect URI using shared utility
  const redirectUri = getOAuthRedirectUri(
    "/api/social/twitter/callback",
    "TWITTER_CALLBACK_URL",
  );

  // Create Twitter client and get auth URL
  const client = new TwitterClient();
  const authUrl = client.getAuthUrl(redirectUri, state, codeChallenge);

  // Store code_verifier and nonce in secure cookies for verification in callback
  // Cookies expire in 10 minutes (same as state timestamp validation)
  const response = NextResponse.redirect(authUrl);

  // Store code_verifier - essential for PKCE
  response.cookies.set("twitter_oauth_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/api/social/twitter",
  });

  // Store nonce for CSRF verification
  response.cookies.set("twitter_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/api/social/twitter",
  });

  return response;
}
