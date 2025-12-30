import { logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { SubscriptionTier, TokenTransactionType } from "@prisma/client";
import { TOKEN_REGENERATION_INTERVAL_MS } from "./constants";

/**
 * Tier configuration constants
 * Capacity is both the regeneration cap AND the grant on upgrade
 */
export const TIER_CAPACITIES: Record<SubscriptionTier, number> = {
  FREE: 10,
  BASIC: 20,
  STANDARD: 50,
  PREMIUM: 100,
} as const;

export const TIER_PRICES_GBP: Record<SubscriptionTier, number> = {
  FREE: 0,
  BASIC: 5,
  STANDARD: 10,
  PREMIUM: 20,
} as const;

export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  FREE: "Free",
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
} as const;

/**
 * Order of tiers for progressive upgrades
 * Users must upgrade sequentially through this list
 */
export const TIER_ORDER: SubscriptionTier[] = [
  SubscriptionTier.FREE,
  SubscriptionTier.BASIC,
  SubscriptionTier.STANDARD,
  SubscriptionTier.PREMIUM,
];

interface TierInfo {
  tier: SubscriptionTier;
  displayName: string;
  wellCapacity: number;
  priceGBP: number;
}

interface TierUpgradeResult {
  success: boolean;
  previousTier?: SubscriptionTier;
  newTier?: SubscriptionTier;
  tokensGranted?: number;
  newBalance?: number;
  error?: string;
}

interface UpgradePromptResult {
  shouldPrompt: boolean;
  currentTier: SubscriptionTier;
  nextTier: TierInfo | null;
  isPremiumAtZero: boolean;
}

interface PremiumZeroOptions {
  timeUntilNextRegen: number;
  canPurchaseTokenPack: boolean;
}

