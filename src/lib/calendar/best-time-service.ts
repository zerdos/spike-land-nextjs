/**
 * Best-Time Recommendations Service
 *
 * Analyzes historical engagement patterns to recommend optimal posting times.
 * Resolves #578
 */

import prisma from "@/lib/prisma";
import type { SocialPlatform } from "@prisma/client";
import type {
  BestTimeRecommendationsOptions,
  BestTimeRecommendationsResponse,
  CalendarGap,
  ConfidenceLevel,
  DailyEngagementPattern,
  DayOfWeek,
  HourOfDay,
  IndustryBenchmark,
  PlatformRecommendations,
  TimeSlotRecommendation,
} from "./best-time-types";

/**
 * Industry benchmarks based on social media research
 * These are used as fallbacks when there's insufficient historical data
 */
const INDUSTRY_BENCHMARKS: IndustryBenchmark[] = [
  {
    platform: "LINKEDIN",
    bestDays: [2, 3, 4] as DayOfWeek[], // Tue, Wed, Thu
    bestHours: [9, 10, 11, 12] as HourOfDay[], // 9 AM - 12 PM
    source: "Industry research 2024",
  },
  {
    platform: "TWITTER",
    bestDays: [1, 2, 3, 4, 5] as DayOfWeek[], // Mon-Fri
    bestHours: [9, 10, 11, 12, 13, 14, 15] as HourOfDay[], // 9 AM - 3 PM
    source: "Industry research 2024",
  },
  {
    platform: "FACEBOOK",
    bestDays: [2, 3, 4] as DayOfWeek[], // Tue, Wed, Thu
    bestHours: [11, 12, 13, 14] as HourOfDay[], // 11 AM - 2 PM
    source: "Industry research 2024",
  },
  {
    platform: "INSTAGRAM",
    bestDays: [1, 2, 3] as DayOfWeek[], // Mon, Tue, Wed
    bestHours: [11, 12, 13, 14, 19, 20, 21] as HourOfDay[], // 11 AM - 2 PM, 7-9 PM
    source: "Industry research 2024",
  },
];

/**
 * Minimum number of days of data required for high confidence recommendations
 */
const MIN_DAYS_HIGH_CONFIDENCE = 30;
const MIN_DAYS_MEDIUM_CONFIDENCE = 14;
const MIN_DAYS_LOW_CONFIDENCE = 7;

/**
 * Get the confidence level based on sample count
 */
function getConfidenceLevel(daysAnalyzed: number): ConfidenceLevel {
  if (daysAnalyzed >= MIN_DAYS_HIGH_CONFIDENCE) return "high";
  if (daysAnalyzed >= MIN_DAYS_MEDIUM_CONFIDENCE) return "medium";
  return "low";
}

/**
 * Get day name for display
 */
function getDayName(day: DayOfWeek): string {
  const days: Record<DayOfWeek, string> = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };
  return days[day];
}

/**
 * Analyze engagement patterns from historical metrics
 */
