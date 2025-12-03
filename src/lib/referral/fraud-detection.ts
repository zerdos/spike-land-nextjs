import prisma from '@/lib/prisma'

// List of known disposable email providers
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'throwaway.email',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'maildrop.cc',
  'temp-mail.org',
  'getnada.com',
  'trashmail.com',
  'fakeinbox.com',
  'yopmail.com',
  'sharklasers.com',
  'guerrillamail.net',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.org',
  'spam4.me',
  'tempinbox.com',
  'mailnesia.com',
  'emailondeck.com',
]

const SAME_IP_WINDOW_HOURS = 24
const MAX_REFERRALS_PER_DAY = 10

export interface FraudCheckResult {
  passed: boolean
  reasons: string[]
}

/**
 * Check if email is from a disposable email provider
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) {
    return false
  }

  return DISPOSABLE_EMAIL_DOMAINS.includes(domain)
}

/**
 * Check if IP address was used for another referral recently
 */
export async function checkSameIpReferral(
  ipAddress: string,
  referrerId: string
): Promise<boolean> {
  if (!ipAddress) {
    return false // Cannot check without IP
  }

  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - SAME_IP_WINDOW_HOURS)

  const recentReferral = await prisma.referral.findFirst({
    where: {
      referrerId,
      ipAddress,
      createdAt: {
        gte: cutoffTime,
      },
    },
  })

  return recentReferral !== null
}

/**
 * Check if referrer has exceeded daily referral limit
 */
export async function checkReferralRateLimit(
  referrerId: string
): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayReferralCount = await prisma.referral.count({
    where: {
      referrerId,
      createdAt: {
        gte: today,
      },
    },
  })

  return todayReferralCount >= MAX_REFERRALS_PER_DAY
}

/**
 * Check if user's email is verified
 */
export async function checkEmailVerified(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  })

  if (!user) {
    return false
  }

  return user.emailVerified !== null
}

/**
 * Perform comprehensive fraud checks on a referral
 */
export async function performFraudChecks(
  refereeId: string,
  referrerId: string,
  ipAddress?: string
): Promise<FraudCheckResult> {
  const reasons: string[] = []

  // Get referee details
  const referee = await prisma.user.findUnique({
    where: { id: refereeId },
    select: { email: true, emailVerified: true },
  })

  if (!referee) {
    reasons.push('Referee user not found')
    return { passed: false, reasons }
  }

  // Check 1: Disposable email
  if (referee.email && isDisposableEmail(referee.email)) {
    reasons.push('Disposable email address detected')
  }

  // Check 2: Email verification (require verification for reward)
  if (!referee.emailVerified) {
    reasons.push('Email not verified')
  }

  // Check 3: Same IP address
  if (ipAddress) {
    const sameIp = await checkSameIpReferral(ipAddress, referrerId)
    if (sameIp) {
      reasons.push('Same IP address used within 24 hours')
    }
  }

  // Check 4: Rate limiting
  const rateLimited = await checkReferralRateLimit(referrerId)
  if (rateLimited) {
    reasons.push('Referrer exceeded daily referral limit')
  }

  // Check 5: Self-referral (should be caught earlier, but double-check)
  if (refereeId === referrerId) {
    reasons.push('Self-referral not allowed')
  }

  return {
    passed: reasons.length === 0,
    reasons,
  }
}

/**
 * Validate and process referral after signup
 * This should be called after user verifies their email
 */
export async function validateReferralAfterVerification(
  refereeId: string
): Promise<{
  success: boolean
  referralId?: string
  shouldGrantRewards: boolean
  error?: string
}> {
  try {
    // Find pending referral for this user
    const referral = await prisma.referral.findFirst({
      where: {
        refereeId,
        status: 'PENDING',
      },
      include: {
        referrer: { select: { id: true } },
      },
    })

    if (!referral) {
      return {
        success: false,
        shouldGrantRewards: false,
        error: 'No pending referral found',
      }
    }

    // Perform fraud checks
    const fraudCheck = await performFraudChecks(
      refereeId,
      referral.referrerId,
      referral.ipAddress ?? undefined
    )

    if (!fraudCheck.passed) {
      // Mark as invalid
      await prisma.referral.update({
        where: { id: referral.id },
        data: { status: 'INVALID' },
      })

      return {
        success: true,
        referralId: referral.id,
        shouldGrantRewards: false,
        error: `Fraud checks failed: ${fraudCheck.reasons.join(', ')}`,
      }
    }

    // All checks passed - ready for reward
    return {
      success: true,
      referralId: referral.id,
      shouldGrantRewards: true,
    }
  } catch (error) {
    console.error('Failed to validate referral:', error)
    return {
      success: false,
      shouldGrantRewards: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get fraud detection statistics for admin dashboard
 */
export async function getFraudStats(): Promise<{
  totalReferrals: number
  validReferrals: number
  invalidReferrals: number
  pendingReferrals: number
  invalidReasons: Record<string, number>
}> {
  const [total, valid, invalid, pending] = await Promise.all([
    prisma.referral.count(),
    prisma.referral.count({ where: { status: 'COMPLETED' } }),
    prisma.referral.count({ where: { status: 'INVALID' } }),
    prisma.referral.count({ where: { status: 'PENDING' } }),
  ])

  // In a real implementation, you would store invalid reasons in the database
  // For now, return a placeholder
  const invalidReasons: Record<string, number> = {}

  return {
    totalReferrals: total,
    validReferrals: valid,
    invalidReferrals: invalid,
    pendingReferrals: pending,
    invalidReasons,
  }
}
