/**
 * User Analytics API Route
 *
 * Provides user registration, activity, and retention analytics for admin dashboard.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdminByUserId(session.user.id);

    // Get date ranges
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Daily registrations for last 30 days
    let dailyRegistrations: Array<{ date: Date; count: bigint; }> = [];
    try {
      dailyRegistrations = await prisma.$queryRaw<
        Array<{ date: Date; count: bigint; }>
      >`
        SELECT DATE(created_at) as date, COUNT(*)::bigint as count
        FROM users
        WHERE created_at >= ${last30Days}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;
    } catch (error) {
      console.error("Failed to fetch daily registrations:", error);
      // Return empty array on error, don't fail entire request
      dailyRegistrations = [];
    }

    // Auth provider breakdown
    let authProviders: Array<{ provider: string; _count: { userId: number; }; }> = [];
    try {
      const result = await prisma.account.groupBy({
        by: ["provider"],
        _count: {
          userId: true,
        },
      });
      authProviders = result as Array<
        { provider: string; _count: { userId: number; }; }
      >;
    } catch (error) {
      console.error("Failed to fetch auth providers:", error);
      // Return empty array on error
      authProviders = [];
    }

    // Active users in last 7 days (users with sessions)
    let activeUsers7d = 0;
    try {
      const activeUsers7dList = await prisma.session.findMany({
        where: {
          expires: {
            gte: last7Days,
          },
        },
        distinct: ["userId"],
        select: {
          userId: true,
        },
      });
      activeUsers7d = activeUsers7dList.length;
    } catch (error) {
      console.error("Failed to fetch active users (7 days):", error);
      activeUsers7d = 0;
    }

    // Active users in last 30 days
    let activeUsers30d = 0;
    try {
      const activeUsers30dList = await prisma.session.findMany({
        where: {
          expires: {
            gte: last30Days,
          },
        },
        distinct: ["userId"],
        select: {
          userId: true,
        },
      });
      activeUsers30d = activeUsers30dList.length;
    } catch (error) {
      console.error("Failed to fetch active users (30 days):", error);
      activeUsers30d = 0;
    }

    // Total users
    let totalUsers = 0;
    try {
      totalUsers = await prisma.user.count();
    } catch (error) {
      console.error("Failed to fetch total users:", error);
      totalUsers = 0;
    }

    // User growth stats
    let usersLast7Days = 0;
    try {
      usersLast7Days = await prisma.user.count({
        where: {
          createdAt: {
            gte: last7Days,
          },
        },
      });
    } catch (error) {
      console.error("Failed to fetch user growth (7 days):", error);
      usersLast7Days = 0;
    }

    let usersLast30Days = 0;
    try {
      usersLast30Days = await prisma.user.count({
        where: {
          createdAt: {
            gte: last30Days,
          },
        },
      });
    } catch (error) {
      console.error("Failed to fetch user growth (30 days):", error);
      usersLast30Days = 0;
    }

    return NextResponse.json({
      dailyRegistrations: Array.isArray(dailyRegistrations)
        ? dailyRegistrations.map((row: { date: Date; count: bigint; }) => ({
          date: row.date.toISOString().split("T")[0],
          count: Number(row.count),
        }))
        : [],
      authProviders: Array.isArray(authProviders)
        ? authProviders.map((
          provider: { provider: string; _count: { userId: number; }; },
        ) => ({
          name: provider.provider,
          count: provider._count.userId,
        }))
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
  } catch (error) {
    console.error("Failed to fetch user analytics:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
