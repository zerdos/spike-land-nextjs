/**
 * Tests for Admin Jobs Cleanup API Route
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies BEFORE imports
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));
vi.mock("@/lib/jobs/cleanup", () => ({
  cleanupStuckJobs: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {},
}));

// Import after mocks are set up
const { auth } = await import("@/auth");
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
const { cleanupStuckJobs } = await import("@/lib/jobs/cleanup");
const { POST } = await import("./route");

describe("POST /api/admin/jobs/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/admin/jobs/cleanup", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 if not admin", async () => {
    vi.mocked(auth).mockResolvedValue(
      {
        user: { id: "user123", email: "user@example.com" },
        expires: "2024-12-31",
      } as Parameters<typeof auth>[0] extends never ? never : Awaited<ReturnType<typeof auth>>,
    );

    vi.mocked(requireAdminByUserId).mockRejectedValue(
      new Error("Forbidden: Admin access required"),
    );

    const request = new NextRequest("http://localhost/api/admin/jobs/cleanup", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should successfully cleanup stuck jobs with default options", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", email: "admin@example.com" },
      expires: "2024-12-31",
    } as any);

    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 3,
      cleanedUp: 3,
      failed: 0,
      tokensRefunded: 27,
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
          tokensRefunded: 7,
          processingDuration: 480000,
        },
        {
          id: "job3",
          userId: "user3",
          tokensRefunded: 10,
          processingDuration: 720000,
        },
      ],
      errors: [],
    });

    const request = new NextRequest("http://localhost/api/admin/jobs/cleanup", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.totalFound).toBe(3);
    expect(data.result.cleanedUp).toBe(3);
    expect(data.result.tokensRefunded).toBe(27);
    expect(data.message).toContain("Successfully cleaned up 3 stuck jobs");
    expect(data.message).toContain("refunded 27 tokens");

    expect(cleanupStuckJobs).toHaveBeenCalledWith({});
  });

  it("should accept custom timeout option", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", email: "admin@example.com" },
      expires: "2024-12-31",
    } as Awaited<ReturnType<typeof auth>>);

    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 0,
      cleanedUp: 0,
      failed: 0,
      tokensRefunded: 0,
      jobs: [],
      errors: [],
    });

    const request = new NextRequest("http://localhost/api/admin/jobs/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeoutMs: 600000 }), // 10 minutes
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(cleanupStuckJobs).toHaveBeenCalledWith({
      timeoutMs: 600000,
      dryRun: undefined,
      batchSize: undefined,
    });
  });

  it("should support dry run mode", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", email: "admin@example.com" },
      expires: "2024-12-31",
    } as Awaited<ReturnType<typeof auth>>);

    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 5,
      cleanedUp: 0,
      failed: 0,
      tokensRefunded: 0,
      jobs: [
        {
          id: "job1",
          userId: "user1",
          tokensRefunded: 0,
          processingDuration: 600000,
        },
        {
          id: "job2",
          userId: "user2",
          tokensRefunded: 0,
          processingDuration: 480000,
        },
        {
          id: "job3",
          userId: "user3",
          tokensRefunded: 0,
          processingDuration: 720000,
        },
        {
          id: "job4",
          userId: "user4",
          tokensRefunded: 0,
          processingDuration: 540000,
        },
        {
          id: "job5",
          userId: "user5",
          tokensRefunded: 0,
          processingDuration: 660000,
        },
      ],
      errors: [],
    });

    const request = new NextRequest("http://localhost/api/admin/jobs/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("Dry run");
    expect(data.message).toContain("Found 5 stuck jobs");
    expect(data.message).toContain("no changes made");

    expect(cleanupStuckJobs).toHaveBeenCalledWith({
      timeoutMs: undefined,
      dryRun: true,
      batchSize: undefined,
    });
  });

  it("should accept custom batch size", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", email: "admin@example.com" },
      expires: "2024-12-31",
    } as Awaited<ReturnType<typeof auth>>);

    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 0,
      cleanedUp: 0,
      failed: 0,
      tokensRefunded: 0,
      jobs: [],
      errors: [],
    });

    const request = new NextRequest("http://localhost/api/admin/jobs/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchSize: 50 }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(cleanupStuckJobs).toHaveBeenCalledWith({
      timeoutMs: undefined,
      dryRun: undefined,
      batchSize: 50,
    });
  });

  it("should return appropriate message when no stuck jobs found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", email: "admin@example.com" },
      expires: "2024-12-31",
    } as Awaited<ReturnType<typeof auth>>);

    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 0,
      cleanedUp: 0,
      failed: 0,
      tokensRefunded: 0,
      jobs: [],
      errors: [],
    });

    const request = new NextRequest("http://localhost/api/admin/jobs/cleanup", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("No stuck jobs found");
  });

  it("should handle cleanup errors gracefully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", email: "admin@example.com" },
      expires: "2024-12-31",
    } as Awaited<ReturnType<typeof auth>>);

    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    vi.mocked(cleanupStuckJobs).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new NextRequest("http://localhost/api/admin/jobs/cleanup", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to cleanup stuck jobs");
    expect(data.details).toContain("Database connection failed");
  });

  it("should handle invalid JSON body gracefully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", email: "admin@example.com" },
      expires: "2024-12-31",
    } as Awaited<ReturnType<typeof auth>>);

    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 0,
      cleanedUp: 0,
      failed: 0,
      tokensRefunded: 0,
      jobs: [],
      errors: [],
    });

    const request = new Request("http://localhost/api/admin/jobs/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    const response = await POST(request);

    // Should fall back to default options
    expect(response.status).toBe(200);
    expect(cleanupStuckJobs).toHaveBeenCalledWith({});
  });

  it("should include error details when some jobs fail to cleanup", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin123", email: "admin@example.com" },
      expires: "2024-12-31",
    } as any);

    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    vi.mocked(cleanupStuckJobs).mockResolvedValue({
      totalFound: 3,
      cleanedUp: 2,
      failed: 1,
      tokensRefunded: 17,
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
          tokensRefunded: 7,
          processingDuration: 480000,
        },
        {
          id: "job3",
          userId: "user3",
          tokensRefunded: 0,
          processingDuration: 0,
          error: "Token refund failed",
        },
      ],
      errors: [
        { jobId: "job3", error: "Token refund failed" },
      ],
    });

    const request = new Request("http://localhost/api/admin/jobs/cleanup", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.cleanedUp).toBe(2);
    expect(data.result.failed).toBe(1);
    expect(data.result.errors).toHaveLength(1);
  });
});
