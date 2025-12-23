/**
 * Tests for Cron Job Cleanup Route
 */

import { cleanupStuckJobs } from "@/lib/jobs/cleanup";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Mock dependencies
vi.mock("@/lib/jobs/cleanup");
vi.mock("@/lib/prisma", () => ({
  default: {},
}));

describe("GET /api/cron/cleanup-jobs", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should successfully run cleanup when authenticated with cron secret", async () => {
    process.env.CRON_SECRET = "test-secret-123";

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 2,
      cleanedUp: 2,
      failed: 0,
      tokensRefunded: 15,
      jobs: [
        {
          id: "job1",
          userId: "user1",
          tokensRefunded: 10,
          processingDuration: 600000,
        },
        {
          id: "job2",
          userId: "user2",
          tokensRefunded: 5,
          processingDuration: 480000,
        },
      ],
      errors: [],
    });

    const request = new NextRequest("http://localhost/api/cron/cleanup-jobs", {
      method: "GET",
      headers: {
        authorization: "Bearer test-secret-123",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.totalFound).toBe(2);
    expect(data.result.cleanedUp).toBe(2);
    expect(data.result.tokensRefunded).toBe(15);
    expect(data.timestamp).toBeDefined();

    expect(cleanupStuckJobs).toHaveBeenCalledWith();
  });

  it("should return 401 when cron secret is missing", async () => {
    process.env.CRON_SECRET = "test-secret-123";

    const request = new NextRequest("http://localhost/api/cron/cleanup-jobs", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(cleanupStuckJobs).not.toHaveBeenCalled();
  });

  it("should return 401 when cron secret is incorrect", async () => {
    process.env.CRON_SECRET = "correct-secret";

    const request = new NextRequest("http://localhost/api/cron/cleanup-jobs", {
      method: "GET",
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(cleanupStuckJobs).not.toHaveBeenCalled();
  });

  it("should allow access when CRON_SECRET is not set (development mode)", async () => {
    delete process.env.CRON_SECRET;

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 0,
      cleanedUp: 0,
      failed: 0,
      tokensRefunded: 0,
      jobs: [],
      errors: [],
    });

    const request = new NextRequest("http://localhost/api/cron/cleanup-jobs", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(cleanupStuckJobs).toHaveBeenCalled();
  });

  it("should return appropriate response when no jobs found", async () => {
    process.env.CRON_SECRET = "test-secret";

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 0,
      cleanedUp: 0,
      failed: 0,
      tokensRefunded: 0,
      jobs: [],
      errors: [],
    });

    const request = new NextRequest("http://localhost/api/cron/cleanup-jobs", {
      method: "GET",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.totalFound).toBe(0);
    expect(data.result.cleanedUp).toBe(0);
  });

  it("should handle cleanup errors gracefully", async () => {
    process.env.CRON_SECRET = "test-secret";

    vi.mocked(cleanupStuckJobs).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new NextRequest("http://localhost/api/cron/cleanup-jobs", {
      method: "GET",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Cleanup failed");
    expect(data.details).toContain("Database connection failed");
  });

  it("should include error count in response", async () => {
    process.env.CRON_SECRET = "test-secret";

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 3,
      cleanedUp: 2,
      failed: 1,
      tokensRefunded: 15,
      jobs: [
        {
          id: "job1",
          userId: "user1",
          tokensRefunded: 10,
          processingDuration: 600000,
        },
        {
          id: "job2",
          userId: "user2",
          tokensRefunded: 5,
          processingDuration: 480000,
        },
        {
          id: "job3",
          userId: "user3",
          tokensRefunded: 0,
          processingDuration: 0,
          error: "Refund failed",
        },
      ],
      errors: [
        { jobId: "job3", error: "Refund failed" },
      ],
    });

    const request = new NextRequest("http://localhost/api/cron/cleanup-jobs", {
      method: "GET",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.failed).toBe(1);
    expect(data.result.errorCount).toBe(1);
  });

  it("should include timestamp in response", async () => {
    process.env.CRON_SECRET = "test-secret";

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 0,
      cleanedUp: 0,
      failed: 0,
      tokensRefunded: 0,
      jobs: [],
      errors: [],
    });

    const request = new NextRequest("http://localhost/api/cron/cleanup-jobs", {
      method: "GET",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const beforeTime = new Date();
    const response = await GET(request);
    const afterTime = new Date();
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    const responseTime = new Date(data.timestamp);
    expect(responseTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(responseTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });
});
