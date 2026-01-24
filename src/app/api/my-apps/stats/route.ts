import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

/**
 * GET /api/my-apps/stats
 * Fetch statistics for the current user's apps
 */
export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [
    totalApps,
    activeApps,
    archivedApps,
    totalMessages,
    myMessages,
    agentReplies,
    statusCounts,
    recentApps,
    messagesByDay,
  ] = await Promise.all([
    // Total apps (excluding deleted)
    prisma.app.count({
      where: { userId, deletedAt: null },
    }),

    // Active apps (not archived status)
    prisma.app.count({
      where: {
        userId,
        deletedAt: null,
        status: { not: "ARCHIVED" },
      },
    }),

    // Archived/deleted apps
    prisma.app.count({
      where: {
        userId,
        OR: [{ deletedAt: { not: null } }, { status: "ARCHIVED" }],
      },
    }),

    // Total messages across all my apps
    prisma.appMessage.count({
      where: {
        deletedAt: null,
        app: { userId },
      },
    }),

    // My messages (USER role)
    prisma.appMessage.count({
      where: {
        deletedAt: null,
        role: "USER",
        app: { userId },
      },
    }),

    // Agent replies
    prisma.appMessage.count({
      where: {
        deletedAt: null,
        role: "AGENT",
        app: { userId },
      },
    }),

    // Status breakdown
    prisma.app.groupBy({
      by: ["status"],
      _count: true,
      where: { userId, deletedAt: null },
    }),

    // Recent apps with activity
    prisma.app.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
        codespaceId: true,
        createdAt: true,
        lastAgentActivity: true,
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),

    // Messages per day (last 7 days)
    prisma.$queryRaw<Array<{ date: Date; count: bigint; }>>`
      SELECT DATE(m.created_at) as date, COUNT(*) as count
      FROM "app_messages" m
      JOIN "apps" a ON m.app_id = a.id
      WHERE a.user_id = ${userId}
        AND m.created_at >= ${weekAgo}
        AND m.deleted_at IS NULL
      GROUP BY DATE(m.created_at)
      ORDER BY date DESC
    `,
  ]);

  // Calculate derived metrics
  const responseRate = myMessages > 0
    ? Math.round((agentReplies / myMessages) * 100)
    : 0;

  // Format status counts
  const statusBreakdown = statusCounts.reduce(
    (acc, item) => {
      acc[item.status] = item._count;
      return acc;
    },
    {} as Record<string, number>,
  );

  return NextResponse.json({
    overview: {
      totalApps,
      activeApps,
      archivedApps,
      totalMessages,
      myMessages,
      agentReplies,
      responseRate,
    },
    statusBreakdown,
    recentApps: recentApps.map((app) => ({
      id: app.id,
      name: app.name,
      status: app.status,
      codespaceId: app.codespaceId,
      messageCount: app._count.messages,
      createdAt: app.createdAt,
      lastActivity: app.lastAgentActivity,
    })),
    activityTrend: messagesByDay.map((d) => ({
      date: d.date,
      count: Number(d.count),
    })),
    generatedAt: now.toISOString(),
  });
}
