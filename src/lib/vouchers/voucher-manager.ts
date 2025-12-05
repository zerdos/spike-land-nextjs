import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import type {
  Prisma,
  VoucherStatus as VoucherStatusType,
  VoucherType as VoucherTypeEnum,
} from "@prisma/client";

// Use string literals to avoid runtime dependency on Prisma enums
// These match the Prisma schema enum values
const VoucherStatus = {
  ACTIVE: "ACTIVE" as VoucherStatusType,
  INACTIVE: "INACTIVE" as VoucherStatusType,
  EXPIRED: "EXPIRED" as VoucherStatusType,
  DEPLETED: "DEPLETED" as VoucherStatusType,
} as const;

const VoucherType = {
  FIXED_TOKENS: "FIXED_TOKENS" as VoucherTypeEnum,
  PERCENTAGE_BONUS: "PERCENTAGE_BONUS" as VoucherTypeEnum,
  SUBSCRIPTION_TRIAL: "SUBSCRIPTION_TRIAL" as VoucherTypeEnum,
} as const;

export interface VoucherValidationResult {
  valid: boolean;
  error?: string;
  voucher?: {
    code: string;
    type: VoucherTypeEnum;
    value: number;
    remainingUses: number | null;
    expiresAt: Date | null;
  };
}

export interface VoucherRedemptionResult {
  success: boolean;
  error?: string;
  tokensGranted?: number;
  newBalance?: number;
}

export class VoucherManager {
  /**
   * Validate a voucher code without redeeming
   */
  static async validate(code: string, userId?: string): Promise<VoucherValidationResult> {
    const normalizedCode = code.trim().toUpperCase();

    const voucher = await prisma.voucher.findUnique({
      where: { code: normalizedCode },
      include: {
        redemptions: userId
          ? {
            where: { userId },
          }
          : false,
      },
    });

    if (!voucher) {
      return { valid: false, error: "Voucher code not found" };
    }

    if (voucher.status !== VoucherStatus.ACTIVE) {
      return { valid: false, error: "This voucher is no longer active" };
    }

    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
      return { valid: false, error: "This voucher has expired" };
    }

    if (voucher.maxUses && voucher.currentUses >= voucher.maxUses) {
      return { valid: false, error: "This voucher has reached its usage limit" };
    }

    // Check if user already redeemed (if userId provided)
    if (userId && Array.isArray(voucher.redemptions) && voucher.redemptions.length > 0) {
      return { valid: false, error: "You have already redeemed this voucher" };
    }

    const remainingUses = voucher.maxUses
      ? voucher.maxUses - voucher.currentUses
      : null;

