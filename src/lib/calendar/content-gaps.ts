/**
 * Content Gap Detection Service
 *
 * Analyzes scheduled content against optimal posting times to identify
 * gaps in the content calendar during high-engagement periods.
 *
 * Resolves #869
 */

import prisma from "@/lib/prisma";
import type { SocialPlatform } from "@prisma/client";
import { getBestTimeRecommendations } from "./best-time-service";
import type { DayOfWeek, HourOfDay, PlatformRecommendations } from "./best-time-types";

/**
 * Time slot types for content gap analysis
 */
export type TimeSlot = "morning" | "afternoon" | "evening";

/**
 * Severity levels for content gaps
 */
export type GapSeverity = "high" | "medium" | "low";

/**
 * A content gap identified in the calendar
 */
export interface ContentGap {
  /** Date of the gap (ISO date string YYYY-MM-DD) */
  date: string;
  /** Time slot with no content */
  timeSlot: TimeSlot;
  /** Platform with the gap */
  platform: string;
  /** Severity based on engagement potential */
  severity: GapSeverity;
  /** Suggested time to post (ISO datetime) */
  suggestedTime: string;
  /** Human-readable reason for the suggestion */
  reason: string;
}

/**
 * Response from the content gaps API
 */
export interface ContentGapsResponse {
  gaps: ContentGap[];
}

/**
 * Options for content gap detection
 */
export interface ContentGapDetectionOptions {
  /** Workspace ID to analyze */
  workspaceId: string;
  /** Number of days ahead to analyze (default: 7) */
  daysAhead?: number;
  /** Specific platform to analyze (optional - defaults to all) */
  platform?: SocialPlatform;
  /** Timezone for analysis (default: UTC) */
  timezone?: string;
}

/**
 * Hour ranges for each time slot
 */
const TIME_SLOT_HOURS: Record<TimeSlot, { start: HourOfDay; end: HourOfDay; }> = {
  morning: { start: 6, end: 11 },
  afternoon: { start: 12, end: 17 },
  evening: { start: 18, end: 23 },
};

/**
 * Get the time slot for a given hour
 */
export function getTimeSlotForHour(hour: number): TimeSlot {
  if (hour >= 6 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 17) return "afternoon";
  return "evening";
}

/**
 * Get the middle hour for a time slot (for suggested posting time)
 */
function getMiddleHourForSlot(slot: TimeSlot): HourOfDay {
  const { start, end } = TIME_SLOT_HOURS[slot];
  return Math.floor((start + end) / 2) as HourOfDay;
}

/**
 * Calculate severity based on engagement score and platform recommendations
 */
function calculateSeverity(
  dayOfWeek: DayOfWeek,
  hour: HourOfDay,
  platformRecommendations: PlatformRecommendations[],
  platform: SocialPlatform,
): GapSeverity {
  const platformRec = platformRecommendations.find((p) => p.platform === platform);

  if (!platformRec) {
    return "low";
  }

  // Check if this is a recommended time slot
  const matchingSlot = platformRec.bestTimeSlots.find(
    (slot) => slot.dayOfWeek === dayOfWeek && Math.abs(slot.hour - hour) <= 2,
  );

  if (matchingSlot) {
    if (matchingSlot.engagementScore >= 70) return "high";
    if (matchingSlot.engagementScore >= 50) return "medium";
  }

  // Check if this is a peak hour
  if (platformRec.peakHours.includes(hour)) {
    return "medium";
  }

  // Check if this is a day to avoid
  if (platformRec.avoidDays.includes(dayOfWeek)) {
    return "low";
  }

  return "low";
}

/**
 * Generate reason text for a content gap
 */
function generateGapReason(
  severity: GapSeverity,
  platform: SocialPlatform,
  timeSlot: TimeSlot,
  dayName: string,
  platformRecommendations: PlatformRecommendations[],
): string {
  const platformRec = platformRecommendations.find((p) => p.platform === platform);

  if (severity === "high") {
    if (platformRec?.hasEnoughData) {
      return `High engagement ${timeSlot} slot on ${dayName} with no content scheduled`;
    }
    return `${dayName} ${timeSlot} is a peak engagement period for ${platform}`;
  }

  if (severity === "medium") {
    return `${dayName} ${timeSlot} shows moderate engagement potential for ${platform}`;
  }

  return `Consider scheduling ${platform} content for ${dayName} ${timeSlot}`;
}

/**
 * Get day name from day of week number
 */
function getDayName(dayOfWeek: DayOfWeek): string {
  const days: Record<DayOfWeek, string> = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };
  return days[dayOfWeek];
}

