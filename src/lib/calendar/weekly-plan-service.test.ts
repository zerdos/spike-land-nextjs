/**
 * Weekly Plan Service Tests
 * Issue #841
 */

import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateWeeklyPlan } from "./weekly-plan-service";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    scheduledPost: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("./optimal-time-service", () => ({
  getOptimalTimes: vi.fn(),
}));

vi.mock("./ai-content-service", () => ({
  generateContentSuggestions: vi.fn(),
}));

import { generateContentSuggestions } from "./ai-content-service";
import { getOptimalTimes } from "./optimal-time-service";

describe("weekly-plan-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateWeeklyPlan", () => {
    const weekStart = new Date("2024-01-01T00:00:00Z"); // Monday

    it("calculates coverage and identifies gaps correctly", async () => {
      // Mock existing scheduled posts
      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([
        {
          scheduledAt: new Date("2024-01-02T10:00:00Z"), // Tuesday 10am
        },
      ] as any);

      // Mock optimal times (Tuesday 10am, Wednesday 2pm)
      vi.mocked(getOptimalTimes).mockResolvedValue([
        {
          dayOfWeek: 2, // Tuesday
          hourUtc: 10,
          score: 90,
        },
        {
          dayOfWeek: 3, // Wednesday
          hourUtc: 14,
          score: 80,
        },
      ] as any);

      // Mock suggestions generation
      vi.mocked(generateContentSuggestions).mockResolvedValue([]);

      const result = await generateWeeklyPlan("ws-1", weekStart);

      // Coverage should be 50% (1 out of 2 optimal slots filled)
      // Actually, wait. The logic sorts by score and takes top 21.
      // Here we have 2 optimal slots. One is filled (Tue 10am). One is empty (Wed 2pm).
      // So coverage should be 1/2 = 50%
      expect(result.coveragePct).toBe(50);

      // Should identify Wednesday 2pm as a gap
      expect(result.gaps).toHaveLength(1);
      expect(result.gaps[0]!.day).toBe(3);
      expect(result.gaps[0]!.hour).toBe(14);

      // Should call generateContentSuggestions for the gaps
      expect(generateContentSuggestions).toHaveBeenCalled();
    });

    it("generates suggestions for gaps", async () => {
      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);
      vi.mocked(getOptimalTimes).mockResolvedValue([
        { dayOfWeek: 1, hourUtc: 9, score: 90 },
      ] as any);

      vi.mocked(generateContentSuggestions).mockResolvedValue([
        { id: "sugg-1" },
      ] as any);

      const result = await generateWeeklyPlan("ws-1", weekStart);

      expect(result.suggestions).toHaveLength(1);
    });
  });
});
