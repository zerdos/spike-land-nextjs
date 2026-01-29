/**
 * Weekly Plan Service Tests
 *
 * Unit tests for the weekly plan generation service.
 * Issue #841
 */

import type { SocialPlatform } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateWeeklyPlan } from "./weekly-plan-service";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    scheduledPost: {
      findMany: vi.fn(),
    },
  },
}));

// Mock optimal-time-service
vi.mock("./optimal-time-service", () => ({
  getOptimalTimes: vi.fn(),
}));

// Mock ai-content-service
vi.mock("./ai-content-service", () => ({
  generateContentSuggestions: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { getOptimalTimes } from "./optimal-time-service";
import { generateContentSuggestions } from "./ai-content-service";

// Helper to create mock scheduled post
function createMockScheduledPost(overrides: {
  id: string;
  scheduledAt: Date;
  content?: string;
}) {
  return {
    id: overrides.id,
    content: overrides.content ?? "Test post content",
    scheduledAt: overrides.scheduledAt,
    status: "SCHEDULED" as const,
    timezone: "UTC",
    recurrenceRule: null,
    recurrenceEndAt: null,
    metadata: null,
    publishedAt: null,
    errorMessage: null,
    retryCount: 0,
    maxRetries: 3,
    lastAttemptAt: null,
    nextOccurrenceAt: null,
    workspaceId: "workspace-1",
    createdById: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper to create mock posting time recommendation
function createMockRecommendation(overrides: {
  id: string;
  accountId: string;
  dayOfWeek: number;
  hourUtc: number;
  score: number;
}) {
  return {
    id: overrides.id,
    accountId: overrides.accountId,
    dayOfWeek: overrides.dayOfWeek,
    hourUtc: overrides.hourUtc,
    score: overrides.score,
    confidence: "high" as const,
    reason: "Historical data analysis",
    lastUpdated: new Date(),
  };
}

// Helper to create mock content suggestion
function createMockContentSuggestion(overrides: {
  id: string;
  content: string;
  suggestedFor: Date;
  platform: SocialPlatform;
}) {
  return {
    id: overrides.id,
    workspaceId: "workspace-1",
    content: overrides.content,
    suggestedFor: overrides.suggestedFor,
    platform: overrides.platform,
    reason: "AI generated",
    status: "PENDING" as const,
    confidence: 85,
    keywords: ["test"],
    metadata: undefined,
    createdAt: new Date(),
    acceptedAt: undefined,
    rejectedAt: undefined,
  };
}

describe("weekly-plan-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateWeeklyPlan", () => {
    it("generates a weekly plan with no existing posts", async () => {
      const weekStart = new Date("2024-01-15"); // Monday

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      vi.mocked(getOptimalTimes).mockResolvedValue([
        createMockRecommendation({
          id: "rec-1",
          accountId: "account-1",
          dayOfWeek: 2, // Tuesday
          hourUtc: 10,
          score: 85,
        }),
        createMockRecommendation({
          id: "rec-2",
          accountId: "account-1",
          dayOfWeek: 3, // Wednesday
          hourUtc: 14,
          score: 90,
        }),
      ]);

      vi.mocked(generateContentSuggestions).mockResolvedValue([
        createMockContentSuggestion({
          id: "suggestion-1",
          content: "AI generated content",
          suggestedFor: new Date("2024-01-16T10:00:00Z"),
          platform: "LINKEDIN",
        }),
      ]);

      const result = await generateWeeklyPlan("workspace-1", weekStart);

      expect(result.weekStart).toEqual(weekStart);
      expect(result.weekEnd.getDate()).toBe(weekStart.getDate() + 7);
      expect(result.suggestions).toHaveLength(1);
      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.coveragePct).toBe(0); // No posts scheduled
    });

    it("calculates coverage percentage correctly", async () => {
      const weekStart = new Date("2024-01-15"); // Monday

      // Schedule a post on Tuesday at 10:00 UTC
      const tuesdayPost = new Date("2024-01-16T10:00:00Z");

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([
        createMockScheduledPost({
          id: "post-1",
          scheduledAt: tuesdayPost,
        }),
      ]);

      // Optimal time on Tuesday at 10:00 matches the scheduled post
      vi.mocked(getOptimalTimes).mockResolvedValue([
        createMockRecommendation({
          id: "rec-1",
          accountId: "account-1",
          dayOfWeek: 2, // Tuesday
          hourUtc: 10,
          score: 85,
        }),
        createMockRecommendation({
          id: "rec-2",
          accountId: "account-1",
          dayOfWeek: 3, // Wednesday
          hourUtc: 14,
          score: 90,
        }),
      ]);

      vi.mocked(generateContentSuggestions).mockResolvedValue([]);

      const result = await generateWeeklyPlan("workspace-1", weekStart);

      // 1 out of 2 optimal slots filled = 50%
      expect(result.coveragePct).toBe(50);
    });

    it("identifies gaps in the calendar", async () => {
      const weekStart = new Date("2024-01-15");

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      vi.mocked(getOptimalTimes).mockResolvedValue([
        createMockRecommendation({
          id: "rec-1",
          accountId: "account-1",
          dayOfWeek: 1, // Monday
          hourUtc: 10,
          score: 80,
        }),
        createMockRecommendation({
          id: "rec-2",
          accountId: "account-1",
          dayOfWeek: 3, // Wednesday
          hourUtc: 14,
          score: 95,
        }),
      ]);

      vi.mocked(generateContentSuggestions).mockResolvedValue([]);

      const result = await generateWeeklyPlan("workspace-1", weekStart);

      expect(result.gaps.length).toBe(2);
      expect(result.gaps[0]?.day).toBe(3); // Wednesday has higher score
      expect(result.gaps[0]?.hour).toBe(14);
      expect(result.gaps[0]?.reason).toContain("95");
    });

    it("generates content suggestions for gaps", async () => {
      const weekStart = new Date("2024-01-15");

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      vi.mocked(getOptimalTimes).mockResolvedValue([
        createMockRecommendation({
          id: "rec-1",
          accountId: "account-1",
          dayOfWeek: 2,
          hourUtc: 10,
          score: 85,
        }),
      ]);

      const mockSuggestions = [
        createMockContentSuggestion({
          id: "suggestion-1",
          content: "Engaging post about industry trends",
          suggestedFor: new Date("2024-01-16T10:00:00Z"),
          platform: "LINKEDIN",
        }),
      ];

      vi.mocked(generateContentSuggestions).mockResolvedValue(mockSuggestions);

      const result = await generateWeeklyPlan("workspace-1", weekStart);

      expect(result.suggestions).toEqual(mockSuggestions);
      expect(generateContentSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "workspace-1",
          count: 1,
          dateRange: expect.objectContaining({
            start: weekStart,
          }),
        }),
      );
    });

    it("limits suggestions to max 10", async () => {
      const weekStart = new Date("2024-01-15");

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      // Create 15 optimal slots
      const manyRecommendations = Array.from({ length: 15 }, (_, i) => (
        createMockRecommendation({
          id: `rec-${i}`,
          accountId: "account-1",
          dayOfWeek: i % 7,
          hourUtc: 9 + (i % 10),
          score: 70 + (i % 20),
        })
      ));

      vi.mocked(getOptimalTimes).mockResolvedValue(manyRecommendations);

      const manySuggestions = Array.from({ length: 10 }, (_, i) => (
        createMockContentSuggestion({
          id: `suggestion-${i}`,
          content: `Generated content ${i}`,
          suggestedFor: new Date(`2024-01-${16 + (i % 5)}T10:00:00Z`),
          platform: "LINKEDIN",
        })
      ));

      vi.mocked(generateContentSuggestions).mockResolvedValue(manySuggestions);

      await generateWeeklyPlan("workspace-1", weekStart);

      // Should request max 10 suggestions
      expect(generateContentSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 10,
        }),
      );
    });

    it("handles no optimal times gracefully", async () => {
      const weekStart = new Date("2024-01-15");

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);
      vi.mocked(getOptimalTimes).mockResolvedValue([]);
      vi.mocked(generateContentSuggestions).mockResolvedValue([]);

      const result = await generateWeeklyPlan("workspace-1", weekStart);

      expect(result.gaps).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
      expect(result.coveragePct).toBe(0);
      expect(generateContentSuggestions).not.toHaveBeenCalled();
    });

    it("excludes already scheduled slots from gaps", async () => {
      const weekStart = new Date("2024-01-15");

      // Post scheduled for Tuesday 10:00 UTC
      const tuesdayPost = new Date("2024-01-16T10:00:00Z");

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([
        createMockScheduledPost({
          id: "post-1",
          scheduledAt: tuesdayPost,
        }),
      ]);

      vi.mocked(getOptimalTimes).mockResolvedValue([
        createMockRecommendation({
          id: "rec-1",
          accountId: "account-1",
          dayOfWeek: 2, // Tuesday (same as scheduled)
          hourUtc: 10,
          score: 90,
        }),
        createMockRecommendation({
          id: "rec-2",
          accountId: "account-1",
          dayOfWeek: 4, // Thursday (not scheduled)
          hourUtc: 14,
          score: 85,
        }),
      ]);

      vi.mocked(generateContentSuggestions).mockResolvedValue([]);

      const result = await generateWeeklyPlan("workspace-1", weekStart);

      // Only Thursday should be in gaps (Tuesday is filled)
      expect(result.gaps).toHaveLength(1);
      expect(result.gaps[0]?.day).toBe(4);
      expect(result.gaps[0]?.hour).toBe(14);
    });

    it("returns gaps limited to top 10", async () => {
      const weekStart = new Date("2024-01-15");

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      // Create many optimal slots that will become gaps
      const manyRecommendations = Array.from({ length: 21 }, (_, i) => (
        createMockRecommendation({
          id: `rec-${i}`,
          accountId: "account-1",
          dayOfWeek: i % 7,
          hourUtc: 8 + (i % 12),
          score: 50 + (i * 2),
        })
      ));

      vi.mocked(getOptimalTimes).mockResolvedValue(manyRecommendations);
      vi.mocked(generateContentSuggestions).mockResolvedValue([]);

      const result = await generateWeeklyPlan("workspace-1", weekStart);

      // Gaps should be limited to 10
      expect(result.gaps.length).toBeLessThanOrEqual(10);
    });

    it("filters scheduled posts by status", async () => {
      const weekStart = new Date("2024-01-15");
      const weekEnd = new Date("2024-01-22");

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);
      vi.mocked(getOptimalTimes).mockResolvedValue([]);

      await generateWeeklyPlan("workspace-1", weekStart);

      expect(prisma.scheduledPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: "workspace-1",
            scheduledAt: {
              gte: weekStart,
              lt: weekEnd,
            },
            status: {
              in: ["DRAFT", "PENDING", "SCHEDULED"],
            },
          }),
        }),
      );
    });
  });
});
