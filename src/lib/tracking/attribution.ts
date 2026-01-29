/**
 * Campaign Attribution Utilities
 *
 * Manages multi-touch attribution tracking for campaign analytics.
 * Supports first-touch and last-touch attribution models.
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { CampaignAttribution, VisitorSession } from "@prisma/client";
import { randomUUID } from "crypto";
import { getPlatformFromUTM, type UTMParams } from "./utm-capture";

/**
 * Attribution types matching Prisma schema
 */
type AttributionType = "FIRST_TOUCH" | "LAST_TOUCH" | "LINEAR" | "TIME_DECAY" | "POSITION_BASED";

/**
 * Conversion types matching Prisma schema
 */
type ConversionType = "SIGNUP" | "ENHANCEMENT" | "PURCHASE";

/**
 * Parameters for creating an attribution record
 */
export interface AttributionParams {
  /** User ID to attribute */
  userId: string;
  /** Session ID associated with the conversion */
  sessionId: string;
  /** Unique ID for the conversion event */
  conversionId: string;
  /** Attribution model type */
  attributionType: AttributionType;
  /** Conversion type */
  conversionType: ConversionType;
  /** Optional conversion value (e.g., tokens, revenue) */
  conversionValue?: number;
  /** Platform identifier */
  platform?: string;
  /** External campaign ID from ad platform */
  externalCampaignId?: string;
  /** UTM parameters */
  utmParams?: UTMParams;
}

/**
 * Create an attribution record in the database
 *
 * @param params - Attribution parameters
 *
 * @example
 * ```typescript
 * await createAttribution({
 *   userId: user.id,
 *   sessionId: session.id,
 *   attributionType: "FIRST_TOUCH",
 *   conversionType: "SIGNUP",
 *   utmParams: { utm_source: "google", utm_campaign: "brand" },
 * });
 * ```
 */
export async function createAttribution(
  params: AttributionParams,
): Promise<void> {
  const {
    userId,
    sessionId,
    conversionId,
    attributionType,
    conversionType,
    conversionValue,
    platform,
    externalCampaignId,
    utmParams,
  } = params;

  // Determine platform from UTM params if not provided
  const derivedPlatform = platform ||
    (utmParams ? getPlatformFromUTM(utmParams) : "DIRECT");

  await prisma.campaignAttribution.create({
    data: {
      userId,
      sessionId,
      conversionId,
      attributionType,
      conversionType,
      conversionValue,
      platform: derivedPlatform,
      externalCampaignId,
      utmCampaign: utmParams?.utm_campaign,
      utmSource: utmParams?.utm_source,
      utmMedium: utmParams?.utm_medium,
    },
  });
}

/**
 * Get the first-touch attribution for a user
 *
 * Returns the attribution record from the user's first tracked session.
 *
 * @param userId - The user ID to look up
 * @returns The first-touch attribution or null
 *
 * @example
 * ```typescript
 * const firstTouch = await getFirstTouchAttribution(user.id);
 * if (firstTouch) {
 *   console.log(`First touch: ${firstTouch.utmCampaign}`);
 * }
 * ```
 */
export async function getFirstTouchAttribution(
  userId: string,
): Promise<CampaignAttribution | null> {
  return prisma.campaignAttribution.findFirst({
    where: {
      userId,
      attributionType: "FIRST_TOUCH",
    },
    orderBy: {
      convertedAt: "asc",
    },
  });
}

/**
 * Get the last-touch attribution for a user
 *
 * Returns the most recent attribution record for the user.
 *
 * @param userId - The user ID to look up
 * @returns The last-touch attribution or null
 *
 * @example
 * ```typescript
 * const lastTouch = await getLastTouchAttribution(user.id);
 * if (lastTouch) {
 *   console.log(`Last touch: ${lastTouch.utmCampaign}`);
 * }
 * ```
 */
export async function getLastTouchAttribution(
  userId: string,
): Promise<CampaignAttribution | null> {
  return prisma.campaignAttribution.findFirst({
    where: {
      userId,
      attributionType: "LAST_TOUCH",
    },
    orderBy: {
      convertedAt: "desc",
    },
  });
}

/**
 * Get all attributions for a user
 *
 * @param userId - The user ID to look up
 * @returns Array of attribution records
 */
export async function getAllAttributions(
  userId: string,
): Promise<CampaignAttribution[]> {
  return prisma.campaignAttribution.findMany({
    where: { userId },
    orderBy: { convertedAt: "desc" },
  });
}

