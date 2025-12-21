import { getUserFriendlyError } from "@/lib/errors/error-messages";
import { logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import {
  Prisma,
  SubscriptionTier,
  type TokenTransaction,
  TokenTransactionType,
} from "@prisma/client";
import { TOKEN_REGENERATION_INTERVAL_MS, TOKENS_PER_REGENERATION } from "./constants";
import { TierManager } from "./tier-manager";

export interface TokenBalanceResult {
  balance: number;
  lastRegeneration: Date;
  tier: SubscriptionTier;
  maxBalance: number;
}

export interface ConsumeTokensParams {
  userId: string;
  amount: number;
  source: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
}

export interface AddTokensParams {
  userId: string;
  amount: number;
  type: TokenTransactionType;
  source?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface TokenTransactionResult {
  success: boolean;
  transaction?: TokenTransaction;
  balance?: number;
  error?: string;
}

// Note: TOKEN_REGENERATION_INTERVAL_MS and TOKENS_PER_REGENERATION imported from ./constants
// Note: MAX_TOKEN_BALANCE is now dynamic per tier - use TierManager.getTierCapacity()

export class TokenBalanceManager {
  /**
   * Validate userId is a non-empty string
   */
  private static validateUserId(userId: string): void {
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      throw new Error("Invalid userId: must be a non-empty string");
    }
  }

  /**
   * Get user's token balance, creating balance record if it doesn't exist
   * Uses a transaction to prevent race conditions during user/balance creation
   */
  static async getBalance(userId: string): Promise<TokenBalanceResult> {
    this.validateUserId(userId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenBalance = await prisma.$transaction(async (tx: any) => {
      let balance = await tx.userTokenBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        // Ensure User record exists before creating UserTokenBalance
        // This handles cases where NextAuth uses JWT strategy without database adapter
        await tx.user.upsert({
          where: { id: userId },
          update: {},
          create: { id: userId },
        });

        // Get initial capacity for FREE tier (default)
        const initialCapacity = TierManager.getTierCapacity(SubscriptionTier.FREE);

        // Create initial token balance for new user
        balance = await tx.userTokenBalance.create({
          data: {
            userId,
            balance: initialCapacity,
            tier: SubscriptionTier.FREE,
            lastRegeneration: new Date(),
          },
        });
      }

      return balance;
    });

    const tier = tokenBalance.tier as SubscriptionTier;
    const maxBalance = TierManager.getTierCapacity(tier);

    return {
      balance: tokenBalance.balance,
      lastRegeneration: tokenBalance.lastRegeneration,
      tier,
      maxBalance,
    };
  }

  /**
   * Check if user has enough tokens for a purchase
   */
  static async hasEnoughTokens(
    userId: string,
    amount: number,
  ): Promise<boolean> {
    const { balance } = await this.getBalance(userId);
    return balance >= amount;
  }

  /**
   * Consume tokens for an enhancement job
   * Returns transaction result or error if insufficient balance
   */
  static async consumeTokens(
    params: ConsumeTokensParams,
  ): Promise<TokenTransactionResult> {
    const { userId, amount, source, sourceId, metadata } = params;
    const consumeLogger = logger.child({
      userId,
      amount,
      source,
      sourceId,
    });

    consumeLogger.debug("Attempting to consume tokens");

    // Validate userId synchronously
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      const error = new Error("Invalid userId: must be a non-empty string");
      const userFriendlyError = getUserFriendlyError(error);
      consumeLogger.error("Invalid userId", error);
      return {
        success: false,
        error: userFriendlyError.message,
      };
    }

    if (amount <= 0) {
      const error = new Error(
        `Invalid token amount: ${amount}. Must be positive.`,
      );
      consumeLogger.error("Invalid token amount", error);
      const userFriendlyError = getUserFriendlyError(error);
      return {
        success: false,
        error: userFriendlyError.message,
      };
    }

    // Use transaction to ensure atomic update

    const { data: result, error } = await tryCatch(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma.$transaction(async (tx: any) => {
        // Get or create balance
        let tokenBalance = await tx.userTokenBalance.findUnique({
          where: { userId },
        });

        if (!tokenBalance) {
          // Ensure User record exists before creating UserTokenBalance
          // This handles cases where NextAuth uses JWT strategy without database adapter
          await tx.user.upsert({
            where: { id: userId },
            update: {},
            create: {
              id: userId,
            },
          });

          // Get initial capacity for FREE tier (default)
          const initialCapacity = TierManager.getTierCapacity(SubscriptionTier.FREE);

          // Create initial balance with tier capacity
          tokenBalance = await tx.userTokenBalance.create({
            data: {
              userId,
              balance: initialCapacity,
              tier: SubscriptionTier.FREE,
              lastRegeneration: new Date(),
            },
          });

          consumeLogger.info("Created initial token balance for new user");
        }

        // Check if sufficient balance
        if (tokenBalance.balance < amount) {
          const insufficientError = new Error(
            `Insufficient tokens. Required: ${amount}, Available: ${tokenBalance.balance}`,
          );
          consumeLogger.warn("Insufficient tokens", {
            required: amount,
            available: tokenBalance.balance,
          });
          throw insufficientError;
        }

        // Update balance
        const updatedBalance = await tx.userTokenBalance.update({
          where: { userId },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });

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
        });

        consumeLogger.info("Tokens consumed successfully", {
          newBalance: updatedBalance.balance,
        });

        return { transaction, balance: updatedBalance.balance };
      }),
    );

    if (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      const userFriendlyError = getUserFriendlyError(
        error instanceof Error ? error : new Error(errorMessage),
      );

      consumeLogger.error(
        "Token consumption failed",
        error instanceof Error ? error : new Error(errorMessage),
      );

      return {
        success: false,
        error: userFriendlyError.message,
      };
    }

    return {
      success: true,
      transaction: result.transaction,
      balance: result.balance,
    };
  }

  /**
   * Add tokens to user's balance (purchase, regeneration, bonus)
   */
  static async addTokens(
    params: AddTokensParams,
  ): Promise<TokenTransactionResult> {
    const { userId, amount, type, source, sourceId, metadata } = params;
    const addLogger = logger.child({
      userId,
      amount,
      type,
      source,
    });

    addLogger.debug("Attempting to add tokens");

    // Validate userId synchronously
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      const error = new Error("Invalid userId: must be a non-empty string");
      const userFriendlyError = getUserFriendlyError(error);
      addLogger.error("Invalid userId", error);
      return {
        success: false,
        error: userFriendlyError.message,
      };
    }

    if (amount <= 0) {
      const error = new Error(
        `Invalid token amount: ${amount}. Must be positive.`,
      );
      addLogger.error("Invalid token amount", error);
      const userFriendlyError = getUserFriendlyError(error);
      return {
        success: false,
        error: userFriendlyError.message,
      };
    }

    const { data: result, error } = await tryCatch(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma.$transaction(async (tx: any) => {
        // Get or create balance
        let tokenBalance = await tx.userTokenBalance.findUnique({
          where: { userId },
        });

        if (!tokenBalance) {
          // Ensure User record exists before creating UserTokenBalance
          await tx.user.upsert({
            where: { id: userId },
            update: {},
            create: {
              id: userId,
            },
          });

          // Get initial capacity for FREE tier (default)
          const initialCapacity = TierManager.getTierCapacity(SubscriptionTier.FREE);

          tokenBalance = await tx.userTokenBalance.create({
            data: {
              userId,
              balance: initialCapacity,
              tier: SubscriptionTier.FREE,
              lastRegeneration: new Date(),
            },
          });

          addLogger.info("Created initial token balance for new user");
        }

        // Get tier-specific max balance
        const currentTier = tokenBalance.tier as SubscriptionTier;
        const maxBalance = TierManager.getTierCapacity(currentTier);

        // Cap balance at tier maximum for regeneration
        let newBalance = tokenBalance.balance + amount;
        let wasCapped = false;
        if (type === TokenTransactionType.EARN_REGENERATION) {
          const beforeCap = newBalance;
          newBalance = Math.min(newBalance, maxBalance);
          if (beforeCap > newBalance) {
            wasCapped = true;
            addLogger.debug("Balance capped at tier maximum", {
              requested: beforeCap,
              capped: newBalance,
              tier: currentTier,
              maxBalance,
            });
          }
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
        });

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
        });

        addLogger.info("Tokens added successfully", {
          newBalance: updatedBalance.balance,
          wasCapped,
        });

        return { transaction, balance: updatedBalance.balance };
      }),
    );

    if (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      const userFriendlyError = getUserFriendlyError(
        error instanceof Error ? error : new Error(errorMessage),
      );

      addLogger.error(
        "Adding tokens failed",
        error instanceof Error ? error : new Error(errorMessage),
      );

      return {
        success: false,
        error: userFriendlyError.message,
      };
    }

    return {
      success: true,
      transaction: result.transaction,
      balance: result.balance,
    };
  }

  /**
   * Refund tokens for a failed enhancement job
   */
  static async refundTokens(
    userId: string,
    amount: number,
    sourceId: string,
    reason?: string,
  ): Promise<TokenTransactionResult> {
    return this.addTokens({
      userId,
      amount,
      type: TokenTransactionType.REFUND,
      source: "enhancement_failed",
      sourceId,
      metadata: reason ? { reason } : undefined,
    });
  }

  /**
   * Process token regeneration for a user
   * Returns number of tokens regenerated (0 if not due yet)
   */
  static async processRegeneration(userId: string): Promise<number> {
    const { balance, lastRegeneration, tier, maxBalance } = await this.getBalance(userId);

    // Check if regeneration is due
    const now = new Date();
    const timeSinceLastRegen = now.getTime() - lastRegeneration.getTime();

    if (timeSinceLastRegen < TOKEN_REGENERATION_INTERVAL_MS) {
      return 0; // Not due yet
    }

    // Don't regenerate if already at tier max
    if (balance >= maxBalance) {
      return 0;
    }

    // Calculate how many tokens should be regenerated
    const intervalsElapsed = Math.floor(
      timeSinceLastRegen / TOKEN_REGENERATION_INTERVAL_MS,
    );
    const tokensToAdd = Math.min(
      intervalsElapsed * TOKENS_PER_REGENERATION,
      maxBalance - balance,
    );

    // Add tokens
    const result = await this.addTokens({
      userId,
      amount: tokensToAdd,
      type: TokenTransactionType.EARN_REGENERATION,
      source: "auto_regeneration",
      metadata: {
        intervalsElapsed,
        timeSinceLastRegenMs: timeSinceLastRegen,
        tier,
      },
    });

    return result.success ? tokensToAdd : 0;
  }

  /**
   * Get transaction history for a user
   */
  static async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<TokenTransaction[]> {
    this.validateUserId(userId);

    return prisma.tokenTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get token consumption stats for a user
   * Uses aggregation queries for better performance with large datasets
   */
  static async getConsumptionStats(userId: string): Promise<{
    totalSpent: number;
    totalEarned: number;
    totalRefunded: number;
    transactionCount: number;
  }> {
    this.validateUserId(userId);

    const [spendResult, earnResult, refundResult, countResult] = await Promise
      .all([
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
      ]);

    return {
      totalSpent: Math.abs(spendResult._sum.amount ?? 0),
      totalEarned: earnResult._sum.amount ?? 0,
      totalRefunded: refundResult._sum.amount ?? 0,
      transactionCount: countResult,
    };
  }
}
