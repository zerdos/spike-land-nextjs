/**
 * AI Content Service Tests
 * Issue #841
 */

import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateContentSuggestions } from "./ai-content-service";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
    },
    scheduledPost: {
      findMany: vi.fn(),
    },
    calendarContentSuggestion: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/gemini-client", () => ({
  generateStructuredResponse: vi.fn(),
}));

vi.mock("./best-time-service", () => ({
  getBestTimeRecommendations: vi.fn().mockResolvedValue({
    globalBestSlots: [],
    platformRecommendations: [],
  }),
}));

describe("ai-content-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateContentSuggestions", () => {
    const mockWorkspace = {
      id: "ws-1",
      brandProfile: { values: ["innovative"] },
      socialAccounts: [{ id: "acc-1", platform: "LINKEDIN" }],
    };

    it("generates suggestions successfully", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const mockAIResponse = [
        {
          content: "Test post content",
          platform: "LINKEDIN",
          suggestedTime: new Date().toISOString(),
          reason: "Engagement",
          confidence: 90,
          keywords: ["tech"],
        },
      ];

      vi.mocked(generateStructuredResponse).mockResolvedValue(mockAIResponse);

      vi.mocked(prisma.calendarContentSuggestion.create as any).mockImplementation(
        async (args: any) => {
          return {
            id: "sugg-1",
            ...args.data,
            createdAt: new Date(),
            status: "PENDING",
            metadata: {},
          } as any;
        },
      );

      const result = await generateContentSuggestions({
        workspaceId: "ws-1",
        count: 1,
      });

      expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        include: expect.any(Object),
      });

      expect(generateStructuredResponse).toHaveBeenCalled();
      expect(prisma.calendarContentSuggestion.create).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]!.content).toBe("Test post content");
    });

    it("throws error if workspace not found", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      await expect(generateContentSuggestions({
        workspaceId: "ws-1",
      })).rejects.toThrow("Workspace not found");
    });

    it("throws error if no social accounts", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-1",
        socialAccounts: [],
      } as any);

      await expect(generateContentSuggestions({
        workspaceId: "ws-1",
      })).rejects.toThrow("No active social accounts found");
    });
  });
});