/**
 * Record a conversion with both first-touch and last-touch attribution
 *
 * This function:
 * 1. Gets the user's first session (first touch)
 * 2. Gets the user's most recent session (last touch)
 * 3. Creates both FIRST_TOUCH and LAST_TOUCH attribution records
 *
 * @param userId - The user ID to attribute
 * @param conversionType - Type of conversion
 * @param value - Optional conversion value
 *
 * @example
 * ```typescript
 * // On successful signup
 * await attributeConversion(user.id, "SIGNUP");
 *
 * // On purchase
 * await attributeConversion(user.id, "PURCHASE", 9.99);
 *
 * // On enhancement
 * await attributeConversion(user.id, "ENHANCEMENT", 100); // tokens
 * ```
 */
export async function attributeConversion(
  userId: string,
  conversionType: ConversionType,
  value?: number,
): Promise<void> {
  // Get user's sessions ordered by start time
  const sessions = await prisma.visitorSession.findMany({
    where: { userId },
    orderBy: { sessionStart: "asc" },
  });

  if (sessions.length === 0) {
    // No sessions found - try to find sessions by visitor ID linked to user
    // This handles cases where the user was linked after session creation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      console.warn(`No user found for attribution: ${userId}`);
      return;
    }

    // Create a minimal attribution with no session data
    await createDirectAttribution(userId, conversionType, value);
    return;
  }

  const firstSession = sessions[0]!;
  const lastSession = sessions[sessions.length - 1]!;
  const conversionId = randomUUID();

  // Create first-touch attribution
  await createAttribution({
    userId,
    sessionId: firstSession.id,
    conversionId,
    attributionType: "FIRST_TOUCH",
    conversionType,
    conversionValue: value,
    platform: await determineSessionPlatform(firstSession),
    externalCampaignId: (await getExternalCampaignId(firstSession)) ||
      firstSession.gclid ||
      firstSession.fbclid ||
      undefined,
    utmParams: extractUTMFromSession(firstSession),
  });

  // Create last-touch attribution (if different from first)
  // Always create both for proper multi-touch analysis
  await createAttribution({
    userId,
    sessionId: lastSession.id,
    conversionId,
    attributionType: "LAST_TOUCH",
    conversionType,
    conversionValue: value,
    platform: await determineSessionPlatform(lastSession),
    externalCampaignId: (await getExternalCampaignId(lastSession)) ||
      lastSession.gclid ||
      lastSession.fbclid ||
      undefined,
    utmParams: extractUTMFromSession(lastSession),
  });

  // Create linear attribution records for all sessions
  const linearValue = value && sessions.length > 0 ? value / sessions.length : undefined;
  for (const session of sessions) {
    await createAttribution({
      userId,
      sessionId: session.id,
      conversionId,
      attributionType: "LINEAR",
      conversionType,
      conversionValue: linearValue,
      platform: await determineSessionPlatform(session),
      externalCampaignId: (await getExternalCampaignId(session)) ||
        session.gclid ||
        session.fbclid ||
        undefined,
      utmParams: extractUTMFromSession(session),
    });
  }

  // Create time-decay attribution records for all sessions
  const conversionDate = new Date();
  const timeDecayWeights = calculateTimeDecayAttribution(sessions, conversionDate);
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i]!;
    const weight = timeDecayWeights[i]!;
    const timeDecayValue = value ? value * weight : undefined;

    await createAttribution({
      userId,
      sessionId: session.id,
      conversionId,
      attributionType: "TIME_DECAY",
      conversionType,
      conversionValue: timeDecayValue,
      platform: await determineSessionPlatform(session),
      externalCampaignId: (await getExternalCampaignId(session)) ||
        session.gclid ||
        session.fbclid ||
        undefined,
      utmParams: extractUTMFromSession(session),
    });
  }

  // Create position-based attribution records for all sessions
  const positionWeights = calculatePositionBasedAttribution(sessions);
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i]!;
    const weight = positionWeights[i]!;
    const positionValue = value ? value * weight : undefined;

    await createAttribution({
      userId,
      sessionId: session.id,
      conversionId,
      attributionType: "POSITION_BASED",
      conversionType,
      conversionValue: positionValue,
      platform: await determineSessionPlatform(session),
      externalCampaignId: (await getExternalCampaignId(session)) ||
        session.gclid ||
        session.fbclid ||
        undefined,
      utmParams: extractUTMFromSession(session),
    });
  }
}

