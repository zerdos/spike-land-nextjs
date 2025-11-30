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

const TOKEN_REGENERATION_INTERVAL_MS = 15 * 60 * 1000
const MAX_TOKEN_BALANCE = 100
const TOKENS_PER_REGENERATION = 1

export class TokenBalanceManager {
  static async getBalance(userId: string): Promise<TokenBalanceResult> {
    let tokenBalance = await prisma.userTokenBalance.findUnique({
      where: { userId },
    })

    if (!tokenBalance) {
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
        },
      })

      tokenBalance = await prisma.userTokenBalance.create({
        data: {
          userId,
          balance: 0,
          lastRegeneration: new Date(),
        },
      })
    }

    return {
      balance: tokenBalance.balance,
      lastRegeneration: tokenBalance.lastRegeneration,
    }
  }

  static async hasEnoughTokens(
    userId: string,
    amount: number
  ): Promise<boolean> {
    const { balance } = await this.getBalance(userId)
    return balance >= amount
  }

  static async consumeTokens(
    params: ConsumeTokensParams
  ): Promise<TokenTransactionResult> {
    const { userId, amount, source, sourceId, metadata } = params

    try {
      const result = await prisma.$transaction(async (tx) => {
        const tokenBalance = await tx.userTokenBalance.findUnique({
          where: { userId },
        })

        if (!tokenBalance) {
          throw new Error('Token balance not found')
        }

        if (tokenBalance.balance < amount) {
          throw new Error(
            `Insufficient tokens. Required: ${amount}, Available: ${tokenBalance.balance}`
          )
        }

        const updatedBalance = await tx.userTokenBalance.update({
          where: { userId },
          data: {
            balance: {
              decrement: amount,
            },
          },
        })

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
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  static async addTokens(
    params: AddTokensParams
  ): Promise<TokenTransactionResult> {
    const { userId, amount, type, source, sourceId, metadata } = params

    try {
      const result = await prisma.$transaction(async (tx) => {
        let tokenBalance = await tx.userTokenBalance.findUnique({
          where: { userId },
        })

        if (!tokenBalance) {
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

        let newBalance = tokenBalance.balance + amount
        if (type === TokenTransactionType.EARN_REGENERATION) {
          newBalance = Math.min(newBalance, MAX_TOKEN_BALANCE)
        }

        const updatedBalance = await tx.userTokenBalance.update({
          where: { userId },
          data: {
            balance: newBalance,
            ...(type === TokenTransactionType.EARN_REGENERATION && {
              lastRegeneration: new Date(),
            }),
          },
        })

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
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

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

  static async processRegeneration(userId: string): Promise<number> {
    const { balance, lastRegeneration } = await this.getBalance(userId)

    const now = new Date()
    const timeSinceLastRegen = now.getTime() - lastRegeneration.getTime()

    if (timeSinceLastRegen < TOKEN_REGENERATION_INTERVAL_MS) {
      return 0
    }

    if (balance >= MAX_TOKEN_BALANCE) {
      return 0
    }

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

  static async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<TokenTransaction[]> {
    return prisma.tokenTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  static async getConsumptionStats(userId: string): Promise<{
    totalSpent: number
    totalEarned: number
    totalRefunded: number
    transactionCount: number
  }> {
    const transactions = await prisma.tokenTransaction.findMany({
      where: { userId },
    })

    let totalSpent = 0
    let totalEarned = 0
    let totalRefunded = 0

    for (const tx of transactions) {
      if (tx.type === TokenTransactionType.SPEND_ENHANCEMENT) {
        totalSpent += Math.abs(tx.amount)
      } else if (
        tx.type === TokenTransactionType.EARN_PURCHASE ||
        tx.type === TokenTransactionType.EARN_REGENERATION ||
        tx.type === TokenTransactionType.EARN_BONUS
      ) {
        totalEarned += tx.amount
      } else if (tx.type === TokenTransactionType.REFUND) {
        totalRefunded += tx.amount
      }
    }

    return {
      totalSpent,
      totalEarned,
      totalRefunded,
      transactionCount: transactions.length,
    }
  }
}
