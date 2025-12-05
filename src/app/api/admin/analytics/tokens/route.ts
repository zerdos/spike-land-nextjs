/**
 * Token Economics API Route
 *
 * Provides token purchase, spending, and revenue analytics for admin dashboard.
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { requireAdminByUserId } from "@/lib/auth/admin-middleware"
import prisma from "@/lib/prisma"
import { TokenTransactionType } from "@prisma/client"

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

    // Token transactions by type
    const tokensByType = await prisma.tokenTransaction.groupBy({
      by: ["type"],
      _sum: {
        amount: true,
      },
    })

    // Daily token transactions for last 30 days
    const dailyTokens = await prisma.$queryRaw<
      Array<{ date: Date; purchased: bigint; spent: bigint }>
    >`
      SELECT
        DATE(created_at) as date,
        SUM(CASE WHEN type IN ('EARN_PURCHASE', 'EARN_BONUS', 'EARN_REGENERATION') THEN amount ELSE 0 END)::bigint as purchased,
        SUM(CASE WHEN type = 'SPEND_ENHANCEMENT' THEN ABS(amount) ELSE 0 END)::bigint as spent
      FROM token_transactions
      WHERE created_at >= ${last30Days}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Revenue from token purchases
    const revenue = await prisma.stripePayment.aggregate({
      where: {
        status: "SUCCEEDED",
      },
      _sum: {
        amountUSD: true,
      },
    })

    // Average tokens per user
    const tokenBalances = await prisma.userTokenBalance.aggregate({
      _avg: {
        balance: true,
      },
      _sum: {
        balance: true,
      },
    })

    // Token regeneration usage
    const regenerationCount = await prisma.tokenTransaction.count({
      where: {
        type: TokenTransactionType.EARN_REGENERATION,
      },
    })

    // Total tokens in circulation
    const totalTokens = tokenBalances._sum.balance || 0
    const avgTokensPerUser = tokenBalances._avg.balance || 0

    // Token purchase packages breakdown
    const packageSales = await prisma.tokensPackage.findMany({
      select: {
        name: true,
        tokens: true,
        stripePayments: {
          where: {
            status: "SUCCEEDED",
          },
          select: {
            id: true,
          },
        },
      },
    })

    return NextResponse.json({
      tokensByType: tokensByType.map((item: { type: TokenTransactionType; _sum: { amount: number | null } }) => ({
        type: item.type,
        total: Number(item._sum.amount || 0),
      })),
      dailyTokens: dailyTokens.map((row: { date: Date; purchased: bigint; spent: bigint }) => ({
        date: row.date.toISOString().split("T")[0],
        purchased: Number(row.purchased),
        spent: Number(row.spent),
      })),
      revenue: {
        total: Number(revenue._sum.amountUSD || 0),
      },
      circulation: {
        total: totalTokens,
        average: Math.round(avgTokensPerUser),
      },
      regenerationCount,
      packageSales: packageSales.map((pkg: { name: string; tokens: number; stripePayments: { id: string }[] }) => ({
        name: pkg.name,
        tokens: pkg.tokens,
        sales: pkg.stripePayments.length,
      })),
    })
  } catch (error) {
    console.error("Failed to fetch token analytics:", error)
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
