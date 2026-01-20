/**
 * Campaign Analytics Overview API Route
 *
 * GET /api/admin/marketing/analytics/overview - Get campaign overview metrics
 *
 * Provides aggregated campaign analytics including:
 * - Total and unique visitors
 * - Session counts
 * - Conversion metrics (signups, enhancements, purchases)
 * - Revenue and conversion rates
 * - Trend comparisons vs previous period
 *
 * Uses metrics caching for improved performance.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { buildCacheKey, getOrComputeMetrics } from "@/lib/tracking/metrics-cache";
import type { AttributionType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date format",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end date format",
  }),
  attributionModel: z.enum(["FIRST_TOUCH", "LAST_TOUCH"]).optional().default(
    "FIRST_TOUCH",
  ),
});

interface OverviewMetrics {
  metrics: {
    visitors: number;
    visitorsChange: number;
    signups: number;
    signupsChange: number;
    conversionRate: number;
    conversionRateChange: number;
    revenue: number;
    revenueChange: number;
  };
  daily: Array<{
    date: string;
    visitors: number;
    conversions: number;
  }>;
  trafficSources: Array<{
    name: string;
    value: number;
  }>;
}

import { tryCatch } from "@/lib/try-catch";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    console.error("Admin check failed:", adminError);
    if (
      adminError instanceof Error && adminError.message.includes("Forbidden")
    ) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }

  // Parse and validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const parseResult = querySchema.safeParse({
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    attributionModel: searchParams.get("attributionModel") || "FIRST_TOUCH",
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { startDate, endDate, attributionModel } = parseResult.data;
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include entire end day

  // Build cache key for this query
  const cacheKey = buildCacheKey("overview", {
    startDate,
    endDate,
    attributionModel,
  });

  // Use cached metrics or compute fresh
  const { data: response, error: cacheError } = await tryCatch(
    getOrComputeMetrics<OverviewMetrics>(
      cacheKey,
      async () => {
        // Calculate previous period for trends
        const periodLength = end.getTime() - start.getTime();
        const previousStart = new Date(start.getTime() - periodLength);
        const previousEnd = new Date(start.getTime() - 1);

        // Query current period metrics
        const { data: currentMetrics, error: currentError } = await tryCatch(
          getRawMetrics(start, end, attributionModel as AttributionType),
        );

        if (currentError || !currentMetrics) throw currentError;

        // Query previous period metrics for trends
        const { data: previousMetrics, error: previousError } = await tryCatch(
          getRawMetrics(
            previousStart,
            previousEnd,
            attributionModel as AttributionType,
          ),
        );

        if (previousError || !previousMetrics) throw previousError;

        // Get daily breakdown
        const { data: daily, error: dailyError } = await tryCatch(
          getDailyMetrics(start, end),
        );

        if (dailyError || !daily) throw dailyError;

        // Get traffic sources breakdown
        const { data: trafficSources, error: trafficError } = await tryCatch(
          getTrafficSources(start, end),
        );

        if (trafficError || !trafficSources) throw trafficError;

        // Build response in expected format
        return {
          metrics: {
            visitors: currentMetrics.uniqueVisitors,
            visitorsChange: calculatePercentageChange(
              previousMetrics.uniqueVisitors,
              currentMetrics.uniqueVisitors,
            ),
            signups: currentMetrics.signups,
            signupsChange: calculatePercentageChange(
              previousMetrics.signups,
              currentMetrics.signups,
            ),
            conversionRate: currentMetrics.signupConversionRate,
            conversionRateChange: calculatePercentageChange(
              previousMetrics.signupConversionRate,
              currentMetrics.signupConversionRate,
            ),
            revenue: currentMetrics.revenue,
            revenueChange: calculatePercentageChange(
              previousMetrics.revenue,
              currentMetrics.revenue,
            ),
          },
          daily,
          trafficSources,
        };
      },
      300, // Cache for 5 minutes
    ),
  );

  if (cacheError) {
    console.error("Failed to fetch campaign overview:", cacheError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json(response);
}

interface RawMetrics {
  totalVisitors: number;
  uniqueVisitors: number;
  totalSessions: number;
  signups: number;
  signupConversionRate: number;
  enhancements: number;
  enhancementConversionRate: number;
  purchases: number;
  purchaseConversionRate: number;
  revenue: number;
}

async function getRawMetrics(
  startDate: Date,
  endDate: Date,
  attributionModel: AttributionType,
): Promise<RawMetrics> {
  // Get visitor sessions in date range
  const sessions = await prisma.visitorSession.findMany({
    where: {
      sessionStart: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      visitorId: true,
      pageViewCount: true,
    },
  });

  const totalSessions = sessions.length;
  const uniqueVisitors = new Set(sessions.map((s) => s.visitorId)).size;
  const totalVisitors = sessions.reduce((sum, s) => sum + s.pageViewCount, 0);

  // Get conversions from attribution table
  const attributions = await prisma.campaignAttribution.findMany({
    where: {
      convertedAt: {
        gte: startDate,
        lte: endDate,
      },
      attributionType: attributionModel,
    },
    select: {
      conversionType: true,
      conversionValue: true,
    },
  });

  // Count conversions by type
  const signups = attributions.filter((a) => a.conversionType === "SIGNUP").length;
  const enhancements = attributions.filter((a) => a.conversionType === "ENHANCEMENT").length;
  const purchases = attributions.filter((a) => a.conversionType === "PURCHASE").length;

  // Calculate revenue from purchases
  const revenue = attributions
    .filter((a) => a.conversionType === "PURCHASE")
    .reduce((sum, a) => sum + (a.conversionValue ?? 0), 0);

  // Calculate conversion rates (against unique visitors)
  const signupConversionRate = uniqueVisitors > 0
    ? Math.round((signups / uniqueVisitors) * 10000) / 100
    : 0;

  // Enhancement rate: signups who enhanced
  const enhancementConversionRate = signups > 0
    ? Math.round((enhancements / signups) * 10000) / 100
    : 0;

  // Purchase rate: enhancements who purchased
  const purchaseConversionRate = enhancements > 0
    ? Math.round((purchases / enhancements) * 10000) / 100
    : 0;

  return {
    totalVisitors,
    uniqueVisitors,
    totalSessions,
    signups,
    signupConversionRate,
    enhancements,
    enhancementConversionRate,
    purchases,
    purchaseConversionRate,
    revenue: Math.round(revenue * 100) / 100,
  };
}

function calculatePercentageChange(previous: number, current: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 100) / 100;
}

/**
 * Get daily visitor and conversion metrics for the date range
 */
