/**
 * Journey Analyzer
 *
 * Analyzes user journeys across platforms and campaigns to understand
 * cross-platform attribution patterns and conversion paths.
 */

import prisma from "@/lib/prisma";
import type { JourneyStep, PlatformTransition } from "@spike-npm-land/shared/types";

/**
 * Journey statistics aggregated over a time period
 */
export interface JourneyStats {
  /** Platform transition matrix */
  transitions: PlatformTransition[];
  /** Most common conversion paths */
  topJourneys: {
    /** Sequence of platforms */
    path: string[];
    /** Number of conversions with this path */
    count: number;
  }[];
  /** Average number of touchpoints before conversion */
  avgTouchpoints: number;
  /** Number of conversions that started organic and converted via paid */
  organicToPaidConversions: number;
  /** Total conversions in period */
  totalConversions: number;
}

/**
 * Get a user's complete journey from sessions
 *
 * Returns chronologically ordered touchpoints with platform and campaign data.
 *
 * @param userId - The user ID
 * @returns Array of journey steps
 *
 * @example
 * ```typescript
 * const journey = await getUserJourney("user123");
 * console.log(journey);
 * // [
 * //   { sessionId: "s1", timestamp: ..., platform: "ORGANIC", ... },
 * //   { sessionId: "s2", timestamp: ..., platform: "GOOGLE_ADS", ... },
 * //   { sessionId: "s3", timestamp: ..., platform: "FACEBOOK", ... },
 * // ]
 * ```
 */
export async function getUserJourney(userId: string): Promise<JourneyStep[]> {
  const sessions = await prisma.visitorSession.findMany({
    where: { userId },
    orderBy: { sessionStart: "asc" },
    select: {
      id: true,
      sessionStart: true,
      utmSource: true,
      utmCampaign: true,
      utmMedium: true,
      referrer: true,
      gclid: true,
      fbclid: true,
    },
  });

  const steps: JourneyStep[] = [];

  for (const session of sessions) {
    // Determine platform
    let platform = "DIRECT";
    if (session.gclid) {
      platform = "GOOGLE_ADS";
    } else if (session.fbclid) {
      platform = "FACEBOOK";
    } else if (session.utmSource) {
      const source = session.utmSource.toLowerCase();
      if (source.includes("google") || source.includes("gads")) {
        platform = "GOOGLE_ADS";
      } else if (
        source.includes("facebook") ||
        source.includes("fb") ||
        source.includes("instagram") ||
        source.includes("meta")
      ) {
        platform = "FACEBOOK";
      } else {
        platform = "OTHER";
      }
    } else if (session.referrer) {
      // Check for organic search
      try {
        const url = new URL(session.referrer);
        const hostname = url.hostname.toLowerCase();
<<<<<<< HEAD
        const isOrganic =
          hostname === "google.com" ||
=======
        const isOrganic = hostname === "google.com" ||
>>>>>>> origin/main
          hostname.endsWith(".google.com") ||
          hostname === "bing.com" ||
          hostname.endsWith(".bing.com") ||
          hostname === "duckduckgo.com" ||
          hostname.endsWith(".duckduckgo.com");
        if (isOrganic) {
          platform = "ORGANIC";
        } else {
          platform = "OTHER";
        }
      } catch {
        platform = "OTHER";
      }
    }

    steps.push({
      sessionId: session.id,
      timestamp: session.sessionStart,
      platform,
      source: session.utmSource || undefined,
      campaign: session.utmCampaign || undefined,
      medium: session.utmMedium || undefined,
    });
  }

  return steps;
}

/**
 * Classify a platform as ORGANIC, PAID, DIRECT, or OTHER
 *
 * @param platform - Platform string (e.g., "GOOGLE_ADS", "ORGANIC")
 * @returns Platform type
 */
function classifyPlatform(
  platform: string,
): "ORGANIC" | "PAID" | "DIRECT" | "OTHER" {
  if (platform === "ORGANIC") return "ORGANIC";
  if (platform === "DIRECT") return "DIRECT";
  if (
    platform === "GOOGLE_ADS" ||
    platform === "FACEBOOK" ||
    platform === "INSTAGRAM"
  ) {
    return "PAID";
  }
  return "OTHER";
}

