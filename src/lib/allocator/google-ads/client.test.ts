import { GoogleAdsClient } from "@/lib/marketing/google-ads-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAdsAllocatorClient } from "./client";

vi.mock("@/lib/marketing/google-ads-client", () => {
  return {
    GoogleAdsClient: vi.fn().mockImplementation(function() {
      const queryMock = vi.fn();
      return {
        getAccounts: vi.fn(),
        setCustomerId: vi.fn(),
        query: queryMock,
        // executeQuery is exposed by ExtendedGoogleAdsClient which extends GoogleAdsClient
        // The mock needs to support the class extension pattern
        executeQuery: queryMock,
        listCampaigns: vi.fn(),
        platform: "GOOGLE_ADS",
      };
    }),
  };
});

describe("GoogleAdsAllocatorClient", () => {
  let client: GoogleAdsAllocatorClient;
  let mockMarketingClient: {
    getAccounts: ReturnType<typeof vi.fn>;
    setCustomerId: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
    executeQuery: ReturnType<typeof vi.fn>;
    listCampaigns: ReturnType<typeof vi.fn>;
    platform: string;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GoogleAdsAllocatorClient("fake_token", "fake_id");
    const mockResult = vi.mocked(GoogleAdsClient).mock.results[0];
    mockMarketingClient = mockResult?.value as typeof mockMarketingClient;
    vi.stubEnv("GOOGLE_ADS_DEVELOPER_TOKEN", "test-token");
  });

  it("should get ad accounts and sub-accounts", async () => {
    mockMarketingClient.getAccounts.mockResolvedValue([
      { accountId: "manager_1", accountName: "Manager 1" },
    ]);

    mockMarketingClient.executeQuery.mockResolvedValueOnce([
      { customer: { currencyCode: "USD", manager: true } },
    ]);

    mockMarketingClient.executeQuery.mockResolvedValueOnce([
      {
        customerClient: {
          clientCustomer: "customers/sub_1",
          descriptiveName: "Sub 1",
          currencyCode: "USD",
          manager: false,
        },
      },
    ]);

    const accounts = await client.getAdAccounts();

    expect(accounts).toHaveLength(2);
    expect((accounts[0] as any).id).toBe("manager_1");
    expect((accounts[1] as any).id).toBe("sub_1");
  });

  it("should get campaigns", async () => {
    mockMarketingClient.listCampaigns.mockResolvedValue([
      {
        id: "c1",
        name: "Camp 1",
        status: "ACTIVE",
        objective: "SALES",
        budgetAmount: 1000,
        budgetCurrency: "USD",
        budgetType: "DAILY",
      },
    ]);

    const campaigns = await client.getCampaigns("sub_1");

    expect(campaigns).toHaveLength(1);
    expect((campaigns[0] as any).id).toBe("c1");
  });

  it("should get metrics", async () => {
    mockMarketingClient.executeQuery.mockResolvedValue([
      {
        metrics: {
          costMicros: "1000000",
          impressions: "100",
          clicks: "10",
          conversions: "1",
        },
      },
    ]);

    const metrics = await client.getMetrics(
      "sub_1",
      "c1",
      "CAMPAIGN",
      new Date(),
      new Date(),
    );

    expect(metrics.spend).toBe(100);
    expect(metrics.impressions).toBe(100);
  });

  describe("updateCampaignBudget", () => {
    beforeEach(() => {
      // Mock global fetch
      global.fetch = vi.fn();
    });

    it("should successfully update campaign budget", async () => {
      const customerId = "1234567890";
      const campaignId = "9876543210";
      const newBudgetMicros = 5000000; // $50 in micros

      // Mock the query to return budget resource name
      mockMarketingClient.executeQuery.mockResolvedValueOnce([
        {
          campaign: {
            campaignBudget: "customers/1234567890/campaignBudgets/111222333",
          },
        },
      ]);

      // Mock successful fetch response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ resourceName: "customers/1234567890/campaignBudgets/111222333" }],
        }),
      });

      await expect(
        client.updateCampaignBudget(customerId, campaignId, newBudgetMicros),
      ).resolves.toBeUndefined();

      // Verify the mutation request
      expect(global.fetch).toHaveBeenCalledWith(
        `https://googleads.googleapis.com/v18/customers/${customerId}/campaignBudgets:mutate`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: expect.stringContaining("Bearer"),
          }),
        }),
      );
    });

    it("should handle rate limit errors", async () => {
      const customerId = "1234567890";
      const campaignId = "9876543210";

      mockMarketingClient.executeQuery.mockResolvedValueOnce([
        {
          campaign: {
            campaignBudget: "customers/1234567890/campaignBudgets/111222333",
          },
        },
      ]);

      // Mock rate limit response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: async () => ({
          error: { message: "Rate limit exceeded" },
        }),
      });

      await expect(
        client.updateCampaignBudget(customerId, campaignId, 1000000),
      ).rejects.toThrow(/rate limit exceeded/i);
    });

    it("should handle permission errors", async () => {
      const customerId = "1234567890";
      const campaignId = "9876543210";

      mockMarketingClient.executeQuery.mockResolvedValueOnce([
        {
          campaign: {
            campaignBudget: "customers/1234567890/campaignBudgets/111222333",
          },
        },
      ]);

      // Mock permission denied response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({
          error: { message: "Insufficient permissions" },
        }),
      });

      await expect(
        client.updateCampaignBudget(customerId, campaignId, 1000000),
      ).rejects.toThrow(/permission denied/i);
    });

    it("should handle campaign not found", async () => {
      const customerId = "1234567890";
      const campaignId = "9876543210";

      mockMarketingClient.executeQuery.mockResolvedValueOnce([]);

      await expect(
        client.updateCampaignBudget(customerId, campaignId, 1000000),
      ).rejects.toThrow(/campaign.*not found/i);
    });

    it("should normalize customer ID (remove dashes)", async () => {
      const customerIdWithDashes = "123-456-7890";
      const normalizedId = "1234567890";
      const campaignId = "9876543210";

      mockMarketingClient.executeQuery.mockResolvedValueOnce([
        {
          campaign: {
            campaignBudget: `customers/${normalizedId}/campaignBudgets/111222333`,
          },
        },
      ]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await client.updateCampaignBudget(customerIdWithDashes, campaignId, 1000000);

      // Verify fetch was called with normalized ID
      expect(global.fetch).toHaveBeenCalledWith(
        `https://googleads.googleapis.com/v18/customers/${normalizedId}/campaignBudgets:mutate`,
        expect.any(Object),
      );
    });
  });
});