async function analyzeEngagementPatterns(
  accountId: string,
  lookbackDays: number,
): Promise<DailyEngagementPattern[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);
  startDate.setHours(0, 0, 0, 0);

  const metrics = await prisma.socialMetrics.findMany({
    where: {
      accountId,
      date: { gte: startDate },
    },
    orderBy: { date: "asc" },
  });

  // Group metrics by day of week
  const patternsByDay: Map<
    DayOfWeek,
    {
      engagementRates: number[];
      impressions: number[];
      reach: number[];
      likes: number[];
      comments: number[];
      shares: number[];
    }
  > = new Map();

  for (let i = 0; i < 7; i++) {
    patternsByDay.set(i as DayOfWeek, {
      engagementRates: [],
      impressions: [],
      reach: [],
      likes: [],
      comments: [],
      shares: [],
    });
  }

  for (const metric of metrics) {
    const dayOfWeek = metric.date.getDay() as DayOfWeek;
    const pattern = patternsByDay.get(dayOfWeek);
    if (pattern) {
      if (metric.engagementRate) {
        pattern.engagementRates.push(
          Number(metric.engagementRate),
        );
      }
      pattern.impressions.push(metric.impressions);
      pattern.reach.push(metric.reach);
      pattern.likes.push(metric.likes);
      pattern.comments.push(metric.comments);
      pattern.shares.push(metric.shares);
    }
  }

  // Calculate averages for each day
  const patterns: DailyEngagementPattern[] = [];

  for (const [day, data] of patternsByDay) {
    const sampleCount = data.impressions.length;
    patterns.push({
      dayOfWeek: day,
      avgEngagementRate:
        data.engagementRates.length > 0
          ? data.engagementRates.reduce((a, b) => a + b, 0) /
            data.engagementRates.length
          : 0,
      avgImpressions:
        sampleCount > 0
          ? data.impressions.reduce((a, b) => a + b, 0) / sampleCount
          : 0,
      avgReach:
        sampleCount > 0
          ? data.reach.reduce((a, b) => a + b, 0) / sampleCount
          : 0,
      avgLikes:
        sampleCount > 0
          ? data.likes.reduce((a, b) => a + b, 0) / sampleCount
          : 0,
      avgComments:
        sampleCount > 0
          ? data.comments.reduce((a, b) => a + b, 0) / sampleCount
          : 0,
      avgShares:
        sampleCount > 0
          ? data.shares.reduce((a, b) => a + b, 0) / sampleCount
          : 0,
      sampleCount,
    });
  }

  return patterns;
}

/**
 * Calculate engagement score from pattern data
 */
function calculateEngagementScore(pattern: DailyEngagementPattern): number {
  // Weighted scoring based on engagement metrics
  const weights = {
    engagementRate: 40,
    impressions: 20,
    reach: 15,
    likes: 10,
    comments: 10,
    shares: 5,
  };

  // Normalize each metric (we'll use relative scoring within the dataset)
  let score =
    pattern.avgEngagementRate * weights.engagementRate +
    Math.min(pattern.avgImpressions / 1000, 10) * weights.impressions +
    Math.min(pattern.avgReach / 1000, 10) * weights.reach +
    Math.min(pattern.avgLikes / 100, 10) * weights.likes +
    Math.min(pattern.avgComments / 50, 10) * weights.comments +
    Math.min(pattern.avgShares / 20, 10) * weights.shares;

  // Normalize to 0-100
  return Math.min(Math.round(score), 100);
}

/**
 * Get platform recommendations based on historical data
 */