/**
 * Create a direct attribution when no session data is available
 *
 * @param userId - The user ID
 * @param conversionType - Type of conversion
 * @param value - Optional conversion value
 */
async function createDirectAttribution(
  userId: string,
  conversionType: ConversionType,
  value?: number,
): Promise<void> {
  // Create a placeholder session for direct attribution
  const session = await prisma.visitorSession.create({
    data: {
      visitorId: `direct_${userId}`,
      userId,
      landingPage: "/",
      pageViewCount: 0,
    },
  });
  const conversionId = randomUUID();

  // Create all attribution records with DIRECT platform
  await prisma.campaignAttribution.createMany({
    data: [
      {
        userId,
        sessionId: session.id,
        conversionId,
        attributionType: "FIRST_TOUCH",
        conversionType,
        conversionValue: value,
        platform: "DIRECT",
      },
      {
        userId,
        sessionId: session.id,
        conversionId,
        attributionType: "LAST_TOUCH",
        conversionType,
        conversionValue: value,
        platform: "DIRECT",
      },
      {
        userId,
        sessionId: session.id,
        conversionId,
        attributionType: "LINEAR",
        conversionType,
        conversionValue: value,
        platform: "DIRECT",
      },
      {
        userId,
        sessionId: session.id,
        conversionId,
        attributionType: "TIME_DECAY",
        conversionType,
        conversionValue: value,
        platform: "DIRECT",
      },
      {
        userId,
        sessionId: session.id,
        conversionId,
        attributionType: "POSITION_BASED",
        conversionType,
        conversionValue: value,
        platform: "DIRECT",
      },
    ],
  });
}

/**
 * Safely parse a URL and return the hostname, or null if invalid
 *
 * @param url - The URL string to parse
 * @returns The hostname or null if parsing fails
 */
async function safeParseUrlHostname(url: string): Promise<string | null> {
  const { data, error } = await tryCatch(
    Promise.resolve().then(() => new URL(url).hostname.toLowerCase()),
  );
  if (error) {
    return null;
  }
  return data;
}

/**
 * Determine the platform from session data
 *
 * @param session - The visitor session
 * @returns Platform identifier
 */
async function determineSessionPlatform(
  session: VisitorSession,
): Promise<string> {
  // Check click IDs first
  if (session.gclid) {
    return "GOOGLE_ADS";
  }
  if (session.fbclid) {
    return "FACEBOOK";
  }

  // Check UTM source
  const source = session.utmSource?.toLowerCase();
  if (source) {
    if (source.includes("google") || source.includes("gads")) {
      return "GOOGLE_ADS";
    }
    if (
      source.includes("facebook") ||
      source.includes("fb") ||
      source.includes("instagram") ||
      source.includes("meta")
    ) {
      return "FACEBOOK";
    }
    return "OTHER";
  }

  // Check referrer for organic search using proper URL parsing
  const referrer = session.referrer;
  if (referrer) {
    const hostname = await safeParseUrlHostname(referrer);
    if (hostname) {
      // Check if the hostname ends with the search engine domain
      const isOrganic = hostname === "google.com" ||
        hostname.endsWith(".google.com") ||
        hostname === "bing.com" ||
        hostname.endsWith(".bing.com") ||
        hostname === "duckduckgo.com" ||
        hostname.endsWith(".duckduckgo.com");
      if (isOrganic) {
        return "ORGANIC";
      }
    }
    return "OTHER";
  }

  return "DIRECT";
}

/**
 * Get the external campaign ID from a session's UTM campaign
 *
 * @param session - The visitor session
 * @returns The external campaign ID or null
 */
async function getExternalCampaignId(
  session: VisitorSession,
): Promise<string | null> {
  if (!session.utmCampaign) {
    return null;
  }

  const campaignLink = await prisma.campaignLink.findUnique({
    where: {
      utmCampaign_platform: {
        utmCampaign: session.utmCampaign,
        platform: await determineSessionPlatform(session),
      },
    },
  });

  return campaignLink?.externalCampaignId || null;
}

/**
 * Extract UTM parameters from a session
 *
 * @param session - The visitor session
 * @returns UTMParams object
 */
