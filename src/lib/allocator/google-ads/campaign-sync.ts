import { decryptToken } from "@/lib/crypto/token-encryption";
import prisma from "@/lib/prisma";
import type { MarketingAccount } from "@prisma/client";
import { GoogleAdsAllocatorClient } from "./client";

export async function syncGoogleAdsCampaigns(workspaceId: string) {
  const marketingAccounts = await prisma.marketingAccount.findMany({
    where: {
      platform: "GOOGLE_ADS",
      userId: {
        in: await getWorkspaceUserIds(workspaceId),
      },
      isActive: true,
    },
  });

  for (const account of marketingAccounts) {
    await syncCampaignsForAccount(account, workspaceId);
  }
}

async function getWorkspaceUserIds(workspaceId: string): Promise<string[]> {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { userId: true },
  });
  return members.map(m => m.userId);
}

async function syncCampaignsForAccount(account: MarketingAccount, workspaceId: string) {
  const accessToken = decryptToken(account.accessToken);
  const client = new GoogleAdsAllocatorClient(accessToken, account.accountId);

  try {
    const adAccounts = await client.getAdAccounts();
    console.log(`Found ${adAccounts.length} Google Ads accounts for workspace ${workspaceId}`);

    for (const adAccount of adAccounts) {
      try {
        const campaigns = await client.getCampaigns(adAccount.id);
        console.log(
          `Syncing ${campaigns.length} campaigns for Google Ads account ${adAccount.name} (${adAccount.id})`,
        );

        for (const campaign of campaigns) {
          try {
            // Get metrics for the last 30 days
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);

            const insights = await client.getMetrics(
              adAccount.id,
              campaign.id,
              "CAMPAIGN",
              startDate,
              endDate,
            );

            const savedCampaign = await prisma.allocatorCampaign.upsert({
              where: {
                workspaceId_platform_platformCampaignId: {
                  workspaceId,
                  platform: "GOOGLE_ADS",
                  platformCampaignId: campaign.id,
                },
              },
              update: {
                name: campaign.name,
                status: campaign.status,
                budget: campaign.budgetAmount ? campaign.budgetAmount / 100 : 0,
                spend: insights.spend / 100,
                metrics: {
                  objective: campaign.objective,
                  budgetType: campaign.budgetType,
                  currency: campaign.currency,
                  impressions: insights.impressions,
                  clicks: insights.clicks,
                  conversions: insights.conversions,
                  accountName: adAccount.name,
                  accountId: adAccount.id,
                },
                lastSyncAt: new Date(),
              },
              create: {
                workspaceId,
                platform: "GOOGLE_ADS",
                platformCampaignId: campaign.id,
                name: campaign.name,
                status: campaign.status,
                budget: campaign.budgetAmount ? campaign.budgetAmount / 100 : 0,
                spend: insights.spend / 100,
                metrics: {
                  objective: campaign.objective,
                  budgetType: campaign.budgetType,
                  currency: campaign.currency,
                  impressions: insights.impressions,
                  clicks: insights.clicks,
                  conversions: insights.conversions,
                  accountName: adAccount.name,
                  accountId: adAccount.id,
                },
                lastSyncAt: new Date(),
              },
            });

            // Sync Ad Groups (mapped to AllocatorAdSet)
            const adGroups = await client.getAdGroups(adAccount.id, campaign.id);
            for (const adGroup of adGroups) {
              try {
                const adGroupInsights = await client.getMetrics(
                  adAccount.id,
                  adGroup.id,
                  "AD_GROUP",
                  startDate,
                  endDate,
                );

                await prisma.allocatorAdSet.upsert({
                  where: {
                    campaignId_platformAdSetId: {
                      campaignId: savedCampaign.id,
                      platformAdSetId: adGroup.id,
                    },
                  },
                  update: {
                    name: adGroup.name,
                    status: adGroup.status,
                    spend: adGroupInsights.spend / 100,
                    // Note: Google Ad Groups don't always have an individual budget
                  },
                  create: {
                    campaignId: savedCampaign.id,
                    platformAdSetId: adGroup.id,
                    name: adGroup.name,
                    status: adGroup.status,
                    spend: adGroupInsights.spend / 100,
                  },
                });
              } catch (error) {
                console.error(`Failed to sync ad group ${adGroup.id}:`, error);
              }
            }
          } catch (error) {
            console.error(`Failed to sync Google Ads campaign ${campaign.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Failed to list campaigns for Google Ads account ${adAccount.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`Failed to get Google Ads accounts for marketing account ${account.id}:`, error);
  }
}
