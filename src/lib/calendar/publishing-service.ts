/**
 * Calendar Publishing Service
 *
 * Orchestrates the publishing of scheduled posts to social media platforms.
 * Part of #576: Implement Calendar publishing
 */

import { safeDecryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import { createSocialClient, type PostOptions, type PostResult } from "@/lib/social";
import type { SocialPlatform } from "@prisma/client";
import {
  finalizePostPublishing,
  getDueScheduledPosts,
  markPostPublishing,
  recordAccountPublishResult,
} from "./scheduled-posts";
import type {
  PublishAccountResult,
  PublishScheduledPostResult,
  ScheduledPostMetadata,
} from "./types";

/**
 * Result of a publishing run
 */
export interface PublishingRunResult {
  /** Total number of posts processed */
  processedCount: number;
  /** Posts that were successfully published (all accounts) */
  successCount: number;
  /** Posts that had partial success (some accounts failed) */
  partialSuccessCount: number;
  /** Posts that completely failed */
  failedCount: number;
  /** Detailed results per post */
  results: PublishScheduledPostResult[];
  /** Any errors that occurred during the run */
  errors: Array<{ postId: string; error: string; }>;
}

/**
 * Metadata shape for social accounts (stored in JSON metadata field)
 */
interface SocialAccountMetadata {
  pageId?: string;
  igUserId?: string;
  organizationUrn?: string;
  avatarUrl?: string;
}

/**
 * Fetch the decrypted access token for a social account
 */
async function getAccountWithToken(
  accountId: string,
): Promise<
  {
    id: string;
    platform: SocialPlatform;
    accessToken: string;
    pageId?: string;
    igUserId?: string;
  } | null
> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      platform: true,
      accessTokenEncrypted: true,
      metadata: true,
    },
  });

  if (!account || !account.accessTokenEncrypted) {
    return null;
  }

  const accessToken = safeDecryptToken(account.accessTokenEncrypted);
  const metadata = account.metadata as SocialAccountMetadata | null;

  return {
    id: account.id,
    platform: account.platform,
    accessToken,
    pageId: metadata?.pageId,
    igUserId: metadata?.igUserId,
  };
}

/**
 * Get platform-specific content from metadata or use default content
 */
function getContentForPlatform(
  content: string,
  platform: SocialPlatform,
  metadata: ScheduledPostMetadata | null,
): string {
  if (metadata?.platformOverrides?.[platform]?.content) {
    return metadata.platformOverrides[platform]!.content!;
  }
  return content;
}

/**
 * Build post options from metadata
 */
function buildPostOptions(
  platform: SocialPlatform,
  metadata: ScheduledPostMetadata | null,
): PostOptions {
  const options: PostOptions = {};

  // Check for platform-specific media IDs first
  if (metadata?.platformOverrides?.[platform]?.mediaIds) {
    options.mediaIds = metadata.platformOverrides[platform]!.mediaIds;
  } else if (metadata?.mediaIds) {
    options.mediaIds = metadata.mediaIds;
  } else if (metadata?.mediaUrls) {
    options.mediaUrls = metadata.mediaUrls;
  }

  return options;
}

/**
 * Publish a single post to a single account
 */
async function publishToAccount(
  content: string,
  platform: SocialPlatform,
  accountId: string,
  metadata: ScheduledPostMetadata | null,
): Promise<PublishAccountResult> {
  const account = await getAccountWithToken(accountId);

  if (!account) {
    return {
      accountId,
      platform,
      success: false,
      error: "Account not found or access token missing",
    };
  }

  try {
    const client = await createSocialClient(platform, {
      accessToken: account.accessToken,
      pageId: account.pageId,
      igUserId: account.igUserId,
    });

    const platformContent = getContentForPlatform(content, platform, metadata);
    const options = buildPostOptions(platform, metadata);

    const result: PostResult = await client.createPost(
      platformContent,
      options,
    );

    return {
      accountId,
      platform,
      success: true,
      platformPostId: result.platformPostId,
    };
  } catch (error) {
    return {
      accountId,
      platform,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Publish a single scheduled post to all its target accounts
 */
export async function publishScheduledPost(
  postId: string,
  content: string,
  accounts: Array<{ accountId: string; platform: SocialPlatform; }>,
  metadata: ScheduledPostMetadata | null,
): Promise<PublishScheduledPostResult> {
  // Mark the post as publishing
  await markPostPublishing(postId);

  // Publish to all accounts in parallel
  const publishPromises = accounts.map(async ({ accountId, platform }) => {
    const result = await publishToAccount(
      content,
      platform,
      accountId,
      metadata,
    );

    // Record the result for this account
    await recordAccountPublishResult(postId, accountId, result);

    return result;
  });

  await Promise.all(publishPromises);

  // Finalize the post status based on results
  const finalResult = await finalizePostPublishing(postId);

  return finalResult;
}

/**
 * Process all due scheduled posts
 *
 * This is the main entry point for the cron job.
 * It fetches all posts that are due for publishing and processes them.
 */
export async function processScheduledPosts(
  limit = 50,
): Promise<PublishingRunResult> {
  const result: PublishingRunResult = {
    processedCount: 0,
    successCount: 0,
    partialSuccessCount: 0,
    failedCount: 0,
    results: [],
    errors: [],
  };

  // Get posts that are due for publishing
  const duePosts = await getDueScheduledPosts(limit);

  if (duePosts.length === 0) {
    return result;
  }

  // Process each post
  for (const post of duePosts) {
    result.processedCount++;

    try {
      // Build account info for publishing
      const accounts = post.accounts.map((acc) => ({
        accountId: acc.accountId,
        platform: acc.platform,
      }));

      const publishResult = await publishScheduledPost(
        post.id,
        post.content,
        accounts,
        post.metadata,
      );

      result.results.push(publishResult);

      if (publishResult.allSucceeded) {
        result.successCount++;
      } else if (publishResult.partialSuccess) {
        result.partialSuccessCount++;
      } else if (!publishResult.success) {
        result.failedCount++;
      }
    } catch (error) {
      result.failedCount++;
      result.errors.push({
        postId: post.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return result;
}
