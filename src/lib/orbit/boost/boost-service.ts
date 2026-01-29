/**
 * Boost Service
 *
 * Creates boosted posts from top-performing organic posts
 * Handles campaign creation and configuration
 *
 * Resolves #521
 */

import prisma from "@/lib/prisma";
import type { SocialPlatform } from "@prisma/client";

export interface CreateBoostInput {
  originalPostId: string;
  platform: SocialPlatform;
  budget: number;
  currency?: string;
  duration: number; // days
  workspaceId: string;
  createdById: string;
  targetingData?: Record<string, unknown>;
}

/**
 * Generate a campaign name for a boosted post
 * @param postId - Original post ID
 * @param platform - Target platform
 * @returns Campaign name
 */
export function generateCampaignName(
  postId: string,
  platform: SocialPlatform,
): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const shortId = postId.slice(-8);
  return `Boost_${platform}_${shortId}_${timestamp}`;
}

/**
 * Create a boost from an organic post
 * @param input - Boost creation input
 * @returns Created boost with suggestions
 */
export async function createBoost(input: CreateBoostInput) {
  // Verify the post exists and is a top performer
  const post = await db.socialPost.findUnique({
    where: { id: input.originalPostId },
    include: {
      performance: true,
      postAccounts: {
        include: {
          account: true,
        },
      },
    },
  });

  if (!post) {
    throw new Error("Original post not found");
  }

  if (!post.performance?.isTopPerformer) {
    throw new Error("Post is not flagged as a top performer");
  }

  // Generate campaign name
  const campaignName = generateCampaignName(input.originalPostId, input.platform);

  // Create the boosted post
  const boostedPost = await db.boostedPost.create({
    data: {
      originalPostId: input.originalPostId,
      campaignName,
      platform: input.platform,
      budget: input.budget,
      currency: input.currency || "USD",
      duration: input.duration,
      workspaceId: input.workspaceId,
      createdById: input.createdById,
      targetingData: input.targetingData || {},
      status: "DRAFT",
    },
    include: {
      originalPost: {
        include: {
          performance: true,
          postAccounts: {
            include: {
              account: true,
            },
          },
        },
      },
    },
  });

  return boostedPost;
}

/**
 * Get boost by ID
 * @param boostId - Boost ID
 * @returns Boost with related data
 */
export async function getBoost(boostId: string) {
  return await db.boostedPost.findUnique({
    where: { id: boostId },
    include: {
      originalPost: {
        include: {
          performance: true,
          postAccounts: {
            include: {
              account: true,
            },
          },
        },
      },
      performance: true,
      impactAnalysis: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

/**
 * Update a draft boost
 * @param boostId - Boost ID
 * @param updates - Fields to update
 */
export async function updateBoost(
  boostId: string,
  updates: Partial<{
    budget: number;
    duration: number;
    targetingData: Record<string, unknown>;
    audienceSuggestions: Record<string, unknown>;
  }>,
) {
  const boost = await db.boostedPost.findUnique({
    where: { id: boostId },
  });

  if (!boost) {
    throw new Error("Boost not found");
  }

  if (boost.status !== "DRAFT" && boost.status !== "PENDING_APPROVAL") {
    throw new Error("Cannot update boost that is not in draft or pending approval status");
  }

  return await db.boostedPost.update({
    where: { id: boostId },
    data: updates,
  });
}

/**
 * Delete/cancel a boost
 * @param boostId - Boost ID
 */
export async function cancelBoost(boostId: string) {
  const boost = await db.boostedPost.findUnique({
    where: { id: boostId },
  });

  if (!boost) {
    throw new Error("Boost not found");
  }

  if (boost.status === "ACTIVE") {
    // If active, mark as cancelled but don't delete
    return await db.boostedPost.update({
      where: { id: boostId },
      data: {
        status: "CANCELLED",
        endedAt: new Date(),
      },
    });
  } else {
    // If draft or pending, we can delete it
    return await db.boostedPost.delete({
      where: { id: boostId },
    });
  }
}

/**
 * List boosts for a workspace
 * @param workspaceId - Workspace ID
 * @param options - Filter options
 */
export async function listBoosts(
  workspaceId: string,
  options?: {
    platform?: SocialPlatform;
    status?: string;
    limit?: number;
  },
) {
  return await db.boostedPost.findMany({
    where: {
      workspaceId,
      ...(options?.platform && { platform: options.platform }),
      ...(options?.status && { status: options.status as any }),
    },
    include: {
      originalPost: {
        include: {
          performance: true,
        },
      },
      performance: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: options?.limit || 50,
  });
}
