import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'
import { VoucherType } from '@prisma/client'

// Use vi.hoisted to define mocks before they are used
const { mockSession, mockAuth, mockVoucherManager } = vi.hoisted(() => ({
  mockSession: {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    },
  },
  mockAuth: vi.fn(),
  mockVoucherManager: {
    validate: vi.fn(),
  },
}))

vi.mock('@/auth', () => ({
  auth: mockAuth,
}))

vi.mock('@/lib/vouchers/voucher-manager', () => ({
  VoucherManager: mockVoucherManager,
}))

// Helper to create mock request
function createMockRequest(body: object): NextRequest {
  const req = new NextRequest('http://localhost/api/vouchers/validate', {
    method: 'POST',
  })

  req.json = vi.fn().mockResolvedValue(body)

  return req
}

describe('POST /api/vouchers/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set default mock session
    mockAuth.mockResolvedValue(mockSession)
  })

  it('should return 400 if code is missing', async () => {
    const req = createMockRequest({})
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Voucher code is required')
  })

  it('should return 400 if code is not a string', async () => {
    const req = createMockRequest({ code: 123 })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Voucher code is required')
  })

  it('should return 400 for invalid voucher code', async () => {
    mockVoucherManager.validate.mockResolvedValue({
      valid: false,
      error: 'Voucher code not found',
    })

    const req = createMockRequest({ code: 'INVALID' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('Voucher code not found')
  })

  it('should return 200 with voucher details for valid code', async () => {
    const mockVoucher = {
      code: 'TEST2024',
      type: VoucherType.FIXED_TOKENS,
      value: 100,
      remainingUses: 7,
      expiresAt: new Date('2025-12-31'),
    }

    mockVoucherManager.validate.mockResolvedValue({
      valid: true,
      voucher: mockVoucher,
    })

    const req = createMockRequest({ code: 'TEST2024' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.voucher).toEqual({
      code: 'TEST2024',
      type: VoucherType.FIXED_TOKENS,
      value: 100,
      remainingUses: 7,
      expiresAt: mockVoucher.expiresAt.toISOString(),
    })
  })

  it('should work without authentication (public validation)', async () => {
    // Mock no session
    mockAuth.mockResolvedValueOnce(null)

    const mockVoucher = {
      code: 'PUBLIC2024',
      type: VoucherType.FIXED_TOKENS,
      value: 50,
      remainingUses: 10,
      expiresAt: null,
    }

    mockVoucherManager.validate.mockResolvedValue({
      valid: true,
      voucher: mockVoucher,
    })

    const req = createMockRequest({ code: 'PUBLIC2024' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(mockVoucherManager.validate).toHaveBeenCalledWith('PUBLIC2024', undefined)
  })

  it('should include userId when authenticated', async () => {
    const mockVoucher = {
      code: 'AUTH2024',
      type: VoucherType.FIXED_TOKENS,
      value: 75,
      remainingUses: 5,
      expiresAt: new Date('2025-06-30'),
    }

    mockVoucherManager.validate.mockResolvedValue({
      valid: true,
      voucher: mockVoucher,
    })

    const req = createMockRequest({ code: 'AUTH2024' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockVoucherManager.validate).toHaveBeenCalledWith('AUTH2024', 'user-123')
  })

  it('should check if already redeemed when authenticated', async () => {
    mockVoucherManager.validate.mockResolvedValue({
      valid: false,
      error: 'You have already redeemed this voucher',
    })

    const req = createMockRequest({ code: 'REDEEMED2024' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('You have already redeemed this voucher')
    expect(mockVoucherManager.validate).toHaveBeenCalledWith('REDEEMED2024', 'user-123')
  })

  it('should handle expired voucher error', async () => {
    mockVoucherManager.validate.mockResolvedValue({
      valid: false,
      error: 'This voucher has expired',
    })

    const req = createMockRequest({ code: 'EXPIRED2024' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('This voucher has expired')
  })

  it('should handle depleted voucher error', async () => {
    mockVoucherManager.validate.mockResolvedValue({
      valid: false,
      error: 'This voucher has reached its usage limit',
    })

    const req = createMockRequest({ code: 'DEPLETED2024' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('This voucher has reached its usage limit')
  })

  it('should handle inactive voucher error', async () => {
    mockVoucherManager.validate.mockResolvedValue({
      valid: false,
      error: 'This voucher is no longer active',
    })

    const req = createMockRequest({ code: 'INACTIVE2024' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('This voucher is no longer active')
  })

  it('should return 500 if validation throws error', async () => {
    mockVoucherManager.validate.mockRejectedValue(new Error('Database error'))

    const req = createMockRequest({ code: 'TEST2024' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to validate voucher')
  })

  it('should handle PERCENTAGE_BONUS voucher type', async () => {
    const mockVoucher = {
      code: 'BONUS50',
      type: VoucherType.PERCENTAGE_BONUS,
      value: 50, // 50% bonus
      remainingUses: null, // Unlimited
      expiresAt: null,
    }

    mockVoucherManager.validate.mockResolvedValue({
      valid: true,
      voucher: mockVoucher,
    })

    const req = createMockRequest({ code: 'BONUS50' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.voucher.type).toBe(VoucherType.PERCENTAGE_BONUS)
    expect(data.voucher.value).toBe(50)
  })

  it('should handle voucher with null remainingUses (unlimited)', async () => {
    const mockVoucher = {
      code: 'UNLIMITED',
      type: VoucherType.FIXED_TOKENS,
      value: 100,
      remainingUses: null,
      expiresAt: new Date('2025-12-31'),
    }

    mockVoucherManager.validate.mockResolvedValue({
      valid: true,
      voucher: mockVoucher,
    })

    const req = createMockRequest({ code: 'UNLIMITED' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.voucher.remainingUses).toBeNull()
  })

  it('should handle empty string code', async () => {
    const req = createMockRequest({ code: '' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Voucher code is required')
  })
})
