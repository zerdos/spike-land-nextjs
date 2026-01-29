/**
 * Snapchat OAuth 2.0 Connect Route
 * GET /api/social/snapchat/connect?workspaceId=xxx
 */

import { auth } from "@/auth";
import { requireWorkspacePermission } from "@/lib/permissions/workspace-middleware";
import { SnapchatClient } from "@/lib/social/clients/snapchat";
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

  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get("workspaceId");
  const workspaceSlug = searchParams.get("workspaceSlug");

  if (!workspaceId || !workspaceSlug) {
    return NextResponse.json(
      { error: "workspaceId and workspaceSlug are required" },
      { status: 400 },
    );
  }

  const { error: permError } = await tryCatch(
    requireWorkspacePermission(session, workspaceId, "social:connect"),
  );

  if (permError) {
    const status = permError.message.includes("Unauthorized") ? 401 : 403;
    return NextResponse.json({ error: permError.message }, { status });
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const state = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      workspaceId,
      workspaceSlug,
      timestamp: Date.now(),
      nonce,
    }),
  ).toString("base64url");

  const redirectUri = getOAuthRedirectUri(
    "/api/social/snapchat/callback",
    "SNAPCHAT_CALLBACK_URL",
  );

  let authUrl: string;
  try {
    const client = new SnapchatClient();
    authUrl = client.getAuthUrl(redirectUri, state);
  } catch (error) {
    console.error("Snapchat OAuth setup failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Failed to initialize Snapchat OAuth.",
      },
      { status: 500 },
    );
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("snapchat_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/social/snapchat",
  });

  return response;
}
