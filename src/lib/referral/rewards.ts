import prisma from '@/lib/prisma'
import { TokenBalanceManager } from '@/lib/tokens/balance-manager'
import { TokenTransactionType } from '@prisma/client'

const REFERRAL_REWARD_TOKENS = 50

export interface ReferralRewardResult {
  success: boolean
  referrerTokensGranted?: number
  refereeTokensGranted?: number
  error?: string
}

/**
 * Complete referral and grant rewards to both referrer and referee
 * Only called after fraud checks pass
 */
export async function completeReferralAndGrantRewards(
  referralId: string
): Promise<ReferralRewardResult> {
  try {
    // Get referral record
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        referrer: { select: { id: true, email: true } },
        referee: { select: { id: true, email: true } },
      },
    })

    if (!referral) {
      return { success: false, error: 'Referral not found' }
    }

    if (referral.status === 'COMPLETED') {
      return {
        success: false,
        error: 'Referral already completed',
      }
    }

    if (referral.status === 'INVALID') {
      return {
        success: false,
        error: 'Referral marked as invalid',
      }
    }

    // Grant tokens to both users in transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      // Grant tokens to referrer
      const referrerResult = await TokenBalanceManager.addTokens({
        userId: referral.referrerId,
        amount: REFERRAL_REWARD_TOKENS,
        type: TokenTransactionType.EARN_BONUS,
        source: 'referral_reward',
        sourceId: referralId,
        metadata: {
          refereeEmail: referral.referee.email,
          refereeId: referral.refereeId,
        },
      })

      if (!referrerResult.success) {
        throw new Error(
          `Failed to grant tokens to referrer: ${referrerResult.error}`
        )
      }

      // Grant tokens to referee
      const refereeResult = await TokenBalanceManager.addTokens({
        userId: referral.refereeId,
        amount: REFERRAL_REWARD_TOKENS,
        type: TokenTransactionType.EARN_BONUS,
        source: 'referral_signup_bonus',
        sourceId: referralId,
        metadata: {
          referrerEmail: referral.referrer.email,
          referrerId: referral.referrerId,
        },
      })

      if (!refereeResult.success) {
        throw new Error(
          `Failed to grant tokens to referee: ${refereeResult.error}`
        )
      }

      // Update referral status
      await tx.referral.update({
        where: { id: referralId },
        data: {
          status: 'COMPLETED',
          tokensGranted: REFERRAL_REWARD_TOKENS * 2,
          completedAt: new Date(),
        },
      })

      // Update referrer's referral count
      await tx.user.update({
        where: { id: referral.referrerId },
        data: {
          referralCount: { increment: 1 },
        },
      })

      return {
        referrerTokens: REFERRAL_REWARD_TOKENS,
        refereeTokens: REFERRAL_REWARD_TOKENS,
      }
    })

    return {
      success: true,
      referrerTokensGranted: result.referrerTokens,
      refereeTokensGranted: result.refereeTokens,
    }
  } catch (error) {
    console.error('Failed to complete referral and grant rewards:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Mark referral as invalid (failed fraud checks)
 */
export async function markReferralAsInvalid(
  referralId: string,
  _reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.referral.update({
      where: { id: referralId },
      data: {
        status: 'INVALID',
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to mark referral as invalid:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string): Promise<{
  totalReferrals: number
  completedReferrals: number
  pendingReferrals: number
  tokensEarned: number
}> {
  const [totalReferrals, completedReferrals, pendingReferrals, referrals] =
    await Promise.all([
      prisma.referral.count({
        where: { referrerId: userId },
      }),
      prisma.referral.count({
        where: { referrerId: userId, status: 'COMPLETED' },
      }),
      prisma.referral.count({
        where: { referrerId: userId, status: 'PENDING' },
      }),
      prisma.referral.findMany({
        where: { referrerId: userId, status: 'COMPLETED' },
        select: { tokensGranted: true },
      }),
    ])

  // Calculate tokens earned (referrer gets half of total tokens granted)
  const tokensEarned = referrals.reduce(
    (sum: number, ref: { tokensGranted: number }) => sum + ref.tokensGranted / 2,
    0
  )

  return {
    totalReferrals,
    completedReferrals,
    pendingReferrals,
    tokensEarned,
  }
}

/**
 * Get list of referred users (anonymized)
 */
export async function getReferredUsers(
  userId: string,
  limit = 50
): Promise<
  Array<{
    id: string
    email: string
    status: string
    createdAt: Date
    tokensGranted: number
  }>
> {
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    include: {
      referee: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return referrals.map((ref: {
    id: string
    referee: { email: string | null }
    status: string
    createdAt: Date
    tokensGranted: number
  }) => ({
    id: ref.id,
    email: anonymizeEmail(ref.referee.email ?? 'unknown'),
    status: ref.status,
    createdAt: ref.createdAt,
    tokensGranted: ref.tokensGranted / 2, // Show only referrer's portion
  }))
}

/**
 * Anonymize email for privacy
 * Example: john.doe@example.com -> j***@example.com
 */
function anonymizeEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) {
    return 'unknown'
  }

  const firstChar = localPart[0]
  return `${firstChar}***@${domain}`
}
