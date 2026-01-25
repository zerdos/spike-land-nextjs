/**
 * Twitter/X OAuth 2.0 Connect Route
 *
 * Initiates OAuth flow to connect Twitter accounts using PKCE
 * GET /api/social/twitter/connect?workspaceId=xxx
 */

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import { generatePKCE } from "@/lib/social";
import { TwitterClient } from "@/lib/social/clients/twitter";
import { getOAuthRedirectUri } from "@/lib/social/utils";
import { tryCatch } from "@/lib/try-catch";
import crypto from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get workspaceId from query params
  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query parameter is required" },
      { status: 400 },
    );
  }

  // Verify user has permission to connect social accounts in this workspace
  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "social:connect"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  // Generate PKCE code verifier and challenge
  const { codeVerifier, codeChallenge } = await generatePKCE();

  // Generate cryptographic nonce for CSRF protection
  const nonce = crypto.randomBytes(16).toString("hex");

  // Generate state with user ID, workspace ID, timestamp, and nonce for CSRF protection
  const state = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      workspaceId,
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
  let authUrl: string;
  try {
    const client = new TwitterClient();
    authUrl = client.getAuthUrl(redirectUri, state, codeChallenge);
  } catch (error) {
    console.error("Twitter OAuth setup failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Failed to initialize Twitter OAuth. Please check server configuration.",
      },
      { status: 500 },
    );
  }

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
