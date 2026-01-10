/**
 * Calendar View API Route Tests
 *
 * Part of #574: Build Calendar UI
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/calendar", () => ({
  getCalendarView: vi.fn(),
}));

vi.mock("@/lib/permissions/workspace-middleware", () => ({
  requireWorkspaceMembership: vi.fn(),
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: vi.fn(async (fn: () => Promise<unknown>) => {
    try {
      const data = await fn;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }),
}));

import { auth } from "@/auth";
import { getCalendarView } from "@/lib/calendar";
import { requireWorkspaceMembership } from "@/lib/permissions/workspace-middleware";
import { createMockSession } from "@/test-utils";
import { GET } from "./route";

describe("GET /api/calendar/view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/calendar/view?workspaceId=ws-123&startDate=2025-01-01&endDate=2025-01-31",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 if workspaceId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

    const request = new NextRequest(
      "http://localhost/api/calendar/view?startDate=2025-01-01&endDate=2025-01-31",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("workspaceId query parameter is required");
  });

  it("should return 400 if startDate is missing", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

    const request = new NextRequest(
      "http://localhost/api/calendar/view?workspaceId=ws-123&endDate=2025-01-31",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("startDate and endDate query parameters are required");
  });

  it("should return 400 if date format is invalid", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

    const request = new NextRequest(
      "http://localhost/api/calendar/view?workspaceId=ws-123&startDate=invalid&endDate=2025-01-31",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid date format. Use ISO date strings");
  });

  it("should return 400 for invalid platform", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

    const request = new NextRequest(
      "http://localhost/api/calendar/view?workspaceId=ws-123&startDate=2025-01-01&endDate=2025-01-31&platforms=INVALID",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid platform");
  });

  it("should return 400 for invalid status", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

    const request = new NextRequest(
      "http://localhost/api/calendar/view?workspaceId=ws-123&startDate=2025-01-01&endDate=2025-01-31&status=INVALID",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid status");
  });

  it("should return calendar posts on success", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
    vi.mocked(requireWorkspaceMembership).mockResolvedValue(undefined as never);

    const mockPosts = [
      {
        id: "post-1",
        content: "Test post",
        scheduledAt: new Date("2025-01-15"),
        status: "SCHEDULED" as const,
        platforms: ["LINKEDIN" as const],
        accountNames: ["Test Account"],
        isRecurring: false,
      },
    ];

    vi.mocked(getCalendarView).mockResolvedValue({
      posts: mockPosts,
      dateRange: {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-31"),
      },
    });

    const request = new NextRequest(
      "http://localhost/api/calendar/view?workspaceId=ws-123&startDate=2025-01-01&endDate=2025-01-31",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toHaveLength(1);
    expect(data.posts[0].id).toBe("post-1");
  });

  it("should filter posts by platform", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
    vi.mocked(requireWorkspaceMembership).mockResolvedValue(undefined as never);

    const mockPosts = [
      {
        id: "post-1",
        content: "LinkedIn post",
        scheduledAt: new Date("2025-01-15"),
        status: "SCHEDULED" as const,
        platforms: ["LINKEDIN" as const],
        accountNames: ["LinkedIn Account"],
        isRecurring: false,
      },
      {
        id: "post-2",
        content: "Twitter post",
        scheduledAt: new Date("2025-01-16"),
        status: "SCHEDULED" as const,
        platforms: ["TWITTER" as const],
        accountNames: ["Twitter Account"],
        isRecurring: false,
      },
    ];

    vi.mocked(getCalendarView).mockResolvedValue({
      posts: mockPosts,
      dateRange: {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-31"),
      },
    });

    const request = new NextRequest(
      "http://localhost/api/calendar/view?workspaceId=ws-123&startDate=2025-01-01&endDate=2025-01-31&platforms=LINKEDIN",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toHaveLength(1);
    expect(data.posts[0].id).toBe("post-1");
  });

  it("should filter posts by status", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
    vi.mocked(requireWorkspaceMembership).mockResolvedValue(undefined as never);

    const mockPosts = [
      {
        id: "post-1",
        content: "Scheduled post",
        scheduledAt: new Date("2025-01-15"),
        status: "SCHEDULED" as const,
        platforms: ["LINKEDIN" as const],
        accountNames: ["Account"],
        isRecurring: false,
      },
      {
        id: "post-2",
        content: "Draft post",
        scheduledAt: new Date("2025-01-16"),
        status: "DRAFT" as const,
        platforms: ["LINKEDIN" as const],
        accountNames: ["Account"],
        isRecurring: false,
      },
    ];

    vi.mocked(getCalendarView).mockResolvedValue({
      posts: mockPosts,
      dateRange: {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-31"),
      },
    });

    const request = new NextRequest(
      "http://localhost/api/calendar/view?workspaceId=ws-123&startDate=2025-01-01&endDate=2025-01-31&status=DRAFT",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toHaveLength(1);
    expect(data.posts[0].id).toBe("post-2");
  });

  it("should handle getCalendarView error", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
    vi.mocked(requireWorkspaceMembership).mockResolvedValue(undefined as never);
    vi.mocked(getCalendarView).mockRejectedValue(new Error("Database error"));

    const request = new NextRequest(
      "http://localhost/api/calendar/view?workspaceId=ws-123&startDate=2025-01-01&endDate=2025-01-31",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch calendar view");
  });
});
