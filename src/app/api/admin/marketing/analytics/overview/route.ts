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
import { AttributionType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date format",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end date format",
  }),
  attributionModel: z.enum(["FIRST_TOUCH", "LAST_TOUCH"]).optional().default("FIRST_TOUCH"),
});

interface OverviewMetrics {
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
  trends: {
    visitors: number;
    signups: number;
    revenue: number;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

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
    const response = await getOrComputeMetrics<OverviewMetrics>(
      cacheKey,
      async () => {
        // Calculate previous period for trends
        const periodLength = end.getTime() - start.getTime();
        const previousStart = new Date(start.getTime() - periodLength);
        const previousEnd = new Date(start.getTime() - 1);

        // Query current period metrics
        const currentMetrics = await getMetrics(
          start,
          end,
          attributionModel as AttributionType,
        );

        // Query previous period metrics for trends
        const previousMetrics = await getMetrics(
          previousStart,
          previousEnd,
          attributionModel as AttributionType,
        );

        // Calculate trends (percentage change)
        const trends = {
          visitors: calculatePercentageChange(
            previousMetrics.uniqueVisitors,
            currentMetrics.uniqueVisitors,
          ),
          signups: calculatePercentageChange(
            previousMetrics.signups,
            currentMetrics.signups,
          ),
          revenue: calculatePercentageChange(
            previousMetrics.revenue,
            currentMetrics.revenue,
          ),
        };

        return {
          ...currentMetrics,
          trends,
        };
      },
      300, // Cache for 5 minutes
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch campaign overview:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function getMetrics(
  startDate: Date,
  endDate: Date,
  attributionModel: AttributionType,
): Promise<Omit<OverviewMetrics, "trends">> {
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
