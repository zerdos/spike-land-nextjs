/**
 * Snapchat Posts API Route
 *
 * GET  /api/social/snapchat/posts - Fetch Stories/ad creatives
 * POST /api/social/snapchat/posts - Create new Story (not yet implemented)
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { SnapchatClient } from "@/lib/social/clients/snapchat";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/social/snapchat/posts
 * Fetch Snapchat content (Stories or ad campaigns)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId query parameter is required" },
      { status: 400 },
    );
  }

  // Fetch social account from database
  const { data: socialAccount, error: dbError } = await tryCatch(
    prisma.socialAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        platform: true,
        accountId: true,
        accessTokenEncrypted: true,
        status: true,
        workspace: {
          select: {
            id: true,
            members: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    }),
  );

  if (dbError || !socialAccount) {
    return NextResponse.json(
      { error: "Snapchat account not found" },
      { status: 404 },
    );
  }

  // Verify user has access to this workspace
  if (socialAccount.workspace.members.length === 0) {
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 },
    );
  }

  // Verify it's a Snapchat account
  if (socialAccount.platform !== "SNAPCHAT") {
    return NextResponse.json(
      { error: "Not a Snapchat account" },
      { status: 400 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(socialAccount.accessTokenEncrypted);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to decrypt access token" },
      { status: 500 },
    );
  }

  // Fetch posts using Snapchat client
  const client = new SnapchatClient({
    accessToken,
    accountId: socialAccount.accountId,
  });

  const { data: posts, error: postsError } = await tryCatch(
    client.getPosts(limit),
  );

  if (postsError) {
    console.error("Failed to fetch Snapchat content:", postsError);
    return NextResponse.json(
      {
        error: postsError.message || "Failed to fetch Snapchat content",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    posts: posts || [],
    platform: "SNAPCHAT",
  });
}

/**
 * POST /api/social/snapchat/posts
 * Create new Snapchat Story or ad creative (not yet implemented)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Snapchat posting requires special Snap Kit approval for consumer posting
  // or Marketing API access for ad creatives
  return NextResponse.json(
    {
      error: "Snapchat posting not yet implemented. Requires Snap Kit approval or Marketing API access.",
    },
    { status: 501 },
  );
}
