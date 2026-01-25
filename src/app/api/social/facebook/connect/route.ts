/**
 * Facebook Social API - OAuth Connect Route
 *
 * Initiates OAuth flow to connect Facebook Pages and Instagram Business accounts
 * GET /api/social/facebook/connect?workspaceId=xxx
 */

import crypto from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import { FacebookClient } from "@/lib/social/clients/facebook";
import { tryCatch } from "@/lib/try-catch";

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

  // Create Facebook client and get auth URL
  let authUrl: string;
  try {
    const client = new FacebookClient();
    authUrl = client.getAuthUrl(redirectUri, state);
  } catch (error) {
    console.error("Facebook OAuth setup failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Failed to initialize Facebook OAuth. Please check server configuration.",
      },
      { status: 500 },
    );
  }

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
