/**
 * Scout Suggestion Manager Tests
 */

import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContentSuggestion, SuggestionFeedback, SuggestionQueryOptions } from "./types";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    contentSuggestion: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn((operations: unknown[]) => Promise.resolve(operations)),
  },
}));

// Import after mocks
import prisma from "@/lib/prisma";

import {
  acceptSuggestion,
  deleteExpiredSuggestions,
  dismissSuggestion,
  getPendingSuggestions,
  getSuggestionById,
  getSuggestionStats,
  markSuggestionUsed,
  querySuggestions,
  saveSuggestion,
  saveSuggestionsBatch,
  submitFeedback,
  updateSuggestionStatus,
} from "./suggestion-manager";

describe("Suggestion Manager", () => {
  const mockSuggestion: ContentSuggestion = {
    id: "sug_abc123",
    workspaceId: "ws-1",
    title: "Test Suggestion",
    description: "A test suggestion",
    draftContent: "Draft content here",
    contentType: "POST",
    suggestedPlatforms: ["TWITTER", "INSTAGRAM"],
    trendData: [{ source: "TOPIC_MONITORING", description: "Test trend" }],
    relevanceScore: 0.8,
    timelinessScore: 0.7,
    brandAlignmentScore: 0.9,
    overallScore: 0.8,
    status: "PENDING",
    generatedAt: new Date("2024-01-15T10:00:00Z"),
    expiresAt: new Date("2024-01-17T10:00:00Z"),
  };

  const mockDbRecord = {
    id: mockSuggestion.id,
    workspaceId: mockSuggestion.workspaceId,
    title: mockSuggestion.title,
    description: mockSuggestion.description,
    draftContent: mockSuggestion.draftContent,
    contentType: mockSuggestion.contentType,
    suggestedPlatforms: mockSuggestion.suggestedPlatforms,
    trendData: mockSuggestion.trendData as unknown as Prisma.JsonValue[],
    relevanceScore: mockSuggestion.relevanceScore,
    timelinessScore: mockSuggestion.timelinessScore,
    brandAlignmentScore: mockSuggestion.brandAlignmentScore,
    overallScore: mockSuggestion.overallScore,
    status: mockSuggestion.status,
    generatedAt: mockSuggestion.generatedAt,
    expiresAt: mockSuggestion.expiresAt ?? null,
    usedAt: null as Date | null,
    dismissedAt: null as Date | null,
    dismissalReason: null as string | null,
    feedback: null as string | null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveSuggestion", () => {
    it("should save a suggestion", async () => {
      vi.mocked(prisma.contentSuggestion.create).mockResolvedValue(mockDbRecord as any);

      const result = await saveSuggestion(mockSuggestion);

      expect(prisma.contentSuggestion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: mockSuggestion.id,
          workspaceId: mockSuggestion.workspaceId,
          title: mockSuggestion.title,
        }),
      });
      expect(result.id).toBe(mockSuggestion.id);
    });
  });

  describe("saveSuggestionsBatch", () => {
    it("should save multiple suggestions in transaction", async () => {
      const suggestions = [mockSuggestion, { ...mockSuggestion, id: "sug_def456" }];

      vi.mocked(prisma.$transaction).mockImplementation(
        (async (ops: any[]) => {
          return ops.map(() => mockDbRecord);
        }) as any,
      );

      const results = await saveSuggestionsBatch(suggestions);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });
  });

  describe("getSuggestionById", () => {
    it("should return suggestion by ID", async () => {
      vi.mocked(prisma.contentSuggestion.findFirst).mockResolvedValue(mockDbRecord as any);

      const result = await getSuggestionById("sug_abc123", "ws-1");

      expect(prisma.contentSuggestion.findFirst).toHaveBeenCalledWith({
        where: { id: "sug_abc123", workspaceId: "ws-1" },
      });
      expect(result?.id).toBe("sug_abc123");
    });

    it("should return null if not found", async () => {
      vi.mocked(prisma.contentSuggestion.findFirst).mockResolvedValue(null);

      const result = await getSuggestionById("nonexistent", "ws-1");

      expect(result).toBeNull();
    });
  });

  describe("querySuggestions", () => {
    it("should query with basic options", async () => {
      vi.mocked(prisma.contentSuggestion.findMany).mockResolvedValue([mockDbRecord] as any);
      vi.mocked(prisma.contentSuggestion.count).mockResolvedValue(1);

      const options: SuggestionQueryOptions = {
        workspaceId: "ws-1",
      };

      const result = await querySuggestions(options);

      expect(result.suggestions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should filter by status", async () => {
      vi.mocked(prisma.contentSuggestion.findMany).mockResolvedValue([mockDbRecord] as any);
      vi.mocked(prisma.contentSuggestion.count).mockResolvedValue(1);

      const options: SuggestionQueryOptions = {
        workspaceId: "ws-1",
        status: ["PENDING", "ACCEPTED"],
      };

      await querySuggestions(options);

      expect(prisma.contentSuggestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ["PENDING", "ACCEPTED"] },
          }),
        }),
      );
    });

    it("should filter by content types", async () => {
      vi.mocked(prisma.contentSuggestion.findMany).mockResolvedValue([mockDbRecord] as any);
      vi.mocked(prisma.contentSuggestion.count).mockResolvedValue(1);

      const options: SuggestionQueryOptions = {
        workspaceId: "ws-1",
        contentTypes: ["POST", "THREAD"],
      };

      await querySuggestions(options);

      expect(prisma.contentSuggestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contentType: { in: ["POST", "THREAD"] },
          }),
        }),
      );
    });

    it("should filter by platforms", async () => {
      vi.mocked(prisma.contentSuggestion.findMany).mockResolvedValue([mockDbRecord] as any);
      vi.mocked(prisma.contentSuggestion.count).mockResolvedValue(1);

      const options: SuggestionQueryOptions = {
        workspaceId: "ws-1",
        platforms: ["TWITTER"],
      };

      await querySuggestions(options);

      expect(prisma.contentSuggestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            suggestedPlatforms: { hasSome: ["TWITTER"] },
          }),
        }),
      );
    });

    it("should filter by minimum score", async () => {
      vi.mocked(prisma.contentSuggestion.findMany).mockResolvedValue([mockDbRecord] as any);
      vi.mocked(prisma.contentSuggestion.count).mockResolvedValue(1);

      const options: SuggestionQueryOptions = {
        workspaceId: "ws-1",
        minScore: 0.7,
      };

      await querySuggestions(options);

      expect(prisma.contentSuggestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            overallScore: { gte: 0.7 },
          }),
        }),
      );
    });

    it("should support pagination", async () => {
      vi.mocked(prisma.contentSuggestion.findMany).mockResolvedValue([mockDbRecord] as any);
      vi.mocked(prisma.contentSuggestion.count).mockResolvedValue(50);

      const options: SuggestionQueryOptions = {
        workspaceId: "ws-1",
        limit: 10,
        offset: 20,
      };

      await querySuggestions(options);

      expect(prisma.contentSuggestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it("should support sorting", async () => {
      vi.mocked(prisma.contentSuggestion.findMany).mockResolvedValue([mockDbRecord] as any);
      vi.mocked(prisma.contentSuggestion.count).mockResolvedValue(1);

      const options: SuggestionQueryOptions = {
        workspaceId: "ws-1",
        sortBy: "generatedAt",
        sortOrder: "asc",
      };

      await querySuggestions(options);

      expect(prisma.contentSuggestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { generatedAt: "asc" },
        }),
      );
    });
  });

  describe("getPendingSuggestions", () => {
    it("should get pending suggestions sorted by score", async () => {
      vi.mocked(prisma.contentSuggestion.findMany).mockResolvedValue([mockDbRecord] as any);
      vi.mocked(prisma.contentSuggestion.count).mockResolvedValue(1);

      const result = await getPendingSuggestions("ws-1", 5);

      expect(result).toHaveLength(1);
      expect(prisma.contentSuggestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: "ws-1",
            status: { in: ["PENDING"] },
          }),
          take: 5,
        }),
      );
    });
  });

  describe("updateSuggestionStatus", () => {
    it("should update status to DISMISSED with reason", async () => {
      vi.mocked(prisma.contentSuggestion.updateMany).mockResolvedValue({ count: 1 });

      vi.mocked(prisma.contentSuggestion.findFirst).mockResolvedValue({
        ...mockDbRecord,
        status: "DISMISSED",
        dismissedAt: new Date(),
        dismissalReason: "Not relevant",
      } as any);

      const result = await updateSuggestionStatus("sug_abc123", "ws-1", "DISMISSED", {
        dismissalReason: "Not relevant",
      });

      expect(result?.status).toBe("DISMISSED");
      expect(result?.dismissalReason).toBe("Not relevant");
    });

    it("should update status to USED", async () => {
      vi.mocked(prisma.contentSuggestion.updateMany).mockResolvedValue({ count: 1 });

      vi.mocked(prisma.contentSuggestion.findFirst).mockResolvedValue({
        ...mockDbRecord,
        status: "USED",
        usedAt: new Date(),
      } as any);

      const result = await updateSuggestionStatus("sug_abc123", "ws-1", "USED");

      expect(result?.status).toBe("USED");
      expect(result?.usedAt).toBeDefined();
    });

    it("should return null if suggestion not found", async () => {
      vi.mocked(prisma.contentSuggestion.updateMany).mockResolvedValue({ count: 0 });

      const result = await updateSuggestionStatus("nonexistent", "ws-1", "ACCEPTED");

      expect(result).toBeNull();
    });
  });

  describe("acceptSuggestion", () => {
    it("should accept a suggestion", async () => {
      vi.mocked(prisma.contentSuggestion.updateMany).mockResolvedValue({ count: 1 });

      vi.mocked(prisma.contentSuggestion.findFirst).mockResolvedValue({
        ...mockDbRecord,
        status: "ACCEPTED",
      } as any);

      const result = await acceptSuggestion("sug_abc123", "ws-1");

      expect(result?.status).toBe("ACCEPTED");
    });
  });

  describe("dismissSuggestion", () => {
    it("should dismiss a suggestion with reason", async () => {
      vi.mocked(prisma.contentSuggestion.updateMany).mockResolvedValue({ count: 1 });

      vi.mocked(prisma.contentSuggestion.findFirst).mockResolvedValue({
        ...mockDbRecord,
        status: "DISMISSED",
        dismissedAt: new Date(),
        dismissalReason: "Off-brand",
      } as any);

      const result = await dismissSuggestion("sug_abc123", "ws-1", "Off-brand");

      expect(result?.status).toBe("DISMISSED");
      expect(result?.dismissalReason).toBe("Off-brand");
    });
  });

  describe("markSuggestionUsed", () => {
    it("should mark suggestion as used", async () => {
      vi.mocked(prisma.contentSuggestion.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.contentSuggestion.findFirst).mockResolvedValue({
        ...mockDbRecord,
        status: "USED",
        usedAt: new Date(),
      });

      const result = await markSuggestionUsed("sug_abc123", "ws-1");

      expect(result?.status).toBe("USED");
      expect(result?.usedAt).toBeDefined();
    });
  });

  describe("submitFeedback", () => {
    it("should submit positive feedback", async () => {
      vi.mocked(prisma.contentSuggestion.updateMany).mockResolvedValue({ count: 1 });

      const feedback: SuggestionFeedback = {
        suggestionId: "sug_abc123",
        helpful: true,
        reason: "Great idea!",
      };

      await submitFeedback(feedback, "ws-1");

      expect(prisma.contentSuggestion.updateMany).toHaveBeenCalledWith({
        where: { id: "sug_abc123", workspaceId: "ws-1" },
        data: { feedback: "Helpful - Great idea!" },
      });
    });

    it("should submit negative feedback with improvements", async () => {
      vi.mocked(prisma.contentSuggestion.updateMany).mockResolvedValue({ count: 1 });

      const feedback: SuggestionFeedback = {
        suggestionId: "sug_abc123",
        helpful: false,
        reason: "Too generic",
        improvementSuggestions: "More specific examples",
      };

      await submitFeedback(feedback, "ws-1");

      expect(prisma.contentSuggestion.updateMany).toHaveBeenCalledWith({
        where: { id: "sug_abc123", workspaceId: "ws-1" },
        data: { feedback: "Not helpful - Too generic - More specific examples" },
      });
    });
  });

  describe("deleteExpiredSuggestions", () => {
    it("should delete expired suggestions for workspace", async () => {
      vi.mocked(prisma.contentSuggestion.deleteMany).mockResolvedValue({ count: 5 });

      const count = await deleteExpiredSuggestions("ws-1");

      expect(count).toBe(5);
      expect(prisma.contentSuggestion.deleteMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          workspaceId: "ws-1",
          status: "PENDING",
          expiresAt: { lt: expect.any(Date) },
        }),
      });
    });

    it("should delete expired suggestions globally", async () => {
      vi.mocked(prisma.contentSuggestion.deleteMany).mockResolvedValue({ count: 10 });

      const count = await deleteExpiredSuggestions();

      expect(count).toBe(10);
      expect(prisma.contentSuggestion.deleteMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: "PENDING",
          expiresAt: { lt: expect.any(Date) },
        }),
      });
    });
  });

  describe("getSuggestionStats", () => {
    it("should return suggestion statistics", async () => {
      vi.mocked(prisma.contentSuggestion.groupBy).mockResolvedValue([
        { status: "PENDING", _count: { id: 10 } },
        { status: "ACCEPTED", _count: { id: 5 } },
        { status: "DISMISSED", _count: { id: 3 } },
        { status: "USED", _count: { id: 8 } },
      ] as never);

      vi.mocked(prisma.contentSuggestion.aggregate).mockResolvedValue({
        _avg: { overallScore: 0.75 },
      } as never);

      const stats = await getSuggestionStats("ws-1");

      expect(stats.total).toBe(26);
      expect(stats.pending).toBe(10);
      expect(stats.accepted).toBe(5);
      expect(stats.dismissed).toBe(3);
      expect(stats.used).toBe(8);
      expect(stats.avgScore).toBe(0.75);
    });

    it("should handle empty workspace", async () => {
      vi.mocked(prisma.contentSuggestion.groupBy).mockResolvedValue([] as never);
      vi.mocked(prisma.contentSuggestion.aggregate).mockResolvedValue({
        _avg: { overallScore: null },
      } as never);

      const stats = await getSuggestionStats("ws-empty");

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.avgScore).toBe(0);
    });
  });
});
