/**
 * Workspace Audit Logger Tests
 *
 * Unit tests for workspace-level audit logging functionality.
 * Resolves #590: Build comprehensive Audit Log
 */

import { AuditAction } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      workspaceAuditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
      },
      $queryRaw: vi.fn(),
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { WorkspaceAuditLogger } from "./workspace-audit-logger";

describe("WorkspaceAuditLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("log", () => {
    it("should create a workspace audit log entry", async () => {
      mockPrisma.workspaceAuditLog.create.mockResolvedValue({ id: "log-1" });

      const result = await WorkspaceAuditLogger.log({
        workspaceId: "workspace-1",
        userId: "user-1",
        action: AuditAction.ROLE_CHANGE,
        targetId: "target-1",
        targetType: "user",
        metadata: { key: "value" },
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      });

      expect(result).toBe("log-1");
      expect(mockPrisma.workspaceAuditLog.create).toHaveBeenCalledWith({
        data: {
          workspaceId: "workspace-1",
          userId: "user-1",
          action: AuditAction.ROLE_CHANGE,
          targetId: "target-1",
          targetType: "user",
          resourceId: undefined,
          resourceType: undefined,
          oldValue: undefined,
          newValue: undefined,
          metadata: { key: "value" },
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
        },
      });
    });

    it("should return null on database error", async () => {
      mockPrisma.workspaceAuditLog.create.mockRejectedValue(
        new Error("Database error"),
      );

      const result = await WorkspaceAuditLogger.log({
        workspaceId: "workspace-1",
        userId: "user-1",
        action: AuditAction.ADMIN_LOGIN,
      });

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to create workspace audit log:",
        expect.any(Error),
      );
    });

    it("should handle oldValue and newValue for changes", async () => {
      mockPrisma.workspaceAuditLog.create.mockResolvedValue({ id: "log-2" });

      await WorkspaceAuditLogger.log({
        workspaceId: "workspace-1",
        userId: "user-1",
        action: AuditAction.ROLE_CHANGE,
        oldValue: { role: "USER" },
        newValue: { role: "ADMIN" },
      });

      expect(mockPrisma.workspaceAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oldValue: { role: "USER" },
          newValue: { role: "ADMIN" },
        }),
      });
    });
  });

  describe("logRelayDraftAction", () => {
    it("should log relay draft creation", async () => {
      mockPrisma.workspaceAuditLog.create.mockResolvedValue({ id: "log-3" });

      const result = await WorkspaceAuditLogger.logRelayDraftAction(
        "workspace-1",
        "user-1",
        "RELAY_DRAFT_CREATE",
        "draft-1",
        { source: "inbox" },
        "192.168.1.1",
      );

      expect(result).toBe("log-3");
      expect(mockPrisma.workspaceAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "RELAY_DRAFT_CREATE",
          targetId: "draft-1",
          targetType: "relay_draft",
        }),
      });
    });

    it("should log relay draft approval", async () => {
      mockPrisma.workspaceAuditLog.create.mockResolvedValue({ id: "log-4" });

      await WorkspaceAuditLogger.logRelayDraftAction(
        "workspace-1",
        "user-1",
        "RELAY_DRAFT_APPROVE",
        "draft-1",
      );

      expect(mockPrisma.workspaceAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "RELAY_DRAFT_APPROVE",
        }),
      });
    });
  });

  describe("logSettingsChange", () => {
    it("should log workspace settings changes", async () => {
      mockPrisma.workspaceAuditLog.create.mockResolvedValue({ id: "log-5" });

      const oldSettings = { autoApprove: false };
      const newSettings = { autoApprove: true };

      await WorkspaceAuditLogger.logSettingsChange(
        "workspace-1",
        "user-1",
        oldSettings,
        newSettings,
        "192.168.1.1",
      );

      expect(mockPrisma.workspaceAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "WORKSPACE_SETTINGS_CHANGE",
          targetId: "workspace-1",
          targetType: "workspace",
          oldValue: oldSettings,
          newValue: newSettings,
        }),
      });
    });
  });

  describe("logContentAction", () => {
    it("should log content creation", async () => {
      mockPrisma.workspaceAuditLog.create.mockResolvedValue({ id: "log-6" });

      await WorkspaceAuditLogger.logContentAction(
        "workspace-1",
        "user-1",
        "CONTENT_CREATE",
        "post-1",
        "blog_post",
        { title: "New Post" },
      );

      expect(mockPrisma.workspaceAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "CONTENT_CREATE",
          targetId: "post-1",
          targetType: "blog_post",
          metadata: { title: "New Post" },
        }),
      });
    });

    it("should log content publish", async () => {
      mockPrisma.workspaceAuditLog.create.mockResolvedValue({ id: "log-7" });

      await WorkspaceAuditLogger.logContentAction(
        "workspace-1",
        "user-1",
        "CONTENT_PUBLISH",
        "post-1",
        "blog_post",
      );

      expect(mockPrisma.workspaceAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "CONTENT_PUBLISH",
        }),
      });
    });
  });

  describe("logAIAction", () => {
    it("should log AI generation request", async () => {
      mockPrisma.workspaceAuditLog.create.mockResolvedValue({ id: "log-8" });

      await WorkspaceAuditLogger.logAIAction(
        "workspace-1",
        "user-1",
        "AI_GENERATION_REQUEST",
        "request-1",
        "draft_generation",
        { prompt: "Generate content" },
      );

      expect(mockPrisma.workspaceAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "AI_GENERATION_REQUEST",
          targetId: "request-1",
          targetType: "draft_generation",
        }),
      });
    });
  });

  describe("logIntegrationAction", () => {
    it("should log integration connect", async () => {
      mockPrisma.workspaceAuditLog.create.mockResolvedValue({ id: "log-9" });

      await WorkspaceAuditLogger.logIntegrationAction(
        "workspace-1",
        "user-1",
        "INTEGRATION_CONNECT",
        "integration-1",
        "google_ads",
        { accountId: "ads-123" },
      );

      expect(mockPrisma.workspaceAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "INTEGRATION_CONNECT",
          targetId: "integration-1",
          targetType: "google_ads",
        }),
      });
    });
  });

  describe("search", () => {
    it("should search logs with filters", async () => {
      const mockLogs = [
        {
          id: "log-1",
          workspaceId: "workspace-1",
          userId: "user-1",
          action: AuditAction.ROLE_CHANGE,
          targetId: null,
          targetType: null,
          resourceId: null,
          resourceType: null,
          oldValue: null,
          newValue: null,
          metadata: null,
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          user: { id: "user-1", name: "Test User", email: "test@test.com" },
        },
      ];
      mockPrisma.workspaceAuditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.workspaceAuditLog.count.mockResolvedValue(1);

      const result = await WorkspaceAuditLogger.search({
        workspaceId: "workspace-1",
        userId: "user-1",
        actions: [AuditAction.ROLE_CHANGE],
        limit: 10,
        offset: 0,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(mockPrisma.workspaceAuditLog.findMany).toHaveBeenCalled();
    });

    it("should apply date range filters", async () => {
      mockPrisma.workspaceAuditLog.findMany.mockResolvedValue([]);
      mockPrisma.workspaceAuditLog.count.mockResolvedValue(0);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      await WorkspaceAuditLogger.search({
        workspaceId: "workspace-1",
        startDate,
        endDate,
      });

      expect(mockPrisma.workspaceAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: "workspace-1",
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it("should handle pagination correctly", async () => {
      mockPrisma.workspaceAuditLog.findMany.mockResolvedValue([
        { id: "log-1" },
        { id: "log-2" },
      ]);
      mockPrisma.workspaceAuditLog.count.mockResolvedValue(100);

      const result = await WorkspaceAuditLogger.search({
        workspaceId: "workspace-1",
        limit: 2,
        offset: 0,
      });

      expect(result.hasMore).toBe(true);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
    });

    it("should enforce max limit of 1000", async () => {
      mockPrisma.workspaceAuditLog.findMany.mockResolvedValue([]);
      mockPrisma.workspaceAuditLog.count.mockResolvedValue(0);

      await WorkspaceAuditLogger.search({
        workspaceId: "workspace-1",
        limit: 5000,
      });

      expect(mockPrisma.workspaceAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1000,
        }),
      );
    });
  });

  describe("getById", () => {
    it("should get a log by ID", async () => {
      const mockLog = {
        id: "log-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        action: AuditAction.ADMIN_LOGIN,
        targetId: null,
        targetType: null,
        resourceId: null,
        resourceType: null,
        oldValue: null,
        newValue: null,
        metadata: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        user: { id: "user-1", name: "Test", email: "test@test.com" },
      };
      mockPrisma.workspaceAuditLog.findFirst.mockResolvedValue(mockLog);

      const result = await WorkspaceAuditLogger.getById("log-1", "workspace-1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("log-1");
    });

    it("should return null if log not found", async () => {
      mockPrisma.workspaceAuditLog.findFirst.mockResolvedValue(null);

      const result = await WorkspaceAuditLogger.getById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getMetrics", () => {
    it("should return metrics for a workspace", async () => {
      mockPrisma.workspaceAuditLog.count.mockResolvedValue(100);
      mockPrisma.workspaceAuditLog.groupBy.mockResolvedValue([
        { action: AuditAction.ADMIN_LOGIN, _count: { action: 50 } },
        { action: AuditAction.ROLE_CHANGE, _count: { action: 30 } },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user-1", name: "User 1" },
      ]);
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.workspaceAuditLog.findFirst.mockResolvedValue({
        createdAt: new Date(),
      });

      const result = await WorkspaceAuditLogger.getMetrics("workspace-1");

      expect(result.totalLogs).toBe(100);
      expect(result.logsByAction).toEqual({
        ADMIN_LOGIN: 50,
        ROLE_CHANGE: 30,
      });
    });
  });

  describe("getAllForExport", () => {
    it("should return all logs for export with max limit", async () => {
      mockPrisma.workspaceAuditLog.findMany.mockResolvedValue([]);
      mockPrisma.workspaceAuditLog.count.mockResolvedValue(0);

      await WorkspaceAuditLogger.getAllForExport(
        { workspaceId: "workspace-1" },
        5000,
      );

      expect(mockPrisma.workspaceAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1000, // Still enforces max limit
        }),
      );
    });
  });
});
