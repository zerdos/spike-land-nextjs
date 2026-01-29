/**
 * Unit Tests for BoostCampaignService
 * Tests for Issue #570 - Boost Analytics Foundation
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BoostCampaignService } from './boost-campaign-service';
import type { CreateBoostCampaignRequest, BoostStatus } from '@repo/shared/types';

// Mock Prisma client
const mockBoostCampaignCreate = vi.fn();
const mockBoostCampaignFindUnique = vi.fn();
const mockBoostCampaignFindMany = vi.fn();
const mockBoostCampaignUpdate = vi.fn();
const mockBoostCampaignCount = vi.fn();
const mockSocialPostFindUnique = vi.fn();

const mockPrisma = {
  boostCampaign: {
    create: mockBoostCampaignCreate,
    findUnique: mockBoostCampaignFindUnique,
    findMany: mockBoostCampaignFindMany,
    update: mockBoostCampaignUpdate,
    count: mockBoostCampaignCount,
  },
  socialPost: {
    findUnique: mockSocialPostFindUnique,
  },
} as any;

describe('BoostCampaignService', () => {
  let service: BoostCampaignService;

  const mockBoostCampaign = {
    id: 'boost-1',
    workspaceId: 'workspace-1',
    originalPostId: 'post-1',
    campaignId: 'campaign-1',
    boostedAt: new Date('2024-01-15'),
    boostedBy: 'user-1',
    boostReason: 'High engagement',
    boostStrategy: 'HIGH_ENGAGEMENT',
    organicMetrics: {
      impressions: 1000,
      engagement: 100,
      reach: 800,
      likes: 50,
      comments: 30,
      shares: 20,
      capturedAt: new Date('2024-01-15'),
    },
    targetingCriteria: null,
    initialBudget: 5000,
    duration: 7,
    status: 'ACTIVE',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BoostCampaignService(mockPrisma);
  });

  describe('createBoostCampaign', () => {
    it('should create a boost campaign successfully', async () => {
      const request: CreateBoostCampaignRequest = {
        workspaceId: 'workspace-1',
        originalPostId: 'post-1',
        campaignId: 'campaign-1',
        boostedBy: 'user-1',
        boostReason: 'High engagement',
        boostStrategy: 'HIGH_ENGAGEMENT',
        organicMetrics: {
          impressions: 1000,
          engagement: 100,
          reach: 800,
          likes: 50,
          comments: 30,
          shares: 20,
          capturedAt: new Date('2024-01-15'),
        },
        initialBudget: 5000,
        duration: 7,
      };

      mockBoostCampaignCreate.mockResolvedValue(mockBoostCampaign);

      const result = await service.createBoostCampaign(request);

      expect(mockBoostCampaignCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'workspace-1',
          originalPostId: 'post-1',
          campaignId: 'campaign-1',
          status: 'ACTIVE',
        }),
      });
      expect(result.id).toBe('boost-1');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('getBoostCampaign', () => {
    it('should return a boost campaign by ID', async () => {
      mockBoostCampaignFindUnique.mockResolvedValue(mockBoostCampaign);

      const result = await service.getBoostCampaign('boost-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('boost-1');
    });

    it('should return null when campaign not found', async () => {
      mockBoostCampaignFindUnique.mockResolvedValue(null);

      const result = await service.getBoostCampaign('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listBoostCampaigns', () => {
    it('should list boost campaigns with filters', async () => {
      mockBoostCampaignFindMany.mockResolvedValue([mockBoostCampaign]);

      const result = await service.listBoostCampaigns('workspace-1', {
        status: 'ACTIVE' as BoostStatus,
        limit: 10,
        offset: 0,
      });

      expect(mockBoostCampaignFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'workspace-1',
            status: 'ACTIVE',
          }),
          take: 10,
          skip: 0,
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should apply date filters correctly', async () => {
      mockBoostCampaignFindMany.mockResolvedValue([]);
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      await service.listBoostCampaigns('workspace-1', { dateFrom, dateTo });

      expect(mockBoostCampaignFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            boostedAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          }),
        })
      );
    });
  });

  describe('updateBoostStatus', () => {
    it('should update boost status', async () => {
      const updatedCampaign = { ...mockBoostCampaign, status: 'PAUSED' };
      mockBoostCampaignUpdate.mockResolvedValue(updatedCampaign);

      const result = await service.updateBoostStatus('boost-1', 'PAUSED' as BoostStatus);

      expect(mockBoostCampaignUpdate).toHaveBeenCalledWith({
        where: { id: 'boost-1' },
        data: { status: 'PAUSED' },
      });
      expect(result.status).toBe('PAUSED');
    });
  });

  describe('getActiveBoosts', () => {
    it('should return only active boosts', async () => {
      mockBoostCampaignFindMany.mockResolvedValue([mockBoostCampaign]);

      const result = await service.getActiveBoosts('workspace-1');

      expect(mockBoostCampaignFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'workspace-1',
            status: 'ACTIVE',
          }),
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('countBoosts', () => {
    it('should count all boosts for workspace', async () => {
      mockBoostCampaignCount.mockResolvedValue(5);

      const result = await service.countBoosts('workspace-1');

      expect(result).toBe(5);
    });

    it('should count boosts with status filter', async () => {
      mockBoostCampaignCount.mockResolvedValue(3);

      const result = await service.countBoosts('workspace-1', 'ACTIVE' as BoostStatus);

      expect(mockBoostCampaignCount).toHaveBeenCalledWith({
        where: { workspaceId: 'workspace-1', status: 'ACTIVE' },
      });
      expect(result).toBe(3);
    });
  });

  describe('captureOrganicMetrics', () => {
    it('should capture organic metrics for a post', async () => {
      mockSocialPostFindUnique.mockResolvedValue({
        id: 'post-1',
        postAccounts: [
          {
            account: {
              metrics: [
                {
                  impressions: 500,
                  reach: 400,
                  likes: 25,
                  comments: 15,
                  shares: 10,
                },
              ],
            },
          },
          {
            account: {
              metrics: [
                {
                  impressions: 500,
                  reach: 400,
                  likes: 25,
                  comments: 15,
                  shares: 10,
                },
              ],
            },
          },
        ],
      });

      const result = await service.captureOrganicMetrics('post-1');

      expect(result.impressions).toBe(1000);
      expect(result.reach).toBe(800);
      expect(result.likes).toBe(50);
      expect(result.comments).toBe(30);
      expect(result.shares).toBe(20);
      expect(result.engagement).toBe(100);
    });

    it('should throw error when post not found', async () => {
      mockSocialPostFindUnique.mockResolvedValue(null);

      await expect(service.captureOrganicMetrics('nonexistent')).rejects.toThrow(
        'Post nonexistent not found'
      );
    });
  });
});