async function getPlatformRecommendations(
  accountId: string,
  platform: SocialPlatform,
  accountName: string,
  lookbackDays: number,
): Promise<PlatformRecommendations> {
  const patterns = await analyzeEngagementPatterns(accountId, lookbackDays);

  // Calculate total days analyzed
  const daysAnalyzed = patterns.reduce((sum, p) => sum + p.sampleCount, 0);
  const hasEnoughData = daysAnalyzed >= MIN_DAYS_LOW_CONFIDENCE;

  // Get industry benchmarks for this platform
  const benchmark = INDUSTRY_BENCHMARKS.find((b) => b.platform === platform);

  // Sort patterns by engagement score
  const patternsWithScores = patterns.map((p) => ({
    pattern: p,
    score: calculateEngagementScore(p),
  }));
  patternsWithScores.sort((a, b) => b.score - a.score);

  // Generate time slot recommendations
  const bestTimeSlots: TimeSlotRecommendation[] = [];

  if (hasEnoughData) {
    // Use actual data
    const topPatterns = patternsWithScores.slice(0, 3);
    const bestHours = benchmark?.bestHours || [9, 10, 11, 12];

    for (const { pattern, score } of topPatterns) {
      // Recommend peak hours for the best days
      for (const hour of bestHours.slice(0, 2)) {
        bestTimeSlots.push({
          dayOfWeek: pattern.dayOfWeek,
          hour: hour as HourOfDay,
          confidence: getConfidenceLevel(daysAnalyzed),
          engagementScore: score,
          reason: `${getDayName(pattern.dayOfWeek)} shows ${score}% engagement based on ${pattern.sampleCount} days of data`,
        });
      }
    }
  } else if (benchmark) {
    // Use industry benchmarks
    for (const day of benchmark.bestDays.slice(0, 3)) {
      for (const hour of benchmark.bestHours.slice(0, 2)) {
        bestTimeSlots.push({
          dayOfWeek: day,
          hour,
          confidence: "low",
          engagementScore: 70, // Default benchmark score
          reason: `Industry best practice for ${platform} (${benchmark.source})`,
        });
      }
    }
  }

  // Find days to avoid (lowest engagement)
  const avoidDays: DayOfWeek[] = patternsWithScores
    .slice(-2)
    .filter(({ score }) => score < 30)
    .map(({ pattern }) => pattern.dayOfWeek);

  // Peak hours (from benchmark or default)
  const peakHours: HourOfDay[] = benchmark?.bestHours.slice(0, 4) || [
    9, 10, 11, 12,
  ];

  return {
    platform,
    accountId,
    accountName,
    bestTimeSlots: bestTimeSlots.slice(0, 6), // Top 6 recommendations
    avoidDays,
    peakHours,
    hasEnoughData,
    daysAnalyzed,
  };
}

/**
 * Find gaps in the content calendar
 */
