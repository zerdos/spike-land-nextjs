import prisma from "@/lib/prisma";
import type { AllocatorAuditLog } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type AllocatorAuditLogCreateInput, AllocatorAuditLogger } from "./allocator-audit-logger";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    allocatorAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("AllocatorAuditLogger", () => {
  let logger: AllocatorAuditLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new AllocatorAuditLogger();
  });

  describe("log", () => {
    it("creates an audit log entry", async () => {
      const input: AllocatorAuditLogCreateInput = {
        workspaceId: "ws-1",
        campaignId: "camp-1",
        decisionType: "RECOMMENDATION_GENERATED",
        decisionOutcome: "EXECUTED",
        correlationId: "corr-1",
        triggeredBy: "SYSTEM",
      };

      const mockLog = { ...input, id: "log-1", createdAt: new Date() };
      vi.mocked(prisma.allocatorAuditLog.create).mockResolvedValue(mockLog as any);

      const result = await logger.log(input);

      expect(prisma.allocatorAuditLog.create).toHaveBeenCalledWith({ data: input });
      expect(result).toEqual(mockLog);
    });

    it("throws error on failure", async () => {
      const input: AllocatorAuditLogCreateInput = {
        workspaceId: "ws-1",
        campaignId: "camp-1",
        decisionType: "RECOMMENDATION_GENERATED",
        decisionOutcome: "EXECUTED",
        correlationId: "corr-1",
        triggeredBy: "SYSTEM",
      };

      const error = new Error("DB Error");
      vi.mocked(prisma.allocatorAuditLog.create).mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(logger.log(input)).rejects.toThrow("DB Error");
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("logRecommendationGenerated", () => {
    it("logs a recommendation generated event", async () => {
      const mockLog = { id: "log-1" } as AllocatorAuditLog;
      vi.mocked(prisma.allocatorAuditLog.create).mockResolvedValue(mockLog);

      await logger.logRecommendationGenerated({
        workspaceId: "ws-1",
        campaignId: "camp-1",
        recommendation: { reason: "test reason", confidence: "high" } as any,
        performance: {} as any,
        correlationId: "corr-1",
        triggeredBy: "SYSTEM",
      });

      expect(prisma.allocatorAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            decisionType: "RECOMMENDATION_GENERATED",
            aiReasoning: "test reason",
            confidence: "high",
          }),
        }),
      );
    });
  });

  describe("logGuardrailEvaluation", () => {
    it("logs a guardrail evaluation event", async () => {
      const mockLog = { id: "log-1" } as AllocatorAuditLog;
      vi.mocked(prisma.allocatorAuditLog.create).mockResolvedValue(mockLog);

      await logger.logGuardrailEvaluation({
        workspaceId: "ws-1",
        campaignId: "camp-1",
        decisionType: "RECOMMENDATION_EVALUATED",
        outcome: "APPROVED",
        guardrailResults: { passed: true },
        correlationId: "corr-1",
        triggeredBy: "SYSTEM",
      });

      expect(prisma.allocatorAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            decisionType: "RECOMMENDATION_EVALUATED",
            decisionOutcome: "APPROVED",
            guardrailEvaluation: { passed: true },
          }),
        }),
      );
    });
  });

  describe("logExecution", () => {
    it("logs execution start", async () => {
      vi.mocked(prisma.allocatorAuditLog.create).mockResolvedValue({} as any);

      await logger.logExecution({
        workspaceId: "ws-1",
        campaignId: "camp-1",
        executionId: "exec-1",
        stage: "STARTED",
        outcome: "EXECUTED",
        correlationId: "corr-1",
        triggeredBy: "SYSTEM",
      });

      expect(prisma.allocatorAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            decisionType: "EXECUTION_STARTED",
          }),
        }),
      );
    });

    it("logs execution completion", async () => {
      vi.mocked(prisma.allocatorAuditLog.create).mockResolvedValue({} as any);

      await logger.logExecution({
        workspaceId: "ws-1",
        campaignId: "camp-1",
        executionId: "exec-1",
        stage: "COMPLETED",
        outcome: "EXECUTED",
        correlationId: "corr-1",
        triggeredBy: "SYSTEM",
      });

      expect(prisma.allocatorAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            decisionType: "EXECUTION_COMPLETED",
          }),
        }),
      );
    });
  });

  describe("logRollback", () => {
    it("logs rollback initiated", async () => {
      vi.mocked(prisma.allocatorAuditLog.create).mockResolvedValue({} as any);

      await logger.logRollback({
        workspaceId: "ws-1",
        campaignId: "camp-1",
        originalExecutionId: "exec-1",
        stage: "INITIATED",
        correlationId: "corr-1",
        userId: "user-1",
      });

      expect(prisma.allocatorAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            decisionType: "ROLLBACK_INITIATED",
            decisionOutcome: "EXECUTED",
          }),
        }),
      );
    });
  });

  describe("search", () => {
    it("returns search results and total count", async () => {
      const mockLogs = [{ id: "log-1" }, { id: "log-2" }];
      vi.mocked(prisma.allocatorAuditLog.findMany).mockResolvedValue(mockLogs as any);
      vi.mocked(prisma.allocatorAuditLog.count).mockResolvedValue(2);

      const result = await logger.search({
        workspaceId: "ws-1",
        limit: 10,
        offset: 0,
      });

      expect(prisma.allocatorAuditLog.findMany).toHaveBeenCalled();
      expect(prisma.allocatorAuditLog.count).toHaveBeenCalled();
      expect(result).toEqual({ logs: mockLogs, total: 2 });
    });

    it("builds correct where clause", async () => {
      vi.mocked(prisma.allocatorAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.allocatorAuditLog.count).mockResolvedValue(0);

      const startDate = new Date("2023-01-01");
      const endDate = new Date("2023-01-31");

      await logger.search({
        workspaceId: "ws-1",
        decisionType: "RECOMMENDATION_GENERATED",
        startDate,
        endDate,
      });

      expect(prisma.allocatorAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: "ws-1",
            decisionType: "RECOMMENDATION_GENERATED",
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });
  });

  it("only adds createdAt filter when startDate or endDate is provided", async () => {
    vi.mocked(prisma.allocatorAuditLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.allocatorAuditLog.count).mockResolvedValue(0);

    await logger.search({ workspaceId: "ws-1" });

    expect(prisma.allocatorAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          createdAt: expect.anything(),
        }),
      }),
    );

    await logger.search({ workspaceId: "ws-1", startDate: new Date() });

    expect(prisma.allocatorAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  describe("getByCorrelationId", () => {
    it("returns logs for a correlation ID", async () => {
      const mockLogs = [{ id: "log-1" }];
      vi.mocked(prisma.allocatorAuditLog.findMany).mockResolvedValue(mockLogs as any);

      const result = await logger.getByCorrelationId("ws-1", "corr-1");

      expect(prisma.allocatorAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: "ws-1",
          correlationId: "corr-1",
        },
        orderBy: { createdAt: "asc" },
      });
      expect(result).toEqual(mockLogs);
    });
  });
});
