/**
 * Like/Unlike API Route for Social Posts
 *
 * POST /api/social/[platform]/posts/[postId]/like - Like a post
 * DELETE /api/social/[platform]/posts/[postId]/like - Unlike a post
 */

import { auth } from "@/auth";
import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { FacebookClient } from "@/lib/social/clients/facebook";
import { InstagramClient } from "@/lib/social/clients/instagram";
import { LinkedInClient } from "@/lib/social/clients/linkedin";
import { TwitterClient, TwitterHttpError } from "@/lib/social/clients/twitter";
import { tryCatch } from "@/lib/try-catch";
import type { SocialPlatform } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Validate that the platform is a valid social platform
 */
function isValidPlatform(platform: string): platform is SocialPlatform {
  return ["TWITTER", "FACEBOOK", "INSTAGRAM", "LINKEDIN"].includes(
    platform.toUpperCase(),
  );
}

/**
 * Get account and validate access
 */
async function getAccount(
  userId: string,
  accountId: string,
  platform: SocialPlatform,
) {
  const account = await prisma.socialAccount.findFirst({
    where: {
      id: accountId,
      userId,
      platform,
    },
  });

  if (!account) {
    return { error: "Account not found", status: 404 };
  }

  if (account.status !== "ACTIVE") {
    return { error: "Account is not active. Please reconnect.", status: 403 };
  }

  return { account };
}

/**
 * Like a post based on platform
 */
async function likePostByPlatform(
  platform: SocialPlatform,
  postId: string,
  accessToken: string,
  accountId: string,
  pageId?: string | null,
  organizationUrn?: string | null,
): Promise<void> {
  switch (platform) {
    case "TWITTER": {
      const client = new TwitterClient({ accessToken, accountId });
      await client.likePost(postId);
      break;
    }
    case "FACEBOOK": {
      if (!pageId) throw new Error("Page ID is required for Facebook");
      const client = new FacebookClient({ accessToken, pageId });
      await client.likePost(postId);
      break;
    }
    case "INSTAGRAM": {
      const client = new InstagramClient({ accessToken, igUserId: accountId });
      await client.likeMedia(postId);
      break;
    }
    case "LINKEDIN": {
      if (!organizationUrn) throw new Error("Organization URN is required for LinkedIn");
      const client = new LinkedInClient({ accessToken, organizationUrn });
      await client.likePost(postId);
      break;
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Unlike a post based on platform
 */
async function unlikePostByPlatform(
  platform: SocialPlatform,
  postId: string,
  accessToken: string,
  accountId: string,
  pageId?: string | null,
  organizationUrn?: string | null,
): Promise<void> {
  switch (platform) {
    case "TWITTER": {
      const client = new TwitterClient({ accessToken, accountId });
      await client.unlikePost(postId);
      break;
    }
    case "FACEBOOK": {
      if (!pageId) throw new Error("Page ID is required for Facebook");
      const client = new FacebookClient({ accessToken, pageId });
      await client.unlikePost(postId);
      break;
    }
    case "INSTAGRAM": {
      const client = new InstagramClient({ accessToken, igUserId: accountId });
      await client.unlikeMedia(postId);
      break;
    }
    case "LINKEDIN": {
      if (!organizationUrn) throw new Error("Organization URN is required for LinkedIn");
      const client = new LinkedInClient({ accessToken, organizationUrn });
      await client.unlikePost(postId);
      break;
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

interface RouteParams {
  params: Promise<{
    platform: string;
    postId: string;
  }>;
}

/**
 * POST /api/social/[platform]/posts/[postId]/like
 *
 * Like a post on the specified platform
 * Body:
 * - accountId: Required. The SocialAccount ID
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform: platformParam, postId } = await params;
  const platform = platformParam.toUpperCase();

  if (!isValidPlatform(platform)) {
    return NextResponse.json(
      { error: `Invalid platform: ${platformParam}` },
      { status: 400 },
    );
  }

  // Parse request body
  const { data: body, error: parseError } = await tryCatch(request.json());

  if (parseError) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { accountId } = body as { accountId?: string; };

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 },
    );
  }

  // Get and validate the account
  const { data: accountResult, error: accountError } = await tryCatch(
    getAccount(session.user.id, accountId, platform as SocialPlatform),
  );

  if (accountError) {
    console.error("Database error:", accountError);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }

  if ("error" in accountResult) {
    return NextResponse.json(
      { error: accountResult.error },
      { status: accountResult.status },
    );
  }

  const { account } = accountResult;
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Extract metadata fields for platform-specific options
  const metadata = account.metadata as { organizationUrn?: string; } | null;

  // Like the post
  const { error: likeError } = await tryCatch(
    likePostByPlatform(
      platform as SocialPlatform,
      postId,
      accessToken,
      account.accountId,
      // For Facebook, pageId is the same as accountId
      platform === "FACEBOOK" ? account.accountId : null,
      // For LinkedIn, organizationUrn comes from metadata
      metadata?.organizationUrn ?? null,
    ),
  );

  if (likeError) {
    console.error("Failed to like post:", likeError);

    // Handle token expiration
    if (likeError instanceof TwitterHttpError && likeError.status === 401) {
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Access token expired. Please reconnect." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to like post",
        details: likeError instanceof Error ? likeError.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/social/[platform]/posts/[postId]/like
 *
 * Unlike a post on the specified platform
 * Query params:
 * - accountId: Required. The SocialAccount ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform: platformParam, postId } = await params;
  const platform = platformParam.toUpperCase();

  if (!isValidPlatform(platform)) {
    return NextResponse.json(
      { error: `Invalid platform: ${platformParam}` },
      { status: 400 },
    );
  }

  // Get accountId from query params for DELETE
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId query parameter is required" },
      { status: 400 },
    );
  }

  // Get and validate the account
  const { data: accountResult, error: accountError } = await tryCatch(
    getAccount(session.user.id, accountId, platform as SocialPlatform),
  );

  if (accountError) {
    console.error("Database error:", accountError);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }

  if ("error" in accountResult) {
    return NextResponse.json(
      { error: accountResult.error },
      { status: accountResult.status },
    );
  }

  const { account } = accountResult;
  const accessToken = safeDecryptToken(account.accessTokenEncrypted);

  // Extract metadata fields for platform-specific options
  const metadata = account.metadata as { organizationUrn?: string; } | null;

  // Unlike the post
  const { error: unlikeError } = await tryCatch(
    unlikePostByPlatform(
      platform as SocialPlatform,
      postId,
      accessToken,
      account.accountId,
      // For Facebook, pageId is the same as accountId
      platform === "FACEBOOK" ? account.accountId : null,
      // For LinkedIn, organizationUrn comes from metadata
      metadata?.organizationUrn ?? null,
    ),
  );

  if (unlikeError) {
    console.error("Failed to unlike post:", unlikeError);

    // Handle token expiration
    if (unlikeError instanceof TwitterHttpError && unlikeError.status === 401) {
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Access token expired. Please reconnect." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to unlike post",
        details: unlikeError instanceof Error ? unlikeError.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
