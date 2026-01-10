/**
 * AI Decision Logger Tests
 *
 * Unit tests for AI decision logging functionality.
 * Resolves #590: Build comprehensive Audit Log
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      aIDecisionLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
        aggregate: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { AIDecisionLogger } from "./ai-decision-logger";

describe("AIDecisionLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("log", () => {
    it("should create an AI decision log entry", async () => {
      mockPrisma.aIDecisionLog.create.mockResolvedValue({ id: "ai-log-1" });

      const result = await AIDecisionLogger.log({
        workspaceId: "workspace-1",
        userId: "user-1",
        requestType: "draft_generation",
        inputPrompt: "Generate a blog post",
        inputContext: { topic: "AI" },
        outputResult: "Generated content...",
        outputMetadata: { confidence: 0.95 },
        modelId: "gpt-4",
        modelVersion: "0613",
        tokensUsed: 500,
        latencyMs: 2000,
        status: "success",
      });

      expect(result).toBe("ai-log-1");
      expect(mockPrisma.aIDecisionLog.create).toHaveBeenCalledWith({
        data: {
          workspaceId: "workspace-1",
          userId: "user-1",
          requestType: "draft_generation",
          inputPrompt: "Generate a blog post",
          inputContext: { topic: "AI" },
          outputResult: "Generated content...",
          outputMetadata: { confidence: 0.95 },
          modelId: "gpt-4",
          modelVersion: "0613",
          tokensUsed: 500,
          latencyMs: 2000,
          status: "success",
          errorMessage: undefined,
        },
      });
    });

    it("should return null on database error", async () => {
      mockPrisma.aIDecisionLog.create.mockRejectedValue(
        new Error("Database error"),
      );

      const result = await AIDecisionLogger.log({
        requestType: "test",
        status: "success",
      });

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to create AI decision log:",
        expect.any(Error),
      );
    });

    it("should log error status with error message", async () => {
      mockPrisma.aIDecisionLog.create.mockResolvedValue({ id: "ai-log-2" });

      await AIDecisionLogger.log({
        requestType: "draft_generation",
        status: "error",
        errorMessage: "Model rate limited",
      });

      expect(mockPrisma.aIDecisionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "error",
          errorMessage: "Model rate limited",
        }),
      });
    });
  });

  describe("logDraftGeneration", () => {
    it("should log a draft generation decision", async () => {
      mockPrisma.aIDecisionLog.create.mockResolvedValue({ id: "ai-log-3" });

      const result = await AIDecisionLogger.logDraftGeneration(
        "workspace-1",
        "user-1",
        { inboxItemId: "inbox-1", tone: "professional" },
        "Generated draft content",
        {
          modelId: "claude-3",
          modelVersion: "opus",
          tokensUsed: 1000,
          latencyMs: 3000,
        },
      );

      expect(result).toBe("ai-log-3");
      expect(mockPrisma.aIDecisionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestType: "draft_generation",
          inputContext: { inboxItemId: "inbox-1", tone: "professional" },
          outputResult: "Generated draft content",
          modelId: "claude-3",
          modelVersion: "opus",
          tokensUsed: 1000,
          latencyMs: 3000,
          status: "success",
        }),
      });
    });

    it("should log draft generation error", async () => {
      mockPrisma.aIDecisionLog.create.mockResolvedValue({ id: "ai-log-4" });

      await AIDecisionLogger.logDraftGeneration(
        "workspace-1",
        "user-1",
        {},
        "",
        { modelId: "gpt-4" },
        "error",
        "API timeout",
      );

      expect(mockPrisma.aIDecisionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "error",
          errorMessage: "API timeout",
        }),
      });
    });
  });

  describe("logContentAnalysis", () => {
    it("should log a content analysis decision", async () => {
      mockPrisma.aIDecisionLog.create.mockResolvedValue({ id: "ai-log-5" });

      await AIDecisionLogger.logContentAnalysis(
        "workspace-1",
        "user-1",
        "Content to analyze",
        { sentiment: "positive", topics: ["technology"] },
        { modelId: "gpt-4", tokensUsed: 200 },
      );

      expect(mockPrisma.aIDecisionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestType: "content_analysis",
          inputPrompt: "Content to analyze",
          outputMetadata: { sentiment: "positive", topics: ["technology"] },
        }),
      });
    });
  });

  describe("logRecommendation", () => {
    it("should log a recommendation decision", async () => {
      mockPrisma.aIDecisionLog.create.mockResolvedValue({ id: "ai-log-6" });

      await AIDecisionLogger.logRecommendation(
        "workspace-1",
        "user-1",
        "post_time",
        { timezone: "UTC", audience: "tech" },
        { bestTime: "9:00 AM", confidence: 0.85 },
        { modelId: "custom-model" },
      );

      expect(mockPrisma.aIDecisionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestType: "recommendation_post_time",
          inputContext: { timezone: "UTC", audience: "tech" },
          outputMetadata: { bestTime: "9:00 AM", confidence: 0.85 },
        }),
      });
    });
  });

  describe("search", () => {
    it("should search logs with filters", async () => {
      const mockLogs = [
        {
          id: "ai-log-1",
          workspaceId: "workspace-1",
          userId: "user-1",
          requestType: "draft_generation",
          inputPrompt: null,
          inputContext: null,
          outputResult: null,
          outputMetadata: null,
          modelId: "gpt-4",
          modelVersion: null,
          tokensUsed: 100,
          latencyMs: 1000,
          status: "success",
          errorMessage: null,
          createdAt: new Date(),
        },
      ];
      mockPrisma.aIDecisionLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.aIDecisionLog.count.mockResolvedValue(1);

      const result = await AIDecisionLogger.search({
        workspaceId: "workspace-1",
        requestTypes: ["draft_generation"],
        statuses: ["success"],
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it("should apply date range filters", async () => {
      mockPrisma.aIDecisionLog.findMany.mockResolvedValue([]);
      mockPrisma.aIDecisionLog.count.mockResolvedValue(0);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      await AIDecisionLogger.search({
        startDate,
        endDate,
      });

      expect(mockPrisma.aIDecisionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });

    it("should enforce max limit of 1000", async () => {
      mockPrisma.aIDecisionLog.findMany.mockResolvedValue([]);
      mockPrisma.aIDecisionLog.count.mockResolvedValue(0);

      await AIDecisionLogger.search({ limit: 5000 });

      expect(mockPrisma.aIDecisionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1000 }),
      );
    });
  });

  describe("getMetrics", () => {
    it("should return AI decision metrics", async () => {
      mockPrisma.aIDecisionLog.count.mockResolvedValue(100);
      mockPrisma.aIDecisionLog.groupBy
        .mockResolvedValueOnce([
          { requestType: "draft_generation", _count: { requestType: 60 } },
          { requestType: "content_analysis", _count: { requestType: 40 } },
        ])
        .mockResolvedValueOnce([
          { status: "success", _count: { status: 90 } },
          { status: "error", _count: { status: 10 } },
        ]);
      mockPrisma.aIDecisionLog.aggregate.mockResolvedValue({
        _avg: { latencyMs: 1500 },
        _sum: { tokensUsed: 50000 },
      });

      const result = await AIDecisionLogger.getMetrics("workspace-1");

      expect(result.totalDecisions).toBe(100);
      expect(result.decisionsByType).toEqual({
        draft_generation: 60,
        content_analysis: 40,
      });
      expect(result.decisionsByStatus).toEqual({
        success: 90,
        error: 10,
      });
      expect(result.averageLatencyMs).toBe(1500);
      expect(result.totalTokensUsed).toBe(50000);
      expect(result.successRate).toBe(90);
    });

    it("should handle zero total decisions", async () => {
      mockPrisma.aIDecisionLog.count.mockResolvedValue(0);
      mockPrisma.aIDecisionLog.groupBy.mockResolvedValue([]);
      mockPrisma.aIDecisionLog.aggregate.mockResolvedValue({
        _avg: { latencyMs: null },
        _sum: { tokensUsed: null },
      });

      const result = await AIDecisionLogger.getMetrics();

      expect(result.totalDecisions).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.averageLatencyMs).toBe(0);
      expect(result.totalTokensUsed).toBe(0);
    });
  });

  describe("getById", () => {
    it("should get a log by ID", async () => {
      const mockLog = {
        id: "ai-log-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        requestType: "draft_generation",
        inputPrompt: "prompt",
        inputContext: null,
        outputResult: "result",
        outputMetadata: null,
        modelId: "gpt-4",
        modelVersion: null,
        tokensUsed: 100,
        latencyMs: 1000,
        status: "success",
        errorMessage: null,
        createdAt: new Date(),
      };
      mockPrisma.aIDecisionLog.findUnique.mockResolvedValue(mockLog);

      const result = await AIDecisionLogger.getById("ai-log-1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("ai-log-1");
      expect(result?.status).toBe("success");
    });

    it("should return null if log not found", async () => {
      mockPrisma.aIDecisionLog.findUnique.mockResolvedValue(null);

      const result = await AIDecisionLogger.getById("nonexistent");

      expect(result).toBeNull();
    });
  });
});