function extractUTMFromSession(session: VisitorSession): UTMParams {
  return {
    utm_source: session.utmSource || undefined,
    utm_medium: session.utmMedium || undefined,
    utm_campaign: session.utmCampaign || undefined,
    utm_term: session.utmTerm || undefined,
    utm_content: session.utmContent || undefined,
    gclid: session.gclid || undefined,
    fbclid: session.fbclid || undefined,
  };
}

/**
 * Calculate the number of days between a session date and conversion date
 *
 * @param sessionDate - The session start date
 * @param conversionDate - The conversion date
 * @returns Number of days difference (can be fractional)
 */
export function calculateDaysDifference(
  sessionDate: Date,
  conversionDate: Date,
): number {
  const diffMs = conversionDate.getTime() - sessionDate.getTime();
  return diffMs / (1000 * 60 * 60 * 24); // Convert milliseconds to days
}

/**
 * Calculate time-decay attribution weights for sessions
 *
 * Uses exponential decay with a 7-day half-life by default.
 * Formula: weight = e^(-0.1 * days_ago)
 *
 * @param sessions - Array of sessions ordered by time
 * @param conversionDate - Date of conversion
 * @param halfLifeDays - Half-life in days (default: 7)
 * @returns Array of weights for each session
 *
 * @example
 * ```typescript
 * const sessions = await getSessionsForUser(userId);
 * const weights = calculateTimeDecayAttribution(sessions, new Date(), 7);
 * // Session 1 day ago gets ~0.93 weight
 * // Session 7 days ago gets ~0.50 weight
 * // Session 14 days ago gets ~0.25 weight
 * ```
 */
export function calculateTimeDecayAttribution(
  sessions: VisitorSession[],
  conversionDate: Date,
  halfLifeDays: number = 7,
): number[] {
  if (sessions.length === 0) return [];

  // Calculate decay rate from half-life: ln(0.5) / half_life = -0.693147 / 7 ≈ -0.099
  const decayRate = Math.log(0.5) / halfLifeDays;

  // Calculate raw weights using exponential decay
  const rawWeights = sessions.map((session) => {
    const daysBefore = calculateDaysDifference(session.sessionStart, conversionDate);
    // Clamp to 0 if future date (shouldn't happen, but safe)
    const daysAgo = Math.max(0, daysBefore);
    return Math.exp(decayRate * daysAgo);
  });

  // Normalize weights to sum to 1
  const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return sessions.map(() => 1 / sessions.length); // Fallback to equal

  return rawWeights.map((w) => w / totalWeight);
}

/**
 * Calculate position-based attribution weights for sessions
 *
 * Assigns 40% to first touch, 40% to last touch, and 20% distributed equally among middle touches.
 * If only 1 session: 100% to that session
 * If only 2 sessions: 50% each
 *
 * @param sessions - Array of sessions ordered by time
 * @returns Array of weights for each session
 *
 * @example
 * ```typescript
 * const sessions = [session1, session2, session3, session4, session5];
 * const weights = calculatePositionBasedAttribution(sessions);
 * // Results: [0.4, 0.067, 0.067, 0.067, 0.4]
 * // First: 40%, Middle 3: 6.7% each (20/3), Last: 40%
 * ```
 */
export function calculatePositionBasedAttribution(
  sessions: VisitorSession[],
  firstTouchWeight: number = 0.4,
  lastTouchWeight: number = 0.4,
  middleTouchWeight: number = 0.2,
): number[] {
  if (sessions.length === 0) return [];
  if (sessions.length === 1) return [1.0]; // 100% to only session
  if (sessions.length === 2) return [0.5, 0.5]; // 50/50 split

  const weights = new Array(sessions.length).fill(0);

  // Assign first and last touch
  weights[0] = firstTouchWeight;
  weights[sessions.length - 1] = lastTouchWeight;

  // Distribute middle weight equally
  const middleCount = sessions.length - 2;
  const perMiddleWeight = middleTouchWeight / middleCount;
  for (let i = 1; i < sessions.length - 1; i++) {
    weights[i] = perMiddleWeight;
  }

  return weights;
}

/**
 * Get attribution summary for a campaign
 *
 * @param campaignName - The campaign name to analyze
 * @param startDate - Start of analysis period
 * @param endDate - End of analysis period
 * @returns Attribution summary statistics
 */
