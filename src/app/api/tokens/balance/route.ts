import { auth } from "@/auth";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { getTimeUntilNextRegeneration, processUserRegeneration } from "@/lib/tokens/regeneration";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Error fetching token balance:", authError);
    return NextResponse.json(
      { error: "Failed to fetch token balance" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Process regeneration before returning balance
  const { data: tokensAdded, error: regenError } = await tryCatch(
    processUserRegeneration(session.user.id),
  );

  if (regenError) {
    console.error("Error fetching token balance:", regenError);
    return NextResponse.json(
      { error: "Failed to fetch token balance" },
      { status: 500 },
    );
  }

  // Get current balance
  const { data: balanceData, error: balanceError } = await tryCatch(
    TokenBalanceManager.getBalance(session.user.id),
  );

  if (balanceError) {
    console.error("Error fetching token balance:", balanceError);
    return NextResponse.json(
      { error: "Failed to fetch token balance" },
      { status: 500 },
    );
  }

  const { balance, lastRegeneration, tier, maxBalance } = balanceData;

  // Get time until next regeneration
  const { data: timeUntilNextRegen, error: timeError } = await tryCatch(
    getTimeUntilNextRegeneration(session.user.id),
  );

  if (timeError) {
    console.error("Error fetching token balance:", timeError);
    return NextResponse.json(
      { error: "Failed to fetch token balance" },
      { status: 500 },
    );
  }

  // Get consumption stats
  const { data: stats, error: statsError } = await tryCatch(
    TokenBalanceManager.getConsumptionStats(session.user.id),
  );

  if (statsError) {
    console.error("Error fetching token balance:", statsError);
    return NextResponse.json(
      { error: "Failed to fetch token balance" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    balance,
    lastRegeneration: lastRegeneration.toISOString(),
    timeUntilNextRegenMs: timeUntilNextRegen,
    tokensAddedThisRequest: tokensAdded,
    tier,
    maxBalance,
    stats: {
      totalSpent: stats.totalSpent,
      totalEarned: stats.totalEarned,
      totalRefunded: stats.totalRefunded,
      transactionCount: stats.transactionCount,
    },
  });
}