/**
 * Find organic-to-paid transitions in a journey
 *
 * Identifies when users start with organic search and later convert via paid ads.
 *
 * @param journey - Array of journey steps
 * @returns Array of transitions
 *
 * @example
 * ```typescript
 * const journey = await getUserJourney("user123");
 * const transitions = findOrganicToPaidTransitions(journey);
 * console.log(transitions);
 * // [
 * //   { from: "ORGANIC", to: "PAID", count: 1 },
 * // ]
 * ```
 */
export function findOrganicToPaidTransitions(
  journey: JourneyStep[],
): PlatformTransition[] {
  if (journey.length < 2) return [];

  const transitions: Record<string, PlatformTransition> = {};

  for (let i = 0; i < journey.length - 1; i++) {
    const from = classifyPlatform(journey[i]!.platform);
    const to = classifyPlatform(journey[i + 1]!.platform);

    // Only count if there's an actual transition (not same type)
    if (from !== to) {
      const key = `${from}->${to}`;
      if (!transitions[key]) {
        transitions[key] = { from, to, count: 0 };
      }
      transitions[key]!.count++;
    }
  }

  return Object.values(transitions);
}

/**
 * Get aggregated journey statistics for a time period
 *
 * Analyzes all conversions in the period to understand common paths,
 * platform transitions, and organic-to-paid patterns.
 *
 * @param startDate - Start of analysis period
 * @param endDate - End of analysis period
 * @returns Journey statistics
 *
 * @example
 * ```typescript
 * const stats = await getJourneyStats(
 *   new Date("2024-01-01"),
 *   new Date("2024-01-31")
 * );
 * console.log(stats.avgTouchpoints); // 3.5
 * console.log(stats.organicToPaidConversions); // 42
 * ```
 */
export async function getJourneyStats(
  startDate: Date,
  endDate: Date,
): Promise<JourneyStats> {
  // Get all users who converted in this period
  const conversions = await prisma.campaignAttribution.findMany({
    where: {
      convertedAt: {
        gte: startDate,
        lte: endDate,
      },
      attributionType: "FIRST_TOUCH", // One record per conversion
    },
    select: {
      userId: true,
      conversionId: true,
    },
    distinct: ["conversionId"],
  });

  const allTransitions: Record<string, PlatformTransition> = {};
  const pathCounts: Record<string, number> = {};
  let totalTouchpoints = 0;
  let organicToPaid = 0;

  for (const conversion of conversions) {
    const journey = await getUserJourney(conversion.userId);

    if (journey.length === 0) continue;

    // Count touchpoints
    totalTouchpoints += journey.length;

    // Track path
    const pathKey = journey.map((j) => j.platform).join(" → ");
    pathCounts[pathKey] = (pathCounts[pathKey] || 0) + 1;

    // Find transitions
    const transitions = findOrganicToPaidTransitions(journey);
    for (const t of transitions) {
      const key = `${t.from}->${t.to}`;
      if (!allTransitions[key]) {
        allTransitions[key] = { from: t.from, to: t.to, count: 0 };
      }
      allTransitions[key]!.count += t.count;
    }

    // Check for organic-to-paid conversion
    const hasOrganic = journey.some((j) => classifyPlatform(j.platform) === "ORGANIC");
    const lastIsPaid = journey.length > 0 &&
      classifyPlatform(journey[journey.length - 1]!.platform) === "PAID";
    if (hasOrganic && lastIsPaid) {
      organicToPaid++;
    }
  }

  // Convert path counts to sorted array
  const topJourneys = Object.entries(pathCounts)
    .map(([pathStr, count]) => ({
      path: pathStr.split(" → "),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 paths

  return {
    transitions: Object.values(allTransitions),
    topJourneys,
    avgTouchpoints: conversions.length > 0
      ? totalTouchpoints / conversions.length
      : 0,
    organicToPaidConversions: organicToPaid,
    totalConversions: conversions.length,
  };
}
