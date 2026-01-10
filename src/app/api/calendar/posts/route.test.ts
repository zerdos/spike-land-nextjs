/**
 * Calendar Posts API Route Tests
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
  createScheduledPost: vi.fn(),
  schedulePost: vi.fn(),
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
import { createScheduledPost, schedulePost } from "@/lib/calendar";
import { requireWorkspaceMembership } from "@/lib/permissions/workspace-middleware";
import { createMockSession } from "@/test-utils";
import { POST } from "./route";

describe("POST /api/calendar/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/calendar/posts", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 for invalid JSON body", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

    const request = new NextRequest("http://localhost/api/calendar/posts", {
      method: "POST",
      body: "invalid json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("should return 400 if workspaceId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

    const request = new NextRequest("http://localhost/api/calendar/posts", {
      method: "POST",
      body: JSON.stringify({
        content: "Test content",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        accountIds: ["acc-1"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("workspaceId is required");
  });

  it("should return 400 if content is empty", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

    const request = new NextRequest("http://localhost/api/calendar/posts", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: "ws-123",
        content: "",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        accountIds: ["acc-1"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("content is required");
  });

  it("should return 400 if scheduledAt is missing", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

    const request = new NextRequest("http://localhost/api/calendar/posts", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: "ws-123",
        content: "Test content",
        accountIds: ["acc-1"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("scheduledAt is required");
  });

  it("should return 400 if scheduledAt is in the past", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

    const request = new NextRequest("http://localhost/api/calendar/posts", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: "ws-123",
        content: "Test content",
        scheduledAt: new Date(Date.now() - 86400000).toISOString(),
        accountIds: ["acc-1"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Scheduled time must be in the future");
  });

  it("should return 400 if no accounts selected", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));

    const request = new NextRequest("http://localhost/api/calendar/posts", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: "ws-123",
        content: "Test content",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        accountIds: [],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Please select at least one account");
  });

  it("should create a scheduled post on success", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
    vi.mocked(requireWorkspaceMembership).mockResolvedValue(undefined as never);

    const mockPost = {
      id: "post-1",
      content: "Test content",
      scheduledAt: new Date(Date.now() + 86400000),
      status: "SCHEDULED" as const,
      workspaceId: "ws-123",
      accounts: [],
    };

    vi.mocked(createScheduledPost).mockResolvedValue(mockPost as never);
    vi.mocked(schedulePost).mockResolvedValue(mockPost as never);

    const request = new NextRequest("http://localhost/api/calendar/posts", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: "ws-123",
        content: "Test content",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        accountIds: ["acc-1"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("post-1");
    expect(createScheduledPost).toHaveBeenCalled();
    expect(schedulePost).toHaveBeenCalled();
  });

  it("should handle createScheduledPost error", async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession({ id: "user-123" }));
    vi.mocked(requireWorkspaceMembership).mockResolvedValue(undefined as never);
    vi.mocked(createScheduledPost).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new NextRequest("http://localhost/api/calendar/posts", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: "ws-123",
        content: "Test content",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        accountIds: ["acc-1"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database error");
  });
});
