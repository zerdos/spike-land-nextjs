/**
 * Snapchat Posts API Route
 *
 * GET /api/social/snapchat/posts - List account's stories
 * POST /api/social/snapchat/posts - Create a new story (not yet implemented)
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { SnapchatClient, SnapchatHttpError } from "@/lib/social/clients/snapchat";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/social/snapchat/posts
 *
 * List account's recent stories
 * Query params:
 * - accountId: Required. The SocialAccount ID
 * - limit: Optional. Number of stories to fetch (default: 10, max: 100)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 100);

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId query parameter is required" },
      { status: 400 },
    );
  }

  // Get the social account
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
        platform: "SNAPCHAT",
      },
    }),
  );

  if (accountError) {
    console.error("Database error:", accountError);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "Snapchat account not found" },
      { status: 404 },
    );
  }

  // Check if account is active
  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Snapchat account is not active. Please reconnect." },
      { status: 403 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Create Snapchat client and fetch posts
  const client = new SnapchatClient({
    accessToken,
    accountId: account.accountId,
  });

  const { data: posts, error: postsError } = await tryCatch(
    client.getPosts(limit),
  );

  if (postsError) {
    console.error("Failed to fetch Snapchat stories:", postsError);

    // Check if it's a 401 Unauthorized error
    if (postsError instanceof SnapchatHttpError && postsError.status === 401) {
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Snapchat access token expired. Please reconnect." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch Snapchat stories" },
      { status: 500 },
    );
  }

  return NextResponse.json({ posts: posts || [] });
}

/**
 * POST /api/social/snapchat/posts
 *
 * Create a new Snapchat story
 * Body:
 * - accountId: Required. The SocialAccount ID
 * - content: Story content/caption
 * - mediaUrl: Optional. URL of media to post
 * - mediaType: Optional. "IMAGE" or "VIDEO"
 * - spotlight: Optional. Submit to Spotlight
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError || !body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { accountId } = body as {
    accountId?: string;
    content?: string;
    mediaUrl?: string;
    mediaType?: "IMAGE" | "VIDEO";
    spotlight?: boolean;
  };

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 },
    );
  }

  // Get the social account
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
        platform: "SNAPCHAT",
      },
    }),
  );

  if (accountError) {
    console.error("Database error:", accountError);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "Snapchat account not found" },
      { status: 404 },
    );
  }

  // Check if account is active
  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Snapchat account is not active. Please reconnect." },
      { status: 403 },
    );
  }

  // Story creation is not yet fully implemented in the client
  return NextResponse.json(
    {
      error: "Story creation is not yet fully implemented. Please check back later or use Snapchat's native app."
    },
    { status: 501 },
  );
}
