/**
 * Best-Time Recommendations API Route Tests
 *
 * Unit tests for the recommendations API endpoint.
 * Part of #578: Add best-time recommendations
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock permissions
vi.mock("@/lib/permissions/workspace-middleware", () => ({
  requireWorkspaceMembership: vi.fn(),
}));

// Mock best-time service
vi.mock("@/lib/calendar/best-time-service", () => ({
  getBestTimeRecommendations: vi.fn(),
}));

import { auth } from "@/auth";
import { getBestTimeRecommendations } from "@/lib/calendar/best-time-service";
import { requireWorkspaceMembership } from "@/lib/permissions/workspace-middleware";

const mockAuth = vi.mocked(auth);
const mockGetBestTimeRecommendations = vi.mocked(getBestTimeRecommendations);
const mockRequireWorkspaceMembership = vi.mocked(requireWorkspaceMembership);

describe("GET /api/calendar/recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(params: Record<string, string> = {}): NextRequest {
    const searchParams = new URLSearchParams(params);
    return new NextRequest(
      `http://localhost:3000/api/calendar/recommendations?${searchParams.toString()}`,
    );
  }

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest({ workspaceId: "workspace-1" });
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 if workspaceId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    });

    const request = createRequest({});
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("workspaceId");
  });

  it("returns 400 for invalid lookbackDays", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockRequireWorkspaceMembership.mockResolvedValue({
      isMember: true,
      role: "ADMIN",
    });

    const request = createRequest({
      workspaceId: "workspace-1",
      lookbackDays: "invalid",
    });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("lookbackDays");
  });

  it("returns 400 for lookbackDays out of range", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockRequireWorkspaceMembership.mockResolvedValue({
      isMember: true,
      role: "ADMIN",
    });

    const request = createRequest({
      workspaceId: "workspace-1",
      lookbackDays: "500",
    });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("lookbackDays");
  });

  it("returns 400 for invalid gap date format", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockRequireWorkspaceMembership.mockResolvedValue({
      isMember: true,
      role: "ADMIN",
    });

    const request = createRequest({
      workspaceId: "workspace-1",
      gapStartDate: "invalid-date",
      gapEndDate: "2024-01-01",
    });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("date format");
  });

  it("returns 400 if gapStartDate is after gapEndDate", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockRequireWorkspaceMembership.mockResolvedValue({
      isMember: true,
      role: "ADMIN",
    });

    const request = createRequest({
      workspaceId: "workspace-1",
      gapStartDate: "2024-12-31",
      gapEndDate: "2024-01-01",
    });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("before");
  });

  it("returns 403 if user lacks workspace access", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockRequireWorkspaceMembership.mockRejectedValue(
      new Error("Access denied to workspace"),
    );

    const request = createRequest({ workspaceId: "workspace-1" });
    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it("returns recommendations successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockRequireWorkspaceMembership.mockResolvedValue({
      isMember: true,
      role: "ADMIN",
    });

    const mockRecommendations = {
      platformRecommendations: [
        {
          platform: "LINKEDIN",
          accountId: "account-1",
          accountName: "Test Company",
          bestTimeSlots: [
            {
              dayOfWeek: 2,
              hour: 10,
              confidence: "high",
              engagementScore: 85,
              reason: "Best engagement on Tuesday",
            },
          ],
          avoidDays: [0, 6],
          peakHours: [9, 10, 11],
          hasEnoughData: true,
          daysAnalyzed: 30,
        },
      ],
      calendarGaps: [],
      globalBestSlots: [
        {
          dayOfWeek: 2,
          hour: 10,
          confidence: "high",
          engagementScore: 85,
          reason: "Optimal across platforms",
        },
      ],
      analysisRange: {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-31"),
      },
    };

    mockGetBestTimeRecommendations.mockResolvedValue(mockRecommendations);

    const request = createRequest({ workspaceId: "workspace-1" });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.platformRecommendations).toHaveLength(1);
    expect(body.globalBestSlots).toHaveLength(1);
  });

  it("passes accountIds filter to service", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockRequireWorkspaceMembership.mockResolvedValue({
      isMember: true,
      role: "ADMIN",
    });
    mockGetBestTimeRecommendations.mockResolvedValue({
      platformRecommendations: [],
      calendarGaps: [],
      globalBestSlots: [],
      analysisRange: { start: new Date(), end: new Date() },
    });

    const request = createRequest({
      workspaceId: "workspace-1",
      accountIds: "acc-1,acc-2",
    });
    await GET(request);

    expect(mockGetBestTimeRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({
        accountIds: ["acc-1", "acc-2"],
      }),
    );
  });

  it("passes includeGaps=false to service", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockRequireWorkspaceMembership.mockResolvedValue({
      isMember: true,
      role: "ADMIN",
    });
    mockGetBestTimeRecommendations.mockResolvedValue({
      platformRecommendations: [],
      calendarGaps: [],
      globalBestSlots: [],
      analysisRange: { start: new Date(), end: new Date() },
    });

    const request = createRequest({
      workspaceId: "workspace-1",
      includeGaps: "false",
    });
    await GET(request);

    expect(mockGetBestTimeRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({
        includeGaps: false,
      }),
    );
  });

  it("passes custom lookbackDays to service", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockRequireWorkspaceMembership.mockResolvedValue({
      isMember: true,
      role: "ADMIN",
    });
    mockGetBestTimeRecommendations.mockResolvedValue({
      platformRecommendations: [],
      calendarGaps: [],
      globalBestSlots: [],
      analysisRange: { start: new Date(), end: new Date() },
    });

    const request = createRequest({
      workspaceId: "workspace-1",
      lookbackDays: "60",
    });
    await GET(request);

    expect(mockGetBestTimeRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({
        lookbackDays: 60,
      }),
    );
  });

  it("returns 500 on service error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockRequireWorkspaceMembership.mockResolvedValue({
      isMember: true,
      role: "ADMIN",
    });
    mockGetBestTimeRecommendations.mockRejectedValue(
      new Error("Database error"),
    );

    const request = createRequest({ workspaceId: "workspace-1" });
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to fetch");
  });
});
