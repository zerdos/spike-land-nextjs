/**
 * Unit tests for workspace-credit-manager.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceCreditManager } from "./workspace-credit-manager";
import { WorkspaceSubscriptionService } from "@/lib/subscription/workspace-subscription";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
    default: {
        user: {
            findUnique: vi.fn(),
        },
        workspace: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        workspaceMember: {
            findFirst: vi.fn(),
        },
        $executeRaw: vi.fn(),
    },
}));

const mockEnsurePersonalWorkspace = vi.hoisted(() => vi.fn());
vi.mock("@/lib/workspace/ensure-personal-workspace", () => ({
    ensurePersonalWorkspace: mockEnsurePersonalWorkspace,
}));

// Mock Subscription Service
vi.mock("@/lib/subscription/workspace-subscription", () => ({
    WorkspaceSubscriptionService: {
        canUseAiCredits: vi.fn(),
        consumeAiCredits: vi.fn(),
    },
}));

import prisma from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
    user: {
        findUnique: ReturnType<typeof vi.fn>;
    },
    workspace: {
        findFirst: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
    workspaceMember: {
        findFirst: ReturnType<typeof vi.fn>;
    };
    $executeRaw: ReturnType<typeof vi.fn>;
};

describe("WorkspaceCreditManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("resolveWorkspaceForUser", () => {
        it("should return personal workspace if exists", async () => {
            mockPrisma.workspace.findFirst.mockResolvedValue({ id: "ws-personal" });

            const result = await WorkspaceCreditManager.resolveWorkspaceForUser("user-1");
            expect(result).toBe("ws-personal");
            expect(mockPrisma.workspace.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ isPersonal: true }),
            }));
        });

        it("should return membership workspace if no personal workspace", async () => {
            mockPrisma.workspace.findFirst.mockResolvedValue(null);
            mockPrisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-membership" });

            const result = await WorkspaceCreditManager.resolveWorkspaceForUser("user-1");
            expect(result).toBe("ws-membership");
        });

        it("should create personal workspace if no workspaces found", async () => {
            mockPrisma.workspace.findFirst.mockResolvedValue(null);
            mockPrisma.workspaceMember.findFirst.mockResolvedValue(null);
            mockPrisma.user.findUnique.mockResolvedValue({ name: "Test User" });
            mockEnsurePersonalWorkspace.mockResolvedValue("ws-new");

            const result = await WorkspaceCreditManager.resolveWorkspaceForUser("user-1");
            expect(result).toBe("ws-new");
            expect(mockEnsurePersonalWorkspace).toHaveBeenCalledWith("user-1", "Test User");
        });

        it("should return null if user not found and cannot create", async () => {
            mockPrisma.workspace.findFirst.mockResolvedValue(null);
            mockPrisma.workspaceMember.findFirst.mockResolvedValue(null);
            mockPrisma.user.findUnique.mockResolvedValue(null);
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const result = await WorkspaceCreditManager.resolveWorkspaceForUser("user-1");
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("Cannot auto-create workspace"),
            );

            consoleSpy.mockRestore();
        });

        it("should return null if ensurePersonalWorkspace fails", async () => {
            mockPrisma.workspace.findFirst.mockResolvedValue(null);
            mockPrisma.workspaceMember.findFirst.mockResolvedValue(null);
            mockPrisma.user.findUnique.mockResolvedValue({ name: "Test User" });
            mockEnsurePersonalWorkspace.mockRejectedValue(new Error("DB error"));
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const result = await WorkspaceCreditManager.resolveWorkspaceForUser("user-1");
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(
                "Failed to auto-create personal workspace",
                expect.any(Error),
            );

            consoleSpy.mockRestore();
        });
    });

    describe("getBalance", () => {
        it("should return balance for resolved workspace", async () => {
            // Mock resolution
            vi.spyOn(WorkspaceCreditManager, "resolveWorkspaceForUser").mockResolvedValue("ws-1");

            mockPrisma.workspace.findUnique.mockResolvedValue({
                monthlyAiCredits: 100,
                usedAiCredits: 20,
                subscriptionTier: "FREE",
            });

            const result = await WorkspaceCreditManager.getBalance("user-1");

            expect(result).toEqual({
                remaining: 80,
                limit: 100,
                used: 20,
                tier: "FREE",
                workspaceId: "ws-1",
            });
        });

        it("should return null if no workspace resolved", async () => {
            vi.spyOn(WorkspaceCreditManager, "resolveWorkspaceForUser").mockResolvedValue(null);
            const result = await WorkspaceCreditManager.getBalance("user-1");
            expect(result).toBeNull();
        });
    });

    describe("hasEnoughCredits", () => {
        it("should delegate to WorkspaceSubscriptionService", async () => {
            vi.spyOn(WorkspaceCreditManager, "resolveWorkspaceForUser").mockResolvedValue("ws-1");
            (WorkspaceSubscriptionService.canUseAiCredits as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });

            const result = await WorkspaceCreditManager.hasEnoughCredits("user-1", 10);
            expect(result).toBe(true);
            expect(WorkspaceSubscriptionService.canUseAiCredits).toHaveBeenCalledWith("ws-1", 10);
        });
    });

    describe("consumeCredits", () => {
        it("should delegate to WorkspaceSubscriptionService", async () => {
            vi.spyOn(WorkspaceCreditManager, "resolveWorkspaceForUser").mockResolvedValue("ws-1");
            (WorkspaceSubscriptionService.consumeAiCredits as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, remaining: 90 });

            const result = await WorkspaceCreditManager.consumeCredits({ userId: "user-1", amount: 10 });
            expect(result).toEqual({ success: true, remaining: 90 });
            expect(WorkspaceSubscriptionService.consumeAiCredits).toHaveBeenCalledWith("ws-1", 10);
        });

        it("should fail if no workspace resolved", async () => {
            vi.spyOn(WorkspaceCreditManager, "resolveWorkspaceForUser").mockResolvedValue(null);
            const result = await WorkspaceCreditManager.consumeCredits({ userId: "user-1", amount: 10 });
            expect(result.success).toBe(false);
            expect(result.error).toContain("No active workspace");
        });
    });

    describe("refundCredits", () => {
        it("should decrement usedAiCredits with clamp at 0", async () => {
            vi.spyOn(WorkspaceCreditManager, "resolveWorkspaceForUser").mockResolvedValue("ws-1");
            mockPrisma.$executeRaw.mockResolvedValue(1);

            const result = await WorkspaceCreditManager.refundCredits("user-1", 10);
            expect(result).toBe(true);
            expect(mockPrisma.$executeRaw).toHaveBeenCalled();
        });
    });
});
