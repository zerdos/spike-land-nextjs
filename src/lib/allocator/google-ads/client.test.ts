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
      { metrics: { costMicros: "1000000", impressions: "100", clicks: "10", conversions: "1" } },
    ]);

    const metrics = await client.getMetrics("sub_1", "c1", "CAMPAIGN", new Date(), new Date());

    expect(metrics.spend).toBe(100);
    expect(metrics.impressions).toBe(100);
  });
});
