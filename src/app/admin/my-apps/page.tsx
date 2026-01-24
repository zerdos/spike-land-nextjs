import { auth } from "@/auth";
import { MyAppsDashboardClient } from "@/components/admin/MyAppsDashboardClient";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMyAppsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Verify admin status
  const { data: user, error: userError } = await tryCatch(
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    }),
  );

  if (userError || !user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/");
  }

  // Fetch initial stats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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
    prisma.app.count({ where: { deletedAt: null } }),
    prisma.app.count({
      where: { deletedAt: null, lastAgentActivity: { gte: todayStart } },
    }),
    prisma.app.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.app.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.appMessage.count({ where: { deletedAt: null } }),
    prisma.appMessage.count({
      where: { deletedAt: null, createdAt: { gte: todayStart } },
    }),
    prisma.appMessage.count({ where: { deletedAt: null, role: "USER" } }),
    prisma.appMessage.count({ where: { deletedAt: null, role: "AGENT" } }),
    prisma.app.groupBy({
      by: ["status"],
      _count: true,
      where: { deletedAt: null },
    }),
    prisma.appStatusHistory.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { app: { select: { name: true, userId: true } } },
    }),
    prisma.app.groupBy({
      by: ["userId"],
      _count: true,
      where: { deletedAt: null },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    }),
    prisma.appStatusHistory.count({
      where: { status: "FAILED", createdAt: { gte: weekAgo } },
    }),
    prisma.appMessage.groupBy({
      by: ["appId"],
      _count: true,
      where: { deletedAt: null },
    }),
  ]);

  const avgMsgsPerApp = avgMessagesPerApp.length > 0
    ? avgMessagesPerApp.reduce((sum, a) => sum + a._count, 0) / avgMessagesPerApp.length
    : 0;

  const statusBreakdown = statusCounts.reduce(
    (acc, item) => {
      acc[item.status] = item._count;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topUserIds = topUsers.map((u) => u.userId);
  const userDetails = await prisma.user.findMany({
    where: { id: { in: topUserIds } },
    select: { id: true, name: true, email: true },
  });

  const topUsersWithDetails = topUsers.map((u) => {
    const userDetail = userDetails.find((ud) => ud.id === u.userId);
    return {
      userId: u.userId,
      name: userDetail?.name || "Unknown",
      email: userDetail?.email || "",
      appCount: u._count,
    };
  });

  const dailyTrend = await prisma.$queryRaw<Array<{ date: Date; count: bigint; }>>`
    SELECT DATE("createdAt") as date, COUNT(*) as count
    FROM "apps"
    WHERE "createdAt" >= ${weekAgo}
    GROUP BY DATE("createdAt")
    ORDER BY date DESC
  `;

  const hourlyActivity = await prisma.$queryRaw<Array<{ hour: number; count: bigint; }>>`
    SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*) as count
    FROM "app_messages"
    WHERE "createdAt" >= ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}
    GROUP BY EXTRACT(HOUR FROM "createdAt")
    ORDER BY hour
  `;

  const initialStats = {
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
      createdAt: a.createdAt.toISOString(),
    })),
    topUsers: topUsersWithDetails,
    trends: {
      daily: dailyTrend.map((d) => ({
        date: d.date.toISOString(),
        count: Number(d.count),
      })),
      hourly: hourlyActivity.map((h) => ({
        hour: Number(h.hour),
        count: Number(h.count),
      })),
    },
    generatedAt: now.toISOString(),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <MyAppsDashboardClient initialStats={initialStats} />
    </div>
  );
}
