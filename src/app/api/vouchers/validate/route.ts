import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { VoucherManager } from '@/lib/vouchers/voucher-manager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Voucher code is required' },
        { status: 400 }
      )
    }

    // Get user session if available (optional for validation)
    const session = await auth()
    const userId = session?.user?.id

    const result = await VoucherManager.validate(code, userId)

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      voucher: result.voucher
    })
  } catch (error) {
    console.error('Voucher validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate voucher' },
      { status: 500 }
    )
  }
}
