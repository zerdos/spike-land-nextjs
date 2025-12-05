/**
 * Tests for System Health API Route
 */

import { JobStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

describe("System Health API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return system health data for admin users", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { hour: new Date("2025-01-01T10:00:00"), count: BigInt(5) },
    ]).mockResolvedValueOnce([
      { tier: "TIER_1K", avg_seconds: 30.5 },
    ]);

    vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValueOnce([
      { tier: "TIER_1K", status: JobStatus.COMPLETED, _count: 100 },
      { tier: "TIER_1K", status: JobStatus.FAILED, _count: 5 },
    ] as any).mockResolvedValueOnce([
      { status: JobStatus.COMPLETED, _count: 100 },
      { status: JobStatus.FAILED, _count: 5 },
    ] as any);

    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(10);

    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([
      {
        id: "job_1",
        tier: "TIER_1K",
        errorMessage: "Test error",
        createdAt: new Date("2025-01-01"),
      },
    ] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("hourlyJobs");
    expect(data).toHaveProperty("avgProcessingTime");
    expect(data).toHaveProperty("tierStats");
    expect(data).toHaveProperty("queueDepth");
    expect(data).toHaveProperty("jobsByStatus");
    expect(data).toHaveProperty("recentFailures");
  });

  it("should handle errors gracefully and return partial data", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    // Simulate partial failures
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("Query error"));
    vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(0);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    // Should still return 200 with empty/default data
    expect(response.status).toBe(200);
    expect(data.hourlyJobs).toEqual([]);
    expect(data.avgProcessingTime).toEqual([]);
    expect(data.queueDepth).toBe(0);
    expect(console.error).toHaveBeenCalledWith("Failed to fetch hourly jobs:", expect.any(Error));
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch average processing time:",
      expect.any(Error),
    );
  });

  it("should handle individual query failures gracefully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    // Success for some queries, failure for others
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([
        { hour: new Date("2025-01-01T10:00:00"), count: BigInt(5) },
      ])
      .mockRejectedValueOnce(new Error("Avg processing time error"));

    vi.mocked(prisma.imageEnhancementJob.groupBy)
      .mockResolvedValueOnce([
        { tier: "TIER_1K", status: JobStatus.COMPLETED, _count: 100 },
      ] as any)
      .mockRejectedValueOnce(new Error("Jobs by status error"));

    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(5);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockRejectedValue(
      new Error("Recent failures error"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hourlyJobs).toHaveLength(1);
    expect(data.avgProcessingTime).toEqual([]);
    expect(data.queueDepth).toBe(5);
    expect(data.jobsByStatus).toEqual([]);
    expect(data.recentFailures).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch average processing time:",
      expect.any(Error),
    );
  });

  it("should calculate tier stats with empty failures array", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(0);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tierStats).toHaveLength(3); // TIER_1K, TIER_2K, TIER_4K
    data.tierStats.forEach((stat: any) => {
      expect(stat.total).toBe(0);
      expect(stat.failed).toBe(0);
      expect(stat.failureRate).toBe(0);
    });
  });

  it("should handle non-array responses from database", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    // Return non-array values (edge case)
    vi.mocked(prisma.$queryRaw).mockResolvedValue(null as any);
    vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue(null as any);
    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(0);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(null as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hourlyJobs).toEqual([]);
    expect(data.avgProcessingTime).toEqual([]);
    expect(data.jobsByStatus).toEqual([]);
    expect(data.recentFailures).toEqual([]);
  });

  it("should handle null avg_seconds in processing time", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);

    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { tier: "TIER_1K", avg_seconds: null },
      ]);

    vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(0);
    vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.avgProcessingTime[0].seconds).toBe(0);
  });
});