async function getDailyMetrics(
  startDate: Date,
  endDate: Date,
): Promise<Array<{ date: string; visitors: number; conversions: number; }>> {
  // Group sessions by day
  const sessions = await prisma.visitorSession.findMany({
    where: {
      sessionStart: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      sessionStart: true,
      visitorId: true,
    },
  });

  // Group conversions by day
  const conversions = await prisma.campaignAttribution.findMany({
    where: {
      convertedAt: {
        gte: startDate,
        lte: endDate,
      },
      attributionType: "FIRST_TOUCH",
      conversionType: "SIGNUP",
    },
    select: {
      convertedAt: true,
    },
  });

  // Aggregate by date
  const dailyMap = new Map<
    string,
    { visitors: Set<string>; conversions: number; }
  >();

  // Initialize all dates in range
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = current.toISOString().split("T")[0]!;
    dailyMap.set(dateKey, { visitors: new Set(), conversions: 0 });
    current.setDate(current.getDate() + 1);
  }

  // Count unique visitors per day
  for (const session of sessions) {
    const dateKey = session.sessionStart.toISOString().split("T")[0]!;
    const day = dailyMap.get(dateKey);
    if (day) {
      day.visitors.add(session.visitorId);
    }
  }

  // Count conversions per day
  for (const conversion of conversions) {
    const dateKey = conversion.convertedAt.toISOString().split("T")[0]!;
    const day = dailyMap.get(dateKey);
    if (day) {
      day.conversions++;
    }
  }

  // Convert to array format
  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      visitors: data.visitors.size,
      conversions: data.conversions,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get traffic sources breakdown
 */
async function getTrafficSources(
  startDate: Date,
  endDate: Date,
): Promise<Array<{ name: string; value: number; }>> {
  const sessions = await prisma.visitorSession.findMany({
    where: {
      sessionStart: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      utmSource: true,
      referrer: true,
      gclid: true,
      fbclid: true,
    },
  });

  // Categorize traffic sources
  const sourceMap = new Map<string, number>();

  for (const session of sessions) {
    let source = "Direct";

    if (session.gclid) {
      source = "Google Ads";
    } else if (session.fbclid) {
      source = "Facebook";
    } else if (session.utmSource) {
      const utmLower = session.utmSource.toLowerCase();
      if (utmLower.includes("google")) {
        source = "Google";
      } else if (utmLower.includes("facebook") || utmLower.includes("fb")) {
        source = "Facebook";
      } else if (utmLower.includes("twitter") || utmLower === "x") {
        source = "Twitter/X";
      } else if (
        utmLower.includes("email") || utmLower.includes("newsletter")
      ) {
        source = "Email";
      } else {
        source = "Other";
      }
    } else if (session.referrer) {
      try {
        const url = new URL(session.referrer);
        const host = url.hostname.toLowerCase();
        if (host.includes("google")) {
          source = "Organic Search";
        } else if (host.includes("bing") || host.includes("duckduckgo")) {
          source = "Organic Search";
        } else {
          source = "Referral";
        }
      } catch {
        // Intentionally silent: Malformed referrer URL - default to "Referral" source.
        source = "Referral";
      }
    }

    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  }

  // Convert to array and sort by value
  return Array.from(sourceMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
