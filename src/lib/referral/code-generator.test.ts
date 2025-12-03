import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as codeGenerator from './code-generator'
import prisma from '@/lib/prisma'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('Referral Code Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateUniqueReferralCode', () => {
    it('should generate an 8-character code', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const code = await codeGenerator.generateUniqueReferralCode()

      expect(code).toHaveLength(8)
      expect(code).toMatch(/^[A-Z0-9]+$/)
    })

    it('should not include ambiguous characters', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const code = await codeGenerator.generateUniqueReferralCode()

      // Should not contain O, I, 0, 1
      expect(code).not.toMatch(/[OI01]/)
    })

    it('should retry if code already exists', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ id: 'existing-user' } as any)
        .mockResolvedValueOnce(null)

      const code = await codeGenerator.generateUniqueReferralCode()

      expect(code).toHaveLength(8)
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-user',
      } as any)

      await expect(codeGenerator.generateUniqueReferralCode()).rejects.toThrow(
        'Failed to generate unique referral code after maximum retries'
      )

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(5)
    })
  })

  describe('assignReferralCodeToUser', () => {
    it('should return existing code if user already has one', async () => {
      const existingCode = 'ABC12345'
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referralCode: existingCode,
      } as any)

      const code = await codeGenerator.assignReferralCodeToUser('user-123')

      expect(code).toBe(existingCode)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should generate and assign new code if user has none', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ referralCode: null } as any)
        .mockResolvedValueOnce(null) // For uniqueness check

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-123',
        referralCode: 'XYZ98765',
      } as any)

      const code = await codeGenerator.assignReferralCodeToUser('user-123')

      expect(code).toHaveLength(8)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { referralCode: expect.any(String) },
      })
    })
  })

  describe('getUserByReferralCode', () => {
    it('should return user ID for valid code', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
      } as any)

      const userId = await codeGenerator.getUserByReferralCode('ABC12345')

      expect(userId).toBe('user-123')
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { referralCode: 'ABC12345' },
        select: { id: true },
      })
    })

    it('should return null for invalid code', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const userId = await codeGenerator.getUserByReferralCode('INVALID')

      expect(userId).toBeNull()
    })
  })
})