async function findCalendarGaps(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  platformRecommendations: PlatformRecommendations[],
): Promise<CalendarGap[]> {
  // Fetch scheduled posts in the date range
  const posts = await prisma.scheduledPost.findMany({
    where: {
      workspaceId,
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: ["SCHEDULED", "DRAFT"] },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const gaps: CalendarGap[] = [];
  const minGapHours = 24; // Minimum 24 hours to be considered a gap

  // Find gaps between posts
  let lastPostTime = startDate;

  for (const post of posts) {
    const gapHours =
      (post.scheduledAt.getTime() - lastPostTime.getTime()) / (1000 * 60 * 60);

    if (gapHours >= minGapHours) {
      const gapStart = new Date(lastPostTime);
      const gapEnd = new Date(post.scheduledAt);

      // Check if this gap overlaps with high-engagement time slots
      const dayOfWeek = gapStart.getDay() as DayOfWeek;
      const isHighEngagementSlot = platformRecommendations.some((pr) =>
        pr.bestTimeSlots.some(
          (slot) => slot.dayOfWeek === dayOfWeek && slot.engagementScore >= 60,
        ),
      );

      gaps.push({
        start: gapStart,
        end: gapEnd,
        durationHours: Math.round(gapHours),
        suggestedPlatforms: platformRecommendations
          .filter((pr) => pr.hasEnoughData || pr.bestTimeSlots.length > 0)
          .map((pr) => pr.platform),
        isHighEngagementSlot,
      });
    }

    lastPostTime = post.scheduledAt;
  }

  // Check gap from last post to end of range
  const finalGapHours =
    (endDate.getTime() - lastPostTime.getTime()) / (1000 * 60 * 60);
  if (finalGapHours >= minGapHours) {
    const dayOfWeek = lastPostTime.getDay() as DayOfWeek;
    const isHighEngagementSlot = platformRecommendations.some((pr) =>
      pr.bestTimeSlots.some(
        (slot) => slot.dayOfWeek === dayOfWeek && slot.engagementScore >= 60,
      ),
    );

    gaps.push({
      start: new Date(lastPostTime),
      end: endDate,
      durationHours: Math.round(finalGapHours),
      suggestedPlatforms: platformRecommendations
        .filter((pr) => pr.hasEnoughData || pr.bestTimeSlots.length > 0)
        .map((pr) => pr.platform),
      isHighEngagementSlot,
    });
  }

  return gaps;
}

/**
 * Calculate global best slots across all platforms
 */
function calculateGlobalBestSlots(
  platformRecommendations: PlatformRecommendations[],
): TimeSlotRecommendation[] {
  // Aggregate time slot scores across platforms
  const slotScores: Map<
    string,
    { slot: TimeSlotRecommendation; totalScore: number; count: number }
  > = new Map();

  for (const pr of platformRecommendations) {
    for (const slot of pr.bestTimeSlots) {
      const key = `${slot.dayOfWeek}-${slot.hour}`;
      const existing = slotScores.get(key);

      if (existing) {
        existing.totalScore += slot.engagementScore;
        existing.count++;
      } else {
        slotScores.set(key, {
          slot: { ...slot },
          totalScore: slot.engagementScore,
          count: 1,
        });
      }
    }
  }

  // Calculate average scores and sort
  const globalSlots: TimeSlotRecommendation[] = [];

  for (const [, { slot, totalScore, count }] of slotScores) {
    const avgScore = Math.round(totalScore / count);
    globalSlots.push({
      ...slot,
      engagementScore: avgScore,
      reason:
        count > 1
          ? `Optimal across ${count} platforms with ${avgScore}% average engagement`
          : slot.reason,
    });
  }

  // Sort by score and return top slots
  globalSlots.sort((a, b) => b.engagementScore - a.engagementScore);
  return globalSlots.slice(0, 6);
}

/**
 * Get best-time recommendations for a workspace
 */
export async function getBestTimeRecommendations(
  options: BestTimeRecommendationsOptions,
): Promise<BestTimeRecommendationsResponse> {
  const {
    workspaceId,
    accountIds,
    lookbackDays = 30,
    includeGaps = true,
    gapAnalysisRange,
  } = options;

  // Fetch social accounts for the workspace
  const accounts = await prisma.socialAccount.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      ...(accountIds ? { id: { in: accountIds } } : {}),
    },
    select: {
      id: true,
      platform: true,
      accountName: true,
    },
  });

  // Get recommendations for each account
  const platformRecommendations: PlatformRecommendations[] = [];

  for (const account of accounts) {
    const recommendations = await getPlatformRecommendations(
      account.id,
      account.platform,
      account.accountName,
      lookbackDays,
    );
    platformRecommendations.push(recommendations);
  }

  // Find calendar gaps
  let calendarGaps: CalendarGap[] = [];
  const now = new Date();
  const defaultEndDate = new Date(now);
  defaultEndDate.setDate(defaultEndDate.getDate() + 14); // 2 weeks ahead

  if (includeGaps) {
    const gapStart = gapAnalysisRange?.start || now;
    const gapEnd = gapAnalysisRange?.end || defaultEndDate;

    calendarGaps = await findCalendarGaps(
      workspaceId,
      gapStart,
      gapEnd,
      platformRecommendations,
    );
  }

  // Calculate global best slots
  const globalBestSlots = calculateGlobalBestSlots(platformRecommendations);

  // Calculate analysis range
  const analysisStart = new Date();
  analysisStart.setDate(analysisStart.getDate() - lookbackDays);

  return {
    platformRecommendations,
    calendarGaps,
    globalBestSlots,
    analysisRange: {
      start: analysisStart,
      end: new Date(),
    },
  };
}

/**
 * Get industry benchmarks for a platform
 */
export function getIndustryBenchmarks(
  platform: SocialPlatform,
): IndustryBenchmark | undefined {
  return INDUSTRY_BENCHMARKS.find((b) => b.platform === platform);
}

/**
 * Check if a given time slot is recommended for a platform
 */
export function isRecommendedTimeSlot(
  recommendations: PlatformRecommendations,
  dayOfWeek: DayOfWeek,
  hour: HourOfDay,
): boolean {
  return recommendations.bestTimeSlots.some(
    (slot) => slot.dayOfWeek === dayOfWeek && slot.hour === hour,
  );
}
