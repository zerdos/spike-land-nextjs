/**
 * Tests for Admin Middleware
 */

import prisma from "@/lib/prisma";
import { createMockUser } from "@/test-utils";
import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isAdmin,
  isAdminByUserId,
  isSuperAdmin,
  requireAdmin,
  requireAdminByUserId,
} from "./admin-middleware";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("admin-middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("isAdmin", () => {
    it("should return false for null session", () => {
      expect(isAdmin(null)).toBe(false);
    });

    it("should return false for session without user id", () => {
      const session = { user: {} } as Session;
      expect(isAdmin(session)).toBe(false);
    });

    it("should return true for ADMIN role", () => {
      const session = {
        user: { id: "user_123", role: UserRole.ADMIN },
      } as Session & { user: { role: UserRole; }; };
      expect(isAdmin(session)).toBe(true);
    });

    it("should return true for SUPER_ADMIN role", () => {
      const session = {
        user: { id: "user_123", role: UserRole.SUPER_ADMIN },
      } as Session & { user: { role: UserRole; }; };
      expect(isAdmin(session)).toBe(true);
    });

    it("should return false for USER role", () => {
      const session = {
        user: { id: "user_123", role: UserRole.USER },
      } as Session & { user: { role: UserRole; }; };
      expect(isAdmin(session)).toBe(false);
    });

    it("should return false if role is not in session", () => {
      const session = {
        user: { id: "user_123" },
      } as Session;
      expect(isAdmin(session)).toBe(false);
    });
  });

  describe("isAdminByUserId", () => {
    it("should return true for ADMIN role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: "user_123", role: UserRole.ADMIN }),
      );

      const result = await isAdminByUserId("user_123");

      expect(result).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user_123" },
        select: { role: true },
      });
    });

    it("should return true for SUPER_ADMIN role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: "user_123", role: UserRole.SUPER_ADMIN }),
      );

      const result = await isAdminByUserId("user_123");

      expect(result).toBe(true);
    });

    it("should return false for USER role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: "user_123", role: UserRole.USER }),
      );

      const result = await isAdminByUserId("user_123");

      expect(result).toBe(false);
    });

    it("should return false if user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await isAdminByUserId("user_123");

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await isAdminByUserId("user_123");

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to check admin status:",
        expect.any(Error),
      );
    });
  });

  describe("requireAdmin", () => {
    it("should throw error for null session", () => {
      expect(() => requireAdmin(null)).toThrow(
        "Unauthorized: Authentication required",
      );
    });

    it("should throw error for session without user id", () => {
      const session = { user: {} } as Session;
      expect(() => requireAdmin(session)).toThrow(
        "Unauthorized: Authentication required",
      );
    });

    it("should throw error for USER role", () => {
      const session = {
        user: { id: "user_123", role: UserRole.USER },
      } as Session & { user: { role: UserRole; }; };
      expect(() => requireAdmin(session)).toThrow(
        "Forbidden: Admin access required",
      );
    });

    it("should not throw for ADMIN role", () => {
      const session = {
        user: { id: "user_123", role: UserRole.ADMIN },
      } as Session & { user: { role: UserRole; }; };
      expect(() => requireAdmin(session)).not.toThrow();
    });

    it("should not throw for SUPER_ADMIN role", () => {
      const session = {
        user: { id: "user_123", role: UserRole.SUPER_ADMIN },
      } as Session & { user: { role: UserRole; }; };
      expect(() => requireAdmin(session)).not.toThrow();
    });
  });

  describe("requireAdminByUserId", () => {
    it("should throw error if user is not admin", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: "user_123", role: UserRole.USER }),
      );

      await expect(requireAdminByUserId("user_123")).rejects.toThrow(
        "Forbidden: Admin access required",
      );
    });

    it("should not throw if user is admin", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: "user_123", role: UserRole.ADMIN }),
      );

      await expect(requireAdminByUserId("user_123")).resolves.not.toThrow();
    });

    it("should not throw if user is super admin", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: "user_123", role: UserRole.SUPER_ADMIN }),
      );

      await expect(requireAdminByUserId("user_123")).resolves.not.toThrow();
    });
  });

  describe("isSuperAdmin", () => {
    it("should return true for SUPER_ADMIN role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: "user_123", role: UserRole.SUPER_ADMIN }),
      );

      const result = await isSuperAdmin("user_123");

      expect(result).toBe(true);
    });

    it("should return false for ADMIN role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: "user_123", role: UserRole.ADMIN }),
      );

      const result = await isSuperAdmin("user_123");

      expect(result).toBe(false);
    });

    it("should return false for USER role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: "user_123", role: UserRole.USER }),
      );

      const result = await isSuperAdmin("user_123");

      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await isSuperAdmin("user_123");

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to check super admin status:",
        expect.any(Error),
      );
    });
  });
});
