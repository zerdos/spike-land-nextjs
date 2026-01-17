import * as binCleanup from "@/lib/apps/bin-cleanup";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/apps/bin-cleanup", () => ({
  cleanupExpiredBinApps: vi.fn(),
  getBinStats: vi.fn(),
}));

vi.mock("@/lib/try-catch", () => ({
  tryCatch: vi.fn(async (promise) => {
    try {
      const data = await promise;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }),
}));

describe("GET /api/cron/cleanup-bin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("should return 401 if unauthorized", async () => {
    const request = new NextRequest("http://localhost/api/cron/cleanup-bin", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should run cleanup successfully", async () => {
    const request = new NextRequest("http://localhost/api/cron/cleanup-bin", {
      headers: { authorization: "Bearer test-secret" },
    });

    vi.mocked(binCleanup.getBinStats).mockResolvedValue({
      totalInBin: 10,
      expiringWithin7Days: 2,
      expiringWithin24Hours: 1,
    });

    vi.mocked(binCleanup.cleanupExpiredBinApps).mockResolvedValue({
      totalFound: 5,
      deleted: 5,
      failed: 0,
      dryRun: false,
      apps: [],
      errors: [],
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.deleted).toBe(5);
    expect(binCleanup.cleanupExpiredBinApps).toHaveBeenCalled();
  });

  it("should handle cleanup failure", async () => {
    const request = new NextRequest("http://localhost/api/cron/cleanup-bin", {
      headers: { authorization: "Bearer test-secret" },
    });

    vi.mocked(binCleanup.getBinStats).mockResolvedValue({} as any);
    vi.mocked(binCleanup.cleanupExpiredBinApps).mockRejectedValue(new Error("Cleanup failed"));

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Cleanup failed");
  });
});
