import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { tryCatch } from "@/lib/try-catch";
import type { PrismaTransactionClient } from "@/types/prisma-helpers";
import { TokenTransactionType } from "@prisma/client";

const REFERRAL_REWARD_TOKENS = 50;

interface ReferralRewardResult {
  success: boolean;
  referrerTokensGranted?: number;
  refereeTokensGranted?: number;
  error?: string;
}

/**
 * Complete referral and grant rewards to both referrer and referee
 * Only called after fraud checks pass
 */
export async function completeReferralAndGrantRewards(
  referralId: string,
): Promise<ReferralRewardResult> {
  // Get referral record
  const { data: referral, error: findError } = await tryCatch(
    prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        referrer: { select: { id: true, email: true } },
        referee: { select: { id: true, email: true } },
      },
    }),
  );

  if (findError) {
    console.error("Failed to complete referral and grant rewards:", findError);
    return {
      success: false,
      error: findError instanceof Error ? findError.message : "Unknown error",
    };
  }

  if (!referral) {
    return { success: false, error: "Referral not found" };
  }

  if (referral.status === "COMPLETED") {
    return {
      success: false,
      error: "Referral already completed",
    };
  }

  if (referral.status === "INVALID") {
    return {
      success: false,
      error: "Referral marked as invalid",
    };
  }

  // Grant tokens to both users in transaction
  // Pass tx to TokenBalanceManager.addTokens to ensure atomicity

  const { data: result, error: transactionError } = await tryCatch(
    prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // Grant tokens to referrer (passing tx for atomicity)
      const referrerResult = await TokenBalanceManager.addTokens({
        userId: referral.referrerId,
        amount: REFERRAL_REWARD_TOKENS,
        type: TokenTransactionType.EARN_BONUS,
        source: "referral_reward",
        sourceId: referralId,
        metadata: {
          refereeEmail: referral.referee.email,
          refereeId: referral.refereeId,
        },
        tx, // Participate in outer transaction
      });

      if (!referrerResult.success) {
        throw new Error(
          `Failed to grant tokens to referrer: ${referrerResult.error}`,
        );
      }

      // Grant tokens to referee (passing tx for atomicity)
      const refereeResult = await TokenBalanceManager.addTokens({
        userId: referral.refereeId,
        amount: REFERRAL_REWARD_TOKENS,
        type: TokenTransactionType.EARN_BONUS,
        source: "referral_signup_bonus",
        sourceId: referralId,
        metadata: {
          referrerEmail: referral.referrer.email,
          referrerId: referral.referrerId,
        },
        tx, // Participate in outer transaction
      });

      if (!refereeResult.success) {
        throw new Error(
          `Failed to grant tokens to referee: ${refereeResult.error}`,
        );
      }

      // Update referral status
      await tx.referral.update({
        where: { id: referralId },
        data: {
          status: "COMPLETED",
          tokensGranted: REFERRAL_REWARD_TOKENS * 2,
          completedAt: new Date(),
        },
      });

      // Update referrer's referral count
      await tx.user.update({
        where: { id: referral.referrerId },
        data: {
          referralCount: { increment: 1 },
        },
      });

      return {
        referrerTokens: REFERRAL_REWARD_TOKENS,
        refereeTokens: REFERRAL_REWARD_TOKENS,
      };
    }),
  );

  if (transactionError) {
    console.error(
      "Failed to complete referral and grant rewards:",
      transactionError,
    );
    return {
      success: false,
      error: transactionError instanceof Error
        ? transactionError.message
        : "Unknown error",
    };
  }

  return {
    success: true,
    referrerTokensGranted: result.referrerTokens,
    refereeTokensGranted: result.refereeTokens,
  };
}

/**
 * Mark referral as invalid (failed fraud checks)
 */
export async function markReferralAsInvalid(
  referralId: string,
  _reason: string,
): Promise<{ success: boolean; error?: string; }> {
  const { error } = await tryCatch(
    prisma.referral.update({
      where: { id: referralId },
      data: {
        status: "INVALID",
      },
    }),
  );

  if (error) {
    console.error("Failed to mark referral as invalid:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return { success: true };
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string): Promise<{
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  tokensEarned: number;
}> {
  const { data: results, error } = await tryCatch(
    Promise.all([
      prisma.referral.count({
        where: { referrerId: userId },
      }),
      prisma.referral.count({
        where: { referrerId: userId, status: "COMPLETED" },
      }),
      prisma.referral.count({
        where: { referrerId: userId, status: "PENDING" },
      }),
      prisma.referral.findMany({
        where: { referrerId: userId, status: "COMPLETED" },
        select: { tokensGranted: true },
      }),
    ]),
  );

  if (error) {
    console.error("Failed to get referral stats:", error);
    return {
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      tokensEarned: 0,
    };
  }

  const [totalReferrals, completedReferrals, pendingReferrals, referrals] = results;

  // Calculate tokens earned (referrer gets half of total tokens granted)
  const tokensEarned = referrals.reduce(
    (sum: number, ref: { tokensGranted: number; }) => sum + ref.tokensGranted / 2,
    0,
  );

  return {
    totalReferrals,
    completedReferrals,
    pendingReferrals,
    tokensEarned,
  };
}

/**
 * Get list of referred users (anonymized)
 */
export async function getReferredUsers(
  userId: string,
  limit = 50,
): Promise<
  Array<{
    id: string;
    email: string;
    status: string;
    createdAt: Date;
    tokensGranted: number;
  }>
> {
  const { data: referrals, error } = await tryCatch(
    prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  );

  if (error) {
    console.error("Failed to get referred users:", error);
    return [];
  }

  return referrals.map((ref: {
    id: string;
    referee: { email: string | null; };
    status: string;
    createdAt: Date;
    tokensGranted: number;
  }) => ({
    id: ref.id,
    email: anonymizeEmail(ref.referee.email ?? "unknown"),
    status: ref.status,
    createdAt: ref.createdAt,
    tokensGranted: ref.tokensGranted / 2, // Show only referrer's portion
  }));
}

/**
 * Anonymize email for privacy
 * Example: john.doe@example.com -> j***@example.com
 */
function anonymizeEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "unknown";
  }

  const firstChar = localPart[0];
  return `${firstChar}***@${domain}`;
}
