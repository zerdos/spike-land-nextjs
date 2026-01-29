/**
 * Optimal Posting Time Service
 * Manages posting time recommendations cache
 * Issue #841
 */

import prisma from "@/lib/prisma";
import { getBestTimeRecommendations } from "./best-time-service";
import type {
  PostingTimeRecommendation,
  OptimalTimesRequest,
  HeatmapData,
} from "@/types/ai-calendar";
import type { SocialPlatform } from "@prisma/client";

/**
 * Cache duration for recommendations (24 hours)
 */
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Get optimal posting times for workspace accounts
 * Uses cached recommendations if available, otherwise generates new ones
 */
export async function getOptimalTimes(
  request: OptimalTimesRequest,
): Promise<PostingTimeRecommendation[]> {
  const { workspaceId, accountIds, refreshCache = false } = request;

  // Fetch accounts
  const accounts = await prisma.socialAccount.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      ...(accountIds ? { id: { in: accountIds } } : {}),
    },
  });

  if (accounts.length === 0) {
    return [];
  }

  const recommendations: PostingTimeRecommendation[] = [];

  for (const account of accounts) {
    // Check cache first (if not forcing refresh)
    if (!refreshCache) {
      const cached = await prisma.postingTimeRecommendation.findMany({
        where: {
          accountId: account.id,
          lastUpdated: {
            gte: new Date(Date.now() - CACHE_DURATION_MS),
          },
        },
      });

      if (cached.length > 0) {
        recommendations.push(
          ...cached.map((rec) => ({
            id: rec.id,
            accountId: rec.accountId,
            dayOfWeek: rec.dayOfWeek,
            hourUtc: rec.hourUtc,
            score: rec.score,
            confidence: rec.confidence as "high" | "medium" | "low",
            reason: rec.reason,
            lastUpdated: rec.lastUpdated,
          })),
        );
        continue;
      }
    }

    // Generate new recommendations for this account
    const bestTimeData = await getBestTimeRecommendations({
      workspaceId,
      accountIds: [account.id],
      includeGaps: false,
    });

    const platformRecs = bestTimeData.platformRecommendations.find(
      (pr) => pr.accountId === account.id,
    );

    if (platformRecs && platformRecs.bestTimeSlots.length > 0) {
      // Store in database
      for (const slot of platformRecs.bestTimeSlots) {
        const existing = await prisma.postingTimeRecommendation.findUnique({
          where: {
            accountId_dayOfWeek_hourUtc: {
              accountId: account.id,
              dayOfWeek: slot.dayOfWeek,
              hourUtc: slot.hour,
            },
          },
        });

        let rec;
        if (existing) {
          // Update existing
          rec = await prisma.postingTimeRecommendation.update({
            where: { id: existing.id },
            data: {
              score: slot.engagementScore,
              confidence: slot.confidence,
              reason: slot.reason,
              lastUpdated: new Date(),
            },
          });
        } else {
          // Create new
          rec = await prisma.postingTimeRecommendation.create({
            data: {
              accountId: account.id,
              dayOfWeek: slot.dayOfWeek,
              hourUtc: slot.hour,
              score: slot.engagementScore,
              confidence: slot.confidence,
              reason: slot.reason,
            },
          });
        }

        recommendations.push({
          id: rec.id,
          accountId: rec.accountId,
          dayOfWeek: rec.dayOfWeek,
          hourUtc: rec.hourUtc,
          score: rec.score,
          confidence: rec.confidence as "high" | "medium" | "low",
          reason: rec.reason,
          lastUpdated: rec.lastUpdated,
        });
      }
    }
  }

  return recommendations;
}

/**
 * Refresh optimal times for all accounts in a workspace
 */
export async function refreshOptimalTimes(
  workspaceId: string,
): Promise<void> {
  await getOptimalTimes({
    workspaceId,
    refreshCache: true,
  });
}

/**
 * Get heatmap data for visualizing best posting times (7 days x 24 hours)
 * @param accountId - The account ID to fetch heatmap data for
 * @param attemptGenerate - Whether to attempt generating data if none exists (prevents infinite recursion)
 */
export async function getHeatmapData(
  accountId: string,
  attemptGenerate: boolean = true,
): Promise<HeatmapData> {
  // Fetch account details
  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  // Fetch all recommendations for this account
  const recommendations = await prisma.postingTimeRecommendation.findMany({
    where: { accountId },
    orderBy: [{ dayOfWeek: "asc" }, { hourUtc: "asc" }],
  });

  // Build 7x24 matrix (days x hours)
  const heatmap: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0)
  );

  let maxScore = 0;
  let minScore = 100;

  for (const rec of recommendations) {
    const dayRow = heatmap[rec.dayOfWeek];
    if (dayRow) {
      dayRow[rec.hourUtc] = rec.score;
    }
    if (rec.score > maxScore) maxScore = rec.score;
    if (rec.score < minScore) minScore = rec.score;
  }

  // If no recommendations exist, attempt to generate them (with recursion guard)
  if (recommendations.length === 0 && attemptGenerate) {
    const accountWithWorkspace = await prisma.socialAccount.findUnique({
      where: { id: accountId },
      select: { workspaceId: true },
    });

    if (accountWithWorkspace) {
      await getOptimalTimes({
        workspaceId: accountWithWorkspace.workspaceId,
        accountIds: [accountId],
        refreshCache: true,
      });

      // Call again with attemptGenerate=false to prevent infinite recursion
      return getHeatmapData(accountId, false);
    }
  }

  return {
    accountId,
    platform: account.platform as SocialPlatform,
    accountName: account.accountName,
    heatmap,
    maxScore,
    minScore: minScore === 100 ? 0 : minScore,
  };
}
