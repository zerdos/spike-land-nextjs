import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { TokenBalanceManager } from "./balance-manager";

export interface RegenerationStats {
  totalUsersProcessed: number;
  totalTokensRegenerated: number;
  errors: Array<{ userId: string; error: string; }>;
}

/**
 * Process token regeneration for all eligible users
 * This should be run as a cron job every 15 minutes
 */
export async function processAllUserRegenerations(): Promise<
  RegenerationStats
> {
  const stats: RegenerationStats = {
    totalUsersProcessed: 0,
    totalTokensRegenerated: 0,
    errors: [],
  };

  // Get all users with token balances
  const { data: userBalances, error: fetchError } = await tryCatch(
    prisma.userTokenBalance.findMany({
      select: {
        userId: true,
      },
    }),
  );

  if (fetchError) {
    console.error("Error processing user regenerations:", fetchError);
    return stats;
  }

  for (const { userId } of userBalances) {
    const { data: tokensAdded, error } = await tryCatch(
      TokenBalanceManager.processRegeneration(userId),
    );

    if (error) {
      stats.errors.push({
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      continue;
    }

    if (tokensAdded > 0) {
      stats.totalUsersProcessed++;
      stats.totalTokensRegenerated += tokensAdded;
    }
  }

  return stats;
}

/**
 * Process regeneration for a specific user
 * Useful for manual triggers or per-request regeneration checks
 */
export async function processUserRegeneration(
  userId: string,
): Promise<number> {
  return TokenBalanceManager.processRegeneration(userId);
}

/**
 * Get next regeneration time for a user
 */
export async function getNextRegenerationTime(
  userId: string,
): Promise<Date | null> {
  const { lastRegeneration } = await TokenBalanceManager.getBalance(userId);
  const nextRegen = new Date(
    lastRegeneration.getTime() + 15 * 60 * 1000, // 15 minutes
  );
  return nextRegen;
}

/**
 * Get time remaining until next regeneration (in milliseconds)
 */
export async function getTimeUntilNextRegeneration(
  userId: string,
): Promise<number> {
  const nextRegen = await getNextRegenerationTime(userId);
  if (!nextRegen) return 0;
  return Math.max(0, nextRegen.getTime() - Date.now());
}
