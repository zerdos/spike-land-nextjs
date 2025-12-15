/**
 * Facebook Marketing Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FacebookMarketingClient } from "./facebook-client";

// Mock environment variables
const mockEnv = {
  FACEBOOK_MARKETING_APP_ID: "test_app_id",
  FACEBOOK_MARKETING_APP_SECRET: "test_app_secret",
};

describe("FacebookMarketingClient", () => {
  beforeEach(() => {
    // Set up environment variables
    vi.stubEnv("FACEBOOK_MARKETING_APP_ID", mockEnv.FACEBOOK_MARKETING_APP_ID);
    vi.stubEnv(
      "FACEBOOK_MARKETING_APP_SECRET",
      mockEnv.FACEBOOK_MARKETING_APP_SECRET,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create client with valid credentials", () => {
      const client = new FacebookMarketingClient();
      expect(client.platform).toBe("FACEBOOK");
    });

    it("should throw error when credentials are missing", () => {
      vi.stubEnv("FACEBOOK_MARKETING_APP_ID", "");
      vi.stubEnv("FACEBOOK_MARKETING_APP_SECRET", "");

      expect(() => new FacebookMarketingClient()).toThrow(
        "Facebook Marketing API credentials not configured",
      );
    });

    it("should accept access token in options", () => {
      const client = new FacebookMarketingClient({
        accessToken: "test_token",
      });
      expect(client.platform).toBe("FACEBOOK");
    });

    it("should trim whitespace from credentials", () => {
      vi.stubEnv("FACEBOOK_MARKETING_APP_ID", "  test_app_id\n");
      vi.stubEnv("FACEBOOK_MARKETING_APP_SECRET", "  test_secret\n");

      const client = new FacebookMarketingClient();
      expect(client.platform).toBe("FACEBOOK");
    });
  });

  describe("setAccessToken", () => {
    it("should set access token", () => {
      const client = new FacebookMarketingClient();
      client.setAccessToken("new_token");
      // Token is set internally, no public accessor to verify
      expect(client.platform).toBe("FACEBOOK");
    });
  });

  describe("getAuthUrl", () => {
    it("should generate valid auth URL", () => {
      const client = new FacebookMarketingClient();
      const url = client.getAuthUrl(
        "https://example.com/callback",
        "test_state",
      );

      expect(url).toContain("https://www.facebook.com/");
      expect(url).toContain("dialog/oauth");
      expect(url).toContain(`client_id=${mockEnv.FACEBOOK_MARKETING_APP_ID}`);
      expect(url).toContain("redirect_uri=https%3A%2F%2Fexample.com%2Fcallback");
      expect(url).toContain("state=test_state");
      expect(url).toContain("scope=ads_read%2Cads_management%2Cbusiness_management");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange code for tokens", async () => {
      const client = new FacebookMarketingClient();

      // Mock fetch
      const mockResponse = {
        access_token: "short_lived_token",
        token_type: "bearer",
      };
      const mockLongLivedResponse = {
        access_token: "long_lived_token",
        expires_in: 5184000, // 60 days
      };

      vi.stubGlobal(
        "fetch",
        vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockLongLivedResponse),
          }),
      );

      const result = await client.exchangeCodeForTokens(
        "auth_code",
        "https://example.com/callback",
      );

      expect(result.accessToken).toBe("long_lived_token");
      expect(result.tokenType).toBe("bearer");
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("should throw error on failed exchange", async () => {
      const client = new FacebookMarketingClient();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          statusText: "Bad Request",
          json: () => Promise.resolve({ error: { message: "Invalid code" } }),
        }),
      );

      await expect(
        client.exchangeCodeForTokens("invalid_code", "https://example.com/callback"),
      ).rejects.toThrow("Failed to exchange code");
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh token", async () => {
      const client = new FacebookMarketingClient();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "refreshed_token",
              expires_in: 5184000,
            }),
        }),
      );

      const result = await client.refreshAccessToken("old_token");

      expect(result.accessToken).toBe("refreshed_token");
      expect(result.tokenType).toBe("bearer");
    });
  });

  describe("validateToken", () => {
    it("should return true for valid token", async () => {
      const client = new FacebookMarketingClient();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: { is_valid: true },
            }),
        }),
      );

      const isValid = await client.validateToken("valid_token");
      expect(isValid).toBe(true);
    });

    it("should return false for invalid token", async () => {
      const client = new FacebookMarketingClient();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: { is_valid: false },
            }),
        }),
      );

      const isValid = await client.validateToken("invalid_token");
      expect(isValid).toBe(false);
    });

    it("should return false on fetch error", async () => {
      const client = new FacebookMarketingClient();

      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

      const isValid = await client.validateToken("any_token");
      expect(isValid).toBe(false);
    });
  });

  describe("getAccounts", () => {
    it("should throw error without access token", async () => {
      const client = new FacebookMarketingClient();

      await expect(client.getAccounts()).rejects.toThrow(
        "Access token not set",
      );
    });

    it("should return ad accounts", async () => {
      const client = new FacebookMarketingClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: "act_123",
                  name: "Test Account",
                  account_status: 1,
                  currency: "USD",
                  timezone_name: "America/New_York",
                },
              ],
            }),
        }),
      );

      const accounts = await client.getAccounts();

      expect(accounts).toHaveLength(1);
      expect(accounts[0].platform).toBe("FACEBOOK");
      expect(accounts[0].accountId).toBe("123");
      expect(accounts[0].accountName).toBe("Test Account");
      expect(accounts[0].isActive).toBe(true);
    });
  });

  describe("listCampaigns", () => {
    it("should list campaigns", async () => {
      const client = new FacebookMarketingClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: "campaign_123",
                  name: "Test Campaign",
                  status: "ACTIVE",
                  effective_status: "ACTIVE",
                  objective: "BRAND_AWARENESS",
                  daily_budget: "1000",
                  created_time: "2025-01-01T00:00:00+0000",
                  updated_time: "2025-01-02T00:00:00+0000",
                },
              ],
            }),
        }),
      );

      const campaigns = await client.listCampaigns("act_123");

      expect(campaigns).toHaveLength(1);
      expect(campaigns[0].id).toBe("campaign_123");
      expect(campaigns[0].name).toBe("Test Campaign");
      expect(campaigns[0].status).toBe("ACTIVE");
      expect(campaigns[0].objective).toBe("AWARENESS");
      expect(campaigns[0].budgetType).toBe("DAILY");
      expect(campaigns[0].budgetAmount).toBe(1000);
    });

    it("should handle account ID with act_ prefix", async () => {
      const client = new FacebookMarketingClient({ accessToken: "test_token" });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await client.listCampaigns("act_123");

      expect(mockFetch).toHaveBeenCalled();
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("/act_123/campaigns");
    });

    it("should add act_ prefix if missing", async () => {
      const client = new FacebookMarketingClient({ accessToken: "test_token" });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await client.listCampaigns("123");

      expect(mockFetch).toHaveBeenCalled();
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("/act_123/campaigns");
    });
  });

  describe("getCampaign", () => {
    it("should get single campaign", async () => {
      const client = new FacebookMarketingClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "campaign_123",
              name: "Test Campaign",
              status: "PAUSED",
              effective_status: "PAUSED",
              objective: "LINK_CLICKS",
              lifetime_budget: "5000",
              start_time: "2025-01-01T00:00:00+0000",
              stop_time: "2025-12-31T00:00:00+0000",
              created_time: "2025-01-01T00:00:00+0000",
              updated_time: "2025-01-02T00:00:00+0000",
            }),
        }),
      );

      const campaign = await client.getCampaign("act_123", "campaign_123");

      expect(campaign).not.toBeNull();
      expect(campaign?.id).toBe("campaign_123");
      expect(campaign?.status).toBe("PAUSED");
      expect(campaign?.objective).toBe("TRAFFIC");
      expect(campaign?.budgetType).toBe("LIFETIME");
    });

    it("should return null on error", async () => {
      const client = new FacebookMarketingClient({ accessToken: "test_token" });

      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Not found")));

      const campaign = await client.getCampaign("act_123", "invalid");
      expect(campaign).toBeNull();
    });
  });

  describe("getCampaignMetrics", () => {
    it("should get campaign metrics", async () => {
      const client = new FacebookMarketingClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  impressions: "100000",
                  clicks: "5000",
                  spend: "500.00",
                  conversions: "100",
                  reach: "80000",
                  frequency: "1.25",
                  ctr: "5.0",
                  cpc: "0.10",
                  cpm: "5.00",
                },
              ],
            }),
        }),
      );

      const metrics = await client.getCampaignMetrics(
        "act_123",
        "campaign_123",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
      );

      expect(metrics.campaignId).toBe("campaign_123");
      expect(metrics.platform).toBe("FACEBOOK");
      expect(metrics.impressions).toBe(100000);
      expect(metrics.clicks).toBe(5000);
      expect(metrics.spend).toBe(50000); // Converted to cents
      expect(metrics.conversions).toBe(100);
      expect(metrics.ctr).toBe(5.0);
      expect(metrics.reach).toBe(80000);
      expect(metrics.frequency).toBe(1.25);
    });

    it("should handle empty metrics", async () => {
      const client = new FacebookMarketingClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        }),
      );

      const metrics = await client.getCampaignMetrics(
        "act_123",
        "campaign_123",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
      );

      expect(metrics.impressions).toBe(0);
      expect(metrics.clicks).toBe(0);
      expect(metrics.spend).toBe(0);
    });
  });

  describe("API error handling", () => {
    it("should throw error on API failure", async () => {
      const client = new FacebookMarketingClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          statusText: "Forbidden",
          json: () =>
            Promise.resolve({
              error: { message: "Permission denied" },
            }),
        }),
      );

      await expect(client.getAccounts()).rejects.toThrow(
        "Facebook API Error: Permission denied",
      );
    });
  });
});
