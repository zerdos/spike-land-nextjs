/**
 * Twitter/X Posts API Route
 *
 * GET /api/social/twitter/posts - List user's tweets
 * POST /api/social/twitter/posts - Create a new tweet
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { TwitterClient, TwitterHttpError } from "@/lib/social/clients/twitter";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/social/twitter/posts
 *
 * List user's recent tweets
 * Query params:
 * - accountId: Required. The SocialAccount ID
 * - limit: Optional. Number of tweets to fetch (default: 10, max: 100)
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
        platform: "TWITTER",
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
      { error: "Twitter account not found" },
      { status: 404 },
    );
  }

  // Check if account is active
  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Twitter account is not active. Please reconnect." },
      { status: 403 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Create Twitter client and fetch posts
  const client = new TwitterClient({
    accessToken,
    accountId: account.accountId,
  });

  const { data: posts, error: postsError } = await tryCatch(
    client.getPosts(limit),
  );

  if (postsError) {
    console.error("Failed to fetch tweets:", postsError);

    // Check if it's a 401 Unauthorized error
    if (postsError instanceof TwitterHttpError && postsError.status === 401) {
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Twitter access token expired. Please reconnect." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch tweets" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    posts,
    account: {
      id: account.id,
      accountId: account.accountId,
      accountName: account.accountName,
    },
  });
}

/**
 * POST /api/social/twitter/posts
 *
 * Create a new tweet
 * Body:
 * - accountId: Required. The SocialAccount ID
 * - content: Required. Tweet text (max 280 characters)
 * - replyToId: Optional. Tweet ID to reply to
 * - mediaIds: Optional. Array of pre-uploaded media IDs
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { accountId, content, replyToId, mediaIds } = body as {
    accountId?: string;
    content?: string;
    replyToId?: string;
    mediaIds?: string[];
  };

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 },
    );
  }

  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "content is required and must be a string" },
      { status: 400 },
    );
  }

  if (content.length > 280) {
    return NextResponse.json(
      { error: "Tweet content exceeds 280 characters" },
      { status: 400 },
    );
  }

  // Get the social account
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
        platform: "TWITTER",
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
      { error: "Twitter account not found" },
      { status: 404 },
    );
  }

  // Check if account is active
  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Twitter account is not active. Please reconnect." },
      { status: 403 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Create Twitter client and post tweet
  const client = new TwitterClient({
    accessToken,
    accountId: account.accountId,
  });

  const { data: result, error: postError } = await tryCatch(
    client.createPost(content, {
      replyToId,
      mediaIds,
    }),
  );

  if (postError) {
    console.error("Failed to create tweet:", postError);

    // Check if it's a 401 Unauthorized error
    if (postError instanceof TwitterHttpError && postError.status === 401) {
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Twitter access token expired. Please reconnect." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create tweet",
        details: postError instanceof Error
          ? postError.message
          : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    post: result,
  });
}
