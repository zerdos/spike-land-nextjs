/**
 * Insight Generator
 *
 * Analyzes boost performance and generates actionable insights
 * Identifies patterns, opportunities, and recommendations
 *
 * Resolves #521
 */

import prisma from "@/lib/prisma";
import type { InsightType } from "@/generated/prisma";

export interface InsightData {
  type: InsightType;
  title: string;
  description: string;
  recommendation: string;
  relatedBoostIds: string[];
  metrics: Record<string, unknown>;
  priority: number;
}

/**
 * Analyze boost performance across workspace
 * @param workspaceId - Workspace ID
 * @returns Array of insights
 */
export async function generateWorkspaceInsights(
  workspaceId: string,
): Promise<InsightData[]> {
  const insights: InsightData[] = [];

  // Get all boosts with performance data
  const boosts = await db.boostedPost.findMany({
    where: {
      workspaceId,
      status: {
        in: ["ACTIVE", "COMPLETED"],
      },
    },
    include: {
      performance: true,
      impactAnalysis: true,
      originalPost: {
        include: {
          performance: true,
        },
      },
    },
  });

  if (boosts.length === 0) {
    return insights;
  }

  // Insight 1: Identify high-performing content patterns
  const highPerformers = boosts.filter(
    (b) => b.impactAnalysis && Number(b.impactAnalysis.roi) > 0.5, // ROI > 50%
  );

  if (highPerformers.length > 0) {
    const avgROI =
      highPerformers.reduce(
        (sum: number, b) => sum + Number(b.impactAnalysis!.roi),
        0,
      ) / highPerformers.length;

    insights.push({
      type: "HIGH_PERFORMING_CONTENT",
      title: `${highPerformers.length} high-performing boosts found`,
      description: `You have ${highPerformers.length} boosted posts with ROI above 50%. The average ROI is ${(avgROI * 100).toFixed(1)}%.`,
      recommendation:
        "Analyze common themes in these posts and create similar content for future campaigns.",
      relatedBoostIds: highPerformers.map((b) => b.id),
      metrics: {
        count: highPerformers.length,
        avgROI,
      },
      priority: 8,
    });
  }

  // Insight 2: Budget optimization opportunities
  const underperformers = boosts.filter(
    (b) => b.impactAnalysis && Number(b.impactAnalysis.roi) < 0, // Negative ROI
  );

  if (underperformers.length > 0) {
    const totalWastedSpend = underperformers.reduce(
      (sum: number, b) => sum + Number(b.performance?.spend || 0),
      0,
    );

    insights.push({
      type: "OPTIMAL_BUDGET",
      title: "Budget optimization opportunity detected",
      description: `${underperformers.length} boosts are underperforming with negative ROI, resulting in $${(totalWastedSpend / 100).toFixed(2)} in inefficient spend.`,
      recommendation:
        "Consider pausing these campaigns and reallocating budget to better-performing content.",
      relatedBoostIds: underperformers.map((b) => b.id),
      metrics: {
        count: underperformers.length,
        wastedSpend: totalWastedSpend,
      },
      priority: 9,
    });
  }

  // Insight 3: Platform performance comparison
  const platformPerformance = new Map<string, { count: number; avgROI: number; }>();

  for (const boost of boosts) {
    if (!boost.impactAnalysis) continue;

    const platform = boost.platform;
    const roi = Number(boost.impactAnalysis.roi);

    if (!platformPerformance.has(platform)) {
      platformPerformance.set(platform, { count: 0, avgROI: 0 });
    }

    const data = platformPerformance.get(platform)!;
    data.count++;
    data.avgROI += roi;
  }

  // Find best platform
  let bestPlatform: string | null = null;
  let bestROI = -Infinity;

  for (const [platform, data] of platformPerformance.entries()) {
    const avgROI = data.avgROI / data.count;
    if (avgROI > bestROI && data.count >= 2) {
      // At least 2 campaigns
      bestROI = avgROI;
      bestPlatform = platform;
    }
  }

  if (bestPlatform) {
    insights.push({
      type: "PLATFORM_RECOMMENDATION",
      title: `${bestPlatform} shows best performance`,
      description: `Based on ${platformPerformance.get(bestPlatform)!.count} campaigns, ${bestPlatform} has an average ROI of ${(bestROI * 100).toFixed(1)}%.`,
      recommendation: `Focus future boost campaigns on ${bestPlatform} for better returns.`,
      relatedBoostIds: boosts
        .filter((b) => b.platform === bestPlatform)
        .map((b) => b.id),
      metrics: {
        platform: bestPlatform,
        avgROI: bestROI,
        campaignCount: platformPerformance.get(bestPlatform)!.count,
      },
      priority: 7,
    });
  }

  // Insight 4: Time-to-boost recommendations
  const organicPosts = await db.organicPostPerformance.findMany({
    where: {
      isTopPerformer: true,
      boosted: false,
      socialPost: {
        createdBy: {
          workspaceMembers: {
            some: {
              workspaceId,
            },
          },
        },
      },
    },
    take: 5,
  });

  if (organicPosts.length > 0) {
    insights.push({
      type: "ROI_OPPORTUNITY",
      title: `${organicPosts.length} top performers ready to boost`,
      description: `You have ${organicPosts.length} high-performing organic posts that haven't been boosted yet.`,
      recommendation:
        "Consider boosting these posts to maximize their reach and engagement.",
      relatedBoostIds: [],
      metrics: {
        readyToBoost: organicPosts.length,
        avgPerformanceScore:
          organicPosts.reduce(
            (sum: number, p) => sum + Number(p.performanceScore),
            0,
          ) / organicPosts.length,
      },
      priority: 6,
    });
  }

  return insights;
}

/**
 * Store insights in database
 * @param workspaceId - Workspace ID
 * @param insights - Array of insights to store
 */
export async function storeInsights(
  workspaceId: string,
  insights: InsightData[],
): Promise<void> {
  // Delete old insights (older than 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  await db.boostInsight.deleteMany({
    where: {
      workspaceId,
      createdAt: {
        lt: sevenDaysAgo,
      },
    },
  });

  // Create new insights
  for (const insight of insights) {
    await db.boostInsight.create({
      data: {
        workspaceId,
        insightType: insight.type,
        title: insight.title,
        description: insight.description,
        recommendation: insight.recommendation,
        relatedBoostIds: insight.relatedBoostIds,
        metrics: insight.metrics,
        priority: insight.priority,
        status: "NEW",
      },
    });
  }
}

/**
 * Get insights for a workspace
 * @param workspaceId - Workspace ID
 * @param status - Filter by status
 * @returns Array of insights
 */
export async function getWorkspaceInsights(
  workspaceId: string,
  status?: string,
) {
  return await db.boostInsight.findMany({
    where: {
      workspaceId,
      ...(status && { status: status as any }),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}
