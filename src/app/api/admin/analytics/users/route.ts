/**
 * User Analytics API Route
 *
 * Provides user registration, activity, and retention analytics for admin dashboard.
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { requireAdminByUserId } from "@/lib/auth/admin-middleware"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireAdminByUserId(session.user.id)

    // Get date ranges
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Daily registrations for last 30 days
    const dailyRegistrations = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM users
      WHERE created_at >= ${last30Days}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Auth provider breakdown
    const authProviders = await prisma.account.groupBy({
      by: ["provider"],
      _count: {
        userId: true,
      },
    })

    // Active users in last 7 days (users with sessions)
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
    })
    const activeUsers7d = activeUsers7dList.length

    // Active users in last 30 days
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
    })
    const activeUsers30d = activeUsers30dList.length

    // Total users
    const totalUsers = await prisma.user.count()

    // User growth stats
    const usersLast7Days = await prisma.user.count({
      where: {
        createdAt: {
          gte: last7Days,
        },
      },
    })

    const usersLast30Days = await prisma.user.count({
      where: {
        createdAt: {
          gte: last30Days,
        },
      },
    })

    return NextResponse.json({
      dailyRegistrations: dailyRegistrations.map((row) => ({
        date: row.date.toISOString().split("T")[0],
        count: Number(row.count),
      })),
      authProviders: authProviders.map((provider) => ({
        name: provider.provider,
        count: provider._count.userId,
      })),
      activeUsers: {
        last7Days: activeUsers7d,
        last30Days: activeUsers30d,
      },
      totalUsers,
      growth: {
        last7Days: usersLast7Days,
        last30Days: usersLast30Days,
      },
    })
  } catch (error) {
    console.error("Failed to fetch user analytics:", error)
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
