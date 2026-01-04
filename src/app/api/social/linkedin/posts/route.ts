/**
 * LinkedIn Posts API Route
 *
 * GET /api/social/linkedin/posts - List organization's posts
 * POST /api/social/linkedin/posts - Create a new organization post
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { LinkedInClient } from "@/lib/social/clients/linkedin";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/social/linkedin/posts
 *
 * List organization's recent LinkedIn posts
 * Query params:
 * - accountId: Required. The SocialAccount ID
 * - limit: Optional. Number of posts to fetch (default: 10, max: 100)
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
        platform: "LINKEDIN",
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
      { error: "LinkedIn account not found" },
      { status: 404 },
    );
  }

  // Check if account is active
  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "LinkedIn account is not active. Please reconnect." },
      { status: 403 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Get organization URN from metadata
  const metadata = account.metadata as { organizationUrn?: string; } | null;
  const organizationUrn = metadata?.organizationUrn;

  if (!organizationUrn) {
    return NextResponse.json(
      { error: "Organization URN not found in account metadata" },
      { status: 500 },
    );
  }

  // Create LinkedIn client and fetch posts
  const client = new LinkedInClient({
    accessToken,
    accountId: account.accountId,
    organizationUrn,
  });

  const { data: posts, error: postsError } = await tryCatch(
    client.getPosts(limit),
  );

  if (postsError) {
    console.error("Failed to fetch LinkedIn posts:", postsError);

    // Check if it's an auth error and update account status
    if (
      postsError instanceof Error &&
      (postsError.message.includes("401") ||
        postsError.message.includes("Unauthorized") ||
        postsError.message.includes("expired"))
    ) {
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "LinkedIn access token expired. Please reconnect." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch LinkedIn posts" },
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
 * POST /api/social/linkedin/posts
 *
 * Create a new organization post on LinkedIn
 * Body:
 * - accountId: Required. The SocialAccount ID
 * - content: Required. Post text (max 3000 characters for LinkedIn)
 * - link: Optional. URL to include in the post
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

  const { accountId, content, link } = body as {
    accountId?: string;
    content?: string;
    link?: string;
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

  // LinkedIn allows up to 3000 characters for organization posts
  if (content.length > 3000) {
    return NextResponse.json(
      { error: "Post content exceeds 3000 characters" },
      { status: 400 },
    );
  }

  // Validate link if provided
  if (link && typeof link === "string") {
    try {
      new URL(link);
    } catch {
      return NextResponse.json(
        { error: "Invalid link URL" },
        { status: 400 },
      );
    }
  }

  // Get the social account
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
        platform: "LINKEDIN",
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
      { error: "LinkedIn account not found" },
      { status: 404 },
    );
  }

  // Check if account is active
  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "LinkedIn account is not active. Please reconnect." },
      { status: 403 },
    );
  }

  // Decrypt access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Get organization URN from metadata
  const metadata = account.metadata as { organizationUrn?: string; } | null;
  const organizationUrn = metadata?.organizationUrn;

  if (!organizationUrn) {
    return NextResponse.json(
      { error: "Organization URN not found in account metadata" },
      { status: 500 },
    );
  }

  // Create LinkedIn client and post
  const client = new LinkedInClient({
    accessToken,
    accountId: account.accountId,
    organizationUrn,
  });

  const { data: result, error: postError } = await tryCatch(
    client.createPost(content, {
      metadata: link ? { link } : undefined,
    }),
  );

  if (postError) {
    console.error("Failed to create LinkedIn post:", postError);

    // Check if it's an auth error and update account status
    if (
      postError instanceof Error &&
      (postError.message.includes("401") ||
        postError.message.includes("Unauthorized") ||
        postError.message.includes("expired"))
    ) {
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "LinkedIn access token expired. Please reconnect." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create LinkedIn post",
        details: postError instanceof Error ? postError.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    post: result,
  });
}
