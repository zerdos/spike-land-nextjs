/**
 * Campaign Data Export API Route
 *
 * GET /api/admin/marketing/analytics/export - Export campaign data
 *
 * Exports campaign analytics data in CSV or JSON format:
 * - Campaign name, platform, visitors, sessions
 * - Conversion metrics (signups, enhancements, purchases)
 * - Revenue data
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
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
  format: z.enum(["csv", "json"]).default("csv"),
});

interface ExportRow {
  campaign: string;
  platform: string;
  utmSource: string;
  utmMedium: string;
  visitors: number;
  sessions: number;
  bounceRate: number;
  signups: number;
  signupRate: number;
  enhancements: number;
  enhancementRate: number;
  purchases: number;
  purchaseRate: number;
  revenue: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Failed to export campaign data:", authError);
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
    if (adminError instanceof Error && adminError.message.includes("Forbidden")) {
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
    format: searchParams.get("format") || "csv",
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { startDate, endDate, format } = parseResult.data;
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get session data grouped by campaign and source
  const { data: sessions, error: sessionsError } = await tryCatch(
    prisma.visitorSession.findMany({
      where: {
        sessionStart: {
          gte: start,
          lte: end,
        },
      },
      select: {
        utmCampaign: true,
        utmSource: true,
        utmMedium: true,
        pageViewCount: true,
      },
    }),
  );

  if (sessionsError) {
    console.error("Failed to export campaign data:", sessionsError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Group sessions by campaign key
  const sessionsByKey = new Map<
    string,
    {
      utmCampaign: string;
      utmSource: string;
      utmMedium: string;
      sessions: number;
      pageViews: number;
      bounced: number;
    }
  >();

  for (const s of sessions) {
    const campaign = s.utmCampaign || "Direct";
    const source = s.utmSource || "direct";
    const medium = s.utmMedium || "none";
    const key = `${campaign}|${source}|${medium}`;

    const existing = sessionsByKey.get(key) || {
      utmCampaign: campaign,
      utmSource: source,
      utmMedium: medium,
      sessions: 0,
      pageViews: 0,
      bounced: 0,
    };

    existing.sessions++;
    existing.pageViews += s.pageViewCount;
    if (s.pageViewCount <= 1) {
      existing.bounced++;
    }

    sessionsByKey.set(key, existing);
  }

  // Get attribution data - use FIRST_TOUCH for export
  const { data: attributions, error: attributionsError } = await tryCatch(
    prisma.campaignAttribution.findMany({
      where: {
        convertedAt: {
          gte: start,
          lte: end,
        },
        attributionType: AttributionType.FIRST_TOUCH,
      },
      select: {
        utmCampaign: true,
        utmSource: true,
        utmMedium: true,
        platform: true,
        conversionType: true,
        conversionValue: true,
      },
    }),
  );

  if (attributionsError) {
    console.error("Failed to export campaign data:", attributionsError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Group attributions by campaign key
  const attributionsByKey = new Map<
    string,
    {
      signups: number;
      enhancements: number;
      purchases: number;
      revenue: number;
      platform: string;
    }
  >();

  for (const attr of attributions) {
    const campaign = attr.utmCampaign || "Direct";
    const source = attr.utmSource || "direct";
    const medium = attr.utmMedium || "none";
    const key = `${campaign}|${source}|${medium}`;

    const existing = attributionsByKey.get(key) || {
      signups: 0,
      enhancements: 0,
      purchases: 0,
      revenue: 0,
      platform: determinePlatform(attr.platform),
    };

    if (attr.conversionType === "SIGNUP") {
      existing.signups++;
    } else if (attr.conversionType === "ENHANCEMENT") {
      existing.enhancements++;
    } else if (attr.conversionType === "PURCHASE") {
      existing.purchases++;
      existing.revenue += attr.conversionValue ?? 0;
    }

    attributionsByKey.set(key, existing);
  }

  // Build export data
  const exportData: ExportRow[] = [];

  // Combine all keys from sessions and attributions
  const allKeys = new Set([
    ...sessionsByKey.keys(),
    ...attributionsByKey.keys(),
  ]);

  for (const key of allKeys) {
    const sessionData = sessionsByKey.get(key);
    const attrData = attributionsByKey.get(key);

    const keyParts = key.split("|");
    const campaign = keyParts[0] ?? "Direct";
    const source = keyParts[1] ?? "direct";
    const medium = keyParts[2] ?? "none";

    const sessionCount = sessionData?.sessions ?? 0;
    const visitors = sessionData?.pageViews ?? 0;
    const bounced = sessionData?.bounced ?? 0;
    const bounceRate = sessionCount > 0
      ? Math.round((bounced / sessionCount) * 10000) / 100
      : 0;

    const signups = attrData?.signups ?? 0;
    const enhancements = attrData?.enhancements ?? 0;
    const purchases = attrData?.purchases ?? 0;
    const revenue = attrData?.revenue ?? 0;

    // Calculate rates
    const signupRate = sessionCount > 0
      ? Math.round((signups / sessionCount) * 10000) / 100
      : 0;
    const enhancementRate = signups > 0
      ? Math.round((enhancements / signups) * 10000) / 100
      : 0;
    const purchaseRate = enhancements > 0
      ? Math.round((purchases / enhancements) * 10000) / 100
      : 0;

    exportData.push({
      campaign,
      platform: attrData?.platform ?? determinePlatform(source),
      utmSource: source,
      utmMedium: medium,
      visitors,
      sessions: sessionCount,
      bounceRate,
      signups,
      signupRate,
      enhancements,
      enhancementRate,
      purchases,
      purchaseRate,
      revenue: Math.round(revenue * 100) / 100,
    });
  }

  // Sort by visitors descending
  exportData.sort((a, b) => b.visitors - a.visitors);

  if (format === "json") {
    return NextResponse.json({
      dateRange: {
        start: startDate,
        end: endDate,
      },
      exportedAt: new Date().toISOString(),
      data: exportData,
    });
  }

  // Generate CSV
  const csvHeaders = [
    "Campaign",
    "Platform",
    "UTM Source",
    "UTM Medium",
    "Visitors",
    "Sessions",
    "Bounce Rate (%)",
    "Signups",
    "Signup Rate (%)",
    "Enhancements",
    "Enhancement Rate (%)",
    "Purchases",
    "Purchase Rate (%)",
    "Revenue",
  ];

  const csvRows = exportData.map((row) => [
    escapeCsvField(row.campaign),
    escapeCsvField(row.platform),
    escapeCsvField(row.utmSource),
    escapeCsvField(row.utmMedium),
    row.visitors,
    row.sessions,
    row.bounceRate,
    row.signups,
    row.signupRate,
    row.enhancements,
    row.enhancementRate,
    row.purchases,
    row.purchaseRate,
    row.revenue,
  ]);

  const csvContent = [
    csvHeaders.join(","),
    ...csvRows.map((row) => row.join(",")),
  ].join("\n");

  // Generate filename with date range
  const filename = `campaign-analytics-${startDate}-to-${endDate}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Escape a field for CSV output
 */
function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Determine the platform category from utm_source or platform string
 */
function determinePlatform(source: string | null): string {
  if (!source) return "Direct";

  const s = source.toLowerCase();

  if (s.includes("facebook") || s.includes("fb") || s.includes("instagram")) {
    return "Facebook";
  }
  if (s.includes("google") || s.includes("gclid")) {
    return "Google";
  }
  // UTM source check for Twitter/X - check common patterns
  if (s.includes("twitter") || s === "x" || s.startsWith("x_")) {
    return "Twitter/X";
  }
  if (s.includes("linkedin")) {
    return "LinkedIn";
  }
  if (s.includes("tiktok")) {
    return "TikTok";
  }
  if (s.includes("email") || s.includes("newsletter")) {
    return "Email";
  }
  if (s.includes("referral")) {
    return "Referral";
  }

  return "Organic";
}
