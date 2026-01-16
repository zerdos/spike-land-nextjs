import prisma from "@/lib/prisma";
import type { SocialAccount } from "@prisma/client";
import { vi } from "vitest";
import { syncFacebookCampaigns } from "./campaign-sync";
import { FacebookMarketingApiClient } from "./client";

vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
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

describe("syncFacebookCampaigns", () => {
  it("should sync campaigns for all Facebook accounts in a workspace", async () => {
    const mockSocialAccounts: SocialAccount[] = [
      {
        id: "1",
        platform: "FACEBOOK",
        accessTokenEncrypted: "token1",
        workspaceId: "ws1",
      },
    ] as any;

    (prisma.socialAccount.findMany as any).mockResolvedValue(
      mockSocialAccounts,
    );
    (prisma.allocatorCampaign.upsert as any).mockResolvedValue({
      id: "saved_camp_1",
    });

    const getAdAccountsSpy = vi
      .spyOn(FacebookMarketingApiClient.prototype, "getAdAccounts")
      .mockResolvedValue([{
        id: "ad_acc_1",
        account_id: "ad_acc_1",
        name: "Ad Account 1",
      }]);
    const getCampaignsSpy = vi
      .spyOn(FacebookMarketingApiClient.prototype, "getCampaigns")
      .mockResolvedValue([{
        id: "camp_1",
        name: "Campaign 1",
        status: "ACTIVE",
        objective: "OUTCOME_SALES",
      }]);
    const getAdSetsSpy = vi
      .spyOn(FacebookMarketingApiClient.prototype, "getAdSets")
      .mockResolvedValue([{
        id: "ad_set_1",
        name: "Ad Set 1",
        status: "ACTIVE",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      }]);
    const getInsightsSpy = vi
      .spyOn(FacebookMarketingApiClient.prototype, "getInsights")
      .mockResolvedValue({
        spend: "100.00",
        impressions: "1000",
        clicks: "10",
      });

    await syncFacebookCampaigns("ws1");

    expect(prisma.socialAccount.findMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws1",
        platform: "FACEBOOK",
      },
    });

    expect(getAdAccountsSpy).toHaveBeenCalledTimes(1);
    expect(getCampaignsSpy).toHaveBeenCalledTimes(1);
    expect(getCampaignsSpy).toHaveBeenCalledWith("ad_acc_1");
    expect(getAdSetsSpy).toHaveBeenCalledTimes(1);
    expect(getAdSetsSpy).toHaveBeenCalledWith("camp_1");
    expect(getInsightsSpy).toHaveBeenCalledTimes(2); // Once for campaign, once for ad set

    expect(prisma.allocatorCampaign.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.allocatorAdSet.upsert).toHaveBeenCalledTimes(1);

    getAdAccountsSpy.mockRestore();
    getCampaignsSpy.mockRestore();
    getAdSetsSpy.mockRestore();
    getInsightsSpy.mockRestore();
  });
});
