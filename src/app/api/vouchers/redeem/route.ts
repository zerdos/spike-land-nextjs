import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { VoucherManager } from '@/lib/vouchers/voucher-manager'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Voucher code is required' },
        { status: 400 }
      )
    }

    const result = await VoucherManager.redeem(code, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      tokensGranted: result.tokensGranted,
      newBalance: result.newBalance
    })
  } catch (error) {
    console.error('Voucher redemption error:', error)
    return NextResponse.json(
      { error: 'Failed to redeem voucher' },
      { status: 500 }
    )
  }
}
