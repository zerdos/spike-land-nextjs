import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/my-apps/stats
 * Fetch comprehensive statistics for my-apps feature (admin only)
 */
export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: user, error: userError } = await tryCatch(
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    }),
  );

  if (userError || !user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel for performance
  const [
    totalApps,
    activeAppsToday,
    appsCreatedToday,
    appsCreatedThisWeek,
    totalMessages,
    messagesToday,
    userMessages,
    agentMessages,
    statusCounts,
    recentActivity,
    topUsers,
    errorRate,
    avgMessagesPerApp,
  ] = await Promise.all([
    // Total apps (excluding archived)
    prisma.app.count({
      where: { deletedAt: null },
    }),

    // Apps with activity today
    prisma.app.count({
      where: {
        deletedAt: null,
        lastAgentActivity: { gte: todayStart },
      },
    }),

    // Apps created today
    prisma.app.count({
      where: {
        createdAt: { gte: todayStart },
      },
    }),

    // Apps created this week
    prisma.app.count({
      where: {
        createdAt: { gte: weekAgo },
      },
    }),

    // Total messages
    prisma.appMessage.count({
      where: { deletedAt: null },
    }),

    // Messages today
    prisma.appMessage.count({
      where: {
        deletedAt: null,
        createdAt: { gte: todayStart },
      },
    }),

    // User messages count
    prisma.appMessage.count({
      where: { deletedAt: null, role: "USER" },
    }),

    // Agent messages count
    prisma.appMessage.count({
      where: { deletedAt: null, role: "AGENT" },
    }),

    // Status breakdown
    prisma.app.groupBy({
      by: ["status"],
      _count: true,
      where: { deletedAt: null },
    }),

    // Recent activity (last 20 events)
    prisma.appStatusHistory.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        app: {
          select: { name: true, userId: true },
        },
      },
    }),

    // Top users by app count
    prisma.app.groupBy({
      by: ["userId"],
      _count: true,
      where: { deletedAt: null },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    }),

    // Error rate (FAILED status in last week)
    prisma.appStatusHistory.count({
      where: {
        status: "FAILED",
        createdAt: { gte: weekAgo },
      },
    }),

    // Average messages per app
    prisma.appMessage.groupBy({
      by: ["appId"],
      _count: true,
      where: { deletedAt: null },
    }),
  ]);

  // Calculate derived metrics
  const avgMsgsPerApp = avgMessagesPerApp.length > 0
    ? avgMessagesPerApp.reduce((sum, a) => sum + a._count, 0) / avgMessagesPerApp.length
    : 0;

  // Format status counts
  const statusBreakdown = statusCounts.reduce(
    (acc, item) => {
      acc[item.status] = item._count;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Get user details for top users
  const topUserIds = topUsers.map((u) => u.userId);
  const userDetails = await prisma.user.findMany({
    where: { id: { in: topUserIds } },
    select: { id: true, name: true, email: true },
  });

  const topUsersWithDetails = topUsers.map((u) => {
    const user = userDetails.find((ud) => ud.id === u.userId);
    return {
      userId: u.userId,
      name: user?.name || "Unknown",
      email: user?.email || "",
      appCount: u._count,
    };
  });

  // Daily creation trend (last 7 days)
  const dailyTrend = await prisma.$queryRaw<Array<{ date: Date; count: bigint; }>>`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM "apps"
    WHERE created_at >= ${weekAgo}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;

  // Hourly activity (last 24 hours)
  const hourlyActivity = await prisma.$queryRaw<Array<{ hour: number; count: bigint; }>>`
    SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
    FROM "app_messages"
    WHERE created_at >= ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
  `;

  return NextResponse.json({
    overview: {
      totalApps,
      activeAppsToday,
      appsCreatedToday,
      appsCreatedThisWeek,
      totalMessages,
      messagesToday,
      userMessages,
      agentMessages,
      avgMessagesPerApp: Math.round(avgMsgsPerApp * 10) / 10,
      errorRateThisWeek: errorRate,
    },
    statusBreakdown,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      appName: a.app.name,
      status: a.status,
      message: a.message,
      createdAt: a.createdAt,
    })),
    topUsers: topUsersWithDetails,
    trends: {
      daily: dailyTrend.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
      hourly: hourlyActivity.map((h) => ({
        hour: Number(h.hour),
        count: Number(h.count),
      })),
    },
    generatedAt: now.toISOString(),
  });
}
