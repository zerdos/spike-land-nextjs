import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "./balance-manager";
import {
  processAllUserRegenerations,
  processUserRegeneration,
  getNextRegenerationTime,
  getTimeUntilNextRegeneration,
} from "./regeneration";

vi.mock("@/lib/prisma", () => ({
  default: {
    userTokenBalance: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("./balance-manager", () => ({
  TokenBalanceManager: {
    processRegeneration: vi.fn(),
    getBalance: vi.fn(),
  },
}));

describe("Token Regeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("processAllUserRegenerations", () => {
    it("should process regeneration for all users", async () => {
      const mockUsers = [
        { userId: "user-1" },
        { userId: "user-2" },
        { userId: "user-3" },
      ];

      vi.mocked(prisma.userTokenBalance.findMany).mockResolvedValueOnce(
        mockUsers as never,
      );

      vi.mocked(TokenBalanceManager.processRegeneration)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);

      const result = await processAllUserRegenerations();

      expect(result.totalUsersProcessed).toBe(2);
      expect(result.totalTokensRegenerated).toBe(3);
      expect(result.errors).toHaveLength(0);
      expect(prisma.userTokenBalance.findMany).toHaveBeenCalledOnce();
    });

    it("should handle errors gracefully when processing users", async () => {
      const mockUsers = [{ userId: "user-1" }, { userId: "user-2" }];

      vi.mocked(prisma.userTokenBalance.findMany).mockResolvedValueOnce(
        mockUsers as never,
      );

      const error = new Error("Balance not found");
      vi.mocked(TokenBalanceManager.processRegeneration)
        .mockResolvedValueOnce(1)
        .mockRejectedValueOnce(error);

      const result = await processAllUserRegenerations();

      expect(result.totalUsersProcessed).toBe(1);
      expect(result.totalTokensRegenerated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        userId: "user-2",
        error: "Balance not found",
      });
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed");
      vi.mocked(prisma.userTokenBalance.findMany).mockRejectedValueOnce(dbError);

      const result = await processAllUserRegenerations();

      expect(result.totalUsersProcessed).toBe(0);
      expect(result.totalTokensRegenerated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should skip users with no tokens regenerated", async () => {
      const mockUsers = [{ userId: "user-1" }, { userId: "user-2" }];

      vi.mocked(prisma.userTokenBalance.findMany).mockResolvedValueOnce(
        mockUsers as never,
      );

      vi.mocked(TokenBalanceManager.processRegeneration)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await processAllUserRegenerations();

      expect(result.totalUsersProcessed).toBe(0);
      expect(result.totalTokensRegenerated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle unknown errors in user processing", async () => {
      const mockUsers = [{ userId: "user-1" }];

      vi.mocked(prisma.userTokenBalance.findMany).mockResolvedValueOnce(
        mockUsers as never,
      );

      vi.mocked(TokenBalanceManager.processRegeneration).mockRejectedValueOnce(
        "Unknown error string",
      );

      const result = await processAllUserRegenerations();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe("Unknown error");
    });
  });

  describe("processUserRegeneration", () => {
    it("should process regeneration for a specific user", async () => {
      vi.mocked(TokenBalanceManager.processRegeneration).mockResolvedValueOnce(
        5,
      );

      const tokensAdded = await processUserRegeneration("user-1");

      expect(tokensAdded).toBe(5);
      expect(TokenBalanceManager.processRegeneration).toHaveBeenCalledWith(
        "user-1",
      );
    });

    it("should return 0 if no tokens added", async () => {
      vi.mocked(TokenBalanceManager.processRegeneration).mockResolvedValueOnce(
        0,
      );

      const tokensAdded = await processUserRegeneration("user-1");

      expect(tokensAdded).toBe(0);
    });
  });

  describe("getNextRegenerationTime", () => {
    it("should calculate next regeneration time correctly", async () => {
      const now = new Date();
      const lastRegen = new Date(now.getTime() - 5 * 60 * 1000);

      vi.mocked(TokenBalanceManager.getBalance).mockResolvedValueOnce({
        balance: 5,
        lastRegeneration: lastRegen,
      } as never);

      const nextTime = await getNextRegenerationTime("user-1");

      expect(nextTime).toBeDefined();
      const expectedTime = new Date(lastRegen.getTime() + 15 * 60 * 1000);
      expect(nextTime?.getTime()).toBe(expectedTime.getTime());
    });

    it("should handle different last regeneration times", async () => {
      const baseTime = new Date("2024-01-01T10:00:00Z");
      const lastRegen = new Date(baseTime.getTime());

      vi.mocked(TokenBalanceManager.getBalance).mockResolvedValueOnce({
        balance: 10,
        lastRegeneration: lastRegen,
      } as never);

      const nextTime = await getNextRegenerationTime("user-1");

      const expectedTime = new Date(baseTime.getTime() + 15 * 60 * 1000);
      expect(nextTime?.getTime()).toBe(expectedTime.getTime());
    });
  });

  describe("getTimeUntilNextRegeneration", () => {
    it("should calculate time remaining until next regeneration", async () => {
      const now = new Date();
      const lastRegen = new Date(now.getTime() - 10 * 60 * 1000);
      const nextExpected = new Date(lastRegen.getTime() + 15 * 60 * 1000);

      vi.mocked(TokenBalanceManager.getBalance).mockResolvedValueOnce({
        balance: 5,
        lastRegeneration: lastRegen,
      } as never);

      const timeRemaining = await getTimeUntilNextRegeneration("user-1");

      const expectedMs = Math.max(0, nextExpected.getTime() - now.getTime());
      expect(timeRemaining).toBeLessThanOrEqual(expectedMs + 100);
      expect(timeRemaining).toBeGreaterThanOrEqual(expectedMs - 100);
    });

    it("should return 0 if regeneration time has passed", async () => {
      const now = new Date();
      const lastRegen = new Date(now.getTime() - 20 * 60 * 1000);

      vi.mocked(TokenBalanceManager.getBalance).mockResolvedValueOnce({
        balance: 10,
        lastRegeneration: lastRegen,
      } as never);

      const timeRemaining = await getTimeUntilNextRegeneration("user-1");

      expect(timeRemaining).toBe(0);
    });

    it("should handle very recent regenerations", async () => {
      const now = new Date();
      const lastRegen = new Date(now.getTime() - 1000);

      vi.mocked(TokenBalanceManager.getBalance).mockResolvedValueOnce({
        balance: 10,
        lastRegeneration: lastRegen,
      } as never);

      const timeRemaining = await getTimeUntilNextRegeneration("user-1");

      const expectedMs = 15 * 60 * 1000 - 1000;
      expect(timeRemaining).toBeLessThanOrEqual(expectedMs + 100);
      expect(timeRemaining).toBeGreaterThanOrEqual(expectedMs - 100);
    });
  });
});
