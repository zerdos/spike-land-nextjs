
import { decryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import type { SocialAccount } from "@prisma/client";
import { FacebookMarketingApiClient } from "./client";

export async function syncFacebookCampaigns(workspaceId: string) {
  const socialAccounts = await prisma.socialAccount.findMany({
    where: {
      workspaceId,
      platform: "FACEBOOK",
    },
  });

  for (const account of socialAccounts) {
    await syncCampaignsForAccount(account);
  }
}

async function syncCampaignsForAccount(account: SocialAccount) {
  const accessToken = decryptToken(account.accessTokenEncrypted);
  const client = new FacebookMarketingApiClient(accessToken);

  try {
    const adAccounts = await client.getAdAccounts();

    for (const adAccount of adAccounts) {
      try {
        const campaigns = await client.getCampaigns(adAccount.account_id);
        console.log(
          `Found ${campaigns.length} campaigns for ad account ${adAccount.name}`,
        );

        for (const campaign of campaigns) {
          try {
            const budget = campaign.daily_budget || campaign.lifetime_budget;
            const insights = await client.getInsights(campaign.id);

            const savedCampaign = await prisma.allocatorCampaign.upsert({
              where: {
                workspaceId_platform_platformCampaignId: {
                  workspaceId: account.workspaceId,
                  platform: "FACEBOOK_ADS",
                  platformCampaignId: campaign.id,
                },
              },
              update: {
                name: campaign.name,
                status: campaign.status,
                budget: budget ? parseFloat(budget) / 100 : undefined,
                spend: insights ? parseFloat(insights.spend) : undefined,
                metrics: {
                  objective: campaign.objective,
                  budget_remaining: campaign.budget_remaining
                    ? parseFloat(campaign.budget_remaining) / 100
                    : undefined,
                  impressions: insights?.impressions,
                  clicks: insights?.clicks,
                },
                lastSyncAt: new Date(),
              },
              create: {
                workspaceId: account.workspaceId,
                platform: "FACEBOOK_ADS",
                platformCampaignId: campaign.id,
                name: campaign.name,
                status: campaign.status,
                budget: budget ? parseFloat(budget) / 100 : undefined,
                spend: insights ? parseFloat(insights.spend) : undefined,
                metrics: {
                  objective: campaign.objective,
                  budget_remaining: campaign.budget_remaining
                    ? parseFloat(campaign.budget_remaining) / 100
                    : undefined,
                  impressions: insights?.impressions,
                  clicks: insights?.clicks,
                },
                lastSyncAt: new Date(),
              },
            });

            const adSets = await client.getAdSets(campaign.id);
            for (const adSet of adSets) {
              try {
                const adSetBudget = adSet.daily_budget || adSet.lifetime_budget;
                const adSetInsights = await client.getInsights(adSet.id);

                await prisma.allocatorAdSet.upsert({
                  where: {
                    campaignId_platformAdSetId: {
                      campaignId: savedCampaign.id,
                      platformAdSetId: adSet.id,
                    },
                  },
                  update: {
                    name: adSet.name,
                    status: adSet.status,
                    budget: adSetBudget
                      ? parseFloat(adSetBudget) / 100
                      : undefined,
                    spend: adSetInsights
                      ? parseFloat(adSetInsights.spend)
                      : undefined,
                  },
                  create: {
                    campaignId: savedCampaign.id,
                    platformAdSetId: adSet.id,
                    name: adSet.name,
                    status: adSet.status,
                    budget: adSetBudget
                      ? parseFloat(adSetBudget) / 100
                      : undefined,
                    spend: adSetInsights
                      ? parseFloat(adSetInsights.spend)
                      : undefined,
                  },
                });
              } catch (error) {
                console.error(
                  `Failed to sync ad set ${adSet.id} for campaign ${campaign.id}:`,
                  error,
                );
              }
            }
          } catch (error) {
            console.error(`Failed to sync campaign ${campaign.id}:`, error);
          }
        }
      } catch (error) {
        console.error(
          `Failed to sync campaigns for ad account ${adAccount.account_id}:`,
          error,
        );
      }
    }
  } catch (error) {
    console.error(
      `Failed to sync ad accounts for social account ${account.id}:`,
      error,
    );
  }
}
