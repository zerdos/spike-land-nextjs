/**
 * Token Economics API Route
 *
 * Provides token purchase, spending, and revenue analytics for admin dashboard.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { TokenTransactionType } from "@prisma/client";
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

    // Token transactions by type
    let tokensByType: Array<{ type: TokenTransactionType; _sum: { amount: number | null; }; }> =
      [];
    try {
      const result = await prisma.tokenTransaction.groupBy({
        by: ["type"],
        _sum: {
          amount: true,
        },
      });
      tokensByType = result as Array<{
        type: TokenTransactionType;
        _sum: { amount: number | null; };
      }>;
    } catch (error) {
      console.error("Failed to fetch tokens by type:", error);
      tokensByType = [];
    }

    // Daily token transactions for last 30 days
    let dailyTokens: Array<{ date: Date; purchased: bigint; spent: bigint; }> = [];
    try {
      dailyTokens = await prisma.$queryRaw<
        Array<{ date: Date; purchased: bigint; spent: bigint; }>
      >`
        SELECT
          DATE(created_at) as date,
          SUM(CASE WHEN type IN ('EARN_PURCHASE', 'EARN_BONUS', 'EARN_REGENERATION') THEN amount ELSE 0 END)::bigint as purchased,
          SUM(CASE WHEN type = 'SPEND_ENHANCEMENT' THEN ABS(amount) ELSE 0 END)::bigint as spent
        FROM token_transactions
        WHERE created_at >= ${last30Days}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;
    } catch (error) {
      console.error("Failed to fetch daily tokens:", error);
      dailyTokens = [];
    }

    // Revenue from token purchases
    let revenue: { _sum: { amountUSD: number | null; }; } = { _sum: { amountUSD: null } };
    try {
      const result = await prisma.stripePayment.aggregate({
        where: {
          status: "SUCCEEDED",
        },
        _sum: {
          amountUSD: true,
        },
      });
      revenue = {
        _sum: {
          amountUSD: result._sum.amountUSD ? Number(result._sum.amountUSD) : null,
        },
      };
    } catch (error) {
      console.error("Failed to fetch revenue:", error);
      revenue = { _sum: { amountUSD: null } };
    }

    // Average tokens per user
    let tokenBalances: { _avg: { balance: number | null; }; _sum: { balance: number | null; }; } =
      { _avg: { balance: null }, _sum: { balance: null } };
    try {
      const result = await prisma.userTokenBalance.aggregate({
        _avg: {
          balance: true,
        },
        _sum: {
          balance: true,
        },
      });
      tokenBalances = {
        _avg: { balance: result._avg.balance },
        _sum: { balance: result._sum.balance },
      };
    } catch (error) {
      console.error("Failed to fetch token balances:", error);
      tokenBalances = { _avg: { balance: null }, _sum: { balance: null } };
    }

    // Token regeneration usage
    let regenerationCount = 0;
    try {
      regenerationCount = await prisma.tokenTransaction.count({
        where: {
          type: TokenTransactionType.EARN_REGENERATION,
        },
      });
    } catch (error) {
      console.error("Failed to fetch regeneration count:", error);
      regenerationCount = 0;
    }

    // Total tokens in circulation
    const totalTokens = tokenBalances._sum.balance || 0;
    const avgTokensPerUser = tokenBalances._avg.balance || 0;

    // Token purchase packages breakdown
    let packageSales: Array<{ name: string; tokens: number; stripePayments: { id: string; }[]; }> =
      [];
    try {
      packageSales = await prisma.tokensPackage.findMany({
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
      });
    } catch (error) {
      console.error("Failed to fetch package sales:", error);
      packageSales = [];
    }

    return NextResponse.json({
      tokensByType: Array.isArray(tokensByType)
        ? tokensByType.map((
          item: { type: TokenTransactionType; _sum: { amount: number | null; }; },
        ) => ({
          type: item.type,
          total: Number(item._sum.amount || 0),
        }))
        : [],
      dailyTokens: Array.isArray(dailyTokens)
        ? dailyTokens.map((row: { date: Date; purchased: bigint; spent: bigint; }) => ({
          date: row.date.toISOString().split("T")[0],
          purchased: Number(row.purchased || 0),
          spent: Number(row.spent || 0),
        }))
        : [],
      revenue: {
        total: Number(revenue._sum.amountUSD || 0),
      },
      circulation: {
        total: totalTokens,
        average: Math.round(avgTokensPerUser),
      },
      regenerationCount,
      packageSales: Array.isArray(packageSales)
        ? packageSales.map((
          pkg: { name: string; tokens: number; stripePayments: { id: string; }[]; },
        ) => ({
          name: pkg.name,
          tokens: pkg.tokens,
          sales: pkg.stripePayments.length,
        }))
        : [],
    });
  } catch (error) {
    console.error("Failed to fetch token analytics:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
