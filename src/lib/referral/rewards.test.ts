import prisma from "@/lib/prisma";
import { TokenBalanceManager } from "@/lib/tokens/balance-manager";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as rewards from "./rewards";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    referral: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: {
    addTokens: vi.fn(),
  },
}));

describe("Referral Rewards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("completeReferralAndGrantRewards", () => {
    it("should grant tokens to both referrer and referee", async () => {
      const mockReferral = {
        id: "ref-123",
        referrerId: "referrer-123",
        refereeId: "referee-456",
        status: "PENDING",
        referrer: { id: "referrer-123", email: "referrer@example.com" },
        referee: { id: "referee-456", email: "referee@example.com" },
      };

      vi.mocked(prisma.referral.findUnique).mockResolvedValue(
        mockReferral as any,
      );

      vi.mocked(prisma.$transaction).mockImplementation(
        async (callback: any) => {
          vi.mocked(TokenBalanceManager.addTokens)
            .mockResolvedValueOnce({ success: true, balance: 50 } as any)
            .mockResolvedValueOnce({ success: true, balance: 50 } as any);

          return callback({
            referral: { update: vi.fn() },
            user: { update: vi.fn() },
          });
        },
      );

      const result = await rewards.completeReferralAndGrantRewards("ref-123");

      expect(result.success).toBe(true);
      expect(result.referrerTokensGranted).toBe(50);
      expect(result.refereeTokensGranted).toBe(50);
    });

    it("should fail if referral not found", async () => {
      vi.mocked(prisma.referral.findUnique).mockResolvedValue(null);

      const result = await rewards.completeReferralAndGrantRewards("ref-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Referral not found");
    });

    it("should fail if referral already completed", async () => {
      vi.mocked(prisma.referral.findUnique).mockResolvedValue({
        id: "ref-123",
        status: "COMPLETED",
      } as any);

      const result = await rewards.completeReferralAndGrantRewards("ref-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Referral already completed");
    });

    it("should fail if referral marked as invalid", async () => {
      vi.mocked(prisma.referral.findUnique).mockResolvedValue({
        id: "ref-123",
        status: "INVALID",
      } as any);

      const result = await rewards.completeReferralAndGrantRewards("ref-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Referral marked as invalid");
    });

    it("should handle token grant failures", async () => {
      const mockReferral = {
        id: "ref-123",
        referrerId: "referrer-123",
        refereeId: "referee-456",
        status: "PENDING",
        referrer: { id: "referrer-123", email: "referrer@example.com" },
        referee: { id: "referee-456", email: "referee@example.com" },
      };

      vi.mocked(prisma.referral.findUnique).mockResolvedValue(
        mockReferral as any,
      );

      vi.mocked(prisma.$transaction).mockImplementation(
        async (callback: any) => {
          vi.mocked(TokenBalanceManager.addTokens).mockResolvedValueOnce({
            success: false,
            error: "Database error",
          } as any);

          return callback({
            referral: { update: vi.fn() },
            user: { update: vi.fn() },
          });
        },
      );

      const result = await rewards.completeReferralAndGrantRewards("ref-123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to grant tokens");
    });
  });

  describe("markReferralAsInvalid", () => {
    it("should mark referral as invalid", async () => {
      vi.mocked(prisma.referral.update).mockResolvedValue({
        id: "ref-123",
        status: "INVALID",
      } as any);

      const result = await rewards.markReferralAsInvalid(
        "ref-123",
        "Same IP address",
      );

      expect(result.success).toBe(true);
      expect(prisma.referral.update).toHaveBeenCalledWith({
        where: { id: "ref-123" },
        data: { status: "INVALID" },
      });
    });

    it("should handle database errors", async () => {
      vi.mocked(prisma.referral.update).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await rewards.markReferralAsInvalid("ref-123", "Fraud");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("getReferralStats", () => {
    it("should return referral statistics", async () => {
      vi.mocked(prisma.referral.count)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // completed
        .mockResolvedValueOnce(2); // pending

      vi.mocked(prisma.referral.findMany).mockResolvedValue([
        { tokensGranted: 100 },
        { tokensGranted: 100 },
        { tokensGranted: 100 },
      ] as any);

      const stats = await rewards.getReferralStats("user-123");

      expect(stats).toEqual({
        totalReferrals: 10,
        completedReferrals: 7,
        pendingReferrals: 2,
        tokensEarned: 150, // 3 * 100 / 2
      });
    });

    it("should handle zero referrals", async () => {
      vi.mocked(prisma.referral.count).mockResolvedValue(0);
      vi.mocked(prisma.referral.findMany).mockResolvedValue([]);

      const stats = await rewards.getReferralStats("user-123");

      expect(stats).toEqual({
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        tokensEarned: 0,
      });
    });
  });

  describe("getReferredUsers", () => {
    it("should return anonymized list of referred users", async () => {
      vi.mocked(prisma.referral.findMany).mockResolvedValue([
        {
          id: "ref-1",
          status: "COMPLETED",
          createdAt: new Date("2024-01-01"),
          tokensGranted: 100,
          referee: { id: "user-1", email: "john.doe@example.com" },
        },
        {
          id: "ref-2",
          status: "PENDING",
          createdAt: new Date("2024-01-02"),
          tokensGranted: 0,
          referee: { id: "user-2", email: "jane.smith@test.com" },
        },
      ] as any);

      const users = await rewards.getReferredUsers("referrer-123");

      expect(users).toHaveLength(2);
      expect(users[0].email).toBe("j***@example.com");
      expect(users[0].status).toBe("COMPLETED");
      expect(users[0].tokensGranted).toBe(50); // Referrer's portion
      expect(users[1].email).toBe("j***@test.com");
      expect(users[1].status).toBe("PENDING");
    });

    it("should handle empty referral list", async () => {
      vi.mocked(prisma.referral.findMany).mockResolvedValue([]);

      const users = await rewards.getReferredUsers("referrer-123");

      expect(users).toEqual([]);
    });

    it("should respect limit parameter", async () => {
      vi.mocked(prisma.referral.findMany).mockResolvedValue([]);

      await rewards.getReferredUsers("referrer-123", 10);

      expect(prisma.referral.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it("should handle malformed emails", async () => {
      vi.mocked(prisma.referral.findMany).mockResolvedValue([
        {
          id: "ref-1",
          status: "COMPLETED",
          createdAt: new Date("2024-01-01"),
          tokensGranted: 100,
          referee: { id: "user-1", email: "invalidemail" },
        },
      ] as any);

      const users = await rewards.getReferredUsers("referrer-123");

      expect(users[0].email).toBe("unknown");
    });

    it("should handle null email", async () => {
      vi.mocked(prisma.referral.findMany).mockResolvedValue([
        {
          id: "ref-1",
          status: "COMPLETED",
          createdAt: new Date("2024-01-01"),
          tokensGranted: 100,
          referee: { id: "user-1", email: null },
        },
      ] as any);

      const users = await rewards.getReferredUsers("referrer-123");

      expect(users[0].email).toBe("unknown");
    });
  });
});
