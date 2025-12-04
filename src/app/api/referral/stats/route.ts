import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getReferralStats, getReferredUsers } from '@/lib/referral/rewards'

/**
 * GET /api/referral/stats
 * Get referral statistics for authenticated user
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get stats and referred users
    const [stats, referredUsers] = await Promise.all([
      getReferralStats(session.user.id),
      getReferredUsers(session.user.id),
    ])

    return NextResponse.json({
      stats,
      referredUsers,
    })
  } catch (error) {
    console.error('Failed to get referral stats:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve referral statistics' },
      { status: 500 }
    )
  }
}
