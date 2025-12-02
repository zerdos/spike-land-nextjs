import prisma from '@/lib/prisma'
import { TokenBalanceManager } from '@/lib/tokens/balance-manager'
import { VoucherStatus, VoucherType } from '@prisma/client'

export interface VoucherValidationResult {
  valid: boolean
  error?: string
  voucher?: {
    code: string
    type: VoucherType
    value: number
    remainingUses: number | null
    expiresAt: Date | null
  }
}

export interface VoucherRedemptionResult {
  success: boolean
  error?: string
  tokensGranted?: number
  newBalance?: number
}

export class VoucherManager {
  /**
   * Validate a voucher code without redeeming
   */
  static async validate(code: string, userId?: string): Promise<VoucherValidationResult> {
    const normalizedCode = code.trim().toUpperCase()

    const voucher = await prisma.voucher.findUnique({
      where: { code: normalizedCode },
      include: {
        redemptions: userId ? {
          where: { userId }
        } : false
      }
    })

    if (!voucher) {
      return { valid: false, error: 'Voucher code not found' }
    }

    if (voucher.status !== VoucherStatus.ACTIVE) {
      return { valid: false, error: 'This voucher is no longer active' }
    }

    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
      return { valid: false, error: 'This voucher has expired' }
    }

    if (voucher.maxUses && voucher.currentUses >= voucher.maxUses) {
      return { valid: false, error: 'This voucher has reached its usage limit' }
    }

    // Check if user already redeemed (if userId provided)
    if (userId && Array.isArray(voucher.redemptions) && voucher.redemptions.length > 0) {
      return { valid: false, error: 'You have already redeemed this voucher' }
    }

    const remainingUses = voucher.maxUses
      ? voucher.maxUses - voucher.currentUses
      : null

    return {
      valid: true,
      voucher: {
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        remainingUses,
        expiresAt: voucher.expiresAt
      }
    }
  }

  /**
   * Redeem a voucher and grant tokens to user
   */
  static async redeem(code: string, userId: string): Promise<VoucherRedemptionResult> {
    const normalizedCode = code.trim().toUpperCase()

    // Use transaction for atomicity
    return await prisma.$transaction(async (tx) => {
      // Get voucher with lock
      const voucher = await tx.voucher.findUnique({
        where: { code: normalizedCode },
        include: {
          redemptions: {
            where: { userId }
          }
        }
      })

      if (!voucher) {
        return { success: false, error: 'Voucher code not found' }
      }

      if (voucher.status !== VoucherStatus.ACTIVE) {
        return { success: false, error: 'This voucher is no longer active' }
      }

      if (voucher.expiresAt && voucher.expiresAt < new Date()) {
        return { success: false, error: 'This voucher has expired' }
      }

      if (voucher.maxUses && voucher.currentUses >= voucher.maxUses) {
        return { success: false, error: 'This voucher has reached its usage limit' }
      }

      if (voucher.redemptions.length > 0) {
        return { success: false, error: 'You have already redeemed this voucher' }
      }

      // Calculate tokens to grant
      let tokensToGrant = voucher.value
      if (voucher.type === VoucherType.PERCENTAGE_BONUS) {
        // For percentage, get current balance and add percentage
        const { balance: currentBalance } = await TokenBalanceManager.getBalance(userId)
        tokensToGrant = Math.floor(currentBalance * (voucher.value / 100))
      }

      // Create redemption record
      await tx.voucherRedemption.create({
        data: {
          voucherId: voucher.id,
          userId,
          tokensGranted: tokensToGrant
        }
      })

      // Increment usage count
      await tx.voucher.update({
        where: { id: voucher.id },
        data: { currentUses: { increment: 1 } }
      })

      // Check if voucher is now depleted
      if (voucher.maxUses && voucher.currentUses + 1 >= voucher.maxUses) {
        await tx.voucher.update({
          where: { id: voucher.id },
          data: { status: VoucherStatus.DEPLETED }
        })
      }

      return { success: true, tokensToGrant, voucherId: voucher.id }
    }).then(async (result) => {
      if (!result.success) return result as VoucherRedemptionResult

      // Add tokens outside transaction (uses its own transaction internally)
      const tokenResult = await TokenBalanceManager.addTokens({
        userId,
        amount: result.tokensToGrant!,
        type: 'EARN_BONUS',
        source: 'voucher_redemption',
        sourceId: result.voucherId,
        metadata: { voucherCode: normalizedCode }
      })

      if (!tokenResult.success) {
        return {
          success: false,
          error: tokenResult.error || 'Failed to grant tokens'
        }
      }

      return {
        success: true,
        tokensGranted: result.tokensToGrant,
        newBalance: tokenResult.balance
      }
    })
  }
}
