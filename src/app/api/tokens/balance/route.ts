import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { TokenBalanceManager } from '@/lib/tokens/balance-manager'
import {
  processUserRegeneration,
  getTimeUntilNextRegeneration,
} from '@/lib/tokens/regeneration'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process regeneration before returning balance
    const tokensAdded = await processUserRegeneration(session.user.id)

    // Get current balance
    const { balance, lastRegeneration } = await TokenBalanceManager.getBalance(
      session.user.id
    )

    // Get time until next regeneration
    const timeUntilNextRegen = await getTimeUntilNextRegeneration(
      session.user.id
    )

    // Get consumption stats
    const stats = await TokenBalanceManager.getConsumptionStats(
      session.user.id
    )

    return NextResponse.json({
      balance,
      lastRegeneration: lastRegeneration.toISOString(),
      timeUntilNextRegenMs: timeUntilNextRegen,
      tokensAddedThisRequest: tokensAdded,
      stats: {
        totalSpent: stats.totalSpent,
        totalEarned: stats.totalEarned,
        totalRefunded: stats.totalRefunded,
        transactionCount: stats.transactionCount,
      },
    })
  } catch (error) {
    console.error('Error fetching token balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token balance' },
      { status: 500 }
    )
  }
}
