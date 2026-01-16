/**
 * Scout Competitor Tracker
 *
 * This service is responsible for managing competitor accounts and fetching their data.
 * It uses the public API clients to interact with social platforms and stores the
 * collected data in the database using Prisma.
 */

import prisma from "@/lib/prisma";
import type { SocialPlatform } from "@prisma/client";
import { PublicFacebookClient } from "./public-api-clients/facebook";
import { PublicInstagramClient } from "./public-api-clients/instagram";
import { PublicTwitterClient } from "./public-api-clients/twitter";

// A factory to get the correct public API client for a given platform.
function getPublicApiClient(platform: SocialPlatform) {
  switch (platform) {
    case "TWITTER":
      return new PublicTwitterClient();
    case "FACEBOOK":
      return new PublicFacebookClient();
    case "INSTAGRAM":
      return new PublicInstagramClient();
    default:
      throw new Error(
        `No public API client available for platform: ${platform}`,
      );
  }
}

/**
 * Adds a new competitor to a workspace after validating their account.
 * @param workspaceId The ID of the workspace.
 * @param platform The social media platform.
 * @param handle The competitor's handle/username.
 * @returns The newly created ScoutCompetitor object or null if validation fails.
 */
export async function addCompetitor(
  workspaceId: string,
  platform: SocialPlatform,
  handle: string,
) {
  // Validate handle is not empty
  if (!handle || typeof handle !== "string" || handle.trim() === "") {
    return null;
  }

  const trimmedHandle = handle.trim();

  const client = getPublicApiClient(platform);

  const accountInfo = await client.getAccountInfo(trimmedHandle);
  if (!accountInfo) {
    // Account validation failed
    return null;
  }

  const competitor = await prisma.scoutCompetitor.create({
    data: {
      workspaceId,
      platform,
      handle: accountInfo.handle,
      name: accountInfo.name,
      isActive: true,
    },
  });

  return competitor;
}

/**
 * Fetches and stores the latest posts for a single competitor.
 * @param competitorId The ID of the ScoutCompetitor.
 */
export async function syncCompetitorPosts(competitorId: string) {
  const competitor = await prisma.scoutCompetitor.findUnique({
    where: { id: competitorId },
  });

  if (!competitor || !competitor.isActive) {
    return;
  }

  const client = getPublicApiClient(competitor.platform);
  const posts = await client.getPosts(competitor.handle);

  if (posts.length === 0) {
    return;
  }

  const postData = posts.map((post) => {
    // Extract shares count - Instagram posts don't have shares, Twitter/Facebook do
    const shares = "shares" in post && typeof post.shares === "number"
      ? post.shares
      : 0;
    return {
      competitorId: competitor.id,
      platformPostId: post.id,
      content: post.content,
      postedAt: post.publishedAt,
      likes: post.likes || 0,
      comments: post.comments || 0,
      shares,
    };
  });

  // Use createMany with skipDuplicates to avoid errors for existing posts.
  await prisma.scoutCompetitorPost.createMany({
    data: postData,
    skipDuplicates: true,
  });
}

/**
 * Syncs posts for all active competitors in a given workspace.
 * Uses parallel processing with rate limiting to improve performance while respecting API limits.
 * @param workspaceId The ID of the workspace to sync.
 * @param concurrency Maximum number of concurrent sync operations (default: 3)
 * @param delayMs Delay in milliseconds between batches (default: 1000)
 */
export async function syncAllCompetitorsForWorkspace(
  workspaceId: string,
  concurrency: number = 3,
  delayMs: number = 1000,
) {
  const competitors = await prisma.scoutCompetitor.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
  });

  // Process competitors in batches with controlled concurrency
  const results: Array<
    { id: string; handle: string; success: boolean; error?: string; }
  > = [];

  for (let i = 0; i < competitors.length; i += concurrency) {
    const batch = competitors.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async (competitor) => {
        try {
          await syncCompetitorPosts(competitor.id);
          return {
            id: competitor.id,
            handle: competitor.handle,
            success: true,
          };
        } catch (error) {
          const errorMessage = error instanceof Error
            ? error.message
            : "Unknown error";
          console.error(
            `Failed to sync posts for competitor ${competitor.handle}:`,
            error,
          );
          return {
            id: competitor.id,
            handle: competitor.handle,
            success: false,
            error: errorMessage,
          };
        }
      }),
    );

    // Collect results
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }

    // Add delay between batches (except for the last batch)
    if (i + concurrency < competitors.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