export class TierManager {
  /**
   * Validate userId is a non-empty string
   */
  private static validateUserId(userId: string): void {
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      throw new Error("Invalid userId: must be a non-empty string");
    }
  }

  /**
   * Get tier info for a specific tier
   */
  static getTierInfo(tier: SubscriptionTier): TierInfo {
    return {
      tier,
      displayName: TIER_DISPLAY_NAMES[tier],
      wellCapacity: TIER_CAPACITIES[tier],
      priceGBP: TIER_PRICES_GBP[tier],
    };
  }

  /**
   * Get all tier info for display
   */
  static getAllTiers(): TierInfo[] {
    return TIER_ORDER.map((tier) => this.getTierInfo(tier));
  }

  /**
   * Get user's current tier from their token balance record
   */
  static async getUserTier(userId: string): Promise<SubscriptionTier> {
    this.validateUserId(userId);

    const { data: tokenBalance, error } = await tryCatch(
      prisma.userTokenBalance.findUnique({
        where: { userId },
        select: { tier: true },
      }),
    );

    if (error) {
      logger.error("Failed to get user tier", error, { userId });
      return SubscriptionTier.FREE;
    }

    return tokenBalance?.tier ?? SubscriptionTier.FREE;
  }

  /**
   * Get the well capacity for a tier
   */
  static getTierCapacity(tier: SubscriptionTier): number {
    return TIER_CAPACITIES[tier];
  }

  /**
   * Get the next tier in the upgrade path
   * Returns null if user is at PREMIUM (highest tier)
   */
  static getNextTier(currentTier: SubscriptionTier): SubscriptionTier | null {
    const currentIndex = TIER_ORDER.indexOf(currentTier);
    if (currentIndex === -1 || currentIndex >= TIER_ORDER.length - 1) {
      return null;
    }
    return TIER_ORDER[currentIndex + 1] ?? null;
  }

  /**
   * Get the previous tier for downgrades
   * Returns null if user is at FREE (lowest tier)
   */
  static getPreviousTier(currentTier: SubscriptionTier): SubscriptionTier | null {
    const currentIndex = TIER_ORDER.indexOf(currentTier);
    if (currentIndex <= 0) {
      return null;
    }
    return TIER_ORDER[currentIndex - 1] ?? null;
  }

  /**
   * Check if upgrade from currentTier to targetTier is valid
   * Upgrades must be sequential (e.g., FREE -> BASIC, not FREE -> PREMIUM)
   */
  static canUpgradeTo(
    currentTier: SubscriptionTier,
    targetTier: SubscriptionTier,
  ): boolean {
    const currentIndex = TIER_ORDER.indexOf(currentTier);
    const targetIndex = TIER_ORDER.indexOf(targetTier);
    // Allow upgrade to any higher tier
    return targetIndex > currentIndex;
  }

  /**
   * Check if downgrade from currentTier to targetTier is valid
   * Can downgrade to any lower tier
   */
  static canDowngradeTo(
    currentTier: SubscriptionTier,
    targetTier: SubscriptionTier,
  ): boolean {
    const currentIndex = TIER_ORDER.indexOf(currentTier);
    const targetIndex = TIER_ORDER.indexOf(targetTier);
    return targetIndex < currentIndex && targetIndex >= 0;
  }

  /**
   * Get tier index for comparison
   */
  static getTierIndex(tier: SubscriptionTier): number {
    return TIER_ORDER.indexOf(tier);
  }

  /**
   * Process tier upgrade for a user
   * - Updates the tier in UserTokenBalance
   * - Grants tokens equal to new tier's capacity
   * - Creates transaction record
   */
  static async upgradeTier(
    userId: string,
    newTier: SubscriptionTier,
  ): Promise<TierUpgradeResult> {
    this.validateUserId(userId);

    const tierLogger = logger.child({ userId, newTier });
    tierLogger.info("Processing tier upgrade");

    const { data: result, error } = await tryCatch(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma.$transaction(async (tx: any) => {
        // Get current balance and tier
        let tokenBalance = await tx.userTokenBalance.findUnique({
          where: { userId },
        });

        if (!tokenBalance) {
          // Create user and balance if they don't exist
          await tx.user.upsert({
            where: { id: userId },
            update: {},
            create: { id: userId },
          });

          tokenBalance = await tx.userTokenBalance.create({
            data: {
              userId,
              balance: 0,
              tier: SubscriptionTier.FREE,
              lastRegeneration: new Date(),
            },
          });
        }

        const currentTier = tokenBalance.tier as SubscriptionTier;

        // Validate upgrade is allowed
        if (!this.canUpgradeTo(currentTier, newTier)) {
          throw new Error(
            `Invalid upgrade path: ${currentTier} -> ${newTier}.`,
          );
        }

        // Get new tier capacity (tokens to grant)
        const tokensToGrant = TIER_CAPACITIES[newTier];

        // Update tier and grant tokens
        const updatedBalance = await tx.userTokenBalance.update({
          where: { userId },
          data: {
            tier: newTier,
            balance: tokensToGrant,
            lastRegeneration: new Date(),
          },
        });

        // Create transaction record for the token grant
        await tx.tokenTransaction.create({
          data: {
            userId,
            amount: tokensToGrant,
            type: TokenTransactionType.EARN_PURCHASE,
            source: "tier_upgrade",
            sourceId: `tier_upgrade_${currentTier}_to_${newTier}`,
            balanceAfter: updatedBalance.balance,
            metadata: {
              previousTier: currentTier,
              newTier: newTier,
              action: "upgrade",
            },
          },
        });

        tierLogger.info("Tier upgrade successful", {
          previousTier: currentTier,
          newTier,
          tokensGranted: tokensToGrant,
          newBalance: updatedBalance.balance,
        });

        return {
          previousTier: currentTier,
          newTier,
          tokensGranted: tokensToGrant,
          newBalance: updatedBalance.balance,
        };
      }),
    );

    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      tierLogger.error(
        "Tier upgrade failed",
        error instanceof Error ? error : new Error(errorMessage),
      );
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Schedule a downgrade for next billing cycle
   * Stores the target tier in the Subscription model
   * Uses a transaction to prevent race conditions between tier check and update
   */
  static async scheduleDowngrade(
    userId: string,
    targetTier: SubscriptionTier,
  ): Promise<{ success: boolean; effectiveDate?: Date; error?: string; }> {
    this.validateUserId(userId);

    const { data: result, error } = await tryCatch(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma.$transaction(async (tx: any) => {
        // Get current tier within transaction to prevent race conditions
        const tokenBalance = await tx.userTokenBalance.findUnique({
          where: { userId },
          select: { tier: true },
        });

        const currentTier = (tokenBalance?.tier as SubscriptionTier) ?? SubscriptionTier.FREE;

        if (!this.canDowngradeTo(currentTier, targetTier)) {
          throw new Error(`Cannot downgrade from ${currentTier} to ${targetTier}`);
        }

        const subscription = await tx.subscription.update({
          where: { userId },
          data: {
            downgradeTo: targetTier,
          },
          select: {
            currentPeriodEnd: true,
          },
        });

        return { currentTier, subscription };
      }),
    );

    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check if this is a validation error (not a database error)
      if (errorMessage.startsWith("Cannot downgrade")) {
        return {
          success: false,
          error: errorMessage,
        };
      }
      logger.error("Failed to schedule downgrade", error, { userId, targetTier });
      return {
        success: false,
        error: "Failed to schedule downgrade. Please try again.",
      };
    }

    logger.info("Downgrade scheduled", {
      userId,
      currentTier: result.currentTier,
      targetTier,
      effectiveDate: result.subscription.currentPeriodEnd,
    });

    return {
      success: true,
      effectiveDate: result.subscription.currentPeriodEnd,
    };
  }

  /**
   * Process a scheduled downgrade (called by webhook on billing cycle end)
   * Updates UserTokenBalance tier but does NOT grant tokens
   */
  static async processScheduledDowngrade(
    userId: string,
  ): Promise<{ success: boolean; newTier?: SubscriptionTier; error?: string; }> {
    this.validateUserId(userId);

    const { data: result, error } = await tryCatch(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma.$transaction(async (tx: any) => {
        const subscription = await tx.subscription.findUnique({
          where: { userId },
          select: { downgradeTo: true },
        });

        if (!subscription?.downgradeTo) {
          return null; // No downgrade scheduled
        }

        const newTier = subscription.downgradeTo as SubscriptionTier;

        // Update the tier (no token grant on downgrade)
        await tx.userTokenBalance.update({
          where: { userId },
          data: { tier: newTier },
        });

        // Clear the downgrade schedule
        await tx.subscription.update({
          where: { userId },
          data: { downgradeTo: null },
        });

        return newTier;
      }),
    );

    if (error) {
      logger.error("Failed to process scheduled downgrade", error, { userId });
      return {
        success: false,
        error: "Failed to process downgrade",
      };
    }

    if (!result) {
      return { success: true }; // No downgrade was scheduled
    }

    logger.info("Processed scheduled downgrade", { userId, newTier: result });
    return {
      success: true,
      newTier: result,
    };
  }

  /**
   * Check if user should be prompted to upgrade (balance = 0 and not Premium)
   */
  static async shouldPromptUpgrade(userId: string): Promise<UpgradePromptResult> {
    this.validateUserId(userId);

    const { data: tokenBalance, error } = await tryCatch(
      prisma.userTokenBalance.findUnique({
        where: { userId },
        select: { balance: true, tier: true },
      }),
    );

    if (error || !tokenBalance) {
      return {
        shouldPrompt: false,
        currentTier: SubscriptionTier.FREE,
        nextTier: null,
        isPremiumAtZero: false,
      };
    }

    const currentTier = tokenBalance.tier as SubscriptionTier;
    const isAtZero = tokenBalance.balance === 0;
    const isPremium = currentTier === SubscriptionTier.PREMIUM;

    if (!isAtZero) {
      return {
        shouldPrompt: false,
        currentTier,
        nextTier: null,
        isPremiumAtZero: false,
      };
    }

    if (isPremium) {
      return {
        shouldPrompt: false,
        currentTier,
        nextTier: null,
        isPremiumAtZero: true,
      };
    }

    const nextTier = this.getNextTier(currentTier);

    return {
      shouldPrompt: true,
      currentTier,
      nextTier: nextTier ? this.getTierInfo(nextTier) : null,
      isPremiumAtZero: false,
    };
  }

  /**
   * Get options for Premium users at 0 balance
   */
  static async getPremiumZeroBalanceOptions(
    userId: string,
  ): Promise<PremiumZeroOptions> {
    this.validateUserId(userId);

    const { data: tokenBalance } = await tryCatch(
      prisma.userTokenBalance.findUnique({
        where: { userId },
        select: { lastRegeneration: true },
      }),
    );

    const now = new Date();
    const lastRegen = tokenBalance?.lastRegeneration ?? now;
    const timeSinceLastRegen = now.getTime() - lastRegen.getTime();
    const timeUntilNextRegen = Math.max(
      0,
      TOKEN_REGENERATION_INTERVAL_MS - timeSinceLastRegen,
    );

    return {
      timeUntilNextRegen,
      canPurchaseTokenPack: true,
    };
  }

  /**
   * Cancel subscription downgrade
   */
  static async cancelDowngrade(
    userId: string,
  ): Promise<{ success: boolean; error?: string; }> {
    this.validateUserId(userId);

    const { error } = await tryCatch(
      prisma.subscription.update({
        where: { userId },
        data: { downgradeTo: null },
      }),
    );

    if (error) {
      logger.error("Failed to cancel downgrade", error, { userId });
      return {
        success: false,
        error: "Failed to cancel downgrade",
      };
    }

    return { success: true };
  }
}
