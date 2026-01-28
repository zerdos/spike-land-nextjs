/**
 * Unit tests for workspace-subscription.ts
 */

import type { WorkspaceSubscriptionTier } from "@/generated/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceSubscriptionService } from "./workspace-subscription";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

// Import mocked prisma
import prisma from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  workspace: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $queryRaw: ReturnType<typeof vi.fn>;
};

describe("WorkspaceSubscriptionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canAddSocialAccount", () => {
    it("should allow adding when under limit", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "ws-1",
        subscriptionTier: "FREE" as WorkspaceSubscriptionTier,
        maxSocialAccounts: 3,
        maxScheduledPosts: 30,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        usedAiCredits: 0,
        maxTeamMembers: 1,
        billingCycleStart: null,
        _count: { socialAccounts: 1, scheduledPosts: 0, members: 1 },
      });

      const result = await WorkspaceSubscriptionService.canAddSocialAccount("ws-1");

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.limit).toBe(3);
      expect(result.upgradeRequired).toBe(false);
      expect(result.message).toContain("2 more social account");
    });

    it("should deny when at limit", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "ws-1",
        subscriptionTier: "FREE" as WorkspaceSubscriptionTier,
        maxSocialAccounts: 3,
        maxScheduledPosts: 30,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        usedAiCredits: 0,
        maxTeamMembers: 1,
        billingCycleStart: null,
        _count: { socialAccounts: 3, scheduledPosts: 0, members: 1 },
      });

      const result = await WorkspaceSubscriptionService.canAddSocialAccount("ws-1");

      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe(true);
      expect(result.message).toContain("limit reached");
    });

    it("should allow unlimited for BUSINESS tier", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "ws-1",
        subscriptionTier: "BUSINESS" as WorkspaceSubscriptionTier,
        maxSocialAccounts: -1,
        maxScheduledPosts: -1,
        maxAbTests: -1,
        monthlyAiCredits: 5000,
        usedAiCredits: 0,
        maxTeamMembers: 10,
        billingCycleStart: new Date(),
        _count: { socialAccounts: 100, scheduledPosts: 0, members: 1 },
      });

      const result = await WorkspaceSubscriptionService.canAddSocialAccount("ws-1");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.message).toBe("Unlimited");
    });

    it("should return not found for missing workspace", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null);

      const result = await WorkspaceSubscriptionService.canAddSocialAccount("nonexistent");

      expect(result.allowed).toBe(false);
      expect(result.message).toBe("Workspace not found");
    });
  });

  describe("canCreateScheduledPost", () => {
    it("should allow scheduling when under limit", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "ws-1",
        subscriptionTier: "FREE" as WorkspaceSubscriptionTier,
        maxSocialAccounts: 3,
        maxScheduledPosts: 30,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        usedAiCredits: 0,
        maxTeamMembers: 1,
        billingCycleStart: null,
        _count: { socialAccounts: 1, scheduledPosts: 10, members: 1 },
      });

      const result = await WorkspaceSubscriptionService.canCreateScheduledPost("ws-1");

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(10);
      expect(result.limit).toBe(30);
    });

    it("should deny when at limit", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "ws-1",
        subscriptionTier: "FREE" as WorkspaceSubscriptionTier,
        maxSocialAccounts: 3,
        maxScheduledPosts: 30,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        usedAiCredits: 0,
        maxTeamMembers: 1,
        billingCycleStart: null,
        _count: { socialAccounts: 1, scheduledPosts: 30, members: 1 },
      });

      const result = await WorkspaceSubscriptionService.canCreateScheduledPost("ws-1");

      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe(true);
    });

    it("should allow unlimited for PRO tier", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "ws-1",
        subscriptionTier: "PRO" as WorkspaceSubscriptionTier,
        maxSocialAccounts: 10,
        maxScheduledPosts: -1,
        maxAbTests: 10,
        monthlyAiCredits: 1000,
        usedAiCredits: 0,
        maxTeamMembers: 3,
        billingCycleStart: new Date(),
        _count: { socialAccounts: 1, scheduledPosts: 999, members: 1 },
      });

      const result = await WorkspaceSubscriptionService.canCreateScheduledPost("ws-1");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  describe("canCreateAbTest", () => {
    it("should allow when under limit", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        subscriptionTier: "FREE" as WorkspaceSubscriptionTier,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        usedAiCredits: 0,
      });

      const result = await WorkspaceSubscriptionService.canCreateAbTest("ws-1");

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0); // Not implemented yet
      expect(result.limit).toBe(1);
    });

    it("should return not found for missing workspace", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null);

      const result = await WorkspaceSubscriptionService.canCreateAbTest("nonexistent");

      expect(result.allowed).toBe(false);
      expect(result.message).toBe("Workspace not found");
    });
  });

  describe("canUseAiCredits", () => {
    it("should allow when enough credits remain", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        subscriptionTier: "FREE" as WorkspaceSubscriptionTier,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        usedAiCredits: 50,
      });

      const result = await WorkspaceSubscriptionService.canUseAiCredits("ws-1", 25);

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(50);
      expect(result.limit).toBe(100);
      expect(result.message).toContain("50 AI credits remaining");
    });

    it("should deny when insufficient credits", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        subscriptionTier: "FREE" as WorkspaceSubscriptionTier,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        usedAiCredits: 90,
      });

      const result = await WorkspaceSubscriptionService.canUseAiCredits("ws-1", 25);

      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe(true);
      expect(result.message).toContain("Insufficient AI credits");
    });

    it("should allow 0 amount without checking workspace", async () => {
      const result = await WorkspaceSubscriptionService.canUseAiCredits("ws-1", 0);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe("No credits required");
      expect(mockPrisma.workspace.findUnique).not.toHaveBeenCalled();
    });

    it("should allow negative amount without checking workspace", async () => {
      const result = await WorkspaceSubscriptionService.canUseAiCredits("ws-1", -5);

      expect(result.allowed).toBe(true);
      expect(mockPrisma.workspace.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("canAddTeamMember", () => {
    it("should allow when under limit", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "ws-1",
        subscriptionTier: "PRO" as WorkspaceSubscriptionTier,
        maxSocialAccounts: 10,
        maxScheduledPosts: -1,
        maxAbTests: 10,
        monthlyAiCredits: 1000,
        usedAiCredits: 0,
        maxTeamMembers: 3,
        billingCycleStart: new Date(),
        _count: { socialAccounts: 1, scheduledPosts: 0, members: 2 },
      });

      const result = await WorkspaceSubscriptionService.canAddTeamMember("ws-1");

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(2);
      expect(result.limit).toBe(3);
    });

    it("should deny when at limit", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "ws-1",
        subscriptionTier: "FREE" as WorkspaceSubscriptionTier,
        maxSocialAccounts: 3,
        maxScheduledPosts: 30,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        usedAiCredits: 0,
        maxTeamMembers: 1,
        billingCycleStart: null,
        _count: { socialAccounts: 1, scheduledPosts: 0, members: 1 },
      });

      const result = await WorkspaceSubscriptionService.canAddTeamMember("ws-1");

      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe(true);
    });
  });

  describe("consumeAiCredits", () => {
    it("should consume credits successfully", async () => {
      // First call for limit check
      mockPrisma.workspace.findUnique.mockResolvedValue({
        subscriptionTier: "FREE" as WorkspaceSubscriptionTier,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        usedAiCredits: 50,
      });

      // Second call for update
      mockPrisma.workspace.update.mockResolvedValue({
        monthlyAiCredits: 100,
        usedAiCredits: 75,
      });

      const result = await WorkspaceSubscriptionService.consumeAiCredits("ws-1", 25);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(25);
      expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        data: { usedAiCredits: { increment: 25 } },
        select: { monthlyAiCredits: true, usedAiCredits: true },
      });
    });

    it("should fail when insufficient credits", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        subscriptionTier: "FREE" as WorkspaceSubscriptionTier,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        usedAiCredits: 90,
      });

      const result = await WorkspaceSubscriptionService.consumeAiCredits("ws-1", 25);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(10);
      expect(mockPrisma.workspace.update).not.toHaveBeenCalled();
    });

    it("should succeed with 0 amount without querying", async () => {
      const result = await WorkspaceSubscriptionService.consumeAiCredits("ws-1", 0);

      expect(result.success).toBe(true);
      expect(mockPrisma.workspace.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.workspace.update).not.toHaveBeenCalled();
    });

    it("should handle update failure", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        subscriptionTier: "FREE" as WorkspaceSubscriptionTier,
        maxAbTests: 1,
        monthlyAiCredits: 100,
        usedAiCredits: 0,
      });

      mockPrisma.workspace.update.mockRejectedValue(new Error("DB error"));

      const result = await WorkspaceSubscriptionService.consumeAiCredits("ws-1", 25);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to consume AI credits");
    });
  });

  describe("resetMonthlyCredits", () => {
    it("should reset credits successfully", async () => {
      mockPrisma.workspace.update.mockResolvedValue({});

      const result = await WorkspaceSubscriptionService.resetMonthlyCredits("ws-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        data: { usedAiCredits: 0 },
      });
    });

    it("should handle reset failure", async () => {
      mockPrisma.workspace.update.mockRejectedValue(new Error("DB error"));

      const result = await WorkspaceSubscriptionService.resetMonthlyCredits("ws-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to reset AI credits");
    });
  });

  describe("upgradeTier", () => {
    it("should upgrade to PRO tier", async () => {
      mockPrisma.workspace.update.mockResolvedValue({});

      const result = await WorkspaceSubscriptionService.upgradeTier("ws-1", "PRO");

      expect(result.success).toBe(true);
      expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        data: {
          subscriptionTier: "PRO",
          maxSocialAccounts: 10,
          maxScheduledPosts: -1,
          maxAbTests: 10,
          monthlyAiCredits: 1000,
          maxTeamMembers: 3,
          billingCycleStart: expect.any(Date),
        },
      });
    });

    it("should upgrade to BUSINESS tier", async () => {
      mockPrisma.workspace.update.mockResolvedValue({});

      const result = await WorkspaceSubscriptionService.upgradeTier("ws-1", "BUSINESS");

      expect(result.success).toBe(true);
      expect(mockPrisma.workspace.update).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        data: expect.objectContaining({
          subscriptionTier: "BUSINESS",
          maxSocialAccounts: -1,
          monthlyAiCredits: 5000,
        }),
      });
    });

    it("should handle upgrade failure", async () => {
      mockPrisma.workspace.update.mockRejectedValue(new Error("DB error"));

      const result = await WorkspaceSubscriptionService.upgradeTier("ws-1", "PRO");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to upgrade tier");
    });
  });

  describe("getSubscriptionInfo", () => {
    it("should return subscription info", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: "ws-1",
        subscriptionTier: "PRO" as WorkspaceSubscriptionTier,
        maxSocialAccounts: 10,
        maxScheduledPosts: -1,
        maxAbTests: 10,
        monthlyAiCredits: 1000,
        usedAiCredits: 250,
        maxTeamMembers: 3,
        billingCycleStart: new Date(),
        _count: { socialAccounts: 5, scheduledPosts: 100, members: 2 },
      });

      const result = await WorkspaceSubscriptionService.getSubscriptionInfo("ws-1");

      expect(result).toEqual({
        tier: "PRO",
        limits: {
          socialAccounts: { used: 5, max: 10 },
          scheduledPosts: { used: 100, max: -1 },
          abTests: { used: 0, max: 10 },
          aiCredits: { used: 250, max: 1000 },
          teamMembers: { used: 2, max: 3 },
        },
      });
    });

    it("should return null for missing workspace", async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue(null);

      const result = await WorkspaceSubscriptionService.getSubscriptionInfo("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findWorkspacesForCreditReset", () => {
    it("should find workspaces with matching billing day", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ id: "ws-1" }, { id: "ws-2" }]);

      const result = await WorkspaceSubscriptionService.findWorkspacesForCreditReset();

      expect(result).toEqual(["ws-1", "ws-2"]);
    });

    it("should return empty array on error", async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error("DB error"));

      const result = await WorkspaceSubscriptionService.findWorkspacesForCreditReset();

      expect(result).toEqual([]);
    });

    it("should return empty array when no workspaces match", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await WorkspaceSubscriptionService.findWorkspacesForCreditReset();

      expect(result).toEqual([]);
    });
  });
});
