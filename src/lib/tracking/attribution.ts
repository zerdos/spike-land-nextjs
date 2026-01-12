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
type AttributionType = "FIRST_TOUCH" | "LAST_TOUCH" | "LINEAR";

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
    externalCampaignId: firstSession.gclid || firstSession.fbclid || undefined,
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
    externalCampaignId: lastSession.gclid || lastSession.fbclid || undefined,
    utmParams: extractUTMFromSession(lastSession),
  });

  // Create linear attribution records for all sessions
  const linearValue = value && sessions.length > 0
    ? value / sessions.length
    : undefined;
  for (const session of sessions) {
    await createAttribution({
      userId,
      sessionId: session.id,
      conversionId,
      attributionType: "LINEAR",
      conversionType,
      conversionValue: linearValue,
      platform: await determineSessionPlatform(session),
      externalCampaignId: session.gclid || session.fbclid || undefined,
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
    model: AttributionType | "LINEAR";
    value: number;
    conversionCount: number;
  }[];
  platformBreakdown: {
    platform: string;
    conversionCount: number;
    value: number;
    model: AttributionType | "LINEAR";
  }[];
}> {
  const attributions = await prisma.campaignAttribution.findMany({
    where: {
      convertedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Group by conversionId
  const conversions = new Map<string, CampaignAttribution[]>();
  for (const attr of attributions) {
    if (!conversions.has(attr.conversionId)) {
      conversions.set(attr.conversionId, []);
    }
    conversions.get(attr.conversionId)!.push(attr);
  }

  const comparison = {
    FIRST_TOUCH: { value: 0, count: 0 },
    LAST_TOUCH: { value: 0, count: 0 },
    LINEAR: { value: 0, count: 0 },
  };

  const platformStats = new Map<string, {
    platform: string;
    model: AttributionType | "LINEAR";
    value: number;
    count: number;
  }>();

  const getKey = (platform: string, model: string) => `${platform}|${model}`;

  for (const conversionAttrs of conversions.values()) {
    // Process each model type
    const firstTouch = conversionAttrs.find(a => a.attributionType === "FIRST_TOUCH");
    const lastTouch = conversionAttrs.find(a => a.attributionType === "LAST_TOUCH");
    const linearAttrs = conversionAttrs.filter(a => a.attributionType === "LINEAR");

    // First Touch
    if (firstTouch) {
      comparison.FIRST_TOUCH.value += firstTouch.conversionValue || 0;
      comparison.FIRST_TOUCH.count++;

      const platform = firstTouch.platform || "UNKNOWN";
      const key = getKey(platform, "FIRST_TOUCH");
      if (!platformStats.has(key)) {
        platformStats.set(key, { platform, model: "FIRST_TOUCH", value: 0, count: 0 });
      }
      const stat = platformStats.get(key)!;
      stat.value += firstTouch.conversionValue || 0;
      stat.count++;
    }

    // Last Touch
    if (lastTouch) {
      comparison.LAST_TOUCH.value += lastTouch.conversionValue || 0;
      comparison.LAST_TOUCH.count++;

      const platform = lastTouch.platform || "UNKNOWN";
      const key = getKey(platform, "LAST_TOUCH");
      if (!platformStats.has(key)) {
        platformStats.set(key, { platform, model: "LAST_TOUCH", value: 0, count: 0 });
      }
      const stat = platformStats.get(key)!;
      stat.value += lastTouch.conversionValue || 0;
      stat.count++;
    }

    // Linear
    if (linearAttrs.length > 0) {
      const totalLinearValue = linearAttrs.reduce((sum, a) => sum + (a.conversionValue || 0), 0);
      comparison.LINEAR.value += totalLinearValue;
      comparison.LINEAR.count++; // Count conversion once for Linear model

      for (const attr of linearAttrs) {
        const platform = attr.platform || "UNKNOWN";
        const key = getKey(platform, "LINEAR");
        if (!platformStats.has(key)) {
          platformStats.set(key, { platform, model: "LINEAR", value: 0, count: 0 });
        }
        const stat = platformStats.get(key)!;
        stat.value += attr.conversionValue || 0;
        stat.count += 1; // Touchpoint count
      }
    }
  }

  return {
    totalConversions: conversions.size,
    comparison: [
      {
        model: "FIRST_TOUCH",
        ...comparison.FIRST_TOUCH,
        conversionCount: comparison.FIRST_TOUCH.count,
      },
      {
        model: "LAST_TOUCH",
        ...comparison.LAST_TOUCH,
        conversionCount: comparison.LAST_TOUCH.count,
      },
      { model: "LINEAR", ...comparison.LINEAR, conversionCount: comparison.LINEAR.count },
    ],
    platformBreakdown: Array.from(platformStats.values()).map(s => ({
      platform: s.platform,
      conversionCount: s.count,
      value: s.value,
      model: s.model,
    })),
  };
}
