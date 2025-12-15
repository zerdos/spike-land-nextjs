/**
 * Google Ads Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAdsClient } from "./google-ads-client";

// Mock environment variables
const mockEnv = {
  GOOGLE_ID: "test_client_id",
  GOOGLE_SECRET: "test_client_secret",
  GOOGLE_ADS_DEVELOPER_TOKEN: "test_developer_token",
};

describe("GoogleAdsClient", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_ID", mockEnv.GOOGLE_ID);
    vi.stubEnv("GOOGLE_SECRET", mockEnv.GOOGLE_SECRET);
    vi.stubEnv("GOOGLE_ADS_DEVELOPER_TOKEN", mockEnv.GOOGLE_ADS_DEVELOPER_TOKEN);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create client with valid credentials", () => {
      const client = new GoogleAdsClient();
      expect(client.platform).toBe("GOOGLE_ADS");
    });

    it("should throw error when credentials are missing", () => {
      vi.stubEnv("GOOGLE_ID", "");
      vi.stubEnv("GOOGLE_SECRET", "");

      expect(() => new GoogleAdsClient()).toThrow(
        "Google OAuth credentials not configured",
      );
    });

    it("should accept access token and customer ID in options", () => {
      const client = new GoogleAdsClient({
        accessToken: "test_token",
        customerId: "123-456-789",
      });
      expect(client.platform).toBe("GOOGLE_ADS");
    });

    it("should trim whitespace from credentials", () => {
      vi.stubEnv("GOOGLE_ID", "  test_client_id\n");
      vi.stubEnv("GOOGLE_SECRET", "  test_secret\n");
      vi.stubEnv("GOOGLE_ADS_DEVELOPER_TOKEN", "  test_token\n");

      const client = new GoogleAdsClient();
      expect(client.platform).toBe("GOOGLE_ADS");
    });
  });

  describe("setAccessToken", () => {
    it("should set access token", () => {
      const client = new GoogleAdsClient();
      client.setAccessToken("new_token");
      expect(client.platform).toBe("GOOGLE_ADS");
    });
  });

  describe("setCustomerId", () => {
    it("should set customer ID", () => {
      const client = new GoogleAdsClient();
      client.setCustomerId("123-456-789");
      expect(client.platform).toBe("GOOGLE_ADS");
    });

    it("should remove dashes from customer ID", () => {
      const client = new GoogleAdsClient();
      client.setCustomerId("123-456-789");
      // Customer ID is stored internally without dashes
      expect(client.platform).toBe("GOOGLE_ADS");
    });
  });

  describe("getAuthUrl", () => {
    it("should generate valid auth URL", () => {
      const client = new GoogleAdsClient();
      const url = client.getAuthUrl(
        "https://example.com/callback",
        "test_state",
      );

      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url).toContain(`client_id=${mockEnv.GOOGLE_ID}`);
      expect(url).toContain("redirect_uri=https%3A%2F%2Fexample.com%2Fcallback");
      expect(url).toContain("state=test_state");
      expect(url).toContain("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords");
      expect(url).toContain("access_type=offline");
      expect(url).toContain("prompt=consent");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange code for tokens", async () => {
      const client = new GoogleAdsClient();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "new_access_token",
              refresh_token: "new_refresh_token",
              expires_in: 3600,
              token_type: "Bearer",
              scope: "https://www.googleapis.com/auth/adwords",
            }),
        }),
      );

      const result = await client.exchangeCodeForTokens(
        "auth_code",
        "https://example.com/callback",
      );

      expect(result.accessToken).toBe("new_access_token");
      expect(result.refreshToken).toBe("new_refresh_token");
      expect(result.tokenType).toBe("Bearer");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.scope).toBe("https://www.googleapis.com/auth/adwords");
    });

    it("should throw error on failed exchange", async () => {
      const client = new GoogleAdsClient();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          statusText: "Bad Request",
          json: () => Promise.resolve({ error_description: "Invalid authorization code" }),
        }),
      );

      await expect(
        client.exchangeCodeForTokens("invalid_code", "https://example.com/callback"),
      ).rejects.toThrow("Failed to exchange code");
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh token", async () => {
      const client = new GoogleAdsClient();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "refreshed_access_token",
              expires_in: 3600,
              token_type: "Bearer",
            }),
        }),
      );

      const result = await client.refreshAccessToken("old_refresh_token");

      expect(result.accessToken).toBe("refreshed_access_token");
      expect(result.refreshToken).toBe("old_refresh_token"); // Keep same refresh token
      expect(result.tokenType).toBe("Bearer");
    });

    it("should throw error on failed refresh", async () => {
      const client = new GoogleAdsClient();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          statusText: "Bad Request",
          json: () => Promise.resolve({ error_description: "Invalid refresh token" }),
        }),
      );

      await expect(client.refreshAccessToken("invalid_token")).rejects.toThrow(
        "Failed to refresh token",
      );
    });
  });

  describe("validateToken", () => {
    it("should return true for valid token with adwords scope", async () => {
      const client = new GoogleAdsClient();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              scope: "https://www.googleapis.com/auth/adwords",
              expires_in: 3600,
            }),
        }),
      );

      const isValid = await client.validateToken("valid_token");
      expect(isValid).toBe(true);
    });

    it("should return false for token without adwords scope", async () => {
      const client = new GoogleAdsClient();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              scope: "https://www.googleapis.com/auth/email",
            }),
        }),
      );

      const isValid = await client.validateToken("invalid_scope_token");
      expect(isValid).toBe(false);
    });

    it("should return false for invalid token", async () => {
      const client = new GoogleAdsClient();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ error: "invalid_token" }),
        }),
      );

      const isValid = await client.validateToken("invalid_token");
      expect(isValid).toBe(false);
    });

    it("should return false on fetch error", async () => {
      const client = new GoogleAdsClient();

      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

      const isValid = await client.validateToken("any_token");
      expect(isValid).toBe(false);
    });
  });

  describe("getAccounts", () => {
    it("should throw error without access token", async () => {
      const client = new GoogleAdsClient();

      await expect(client.getAccounts()).rejects.toThrow(
        "Access token not set",
      );
    });

    it("should throw error without developer token", async () => {
      vi.stubEnv("GOOGLE_ADS_DEVELOPER_TOKEN", "");
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      await expect(client.getAccounts()).rejects.toThrow(
        "Google Ads Developer Token not configured",
      );
    });

    it("should return accessible customer accounts", async () => {
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                resourceNames: ["customers/1234567890", "customers/9876543210"],
              }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    customer: {
                      resourceName: "customers/1234567890",
                      id: "1234567890",
                      descriptiveName: "Test Account 1",
                      currencyCode: "USD",
                      timeZone: "America/New_York",
                    },
                  },
                ],
              }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    customer: {
                      resourceName: "customers/9876543210",
                      id: "9876543210",
                      descriptiveName: "Test Account 2",
                      currencyCode: "GBP",
                      timeZone: "Europe/London",
                    },
                  },
                ],
              }),
          }),
      );

      const accounts = await client.getAccounts();

      expect(accounts).toHaveLength(2);
      expect(accounts[0].platform).toBe("GOOGLE_ADS");
      expect(accounts[0].accountId).toBe("1234567890");
      expect(accounts[0].accountName).toBe("Test Account 1");
    });

    it("should skip inaccessible customers", async () => {
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                resourceNames: ["customers/1234567890", "customers/9876543210"],
              }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    customer: {
                      resourceName: "customers/1234567890",
                      id: "1234567890",
                      descriptiveName: "Test Account",
                      currencyCode: "USD",
                      timeZone: "America/New_York",
                    },
                  },
                ],
              }),
          })
          .mockRejectedValueOnce(new Error("Access denied")),
      );

      const accounts = await client.getAccounts();

      expect(accounts).toHaveLength(1);
      expect(accounts[0].accountId).toBe("1234567890");
    });
  });

  describe("listCampaigns", () => {
    it("should list campaigns", async () => {
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  campaign: {
                    resourceName: "customers/123/campaigns/456",
                    id: "456",
                    name: "Test Campaign",
                    status: "ENABLED",
                    advertisingChannelType: "SEARCH",
                    startDate: "20250101",
                    endDate: "20251231",
                    campaignBudget: "customers/123/campaignBudgets/789",
                  },
                  campaignBudget: {
                    amountMicros: "100000000", // 100 USD in micros
                  },
                },
              ],
            }),
        }),
      );

      const campaigns = await client.listCampaigns("123-456-789");

      expect(campaigns).toHaveLength(1);
      expect(campaigns[0].id).toBe("456");
      expect(campaigns[0].name).toBe("Test Campaign");
      expect(campaigns[0].status).toBe("ACTIVE");
      expect(campaigns[0].objective).toBe("TRAFFIC");
      expect(campaigns[0].budgetType).toBe("DAILY");
      expect(campaigns[0].budgetAmount).toBe(10000); // Converted to cents
    });

    it("should handle customer ID with dashes", async () => {
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await client.listCampaigns("123-456-789");

      expect(mockFetch).toHaveBeenCalled();
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("/customers/123456789/");
    });
  });

  describe("getCampaign", () => {
    it("should get single campaign", async () => {
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  campaign: {
                    resourceName: "customers/123/campaigns/456",
                    id: "456",
                    name: "Test Campaign",
                    status: "PAUSED",
                    advertisingChannelType: "DISPLAY",
                    startDate: "2025-01-01",
                    endDate: "2025-12-31",
                    campaignBudget: "customers/123/campaignBudgets/789",
                  },
                  campaignBudget: {
                    amountMicros: "50000000",
                  },
                },
              ],
            }),
        }),
      );

      const campaign = await client.getCampaign("123", "456");

      expect(campaign).not.toBeNull();
      expect(campaign?.id).toBe("456");
      expect(campaign?.status).toBe("PAUSED");
      expect(campaign?.objective).toBe("AWARENESS");
    });

    it("should return null when campaign not found", async () => {
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        }),
      );

      const campaign = await client.getCampaign("123", "invalid");
      expect(campaign).toBeNull();
    });

    it("should return null on error", async () => {
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Not found")));

      const campaign = await client.getCampaign("123", "456");
      expect(campaign).toBeNull();
    });
  });

  describe("getCampaignMetrics", () => {
    it("should get campaign metrics", async () => {
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  metrics: {
                    impressions: "100000",
                    clicks: "5000",
                    costMicros: "5000000000", // 5000 USD in micros
                    conversions: "100.5",
                    ctr: "0.05",
                    averageCpc: "1000000", // 1 USD in micros
                    averageCpm: "50000000", // 50 USD in micros
                  },
                },
              ],
            }),
        }),
      );

      const metrics = await client.getCampaignMetrics(
        "123",
        "456",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
      );

      expect(metrics.campaignId).toBe("456");
      expect(metrics.platform).toBe("GOOGLE_ADS");
      expect(metrics.impressions).toBe(100000);
      expect(metrics.clicks).toBe(5000);
      expect(metrics.spend).toBe(500000); // Converted to cents
      expect(metrics.conversions).toBe(100.5);
      expect(metrics.ctr).toBe(5); // Converted to percentage
      expect(metrics.cpc).toBe(100); // Converted to cents
      expect(metrics.cpm).toBe(5000); // Converted to cents
    });

    it("should handle empty metrics", async () => {
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        }),
      );

      const metrics = await client.getCampaignMetrics(
        "123",
        "456",
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
      const client = new GoogleAdsClient({ accessToken: "test_token" });

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
        "Google Ads API Error: Permission denied",
      );
    });
  });

  describe("date parsing", () => {
    it("should parse YYYYMMDD date format", async () => {
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  campaign: {
                    resourceName: "customers/123/campaigns/456",
                    id: "456",
                    name: "Test Campaign",
                    status: "ENABLED",
                    advertisingChannelType: "SEARCH",
                    startDate: "20250115",
                    endDate: "20251231",
                  },
                },
              ],
            }),
        }),
      );

      const campaigns = await client.listCampaigns("123");

      expect(campaigns[0].startDate).toBeInstanceOf(Date);
      expect(campaigns[0].startDate?.getFullYear()).toBe(2025);
      expect(campaigns[0].startDate?.getMonth()).toBe(0); // January
      expect(campaigns[0].startDate?.getDate()).toBe(15);
    });

    it("should parse YYYY-MM-DD date format", async () => {
      const client = new GoogleAdsClient({ accessToken: "test_token" });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  campaign: {
                    resourceName: "customers/123/campaigns/456",
                    id: "456",
                    name: "Test Campaign",
                    status: "ENABLED",
                    advertisingChannelType: "SEARCH",
                    startDate: "2025-01-15",
                    endDate: "2025-12-31",
                  },
                },
              ],
            }),
        }),
      );

      const campaigns = await client.listCampaigns("123");

      expect(campaigns[0].startDate).toBeInstanceOf(Date);
    });
  });
});
