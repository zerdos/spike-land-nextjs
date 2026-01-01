/**
 * Marketing Types Tests
 *
 * Tests type definitions and interfaces for marketing module
 */

import { describe, expect, it } from "vitest";
import type {
  Campaign,
  CampaignMetrics,
  CampaignObjective,
  CampaignStatus,
  FacebookAdAccount,
  GoogleAdsCustomer,
  IMarketingClient,
  MarketingApiError,
  MarketingOverview,
  MarketingPlatform,
  OAuthTokenResponse,
} from "./types";

describe("Marketing Types", () => {
  describe("MarketingPlatform", () => {
    it("should accept valid platform values", () => {
      const facebook: MarketingPlatform = "FACEBOOK";
      const google: MarketingPlatform = "GOOGLE_ADS";

      expect(facebook).toBe("FACEBOOK");
      expect(google).toBe("GOOGLE_ADS");
    });
  });

  describe("CampaignStatus", () => {
    it("should accept valid status values", () => {
      const statuses: CampaignStatus[] = [
        "ACTIVE",
        "PAUSED",
        "DELETED",
        "ARCHIVED",
        "UNKNOWN",
      ];

      expect(statuses).toHaveLength(5);
      expect(statuses).toContain("ACTIVE");
      expect(statuses).toContain("PAUSED");
    });
  });

  describe("CampaignObjective", () => {
    it("should accept valid objective values", () => {
      const objectives: CampaignObjective[] = [
        "AWARENESS",
        "TRAFFIC",
        "ENGAGEMENT",
        "LEADS",
        "APP_PROMOTION",
        "SALES",
        "CONVERSIONS",
        "OTHER",
      ];

      expect(objectives).toHaveLength(8);
      expect(objectives).toContain("AWARENESS");
    });
  });

  describe("Campaign interface", () => {
    it("should create a valid campaign object", () => {
      const campaign: Campaign = {
        id: "campaign-123",
        platform: "FACEBOOK",
        accountId: "act_123",
        name: "Test Campaign",
        status: "ACTIVE",
        objective: "AWARENESS",
        budgetType: "DAILY",
        budgetAmount: 1000,
        budgetCurrency: "USD",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        createdAt: new Date(),
        updatedAt: new Date(),
        rawData: { custom: "data" },
      };

      expect(campaign.id).toBe("campaign-123");
      expect(campaign.platform).toBe("FACEBOOK");
      expect(campaign.status).toBe("ACTIVE");
      expect(campaign.budgetAmount).toBe(1000);
    });

    it("should allow null dates", () => {
      const campaign: Campaign = {
        id: "campaign-123",
        platform: "GOOGLE_ADS",
        accountId: "123-456-789",
        name: "Test Campaign",
        status: "PAUSED",
        objective: "TRAFFIC",
        budgetType: "LIFETIME",
        budgetAmount: 5000,
        budgetCurrency: "GBP",
        startDate: null,
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        rawData: {},
      };

      expect(campaign.startDate).toBeNull();
      expect(campaign.endDate).toBeNull();
    });
  });

  describe("CampaignMetrics interface", () => {
    it("should create valid metrics object", () => {
      const metrics: CampaignMetrics = {
        campaignId: "campaign-123",
        platform: "FACEBOOK",
        dateRange: {
          start: new Date("2025-01-01"),
          end: new Date("2025-01-31"),
        },
        impressions: 100000,
        clicks: 5000,
        spend: 50000,
        spendCurrency: "USD",
        conversions: 100,
        ctr: 5.0,
        cpc: 10,
        cpm: 500,
        reach: 80000,
        frequency: 1.25,
      };

      expect(metrics.impressions).toBe(100000);
      expect(metrics.ctr).toBe(5.0);
      expect(metrics.dateRange.start).toBeInstanceOf(Date);
    });
  });

  describe("MarketingOverview interface", () => {
    it("should create valid overview object", () => {
      const overview: MarketingOverview = {
        totalSpend: 100000,
        spendCurrency: "USD",
        totalImpressions: 1000000,
        totalClicks: 50000,
        totalConversions: 1000,
        averageCtr: 5.0,
        averageCpc: 2.0,
        activeCampaigns: 10,
        pausedCampaigns: 5,
        connectedAccounts: {
          facebook: 2,
          googleAds: 1,
        },
      };

      expect(overview.totalSpend).toBe(100000);
      expect(overview.connectedAccounts.facebook).toBe(2);
    });
  });

  describe("OAuthTokenResponse interface", () => {
    it("should create valid token response", () => {
      const tokenResponse: OAuthTokenResponse = {
        accessToken: "access_token_123",
        refreshToken: "refresh_token_456",
        expiresAt: new Date("2030-12-31"),
        tokenType: "Bearer",
        scope: "ads_read ads_management",
      };

      expect(tokenResponse.accessToken).toBe("access_token_123");
      expect(tokenResponse.tokenType).toBe("Bearer");
    });

    it("should allow optional fields", () => {
      const tokenResponse: OAuthTokenResponse = {
        accessToken: "access_token_123",
        tokenType: "Bearer",
      };

      expect(tokenResponse.refreshToken).toBeUndefined();
      expect(tokenResponse.expiresAt).toBeUndefined();
    });
  });

  describe("FacebookAdAccount interface", () => {
    it("should create valid ad account object", () => {
      const account: FacebookAdAccount = {
        id: "act_123456789",
        name: "Test Ad Account",
        account_status: 1,
        currency: "USD",
        timezone_name: "America/Los_Angeles",
        amount_spent: "5000.00",
      };

      expect(account.id).toBe("act_123456789");
      expect(account.account_status).toBe(1);
    });
  });

  describe("GoogleAdsCustomer interface", () => {
    it("should create valid customer object", () => {
      const customer: GoogleAdsCustomer = {
        resourceName: "customers/123456789",
        id: "123456789",
        descriptiveName: "Test Customer",
        currencyCode: "USD",
        timeZone: "America/New_York",
      };

      expect(customer.id).toBe("123456789");
      expect(customer.currencyCode).toBe("USD");
    });
  });

  describe("MarketingApiError interface", () => {
    it("should create valid error object", () => {
      const error: MarketingApiError = {
        platform: "FACEBOOK",
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests",
        details: { retryAfter: 60 },
      };

      expect(error.platform).toBe("FACEBOOK");
      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("IMarketingClient interface", () => {
    it("should define required methods", () => {
      // Type check only - verifies interface structure
      const mockClient: IMarketingClient = {
        platform: "FACEBOOK",
        getAccounts: async () => [],
        validateToken: async () => true,
        listCampaigns: async () => [],
        getCampaign: async () => null,
        getCampaignMetrics: async () => ({
          campaignId: "",
          platform: "FACEBOOK",
          dateRange: { start: new Date(), end: new Date() },
          impressions: 0,
          clicks: 0,
          spend: 0,
          spendCurrency: "USD",
          conversions: 0,
          ctr: 0,
          cpc: 0,
          cpm: 0,
          reach: 0,
          frequency: 0,
        }),
        getAuthUrl: () => "https://example.com/auth",
        exchangeCodeForTokens: async () => ({
          accessToken: "",
          tokenType: "",
        }),
        refreshAccessToken: async () => ({
          accessToken: "",
          tokenType: "",
        }),
      };

      expect(mockClient.platform).toBe("FACEBOOK");
      expect(typeof mockClient.getAccounts).toBe("function");
      expect(typeof mockClient.listCampaigns).toBe("function");
    });
  });
});
