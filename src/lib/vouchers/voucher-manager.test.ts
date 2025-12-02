import { describe, it, expect, vi, beforeEach } from 'vitest'

// Define enums locally to avoid Prisma client dependency in tests
enum VoucherType {
  FIXED_TOKENS = 'FIXED_TOKENS',
  PERCENTAGE_BONUS = 'PERCENTAGE_BONUS',
  SUBSCRIPTION_TRIAL = 'SUBSCRIPTION_TRIAL',
}

enum VoucherStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  DEPLETED = 'DEPLETED',
}

// Mock setup using vi.hoisted
const { mockPrisma, mockTokenBalanceManager } = vi.hoisted(() => ({
  mockPrisma: {
    voucher: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    voucherRedemption: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockTokenBalanceManager: {
    getBalance: vi.fn(),
    addTokens: vi.fn(),
  },
}))

// Mock the dependencies
vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}))

vi.mock('@/lib/tokens/balance-manager', () => ({
  TokenBalanceManager: mockTokenBalanceManager,
}))

// Import after mocking
import { VoucherManager } from './voucher-manager'

describe('VoucherManager', () => {
  const testUserId = 'user-123'
  const testCode = 'TEST2024'
  const mockDate = new Date('2024-01-15T12:00:00Z')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validate()', () => {
    it('should return valid result for a valid voucher', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      mockPrisma.voucher.findUnique.mockResolvedValue(mockVoucher)

      const result = await VoucherManager.validate(testCode)

      expect(result.valid).toBe(true)
      expect(result.voucher).toEqual({
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        remainingUses: 7,
        expiresAt: mockVoucher.expiresAt,
      })
    })

    it('should return error for non-existent voucher code', async () => {
      mockPrisma.voucher.findUnique.mockResolvedValue(null)

      const result = await VoucherManager.validate('INVALID')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Voucher code not found')
    })

    it('should return error for expired voucher', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2020-01-01'), // Expired
        redemptions: [],
      }

      mockPrisma.voucher.findUnique.mockResolvedValue(mockVoucher)

      const result = await VoucherManager.validate(testCode)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('This voucher has expired')
    })

    it('should return error for inactive voucher', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.INACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      mockPrisma.voucher.findUnique.mockResolvedValue(mockVoucher)

      const result = await VoucherManager.validate(testCode)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('This voucher is no longer active')
    })

    it('should return error for depleted voucher', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 10, // Fully used
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      mockPrisma.voucher.findUnique.mockResolvedValue(mockVoucher)

      const result = await VoucherManager.validate(testCode)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('This voucher has reached its usage limit')
    })

    it('should return error if user already redeemed voucher', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2025-12-31'),
        redemptions: [{ id: 'redemption-1', userId: testUserId }],
      }

      mockPrisma.voucher.findUnique.mockResolvedValue(mockVoucher)

      const result = await VoucherManager.validate(testCode, testUserId)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('You have already redeemed this voucher')
    })

    it('should handle voucher with no expiration', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: null, // No expiration
        redemptions: [],
      }

      mockPrisma.voucher.findUnique.mockResolvedValue(mockVoucher)

      const result = await VoucherManager.validate(testCode)

      expect(result.valid).toBe(true)
      expect(result.voucher?.expiresAt).toBeNull()
    })

    it('should handle voucher with unlimited uses', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: null, // Unlimited
        currentUses: 50,
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      mockPrisma.voucher.findUnique.mockResolvedValue(mockVoucher)

      const result = await VoucherManager.validate(testCode)

      expect(result.valid).toBe(true)
      expect(result.voucher?.remainingUses).toBeNull()
    })

    it('should normalize voucher code to uppercase and trim whitespace', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: 'TEST2024',
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      mockPrisma.voucher.findUnique.mockResolvedValue(mockVoucher)

      await VoucherManager.validate('  test2024  ')

      expect(mockPrisma.voucher.findUnique).toHaveBeenCalledWith({
        where: { code: 'TEST2024' },
        include: { redemptions: false },
      })
    })
  })

  describe('redeem()', () => {
    it('should successfully redeem voucher and grant tokens', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          voucher: {
            findUnique: vi.fn().mockResolvedValue(mockVoucher),
            update: vi.fn().mockResolvedValue({ ...mockVoucher, currentUses: 4 }),
          },
          voucherRedemption: {
            create: vi.fn().mockResolvedValue({
              id: 'redemption-1',
              voucherId: mockVoucher.id,
              userId: testUserId,
              tokensGranted: 100,
            }),
          },
        }
        return callback(mockTx)
      })

      mockTokenBalanceManager.addTokens.mockResolvedValue({
        success: true,
        balance: 200,
      })

      const result = await VoucherManager.redeem(testCode, testUserId)

      expect(result.success).toBe(true)
      expect(result.tokensGranted).toBe(100)
      expect(result.newBalance).toBe(200)
    })

    it('should update voucher currentUses on redemption', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 50,
        status: VoucherStatus.ACTIVE,
        maxUses: 5,
        currentUses: 2,
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      let updateCalled = false
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          voucher: {
            findUnique: vi.fn().mockResolvedValue(mockVoucher),
            update: vi.fn().mockImplementation((params) => {
              updateCalled = true
              expect(params.data.currentUses).toEqual({ increment: 1 })
              return Promise.resolve({ ...mockVoucher, currentUses: 3 })
            }),
          },
          voucherRedemption: {
            create: vi.fn().mockResolvedValue({
              id: 'redemption-1',
              voucherId: mockVoucher.id,
              userId: testUserId,
              tokensGranted: 50,
            }),
          },
        }
        return callback(mockTx)
      })

      mockTokenBalanceManager.addTokens.mockResolvedValue({
        success: true,
        balance: 150,
      })

      await VoucherManager.redeem(testCode, testUserId)

      expect(updateCalled).toBe(true)
    })

    it('should mark voucher as DEPLETED when maxUses reached', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 50,
        status: VoucherStatus.ACTIVE,
        maxUses: 5,
        currentUses: 4, // This redemption will make it 5
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      let depletedUpdateCalled = false
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          voucher: {
            findUnique: vi.fn().mockResolvedValue(mockVoucher),
            update: vi.fn().mockImplementation((params) => {
              if (params.data.status === VoucherStatus.DEPLETED) {
                depletedUpdateCalled = true
              }
              return Promise.resolve({ ...mockVoucher })
            }),
          },
          voucherRedemption: {
            create: vi.fn().mockResolvedValue({
              id: 'redemption-1',
              voucherId: mockVoucher.id,
              userId: testUserId,
              tokensGranted: 50,
            }),
          },
        }
        return callback(mockTx)
      })

      mockTokenBalanceManager.addTokens.mockResolvedValue({
        success: true,
        balance: 150,
      })

      await VoucherManager.redeem(testCode, testUserId)

      expect(depletedUpdateCalled).toBe(true)
    })

    it('should prevent duplicate redemption by same user', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2025-12-31'),
        redemptions: [{ id: 'redemption-1', userId: testUserId }],
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          voucher: {
            findUnique: vi.fn().mockResolvedValue(mockVoucher),
            update: vi.fn(),
          },
          voucherRedemption: {
            create: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const result = await VoucherManager.redeem(testCode, testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('You have already redeemed this voucher')
    })

    it('should calculate PERCENTAGE_BONUS correctly', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.PERCENTAGE_BONUS,
        value: 50, // 50% bonus
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          voucher: {
            findUnique: vi.fn().mockResolvedValue(mockVoucher),
            update: vi.fn().mockResolvedValue({ ...mockVoucher, currentUses: 4 }),
          },
          voucherRedemption: {
            create: vi.fn().mockResolvedValue({
              id: 'redemption-1',
              voucherId: mockVoucher.id,
              userId: testUserId,
              tokensGranted: 50,
            }),
          },
        }
        return callback(mockTx)
      })

      mockTokenBalanceManager.getBalance.mockResolvedValue({
        balance: 100,
        lastRegeneration: mockDate,
      })

      mockTokenBalanceManager.addTokens.mockResolvedValue({
        success: true,
        balance: 150,
      })

      const result = await VoucherManager.redeem(testCode, testUserId)

      // 100 * (50 / 100) = 50 tokens
      expect(result.tokensGranted).toBe(50)
      expect(mockTokenBalanceManager.getBalance).toHaveBeenCalledWith(testUserId)
    })

    it('should return error for non-existent voucher on redemption', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          voucher: {
            findUnique: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
          },
          voucherRedemption: {
            create: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const result = await VoucherManager.redeem('INVALID', testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Voucher code not found')
    })

    it('should return error for expired voucher on redemption', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2020-01-01'), // Expired
        redemptions: [],
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          voucher: {
            findUnique: vi.fn().mockResolvedValue(mockVoucher),
            update: vi.fn(),
          },
          voucherRedemption: {
            create: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const result = await VoucherManager.redeem(testCode, testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('This voucher has expired')
    })

    it('should return error for inactive voucher on redemption', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.INACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          voucher: {
            findUnique: vi.fn().mockResolvedValue(mockVoucher),
            update: vi.fn(),
          },
          voucherRedemption: {
            create: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const result = await VoucherManager.redeem(testCode, testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('This voucher is no longer active')
    })

    it('should return error for depleted voucher on redemption', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 10, // Fully used
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          voucher: {
            findUnique: vi.fn().mockResolvedValue(mockVoucher),
            update: vi.fn(),
          },
          voucherRedemption: {
            create: vi.fn(),
          },
        }
        return callback(mockTx)
      })

      const result = await VoucherManager.redeem(testCode, testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('This voucher has reached its usage limit')
    })

    it('should normalize code and include metadata in token transaction', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: 'TEST2024',
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          voucher: {
            findUnique: vi.fn().mockResolvedValue(mockVoucher),
            update: vi.fn().mockResolvedValue({ ...mockVoucher, currentUses: 4 }),
          },
          voucherRedemption: {
            create: vi.fn().mockResolvedValue({
              id: 'redemption-1',
              voucherId: mockVoucher.id,
              userId: testUserId,
              tokensGranted: 100,
            }),
          },
        }
        return callback(mockTx)
      })

      mockTokenBalanceManager.addTokens.mockResolvedValue({
        success: true,
        balance: 200,
      })

      await VoucherManager.redeem('  test2024  ', testUserId)

      expect(mockTokenBalanceManager.addTokens).toHaveBeenCalledWith({
        userId: testUserId,
        amount: 100,
        type: 'EARN_BONUS',
        source: 'voucher_redemption',
        sourceId: 'voucher-1',
        metadata: { voucherCode: 'TEST2024' },
      })
    })

    it('should return error if token granting fails', async () => {
      const mockVoucher = {
        id: 'voucher-1',
        code: testCode,
        type: VoucherType.FIXED_TOKENS,
        value: 100,
        status: VoucherStatus.ACTIVE,
        maxUses: 10,
        currentUses: 3,
        expiresAt: new Date('2025-12-31'),
        redemptions: [],
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          voucher: {
            findUnique: vi.fn().mockResolvedValue(mockVoucher),
            update: vi.fn().mockResolvedValue({ ...mockVoucher, currentUses: 4 }),
          },
          voucherRedemption: {
            create: vi.fn().mockResolvedValue({
              id: 'redemption-1',
              voucherId: mockVoucher.id,
              userId: testUserId,
              tokensGranted: 100,
            }),
          },
        }
        return callback(mockTx)
      })

      mockTokenBalanceManager.addTokens.mockResolvedValue({
        success: false,
        error: 'Database error while adding tokens',
      })

      const result = await VoucherManager.redeem(testCode, testUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error while adding tokens')
    })
  })
})
