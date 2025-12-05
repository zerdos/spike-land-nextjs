import prisma from '@/lib/prisma'
import {
  TokenTransactionType,
  type TokenTransaction,
  Prisma,
} from '@prisma/client'

export interface TokenBalanceResult {
  balance: number
  lastRegeneration: Date
}

export interface ConsumeTokensParams {
  userId: string
  amount: number
  source: string
  sourceId: string
  metadata?: Record<string, unknown>
}

export interface AddTokensParams {
  userId: string
  amount: number
  type: TokenTransactionType
  source?: string
  sourceId?: string
  metadata?: Record<string, unknown>
}

export interface TokenTransactionResult {
  success: boolean
  transaction?: TokenTransaction
  balance?: number
  error?: string
}

const TOKEN_REGENERATION_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes
const MAX_TOKEN_BALANCE = 100
const TOKENS_PER_REGENERATION = 1

export class TokenBalanceManager {
  /**
   * Validate userId is a non-empty string
   */
  private static validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid userId: must be a non-empty string')
    }
  }

  /**
   * Get user's token balance, creating balance record if it doesn't exist
   * Uses a transaction to prevent race conditions during user/balance creation
   */
  static async getBalance(userId: string): Promise<TokenBalanceResult> {
    this.validateUserId(userId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenBalance = await prisma.$transaction(async (tx: any) => {
      let balance = await tx.userTokenBalance.findUnique({
        where: { userId },
      })

      if (!balance) {
        // Ensure User record exists before creating UserTokenBalance
        // This handles cases where NextAuth uses JWT strategy without database adapter
        await tx.user.upsert({
          where: { id: userId },
          update: {},
          create: { id: userId },
        })

        // Create initial token balance for new user
        balance = await tx.userTokenBalance.create({
          data: {
            userId,
            balance: 0,
            lastRegeneration: new Date(),
          },
        })
      }

      return balance
    })

    return {
      balance: tokenBalance.balance,
      lastRegeneration: tokenBalance.lastRegeneration,
    }
  }

  /**
   * Check if user has enough tokens for a purchase
   */
  static async hasEnoughTokens(
    userId: string,
    amount: number
  ): Promise<boolean> {
    const { balance } = await this.getBalance(userId)
    return balance >= amount
  }

  /**
   * Consume tokens for an enhancement job
   * Returns transaction result or error if insufficient balance
   */
  static async consumeTokens(
    params: ConsumeTokensParams
  ): Promise<TokenTransactionResult> {
    const { userId, amount, source, sourceId, metadata } = params

    try {
      this.validateUserId(userId)
      // Use transaction to ensure atomic update
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await prisma.$transaction(async (tx: any) => {
        // Get or create balance
        let tokenBalance = await tx.userTokenBalance.findUnique({
          where: { userId },
        })

        if (!tokenBalance) {
          // Ensure User record exists before creating UserTokenBalance
          // This handles cases where NextAuth uses JWT strategy without database adapter
          await tx.user.upsert({
            where: { id: userId },
            update: {},
            create: {
              id: userId,
            },
          })

          // Create initial balance with 0 tokens
          tokenBalance = await tx.userTokenBalance.create({
            data: {
              userId,
              balance: 0,
              lastRegeneration: new Date(),
            },
          })
        }

        // Check if sufficient balance
        if (tokenBalance.balance < amount) {
          throw new Error(
            `Insufficient tokens. Required: ${amount}, Available: ${tokenBalance.balance}`
          )
        }

        // Update balance
        const updatedBalance = await tx.userTokenBalance.update({
          where: { userId },
          data: {
            balance: {
              decrement: amount,
            },
          },
        })

        // Create transaction record
        const transaction = await tx.tokenTransaction.create({
          data: {
            userId,
            amount: -amount,
            type: TokenTransactionType.SPEND_ENHANCEMENT,
            source,
            sourceId,
            balanceAfter: updatedBalance.balance,
            ...(metadata && { metadata: metadata as Prisma.InputJsonValue }),
          },
        })

        return { transaction, balance: updatedBalance.balance }
      })

      return {
        success: true,
        transaction: result.transaction,
        balance: result.balance,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? `Token consumption failed: ${error.message}`
          : 'Unknown error during token consumption',
      }
    }
  }

  /**
   * Add tokens to user's balance (purchase, regeneration, bonus)
   */
  static async addTokens(
    params: AddTokensParams
  ): Promise<TokenTransactionResult> {
    const { userId, amount, type, source, sourceId, metadata } = params

    try {
      this.validateUserId(userId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await prisma.$transaction(async (tx: any) => {
        // Get or create balance
        let tokenBalance = await tx.userTokenBalance.findUnique({
          where: { userId },
        })

        if (!tokenBalance) {
          // Ensure User record exists before creating UserTokenBalance
          await tx.user.upsert({
            where: { id: userId },
            update: {},
            create: {
              id: userId,
            },
          })

          tokenBalance = await tx.userTokenBalance.create({
            data: {
              userId,
              balance: 0,
              lastRegeneration: new Date(),
            },
          })
        }

        // Cap balance at maximum for regeneration
        let newBalance = tokenBalance.balance + amount
        if (type === TokenTransactionType.EARN_REGENERATION) {
          newBalance = Math.min(newBalance, MAX_TOKEN_BALANCE)
        }

        // Update balance
        const updatedBalance = await tx.userTokenBalance.update({
          where: { userId },
          data: {
            balance: newBalance,
            ...(type === TokenTransactionType.EARN_REGENERATION && {
              lastRegeneration: new Date(),
            }),
          },
        })

        // Create transaction record
        const transaction = await tx.tokenTransaction.create({
          data: {
            userId,
            amount,
            type,
            source: source ?? null,
            sourceId: sourceId ?? null,
            balanceAfter: updatedBalance.balance,
            ...(metadata && { metadata: metadata as Prisma.InputJsonValue }),
          },
        })

        return { transaction, balance: updatedBalance.balance }
      })

      return {
        success: true,
        transaction: result.transaction,
        balance: result.balance,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error
          ? `Adding tokens failed: ${error.message}`
          : 'Unknown error while adding tokens',
      }
    }
  }

  /**
   * Refund tokens for a failed enhancement job
   */
  static async refundTokens(
    userId: string,
    amount: number,
    sourceId: string,
    reason?: string
  ): Promise<TokenTransactionResult> {
    return this.addTokens({
      userId,
      amount,
      type: TokenTransactionType.REFUND,
      source: 'enhancement_failed',
      sourceId,
      metadata: reason ? { reason } : undefined,
    })
  }

  /**
   * Process token regeneration for a user
   * Returns number of tokens regenerated (0 if not due yet)
   */
  static async processRegeneration(userId: string): Promise<number> {
    const { balance, lastRegeneration } = await this.getBalance(userId)

    // Check if regeneration is due
    const now = new Date()
    const timeSinceLastRegen = now.getTime() - lastRegeneration.getTime()

    if (timeSinceLastRegen < TOKEN_REGENERATION_INTERVAL_MS) {
      return 0 // Not due yet
    }

    // Don't regenerate if already at max
    if (balance >= MAX_TOKEN_BALANCE) {
      return 0
    }

    // Calculate how many tokens should be regenerated
    const intervalsElapsed = Math.floor(
      timeSinceLastRegen / TOKEN_REGENERATION_INTERVAL_MS
    )
    const tokensToAdd = Math.min(
      intervalsElapsed * TOKENS_PER_REGENERATION,
      MAX_TOKEN_BALANCE - balance
    )

    if (tokensToAdd === 0) {
      return 0
    }

    // Add tokens
    const result = await this.addTokens({
      userId,
      amount: tokensToAdd,
      type: TokenTransactionType.EARN_REGENERATION,
      source: 'auto_regeneration',
      metadata: {
        intervalsElapsed,
        timeSinceLastRegenMs: timeSinceLastRegen,
      },
    })

    return result.success ? tokensToAdd : 0
  }

  /**
   * Get transaction history for a user
   */
  static async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<TokenTransaction[]> {
    this.validateUserId(userId)

    return prisma.tokenTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  /**
   * Get token consumption stats for a user
   * Uses aggregation queries for better performance with large datasets
   */
  static async getConsumptionStats(userId: string): Promise<{
    totalSpent: number
    totalEarned: number
    totalRefunded: number
    transactionCount: number
  }> {
    this.validateUserId(userId)

    const [spendResult, earnResult, refundResult, countResult] =
      await Promise.all([
        prisma.tokenTransaction.aggregate({
          where: { userId, type: TokenTransactionType.SPEND_ENHANCEMENT },
          _sum: { amount: true },
        }),
        prisma.tokenTransaction.aggregate({
          where: {
            userId,
            type: {
              in: [
                TokenTransactionType.EARN_PURCHASE,
                TokenTransactionType.EARN_REGENERATION,
                TokenTransactionType.EARN_BONUS,
              ],
            },
          },
          _sum: { amount: true },
        }),
        prisma.tokenTransaction.aggregate({
          where: { userId, type: TokenTransactionType.REFUND },
          _sum: { amount: true },
        }),
        prisma.tokenTransaction.count({ where: { userId } }),
      ])

    return {
      totalSpent: Math.abs(spendResult._sum.amount ?? 0),
      totalEarned: earnResult._sum.amount ?? 0,
      totalRefunded: refundResult._sum.amount ?? 0,
      transactionCount: countResult,
    }
  }
}