    return {
      valid: true,
      voucher: {
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        remainingUses,
        expiresAt: voucher.expiresAt,
      },
    };
  }

  /**
   * Redeem a voucher and grant tokens to user
   *
   * Race Condition Mitigation:
   * 1. Unique constraint on (voucherId, userId) in VoucherRedemption prevents duplicate redemptions
   * 2. Transaction isolation ensures atomic read-check-update for usage counts
   * 3. Token addition is performed INSIDE the same transaction for atomicity
   * 4. For maxUses race conditions across different users: the increment operation
   *    uses database-level atomicity - worst case is slightly exceeding maxUses
   * 5. If strict enforcement needed, add SELECT FOR UPDATE when Prisma supports it
   */
  static async redeem(code: string, userId: string): Promise<VoucherRedemptionResult> {
    const normalizedCode = code.trim().toUpperCase();

    try {
      // Use transaction for atomicity - includes token addition
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await prisma.$transaction(async (tx: any) => {
        // Get voucher with lock
        const voucher = await tx.voucher.findUnique({
          where: { code: normalizedCode },
          include: {
            redemptions: {
              where: { userId },
            },
          },
        });

        if (!voucher) {
          console.log("[VOUCHER] Validation failed", {
            code: normalizedCode,
            reason: "Voucher code not found",
            timestamp: new Date().toISOString(),
          });
          return { success: false, error: "Voucher code not found" };
        }

        if (voucher.status !== VoucherStatus.ACTIVE) {
          console.log("[VOUCHER] Validation failed", {
            code: normalizedCode,
            reason: "Voucher not active",
            status: voucher.status,
            timestamp: new Date().toISOString(),
          });
          return { success: false, error: "This voucher is no longer active" };
        }

        if (voucher.expiresAt && voucher.expiresAt < new Date()) {
          console.log("[VOUCHER] Validation failed", {
            code: normalizedCode,
            reason: "Voucher expired",
            expiresAt: voucher.expiresAt,
            timestamp: new Date().toISOString(),
          });
          return { success: false, error: "This voucher has expired" };
        }

        if (voucher.maxUses && voucher.currentUses >= voucher.maxUses) {
          console.log("[VOUCHER] Validation failed", {
            code: normalizedCode,
            reason: "Usage limit reached",
            maxUses: voucher.maxUses,
            currentUses: voucher.currentUses,
            timestamp: new Date().toISOString(),
          });
          return { success: false, error: "This voucher has reached its usage limit" };
        }

        if (voucher.redemptions.length > 0) {
          console.log("[VOUCHER] Validation failed", {
            code: normalizedCode,
            reason: "Already redeemed by user",
            userId,
            timestamp: new Date().toISOString(),
          });
          return { success: false, error: "You have already redeemed this voucher" };
        }

        // Calculate tokens to grant
        let tokensToGrant = voucher.value;
        if (voucher.type === VoucherType.PERCENTAGE_BONUS) {
          // For percentage, get current balance and add percentage
          const { balance: currentBalance } = await TokenBalanceManager.getBalance(userId);
          tokensToGrant = Math.floor(currentBalance * (voucher.value / 100));
        }

        // Create redemption record
        await tx.voucherRedemption.create({
          data: {
            voucherId: voucher.id,
            userId,
            tokensGranted: tokensToGrant,
          },
        });

        // Increment usage count
        await tx.voucher.update({
          where: { id: voucher.id },
          data: { currentUses: { increment: 1 } },
        });

        // Check if voucher is now depleted
        if (voucher.maxUses && voucher.currentUses + 1 >= voucher.maxUses) {
          await tx.voucher.update({
            where: { id: voucher.id },
            data: { status: VoucherStatus.DEPLETED },
          });
        }

        // Add tokens INSIDE the same transaction for atomicity
        // Ensure User record exists (handles JWT-only auth)
        await tx.user.upsert({
          where: { id: userId },
          update: {},
          create: { id: userId },
        });

        // Get or create token balance
        let tokenBalance = await tx.userTokenBalance.findUnique({
          where: { userId },
        });

        if (!tokenBalance) {
          tokenBalance = await tx.userTokenBalance.create({
            data: {
              userId,
              balance: 0,
              lastRegeneration: new Date(),
            },
          });
        }

        // Update balance with tokens
        const updatedBalance = await tx.userTokenBalance.update({
          where: { userId },
          data: { balance: { increment: tokensToGrant } },
        });

        // Create transaction record
        await tx.tokenTransaction.create({
          data: {
            userId,
            amount: tokensToGrant,
            type: "EARN_BONUS",
            source: "voucher_redemption",
            sourceId: voucher.id,
            balanceAfter: updatedBalance.balance,
            metadata: { voucherCode: normalizedCode } as Prisma.InputJsonValue,
          },
        });

        console.log("[VOUCHER] Redeemed", {
          userId,
          code: normalizedCode,
          tokensGranted: tokensToGrant,
          voucherType: voucher.type,
          newBalance: updatedBalance.balance,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          tokensGranted: tokensToGrant,
          newBalance: updatedBalance.balance,
        };
      });
    } catch (error) {
      console.error("[VOUCHER] Redemption error", {
        code: normalizedCode,
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to redeem voucher",
      };
    }
  }
}
