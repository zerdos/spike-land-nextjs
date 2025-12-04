/**
 * Tests for Admin Bootstrap Logic
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { hasAnyAdmin, bootstrapAdminIfNeeded } from "./bootstrap-admin"
import prisma from "@/lib/prisma"
import { UserRole } from "@prisma/client"

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe("bootstrap-admin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  describe("hasAnyAdmin", () => {
    it("should return true if admin exists", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(1)

      const result = await hasAnyAdmin()

      expect(result).toBe(true)
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          OR: [{ role: UserRole.ADMIN }, { role: UserRole.SUPER_ADMIN }],
        },
      })
    })

    it("should return false if no admin exists", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0)

      const result = await hasAnyAdmin()

      expect(result).toBe(false)
    })
  })

  describe("bootstrapAdminIfNeeded", () => {
    it("should promote user to admin if no admin exists", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0)
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "user_123",
        role: UserRole.ADMIN,
      } as any)

      const result = await bootstrapAdminIfNeeded("user_123")

      expect(result).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user_123" },
        data: { role: UserRole.ADMIN },
      })
      expect(console.log).toHaveBeenCalledWith(
        "First user user_123 promoted to ADMIN role"
      )
    })

    it("should not promote user if admin already exists", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(1)

      const result = await bootstrapAdminIfNeeded("user_123")

      expect(result).toBe(false)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it("should handle errors gracefully", async () => {
      vi.mocked(prisma.user.count).mockRejectedValue(new Error("DB error"))

      const result = await bootstrapAdminIfNeeded("user_123")

      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(
        "Failed to bootstrap admin:",
        expect.any(Error)
      )
    })
  })
})
