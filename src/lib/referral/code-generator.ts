import prisma from '@/lib/prisma'

const CODE_LENGTH = 8
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excludes ambiguous characters (0, O, I, 1)
const MAX_RETRIES = 5

/**
 * Generate a random referral code
 */
function generateRandomCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length)
    code += CHARSET[randomIndex]
  }
  return code
}

/**
 * Generate a unique referral code for a user
 * Checks database for uniqueness and retries if necessary
 */
export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateRandomCode()

    // Check if code already exists
    const existingUser = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    })

    if (!existingUser) {
      return code
    }
  }

  throw new Error('Failed to generate unique referral code after maximum retries')
}

/**
 * Assign a referral code to a user if they don't have one
 */
export async function assignReferralCodeToUser(userId: string): Promise<string> {
  // Check if user already has a referral code
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })

  if (user?.referralCode) {
    return user.referralCode
  }

  // Generate new code
  const newCode = await generateUniqueReferralCode()

  // Update user with new code
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: newCode },
  })

  return newCode
}

/**
 * Get user ID by referral code
 */
export async function getUserByReferralCode(code: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  })

  return user?.id ?? null
}
