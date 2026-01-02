/**
 * Daily Metrics API Route
 *
 * GET /api/admin/marketing/analytics/daily - Get daily metrics for charts
 *
 * Provides daily aggregated data for time-series visualizations:
 * - Daily visitors
 * - Daily signups
 * - Daily revenue
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
  metrics: z.enum(["visitors", "signups", "revenue"]).optional(),
});

interface DailyData {
  date: string;
  visitors: number;
  signups: number;
  revenue: number;
}

interface DailyResponse {
  data: DailyData[];
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
    metrics: searchParams.get("metrics"),
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { startDate, endDate } = parseResult.data;
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Initialize daily data structure for all dates in range
  const dailyMap = new Map<string, DailyData>();
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split("T")[0] as string;
    dailyMap.set(dateKey, {
      date: dateKey,
      visitors: 0,
      signups: 0,
      revenue: 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Query daily visitors using raw SQL for date grouping
  const { data: dailyVisitors, error: visitorsError } = await tryCatch(
    prisma.$queryRaw<Array<{ date: Date; count: bigint; }>>`
        SELECT DATE(session_start) as date, COUNT(DISTINCT visitor_id)::bigint as count
        FROM visitor_sessions
        WHERE session_start >= ${start} AND session_start <= ${end}
        GROUP BY DATE(session_start)
        ORDER BY date ASC
      `,
  );

  if (visitorsError) {
    console.error("Failed to fetch daily visitors:", visitorsError);
  }

  // Query daily signups
  const { data: dailySignups, error: signupsError } = await tryCatch(
    prisma.$queryRaw<Array<{ date: Date; count: bigint; }>>`
        SELECT DATE(converted_at) as date, COUNT(*)::bigint as count
        FROM campaign_attributions
        WHERE converted_at >= ${start} AND converted_at <= ${end}
        AND conversion_type = 'SIGNUP'
        GROUP BY DATE(converted_at)
        ORDER BY date ASC
      `,
  );

  if (signupsError) {
    console.error("Failed to fetch daily signups:", signupsError);
  }

  // Query daily revenue
  const { data: dailyRevenue, error: revenueError } = await tryCatch(
    prisma.$queryRaw<Array<{ date: Date; revenue: number; }>>`
        SELECT DATE(converted_at) as date, COALESCE(SUM(conversion_value), 0)::numeric as revenue
        FROM campaign_attributions
        WHERE converted_at >= ${start} AND converted_at <= ${end}
        AND conversion_type = 'PURCHASE'
        GROUP BY DATE(converted_at)
        ORDER BY date ASC
      `,
  );

  if (revenueError) {
    console.error("Failed to fetch daily revenue:", revenueError);
  }

  // Populate daily map with query results
  if (dailyVisitors) {
    for (const row of dailyVisitors) {
      const dateKey = row.date.toISOString().split("T")[0] as string;
      const existing = dailyMap.get(dateKey);
      if (existing) {
        existing.visitors = Number(row.count);
      }
    }
  }

  if (dailySignups) {
    for (const row of dailySignups) {
      const dateKey = row.date.toISOString().split("T")[0] as string;
      const existing = dailyMap.get(dateKey);
      if (existing) {
        existing.signups = Number(row.count);
      }
    }
  }

  if (dailyRevenue) {
    for (const row of dailyRevenue) {
      const dateKey = row.date.toISOString().split("T")[0] as string;
      const existing = dailyMap.get(dateKey);
      if (existing) {
        existing.revenue = Math.round(Number(row.revenue) * 100) / 100;
      }
    }
  }

  // Convert map to sorted array
  const data = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const response: DailyResponse = {
    data,
  };

  return NextResponse.json(response);
}