export async function getCampaignAttributionSummary(
  campaignName: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  totalConversions: number;
  firstTouchValue: number;
  lastTouchValue: number;
  linearValue: number;
  conversionsByType: Record<ConversionType, number>;
}> {
  const attributions = await prisma.campaignAttribution.findMany({
    where: {
      utmCampaign: campaignName,
      convertedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Group by conversionId to correctly sum values and count conversions
  const conversions = new Map<string, CampaignAttribution[]>();
  for (const attr of attributions) {
    if (!conversions.has(attr.conversionId)) {
      conversions.set(attr.conversionId, []);
    }
    conversions.get(attr.conversionId)!.push(attr);
  }

  const summary = {
    totalConversions: conversions.size,
    firstTouchValue: 0,
    lastTouchValue: 0,
    linearValue: 0,
    conversionsByType: {
      SIGNUP: 0,
      ENHANCEMENT: 0,
      PURCHASE: 0,
    } as Record<ConversionType, number>,
  };

  for (const conversionAttrs of conversions.values()) {
    const firstTouch = conversionAttrs.find(
      (a) => a.attributionType === "FIRST_TOUCH",
    );
    const lastTouch = conversionAttrs.find(
      (a) => a.attributionType === "LAST_TOUCH",
    );
    const linearAttrs = conversionAttrs.filter(
      (a) => a.attributionType === "LINEAR",
    );

    if (firstTouch) {
      summary.firstTouchValue += firstTouch.conversionValue || 0;
      summary.conversionsByType[
        firstTouch.conversionType as ConversionType
      ]++;
    }
    if (lastTouch) {
      summary.lastTouchValue += lastTouch.conversionValue || 0;
    }
    summary.linearValue += linearAttrs.reduce(
      (sum, a) => sum + (a.conversionValue || 0),
      0,
    );
  }

  return summary;
}

/**
 * Check if a user already has attribution for a specific conversion type
 *
 * Useful to prevent duplicate attribution records.
 *
 * @param userId - The user ID
 * @param conversionType - The conversion type to check
 * @returns true if attribution exists
 */
export async function hasExistingAttribution(
  userId: string,
  conversionType: ConversionType,
): Promise<boolean> {
  const count = await prisma.campaignAttribution.count({
    where: {
      userId,
      conversionType,
    },
  });

  return count > 0;
}

/**
 * Get global attribution summary for all campaigns
 *
 * @param startDate - Start of analysis period
 * @param endDate - End of analysis period
 * @returns Global attribution summary statistics with platform breakdown
 */
export async function getGlobalAttributionSummary(
  startDate: Date,
  endDate: Date,
): Promise<{
  totalConversions: number;
  comparison: {
    model: AttributionType;
    value: number;
    conversionCount: number;
  }[];
  platformBreakdown: {
    platform: string;
    conversionCount: number;
    value: number;
    model: AttributionType;
  }[];
}> {
  const where = {
    convertedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  const [totalConversions, modelStats, platformStats] = await Promise.all([
    // Total conversions is simply the count of FIRST_TOUCH records
    prisma.campaignAttribution.count({
      where: { ...where, attributionType: "FIRST_TOUCH" },
    }),
    // Aggregated stats by model
    prisma.campaignAttribution.groupBy({
      by: ["attributionType"],
      where,
      _sum: { conversionValue: true },
      _count: { _all: true },
    }),
    // Aggregated stats by platform and model
    prisma.campaignAttribution.groupBy({
      by: ["platform", "attributionType"],
      where,
      _sum: { conversionValue: true },
      _count: { _all: true },
    }),
  ]);

  // Map model stats to comparison array
  const models: AttributionType[] = [
    "FIRST_TOUCH",
    "LAST_TOUCH",
    "LINEAR",
    "TIME_DECAY",
    "POSITION_BASED",
  ];
  const comparison = models.map((model) => {
    const stat = modelStats.find((s) => s.attributionType === model);
    return {
      model,
      value: stat?._sum?.conversionValue || 0,
      // For First/Last, count is conversion count. For multi-touch models (LINEAR, TIME_DECAY, POSITION_BASED),
      // count of attributions is usually higher, but the total conversion count remains the same.
      conversionCount: model === "FIRST_TOUCH" || model === "LAST_TOUCH"
        ? (stat?._count?._all || 0)
        : totalConversions, // Each conversion has multi-touch attribution
    };
  });

  const platformBreakdown = platformStats.map((s) => ({
    platform: s.platform || "UNKNOWN",
    conversionCount: s._count?._all || 0,
    value: s._sum?.conversionValue || 0,
    model: s.attributionType as AttributionType,
  }));

  return {
    totalConversions,
    comparison,
    platformBreakdown,
  };
}
