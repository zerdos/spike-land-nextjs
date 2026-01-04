/**
 * Facebook Social API - Posts Route
 *
 * GET: List posts from a Facebook Page
 * POST: Create a new post on a Facebook Page
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { FacebookClient } from "@/lib/social/clients/facebook";
import { tryCatch } from "@/lib/try-catch";

// Facebook API requirement: Posts must be scheduled at least 10 minutes in the future
// Reference: https://developers.facebook.com/docs/graph-api/reference/page/feed
const MIN_SCHEDULE_MINUTES = 10;

/**
 * GET /api/social/facebook/posts
 * List posts from a Facebook Page
 *
 * Query params:
 * - accountId: Required. The SocialAccount ID
 * - limit: Optional. Number of posts to fetch (default 25)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const limit = parseInt(searchParams.get("limit") || "25", 10);

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId query parameter is required" },
      { status: 400 },
    );
  }

  // Get the social account
  const { data: account, error: dbError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
        platform: "FACEBOOK",
        status: "ACTIVE",
      },
    }),
  );

  if (dbError) {
    console.error("Database error:", dbError);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "Facebook account not found or not accessible" },
      { status: 404 },
    );
  }

  // Decrypt the token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Create client and fetch posts
  const client = new FacebookClient({
    accessToken,
    pageId: account.accountId,
  });

  const { data: posts, error: postsError } = await tryCatch(
    client.getPosts(limit),
  );

  if (postsError) {
    console.error("Failed to fetch posts:", postsError);
    return NextResponse.json(
      { error: "Failed to fetch posts from Facebook" },
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
 * POST /api/social/facebook/posts
 * Create a new post on a Facebook Page
 *
 * Body:
 * - accountId: Required. The SocialAccount ID
 * - content: Required. The post message
 * - link: Optional. A URL to attach
 * - scheduledAt: Optional. ISO date string to schedule the post
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError || !body) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { accountId, content, link, scheduledAt } = body as {
    accountId?: string;
    content?: string;
    link?: string;
    scheduledAt?: string;
  };

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 },
    );
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { error: "content is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  // Get the social account
  const { data: account, error: dbError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
        platform: "FACEBOOK",
        status: "ACTIVE",
      },
    }),
  );

  if (dbError) {
    console.error("Database error:", dbError);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "Facebook account not found or not accessible" },
      { status: 404 },
    );
  }

  // Decrypt the token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Create client
  const client = new FacebookClient({
    accessToken,
    pageId: account.accountId,
  });

  // Build post options
  const postOptions: {
    metadata?: { link?: string; };
    scheduledAt?: Date;
  } = {};

  if (link) {
    postOptions.metadata = { link };
  }

  if (scheduledAt) {
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "scheduledAt must be a valid ISO date string" },
        { status: 400 },
      );
    }
    // Ensure scheduled time is at least 10 minutes in the future (Facebook requirement)
    const minScheduleTime = new Date(Date.now() + MIN_SCHEDULE_MINUTES * 60 * 1000);
    if (scheduledDate < minScheduleTime) {
      return NextResponse.json(
        {
          error: `Facebook requires posts to be scheduled at least ${MIN_SCHEDULE_MINUTES} minutes in the future`,
        },
        { status: 400 },
      );
    }
    postOptions.scheduledAt = scheduledDate;
  }

  // Create the post
  const { data: result, error: postError } = await tryCatch(
    client.createPost(content.trim(), postOptions),
  );

  if (postError) {
    console.error("Failed to create post:", postError);
    return NextResponse.json(
      {
        error: "Failed to create post on Facebook",
        details: postError instanceof Error ? postError.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    post: result,
    account: {
      id: account.id,
      accountId: account.accountId,
      accountName: account.accountName,
    },
  });
}
