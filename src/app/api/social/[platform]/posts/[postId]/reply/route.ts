/**
 * Reply API Route for Social Posts
 *
 * POST /api/social/[platform]/posts/[postId]/reply - Reply to a post
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
 * Platform-specific character limits for replies
 */
export const PLATFORM_CHARACTER_LIMITS: Record<string, number> = {
  TWITTER: 280,
  FACEBOOK: 8000,
  INSTAGRAM: 2200,
  LINKEDIN: 3000,
};

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
 * Reply result interface
 */
interface ReplyResult {
  id: string;
  url?: string;
}

/**
 * Reply to a post based on platform
 */
async function replyToPostByPlatform(
  platform: SocialPlatform,
  postId: string,
  content: string,
  accessToken: string,
  accountId: string,
  pageId?: string | null,
  igUserId?: string | null,
  organizationUrn?: string | null,
): Promise<ReplyResult> {
  switch (platform) {
    case "TWITTER": {
      const client = new TwitterClient({ accessToken, accountId });
      const result = await client.replyToPost(postId, content);
      return {
        id: result.platformPostId,
        url: result.url,
      };
    }
    case "FACEBOOK": {
      if (!pageId) throw new Error("Page ID is required for Facebook");
      const client = new FacebookClient({ accessToken, pageId });
      const result = await client.commentOnPost(postId, content);
      return { id: result.id };
    }
    case "INSTAGRAM": {
      if (!igUserId) throw new Error("Instagram User ID is required");
      const client = new InstagramClient({ accessToken, igUserId });
      const result = await client.commentOnMedia(postId, content);
      return { id: result.id };
    }
    case "LINKEDIN": {
      if (!organizationUrn) throw new Error("Organization URN is required for LinkedIn");
      const client = new LinkedInClient({ accessToken, organizationUrn });
      const result = await client.commentOnPost(postId, content);
      return { id: result.id };
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
 * POST /api/social/[platform]/posts/[postId]/reply
 *
 * Reply to a post on the specified platform
 * Body:
 * - accountId: Required. The SocialAccount ID
 * - content: Required. The reply content
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

  const { accountId, content } = body as { accountId?: string; content?: string; };

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

  // Check character limit
  const charLimit = PLATFORM_CHARACTER_LIMITS[platform];
  if (charLimit && content.length > charLimit) {
    return NextResponse.json(
      { error: `Reply content exceeds ${charLimit} characters for ${platform}` },
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

  // Reply to the post
  const { data: result, error: replyError } = await tryCatch(
    replyToPostByPlatform(
      platform as SocialPlatform,
      postId,
      content,
      accessToken,
      account.accountId,
      account.pageId,
      account.igUserId,
      account.organizationUrn,
    ),
  );

  if (replyError) {
    console.error("Failed to reply to post:", replyError);

    // Handle token expiration
    if (replyError instanceof TwitterHttpError && replyError.status === 401) {
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
        error: "Failed to reply to post",
        details: replyError instanceof Error ? replyError.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    reply: result,
  });
}
