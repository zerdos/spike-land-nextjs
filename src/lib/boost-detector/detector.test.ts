import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectBoostOpportunities, generateRecommendation } from './detector';
import prisma from '@/lib/prisma';
import * as scoring from './scoring';
import { PostType } from '@/generated/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    postPerformance: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
    marketingAccount: {
      findMany: vi.fn(),
    },
    postBoostRecommendation: {
      create: vi.fn(),
    },
  },
}));

// Mock scoring
vi.mock('./scoring', () => ({
  calculateBoostScore: vi.fn(),
  predictROI: vi.fn(),
}));

describe('Boost Detector', () => {
  const workspaceId = 'ws-123';
  const ownerId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default workspace mock
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
      id: workspaceId,
      members: [{ userId: ownerId }],
    } as any);

    // Setup default marketing account mock
    vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([
      { platform: 'FACEBOOK' },
    ] as any);
  });

  describe('detectBoostOpportunities', () => {
    const config = {
      lookbackPeriod: 30,
      minImpressions: 1000,
      engagementThreshold: 0.05,
      velocityThreshold: 10,
    };

    it('should identify qualified posts and generate recommendations', async () => {
      // Mock performances
      const performances = [
        {
          id: 'perf-1',
          postId: 'post-1',
          postType: PostType.SOCIAL_POST,
          workspaceId,
          engagementRate: 0.1, // Qualified
          engagementVelocity: 5,
          impressions: 2000,
          conversions: 0,
        },
        {
          id: 'perf-2',
          postId: 'post-2',
          postType: PostType.SOCIAL_POST,
          workspaceId,
          engagementRate: 0.01, // Not qualified
          engagementVelocity: 2,
          impressions: 2000,
          conversions: 0,
        },
      ];

      vi.mocked(prisma.postPerformance.findMany).mockResolvedValue(performances as any);

      // Mock scoring results
      vi.mocked(scoring.calculateBoostScore).mockResolvedValue({
        score: 80,
        factors: {
          engagementVelocity: 40,
          audienceMatch: 20,
          contentType: 10,
          timing: 10,
        },
        trigger: 'HIGH_ENGAGEMENT',
      });

      vi.mocked(scoring.predictROI).mockResolvedValue({
        estimatedImpressions: 5000,
        estimatedClicks: 100,
        estimatedConversions: 5,
        estimatedCost: 50,
        estimatedROI: 1.5,
        confidenceScore: 0.8,
      });

      // Mock create response
      vi.mocked(prisma.postBoostRecommendation.create).mockResolvedValue({
        id: 'rec-1',
        postId: 'post-1',
        status: 'PENDING',
      } as any);

      const recommendations = await detectBoostOpportunities(workspaceId, config);

      expect(prisma.postPerformance.findMany).toHaveBeenCalled();
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]!.postId).toBe('post-1');
      expect(prisma.postBoostRecommendation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            postId: 'post-1',
            status: 'PENDING',
          }),
        })
      );
    });

    it('should skip detection if no owner found', async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.postPerformance.findMany).mockResolvedValue([
        { engagementRate: 0.1 } as any
      ]);

      await expect(detectBoostOpportunities(workspaceId, config))
        .rejects.toThrow(/No owner found/);
    });
  });

  describe('generateRecommendation', () => {
    const performance = {
      id: 'perf-1',
      postId: 'post-1',
      postType: PostType.SOCIAL_POST,
      workspaceId,
      engagementRate: 0.08,
      engagementVelocity: 30,
      impressions: 1500,
      conversions: 2,
    };

    it('should update performance score and create recommendation', async () => {
      vi.mocked(scoring.calculateBoostScore).mockResolvedValue({
        score: 90,
        factors: { engagementVelocity: 50, audienceMatch: 20, contentType: 10, timing: 10 },
        trigger: 'VIRAL_VELOCITY',
      });

      vi.mocked(scoring.predictROI).mockResolvedValue({
        estimatedImpressions: 10000,
        estimatedClicks: 200,
        estimatedConversions: 10,
        estimatedCost: 100,
        estimatedROI: 2.0,
        confidenceScore: 0.9,
      });

      // Mock create response
      vi.mocked(prisma.postBoostRecommendation.create).mockResolvedValue({
        id: 'rec-1',
        postId: 'post-1',
        status: 'PENDING',
      } as any);

      await generateRecommendation(performance as any, ownerId);

      // Should update boost score
      expect(prisma.postPerformance.update).toHaveBeenCalledWith({
        where: { id: performance.id },
        data: {
          boostScore: 90,
          boostTrigger: 'VIRAL_VELOCITY',
        },
      });

      // Should create recommendation
      expect(prisma.postBoostRecommendation.create).toHaveBeenCalled();
    });

    it('should fail if no marketing accounts available', async () => {
      vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([]);

      await expect(generateRecommendation(performance as any, ownerId))
        .rejects.toThrow(/No marketing accounts connected/);
    });
  });
});
