/**
 * LinkedIn OAuth 2.0 Connect Route
 *
 * Initiates OAuth flow to connect LinkedIn organization accounts
 * GET /api/social/linkedin/connect?workspaceId=xxx
 */

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import { LinkedInClient } from "@/lib/social/clients/linkedin";
import { tryCatch } from "@/lib/try-catch";
import crypto from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get workspaceId and workspaceSlug from query params
  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get("workspaceId");
  const workspaceSlug = searchParams.get("workspaceSlug");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query parameter is required" },
      { status: 400 },
    );
  }

  if (!workspaceSlug) {
    return NextResponse.json(
      { error: "workspaceSlug query parameter is required" },
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

  // Generate state with user ID, workspace ID/slug, timestamp, and nonce for CSRF protection
  const state = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      workspaceId,
      workspaceSlug,
      timestamp: Date.now(),
      nonce,
    }),
  ).toString("base64url");

  // Determine redirect URI based on environment
  const redirectUri = process.env.LINKEDIN_CALLBACK_URL || (() => {
    const baseUrl = process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    return `${
      baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
    }/api/social/linkedin/callback`;
  })();

  // Create LinkedIn client and get auth URL
  let authUrl: string;
  try {
    const client = new LinkedInClient();
    authUrl = client.getAuthUrl(redirectUri, state);
  } catch (error) {
    console.error("LinkedIn OAuth setup failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Failed to initialize LinkedIn OAuth. Please check server configuration.",
      },
      { status: 500 },
    );
  }

  // Store nonce in secure cookie for verification in callback
  // Cookie expires in 10 minutes (same as state timestamp validation)
  const response = NextResponse.redirect(authUrl);

  // Store nonce for CSRF verification
  response.cookies.set("linkedin_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/api/social/linkedin",
  });

  return response;
}
