/**
 * Tests for Calendar Best-Time Recommendations API
 *
 * Resolves #868
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock calendar service
vi.mock("@/lib/calendar", () => ({
  getBestTimeRecommendations: vi.fn(),
}));

import { auth } from "@/auth";
import { getBestTimeRecommendations } from "@/lib/calendar";
import prisma from "@/lib/prisma";

describe("Calendar Recommendations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/orbit/[workspaceSlug]/calendar/recommendations", () => {
    const createMockRequest = (searchParams?: Record<string, string>) => {
      const url = new URL(
        "http://localhost:3000/api/orbit/test-workspace/calendar/recommendations",
      );
      if (searchParams) {
        Object.entries(searchParams).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }
      return new NextRequest(url);
    };

    const mockParams = {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    };

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const response = await GET(createMockRequest(), mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session has no user id", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          email: "test@example.com",
        },
        expires: new Date().toISOString(),
      } as never);

      const response = await GET(createMockRequest(), mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when workspace not found", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(null);

      const response = await GET(createMockRequest(), mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found or access denied");
    });

    it("should return 400 for invalid lookbackDays", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      const response = await GET(
        createMockRequest({ lookbackDays: "invalid" }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("lookbackDays must be between 1 and 365");
    });

    it("should return 400 for lookbackDays out of range (too low)", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      const response = await GET(
        createMockRequest({ lookbackDays: "0" }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("lookbackDays must be between 1 and 365");
    });

    it("should return 400 for lookbackDays out of range (too high)", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      const response = await GET(
        createMockRequest({ lookbackDays: "400" }),
        mockParams,
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("lookbackDays must be between 1 and 365");
    });

    it("should return recommendations with historical data source", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      vi.mocked(getBestTimeRecommendations).mockResolvedValueOnce({
        platformRecommendations: [
          {
            platform: "LINKEDIN",
            accountId: "account-1",
            accountName: "Test LinkedIn",
            bestTimeSlots: [
              {
                dayOfWeek: 2,
                hour: 10,
                confidence: "high",
                engagementScore: 85,
                reason: "High engagement on Tuesday 10 AM",
              },
              {
                dayOfWeek: 3,
                hour: 11,
                confidence: "high",
                engagementScore: 82,
                reason: "High engagement on Wednesday 11 AM",
              },
              {
                dayOfWeek: 4,
                hour: 9,
                confidence: "medium",
                engagementScore: 78,
                reason: "Good engagement on Thursday 9 AM",
              },
            ],
            avoidDays: [0, 6],
            peakHours: [9, 10, 11, 12],
            hasEnoughData: true,
            daysAnalyzed: 45,
          },
        ],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      });

      const response = await GET(createMockRequest(), mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recommendations).toHaveLength(1);
      expect(data.recommendations[0].platform).toBe("LINKEDIN");
      expect(data.recommendations[0].dataSource).toBe("historical");
      expect(data.recommendations[0].times).toHaveLength(3);
      expect(data.recommendations[0].times[0]).toEqual({
        dayOfWeek: 2,
        hour: 10,
        score: 85,
      });
    });

    it("should return recommendations with benchmark data source when no historical data", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      vi.mocked(getBestTimeRecommendations).mockResolvedValueOnce({
        platformRecommendations: [
          {
            platform: "TWITTER",
            accountId: "account-2",
            accountName: "Test Twitter",
            bestTimeSlots: [
              {
                dayOfWeek: 1,
                hour: 9,
                confidence: "low",
                engagementScore: 70,
                reason: "Industry best practice for TWITTER",
              },
              {
                dayOfWeek: 1,
                hour: 12,
                confidence: "low",
                engagementScore: 70,
                reason: "Industry best practice for TWITTER",
              },
              {
                dayOfWeek: 1,
                hour: 15,
                confidence: "low",
                engagementScore: 70,
                reason: "Industry best practice for TWITTER",
              },
            ],
            avoidDays: [],
            peakHours: [9, 12, 15],
            hasEnoughData: false,
            daysAnalyzed: 3,
          },
        ],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      });

      const response = await GET(createMockRequest(), mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recommendations).toHaveLength(1);
      expect(data.recommendations[0].platform).toBe("TWITTER");
      expect(data.recommendations[0].dataSource).toBe("benchmark");
    });

    it("should return multiple platform recommendations", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      vi.mocked(getBestTimeRecommendations).mockResolvedValueOnce({
        platformRecommendations: [
          {
            platform: "LINKEDIN",
            accountId: "account-1",
            accountName: "LinkedIn Account",
            bestTimeSlots: [
              {
                dayOfWeek: 2,
                hour: 8,
                confidence: "medium",
                engagementScore: 75,
                reason: "Test",
              },
            ],
            avoidDays: [],
            peakHours: [8, 12, 17],
            hasEnoughData: true,
            daysAnalyzed: 20,
          },
          {
            platform: "INSTAGRAM",
            accountId: "account-2",
            accountName: "Instagram Account",
            bestTimeSlots: [
              {
                dayOfWeek: 0,
                hour: 11,
                confidence: "low",
                engagementScore: 70,
                reason: "Test",
              },
              {
                dayOfWeek: 0,
                hour: 13,
                confidence: "low",
                engagementScore: 68,
                reason: "Test",
              },
              {
                dayOfWeek: 0,
                hour: 19,
                confidence: "low",
                engagementScore: 72,
                reason: "Test",
              },
            ],
            avoidDays: [],
            peakHours: [11, 13, 19],
            hasEnoughData: false,
            daysAnalyzed: 5,
          },
          {
            platform: "FACEBOOK",
            accountId: "account-3",
            accountName: "Facebook Account",
            bestTimeSlots: [
              {
                dayOfWeek: 1,
                hour: 13,
                confidence: "low",
                engagementScore: 70,
                reason: "Test",
              },
            ],
            avoidDays: [],
            peakHours: [9, 13, 15],
            hasEnoughData: false,
            daysAnalyzed: 2,
          },
        ],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      });

      const response = await GET(createMockRequest(), mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recommendations).toHaveLength(3);
      expect(data.recommendations[0].platform).toBe("LINKEDIN");
      expect(data.recommendations[0].dataSource).toBe("historical");
      expect(data.recommendations[1].platform).toBe("INSTAGRAM");
      expect(data.recommendations[1].dataSource).toBe("benchmark");
      expect(data.recommendations[2].platform).toBe("FACEBOOK");
      expect(data.recommendations[2].dataSource).toBe("benchmark");
    });

    it("should limit times to top 5 per platform", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      // Create 8 time slots to verify we only get 5
      const manyTimeSlots = Array.from({ length: 8 }, (_, i) => ({
        dayOfWeek: (i % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        hour: (9 + i) as
          | 0
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6
          | 7
          | 8
          | 9
          | 10
          | 11
          | 12
          | 13
          | 14
          | 15
          | 16
          | 17
          | 18
          | 19
          | 20
          | 21
          | 22
          | 23,
        confidence: "high" as const,
        engagementScore: 90 - i,
        reason: `Slot ${i}`,
      }));

      vi.mocked(getBestTimeRecommendations).mockResolvedValueOnce({
        platformRecommendations: [
          {
            platform: "LINKEDIN",
            accountId: "account-1",
            accountName: "Test Account",
            bestTimeSlots: manyTimeSlots,
            avoidDays: [],
            peakHours: [9, 10, 11, 12],
            hasEnoughData: true,
            daysAnalyzed: 60,
          },
        ],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      });

      const response = await GET(createMockRequest(), mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recommendations[0].times).toHaveLength(5);
      // Verify it takes the first 5 (highest scored)
      expect(data.recommendations[0].times[0].score).toBe(90);
      expect(data.recommendations[0].times[4].score).toBe(86);
    });

    it("should pass accountIds filter to service", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      vi.mocked(getBestTimeRecommendations).mockResolvedValueOnce({
        platformRecommendations: [],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      });

      await GET(
        createMockRequest({ accountIds: "acc-1,acc-2,acc-3" }),
        mockParams,
      );

      expect(getBestTimeRecommendations).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        accountIds: ["acc-1", "acc-2", "acc-3"],
        lookbackDays: 30,
        includeGaps: false,
      });
    });

    it("should pass custom lookbackDays to service", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      vi.mocked(getBestTimeRecommendations).mockResolvedValueOnce({
        platformRecommendations: [],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      });

      await GET(createMockRequest({ lookbackDays: "60" }), mockParams);

      expect(getBestTimeRecommendations).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        accountIds: undefined,
        lookbackDays: 60,
        includeGaps: false,
      });
    });

    it("should return empty recommendations when no accounts", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      vi.mocked(getBestTimeRecommendations).mockResolvedValueOnce({
        platformRecommendations: [],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      });

      const response = await GET(createMockRequest(), mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recommendations).toEqual([]);
    });

    it("should return 500 when service throws an error", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(getBestTimeRecommendations).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const response = await GET(createMockRequest(), mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to generate recommendations");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle workspace query error gracefully", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockRejectedValueOnce(
        new Error("Database error"),
      );

      const response = await GET(createMockRequest(), mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found or access denied");
    });

    it("should filter empty account IDs from comma-separated list", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      vi.mocked(getBestTimeRecommendations).mockResolvedValueOnce({
        platformRecommendations: [],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      });

      await GET(createMockRequest({ accountIds: "acc-1,,acc-2," }), mockParams);

      expect(getBestTimeRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          accountIds: ["acc-1", "acc-2"],
        }),
      );
    });

    it("should use default lookbackDays when not provided", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
      } as never);

      vi.mocked(getBestTimeRecommendations).mockResolvedValueOnce({
        platformRecommendations: [],
        calendarGaps: [],
        globalBestSlots: [],
        analysisRange: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
      });

      await GET(createMockRequest(), mockParams);

      expect(getBestTimeRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          lookbackDays: 30,
        }),
      );
    });
  });
});
