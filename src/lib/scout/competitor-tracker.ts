/**
 * Scout Competitor Tracker
 *
 * This service is responsible for managing competitor accounts and fetching their data.
 * It uses the public API clients to interact with social platforms and stores the
 * collected data in the database using Prisma.
 */

import { SocialPlatform } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PublicTwitterClient } from './public-api-clients/twitter';
import { PublicFacebookClient } from './public-api-clients/facebook';
import { PublicInstagramClient } from './public-api-clients/instagram';

// A factory to get the correct public API client for a given platform.
function getPublicApiClient(platform: SocialPlatform) {
  switch (platform) {
    case 'TWITTER':
      return new PublicTwitterClient();
    case 'FACEBOOK':
      return new PublicFacebookClient();
    case 'INSTAGRAM':
      return new PublicInstagramClient();
    default:
      throw new Error(`No public API client available for platform: ${platform}`);
  }
}

/**
 * Adds a new competitor to a workspace after validating their account.
 * @param workspaceId The ID of the workspace.
 * @param platform The social media platform.
 * @param handle The competitor's handle/username.
 * @returns The newly created ScoutCompetitor object or null if validation fails.
 */
export async function addCompetitor(workspaceId: string, platform: SocialPlatform, handle: string) {
  const client = getPublicApiClient(platform);

  const accountInfo = await client.getAccountInfo(handle);
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

  const postData = posts.map(post => ({
    competitorId: competitor.id,
    platformPostId: post.id,
    content: post.content,
    postedAt: post.publishedAt,
    likes: post.likes || 0,
    comments: post.comments || 0,
    shares: 'shares' in post ? post.shares || 0 : 0,
  }));

  // Use createMany with skipDuplicates to avoid errors for existing posts.
  await prisma.scoutCompetitorPost.createMany({
    data: postData,
    skipDuplicates: true,
  });
}

/**
 * Syncs posts for all active competitors in a given workspace.
 * @param workspaceId The ID of the workspace to sync.
 */
export async function syncAllCompetitorsForWorkspace(workspaceId: string) {
  const competitors = await prisma.scoutCompetitor.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
  });

  for (const competitor of competitors) {
    try {
      await syncCompetitorPosts(competitor.id);
      // Optional: Add a small delay between competitors to be a good citizen
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to sync posts for competitor ${competitor.handle}:`, error);
    }
  }
}
