/**
 * Boost Campaign Service - Issue #570
 *
 * Handles CRUD operations for boost campaigns, linking organic posts
 * to their boosted ad campaigns with complete metadata tracking.
 */

import { PrismaClient, type BoostCampaign as PrismaBoostCampaign } from '@/generated/prisma';
import type {
  BoostCampaignData,
  BoostCampaignFilters,
  BoostStatus,
  CreateBoostCampaignRequest,
  OrganicMetricsSnapshot,
} from '@repo/shared/types';


export class BoostCampaignService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new boost campaign record
   */
  async createBoostCampaign(
    params: CreateBoostCampaignRequest
  ): Promise<BoostCampaignData> {
    const boostCampaign = await this.prisma.boostCampaign.create({
      data: {
        workspaceId: params.workspaceId,
        originalPostId: params.originalPostId,
        campaignId: params.campaignId,
        boostedAt: new Date(),
        boostedBy: params.boostedBy,
        boostReason: params.boostReason,
        boostStrategy: params.boostStrategy,
        organicMetrics: params.organicMetrics as any, // Prisma Json type
        targetingCriteria: params.targetingCriteria as any,
        initialBudget: params.initialBudget,
        duration: params.duration,
        status: 'ACTIVE',
      },
    });

    return this.mapToBoostCampaignData(boostCampaign);
  }

  /**
   * Get a boost campaign by ID
   */
  async getBoostCampaign(id: string): Promise<BoostCampaignData | null> {
    const boostCampaign = await this.prisma.boostCampaign.findUnique({
      where: { id },
    });

    if (!boostCampaign) {
      return null;
    }

    return this.mapToBoostCampaignData(boostCampaign);
  }

  /**
   * Get boost campaign by campaign ID (Allocator campaign)
   */
  async getBoostCampaignByCampaignId(
    campaignId: string
  ): Promise<BoostCampaignData | null> {
    const boostCampaign = await this.prisma.boostCampaign.findUnique({
      where: { campaignId },
    });

    if (!boostCampaign) {
      return null;
    }

    return this.mapToBoostCampaignData(boostCampaign);
  }

  /**
   * List boost campaigns with optional filters
   */
  async listBoostCampaigns(
    workspaceId: string,
    filters?: BoostCampaignFilters
  ): Promise<BoostCampaignData[]> {
    const where: any = { workspaceId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.boostedAt = {};
      if (filters.dateFrom) {
        where.boostedAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.boostedAt.lte = filters.dateTo;
      }
    }

    if (filters?.minBudget) {
      where.initialBudget = { gte: filters.minBudget };
    }

    if (filters?.maxBudget) {
      where.initialBudget = {
        ...where.initialBudget,
        lte: filters.maxBudget,
      };
    }

    if (filters?.boostStrategy) {
      where.boostStrategy = filters.boostStrategy;
    }

    const orderBy: any = {};
    if (filters?.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const boostCampaigns = await this.prisma.boostCampaign.findMany({
      where,
      orderBy,
      take: filters?.limit,
      skip: filters?.offset,
    });

    return boostCampaigns.map((bc) => this.mapToBoostCampaignData(bc));
  }

  /**
   * Update boost campaign status
   */
  async updateBoostStatus(
    id: string,
    status: BoostStatus
  ): Promise<BoostCampaignData> {
    const boostCampaign = await this.prisma.boostCampaign.update({
      where: { id },
      data: { status },
    });

    return this.mapToBoostCampaignData(boostCampaign);
  }

  /**
   * Link a campaign to an existing boost (update campaignId)
   */
  async linkCampaignToBoost(
    boostId: string,
    campaignId: string
  ): Promise<BoostCampaignData> {
    const boostCampaign = await this.prisma.boostCampaign.update({
      where: { id: boostId },
      data: { campaignId },
    });

    return this.mapToBoostCampaignData(boostCampaign);
  }

  /**
   * Get active boosts for a workspace
   */
  async getActiveBoosts(workspaceId: string): Promise<BoostCampaignData[]> {
    return this.listBoostCampaigns(workspaceId, {
      status: 'ACTIVE',
    });
  }

  /**
   * Get boosts for a specific organic post
   */
  async getBoostsForPost(
    postId: string
  ): Promise<BoostCampaignData[]> {
    const boostCampaigns = await this.prisma.boostCampaign.findMany({
      where: { originalPostId: postId },
      orderBy: { createdAt: 'desc' },
    });

    return boostCampaigns.map((bc) => this.mapToBoostCampaignData(bc));
  }

  /**
   * Count total boosts for a workspace
   */
  async countBoosts(
    workspaceId: string,
    status?: BoostStatus
  ): Promise<number> {
    const where: any = { workspaceId };
    if (status) {
      where.status = status;
    }

    return this.prisma.boostCampaign.count({ where });
  }

  /**
   * Get organic metrics snapshot before boosting
   */
  async captureOrganicMetrics(
    postId: string
  ): Promise<OrganicMetricsSnapshot> {
    // Fetch latest social metrics for the post's accounts
    // This is a simplified implementation - in production, you'd aggregate
    // metrics from multiple social_metrics records for all accounts
    // where the post was published

    const post = await this.prisma.socialPost.findUnique({
      where: { id: postId },
      include: {
        postAccounts: {
          include: {
            account: {
              include: {
                metrics: {
                  orderBy: { date: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    // Aggregate metrics across all accounts
    let totalImpressions = 0;
    let totalEngagement = 0;
    let totalReach = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    for (const postAccount of post.postAccounts) {
      const latestMetrics = postAccount.account.metrics[0];
      if (latestMetrics) {
        totalImpressions += latestMetrics.impressions;
        totalReach += latestMetrics.reach;
        totalLikes += latestMetrics.likes;
        totalComments += latestMetrics.comments;
        totalShares += latestMetrics.shares;
        // Calculate engagement from individual components
        totalEngagement += latestMetrics.likes + latestMetrics.comments + latestMetrics.shares;
      }
    }

    return {
      impressions: totalImpressions,
      engagement: totalEngagement,
      reach: totalReach,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      capturedAt: new Date(),
    };
  }

  /**
   * Map Prisma model to BoostCampaignData type
   */
  private mapToBoostCampaignData(boostCampaign: PrismaBoostCampaign): BoostCampaignData {
    return {
      id: boostCampaign.id,
      workspaceId: boostCampaign.workspaceId,
      originalPostId: boostCampaign.originalPostId,
      campaignId: boostCampaign.campaignId,
      boostedAt: boostCampaign.boostedAt,
      boostedBy: boostCampaign.boostedBy,
      boostReason: boostCampaign.boostReason,
      boostStrategy: boostCampaign.boostStrategy,
      organicMetrics: boostCampaign.organicMetrics as OrganicMetricsSnapshot,
      targetingCriteria: boostCampaign.targetingCriteria,
      initialBudget: boostCampaign.initialBudget,
      duration: boostCampaign.duration,
      status: boostCampaign.status as BoostStatus,
      createdAt: boostCampaign.createdAt,
      updatedAt: boostCampaign.updatedAt,
    };
  }
}
