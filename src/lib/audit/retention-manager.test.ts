/**
 * Audit Retention Manager Tests
 *
 * Unit tests for audit log retention policy management.
 * Resolves #590: Build comprehensive Audit Log
 */

import { AuditAction } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      auditRetentionPolicy: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      workspaceAuditLog: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
      },
      archivedAuditLog: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { AuditRetentionManager } from "./retention-manager";

describe("AuditRetentionManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("createPolicy", () => {
    it("should create a retention policy", async () => {
      const mockPolicy = {
        id: "policy-1",
        workspaceId: "workspace-1",
        name: "Test Policy",
        description: "Test description",
        retentionDays: 90,
        archiveAfterDays: 30,
        deleteAfterDays: 365,
        actionTypes: ["ADMIN_LOGIN", "ROLE_CHANGE"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.auditRetentionPolicy.create.mockResolvedValue(mockPolicy);

      const result = await AuditRetentionManager.createPolicy("workspace-1", {
        name: "Test Policy",
        description: "Test description",
        retentionDays: 90,
        archiveAfterDays: 30,
        deleteAfterDays: 365,
        actionTypes: [AuditAction.ADMIN_LOGIN, AuditAction.ROLE_CHANGE],
        isActive: true,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe("policy-1");
      expect(result?.name).toBe("Test Policy");
      expect(mockPrisma.auditRetentionPolicy.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: "workspace-1",
          name: "Test Policy",
          retentionDays: 90,
        }),
      });
    });

    it("should return null on database error", async () => {
      mockPrisma.auditRetentionPolicy.create.mockRejectedValue(
        new Error("Database error"),
      );

      const result = await AuditRetentionManager.createPolicy("workspace-1", {
        name: "Test",
        retentionDays: 90,
        isActive: true,
      });

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it("should create system-wide policy with null workspaceId", async () => {
      const mockPolicy = {
        id: "policy-2",
        workspaceId: null,
        name: "System Default",
        description: null,
        retentionDays: 365,
        archiveAfterDays: null,
        deleteAfterDays: null,
        actionTypes: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.auditRetentionPolicy.create.mockResolvedValue(mockPolicy);

      const result = await AuditRetentionManager.createPolicy(null, {
        name: "System Default",
        retentionDays: 365,
        isActive: true,
      });

      expect(result?.workspaceId).toBeNull();
    });
  });

  describe("updatePolicy", () => {
    it("should update a retention policy", async () => {
      const mockPolicy = {
        id: "policy-1",
        workspaceId: "workspace-1",
        name: "Updated Policy",
        description: "Updated description",
        retentionDays: 180,
        archiveAfterDays: 60,
        deleteAfterDays: 730,
        actionTypes: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.auditRetentionPolicy.update.mockResolvedValue(mockPolicy);

      const result = await AuditRetentionManager.updatePolicy("policy-1", {
        name: "Updated Policy",
        description: "Updated description",
        retentionDays: 180,
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe("Updated Policy");
      expect(result?.retentionDays).toBe(180);
    });

    it("should return null on update error", async () => {
      mockPrisma.auditRetentionPolicy.update.mockRejectedValue(
        new Error("Not found"),
      );

      const result = await AuditRetentionManager.updatePolicy("nonexistent", {
        name: "Test",
      });

      expect(result).toBeNull();
    });
  });

  describe("deletePolicy", () => {
    it("should delete a retention policy", async () => {
      mockPrisma.auditRetentionPolicy.delete.mockResolvedValue({});

      const result = await AuditRetentionManager.deletePolicy("policy-1");

      expect(result).toBe(true);
      expect(mockPrisma.auditRetentionPolicy.delete).toHaveBeenCalledWith({
        where: { id: "policy-1" },
      });
    });

    it("should return false on delete error", async () => {
      mockPrisma.auditRetentionPolicy.delete.mockRejectedValue(
        new Error("Not found"),
      );

      const result = await AuditRetentionManager.deletePolicy("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("getPolicy", () => {
    it("should get a policy by ID", async () => {
      const mockPolicy = {
        id: "policy-1",
        workspaceId: "workspace-1",
        name: "Test Policy",
        description: null,
        retentionDays: 90,
        archiveAfterDays: null,
        deleteAfterDays: null,
        actionTypes: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.auditRetentionPolicy.findUnique.mockResolvedValue(mockPolicy);

      const result = await AuditRetentionManager.getPolicy("policy-1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("policy-1");
    });

    it("should return null if policy not found", async () => {
      mockPrisma.auditRetentionPolicy.findUnique.mockResolvedValue(null);

      const result = await AuditRetentionManager.getPolicy("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("listPolicies", () => {
    it("should list policies for a workspace", async () => {
      const mockPolicies = [
        {
          id: "policy-1",
          workspaceId: "workspace-1",
          name: "Policy 1",
          description: null,
          retentionDays: 90,
          archiveAfterDays: null,
          deleteAfterDays: null,
          actionTypes: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "policy-2",
          workspaceId: "workspace-1",
          name: "Policy 2",
          description: null,
          retentionDays: 180,
          archiveAfterDays: null,
          deleteAfterDays: null,
          actionTypes: [],
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrisma.auditRetentionPolicy.findMany.mockResolvedValue(mockPolicies);

      const result = await AuditRetentionManager.listPolicies("workspace-1");

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe("Policy 1");
    });

    it("should list system-wide policies with null workspaceId", async () => {
      mockPrisma.auditRetentionPolicy.findMany.mockResolvedValue([]);

      await AuditRetentionManager.listPolicies(null);

      expect(mockPrisma.auditRetentionPolicy.findMany).toHaveBeenCalledWith({
        where: { workspaceId: null },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("getEffectivePolicy", () => {
    it("should return workspace-specific policy if exists", async () => {
      const workspacePolicy = {
        id: "ws-policy",
        workspaceId: "workspace-1",
        name: "Workspace Policy",
        description: null,
        retentionDays: 60,
        archiveAfterDays: null,
        deleteAfterDays: null,
        actionTypes: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.auditRetentionPolicy.findFirst.mockResolvedValue(
        workspacePolicy,
      );

      const result = await AuditRetentionManager.getEffectivePolicy(
        "workspace-1",
      );

      expect(result?.id).toBe("ws-policy");
      expect(result?.name).toBe("Workspace Policy");
    });

    it("should fall back to system policy if no workspace policy", async () => {
      const systemPolicy = {
        id: "sys-policy",
        workspaceId: null,
        name: "System Default",
        description: null,
        retentionDays: 365,
        archiveAfterDays: null,
        deleteAfterDays: null,
        actionTypes: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.auditRetentionPolicy.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(systemPolicy);

      const result = await AuditRetentionManager.getEffectivePolicy(
        "workspace-1",
      );

      expect(result?.id).toBe("sys-policy");
      expect(result?.workspaceId).toBeNull();
    });

    it("should return null if no policies exist", async () => {
      mockPrisma.auditRetentionPolicy.findFirst.mockResolvedValue(null);

      const result = await AuditRetentionManager.getEffectivePolicy(
        "workspace-1",
      );

      expect(result).toBeNull();
    });
  });

  describe("executeRetentionJob", () => {
    it("should return error if policy not found", async () => {
      mockPrisma.auditRetentionPolicy.findUnique.mockResolvedValue(null);

      const result = await AuditRetentionManager.executeRetentionJob(
        "nonexistent",
      );

      expect(result.archivedCount).toBe(0);
      expect(result.deletedCount).toBe(0);
      expect(result.errors).toContain("Policy not found");
    });

    it("should return error if policy is inactive", async () => {
      mockPrisma.auditRetentionPolicy.findUnique.mockResolvedValue({
        id: "policy-1",
        workspaceId: null,
        name: "Inactive",
        description: null,
        retentionDays: 90,
        archiveAfterDays: null,
        deleteAfterDays: null,
        actionTypes: [],
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await AuditRetentionManager.executeRetentionJob(
        "policy-1",
      );

      expect(result.errors).toContain("Policy is not active");
    });

    it("should archive and delete logs based on policy", async () => {
      const policy = {
        id: "policy-1",
        workspaceId: "workspace-1",
        name: "Active Policy",
        description: null,
        retentionDays: 90,
        archiveAfterDays: 30,
        deleteAfterDays: 365,
        actionTypes: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.auditRetentionPolicy.findUnique.mockResolvedValue(policy);
      mockPrisma.workspaceAuditLog.findMany.mockResolvedValue([
        {
          id: "log-1",
          workspaceId: "workspace-1",
          userId: "user-1",
          action: AuditAction.ADMIN_LOGIN,
          targetId: null,
          targetType: null,
          resourceId: null,
          resourceType: null,
          metadata: null,
          ipAddress: null,
          userAgent: null,
          createdAt: new Date("2023-01-01"),
        },
      ]);
      mockPrisma.archivedAuditLog.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.workspaceAuditLog.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.archivedAuditLog.deleteMany.mockResolvedValue({ count: 0 });

      const result = await AuditRetentionManager.executeRetentionJob(
        "policy-1",
      );

      expect(result.archivedCount).toBe(1);
      expect(result.policyId).toBe("policy-1");
    });
  });

  describe("getRetentionStats", () => {
    it("should return retention statistics", async () => {
      mockPrisma.workspaceAuditLog.count.mockResolvedValue(100);
      mockPrisma.archivedAuditLog.count.mockResolvedValue(50);
      mockPrisma.workspaceAuditLog.findFirst.mockResolvedValue({
        createdAt: new Date("2024-01-01"),
      });
      mockPrisma.archivedAuditLog.findFirst.mockResolvedValue({
        originalCreatedAt: new Date("2023-01-01"),
      });
      mockPrisma.auditRetentionPolicy.findFirst.mockResolvedValue(null);

      const result = await AuditRetentionManager.getRetentionStats(
        "workspace-1",
      );

      expect(result.totalActiveLogs).toBe(100);
      expect(result.totalArchivedLogs).toBe(50);
      expect(result.oldestActiveLog).toBeDefined();
      expect(result.oldestArchivedLog).toBeDefined();
    });
  });

  describe("ensureDefaultPolicy", () => {
    it("should return existing default policy", async () => {
      const existingPolicy = {
        id: "default-policy",
        workspaceId: null,
        name: "System Default",
        description: null,
        retentionDays: 365,
        archiveAfterDays: null,
        deleteAfterDays: null,
        actionTypes: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.auditRetentionPolicy.findFirst.mockResolvedValue(
        existingPolicy,
      );

      const result = await AuditRetentionManager.ensureDefaultPolicy();

      expect(result?.id).toBe("default-policy");
      expect(mockPrisma.auditRetentionPolicy.create).not.toHaveBeenCalled();
    });

    it("should create default policy if none exists", async () => {
      const createdPolicy = {
        id: "new-default",
        workspaceId: null,
        name: "System Default",
        description: "Default retention policy for all workspaces",
        retentionDays: 365,
        archiveAfterDays: 90,
        deleteAfterDays: 730,
        actionTypes: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.auditRetentionPolicy.findFirst.mockResolvedValue(null);
      mockPrisma.auditRetentionPolicy.create.mockResolvedValue(createdPolicy);

      const result = await AuditRetentionManager.ensureDefaultPolicy();

      expect(result?.name).toBe("System Default");
      expect(mockPrisma.auditRetentionPolicy.create).toHaveBeenCalled();
    });
  });
});
