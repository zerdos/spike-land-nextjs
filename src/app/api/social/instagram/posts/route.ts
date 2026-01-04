/**
 * Instagram Posts API Routes
 *
 * GET: List Instagram media for an account
 * POST: Create a new Instagram post (requires image)
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { InstagramClient } from "@/lib/social/clients/instagram";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface InstagramMetadata {
  igUserId?: string;
  facebookPageId?: string;
}

/**
 * GET /api/social/instagram/posts
 *
 * List Instagram media for a connected account
 * Query params:
 * - accountId (required): SocialAccount ID
 * - limit (optional): Number of posts to fetch (default: 10, max: 50)
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "10", 10), 1),
    50,
  );

  if (!accountId) {
    return NextResponse.json(
      { error: "Missing required parameter: accountId" },
      { status: 400 },
    );
  }

  // Fetch the social account and verify ownership
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
        platform: "INSTAGRAM",
      },
    }),
  );

  if (accountError) {
    console.error("Failed to fetch Instagram account:", accountError);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "Instagram account not found" },
      { status: 404 },
    );
  }

  // Extract igUserId from metadata
  const metadata = account.metadata as InstagramMetadata | null;
  const igUserId = metadata?.igUserId;

  if (!igUserId) {
    return NextResponse.json(
      { error: "Instagram User ID not found in account metadata" },
      { status: 400 },
    );
  }

  // Decrypt the access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Create Instagram client and fetch posts
  const client = new InstagramClient({
    accessToken,
    igUserId,
  });

  const { data: posts, error: postsError } = await tryCatch(
    client.getPosts(limit),
  );

  if (postsError) {
    console.error("Failed to fetch Instagram posts:", postsError);
    return NextResponse.json(
      { error: "Failed to fetch posts from Instagram" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    posts,
    account: {
      id: account.id,
      accountName: account.accountName,
      platform: account.platform,
    },
  });
}

/**
 * POST /api/social/instagram/posts
 *
 * Create a new Instagram post
 * Body:
 * - accountId (required): SocialAccount ID
 * - imageUrl (required): Publicly accessible image URL
 * - caption (optional): Post caption text
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
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

  const { accountId, imageUrl, caption } = body as {
    accountId?: string;
    imageUrl?: string;
    caption?: string;
  };

  // Validate required fields
  if (!accountId) {
    return NextResponse.json(
      { error: "Missing required field: accountId" },
      { status: 400 },
    );
  }

  if (!imageUrl) {
    return NextResponse.json(
      { error: "Missing required field: imageUrl. Instagram posts require an image." },
      { status: 400 },
    );
  }

  // Validate imageUrl format
  const { data: parsedUrl, error: urlError } = await tryCatch(
    Promise.resolve(new URL(imageUrl)),
  );

  if (urlError || !parsedUrl) {
    return NextResponse.json(
      { error: "Invalid imageUrl. Must be a valid URL." },
      { status: 400 },
    );
  }

  // Only allow HTTPS URLs for security
  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json(
      { error: "imageUrl must use HTTPS protocol for security. HTTP URLs are not allowed." },
      { status: 400 },
    );
  }

  // Fetch the social account and verify ownership
  const { data: account, error: accountError } = await tryCatch(
    prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
        platform: "INSTAGRAM",
      },
    }),
  );

  if (accountError) {
    console.error("Failed to fetch Instagram account:", accountError);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "Instagram account not found" },
      { status: 404 },
    );
  }

  // Check if account is active
  if (account.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Instagram account is not active. Please reconnect." },
      { status: 400 },
    );
  }

  // Check token expiration
  if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
    // Update account status
    await tryCatch(
      prisma.socialAccount.update({
        where: { id: account.id },
        data: { status: "EXPIRED" },
      }),
    );

    return NextResponse.json(
      { error: "Access token has expired. Please reconnect your Instagram account." },
      { status: 401 },
    );
  }

  // Extract igUserId from metadata
  const metadata = account.metadata as InstagramMetadata | null;
  const igUserId = metadata?.igUserId;

  if (!igUserId) {
    return NextResponse.json(
      { error: "Instagram User ID not found in account metadata" },
      { status: 400 },
    );
  }

  // Decrypt the access token
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Create Instagram client
  const client = new InstagramClient({
    accessToken,
    igUserId,
  });

  // Create the post
  const { data: result, error: postError } = await tryCatch(
    client.createPost(caption || "", {
      mediaUrls: [imageUrl],
    }),
  );

  if (postError) {
    console.error("Failed to create Instagram post:", postError);

    // Check for common error types
    const errorMessage = postError instanceof Error ? postError.message : "Unknown error";

    if (errorMessage.includes("expired")) {
      // Update account status
      await tryCatch(
        prisma.socialAccount.update({
          where: { id: account.id },
          data: { status: "EXPIRED" },
        }),
      );

      return NextResponse.json(
        { error: "Access token has expired. Please reconnect your Instagram account." },
        { status: 401 },
      );
    }

    if (errorMessage.includes("timeout")) {
      return NextResponse.json(
        { error: "Instagram took too long to process the image. Please try again." },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create Instagram post", details: errorMessage },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    post: {
      platformPostId: result.platformPostId,
      url: result.url,
      publishedAt: result.publishedAt.toISOString(),
    },
    account: {
      id: account.id,
      accountName: account.accountName,
    },
  });
}
