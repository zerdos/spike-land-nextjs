import { TokenBalanceManager } from './balance-manager'
import prisma from '@/lib/prisma'

export interface RegenerationStats {
  totalUsersProcessed: number
  totalTokensRegenerated: number
  errors: Array<{ userId: string; error: string }>
}

export async function processAllUserRegenerations(): Promise<RegenerationStats> {
  const stats: RegenerationStats = {
    totalUsersProcessed: 0,
    totalTokensRegenerated: 0,
    errors: [],
  }

  try {
    const userBalances = await prisma.userTokenBalance.findMany({
      select: {
        userId: true,
      },
    })

    for (const { userId } of userBalances) {
      try {
        const tokensAdded = await TokenBalanceManager.processRegeneration(
          userId
        )
        if (tokensAdded > 0) {
          stats.totalUsersProcessed++
          stats.totalTokensRegenerated += tokensAdded
        }
      } catch (error) {
        stats.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  } catch (error) {
    console.error('Error processing user regenerations:', error)
  }

  return stats
}

export async function processUserRegeneration(
  userId: string
): Promise<number> {
  return TokenBalanceManager.processRegeneration(userId)
}

export async function getNextRegenerationTime(
  userId: string
): Promise<Date | null> {
  const { lastRegeneration } = await TokenBalanceManager.getBalance(userId)
  const nextRegen = new Date(
    lastRegeneration.getTime() + 15 * 60 * 1000
  )
  return nextRegen
}

export async function getTimeUntilNextRegeneration(
  userId: string
): Promise<number> {
  const nextRegen = await getNextRegenerationTime(userId)
  if (!nextRegen) return 0
  return Math.max(0, nextRegen.getTime() - Date.now())
}
