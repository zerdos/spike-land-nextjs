/**
 * Campaign Performance List API Route
 *
 * GET /api/admin/marketing/analytics/campaigns - Get campaign performance metrics
 *
 * Provides per-campaign performance data including:
 * - Visitor and session counts
 * - Bounce rates
 * - Conversion metrics (signups, enhancements, purchases)
 * - Revenue attribution
 *
 * Uses metrics caching for improved performance.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { buildCacheKey, getOrComputeMetrics } from "@/lib/tracking/metrics-cache";
import { tryCatch } from "@/lib/try-catch";
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
  attributionModel: z.enum(["FIRST_TOUCH", "LAST_TOUCH"]).nullish().default(
    "FIRST_TOUCH",
  ),
  platform: z.string().nullish(),
  limit: z.coerce.number().min(1).max(100).nullish().default(50),
  offset: z.coerce.number().min(0).nullish().default(0),
});

interface CampaignMetrics {
  name: string;
  platform: string;
  visitors: number;
  sessions: number;
  bounceRate: number;
  signups: number;
  signupRate: number;
  enhancements: number;
  purchases: number;
  revenue: number;
}

interface CampaignResponse {
  campaigns: CampaignMetrics[];
  total: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Failed to fetch campaign performance:", authError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Parse and validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const parseResult = querySchema.safeParse({
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    attributionModel: searchParams.get("attributionModel") || "FIRST_TOUCH",
    platform: searchParams.get("platform"),
    limit: searchParams.get("limit") || 50,
    offset: searchParams.get("offset") || 0,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { startDate, endDate, attributionModel, platform, limit, offset } = parseResult.data;
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Build cache key for this query (excluding pagination for base data)
  const cacheKey = buildCacheKey("campaigns", {
    startDate,
    endDate,
    attributionModel: attributionModel ?? "FIRST_TOUCH",
    platform: platform ?? undefined,
  });

  // Use cached metrics or compute fresh
  const { data: allCampaigns, error: metricsError } = await tryCatch(
    getOrComputeMetrics<CampaignMetrics[]>(
      cacheKey,
      async () => {
        // Group sessions by campaign (utm_campaign) and source
        const sessionGroups = await prisma.visitorSession.groupBy({
          by: ["utmCampaign", "utmSource"],
          where: {
            sessionStart: {
              gte: start,
              lte: end,
            },
            ...(platform && { utmSource: platform }),
          },
          _count: {
            id: true,
            visitorId: true,
          },
          _sum: {
            pageViewCount: true,
          },
        });

        // Get sessions for bounce rate calculation (sessions with only 1 page view)
        const sessionsWithPageCount = await prisma.visitorSession.findMany({
          where: {
            sessionStart: {
              gte: start,
              lte: end,
            },
            ...(platform && { utmSource: platform }),
          },
          select: {
            utmCampaign: true,
            utmSource: true,
            pageViewCount: true,
          },
        });

        // Calculate bounce rates per campaign
        const bounceRates = new Map<
          string,
          { total: number; bounced: number; }
        >();
        for (const session of sessionsWithPageCount) {
          const key = `${session.utmCampaign || "Direct"}|${session.utmSource || "direct"}`;
          const current = bounceRates.get(key) || { total: 0, bounced: 0 };
          current.total++;
          if (session.pageViewCount <= 1) {
            current.bounced++;
          }
          bounceRates.set(key, current);
        }

        // Get attribution data grouped by campaign
        const attributions = await prisma.campaignAttribution.findMany({
          where: {
            convertedAt: {
              gte: start,
              lte: end,
            },
            attributionType: attributionModel as AttributionType,
            ...(platform && { platform }),
          },
          select: {
            utmCampaign: true,
            platform: true,
            conversionType: true,
            conversionValue: true,
          },
        });

        // Aggregate attribution data by campaign
        const attributionsByKey = new Map<
          string,
          {
            signups: number;
            enhancements: number;
            purchases: number;
            revenue: number;
          }
        >();

        for (const attr of attributions) {
          const key = `${attr.utmCampaign || "Direct"}|${attr.platform || "direct"}`;
          const current = attributionsByKey.get(key) || {
            signups: 0,
            enhancements: 0,
            purchases: 0,
            revenue: 0,
          };

          if (attr.conversionType === "SIGNUP") {
            current.signups++;
          } else if (attr.conversionType === "ENHANCEMENT") {
            current.enhancements++;
          } else if (attr.conversionType === "PURCHASE") {
            current.purchases++;
            current.revenue += attr.conversionValue ?? 0;
          }

          attributionsByKey.set(key, current);
        }

        // Build campaign metrics
        const campaignMap = new Map<string, CampaignMetrics>();

        for (const group of sessionGroups) {
          const campaignName = group.utmCampaign || "Direct";
          const platformName = determinePlatform(group.utmSource);
          const key = `${campaignName}|${group.utmSource || "direct"}`;

          const bounceData = bounceRates.get(key) || { total: 0, bounced: 0 };
          const bounceRate = bounceData.total > 0
            ? Math.round((bounceData.bounced / bounceData.total) * 10000) / 100
            : 0;

          const attrData = attributionsByKey.get(key) || {
            signups: 0,
            enhancements: 0,
            purchases: 0,
            revenue: 0,
          };

          const uniqueVisitors = group._count.visitorId;
          const signupRate = uniqueVisitors > 0
            ? Math.round((attrData.signups / uniqueVisitors) * 10000) / 100
            : 0;

          campaignMap.set(key, {
            name: campaignName,
            platform: platformName,
            visitors: group._sum.pageViewCount ?? 0,
            sessions: group._count.id,
            bounceRate,
            signups: attrData.signups,
            signupRate,
            enhancements: attrData.enhancements,
            purchases: attrData.purchases,
            revenue: Math.round(attrData.revenue * 100) / 100,
          });
        }

        // Convert to array and sort by visitors descending
        return Array.from(campaignMap.values()).sort(
          (a, b) => b.visitors - a.visitors,
        );
      },
      300, // Cache for 5 minutes
    ),
  );

  if (metricsError) {
    console.error("Failed to fetch campaign performance:", metricsError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Apply pagination (done after caching since pagination params vary)
  const total = allCampaigns.length;
  const paginatedCampaigns = allCampaigns.slice(
    offset ?? 0,
    (offset ?? 0) + (limit ?? 50),
  );

  const response: CampaignResponse = {
    campaigns: paginatedCampaigns,
    total,
  };

  return NextResponse.json(response);
}

/**
 * Determine the platform/traffic source category from utm_source
 */
function determinePlatform(utmSource: string | null): string {
  if (!utmSource) return "Direct";

  const source = utmSource.toLowerCase();

  if (
    source.includes("facebook") || source.includes("fb") ||
    source.includes("instagram")
  ) {
    return "Facebook";
  }
  if (source.includes("google") || source.includes("gclid")) {
    return "Google";
  }
  // UTM source check for Twitter/X - check common patterns
  if (source.includes("twitter") || source === "x" || source.startsWith("x_")) {
    return "Twitter/X";
  }
  if (source.includes("linkedin")) {
    return "LinkedIn";
  }
  if (source.includes("tiktok")) {
    return "TikTok";
  }
  if (source.includes("email") || source.includes("newsletter")) {
    return "Email";
  }
  if (source.includes("referral")) {
    return "Referral";
  }

  return "Organic";
}
