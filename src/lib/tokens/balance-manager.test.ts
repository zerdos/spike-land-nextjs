import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TokenTransactionType } from '@prisma/client'

// Use vi.hoisted to define mocks that will be available when vi.mock is hoisted
const {
  mockUserTokenBalance,
  mockUser,
  mockTokenTransaction,
  mockTransaction,
} = vi.hoisted(() => ({
  mockUserTokenBalance: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mockUser: {
    upsert: vi.fn(),
  },
  mockTokenTransaction: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  mockTransaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    userTokenBalance: mockUserTokenBalance,
    user: mockUser,
    tokenTransaction: mockTokenTransaction,
    $transaction: mockTransaction,
  },
}))

import { TokenBalanceManager } from './balance-manager'

describe('TokenBalanceManager', () => {
  const testUserId = 'test-user-123'
  const mockDate = new Date('2024-01-15T12:00:00Z')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getBalance', () => {
    it('should return existing balance when user has one', async () => {
      const existingBalance = {
        userId: testUserId,
        balance: 50,
        lastRegeneration: mockDate,
      }
      mockUserTokenBalance.findUnique.mockResolvedValue(existingBalance)

      const result = await TokenBalanceManager.getBalance(testUserId)

      expect(result).toEqual({
        balance: 50,
        lastRegeneration: mockDate,
      })
      expect(mockUserTokenBalance.findUnique).toHaveBeenCalledWith({
        where: { userId: testUserId },
      })
      expect(mockUser.upsert).not.toHaveBeenCalled()
    })

    it('should create User and balance when user does not exist (JWT strategy)', async () => {
      mockUserTokenBalance.findUnique.mockResolvedValue(null)
      mockUser.upsert.mockResolvedValue({ id: testUserId })
      const newBalance = {
        userId: testUserId,
        balance: 0,
        lastRegeneration: mockDate,
      }
      mockUserTokenBalance.create.mockResolvedValue(newBalance)

      const result = await TokenBalanceManager.getBalance(testUserId)

      expect(result).toEqual({
        balance: 0,
        lastRegeneration: mockDate,
      })
      expect(mockUser.upsert).toHaveBeenCalledWith({
        where: { id: testUserId },
        update: {},
        create: { id: testUserId },
      })
      expect(mockUserTokenBalance.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          balance: 0,
          lastRegeneration: expect.any(Date),
        },
      })
    })
  })

  describe('hasEnoughTokens', () => {
    it('should return true when user has sufficient tokens', async () => {
      mockUserTokenBalance.findUnique.mockResolvedValue({
        userId: testUserId,
        balance: 50,
        lastRegeneration: mockDate,
      })

      const result = await TokenBalanceManager.hasEnoughTokens(testUserId, 10)

      expect(result).toBe(true)
    })

    it('should return false when user has insufficient tokens', async () => {
      mockUserTokenBalance.findUnique.mockResolvedValue({
        userId: testUserId,
        balance: 5,
        lastRegeneration: mockDate,
      })

      const result = await TokenBalanceManager.hasEnoughTokens(testUserId, 10)

      expect(result).toBe(false)
    })

    it('should return false for new user with no balance (creates 0 balance)', async () => {
      mockUserTokenBalance.findUnique.mockResolvedValue(null)
      mockUser.upsert.mockResolvedValue({ id: testUserId })
      mockUserTokenBalance.create.mockResolvedValue({
        userId: testUserId,
        balance: 0,
        lastRegeneration: mockDate,
      })

      const result = await TokenBalanceManager.hasEnoughTokens(testUserId, 10)

      expect(result).toBe(false)
    })
  })

  describe('consumeTokens', () => {
    it('should consume tokens successfully when user has sufficient balance', async () => {
      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 50,
            lastRegeneration: mockDate,
          }),
          update: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 40,
            lastRegeneration: mockDate,
          }),
          create: vi.fn(),
        },
        user: {
          upsert: vi.fn(),
        },
        tokenTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'tx-123',
            userId: testUserId,
            amount: -10,
            type: TokenTransactionType.SPEND_ENHANCEMENT,
            balanceAfter: 40,
          }),
        },
      }
      mockTransaction.mockImplementation((callback) => callback(mockTx))

      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: 'image_enhancement',
        sourceId: 'job-123',
      })

      expect(result.success).toBe(true)
      expect(result.balance).toBe(40)
      expect(result.transaction).toBeDefined()
    })

    it('should create User and balance for new user, then return insufficient tokens error', async () => {
      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 0,
            lastRegeneration: mockDate,
          }),
          update: vi.fn(),
        },
        user: {
          upsert: vi.fn().mockResolvedValue({ id: testUserId }),
        },
        tokenTransaction: {
          create: vi.fn(),
        },
      }
      mockTransaction.mockImplementation((callback) => callback(mockTx))

      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: 'image_enhancement',
        sourceId: 'job-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient tokens. Required: 10, Available: 0')
      expect(mockTx.user.upsert).toHaveBeenCalledWith({
        where: { id: testUserId },
        update: {},
        create: { id: testUserId },
      })
      expect(mockTx.userTokenBalance.create).toHaveBeenCalled()
    })

    it('should return error when existing user has insufficient tokens', async () => {
      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 5,
            lastRegeneration: mockDate,
          }),
          update: vi.fn(),
          create: vi.fn(),
        },
        user: {
          upsert: vi.fn(),
        },
        tokenTransaction: {
          create: vi.fn(),
        },
      }
      mockTransaction.mockImplementation((callback) => callback(mockTx))

      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: 'image_enhancement',
        sourceId: 'job-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient tokens. Required: 10, Available: 5')
    })

    it('should include metadata in transaction when provided', async () => {
      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 50,
            lastRegeneration: mockDate,
          }),
          update: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 40,
            lastRegeneration: mockDate,
          }),
          create: vi.fn(),
        },
        user: {
          upsert: vi.fn(),
        },
        tokenTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'tx-123',
            userId: testUserId,
            amount: -10,
            type: TokenTransactionType.SPEND_ENHANCEMENT,
            balanceAfter: 40,
            metadata: { tier: 'TIER_2K' },
          }),
        },
      }
      mockTransaction.mockImplementation((callback) => callback(mockTx))

      await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: 'image_enhancement',
        sourceId: 'job-123',
        metadata: { tier: 'TIER_2K' },
      })

      expect(mockTx.tokenTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { tier: 'TIER_2K' },
        }),
      })
    })
  })

  describe('addTokens', () => {
    it('should add tokens to existing balance', async () => {
      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 50,
            lastRegeneration: mockDate,
          }),
          update: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 100,
            lastRegeneration: mockDate,
          }),
          create: vi.fn(),
        },
        user: {
          upsert: vi.fn(),
        },
        tokenTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'tx-123',
            userId: testUserId,
            amount: 50,
            type: TokenTransactionType.EARN_PURCHASE,
            balanceAfter: 100,
          }),
        },
      }
      mockTransaction.mockImplementation((callback) => callback(mockTx))

      const result = await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 50,
        type: TokenTransactionType.EARN_PURCHASE,
      })

      expect(result.success).toBe(true)
      expect(result.balance).toBe(100)
    })

    it('should create User and balance for new user when adding tokens', async () => {
      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 0,
            lastRegeneration: mockDate,
          }),
          update: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 50,
            lastRegeneration: mockDate,
          }),
        },
        user: {
          upsert: vi.fn().mockResolvedValue({ id: testUserId }),
        },
        tokenTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'tx-123',
            userId: testUserId,
            amount: 50,
            type: TokenTransactionType.EARN_PURCHASE,
            balanceAfter: 50,
          }),
        },
      }
      mockTransaction.mockImplementation((callback) => callback(mockTx))

      const result = await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 50,
        type: TokenTransactionType.EARN_PURCHASE,
      })

      expect(result.success).toBe(true)
      expect(mockTx.user.upsert).toHaveBeenCalledWith({
        where: { id: testUserId },
        update: {},
        create: { id: testUserId },
      })
      expect(mockTx.userTokenBalance.create).toHaveBeenCalled()
    })

    it('should cap balance at MAX_TOKEN_BALANCE for regeneration', async () => {
      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 95,
            lastRegeneration: mockDate,
          }),
          update: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 100,
            lastRegeneration: mockDate,
          }),
          create: vi.fn(),
        },
        user: {
          upsert: vi.fn(),
        },
        tokenTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'tx-123',
            userId: testUserId,
            amount: 10,
            type: TokenTransactionType.EARN_REGENERATION,
            balanceAfter: 100,
          }),
        },
      }
      mockTransaction.mockImplementation((callback) => callback(mockTx))

      await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 10,
        type: TokenTransactionType.EARN_REGENERATION,
      })

      // Verify balance is capped at 100 (MAX_TOKEN_BALANCE)
      expect(mockTx.userTokenBalance.update).toHaveBeenCalledWith({
        where: { userId: testUserId },
        data: expect.objectContaining({
          balance: 100, // 95 + 10 would be 105, but capped at 100
        }),
      })
    })

    it('should not cap balance for purchase type', async () => {
      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 95,
            lastRegeneration: mockDate,
          }),
          update: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 145,
            lastRegeneration: mockDate,
          }),
          create: vi.fn(),
        },
        user: {
          upsert: vi.fn(),
        },
        tokenTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'tx-123',
            userId: testUserId,
            amount: 50,
            type: TokenTransactionType.EARN_PURCHASE,
            balanceAfter: 145,
          }),
        },
      }
      mockTransaction.mockImplementation((callback) => callback(mockTx))

      await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 50,
        type: TokenTransactionType.EARN_PURCHASE,
      })

      // Verify balance is NOT capped for purchases
      expect(mockTx.userTokenBalance.update).toHaveBeenCalledWith({
        where: { userId: testUserId },
        data: expect.objectContaining({
          balance: 145, // 95 + 50 = 145, no cap for purchases
        }),
      })
    })
  })

  describe('refundTokens', () => {
    it('should refund tokens successfully', async () => {
      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 40,
            lastRegeneration: mockDate,
          }),
          update: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 50,
            lastRegeneration: mockDate,
          }),
          create: vi.fn(),
        },
        user: {
          upsert: vi.fn(),
        },
        tokenTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'tx-123',
            userId: testUserId,
            amount: 10,
            type: TokenTransactionType.REFUND,
            balanceAfter: 50,
          }),
        },
      }
      mockTransaction.mockImplementation((callback) => callback(mockTx))

      const result = await TokenBalanceManager.refundTokens(
        testUserId,
        10,
        'job-123',
        'Enhancement failed'
      )

      expect(result.success).toBe(true)
      expect(result.balance).toBe(50)
    })

    it('should handle refund for new user (creates balance first)', async () => {
      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 0,
            lastRegeneration: mockDate,
          }),
          update: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 10,
            lastRegeneration: mockDate,
          }),
        },
        user: {
          upsert: vi.fn().mockResolvedValue({ id: testUserId }),
        },
        tokenTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'tx-123',
            userId: testUserId,
            amount: 10,
            type: TokenTransactionType.REFUND,
            balanceAfter: 10,
          }),
        },
      }
      mockTransaction.mockImplementation((callback) => callback(mockTx))

      const result = await TokenBalanceManager.refundTokens(
        testUserId,
        10,
        'job-123',
        'Enhancement failed'
      )

      expect(result.success).toBe(true)
      expect(mockTx.user.upsert).toHaveBeenCalled()
    })
  })

  describe('processRegeneration', () => {
    it('should not regenerate if time interval not elapsed', async () => {
      const recentRegen = new Date(mockDate.getTime() - 5 * 60 * 1000) // 5 minutes ago
      mockUserTokenBalance.findUnique.mockResolvedValue({
        userId: testUserId,
        balance: 50,
        lastRegeneration: recentRegen,
      })

      const result = await TokenBalanceManager.processRegeneration(testUserId)

      expect(result).toBe(0)
      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('should not regenerate if balance is at max', async () => {
      const oldRegen = new Date(mockDate.getTime() - 30 * 60 * 1000) // 30 minutes ago
      mockUserTokenBalance.findUnique.mockResolvedValue({
        userId: testUserId,
        balance: 100, // MAX_TOKEN_BALANCE
        lastRegeneration: oldRegen,
      })

      const result = await TokenBalanceManager.processRegeneration(testUserId)

      expect(result).toBe(0)
    })

    it('should regenerate tokens when interval has elapsed', async () => {
      const oldRegen = new Date(mockDate.getTime() - 30 * 60 * 1000) // 30 minutes ago
      mockUserTokenBalance.findUnique.mockResolvedValue({
        userId: testUserId,
        balance: 50,
        lastRegeneration: oldRegen,
      })

      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 50,
            lastRegeneration: oldRegen,
          }),
          update: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 52,
            lastRegeneration: mockDate,
          }),
          create: vi.fn(),
        },
        user: {
          upsert: vi.fn(),
        },
        tokenTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'tx-123',
            userId: testUserId,
            amount: 2,
            type: TokenTransactionType.EARN_REGENERATION,
            balanceAfter: 52,
          }),
        },
      }
      mockTransaction.mockImplementation((callback) => callback(mockTx))

      const result = await TokenBalanceManager.processRegeneration(testUserId)

      // 30 minutes / 15 minutes = 2 intervals, 2 * 1 token = 2 tokens
      expect(result).toBe(2)
    })

    it('should handle regeneration for new user', async () => {
      mockUserTokenBalance.findUnique.mockResolvedValue(null)
      mockUser.upsert.mockResolvedValue({ id: testUserId })
      mockUserTokenBalance.create.mockResolvedValue({
        userId: testUserId,
        balance: 0,
        lastRegeneration: mockDate,
      })

      const result = await TokenBalanceManager.processRegeneration(testUserId)

      // New user just created, so 0 time elapsed
      expect(result).toBe(0)
    })
  })

  describe('getTransactionHistory', () => {
    it('should return transaction history with default pagination', async () => {
      const mockTransactions = [
        { id: 'tx-1', amount: -10, type: TokenTransactionType.SPEND_ENHANCEMENT },
        { id: 'tx-2', amount: 50, type: TokenTransactionType.EARN_PURCHASE },
      ]
      mockTokenTransaction.findMany.mockResolvedValue(mockTransactions)

      const result = await TokenBalanceManager.getTransactionHistory(testUserId)

      expect(result).toEqual(mockTransactions)
      expect(mockTokenTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should support custom pagination', async () => {
      mockTokenTransaction.findMany.mockResolvedValue([])

      await TokenBalanceManager.getTransactionHistory(testUserId, 10, 20)

      expect(mockTokenTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      })
    })
  })

  describe('getConsumptionStats', () => {
    it('should calculate consumption stats correctly', async () => {
      const mockTransactions = [
        { amount: -10, type: TokenTransactionType.SPEND_ENHANCEMENT },
        { amount: -5, type: TokenTransactionType.SPEND_ENHANCEMENT },
        { amount: 50, type: TokenTransactionType.EARN_PURCHASE },
        { amount: 1, type: TokenTransactionType.EARN_REGENERATION },
        { amount: 5, type: TokenTransactionType.REFUND },
      ]
      mockTokenTransaction.findMany.mockResolvedValue(mockTransactions)

      const result = await TokenBalanceManager.getConsumptionStats(testUserId)

      expect(result).toEqual({
        totalSpent: 15, // 10 + 5
        totalEarned: 51, // 50 + 1
        totalRefunded: 5,
        transactionCount: 5,
      })
    })

    it('should return zeros for user with no transactions', async () => {
      mockTokenTransaction.findMany.mockResolvedValue([])

      const result = await TokenBalanceManager.getConsumptionStats(testUserId)

      expect(result).toEqual({
        totalSpent: 0,
        totalEarned: 0,
        totalRefunded: 0,
        transactionCount: 0,
      })
    })
  })

  describe('error handling', () => {
    it('should handle database errors in consumeTokens gracefully', async () => {
      mockTransaction.mockRejectedValue(new Error('Database connection failed'))

      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: 'test',
        sourceId: 'test-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })

    it('should handle database errors in addTokens gracefully', async () => {
      mockTransaction.mockRejectedValue(new Error('Transaction failed'))

      const result = await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 50,
        type: TokenTransactionType.EARN_PURCHASE,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Transaction failed')
    })

    it('should handle unknown error types', async () => {
      mockTransaction.mockRejectedValue('Unknown error string')

      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: 'test',
        sourceId: 'test-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })
  })
})
