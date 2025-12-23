/**
 * Meta Marketing Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchMetaAdsAggregated,
  fetchMetaAdsForUser,
  isMetaMarketingConfigured,
  validateStoredToken,
} from "./meta-marketing-client";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    marketingAccount: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock FacebookMarketingClient - use vi.hoisted() so mocks are available when factory runs
const { mockListCampaigns, mockGetCampaignMetrics, mockValidateToken } = vi.hoisted(() => ({
  mockListCampaigns: vi.fn(),
  mockGetCampaignMetrics: vi.fn(),
  mockValidateToken: vi.fn(),
}));

vi.mock("@/lib/marketing/facebook-client", () => ({
  // Use a regular function (not arrow) so it can be called with `new`
  FacebookMarketingClient: function MockFacebookMarketingClient() {
    return {
      listCampaigns: mockListCampaigns,
      getCampaignMetrics: mockGetCampaignMetrics,
      validateToken: mockValidateToken,
    };
  },
}));

import prisma from "@/lib/prisma";

describe("Meta Marketing Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isMetaMarketingConfigured", () => {
    it("should return false when credentials not set", () => {
      delete process.env.FACEBOOK_MARKETING_APP_ID;
      delete process.env.FACEBOOK_MARKETING_APP_SECRET;

      expect(isMetaMarketingConfigured()).toBe(false);
    });

    it("should return false when only APP_ID is set", () => {
      process.env.FACEBOOK_MARKETING_APP_ID = "test-id";
      delete process.env.FACEBOOK_MARKETING_APP_SECRET;

      expect(isMetaMarketingConfigured()).toBe(false);
    });

    it("should return true when both credentials are set", () => {
      process.env.FACEBOOK_MARKETING_APP_ID = "test-id";
      process.env.FACEBOOK_MARKETING_APP_SECRET = "test-secret";

      expect(isMetaMarketingConfigured()).toBe(true);
    });
  });

  describe("fetchMetaAdsForUser", () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-31");
    const userId = "user_123";

    beforeEach(() => {
      process.env.FACEBOOK_MARKETING_APP_ID = "test-id";
      process.env.FACEBOOK_MARKETING_APP_SECRET = "test-secret";
    });

    it("should return null when not configured", async () => {
      delete process.env.FACEBOOK_MARKETING_APP_ID;

      const result = await fetchMetaAdsForUser(userId, startDate, endDate);
      expect(result).toBeNull();
    });

    it("should return null when no stored credentials", async () => {
      vi.mocked(prisma.marketingAccount.findFirst).mockResolvedValue(null);

      const result = await fetchMetaAdsForUser(userId, startDate, endDate);
      expect(result).toBeNull();
    });

    it("should fetch and aggregate campaign metrics", async () => {
      vi.mocked(prisma.marketingAccount.findFirst).mockResolvedValue({
        id: "ma_123",
        userId: "user_123",
        platform: "FACEBOOK",
        accountId: "act_123",
        accountName: "Test Account",
        accessToken: "test-token",
        refreshToken: null,
        expiresAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockListCampaigns.mockResolvedValue([
        { id: "camp_1", name: "Campaign 1", status: "ACTIVE" },
        { id: "camp_2", name: "Campaign 2", status: "PAUSED" },
      ]);
      mockGetCampaignMetrics.mockImplementation((_, campaignId) => {
        if (campaignId === "camp_1") {
          return Promise.resolve({
            campaignId: "camp_1",
            platform: "FACEBOOK",
            dateRange: { start: startDate, end: endDate },
            impressions: 10000,
            clicks: 200,
            spend: 5000, // in cents
            conversions: 20,
            ctr: 2.0,
            cpc: 25,
            cpm: 500,
            reach: 8000,
            frequency: 1.25,
          });
        }
        return Promise.resolve({
          campaignId: "camp_2",
          platform: "FACEBOOK",
          dateRange: { start: startDate, end: endDate },
          impressions: 5000,
          clicks: 100,
          spend: 2500,
          conversions: 10,
          ctr: 2.0,
          cpc: 25,
          cpm: 500,
          reach: 4000,
          frequency: 1.25,
        });
      });

      const result = await fetchMetaAdsForUser(userId, startDate, endDate);

      expect(result).not.toBeNull();
      expect(result?.campaigns).toHaveLength(2);
      expect(result?.totalSpend).toBe(75); // (5000 + 2500) / 100
      expect(result?.totalImpressions).toBe(15000);
      expect(result?.totalClicks).toBe(300);
      expect(result?.totalConversions).toBe(30);
      expect(result?.ctr).toBe(2); // (300/15000)*100 = 2
      expect(result?.cpc).toBe(0.25); // 75/300
    });

    it("should handle campaign fetch errors gracefully", async () => {
      vi.mocked(prisma.marketingAccount.findFirst).mockResolvedValue({
        id: "ma_123",
        userId: "user_123",
        platform: "FACEBOOK",
        accountId: "act_123",
        accountName: "Test Account",
        accessToken: "test-token",
        refreshToken: null,
        expiresAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockListCampaigns.mockRejectedValue(new Error("API Error"));

      const result = await fetchMetaAdsForUser(userId, startDate, endDate);

      // Should return empty aggregation, not null
      expect(result).toEqual({
        campaigns: [],
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        ctr: 0,
        cpc: 0,
      });
    });
  });

  describe("fetchMetaAdsAggregated", () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-31");

    beforeEach(() => {
      process.env.FACEBOOK_MARKETING_APP_ID = "test-id";
      process.env.FACEBOOK_MARKETING_APP_SECRET = "test-secret";
    });

    it("should return null when not configured", async () => {
      delete process.env.FACEBOOK_MARKETING_APP_ID;

      const result = await fetchMetaAdsAggregated(startDate, endDate);
      expect(result).toBeNull();
    });

    it("should return null when no accounts found", async () => {
      vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([]);

      const result = await fetchMetaAdsAggregated(startDate, endDate);
      expect(result).toBeNull();
    });

    it("should aggregate across multiple accounts", async () => {
      vi.mocked(prisma.marketingAccount.findMany).mockResolvedValue([
        {
          id: "ma_1",
          userId: "user_1",
          platform: "FACEBOOK",
          accountId: "act_1",
          accountName: "Account 1",
          accessToken: "token_1",
          refreshToken: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "ma_2",
          userId: "user_2",
          platform: "FACEBOOK",
          accountId: "act_2",
          accountName: "Account 2",
          accessToken: "token_2",
          refreshToken: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      mockListCampaigns.mockResolvedValue([
        { id: "camp_1", name: "Campaign 1", status: "ACTIVE" },
      ]);
      mockGetCampaignMetrics.mockResolvedValue({
        campaignId: "camp_1",
        platform: "FACEBOOK",
        dateRange: { start: startDate, end: endDate },
        impressions: 5000,
        clicks: 100,
        spend: 2500,
        conversions: 10,
        ctr: 2.0,
        cpc: 25,
        cpm: 500,
        reach: 4000,
        frequency: 1.25,
      });

      const result = await fetchMetaAdsAggregated(startDate, endDate);

      expect(result).not.toBeNull();
      // Two accounts, each with 1 campaign
      expect(result?.campaigns).toHaveLength(2);
      expect(result?.totalSpend).toBe(50); // 2 * 2500 / 100
      expect(result?.totalImpressions).toBe(10000);
    });
  });

  describe("validateStoredToken", () => {
    const userId = "user_123";

    beforeEach(() => {
      process.env.FACEBOOK_MARKETING_APP_ID = "test-id";
      process.env.FACEBOOK_MARKETING_APP_SECRET = "test-secret";
    });

    it("should return false when not configured", async () => {
      delete process.env.FACEBOOK_MARKETING_APP_ID;

      const result = await validateStoredToken(userId);
      expect(result).toBe(false);
    });

    it("should return false when no stored credentials", async () => {
      vi.mocked(prisma.marketingAccount.findFirst).mockResolvedValue(null);

      const result = await validateStoredToken(userId);
      expect(result).toBe(false);
    });

    it("should return true for valid token", async () => {
      vi.mocked(prisma.marketingAccount.findFirst).mockResolvedValue({
        id: "ma_123",
        userId: "user_123",
        platform: "FACEBOOK",
        accountId: "act_123",
        accountName: "Test Account",
        accessToken: "valid-token",
        refreshToken: null,
        expiresAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockValidateToken.mockResolvedValue(true);

      const result = await validateStoredToken(userId);
      expect(result).toBe(true);
    });

    it("should return false for invalid token", async () => {
      vi.mocked(prisma.marketingAccount.findFirst).mockResolvedValue({
        id: "ma_123",
        userId: "user_123",
        platform: "FACEBOOK",
        accountId: "act_123",
        accountName: "Test Account",
        accessToken: "invalid-token",
        refreshToken: null,
        expiresAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockValidateToken.mockResolvedValue(false);

      const result = await validateStoredToken(userId);
      expect(result).toBe(false);
    });
  });
});
