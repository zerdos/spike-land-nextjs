/**
 * Boost Impact Analyzer
 *
 * Calculates incremental lift and ROI for boosted posts
 * Compares organic baseline vs boosted performance
 *
 * Resolves #521
 */

import prisma from "@/lib/prisma";

export interface ImpactAnalysisInput {
  boostedPostId: string;
  organicBaseline: {
    impressions: number;
    engagementRate: number;
    reach: number;
    clicks: number;
  };
  boostPeriodStart: Date;
  boostPeriodEnd: Date;
}

export interface ImpactAnalysisResult {
  incrementalImpressions: number;
  incrementalReach: number;
  incrementalClicks: number;
  liftPercentage: number;
  roi: number;
  costPerIncrementalClick: number;
}

/**
 * Calculate incremental lift
 * @param organic - Organic baseline metrics
 * @param total - Total metrics (organic + paid)
 * @returns Incremental metrics
 */
function calculateIncrementalLift(
  organic: { impressions: number; reach: number; clicks: number; },
  total: { impressions: number; reach: number; clicks: number; },
) {
  return {
    incrementalImpressions: total.impressions - organic.impressions,
    incrementalReach: total.reach - organic.reach,
    incrementalClicks: total.clicks - organic.clicks,
  };
}

/**
 * Calculate lift percentage
 * @param organic - Organic baseline value
 * @param total - Total value
 * @returns Lift percentage
 */
function calculateLiftPercentage(organic: number, total: number): number {
  if (organic === 0) {
    return total > 0 ? 100 : 0;
  }
  return ((total - organic) / organic) * 100;
}

/**
 * Calculate ROI
 * @param incrementalValue - Estimated value of incremental results (in cents)
 * @param totalSpend - Total ad spend (in cents)
 * @returns ROI as decimal (e.g., 1.5 = 150% ROI)
 */
function calculateROI(incrementalValue: number, totalSpend: number): number {
  if (totalSpend === 0) {
    return 0;
  }
  return (incrementalValue - totalSpend) / totalSpend;
}

/**
 * Analyze boost impact
 * @param input - Analysis input
 * @returns Impact analysis result
 */
export async function analyzeBoostImpact(
  input: ImpactAnalysisInput,
): Promise<ImpactAnalysisResult> {
  // Get boost performance
  const boost = await db.boostedPost.findUnique({
    where: { id: input.boostedPostId },
    include: {
      performance: true,
      originalPost: {
        include: {
          performance: true,
        },
      },
    },
  });

  if (!boost || !boost.performance) {
    throw new Error("Boost or performance data not found");
  }

  // Total metrics = organic baseline + paid performance
  const totalImpressions =
    input.organicBaseline.impressions + boost.performance.impressions;
  const totalReach = input.organicBaseline.reach + boost.performance.reach;
  const totalClicks = input.organicBaseline.clicks + boost.performance.clicks;

  // Calculate engagements from boost (likes + comments + shares approximation)
  // Using impressions * engagement rate as proxy
  const organicEngagements = Math.round(
    input.organicBaseline.impressions * Number(input.organicBaseline.engagementRate),
  );

  // Estimate boost engagements using clicks as proxy
  const boostEngagements = boost.performance.clicks;
  const totalEngagements = organicEngagements + boostEngagements;

  // Calculate incremental lift
  const incremental = calculateIncrementalLift(
    {
      impressions: input.organicBaseline.impressions,
      reach: input.organicBaseline.reach,
      clicks: input.organicBaseline.clicks,
    },
    {
      impressions: totalImpressions,
      reach: totalReach,
      clicks: totalClicks,
    },
  );

  // Calculate lift percentage (using impressions as primary metric)
  const liftPercentage = calculateLiftPercentage(
    input.organicBaseline.impressions,
    totalImpressions,
  );

  // Calculate cost per incremental click
  const totalSpend = Number(boost.performance.spend);
  const costPerIncrementalClick =
    incremental.incrementalClicks > 0
      ? totalSpend / incremental.incrementalClicks
      : 0;

  // Estimate value of incremental clicks (using $2 per click as default)
  const incrementalValue = incremental.incrementalClicks * 200; // $2 in cents

  // Calculate ROI
  const roi = calculateROI(incrementalValue, totalSpend);

  // Store analysis results
  await db.boostImpactAnalysis.upsert({
    where: { boostedPostId: input.boostedPostId },
    create: {
      boostedPostId: input.boostedPostId,
      organicImpressions: input.organicBaseline.impressions,
      organicEngagementRate: input.organicBaseline.engagementRate,
      organicReach: input.organicBaseline.reach,
      organicClicks: input.organicBaseline.clicks,
      totalImpressions,
      totalReach,
      totalClicks,
      totalEngagements,
      incrementalImpressions: incremental.incrementalImpressions,
      incrementalReach: incremental.incrementalReach,
      incrementalClicks: incremental.incrementalClicks,
      liftPercentage,
      totalSpend,
      costPerIncrementalClick,
      roi,
      baselinePeriodStart: new Date(input.boostPeriodStart.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
      baselinePeriodEnd: input.boostPeriodStart,
      boostPeriodStart: input.boostPeriodStart,
      boostPeriodEnd: input.boostPeriodEnd,
      analyzed: true,
      analyzedAt: new Date(),
    },
    update: {
      totalImpressions,
      totalReach,
      totalClicks,
      totalEngagements,
      incrementalImpressions: incremental.incrementalImpressions,
      incrementalReach: incremental.incrementalReach,
      incrementalClicks: incremental.incrementalClicks,
      liftPercentage,
      totalSpend,
      costPerIncrementalClick,
      roi,
      analyzed: true,
      analyzedAt: new Date(),
    },
  });

  return {
    incrementalImpressions: incremental.incrementalImpressions,
    incrementalReach: incremental.incrementalReach,
    incrementalClicks: incremental.incrementalClicks,
    liftPercentage,
    roi,
    costPerIncrementalClick,
  };
}

/**
 * Get impact analysis for a boost
 * @param boostedPostId - Boost ID
 * @returns Impact analysis or null
 */
export async function getBoostImpact(boostedPostId: string) {
  return await db.boostImpactAnalysis.findUnique({
    where: { boostedPostId },
    include: {
      boostedPost: {
        include: {
          originalPost: true,
          performance: true,
        },
      },
    },
  });
}
