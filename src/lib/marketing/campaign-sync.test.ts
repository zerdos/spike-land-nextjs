/**
 * Campaign Sync Service Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock functions - declared first at module scope
const mockMarketingAccountFindMany = vi.fn();
const mockMarketingAccountUpdate = vi.fn();
const mockCampaignLinkFindMany = vi.fn();
const mockCampaignMetricsCacheFindUnique = vi.fn();
const mockCampaignMetricsCacheUpsert = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    marketingAccount: {
      findMany: mockMarketingAccountFindMany,
      update: mockMarketingAccountUpdate,
    },
    campaignLink: {
      findMany: mockCampaignLinkFindMany,
    },
    campaignMetricsCache: {
      findUnique: mockCampaignMetricsCacheFindUnique,
      upsert: mockCampaignMetricsCacheUpsert,
    },
  },
}));

// Mock metrics cache
vi.mock("@/lib/tracking/metrics-cache", () => ({
  setCachedMetrics: vi.fn().mockResolvedValue(undefined),
}));

// Mock marketing client factory
const mockFacebookClient = {
  platform: "FACEBOOK" as const,
  listCampaigns: vi.fn(),
  getCampaignMetrics: vi.fn(),
  refreshAccessToken: vi.fn(),
};
const mockGoogleAdsClient = {
  platform: "GOOGLE_ADS" as const,
  listCampaigns: vi.fn(),
  getCampaignMetrics: vi.fn(),
  refreshAccessToken: vi.fn(),
};

vi.mock("./index", () => ({
  createMarketingClient: vi.fn().mockImplementation((platform: string) => {
    if (platform === "FACEBOOK") return mockFacebookClient;
    if (platform === "GOOGLE_ADS") return mockGoogleAdsClient;
    throw new Error(`Unsupported platform: ${platform}`);
  }),
}));

const { getExternalSpendForCampaign, syncExternalCampaigns } = await import("./campaign-sync");

describe("Campaign Sync Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFacebookClient.listCampaigns.mockReset();
    mockFacebookClient.getCampaignMetrics.mockReset();
    mockFacebookClient.refreshAccessToken.mockReset();
    mockGoogleAdsClient.listCampaigns.mockReset();
    mockGoogleAdsClient.getCampaignMetrics.mockReset();
    mockGoogleAdsClient.refreshAccessToken.mockReset();
  });

  describe("syncExternalCampaigns", () => {
    it("should return early if no accounts found", async () => {
      mockMarketingAccountFindMany.mockResolvedValueOnce([]);

      const result = await syncExternalCampaigns();

      expect(result.synced).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should sync linked campaigns successfully", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          userId: "user-1",
          platform: "FACEBOOK",
          accountId: "fb-123",
          accessToken: "token-123",
          refreshToken: null,
          expiresAt: new Date(Date.now() + 86400000), // Tomorrow
        },
      ];
      mockMarketingAccountFindMany.mockResolvedValueOnce(mockAccounts);

      const mockLinks = [
        {
          id: "link-1",
          utmCampaign: "summer-sale",
          platform: "FACEBOOK",
          externalCampaignId: "camp-1",
          externalCampaignName: "Summer Sale FB",
        },
      ];
      mockCampaignLinkFindMany.mockResolvedValueOnce(mockLinks);

      mockFacebookClient.listCampaigns.mockResolvedValueOnce([
        {
          id: "camp-1",
          name: "Summer Sale FB",
          platform: "FACEBOOK",
          accountId: "fb-123",
          status: "ACTIVE",
          objective: "CONVERSIONS",
          budgetType: "DAILY",
          budgetAmount: 5000,
          budgetCurrency: "USD",
          startDate: null,
          endDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          rawData: {},
        },
      ]);

      mockFacebookClient.getCampaignMetrics.mockResolvedValueOnce({
        campaignId: "camp-1",
        platform: "FACEBOOK",
        dateRange: { start: new Date(), end: new Date() },
        impressions: 10000,
        clicks: 500,
        spend: 25000, // $250 in cents
        spendCurrency: "USD",
        conversions: 50,
        ctr: 5,
        cpc: 50,
        cpm: 2500,
        reach: 8000,
        frequency: 1.25,
      });

      const result = await syncExternalCampaigns();

      expect(result.synced).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockFacebookClient.getCampaignMetrics).toHaveBeenCalled();
    });

    it("should handle expired tokens with refresh", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          userId: "user-1",
          platform: "GOOGLE_ADS",
          accountId: "google-123",
          accessToken: "expired-token",
          refreshToken: "refresh-token",
          expiresAt: new Date(Date.now() - 86400000), // Yesterday (expired)
        },
      ];
      mockMarketingAccountFindMany.mockResolvedValueOnce(mockAccounts);
      mockCampaignLinkFindMany.mockResolvedValueOnce([]);

      mockGoogleAdsClient.refreshAccessToken.mockResolvedValueOnce({
        accessToken: "new-token",
        refreshToken: "new-refresh-token",
        expiresAt: new Date(Date.now() + 86400000),
        tokenType: "Bearer",
      });

      mockMarketingAccountUpdate.mockResolvedValueOnce({});
      mockGoogleAdsClient.listCampaigns.mockResolvedValueOnce([]);

      const result = await syncExternalCampaigns();

      expect(mockGoogleAdsClient.refreshAccessToken).toHaveBeenCalledWith("refresh-token");
      expect(mockMarketingAccountUpdate).toHaveBeenCalled();
      expect(result.errors).toHaveLength(0);
    });

    it("should report error for expired token without refresh token", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          userId: "user-1",
          platform: "FACEBOOK",
          accountId: "fb-123",
          accessToken: "expired-token",
          refreshToken: null,
          expiresAt: new Date(Date.now() - 86400000), // Expired
        },
      ];
      mockMarketingAccountFindMany.mockResolvedValueOnce(mockAccounts);
      mockCampaignLinkFindMany.mockResolvedValueOnce([]);

      const result = await syncExternalCampaigns();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Token expired and no refresh token");
    });

    it("should skip unlinked campaigns", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          userId: "user-1",
          platform: "FACEBOOK",
          accountId: "fb-123",
          accessToken: "token-123",
          refreshToken: null,
          expiresAt: new Date(Date.now() + 86400000),
        },
      ];
      mockMarketingAccountFindMany.mockResolvedValueOnce(mockAccounts);
      mockCampaignLinkFindMany.mockResolvedValueOnce([]); // No links

      mockFacebookClient.listCampaigns.mockResolvedValueOnce([
        {
          id: "camp-1",
          name: "Unlinked Campaign",
          platform: "FACEBOOK",
          accountId: "fb-123",
          status: "ACTIVE",
          objective: "CONVERSIONS",
          budgetType: "DAILY",
          budgetAmount: 5000,
          budgetCurrency: "USD",
          startDate: null,
          endDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          rawData: {},
        },
      ]);

      const result = await syncExternalCampaigns();

      expect(result.synced).toBe(0);
      expect(mockFacebookClient.getCampaignMetrics).not.toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          userId: "user-1",
          platform: "FACEBOOK",
          accountId: "fb-123",
          accessToken: "token-123",
          refreshToken: null,
          expiresAt: new Date(Date.now() + 86400000),
        },
      ];
      mockMarketingAccountFindMany.mockResolvedValueOnce(mockAccounts);
      mockCampaignLinkFindMany.mockResolvedValueOnce([]);

      mockFacebookClient.listCampaigns.mockRejectedValueOnce(
        new Error("API rate limit exceeded"),
      );

      const result = await syncExternalCampaigns();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("API rate limit exceeded");
    });

    it("should handle metrics fetch errors for individual campaigns", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          userId: "user-1",
          platform: "FACEBOOK",
          accountId: "fb-123",
          accessToken: "token-123",
          refreshToken: null,
          expiresAt: new Date(Date.now() + 86400000),
        },
      ];
      mockMarketingAccountFindMany.mockResolvedValueOnce(mockAccounts);

      const mockLinks = [
        {
          id: "link-1",
          utmCampaign: "summer-sale",
          platform: "FACEBOOK",
          externalCampaignId: "camp-1",
          externalCampaignName: "Summer Sale FB",
        },
      ];
      mockCampaignLinkFindMany.mockResolvedValueOnce(mockLinks);

      mockFacebookClient.listCampaigns.mockResolvedValueOnce([
        {
          id: "camp-1",
          name: "Summer Sale FB",
          platform: "FACEBOOK",
          accountId: "fb-123",
          status: "ACTIVE",
          objective: "CONVERSIONS",
          budgetType: "DAILY",
          budgetAmount: 5000,
          budgetCurrency: "USD",
          startDate: null,
          endDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          rawData: {},
        },
      ]);

      mockFacebookClient.getCampaignMetrics.mockRejectedValueOnce(
        new Error("Insights not available"),
      );

      const result = await syncExternalCampaigns();

      expect(result.synced).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Insights not available");
    });
  });

  describe("getExternalSpendForCampaign", () => {
    it("should return null if no cached data", async () => {
      mockCampaignMetricsCacheFindUnique.mockResolvedValueOnce(null);

      const result = await getExternalSpendForCampaign(
        "summer-sale",
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      expect(result).toBeNull();
    });

    it("should return null if cache expired", async () => {
      mockCampaignMetricsCacheFindUnique.mockResolvedValueOnce({
        cacheKey: "external_spend:summer-sale:2024-01-01:2024-01-31",
        metrics: { totalSpend: 25000 },
        expiresAt: new Date(Date.now() - 1000), // Expired
        computedAt: new Date(Date.now() - 3600000),
      });

      const result = await getExternalSpendForCampaign(
        "summer-sale",
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      expect(result).toBeNull();
    });

    it("should return cached metrics if valid", async () => {
      mockCampaignMetricsCacheFindUnique.mockResolvedValueOnce({
        cacheKey: "external_spend:summer-sale:2024-01-01:2024-01-31",
        metrics: {
          totalSpend: 25000,
          totalImpressions: 10000,
          totalClicks: 500,
          totalConversions: 50,
          currency: "USD",
          platforms: ["FACEBOOK"],
        },
        expiresAt: new Date(Date.now() + 3600000), // Valid
        computedAt: new Date(),
      });

      const result = await getExternalSpendForCampaign(
        "summer-sale",
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      expect(result).not.toBeNull();
      expect(result?.spend).toBe(25000);
      expect(result?.impressions).toBe(10000);
      expect(result?.clicks).toBe(500);
      expect(result?.conversions).toBe(50);
    });
  });
});
