import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncPostPerformance, updatePostPerformance } from './metrics-tracker';
import prisma from '@/lib/prisma';
import { PostType } from '@/generated/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    socialPost: {
      findMany: vi.fn(),
    },
    postPerformance: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Metrics Tracker', () => {
  const mockDate = new Date('2024-01-01T12:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('updatePostPerformance', () => {
    const workspaceId = 'ws-123';
    const post = {
      id: 'post-1',
      likes: 10,
      comments: 5,
      shares: 2,
      impressions: 1000,
      publishedAt: new Date('2024-01-01T10:00:00Z'), // 2 hours ago
      createdAt: new Date('2024-01-01T10:00:00Z'),
    };

    it('should create new performance record if none exists', async () => {
      vi.mocked(prisma.postPerformance.findFirst).mockResolvedValue(null);

      await updatePostPerformance(post, workspaceId);

      const expectedEngagementCount = 10 + 5 + 2; // 17
      const expectedEngagementRate = 17 / 1000; // 0.017
      const expectedVelocity = 17 / 2; // 8.5

      expect(prisma.postPerformance.create).toHaveBeenCalledWith({
        data: {
          postId: post.id,
          postType: PostType.SOCIAL_POST,
          workspaceId,
          impressions: 1000,
          clicks: 0,
          engagementCount: expectedEngagementCount,
          engagementRate: expectedEngagementRate,
          engagementVelocity: expectedVelocity,
          metricPeriod: expect.any(Date),
          checkedAt: expect.any(Date),
        },
      });
    });

    it('should update existing performance record', async () => {
      const existingRecord = { id: 'perf-1' };
      vi.mocked(prisma.postPerformance.findFirst).mockResolvedValue(existingRecord as any);

      await updatePostPerformance(post, workspaceId);

      const expectedEngagementCount = 17;
      const expectedEngagementRate = 0.017;
      const expectedVelocity = 8.5;

      expect(prisma.postPerformance.update).toHaveBeenCalledWith({
        where: { id: existingRecord.id },
        data: {
          impressions: 1000,
          clicks: 0,
          engagementCount: expectedEngagementCount,
          engagementRate: expectedEngagementRate,
          engagementVelocity: expectedVelocity,
          metricPeriod: expect.any(Date),
          checkedAt: expect.any(Date),
        },
      });
    });

    it('should handle zero impressions correctly', async () => {
      const zeroImpressionPost = { ...post, impressions: 0 };
      vi.mocked(prisma.postPerformance.findFirst).mockResolvedValue(null);

      await updatePostPerformance(zeroImpressionPost, workspaceId);

      expect(prisma.postPerformance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            engagementRate: 0,
          }),
        })
      );
    });
  });

  describe('syncPostPerformance', () => {
    it('should fetch posts and update performance for each', async () => {
      const posts = [
        { id: 'p1', createdAt: new Date() },
        { id: 'p2', createdAt: new Date() },
      ];
      vi.mocked(prisma.socialPost.findMany).mockResolvedValue(posts as any);
      vi.mocked(prisma.postPerformance.findFirst).mockResolvedValue(null);

      await syncPostPerformance('ws-1', 7);

      expect(prisma.socialPost.findMany).toHaveBeenCalled();
      expect(prisma.postPerformance.create).toHaveBeenCalledTimes(2);
    });
  });
});
