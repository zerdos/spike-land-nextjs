/**
 * Conversion Funnel API Route
 *
 * GET /api/admin/marketing/analytics/funnel - Get funnel metrics
 *
 * Provides conversion funnel data showing the drop-off between stages:
 * - Visitors -> Signups -> Enhancements -> Purchases
 * - Can be filtered by campaign or platform
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
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
  utmCampaign: z.string().nullish(),
  platform: z.string().nullish(),
});

interface FunnelStage {
  name: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

interface CampaignOption {
  id: string;
  name: string;
}

interface FunnelResponse {
  stages: FunnelStage[];
  campaigns: CampaignOption[];
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
    utmCampaign: searchParams.get("utmCampaign"),
    platform: searchParams.get("platform"),
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { startDate, endDate, utmCampaign, platform } = parseResult.data;
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Build session filter
  const sessionFilter: {
    sessionStart: { gte: Date; lte: Date; };
    utmCampaign?: string;
    utmSource?: { contains: string; mode: "insensitive"; };
  } = {
    sessionStart: {
      gte: start,
      lte: end,
    },
  };

  if (utmCampaign) {
    sessionFilter.utmCampaign = utmCampaign;
  }

  if (platform) {
    sessionFilter.utmSource = {
      contains: platform,
      mode: "insensitive",
    };
  }

  // Get unique visitors count
  const { data: uniqueVisitorSessions, error: visitorsError } = await tryCatch(
    prisma.visitorSession.findMany({
      where: sessionFilter,
      select: {
        visitorId: true,
      },
      distinct: ["visitorId"],
    }),
  );

  if (visitorsError) {
    console.error("Failed to fetch unique visitors:", visitorsError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const visitorsCount = uniqueVisitorSessions?.length || 0;

  // Build attribution filter
  const attributionFilter: {
    convertedAt: { gte: Date; lte: Date; };
    utmCampaign?: string;
    platform?: { contains: string; mode: "insensitive"; };
  } = {
    convertedAt: {
      gte: start,
      lte: end,
    },
  };

  if (utmCampaign) {
    attributionFilter.utmCampaign = utmCampaign;
  }

  if (platform) {
    attributionFilter.platform = {
      contains: platform,
      mode: "insensitive",
    };
  }

  // Get unique users per conversion type (count users, not events)
  const { data: signupUsers, error: signupError } = await tryCatch(
    prisma.campaignAttribution.findMany({
      where: { ...attributionFilter, conversionType: "SIGNUP" },
      select: { userId: true },
      distinct: ["userId"],
    }),
  );

  const { data: enhancementUsers, error: enhancementError } = await tryCatch(
    prisma.campaignAttribution.findMany({
      where: { ...attributionFilter, conversionType: "ENHANCEMENT" },
      select: { userId: true },
      distinct: ["userId"],
    }),
  );

  const { data: purchaseUsers, error: purchaseError } = await tryCatch(
    prisma.campaignAttribution.findMany({
      where: { ...attributionFilter, conversionType: "PURCHASE" },
      select: { userId: true },
      distinct: ["userId"],
    }),
  );

  if (signupError || enhancementError || purchaseError) {
    console.error(
      "Failed to fetch conversion data:",
      signupError || enhancementError || purchaseError,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const signupsCount = signupUsers?.length || 0;
  const enhancementsCount = enhancementUsers?.length || 0;
  const purchasesCount = purchaseUsers?.length || 0;

  // Calculate conversion rates
  // Visitors is the baseline (100%)
  // Signups rate is % of visitors who signed up
  // Enhancements rate is % of signups who enhanced
  // Purchases rate is % of enhancements who purchased

  const signupConversionRate = visitorsCount > 0
    ? Math.round((signupsCount / visitorsCount) * 10000) / 100
    : 0;

  const enhancementConversionRate = signupsCount > 0
    ? Math.round((enhancementsCount / signupsCount) * 10000) / 100
    : 0;

  const purchaseConversionRate = enhancementsCount > 0
    ? Math.round((purchasesCount / enhancementsCount) * 10000) / 100
    : 0;

  // Calculate drop-off rates (% that didn't continue to next stage)
  const visitorDropoff = visitorsCount > 0
    ? Math.round(((visitorsCount - signupsCount) / visitorsCount) * 10000) /
      100
    : 0;
  const signupDropoff = signupsCount > 0
    ? Math.round(
      ((signupsCount - enhancementsCount) / signupsCount) * 10000,
    ) / 100
    : 0;
  const enhancementDropoff = enhancementsCount > 0
    ? Math.round(
      ((enhancementsCount - purchasesCount) / enhancementsCount) * 10000,
    ) / 100
    : 0;

  const stages: FunnelStage[] = [
    {
      name: "Visitors",
      count: visitorsCount,
      conversionRate: 100,
      dropoffRate: visitorDropoff,
    },
    {
      name: "Signups",
      count: signupsCount,
      conversionRate: signupConversionRate,
      dropoffRate: signupDropoff,
    },
    {
      name: "Enhancements",
      count: enhancementsCount,
      conversionRate: enhancementConversionRate,
      dropoffRate: enhancementDropoff,
    },
    {
      name: "Purchases",
      count: purchasesCount,
      conversionRate: purchaseConversionRate,
      dropoffRate: 0, // Last stage has no dropoff
    },
  ];

  // Get unique campaigns for the filter dropdown
  const { data: uniqueCampaigns, error: campaignsError } = await tryCatch(
    prisma.visitorSession.findMany({
      where: {
        utmCampaign: { not: null },
        sessionStart: {
          gte: start,
          lte: end,
        },
      },
      select: {
        utmCampaign: true,
      },
      distinct: ["utmCampaign"],
    }),
  );

  if (campaignsError) {
    console.error("Failed to fetch campaigns:", campaignsError);
  }

  const campaigns: CampaignOption[] = (uniqueCampaigns || [])
    .filter((c): c is { utmCampaign: string; } => c.utmCampaign !== null)
    .map((c) => ({
      id: c.utmCampaign,
      name: c.utmCampaign,
    }));

  const response: FunnelResponse = {
    stages,
    campaigns,
  };

  return NextResponse.json(response);
}
