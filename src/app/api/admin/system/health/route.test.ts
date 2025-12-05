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

  it("should handle errors gracefully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin_123" },
    } as any);

    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("DB error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
