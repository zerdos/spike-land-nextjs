import { TokenTransactionType } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    aggregate: vi.fn(),
    count: vi.fn(),
  },
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    userTokenBalance: mockUserTokenBalance,
    user: mockUser,
    tokenTransaction: mockTokenTransaction,
    $transaction: mockTransaction,
  },
}));

import { TokenBalanceManager } from "./balance-manager";

describe("TokenBalanceManager", () => {
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

  describe("userId validation", () => {
    it("should throw error for empty string userId in getBalance", async () => {
      await expect(TokenBalanceManager.getBalance("")).rejects.toThrow(
        "Invalid userId: must be a non-empty string",
      );
    });

    it("should throw error for whitespace-only userId in getBalance", async () => {
      await expect(TokenBalanceManager.getBalance("   ")).rejects.toThrow(
        "Invalid userId: must be a non-empty string",
      );
    });

    it("should throw error for empty userId in consumeTokens", async () => {
      const result = await TokenBalanceManager.consumeTokens({
        userId: "",
        amount: 10,
        source: "test",
        sourceId: "test-123",
      });

      expect(result.success).toBe(false);
      // Now returns user-friendly error message
      expect(result.error).toBeTruthy();
    });

    it("should throw error for empty userId in addTokens", async () => {
      const result = await TokenBalanceManager.addTokens({
        userId: "",
        amount: 50,
        type: TokenTransactionType.EARN_PURCHASE,
      });

      expect(result.success).toBe(false);
      // Now returns user-friendly error message
      expect(result.error).toBeTruthy();
    });

    it("should throw error for empty userId in getTransactionHistory", async () => {
      await expect(
        TokenBalanceManager.getTransactionHistory(""),
      ).rejects.toThrow("Invalid userId: must be a non-empty string");
    });

    it("should throw error for empty userId in getConsumptionStats", async () => {
      await expect(TokenBalanceManager.getConsumptionStats("")).rejects.toThrow(
        "Invalid userId: must be a non-empty string",
      );
    });
  });

  describe("getBalance", () => {
    it("should return existing balance when user has one", async () => {
      const existingBalance = {
        userId: testUserId,
        balance: 50,
        lastRegeneration: mockDate,
      };

      // Mock the transaction to return the existing balance
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue(existingBalance),
            create: vi.fn(),
          },
          user: {
            upsert: vi.fn(),
          },
        };
        return callback(mockTx);
      });

      const result = await TokenBalanceManager.getBalance(testUserId);

      expect(result).toEqual({
        balance: 50,
        lastRegeneration: mockDate,
      });
    });

    it("should create User and balance when user does not exist (JWT strategy)", async () => {
      const newBalance = {
        userId: testUserId,
        balance: 0,
        lastRegeneration: mockDate,
      };

      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(newBalance),
          },
          user: {
            upsert: vi.fn().mockResolvedValue({ id: testUserId }),
          },
        };
        const result = await callback(mockTx);
        // Verify upsert was called
        expect(mockTx.user.upsert).toHaveBeenCalledWith({
          where: { id: testUserId },
          update: {},
          create: { id: testUserId },
        });
        return result;
      });

      const result = await TokenBalanceManager.getBalance(testUserId);

      expect(result).toEqual({
        balance: 0,
        lastRegeneration: mockDate,
      });
    });
  });

  describe("hasEnoughTokens", () => {
    it("should return true when user has sufficient tokens", async () => {
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({
              userId: testUserId,
              balance: 50,
              lastRegeneration: mockDate,
            }),
            create: vi.fn(),
          },
          user: { upsert: vi.fn() },
        };
        return callback(mockTx);
      });

      const result = await TokenBalanceManager.hasEnoughTokens(testUserId, 10);

      expect(result).toBe(true);
    });

    it("should return false when user has insufficient tokens", async () => {
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({
              userId: testUserId,
              balance: 5,
              lastRegeneration: mockDate,
            }),
            create: vi.fn(),
          },
          user: { upsert: vi.fn() },
        };
        return callback(mockTx);
      });

      const result = await TokenBalanceManager.hasEnoughTokens(testUserId, 10);

      expect(result).toBe(false);
    });

    it("should return false for new user with no balance (creates 0 balance)", async () => {
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              userId: testUserId,
              balance: 0,
              lastRegeneration: mockDate,
            }),
          },
          user: {
            upsert: vi.fn().mockResolvedValue({ id: testUserId }),
          },
        };
        return callback(mockTx);
      });

      const result = await TokenBalanceManager.hasEnoughTokens(testUserId, 10);

      expect(result).toBe(false);
    });
  });

  describe("consumeTokens", () => {
    it("should consume tokens successfully when user has sufficient balance", async () => {
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
            id: "tx-123",
            userId: testUserId,
            amount: -10,
            type: TokenTransactionType.SPEND_ENHANCEMENT,
            balanceAfter: 40,
          }),
        },
      };
      mockTransaction.mockImplementation((callback) => callback(mockTx));

      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: "image_enhancement",
        sourceId: "job-123",
      });

      expect(result.success).toBe(true);
      expect(result.balance).toBe(40);
      expect(result.transaction).toBeDefined();
    });

    it("should create User and balance for new user, then return insufficient tokens error", async () => {
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
      };
      mockTransaction.mockImplementation((callback) => callback(mockTx));

      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: "image_enhancement",
        sourceId: "job-123",
      });

      expect(result.success).toBe(false);
      // Now returns user-friendly error message instead of technical error
      expect(result.error).toBeTruthy();
      expect(mockTx.user.upsert).toHaveBeenCalledWith({
        where: { id: testUserId },
        update: {},
        create: { id: testUserId },
      });
      expect(mockTx.userTokenBalance.create).toHaveBeenCalled();
    });

    it("should return error when existing user has insufficient tokens", async () => {
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
      };
      mockTransaction.mockImplementation((callback) => callback(mockTx));

      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: "image_enhancement",
        sourceId: "job-123",
      });

      expect(result.success).toBe(false);
      // Now returns user-friendly error message instead of technical error
      expect(result.error).toBeTruthy();
    });

    it("should return error when amount is zero", async () => {
      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 0,
        source: "test",
        sourceId: "test-123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should return error when amount is negative", async () => {
      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: -5,
        source: "test",
        sourceId: "test-123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should include metadata in transaction when provided", async () => {
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
            id: "tx-123",
            userId: testUserId,
            amount: -10,
            type: TokenTransactionType.SPEND_ENHANCEMENT,
            balanceAfter: 40,
            metadata: { tier: "TIER_2K" },
          }),
        },
      };
      mockTransaction.mockImplementation((callback) => callback(mockTx));

      await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: "image_enhancement",
        sourceId: "job-123",
        metadata: { tier: "TIER_2K" },
      });

      expect(mockTx.tokenTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { tier: "TIER_2K" },
        }),
      });
    });
  });

  describe("addTokens", () => {
    it("should add tokens to existing balance", async () => {
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
            id: "tx-123",
            userId: testUserId,
            amount: 50,
            type: TokenTransactionType.EARN_PURCHASE,
            balanceAfter: 100,
          }),
        },
      };
      mockTransaction.mockImplementation((callback) => callback(mockTx));

      const result = await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 50,
        type: TokenTransactionType.EARN_PURCHASE,
      });

      expect(result.success).toBe(true);
      expect(result.balance).toBe(100);
    });

    it("should create User and balance for new user when adding tokens", async () => {
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
            id: "tx-123",
            userId: testUserId,
            amount: 50,
            type: TokenTransactionType.EARN_PURCHASE,
            balanceAfter: 50,
          }),
        },
      };
      mockTransaction.mockImplementation((callback) => callback(mockTx));

      const result = await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 50,
        type: TokenTransactionType.EARN_PURCHASE,
      });

      expect(result.success).toBe(true);
      expect(mockTx.user.upsert).toHaveBeenCalledWith({
        where: { id: testUserId },
        update: {},
        create: { id: testUserId },
      });
      expect(mockTx.userTokenBalance.create).toHaveBeenCalled();
    });

    it("should cap balance at MAX_TOKEN_BALANCE for regeneration", async () => {
      // MAX_TOKEN_BALANCE is 10, so test with balance of 8, adding 5
      // 8 + 5 = 13, but capped to 10
      const mockTx = {
        userTokenBalance: {
          findUnique: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 8,
            lastRegeneration: mockDate,
          }),
          update: vi.fn().mockResolvedValue({
            userId: testUserId,
            balance: 10,
            lastRegeneration: mockDate,
          }),
          create: vi.fn(),
        },
        user: {
          upsert: vi.fn(),
        },
        tokenTransaction: {
          create: vi.fn().mockResolvedValue({
            id: "tx-123",
            userId: testUserId,
            amount: 5,
            type: TokenTransactionType.EARN_REGENERATION,
            balanceAfter: 10,
          }),
        },
      };
      mockTransaction.mockImplementation((callback) => callback(mockTx));

      await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 5,
        type: TokenTransactionType.EARN_REGENERATION,
      });

      // Verify balance is capped at 10 (MAX_TOKEN_BALANCE)
      expect(mockTx.userTokenBalance.update).toHaveBeenCalledWith({
        where: { userId: testUserId },
        data: expect.objectContaining({
          balance: 10, // 8 + 5 would be 13, but capped at 10
        }),
      });
    });

    it("should return error when amount is zero", async () => {
      const result = await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 0,
        type: TokenTransactionType.EARN_PURCHASE,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should return error when amount is negative", async () => {
      const result = await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: -10,
        type: TokenTransactionType.EARN_PURCHASE,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should not cap balance for purchase type", async () => {
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
            id: "tx-123",
            userId: testUserId,
            amount: 50,
            type: TokenTransactionType.EARN_PURCHASE,
            balanceAfter: 145,
          }),
        },
      };
      mockTransaction.mockImplementation((callback) => callback(mockTx));

      await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 50,
        type: TokenTransactionType.EARN_PURCHASE,
      });

      // Verify balance is NOT capped for purchases
      expect(mockTx.userTokenBalance.update).toHaveBeenCalledWith({
        where: { userId: testUserId },
        data: expect.objectContaining({
          balance: 145, // 95 + 50 = 145, no cap for purchases
        }),
      });
    });
  });

  describe("refundTokens", () => {
    it("should refund tokens successfully", async () => {
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
            id: "tx-123",
            userId: testUserId,
            amount: 10,
            type: TokenTransactionType.REFUND,
            balanceAfter: 50,
          }),
        },
      };
      mockTransaction.mockImplementation((callback) => callback(mockTx));

      const result = await TokenBalanceManager.refundTokens(
        testUserId,
        10,
        "job-123",
        "Enhancement failed",
      );

      expect(result.success).toBe(true);
      expect(result.balance).toBe(50);
    });

    it("should handle refund for new user (creates balance first)", async () => {
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
            id: "tx-123",
            userId: testUserId,
            amount: 10,
            type: TokenTransactionType.REFUND,
            balanceAfter: 10,
          }),
        },
      };
      mockTransaction.mockImplementation((callback) => callback(mockTx));

      const result = await TokenBalanceManager.refundTokens(
        testUserId,
        10,
        "job-123",
        "Enhancement failed",
      );

      expect(result.success).toBe(true);
      expect(mockTx.user.upsert).toHaveBeenCalled();
    });
  });

  describe("processRegeneration", () => {
    it("should not regenerate if time interval not elapsed", async () => {
      const recentRegen = new Date(mockDate.getTime() - 5 * 60 * 1000); // 5 minutes ago

      // Mock getBalance transaction
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({
              userId: testUserId,
              balance: 50,
              lastRegeneration: recentRegen,
            }),
            create: vi.fn(),
          },
          user: { upsert: vi.fn() },
        };
        return callback(mockTx);
      });

      const result = await TokenBalanceManager.processRegeneration(testUserId);

      expect(result).toBe(0);
    });

    it("should not regenerate if balance is at max", async () => {
      const oldRegen = new Date(mockDate.getTime() - 30 * 60 * 1000); // 30 minutes ago

      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue({
              userId: testUserId,
              balance: 10, // MAX_TOKEN_BALANCE
              lastRegeneration: oldRegen,
            }),
            create: vi.fn(),
          },
          user: { upsert: vi.fn() },
        };
        return callback(mockTx);
      });

      const result = await TokenBalanceManager.processRegeneration(testUserId);

      expect(result).toBe(0);
    });

    it("should regenerate tokens when interval has elapsed", async () => {
      const oldRegen = new Date(mockDate.getTime() - 30 * 60 * 1000); // 30 minutes ago
      let callCount = 0;

      // MAX_TOKEN_BALANCE is 10, so balance must be < 10 to allow regeneration
      mockTransaction.mockImplementation(async (callback) => {
        callCount++;
        if (callCount === 1) {
          // First call is from getBalance
          const mockTx = {
            userTokenBalance: {
              findUnique: vi.fn().mockResolvedValue({
                userId: testUserId,
                balance: 5, // Less than MAX_TOKEN_BALANCE (10)
                lastRegeneration: oldRegen,
              }),
              create: vi.fn(),
            },
            user: { upsert: vi.fn() },
          };
          return callback(mockTx);
        } else {
          // Second call is from addTokens
          const mockTx = {
            userTokenBalance: {
              findUnique: vi.fn().mockResolvedValue({
                userId: testUserId,
                balance: 5,
                lastRegeneration: oldRegen,
              }),
              update: vi.fn().mockResolvedValue({
                userId: testUserId,
                balance: 7, // 5 + 2 = 7
                lastRegeneration: mockDate,
              }),
              create: vi.fn(),
            },
            user: { upsert: vi.fn() },
            tokenTransaction: {
              create: vi.fn().mockResolvedValue({
                id: "tx-123",
                userId: testUserId,
                amount: 2,
                type: TokenTransactionType.EARN_REGENERATION,
                balanceAfter: 7,
              }),
            },
          };
          return callback(mockTx);
        }
      });

      const result = await TokenBalanceManager.processRegeneration(testUserId);

      // 30 minutes / 15 minutes = 2 intervals, 2 * 1 token = 2 tokens
      // tokensToAdd = min(2 * 1, 10 - 5) = min(2, 5) = 2
      expect(result).toBe(2);
    });

    it("should regenerate only 1 token when at MAX - 1 balance", async () => {
      // MAX_TOKEN_BALANCE is 10, so balance = 9 (MAX - 1)
      // With 30 minutes elapsed (2 intervals), tokensToAdd = min(2 * 1, 10 - 9) = min(2, 1) = 1
      // This tests the capping behavior when close to max balance
      const oldRegen = new Date(mockDate.getTime() - 30 * 60 * 1000); // 30 minutes ago

      let callCount = 0;
      mockTransaction.mockImplementation(async (callback) => {
        callCount++;
        if (callCount === 1) {
          // First call is from getBalance - return balance of 9 (MAX - 1)
          const mockTx = {
            userTokenBalance: {
              findUnique: vi.fn().mockResolvedValue({
                userId: testUserId,
                balance: 9, // MAX_TOKEN_BALANCE - 1
                lastRegeneration: oldRegen,
              }),
              create: vi.fn(),
            },
            user: { upsert: vi.fn() },
          };
          return callback(mockTx);
        } else {
          // Second call is from addTokens - balance goes from 9 to 10
          const mockTx = {
            userTokenBalance: {
              findUnique: vi.fn().mockResolvedValue({
                userId: testUserId,
                balance: 9,
                lastRegeneration: oldRegen,
              }),
              update: vi.fn().mockResolvedValue({
                userId: testUserId,
                balance: 10, // MAX_TOKEN_BALANCE
                lastRegeneration: mockDate,
              }),
              create: vi.fn(),
            },
            user: { upsert: vi.fn() },
            tokenTransaction: {
              create: vi.fn().mockResolvedValue({
                id: "tx-123",
                userId: testUserId,
                amount: 1,
                type: TokenTransactionType.EARN_REGENERATION,
                balanceAfter: 10,
              }),
            },
          };
          return callback(mockTx);
        }
      });

      const result = await TokenBalanceManager.processRegeneration(testUserId);

      // Should regenerate only 1 token (capped by MAX_TOKEN_BALANCE - balance = 10 - 9 = 1)
      expect(result).toBe(1);
    });

    it("should handle regeneration for new user", async () => {
      mockTransaction.mockImplementation(async (callback) => {
        const mockTx = {
          userTokenBalance: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              userId: testUserId,
              balance: 0,
              lastRegeneration: mockDate,
            }),
          },
          user: {
            upsert: vi.fn().mockResolvedValue({ id: testUserId }),
          },
        };
        return callback(mockTx);
      });

      const result = await TokenBalanceManager.processRegeneration(testUserId);

      // New user just created, so 0 time elapsed
      expect(result).toBe(0);
    });

    it("should return 0 when addTokens fails during regeneration", async () => {
      const oldRegen = new Date(mockDate.getTime() - 30 * 60 * 1000); // 30 minutes ago
      let callCount = 0;

      mockTransaction.mockImplementation(async (callback) => {
        callCount++;
        if (callCount === 1) {
          // First call is from getBalance
          const mockTx = {
            userTokenBalance: {
              findUnique: vi.fn().mockResolvedValue({
                userId: testUserId,
                balance: 50,
                lastRegeneration: oldRegen,
              }),
              create: vi.fn(),
            },
            user: { upsert: vi.fn() },
          };
          return callback(mockTx);
        } else {
          // Second call is from addTokens - simulate database failure
          throw new Error("Database connection failed");
        }
      });

      const result = await TokenBalanceManager.processRegeneration(testUserId);

      // Should return 0 when addTokens fails
      expect(result).toBe(0);
    });
  });

  describe("getTransactionHistory", () => {
    it("should return transaction history with default pagination", async () => {
      const mockTransactions = [
        {
          id: "tx-1",
          amount: -10,
          type: TokenTransactionType.SPEND_ENHANCEMENT,
        },
        { id: "tx-2", amount: 50, type: TokenTransactionType.EARN_PURCHASE },
      ];
      mockTokenTransaction.findMany.mockResolvedValue(mockTransactions);

      const result = await TokenBalanceManager.getTransactionHistory(testUserId);

      expect(result).toEqual(mockTransactions);
      expect(mockTokenTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        orderBy: { createdAt: "desc" },
        take: 50,
        skip: 0,
      });
    });

    it("should support custom pagination", async () => {
      mockTokenTransaction.findMany.mockResolvedValue([]);

      await TokenBalanceManager.getTransactionHistory(testUserId, 10, 20);

      expect(mockTokenTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        orderBy: { createdAt: "desc" },
        take: 10,
        skip: 20,
      });
    });
  });

  describe("getConsumptionStats", () => {
    it("should calculate consumption stats correctly using aggregation", async () => {
      // Mock the aggregate and count calls
      mockTokenTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: -15 } }) // SPEND_ENHANCEMENT
        .mockResolvedValueOnce({ _sum: { amount: 51 } }) // EARN types
        .mockResolvedValueOnce({ _sum: { amount: 5 } }); // REFUND
      mockTokenTransaction.count.mockResolvedValue(5);

      const result = await TokenBalanceManager.getConsumptionStats(testUserId);

      expect(result).toEqual({
        totalSpent: 15, // Math.abs(-15)
        totalEarned: 51,
        totalRefunded: 5,
        transactionCount: 5,
      });

      // Verify aggregate was called with correct parameters
      expect(mockTokenTransaction.aggregate).toHaveBeenCalledTimes(3);
      expect(mockTokenTransaction.count).toHaveBeenCalledWith({
        where: { userId: testUserId },
      });
    });

    it("should return zeros for user with no transactions", async () => {
      mockTokenTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });
      mockTokenTransaction.count.mockResolvedValue(0);

      const result = await TokenBalanceManager.getConsumptionStats(testUserId);

      expect(result).toEqual({
        totalSpent: 0,
        totalEarned: 0,
        totalRefunded: 0,
        transactionCount: 0,
      });
    });
  });

  describe("error handling", () => {
    it("should handle database errors in consumeTokens with context", async () => {
      mockTransaction.mockRejectedValue(new Error("Database connection failed"));

      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: "test",
        sourceId: "test-123",
      });

      expect(result.success).toBe(false);
      // Now returns user-friendly error message for database errors
      expect(result.error).toBeTruthy();
    });

    it("should handle database errors in addTokens with context", async () => {
      mockTransaction.mockRejectedValue(new Error("Transaction failed"));

      const result = await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 50,
        type: TokenTransactionType.EARN_PURCHASE,
      });

      expect(result.success).toBe(false);
      // Now returns user-friendly error message for database errors
      expect(result.error).toBeTruthy();
    });

    it("should handle unknown error types in consumeTokens", async () => {
      mockTransaction.mockRejectedValue("Unknown error string");

      const result = await TokenBalanceManager.consumeTokens({
        userId: testUserId,
        amount: 10,
        source: "test",
        sourceId: "test-123",
      });

      expect(result.success).toBe(false);
      // Now returns user-friendly error message for unknown errors
      expect(result.error).toBeTruthy();
    });

    it("should handle unknown error types in addTokens", async () => {
      mockTransaction.mockRejectedValue("Unknown error string");

      const result = await TokenBalanceManager.addTokens({
        userId: testUserId,
        amount: 50,
        type: TokenTransactionType.EARN_PURCHASE,
      });

      expect(result.success).toBe(false);
      // Now returns user-friendly error message for unknown errors
      expect(result.error).toBeTruthy();
    });
  });
});
