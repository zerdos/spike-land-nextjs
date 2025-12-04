/**
 * Tests for Audit Logger
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { AuditAction } from "@prisma/client"

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    },
  }
})

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}))

import { AuditLogger } from "./logger"

describe("AuditLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  describe("log", () => {
    it("should create an audit log entry", async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" })

      await AuditLogger.log({
        userId: "admin-1",
        action: AuditAction.ROLE_CHANGE,
        targetId: "user-1",
        metadata: { oldRole: "USER", newRole: "ADMIN" },
        ipAddress: "192.168.1.1",
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "admin-1",
          action: AuditAction.ROLE_CHANGE,
          targetId: "user-1",
          metadata: { oldRole: "USER", newRole: "ADMIN" },
          ipAddress: "192.168.1.1",
        },
      })
    })

    it("should handle missing optional fields", async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" })

      await AuditLogger.log({
        userId: "admin-1",
        action: AuditAction.ADMIN_LOGIN,
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "admin-1",
          action: AuditAction.ADMIN_LOGIN,
          targetId: undefined,
          metadata: undefined,
          ipAddress: undefined,
        },
      })
    })

    it("should not throw on database error", async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error("Database error"))

      // Should not throw
      await expect(
        AuditLogger.log({
          userId: "admin-1",
          action: AuditAction.ROLE_CHANGE,
        })
      ).resolves.toBeUndefined()

      expect(console.error).toHaveBeenCalledWith(
        "Failed to create audit log:",
        expect.any(Error)
      )
    })
  })

  describe("logRoleChange", () => {
    it("should log a role change", async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" })

      await AuditLogger.logRoleChange(
        "admin-1",
        "user-1",
        "USER",
        "ADMIN",
        "192.168.1.1"
      )

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "admin-1",
          action: AuditAction.ROLE_CHANGE,
          targetId: "user-1",
          metadata: { oldRole: "USER", newRole: "ADMIN" },
          ipAddress: "192.168.1.1",
        },
      })
    })

    it("should work without IP address", async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" })

      await AuditLogger.logRoleChange("admin-1", "user-1", "USER", "ADMIN")

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: undefined,
        }),
      })
    })
  })

  describe("logTokenAdjustment", () => {
    it("should log a token adjustment", async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" })

      await AuditLogger.logTokenAdjustment(
        "admin-1",
        "user-1",
        100,
        500,
        "Bonus reward",
        "192.168.1.1"
      )

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "admin-1",
          action: AuditAction.TOKEN_ADJUSTMENT,
          targetId: "user-1",
          metadata: {
            amount: 100,
            balanceAfter: 500,
            reason: "Bonus reward",
          },
          ipAddress: "192.168.1.1",
        },
      })
    })

    it("should use default reason if not provided", async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" })

      await AuditLogger.logTokenAdjustment("admin-1", "user-1", 50, 150)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            reason: "Manual admin adjustment",
          }),
        }),
      })
    })
  })

  describe("logVoucherCreate", () => {
    it("should log voucher creation", async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" })

      await AuditLogger.logVoucherCreate(
        "admin-1",
        "voucher-1",
        "WELCOME100",
        "FIXED_TOKENS",
        100,
        "192.168.1.1"
      )

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "admin-1",
          action: AuditAction.VOUCHER_CREATE,
          targetId: "voucher-1",
          metadata: {
            voucherCode: "WELCOME100",
            voucherType: "FIXED_TOKENS",
            value: 100,
          },
          ipAddress: "192.168.1.1",
        },
      })
    })
  })

  describe("logVoucherUpdate", () => {
    it("should log voucher update", async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" })

      await AuditLogger.logVoucherUpdate(
        "admin-1",
        "voucher-1",
        "WELCOME100",
        { status: "INACTIVE", reason: "Expired campaign" }
      )

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "admin-1",
          action: AuditAction.VOUCHER_UPDATE,
          targetId: "voucher-1",
          metadata: {
            voucherCode: "WELCOME100",
            status: "INACTIVE",
            reason: "Expired campaign",
          },
          ipAddress: undefined,
        },
      })
    })
  })

  describe("logVoucherDelete", () => {
    it("should log voucher deletion", async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: "log-1" })

      await AuditLogger.logVoucherDelete(
        "admin-1",
        "voucher-1",
        "WELCOME100",
        "192.168.1.1"
      )

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "admin-1",
          action: AuditAction.VOUCHER_DELETE,
          targetId: "voucher-1",
          metadata: { voucherCode: "WELCOME100" },
          ipAddress: "192.168.1.1",
        },
      })
    })
  })

  describe("getLogsByUser", () => {
    it("should return logs for a specific user", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: AuditAction.ROLE_CHANGE,
          targetId: "user-2",
          metadata: {},
          createdAt: new Date(),
        },
      ]
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs)

      const result = await AuditLogger.getLogsByUser("admin-1", 10)

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: "admin-1" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          action: true,
          targetId: true,
          metadata: true,
          createdAt: true,
        },
      })
      expect(result).toEqual(mockLogs)
    })

    it("should use default limit of 50", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])

      await AuditLogger.getLogsByUser("admin-1")

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      )
    })
  })

  describe("getLogsByTarget", () => {
    it("should return logs for a specific target", async () => {
      const mockLogs = [
        {
          id: "log-1",
          userId: "admin-1",
          action: AuditAction.ROLE_CHANGE,
          metadata: {},
          createdAt: new Date(),
          user: { email: "admin@example.com", name: "Admin" },
        },
      ]
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs)

      const result = await AuditLogger.getLogsByTarget("user-1", 10)

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { targetId: "user-1" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          userId: true,
          action: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      })
      expect(result).toEqual(mockLogs)
    })
  })

  describe("getRecentLogs", () => {
    it("should return recent audit logs", async () => {
      const mockLogs = [
        {
          id: "log-1",
          userId: "admin-1",
          action: AuditAction.ROLE_CHANGE,
          targetId: "user-1",
          metadata: {},
          createdAt: new Date(),
          user: { email: "admin@example.com", name: "Admin" },
        },
      ]
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs)

      const result = await AuditLogger.getRecentLogs(50)

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          userId: true,
          action: true,
          targetId: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      })
      expect(result).toEqual(mockLogs)
    })

    it("should use default limit of 100", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])

      await AuditLogger.getRecentLogs()

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      )
    })
  })
})
