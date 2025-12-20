/**
 * User Analytics API Route
 *
 * Provides user registration, activity, and retention analytics for admin dashboard.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

export async function GET() {
  const sessionResult = await tryCatch(auth());

  if (sessionResult.error) {
    console.error("Failed to fetch user analytics:", sessionResult.error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const session = sessionResult.data;

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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  // Get date ranges
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Daily registrations for last 30 days
  const dailyRegistrationsResult = await tryCatch(
    prisma.$queryRaw<Array<{ date: Date; count: bigint; }>>`
      SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
      FROM users
      WHERE "createdAt" >= ${last30Days}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
  );

  if (dailyRegistrationsResult.error) {
    console.error(
      "Failed to fetch daily registrations:",
      dailyRegistrationsResult.error,
    );
  }
  const dailyRegistrations = dailyRegistrationsResult.data ?? [];

  // Auth provider breakdown
  const authProvidersResult = await tryCatch(
    prisma.account.groupBy({
      by: ["provider"],
      _count: {
        userId: true,
      },
    }),
  );

  if (authProvidersResult.error) {
    console.error("Failed to fetch auth providers:", authProvidersResult.error);
  }
  const authProviders = (authProvidersResult.data ?? []) as Array<{
    provider: string;
    _count: { userId: number; };
  }>;

  // Active users in last 7 days (users with sessions)
  const activeUsers7dResult = await tryCatch(
    prisma.session.findMany({
      where: {
        expires: {
          gte: last7Days,
        },
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    }),
  );

  if (activeUsers7dResult.error) {
    console.error(
      "Failed to fetch active users (7 days):",
      activeUsers7dResult.error,
    );
  }
  const activeUsers7d = activeUsers7dResult.data?.length ?? 0;

  // Active users in last 30 days
  const activeUsers30dResult = await tryCatch(
    prisma.session.findMany({
      where: {
        expires: {
          gte: last30Days,
        },
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    }),
  );

  if (activeUsers30dResult.error) {
    console.error(
      "Failed to fetch active users (30 days):",
      activeUsers30dResult.error,
    );
  }
  const activeUsers30d = activeUsers30dResult.data?.length ?? 0;

  // Total users
  const totalUsersResult = await tryCatch(prisma.user.count());

  if (totalUsersResult.error) {
    console.error("Failed to fetch total users:", totalUsersResult.error);
  }
  const totalUsers = totalUsersResult.data ?? 0;

  // User growth stats
  const usersLast7DaysResult = await tryCatch(
    prisma.user.count({
      where: {
        createdAt: {
          gte: last7Days,
        },
      },
    }),
  );

  if (usersLast7DaysResult.error) {
    console.error(
      "Failed to fetch user growth (7 days):",
      usersLast7DaysResult.error,
    );
  }
  const usersLast7Days = usersLast7DaysResult.data ?? 0;

  const usersLast30DaysResult = await tryCatch(
    prisma.user.count({
      where: {
        createdAt: {
          gte: last30Days,
        },
      },
    }),
  );

  if (usersLast30DaysResult.error) {
    console.error(
      "Failed to fetch user growth (30 days):",
      usersLast30DaysResult.error,
    );
  }
  const usersLast30Days = usersLast30DaysResult.data ?? 0;

  return NextResponse.json({
    dailyRegistrations: Array.isArray(dailyRegistrations)
      ? dailyRegistrations.map((row: { date: Date; count: bigint; }) => ({
        date: row.date.toISOString().split("T")[0],
        count: Number(row.count),
      }))
      : [],
    authProviders: Array.isArray(authProviders)
      ? authProviders.map(
        (provider: { provider: string; _count: { userId: number; }; }) => ({
          name: provider.provider,
          count: provider._count.userId,
        }),
      )
      : [],
    activeUsers: {
      last7Days: activeUsers7d,
      last30Days: activeUsers30d,
    },
    totalUsers,
    growth: {
      last7Days: usersLast7Days,
      last30Days: usersLast30Days,
    },
  });
}
