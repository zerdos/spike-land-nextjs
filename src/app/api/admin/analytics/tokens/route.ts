/**
 * Token Economics API Route
 *
 * Provides token purchase, spending, and revenue analytics for admin dashboard.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { TokenTransactionType } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  const sessionResult = await tryCatch(auth());

  if (sessionResult.error) {
    console.error("Failed to fetch token analytics:", sessionResult.error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const session = sessionResult.data;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminResult = await tryCatch(requireAdminByUserId(session.user.id));

  if (adminResult.error) {
    console.error("Failed to fetch token analytics:", adminResult.error);
    if (
      adminResult.error instanceof Error &&
      adminResult.error.message.includes("Forbidden")
    ) {
      return NextResponse.json(
        { error: adminResult.error.message },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Get date ranges
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Token transactions by type
  const tokensByTypeResult = await tryCatch(
    prisma.tokenTransaction.groupBy({
      by: ["type"],
      _sum: {
        amount: true,
      },
    }),
  );

  let tokensByType: Array<
    { type: TokenTransactionType; _sum: { amount: number | null; }; }
  > = [];
  if (tokensByTypeResult.error) {
    console.error("Failed to fetch tokens by type:", tokensByTypeResult.error);
  } else {
    tokensByType = tokensByTypeResult.data as Array<{
      type: TokenTransactionType;
      _sum: { amount: number | null; };
    }>;
  }

  // Daily token transactions for last 30 days
  const dailyTokensResult = await tryCatch(
    prisma.$queryRaw<Array<{ date: Date; purchased: bigint; spent: bigint; }>>`
      SELECT
        DATE(created_at) as date,
        SUM(CASE WHEN type IN ('EARN_PURCHASE', 'EARN_BONUS', 'EARN_REGENERATION') THEN amount ELSE 0 END)::bigint as purchased,
        SUM(CASE WHEN type = 'SPEND_ENHANCEMENT' THEN ABS(amount) ELSE 0 END)::bigint as spent
      FROM token_transactions
      WHERE created_at >= ${last30Days}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
  );

  let dailyTokens: Array<{ date: Date; purchased: bigint; spent: bigint; }> = [];
  if (dailyTokensResult.error) {
    console.error("Failed to fetch daily tokens:", dailyTokensResult.error);
  } else {
    dailyTokens = dailyTokensResult.data;
  }

  // Revenue from token purchases
  const revenueResult = await tryCatch(
    prisma.stripePayment.aggregate({
      where: {
        status: "SUCCEEDED",
      },
      _sum: {
        amountUSD: true,
      },
    }),
  );

  let revenue: { _sum: { amountUSD: number | null; }; } = {
    _sum: { amountUSD: null },
  };
  if (revenueResult.error) {
    console.error("Failed to fetch revenue:", revenueResult.error);
  } else {
    revenue = {
      _sum: {
        amountUSD: revenueResult.data._sum.amountUSD
          ? Number(revenueResult.data._sum.amountUSD)
          : null,
      },
    };
  }

  // Average tokens per user
  const tokenBalancesResult = await tryCatch(
    prisma.userTokenBalance.aggregate({
      _avg: {
        balance: true,
      },
      _sum: {
        balance: true,
      },
    }),
  );

  let tokenBalances: {
    _avg: { balance: number | null; };
    _sum: { balance: number | null; };
  } = {
    _avg: { balance: null },
    _sum: { balance: null },
  };
  if (tokenBalancesResult.error) {
    console.error("Failed to fetch token balances:", tokenBalancesResult.error);
  } else {
    tokenBalances = {
      _avg: { balance: tokenBalancesResult.data._avg.balance },
      _sum: { balance: tokenBalancesResult.data._sum.balance },
    };
  }

  // Token regeneration usage
  const regenerationCountResult = await tryCatch(
    prisma.tokenTransaction.count({
      where: {
        type: TokenTransactionType.EARN_REGENERATION,
      },
    }),
  );

  let regenerationCount = 0;
  if (regenerationCountResult.error) {
    console.error(
      "Failed to fetch regeneration count:",
      regenerationCountResult.error,
    );
  } else {
    regenerationCount = regenerationCountResult.data;
  }

  // Total tokens in circulation
  const totalTokens = tokenBalances._sum.balance || 0;
  const avgTokensPerUser = tokenBalances._avg.balance || 0;

  // Token purchase packages breakdown
  const packageSalesResult = await tryCatch(
    prisma.tokensPackage.findMany({
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
    }),
  );

  let packageSales: Array<
    { name: string; tokens: number; stripePayments: { id: string; }[]; }
  > = [];
  if (packageSalesResult.error) {
    console.error("Failed to fetch package sales:", packageSalesResult.error);
  } else {
    packageSales = packageSalesResult.data;
  }

  return NextResponse.json({
    tokensByType: Array.isArray(tokensByType)
      ? tokensByType.map(
        (
          item: {
            type: TokenTransactionType;
            _sum: { amount: number | null; };
          },
        ) => ({
          type: item.type,
          total: Number(item._sum.amount || 0),
        }),
      )
      : [],
    dailyTokens: Array.isArray(dailyTokens)
      ? dailyTokens.map(
        (row: { date: Date; purchased: bigint; spent: bigint; }) => ({
          date: row.date.toISOString().split("T")[0],
          purchased: Number(row.purchased || 0),
          spent: Number(row.spent || 0),
        }),
      )
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
      ? packageSales.map(
        (pkg: {
          name: string;
          tokens: number;
          stripePayments: { id: string; }[];
        }) => ({
          name: pkg.name,
          tokens: pkg.tokens,
          sales: pkg.stripePayments.length,
        }),
      )
      : [],
  });
}