/**
 * Detect content gaps in the calendar
 */
export async function detectContentGaps(
  options: ContentGapDetectionOptions,
): Promise<ContentGapsResponse> {
  const { workspaceId, daysAhead = 7, platform, timezone: _timezone = "UTC" } = options;

  // Get the date range
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysAhead);

  // Fetch social accounts for the workspace
  const accounts = await prisma.socialAccount.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      ...(platform ? { platform } : {}),
    },
    select: {
      id: true,
      platform: true,
      accountName: true,
    },
  });

  if (accounts.length === 0) {
    return { gaps: [] };
  }

  // Get best time recommendations for context
  const recommendations = await getBestTimeRecommendations({
    workspaceId,
    lookbackDays: 30,
    includeGaps: false,
    gapAnalysisRange: { start: startDate, end: endDate },
  });

  // Fetch scheduled posts in the date range
  const scheduledPosts = await prisma.scheduledPost.findMany({
    where: {
      workspaceId,
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
      status: { in: ["SCHEDULED", "DRAFT", "PENDING"] },
    },
    include: {
      postAccounts: {
        include: {
          account: {
            select: {
              platform: true,
            },
          },
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Build a map of scheduled content by date, time slot, and platform
  const scheduledMap = new Map<string, Set<SocialPlatform>>();

  for (const post of scheduledPosts) {
    const postDate = post.scheduledAt.toISOString().split("T")[0]!;
    const postHour = post.scheduledAt.getHours();
    const timeSlot = getTimeSlotForHour(postHour);

    for (const pa of post.postAccounts) {
      const key = `${postDate}-${timeSlot}`;
      const platforms = scheduledMap.get(key) || new Set<SocialPlatform>();
      platforms.add(pa.account.platform);
      scheduledMap.set(key, platforms);
    }
  }

  // Identify gaps
  const gaps: ContentGap[] = [];
  const uniquePlatforms = [...new Set(accounts.map((a) => a.platform))];
  const timeSlots: TimeSlot[] = ["morning", "afternoon", "evening"];

  // Iterate through each day in the range
  const currentDate = new Date(startDate);
  while (currentDate < endDate) {
    const dateStr = currentDate.toISOString().split("T")[0]!;
    const dayOfWeek = currentDate.getDay() as DayOfWeek;

    for (const slot of timeSlots) {
      const key = `${dateStr}-${slot}`;
      const scheduledPlatforms = scheduledMap.get(key) || new Set<SocialPlatform>();

      for (const platformToCheck of uniquePlatforms) {
        // Skip if content is already scheduled for this platform in this slot
        if (scheduledPlatforms.has(platformToCheck)) {
          continue;
        }

        const middleHour = getMiddleHourForSlot(slot);
        const severity = calculateSeverity(
          dayOfWeek,
          middleHour,
          recommendations.platformRecommendations,
          platformToCheck,
        );

        // Only include medium and high severity gaps
        if (severity === "low") {
          continue;
        }

        // Create suggested time
        const suggestedDate = new Date(currentDate);
        suggestedDate.setHours(middleHour, 0, 0, 0);

        const dayName = getDayName(dayOfWeek);
        const reason = generateGapReason(
          severity,
          platformToCheck,
          slot,
          dayName,
          recommendations.platformRecommendations,
        );

        gaps.push({
          date: dateStr,
          timeSlot: slot,
          platform: platformToCheck,
          severity,
          suggestedTime: suggestedDate.toISOString(),
          reason,
        });
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort gaps by severity (high first) then by date
  gaps.sort((a, b) => {
    const severityOrder: Record<GapSeverity, number> = { high: 0, medium: 1, low: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.date.localeCompare(b.date);
  });

  return { gaps };
}

/**
 * Get a summary of content gaps by severity
 */
export function summarizeGaps(gaps: ContentGap[]): {
  total: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  byPlatform: Record<string, number>;
  byTimeSlot: Record<TimeSlot, number>;
} {
  const byPlatform: Record<string, number> = {};
  const byTimeSlot: Record<TimeSlot, number> = { morning: 0, afternoon: 0, evening: 0 };

  let highSeverity = 0;
  let mediumSeverity = 0;
  let lowSeverity = 0;

  for (const gap of gaps) {
    if (gap.severity === "high") highSeverity++;
    else if (gap.severity === "medium") mediumSeverity++;
    else lowSeverity++;

    byPlatform[gap.platform] = (byPlatform[gap.platform] || 0) + 1;
    byTimeSlot[gap.timeSlot]++;
  }

  return {
    total: gaps.length,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    byPlatform,
    byTimeSlot,
  };
}
