/**
 * Content Gap Detection Service Tests
 *
 * Unit tests for the content gap detection service.
 * Resolves #869
 */

import type { SocialPlatform } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type ContentGap,
  type ContentGapDetectionOptions,
  detectContentGaps,
  getTimeSlotForHour,
  summarizeGaps,
} from "./content-gaps";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    socialAccount: {
      findMany: vi.fn(),
    },
    scheduledPost: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("./best-time-service", () => ({
  getBestTimeRecommendations: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { getBestTimeRecommendations } from "./best-time-service";

type MockedPrismaResult = any;

// Helper to create mock social account (as partial type for testing)
function createMockSocialAccount(overrides: {
  id: string;
  platform: SocialPlatform;
  accountName: string;
}): MockedPrismaResult {
  return {
    id: overrides.id,
    platform: overrides.platform,
    accountName: overrides.accountName,
  };
}

// Helper to create mock scheduled post
function createMockScheduledPost(overrides: {
  id: string;
  scheduledAt: Date;
  platforms: SocialPlatform[];
}) {
  return {
    id: overrides.id,
    content: "Test post content",
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
    postAccounts: overrides.platforms.map((platform, idx) => ({
      id: `pa-${overrides.id}-${idx}`,
      postId: overrides.id,
      accountId: `account-${platform.toLowerCase()}`,
      status: "SCHEDULED" as const,
      platformPostId: null,
      publishedAt: null,
      errorMessage: null,
      account: {
        platform,
      },
    })),
  };
}

// Helper to create mock recommendations
function createMockRecommendations(platforms: SocialPlatform[]): MockedPrismaResult {
  return {
    platformRecommendations: platforms.map((platform) => ({
      platform,
      accountId: `account-${platform.toLowerCase()}`,
      accountName: `${platform} Account`,
      bestTimeSlots: [
        {
          dayOfWeek: 2, // Tuesday
          hour: 10,
          confidence: "high",
          engagementScore: 85,
          reason: "High engagement on Tuesday mornings",
        },
        {
          dayOfWeek: 3, // Wednesday
          hour: 14,
          confidence: "medium",
          engagementScore: 65,
          reason: "Good engagement on Wednesday afternoons",
        },
      ],
      avoidDays: [0, 6], // Avoid weekends
      peakHours: [9, 10, 11, 14, 15],
      hasEnoughData: true,
      daysAnalyzed: 30,
    })),
    calendarGaps: [],
    globalBestSlots: [],
    analysisRange: {
      start: new Date(),
      end: new Date(),
    },
  };
}

describe("content-gaps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Set a fixed date for consistent testing
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z")); // Monday
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getTimeSlotForHour", () => {
    it("returns morning for hours 6-11", () => {
      expect(getTimeSlotForHour(6)).toBe("morning");
      expect(getTimeSlotForHour(8)).toBe("morning");
      expect(getTimeSlotForHour(11)).toBe("morning");
    });

    it("returns afternoon for hours 12-17", () => {
      expect(getTimeSlotForHour(12)).toBe("afternoon");
      expect(getTimeSlotForHour(14)).toBe("afternoon");
      expect(getTimeSlotForHour(17)).toBe("afternoon");
    });

    it("returns evening for hours 18-23 and 0-5", () => {
      expect(getTimeSlotForHour(18)).toBe("evening");
      expect(getTimeSlotForHour(21)).toBe("evening");
      expect(getTimeSlotForHour(23)).toBe("evening");
      expect(getTimeSlotForHour(0)).toBe("evening");
      expect(getTimeSlotForHour(5)).toBe("evening");
    });
  });

  describe("detectContentGaps", () => {
    const defaultOptions: ContentGapDetectionOptions = {
      workspaceId: "workspace-1",
      daysAhead: 7,
      timezone: "UTC",
    };

    it("returns empty gaps when no accounts exist", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      const result = await detectContentGaps(defaultOptions);

      expect(result.gaps).toHaveLength(0);
    });

    it("detects gaps when no content is scheduled", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue(
        createMockRecommendations(["LINKEDIN"]),
      );

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await detectContentGaps(defaultOptions);

      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.gaps.some((g) => g.platform === "LINKEDIN")).toBe(true);
    });

    it("excludes time slots with scheduled content", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue(
        createMockRecommendations(["LINKEDIN"]),
      );

      // Schedule content for Tuesday morning
      const tuesdayMorning = new Date("2024-01-16T09:00:00Z");
      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([
        createMockScheduledPost({
          id: "post-1",
          scheduledAt: tuesdayMorning,
          platforms: ["LINKEDIN"],
        }),
      ]);

      const result = await detectContentGaps(defaultOptions);

      // Should not have a gap for Tuesday morning LINKEDIN
      const tuesdayMorningGap = result.gaps.find(
        (g) =>
          g.date === "2024-01-16" &&
          g.timeSlot === "morning" &&
          g.platform === "LINKEDIN",
      );
      expect(tuesdayMorningGap).toBeUndefined();
    });

    it("filters by specific platform", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "LinkedIn Account",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue(
        createMockRecommendations(["LINKEDIN"]),
      );

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await detectContentGaps({
        ...defaultOptions,
        platform: "LINKEDIN",
      });

      expect(result.gaps.every((g) => g.platform === "LINKEDIN")).toBe(true);
    });

    it("assigns high severity to peak engagement slots", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue(
        createMockRecommendations(["LINKEDIN"]),
      );

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await detectContentGaps(defaultOptions);

      // Should have high severity gaps for recommended time slots
      const highSeverityGaps = result.gaps.filter((g) => g.severity === "high");
      expect(highSeverityGaps.length).toBeGreaterThan(0);
    });

    it("only includes medium and high severity gaps", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue(
        createMockRecommendations(["LINKEDIN"]),
      );

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await detectContentGaps(defaultOptions);

      // All gaps should be medium or high severity
      expect(result.gaps.every((g) => g.severity !== "low")).toBe(true);
    });

    it("sorts gaps by severity then date", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue(
        createMockRecommendations(["LINKEDIN"]),
      );

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await detectContentGaps(defaultOptions);

      // Verify sorting
      for (let i = 1; i < result.gaps.length; i++) {
        const prev = result.gaps[i - 1]!;
        const curr = result.gaps[i]!;

        if (prev.severity === curr.severity) {
          expect(prev.date <= curr.date).toBe(true);
        } else {
          // High should come before medium
          const severityOrder = { high: 0, medium: 1, low: 2 };
          expect(severityOrder[prev.severity] <= severityOrder[curr.severity]).toBe(
            true,
          );
        }
      }
    });

    it("respects daysAhead parameter", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue(
        createMockRecommendations(["LINKEDIN"]),
      );

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await detectContentGaps({
        ...defaultOptions,
        daysAhead: 3,
      });

      // All gaps should be within 3 days
      const maxDate = new Date("2024-01-18"); // 3 days from Jan 15
      expect(
        result.gaps.every((g) => new Date(g.date) < maxDate),
      ).toBe(true);
    });

    it("handles multiple platforms", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "LinkedIn Account",
        }),
        createMockSocialAccount({
          id: "account-2",
          platform: "TWITTER",
          accountName: "Twitter Account",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue(
        createMockRecommendations(["LINKEDIN", "TWITTER"]),
      );

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await detectContentGaps(defaultOptions);

      const platforms = new Set(result.gaps.map((g) => g.platform));
      expect(platforms.has("LINKEDIN")).toBe(true);
      expect(platforms.has("TWITTER")).toBe(true);
    });

    it("includes suggested time in ISO format", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue(
        createMockRecommendations(["LINKEDIN"]),
      );

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await detectContentGaps(defaultOptions);

      expect(result.gaps.length).toBeGreaterThan(0);
      for (const gap of result.gaps) {
        expect(gap.suggestedTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });

    it("includes human-readable reason", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      vi.mocked(getBestTimeRecommendations).mockResolvedValue(
        createMockRecommendations(["LINKEDIN"]),
      );

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await detectContentGaps(defaultOptions);

      expect(result.gaps.length).toBeGreaterThan(0);
      for (const gap of result.gaps) {
        expect(gap.reason.length).toBeGreaterThan(10);
      }
    });

    it("handles platform with insufficient data", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test Company",
        }),
      ]);

      // Recommendations with hasEnoughData = false
      vi.mocked(getBestTimeRecommendations).mockResolvedValue({
        platformRecommendations: [
          {
            platform: "LINKEDIN",
            accountId: "account-1",
            accountName: "Test Company",
            bestTimeSlots: [
              {
                dayOfWeek: 2,
                hour: 10,
                confidence: "low",
                engagementScore: 85, // High score but from benchmark
                reason: "Industry best practice",
              },
            ],
            avoidDays: [0, 6],
            peakHours: [9, 10, 11],
            hasEnoughData: false, // Not enough data
            daysAnalyzed: 5,
          },
        ],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: { start: new Date(), end: new Date() },
      });

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await detectContentGaps(defaultOptions);

      // Should still detect gaps
      expect(result.gaps.length).toBeGreaterThan(0);
      // High severity gaps should use benchmark message
      const highGap = result.gaps.find((g) => g.severity === "high");
      expect(highGap?.reason).toContain("peak engagement period");
    });

    it("handles platform not in recommendations", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        createMockSocialAccount({
          id: "account-1",
          platform: "TIKTOK", // TikTok not in default recommendations
          accountName: "TikTok Account",
        }),
      ]);

      // No recommendations for TikTok
      vi.mocked(getBestTimeRecommendations).mockResolvedValue({
        platformRecommendations: [],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: { start: new Date(), end: new Date() },
      });

      vi.mocked(prisma.scheduledPost.findMany).mockResolvedValue([]);

      const result = await detectContentGaps(defaultOptions);

      // Should have no gaps when severity calculation returns "low"
      // because no recommendations exist for the platform
      expect(result.gaps.every((g) => g.severity !== "low")).toBe(true);
    });
  });

  describe("summarizeGaps", () => {
    const sampleGaps: ContentGap[] = [
      {
        date: "2024-01-16",
        timeSlot: "morning",
        platform: "LINKEDIN",
        severity: "high",
        suggestedTime: "2024-01-16T09:00:00Z",
        reason: "High engagement morning slot",
      },
      {
        date: "2024-01-16",
        timeSlot: "afternoon",
        platform: "TWITTER",
        severity: "medium",
        suggestedTime: "2024-01-16T14:00:00Z",
        reason: "Moderate engagement afternoon slot",
      },
      {
        date: "2024-01-17",
        timeSlot: "morning",
        platform: "LINKEDIN",
        severity: "high",
        suggestedTime: "2024-01-17T09:00:00Z",
        reason: "High engagement morning slot",
      },
      {
        date: "2024-01-17",
        timeSlot: "evening",
        platform: "FACEBOOK",
        severity: "medium",
        suggestedTime: "2024-01-17T19:00:00Z",
        reason: "Moderate engagement evening slot",
      },
    ];

    it("calculates total gaps", () => {
      const summary = summarizeGaps(sampleGaps);
      expect(summary.total).toBe(4);
    });

    it("counts gaps by severity", () => {
      const summary = summarizeGaps(sampleGaps);
      expect(summary.highSeverity).toBe(2);
      expect(summary.mediumSeverity).toBe(2);
      expect(summary.lowSeverity).toBe(0);
    });

    it("counts gaps by platform", () => {
      const summary = summarizeGaps(sampleGaps);
      expect(summary.byPlatform["LINKEDIN"]).toBe(2);
      expect(summary.byPlatform["TWITTER"]).toBe(1);
      expect(summary.byPlatform["FACEBOOK"]).toBe(1);
    });

    it("counts gaps by time slot", () => {
      const summary = summarizeGaps(sampleGaps);
      expect(summary.byTimeSlot.morning).toBe(2);
      expect(summary.byTimeSlot.afternoon).toBe(1);
      expect(summary.byTimeSlot.evening).toBe(1);
    });

    it("handles empty gaps array", () => {
      const summary = summarizeGaps([]);
      expect(summary.total).toBe(0);
      expect(summary.highSeverity).toBe(0);
      expect(summary.mediumSeverity).toBe(0);
      expect(summary.lowSeverity).toBe(0);
      expect(Object.keys(summary.byPlatform)).toHaveLength(0);
      expect(summary.byTimeSlot.morning).toBe(0);
      expect(summary.byTimeSlot.afternoon).toBe(0);
      expect(summary.byTimeSlot.evening).toBe(0);
    });

    it("includes low severity in counts", () => {
      const gapsWithLow: ContentGap[] = [
        {
          date: "2024-01-16",
          timeSlot: "morning",
          platform: "LINKEDIN",
          severity: "low",
          suggestedTime: "2024-01-16T09:00:00Z",
          reason: "Low engagement slot",
        },
      ];
      const summary = summarizeGaps(gapsWithLow);
      expect(summary.lowSeverity).toBe(1);
      expect(summary.total).toBe(1);
    });
  });
});
