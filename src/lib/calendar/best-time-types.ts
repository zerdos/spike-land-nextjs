/**
 * Best-Time Recommendations Types
 *
 * TypeScript types for the best-time posting recommendations feature
 * Resolves #578
 */

import type { SocialPlatform } from "@prisma/client";

/**
 * Day of week (0 = Sunday, 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Hour of day (0-23)
 */
export type HourOfDay =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23;

/**
 * Confidence level for recommendations
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * A time slot recommendation
 */
export interface TimeSlotRecommendation {
  /** Day of the week (0 = Sunday) */
  dayOfWeek: DayOfWeek;
  /** Hour of the day (0-23) */
  hour: HourOfDay;
  /** Confidence level of the recommendation */
  confidence: ConfidenceLevel;
  /** Engagement score (normalized 0-100) */
  engagementScore: number;
  /** Reason for the recommendation */
  reason: string;
}

/**
 * Platform-specific recommendations
 */
export interface PlatformRecommendations {
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  /** Best time slots for this platform */
  bestTimeSlots: TimeSlotRecommendation[];
  /** Days with lowest engagement (avoid these) */
  avoidDays: DayOfWeek[];
  /** Peak engagement hours */
  peakHours: HourOfDay[];
  /** Whether there's enough data for reliable recommendations */
  hasEnoughData: boolean;
  /** Number of days of data analyzed */
  daysAnalyzed: number;
}

/**
 * Calendar gap - a time period with no scheduled content
 */
export interface CalendarGap {
  /** Start of the gap */
  start: Date;
  /** End of the gap */
  end: Date;
  /** Duration in hours */
  durationHours: number;
  /** Suggested platforms to post during this gap */
  suggestedPlatforms: SocialPlatform[];
  /** Whether this is a high-engagement time slot */
  isHighEngagementSlot: boolean;
}

/**
 * Overall recommendations response
 */
export interface BestTimeRecommendationsResponse {
  /** Per-platform recommendations */
  platformRecommendations: PlatformRecommendations[];
  /** Identified gaps in the content calendar */
  calendarGaps: CalendarGap[];
  /** Global best time slots across all platforms */
  globalBestSlots: TimeSlotRecommendation[];
  /** Analysis date range */
  analysisRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Daily engagement pattern
 */
export interface DailyEngagementPattern {
  dayOfWeek: DayOfWeek;
  avgEngagementRate: number;
  avgImpressions: number;
  avgReach: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  sampleCount: number;
}

/**
 * Industry benchmark data (static defaults)
 */
export interface IndustryBenchmark {
  platform: SocialPlatform;
  bestDays: DayOfWeek[];
  bestHours: HourOfDay[];
  source: string;
}

/**
 * Options for fetching recommendations
 */
export interface BestTimeRecommendationsOptions {
  workspaceId: string;
  /** Specific account IDs to analyze (optional - defaults to all accounts) */
  accountIds?: string[];
  /** Number of days of historical data to analyze */
  lookbackDays?: number;
  /** Timezone for time slot recommendations */
  timezone?: string;
  /** Whether to include calendar gap analysis */
  includeGaps?: boolean;
  /** Date range for gap analysis */
  gapAnalysisRange?: {
    start: Date;
    end: Date;
  };
}
