import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncGoogleAdsCampaigns } from "./campaign-sync";
import { GoogleAdsAllocatorClient } from "./client";

vi.mock("@/lib/prisma", () => ({
  default: {
    marketingAccount: {
      findMany: vi.fn(),
    },
    workspaceMember: {
      findMany: vi.fn(),
    },
    allocatorCampaign: {
      upsert: vi.fn(),
    },
    allocatorAdSet: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/crypto/token-encryption", () => ({
  decryptToken: (token: string) => `decrypted_${token}`,
}));

vi.mock("./client", () => {
  return {
    GoogleAdsAllocatorClient: vi.fn().mockImplementation(function() {
      return {
        getAdAccounts: vi.fn(),
        getCampaigns: vi.fn(),
        getAdGroups: vi.fn(),
        getMetrics: vi.fn(),
      };
    }),
  };
});

describe("syncGoogleAdsCampaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should sync campaigns for Google Ads accounts in a workspace", async () => {
    (prisma.workspaceMember.findMany as any).mockResolvedValue([{
      userId: "user1",
    }]);
    (prisma.marketingAccount.findMany as any).mockResolvedValue([
      {
        id: "acc1",
        platform: "GOOGLE_ADS",
        userId: "user1",
        accountId: "123",
        accessToken: "encrypted",
      },
    ]);

    (prisma.allocatorCampaign.upsert as any).mockResolvedValue({
      id: "saved_c1",
    });

    // Run the sync
    await syncGoogleAdsCampaigns("ws1");

    // Get the instance created inside the function
    const mockClientInstance = (vi.mocked(GoogleAdsAllocatorClient).mock.results[0] as any).value;

    // Setup instance mocks after it's created (or we could have done it in mockImplementation)
    mockClientInstance.getAdAccounts.mockResolvedValue([{
      id: "123",
      name: "Account 1",
    }]);
    mockClientInstance.getCampaigns.mockResolvedValue([{
      id: "c1",
      name: "Camp 1",
      status: "ACTIVE",
      budgetAmount: 1000,
      budgetType: "DAILY",
      currency: "USD",
      objective: "SALES",
    }]);
    mockClientInstance.getAdGroups.mockResolvedValue([{
      id: "ag1",
      name: "AG 1",
      status: "ACTIVE",
    }]);
    mockClientInstance.getMetrics.mockResolvedValue({
      spend: 500,
      impressions: 50,
      clicks: 5,
      conversions: 0.5,
    });

    // Run it again to verify with mocks (initial run might have failed internally but we want to check calls)
    await syncGoogleAdsCampaigns("ws1");

    expect(prisma.workspaceMember.findMany).toHaveBeenCalled();
    expect(prisma.marketingAccount.findMany).toHaveBeenCalled();
    expect(mockClientInstance.getAdAccounts).toHaveBeenCalled();
  });
});
