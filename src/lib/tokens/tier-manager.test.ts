import { SubscriptionTier } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks
const {
  mockUserTokenBalance,
  mockUser,
  mockTokenTransaction,
  mockSubscription,
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
  },
  mockSubscription: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    userTokenBalance: mockUserTokenBalance,
    user: mockUser,
    tokenTransaction: mockTokenTransaction,
    subscription: mockSubscription,
    $transaction: mockTransaction,
  },
}));

import {
  TIER_CAPACITIES,
  TIER_DISPLAY_NAMES,
  TIER_ORDER,
  TIER_PRICES_GBP,
  TierManager,
} from "./tier-manager";

describe("TierManager", () => {
  const testUserId = "test-user-123";
  const mockDate = new Date("2024-01-15T12:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Constants", () => {
    it("should have correct tier capacities", () => {
      expect(TIER_CAPACITIES.FREE).toBe(10);
      expect(TIER_CAPACITIES.BASIC).toBe(20);
      expect(TIER_CAPACITIES.STANDARD).toBe(50);
      expect(TIER_CAPACITIES.PREMIUM).toBe(100);
    });

    it("should have correct tier prices", () => {
      expect(TIER_PRICES_GBP.FREE).toBe(0);
      expect(TIER_PRICES_GBP.BASIC).toBe(5);
      expect(TIER_PRICES_GBP.STANDARD).toBe(10);
      expect(TIER_PRICES_GBP.PREMIUM).toBe(20);
    });

    it("should have correct tier display names", () => {
      expect(TIER_DISPLAY_NAMES.FREE).toBe("Free");
      expect(TIER_DISPLAY_NAMES.BASIC).toBe("Basic");
      expect(TIER_DISPLAY_NAMES.STANDARD).toBe("Standard");
      expect(TIER_DISPLAY_NAMES.PREMIUM).toBe("Premium");
    });

    it("should have correct tier order", () => {
      expect(TIER_ORDER).toEqual([
        SubscriptionTier.FREE,
        SubscriptionTier.BASIC,
        SubscriptionTier.STANDARD,
        SubscriptionTier.PREMIUM,
      ]);
    });
  });

  describe("getTierInfo", () => {
    it("should return correct info for FREE tier", () => {
      const info = TierManager.getTierInfo(SubscriptionTier.FREE);
      expect(info).toEqual({
        tier: SubscriptionTier.FREE,
        displayName: "Free",
        wellCapacity: 10,
        priceGBP: 0,
      });
    });

    it("should return correct info for PREMIUM tier", () => {
      const info = TierManager.getTierInfo(SubscriptionTier.PREMIUM);
      expect(info).toEqual({
        tier: SubscriptionTier.PREMIUM,
        displayName: "Premium",
        wellCapacity: 100,
        priceGBP: 20,
      });
    });
  });

  describe("getAllTiers", () => {
    it("should return all tiers in order", () => {
      const tiers = TierManager.getAllTiers();
      expect(tiers).toHaveLength(4);
      expect(tiers[0]!.tier).toBe(SubscriptionTier.FREE);
      expect(tiers[3]!.tier).toBe(SubscriptionTier.PREMIUM);
    });
  });

  describe("getTierCapacity", () => {
    it("should return correct capacity for each tier", () => {
      expect(TierManager.getTierCapacity(SubscriptionTier.FREE)).toBe(10);
      expect(TierManager.getTierCapacity(SubscriptionTier.BASIC)).toBe(20);
      expect(TierManager.getTierCapacity(SubscriptionTier.STANDARD)).toBe(50);
      expect(TierManager.getTierCapacity(SubscriptionTier.PREMIUM)).toBe(100);
    });
  });

  describe("getNextTier", () => {
    it("should return BASIC for FREE tier", () => {
      expect(TierManager.getNextTier(SubscriptionTier.FREE)).toBe(
        SubscriptionTier.BASIC,
      );
    });

    it("should return STANDARD for BASIC tier", () => {
      expect(TierManager.getNextTier(SubscriptionTier.BASIC)).toBe(
        SubscriptionTier.STANDARD,
      );
    });

    it("should return PREMIUM for STANDARD tier", () => {
      expect(TierManager.getNextTier(SubscriptionTier.STANDARD)).toBe(
        SubscriptionTier.PREMIUM,
      );
    });

    it("should return null for PREMIUM tier", () => {
      expect(TierManager.getNextTier(SubscriptionTier.PREMIUM)).toBeNull();
    });
  });

  describe("getPreviousTier", () => {
    it("should return null for FREE tier", () => {
      expect(TierManager.getPreviousTier(SubscriptionTier.FREE)).toBeNull();
    });

    it("should return FREE for BASIC tier", () => {
      expect(TierManager.getPreviousTier(SubscriptionTier.BASIC)).toBe(
        SubscriptionTier.FREE,
      );
    });

    it("should return BASIC for STANDARD tier", () => {
      expect(TierManager.getPreviousTier(SubscriptionTier.STANDARD)).toBe(
        SubscriptionTier.BASIC,
      );
    });

    it("should return STANDARD for PREMIUM tier", () => {
      expect(TierManager.getPreviousTier(SubscriptionTier.PREMIUM)).toBe(
        SubscriptionTier.STANDARD,
      );
    });
  });

  describe("canUpgradeTo", () => {
    it("should allow upgrade from FREE to BASIC", () => {
      expect(
        TierManager.canUpgradeTo(SubscriptionTier.FREE, SubscriptionTier.BASIC),
      ).toBe(true);
    });

    it("should allow upgrade from FREE to STANDARD (skipping)", () => {
      expect(
        TierManager.canUpgradeTo(SubscriptionTier.FREE, SubscriptionTier.STANDARD),
      ).toBe(true);
    });

    it("should allow upgrade from FREE to PREMIUM (skipping)", () => {
      expect(
        TierManager.canUpgradeTo(SubscriptionTier.FREE, SubscriptionTier.PREMIUM),
      ).toBe(true);
    });

    it("should allow upgrade from BASIC to STANDARD", () => {
      expect(
        TierManager.canUpgradeTo(SubscriptionTier.BASIC, SubscriptionTier.STANDARD),
      ).toBe(true);
    });

    it("should not allow upgrade from PREMIUM to anything", () => {
      expect(
        TierManager.canUpgradeTo(SubscriptionTier.PREMIUM, SubscriptionTier.FREE),
      ).toBe(false);
    });
  });

  describe("canDowngradeTo", () => {
    it("should not allow downgrade from FREE", () => {
      expect(
        TierManager.canDowngradeTo(SubscriptionTier.FREE, SubscriptionTier.FREE),
      ).toBe(false);
    });

    it("should allow downgrade from BASIC to FREE", () => {
      expect(
        TierManager.canDowngradeTo(SubscriptionTier.BASIC, SubscriptionTier.FREE),
      ).toBe(true);
    });

    it("should allow downgrade from PREMIUM to any lower tier", () => {
      expect(
        TierManager.canDowngradeTo(SubscriptionTier.PREMIUM, SubscriptionTier.FREE),
      ).toBe(true);
      expect(
        TierManager.canDowngradeTo(SubscriptionTier.PREMIUM, SubscriptionTier.BASIC),
      ).toBe(true);
      expect(
        TierManager.canDowngradeTo(
          SubscriptionTier.PREMIUM,
          SubscriptionTier.STANDARD,
        ),
      ).toBe(true);
    });

    it("should not allow downgrade to same tier", () => {
      expect(
        TierManager.canDowngradeTo(
          SubscriptionTier.STANDARD,
          SubscriptionTier.STANDARD,
        ),
      ).toBe(false);
    });
  });

  describe("getTierIndex", () => {
    it("should return correct index for each tier", () => {
      expect(TierManager.getTierIndex(SubscriptionTier.FREE)).toBe(0);
      expect(TierManager.getTierIndex(SubscriptionTier.BASIC)).toBe(1);
      expect(TierManager.getTierIndex(SubscriptionTier.STANDARD)).toBe(2);
      expect(TierManager.getTierIndex(SubscriptionTier.PREMIUM)).toBe(3);
    });
  });

  describe("getUserTier", () => {
    it("should return FREE tier when no balance record exists", async () => {
      mockUserTokenBalance.findUnique.mockResolvedValue(null);

      const tier = await TierManager.getUserTier(testUserId);
      expect(tier).toBe(SubscriptionTier.FREE);
    });

    it("should return user's tier from database", async () => {
      mockUserTokenBalance.findUnique.mockResolvedValue({
        tier: SubscriptionTier.STANDARD,
      });

      const tier = await TierManager.getUserTier(testUserId);
      expect(tier).toBe(SubscriptionTier.STANDARD);
    });

    it("should throw error for invalid userId", async () => {
      await expect(TierManager.getUserTier("")).rejects.toThrow(
        "Invalid userId: must be a non-empty string",
      );
    });

    it("should return FREE tier when database lookup fails", async () => {
      mockUserTokenBalance.findUnique.mockRejectedValue(new Error("Database error"));

      const tier = await TierManager.getUserTier(testUserId);
      expect(tier).toBe(SubscriptionTier.FREE);
    });
  });

  describe("upgradeTier", () => {
    it("should successfully upgrade tier", async () => {
      // Mock the transaction to execute the callback
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({
              userId: testUserId,
              balance: 0,
              tier: SubscriptionTier.FREE,
            }),
            create: vi.fn(),
            update: vi.fn().mockResolvedValue({
              userId: testUserId,
              balance: 20,
              tier: SubscriptionTier.BASIC,
            }),
          },
          user: {
            upsert: vi.fn(),
          },
          tokenTransaction: {
            create: vi.fn(),
          },
        };
        return callback(tx);
      });

      const result = await TierManager.upgradeTier(
        testUserId,
        SubscriptionTier.BASIC,
      );

      expect(result.success).toBe(true);
      expect(result.previousTier).toBe(SubscriptionTier.FREE);
      expect(result.newTier).toBe(SubscriptionTier.BASIC);
      expect(result.tokensGranted).toBe(20);
      expect(result.newBalance).toBe(20);
    });

    it("should fail for invalid upgrade path (downgrade)", async () => {
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({
              userId: testUserId,
              balance: 50,
              tier: SubscriptionTier.PREMIUM,
            }),
          },
        };
        return callback(tx);
      });

      const result = await TierManager.upgradeTier(
        testUserId,
        SubscriptionTier.FREE, // Downgrade via upgradeTier should fail
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid upgrade path");
    });

    it("should throw error for invalid userId", async () => {
      await expect(
        TierManager.upgradeTier("", SubscriptionTier.BASIC),
      ).rejects.toThrow("Invalid userId: must be a non-empty string");
    });

    it("should create user and balance if they do not exist", async () => {
      const mockUserUpsert = vi.fn().mockResolvedValue({});
      const mockBalanceCreate = vi.fn().mockResolvedValue({
        userId: testUserId,
        balance: 0,
        tier: SubscriptionTier.FREE,
      });
      const mockBalanceUpdate = vi.fn().mockResolvedValue({
        userId: testUserId,
        balance: 20,
        tier: SubscriptionTier.BASIC,
      });
      const mockTransactionCreate = vi.fn().mockResolvedValue({});

      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue(null), // User doesn't exist
            create: mockBalanceCreate,
            update: mockBalanceUpdate,
          },
          user: {
            upsert: mockUserUpsert,
          },
          tokenTransaction: {
            create: mockTransactionCreate,
          },
        };
        return callback(tx);
      });

      const result = await TierManager.upgradeTier(testUserId, SubscriptionTier.BASIC);

      expect(result.success).toBe(true);
      expect(mockUserUpsert).toHaveBeenCalled();
      expect(mockBalanceCreate).toHaveBeenCalled();
    });

    it("should handle database error during upgrade", async () => {
      mockTransaction.mockRejectedValue(new Error("Database connection failed"));

      const result = await TierManager.upgradeTier(testUserId, SubscriptionTier.BASIC);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database connection failed");
    });
  });

  describe("shouldPromptUpgrade", () => {
    it("should prompt when balance is 0 and not Premium", async () => {
      mockUserTokenBalance.findUnique.mockResolvedValue({
        balance: 0,
        tier: SubscriptionTier.BASIC,
      });

      const result = await TierManager.shouldPromptUpgrade(testUserId);

      expect(result.shouldPrompt).toBe(true);
      expect(result.currentTier).toBe(SubscriptionTier.BASIC);
      expect(result.nextTier).not.toBeNull();
      expect(result.nextTier?.tier).toBe(SubscriptionTier.STANDARD);
      expect(result.isPremiumAtZero).toBe(false);
    });

    it("should not prompt when balance > 0", async () => {
      mockUserTokenBalance.findUnique.mockResolvedValue({
        balance: 50,
        tier: SubscriptionTier.BASIC,
      });

      const result = await TierManager.shouldPromptUpgrade(testUserId);

      expect(result.shouldPrompt).toBe(false);
      expect(result.isPremiumAtZero).toBe(false);
    });

    it("should return isPremiumAtZero when Premium user at 0 balance", async () => {
      mockUserTokenBalance.findUnique.mockResolvedValue({
        balance: 0,
        tier: SubscriptionTier.PREMIUM,
      });

      const result = await TierManager.shouldPromptUpgrade(testUserId);

      expect(result.shouldPrompt).toBe(false);
      expect(result.isPremiumAtZero).toBe(true);
      expect(result.currentTier).toBe(SubscriptionTier.PREMIUM);
      expect(result.nextTier).toBeNull();
    });
  });

  describe("scheduleDowngrade", () => {
    it("should schedule downgrade successfully", async () => {
      const periodEnd = new Date("2024-02-15T00:00:00Z");

      // Mock the transaction callback - it receives a tx object with the same interface
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({
              tier: SubscriptionTier.PREMIUM,
            }),
          },
          subscription: {
            update: vi.fn().mockResolvedValue({
              currentPeriodEnd: periodEnd,
            }),
          },
        };
        return callback(txMock);
      });

      const result = await TierManager.scheduleDowngrade(
        testUserId,
        SubscriptionTier.BASIC,
      );

      expect(result.success).toBe(true);
      expect(result.effectiveDate).toEqual(periodEnd);
    });

    it("should fail for invalid downgrade", async () => {
      // Mock the transaction callback
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({
              tier: SubscriptionTier.FREE,
            }),
          },
          subscription: {
            update: vi.fn(),
          },
        };
        return callback(txMock);
      });

      const result = await TierManager.scheduleDowngrade(
        testUserId,
        SubscriptionTier.BASIC, // Can't downgrade from FREE
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot downgrade");
    });

    it("should handle database error during schedule downgrade", async () => {
      // Simulate a database error (not a validation error)
      mockTransaction.mockRejectedValue(new Error("Database connection failed"));

      const result = await TierManager.scheduleDowngrade(
        testUserId,
        SubscriptionTier.BASIC,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to schedule downgrade. Please try again.");
    });
  });

  describe("getPremiumZeroBalanceOptions", () => {
    it("should return time until next regeneration", async () => {
      const lastRegen = new Date(mockDate.getTime() - 5 * 60 * 1000); // 5 minutes ago
      mockUserTokenBalance.findUnique.mockResolvedValue({
        lastRegeneration: lastRegen,
      });

      const options = await TierManager.getPremiumZeroBalanceOptions(testUserId);

      expect(options.canPurchaseTokenPack).toBe(true);
      // Should be about 10 minutes until next regen (15 - 5)
      expect(options.timeUntilNextRegen).toBeCloseTo(10 * 60 * 1000, -3);
    });
  });

  describe("cancelDowngrade", () => {
    it("should cancel downgrade successfully", async () => {
      mockSubscription.update.mockResolvedValue({});

      const result = await TierManager.cancelDowngrade(testUserId);

      expect(result.success).toBe(true);
      expect(mockSubscription.update).toHaveBeenCalledWith({
        where: { userId: testUserId },
        data: { downgradeTo: null },
      });
    });

    it("should handle database error when canceling downgrade", async () => {
      mockSubscription.update.mockRejectedValue(new Error("Database error"));

      const result = await TierManager.cancelDowngrade(testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to cancel downgrade");
    });
  });

  describe("processScheduledDowngrade", () => {
    it("should process scheduled downgrade successfully", async () => {
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              downgradeTo: SubscriptionTier.BASIC,
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          userTokenBalance: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(txMock);
      });

      const result = await TierManager.processScheduledDowngrade(testUserId);

      expect(result.success).toBe(true);
      expect(result.newTier).toBe(SubscriptionTier.BASIC);
    });

    it("should return success when no downgrade is scheduled", async () => {
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              downgradeTo: null,
            }),
            update: vi.fn(),
          },
          userTokenBalance: {
            update: vi.fn(),
          },
        };
        return callback(txMock);
      });

      const result = await TierManager.processScheduledDowngrade(testUserId);

      expect(result.success).toBe(true);
      expect(result.newTier).toBeUndefined();
    });

    it("should handle database error during scheduled downgrade", async () => {
      mockTransaction.mockRejectedValue(new Error("Database error"));

      const result = await TierManager.processScheduledDowngrade(testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to process downgrade");
    });
  });

  describe("shouldPromptUpgrade error handling", () => {
    it("should return default values when database lookup fails", async () => {
      mockUserTokenBalance.findUnique.mockRejectedValue(new Error("Database error"));

      const result = await TierManager.shouldPromptUpgrade(testUserId);

      expect(result.shouldPrompt).toBe(false);
      expect(result.currentTier).toBe(SubscriptionTier.FREE);
      expect(result.nextTier).toBe(null);
      expect(result.isPremiumAtZero).toBe(false);
    });

    it("should return default values when user has no token balance record", async () => {
      mockUserTokenBalance.findUnique.mockResolvedValue(null);

      const result = await TierManager.shouldPromptUpgrade(testUserId);

      expect(result.shouldPrompt).toBe(false);
      expect(result.currentTier).toBe(SubscriptionTier.FREE);
      expect(result.nextTier).toBe(null);
      expect(result.isPremiumAtZero).toBe(false);
    });
  });
});
