/**
 * Scheduled Posts Publishing Cron Route Tests
 *
 * Unit tests for the cron endpoint that processes scheduled posts.
 * Part of #576: Implement Calendar publishing
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/calendar/publishing-service", () => ({
  processScheduledPosts: vi.fn(),
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

import { processScheduledPosts } from "@/lib/calendar/publishing-service";
import { GET } from "./route";

describe("GET /api/cron/publish-scheduled-posts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: "test-cron-secret" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return 401 if authorization header is missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/cron/publish-scheduled-posts",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if authorization header is invalid", async () => {
    const request = new NextRequest(
      "http://localhost/api/cron/publish-scheduled-posts",
      {
        headers: {
          Authorization: "Bearer wrong-secret",
        },
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should process posts when authorized", async () => {
    vi.mocked(processScheduledPosts).mockResolvedValue({
      processedCount: 5,
      successCount: 4,
      partialSuccessCount: 1,
      failedCount: 0,
      results: [],
      errors: [],
    });

    const request = new NextRequest(
      "http://localhost/api/cron/publish-scheduled-posts",
      {
        headers: {
          Authorization: "Bearer test-cron-secret",
        },
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.processedCount).toBe(5);
    expect(data.result.successCount).toBe(4);
    expect(data.result.partialSuccessCount).toBe(1);
    expect(processScheduledPosts).toHaveBeenCalledWith(50);
  });

  it("should return success with zero counts when no posts are due", async () => {
    vi.mocked(processScheduledPosts).mockResolvedValue({
      processedCount: 0,
      successCount: 0,
      partialSuccessCount: 0,
      failedCount: 0,
      results: [],
      errors: [],
    });

    const request = new NextRequest(
      "http://localhost/api/cron/publish-scheduled-posts",
      {
        headers: {
          Authorization: "Bearer test-cron-secret",
        },
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.processedCount).toBe(0);
  });

  it("should return 500 on processing error", async () => {
    vi.mocked(processScheduledPosts).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new NextRequest(
      "http://localhost/api/cron/publish-scheduled-posts",
      {
        headers: {
          Authorization: "Bearer test-cron-secret",
        },
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Publishing failed");
    expect(data.details).toBe("Database connection failed");
  });

  it("should skip auth check if CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;

    vi.mocked(processScheduledPosts).mockResolvedValue({
      processedCount: 1,
      successCount: 1,
      partialSuccessCount: 0,
      failedCount: 0,
      results: [],
      errors: [],
    });

    const request = new NextRequest(
      "http://localhost/api/cron/publish-scheduled-posts",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should include timestamp in response", async () => {
    vi.mocked(processScheduledPosts).mockResolvedValue({
      processedCount: 0,
      successCount: 0,
      partialSuccessCount: 0,
      failedCount: 0,
      results: [],
      errors: [],
    });

    const request = new NextRequest(
      "http://localhost/api/cron/publish-scheduled-posts",
      {
        headers: {
          Authorization: "Bearer test-cron-secret",
        },
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
  });

  it("should include error count in response", async () => {
    vi.mocked(processScheduledPosts).mockResolvedValue({
      processedCount: 3,
      successCount: 1,
      partialSuccessCount: 0,
      failedCount: 2,
      results: [],
      errors: [
        { postId: "post-1", error: "Failed to publish" },
        { postId: "post-2", error: "Rate limited" },
      ],
    });

    const request = new NextRequest(
      "http://localhost/api/cron/publish-scheduled-posts",
      {
        headers: {
          Authorization: "Bearer test-cron-secret",
        },
      },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result.errorCount).toBe(2);
    expect(data.result.failedCount).toBe(2);
  });
});
