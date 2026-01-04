/**
 * Tests for Workspace Permission Middleware
 */

import prisma from "@/lib/prisma";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWorkspaceMembership,
  getWorkspaceMembershipBySlug,
  getWorkspaceRole,
  hasWorkspacePermission,
  isWorkspaceAdmin,
  isWorkspaceOwner,
  requireWorkspaceMembership,
  requireWorkspacePermission,
} from "./workspace-middleware";

vi.mock("@/lib/prisma", () => ({
  default: {
    workspaceMember: {
      findUnique: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
  },
}));

const mockMembership = (role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") =>
  ({
    workspaceId: "ws_123",
    userId: "user_123",
    role,
  }) as never;

const mockSession = (userId?: string): Session | null => {
  if (!userId) return null;
  return {
    user: { id: userId, email: "test@example.com", name: "Test User" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  } as Session;
};

describe("workspace-middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("getWorkspaceMembership", () => {
    it("returns membership info for valid member", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("ADMIN"),
      );

      const result = await getWorkspaceMembership("user_123", "ws_123");

      expect(result).toEqual({
        workspaceId: "ws_123",
        userId: "user_123",
        role: "ADMIN",
      });
      expect(prisma.workspaceMember.findUnique).toHaveBeenCalledWith({
        where: {
          workspaceId_userId: { workspaceId: "ws_123", userId: "user_123" },
          joinedAt: { not: null },
        },
        select: {
          workspaceId: true,
          userId: true,
          role: true,
        },
      });
    });

    it("returns null for non-member", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

      const result = await getWorkspaceMembership("user_123", "ws_123");

      expect(result).toBeNull();
    });

    it("returns null and logs error on database failure", async () => {
      const error = new Error("Database error");
      vi.mocked(prisma.workspaceMember.findUnique).mockRejectedValue(error);

      const result = await getWorkspaceMembership("user_123", "ws_123");

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch workspace membership:",
        error,
      );
    });
  });

  describe("getWorkspaceMembershipBySlug", () => {
    it("returns membership info for valid workspace slug", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws_123",
      } as never);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("MEMBER"),
      );

      const result = await getWorkspaceMembershipBySlug(
        "user_123",
        "my-workspace",
      );

      expect(result).toEqual({
        workspaceId: "ws_123",
        userId: "user_123",
        role: "MEMBER",
      });
      expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { slug: "my-workspace", deletedAt: null },
        select: { id: true },
      });
    });

    it("returns null for non-existent workspace", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      const result = await getWorkspaceMembershipBySlug(
        "user_123",
        "non-existent",
      );

      expect(result).toBeNull();
    });

    it("returns null on workspace lookup error", async () => {
      vi.mocked(prisma.workspace.findUnique).mockRejectedValue(
        new Error("DB Error"),
      );

      const result = await getWorkspaceMembershipBySlug(
        "user_123",
        "my-workspace",
      );

      expect(result).toBeNull();
    });
  });

  describe("hasWorkspacePermission", () => {
    it("returns true when user has permission", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("ADMIN"),
      );

      const result = await hasWorkspacePermission(
        "user_123",
        "ws_123",
        "members:invite",
      );

      expect(result).toBe(true);
    });

    it("returns false when user lacks permission", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("MEMBER"),
      );

      const result = await hasWorkspacePermission(
        "user_123",
        "ws_123",
        "members:invite",
      );

      expect(result).toBe(false);
    });

    it("returns false when user is not a member", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

      const result = await hasWorkspacePermission(
        "user_123",
        "ws_123",
        "inbox:view",
      );

      expect(result).toBe(false);
    });
  });

  describe("requireWorkspacePermission", () => {
    it("returns membership info when user has permission", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("ADMIN"),
      );

      const result = await requireWorkspacePermission(
        mockSession("user_123"),
        "ws_123",
        "workspace:settings:write",
      );

      expect(result).toEqual({
        workspaceId: "ws_123",
        userId: "user_123",
        role: "ADMIN",
      });
    });

    it("throws Unauthorized for null session", async () => {
      await expect(
        requireWorkspacePermission(null, "ws_123", "content:create"),
      ).rejects.toThrow("Unauthorized: Authentication required");
    });

    it("throws Unauthorized for session without user id", async () => {
      const badSession = { user: {} } as Session;

      await expect(
        requireWorkspacePermission(badSession, "ws_123", "content:create"),
      ).rejects.toThrow("Unauthorized: Authentication required");
    });

    it("throws Forbidden for non-member", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

      await expect(
        requireWorkspacePermission(
          mockSession("user_123"),
          "ws_123",
          "content:create",
        ),
      ).rejects.toThrow("Forbidden: Not a workspace member");
    });

    it("throws Forbidden with action name for insufficient permission", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("MEMBER"),
      );

      await expect(
        requireWorkspacePermission(
          mockSession("user_123"),
          "ws_123",
          "workspace:delete",
        ),
      ).rejects.toThrow("Forbidden: Requires workspace:delete permission");
    });

    it("allows OWNER to perform owner-only actions", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("OWNER"),
      );

      const result = await requireWorkspacePermission(
        mockSession("user_123"),
        "ws_123",
        "workspace:delete",
      );

      expect(result.role).toBe("OWNER");
    });

    it("allows VIEWER to perform viewer actions", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("VIEWER"),
      );

      const result = await requireWorkspacePermission(
        mockSession("user_123"),
        "ws_123",
        "inbox:view",
      );

      expect(result.role).toBe("VIEWER");
    });
  });

  describe("requireWorkspaceMembership", () => {
    it("returns membership info for valid member", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("VIEWER"),
      );

      const result = await requireWorkspaceMembership(
        mockSession("user_123"),
        "ws_123",
      );

      expect(result).toEqual({
        workspaceId: "ws_123",
        userId: "user_123",
        role: "VIEWER",
      });
    });

    it("throws Unauthorized for null session", async () => {
      await expect(
        requireWorkspaceMembership(null, "ws_123"),
      ).rejects.toThrow("Unauthorized: Authentication required");
    });

    it("throws Forbidden for non-member", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

      await expect(
        requireWorkspaceMembership(mockSession("user_123"), "ws_123"),
      ).rejects.toThrow("Forbidden: Not a workspace member");
    });
  });

  describe("isWorkspaceOwner", () => {
    it("returns true for OWNER role", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("OWNER"),
      );

      const result = await isWorkspaceOwner("user_123", "ws_123");

      expect(result).toBe(true);
    });

    it("returns false for ADMIN role", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("ADMIN"),
      );

      const result = await isWorkspaceOwner("user_123", "ws_123");

      expect(result).toBe(false);
    });

    it("returns false for non-member", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

      const result = await isWorkspaceOwner("user_123", "ws_123");

      expect(result).toBe(false);
    });
  });

  describe("isWorkspaceAdmin", () => {
    it("returns true for OWNER role", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("OWNER"),
      );

      const result = await isWorkspaceAdmin("user_123", "ws_123");

      expect(result).toBe(true);
    });

    it("returns true for ADMIN role", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("ADMIN"),
      );

      const result = await isWorkspaceAdmin("user_123", "ws_123");

      expect(result).toBe(true);
    });

    it("returns false for MEMBER role", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("MEMBER"),
      );

      const result = await isWorkspaceAdmin("user_123", "ws_123");

      expect(result).toBe(false);
    });

    it("returns false for VIEWER role", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("VIEWER"),
      );

      const result = await isWorkspaceAdmin("user_123", "ws_123");

      expect(result).toBe(false);
    });

    it("returns false for non-member", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

      const result = await isWorkspaceAdmin("user_123", "ws_123");

      expect(result).toBe(false);
    });
  });

  describe("getWorkspaceRole", () => {
    it("returns role for member", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(
        mockMembership("ADMIN"),
      );

      const result = await getWorkspaceRole("user_123", "ws_123");

      expect(result).toBe("ADMIN");
    });

    it("returns null for non-member", async () => {
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

      const result = await getWorkspaceRole("user_123", "ws_123");

      expect(result).toBeNull();
    });
  });
});
