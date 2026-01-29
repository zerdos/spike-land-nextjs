/**
 * AI Content Service Tests
 *
 * Unit tests for the AI content generation service.
 * Issue #841
 */

import type { SocialPlatform } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateContentSuggestions,
  acceptContentSuggestion,
  rejectContentSuggestion,
} from "./ai-content-service";

// Mock Prisma
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

// Mock best-time-service
vi.mock("./best-time-service", () => ({
  getBestTimeRecommendations: vi.fn(),
}));

// Mock Gemini client
vi.mock("@/lib/ai/gemini-client", () => ({
  generateStructuredResponse: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { getBestTimeRecommendations } from "./best-time-service";
import { generateStructuredResponse } from "@/lib/ai/gemini-client";

// Helper to create mock workspace
function createMockWorkspace(overrides: Partial<{
  id: string;
  slug: string;
  brandProfile: {
    values: Record<string, unknown> | null;
    mission: string | null;
  } | null;
  socialAccounts: Array<{
    id: string;
    platform: SocialPlatform;
    accountId: string;
    accountName: string;
    status: string;
  }>;
}> = {}) {
  return {
    id: overrides.id ?? "workspace-1",
    slug: overrides.slug ?? "test-workspace",
    name: "Test Workspace",
    brandProfile: overrides.brandProfile ?? null,
    socialAccounts: overrides.socialAccounts ?? [
      {
        id: "account-1",
        platform: "LINKEDIN" as SocialPlatform,
        accountId: "ext-account-1",
        accountName: "Test LinkedIn",
        status: "ACTIVE",
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("ai-content-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateContentSuggestions", () => {
    it("throws error when workspace is not found", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      await expect(
        generateContentSuggestions({
          workspaceId: "non-existent",
          count: 5,
        }),
      ).rejects.toThrow("Workspace not found");
    });

    it("throws error when no active social accounts exist", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
        createMockWorkspace({ socialAccounts: [] }) as never,
      );

      await expect(
        generateContentSuggestions({
          workspaceId: "workspace-1",
          count: 5,
        }),
      ).rejects.toThrow("No active social accounts found");
    });

    it("generates content suggestions with AI", async () => {
      const mockWorkspace = createMockWorkspace({
        brandProfile: {
          values: { tone: "professional" },
          mission: "Help businesses grow",
        },
      });

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
        mockWorkspace as never,
      );

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue({
        platformRecommendations: [],
        calendarGaps: [],
        globalBestSlots: [
          {
            dayOfWeek: 2,
            hour: 10,
            confidence: "high",
            engagementScore: 85,
            reason: "High engagement time",
          },
        ],
        analysisRange: {
          start: new Date(),
          end: new Date(),
        },
      });

      const mockAIResponse = [
        {
          content: "Test content suggestion #1",
          platform: "LINKEDIN" as SocialPlatform,
          suggestedTime: new Date().toISOString(),
          reason: "Optimal engagement time",
          confidence: 85,
          keywords: ["business", "growth"],
        },
      ];

      vi.mocked(generateStructuredResponse).mockResolvedValue(mockAIResponse);

      vi.mocked(prisma.calendarContentSuggestion.create).mockResolvedValue({
        id: "suggestion-1",
        workspaceId: "workspace-1",
        content: "Test content suggestion #1",
        suggestedFor: new Date(),
        platform: "LINKEDIN",
        reason: "Optimal engagement time",
        status: "PENDING",
        confidence: 85,
        keywords: ["business", "growth"],
        metadata: null,
        createdAt: new Date(),
        acceptedAt: null,
        rejectedAt: null,
      } as never);

      const result = await generateContentSuggestions({
        workspaceId: "workspace-1",
        count: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe("Test content suggestion #1");
      expect(result[0]?.platform).toBe("LINKEDIN");
      expect(result[0]?.confidence).toBe(85);
      expect(prisma.calendarContentSuggestion.create).toHaveBeenCalled();
    });

    it("filters social accounts by platform when specified", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
        createMockWorkspace() as never,
      );

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);
      vi.mocked(getBestTimeRecommendations).mockResolvedValue({
        platformRecommendations: [],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: { start: new Date(), end: new Date() },
      });
      vi.mocked(generateStructuredResponse).mockResolvedValue([]);

      await generateContentSuggestions({
        workspaceId: "workspace-1",
        platform: "TWITTER",
        count: 5,
      });

      expect(prisma.workspace.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            socialAccounts: expect.objectContaining({
              where: expect.objectContaining({
                status: "ACTIVE",
                platform: "TWITTER",
              }),
            }),
          }),
        }),
      );
    });

    it("includes recent posts context for AI", async () => {
      const mockWorkspace = createMockWorkspace();
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
        mockWorkspace as never,
      );

      const mockRecentPosts = [
        {
          id: "post-1",
          content: "Previous post about marketing strategies",
          scheduledAt: new Date(),
          status: "PUBLISHED",
          workspaceId: "workspace-1",
          timezone: "UTC",
          recurrenceRule: null,
          recurrenceEndAt: null,
          metadata: null,
          publishedAt: new Date(),
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          lastAttemptAt: null,
          nextOccurrenceAt: null,
          createdById: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue(
        mockRecentPosts as never,
      );

      vi.mocked(getBestTimeRecommendations).mockResolvedValue({
        platformRecommendations: [],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: { start: new Date(), end: new Date() },
      });

      vi.mocked(generateStructuredResponse).mockResolvedValue([]);

      await generateContentSuggestions({
        workspaceId: "workspace-1",
        count: 5,
      });

      expect(generateStructuredResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("Previous post about marketing"),
        }),
      );
    });
  });

  describe("acceptContentSuggestion", () => {
    it("throws error when suggestion is not found", async () => {
      vi.mocked(prisma.calendarContentSuggestion.findUnique).mockResolvedValue(
        null,
      );

      await expect(
        acceptContentSuggestion("non-existent"),
      ).rejects.toThrow("Content suggestion not found");
    });

    it("updates suggestion status to ACCEPTED", async () => {
      vi.mocked(prisma.calendarContentSuggestion.findUnique).mockResolvedValue({
        id: "suggestion-1",
        workspaceId: "workspace-1",
        content: "Test content",
        suggestedFor: new Date(),
        platform: "LINKEDIN",
        reason: "Test reason",
        status: "PENDING",
        confidence: 85,
        keywords: [],
        metadata: null,
        createdAt: new Date(),
        acceptedAt: null,
        rejectedAt: null,
      } as never);

      vi.mocked(prisma.calendarContentSuggestion.update).mockResolvedValue({
        id: "suggestion-1",
        status: "ACCEPTED",
        acceptedAt: new Date(),
      } as never);

      await acceptContentSuggestion("suggestion-1");

      expect(prisma.calendarContentSuggestion.update).toHaveBeenCalledWith({
        where: { id: "suggestion-1" },
        data: {
          status: "ACCEPTED",
          acceptedAt: expect.any(Date),
        },
      });
    });
  });

  describe("rejectContentSuggestion", () => {
    it("updates suggestion status to REJECTED", async () => {
      vi.mocked(prisma.calendarContentSuggestion.update).mockResolvedValue({
        id: "suggestion-1",
        status: "REJECTED",
        rejectedAt: new Date(),
      } as never);

      await rejectContentSuggestion("suggestion-1");

      expect(prisma.calendarContentSuggestion.update).toHaveBeenCalledWith({
        where: { id: "suggestion-1" },
        data: {
          status: "REJECTED",
          rejectedAt: expect.any(Date),
        },
      });
    });
  });
});
