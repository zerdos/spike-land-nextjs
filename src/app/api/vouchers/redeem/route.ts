import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { VoucherManager } from '@/lib/vouchers/voucher-manager'
import { checkRateLimit, rateLimitConfigs } from '@/lib/rate-limiter'

// Voucher code validation: alphanumeric, max 50 chars
const VOUCHER_CODE_REGEX = /^[A-Z0-9]+$/i
const MAX_VOUCHER_CODE_LENGTH = 50
// Maximum request body size (1KB is plenty for a voucher code)
const MAX_BODY_SIZE = 1024

export async function POST(request: NextRequest) {
  try {
    // Check content length to prevent oversized payloads
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 })
    }

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Rate limiting: 5 redemption attempts per hour per user
    const rateLimitResult = checkRateLimit(
      `voucher_redeem:${session.user.id}`,
      rateLimitConfigs.voucherRedemption
    )

    if (rateLimitResult.isLimited) {
      return NextResponse.json(
        { error: 'Too many redemption attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      )
    }

    const body = await request.json()
    const { code } = body

    // Input validation: required, string type, max length, alphanumeric format
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Voucher code is required' },
        { status: 400 }
      )
    }

    const trimmedCode = code.trim()
    if (trimmedCode.length === 0 || trimmedCode.length > MAX_VOUCHER_CODE_LENGTH) {
      return NextResponse.json(
        { error: 'Invalid voucher code format' },
        { status: 400 }
      )
    }

    if (!VOUCHER_CODE_REGEX.test(trimmedCode)) {
      return NextResponse.json(
        { error: 'Invalid voucher code format' },
        { status: 400 }
      )
    }

    const result = await VoucherManager.redeem(trimmedCode, session.user.id)

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
