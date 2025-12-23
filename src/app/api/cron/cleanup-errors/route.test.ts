import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  default: {
    errorLog: {
      deleteMany: vi.fn().mockResolvedValue({ count: 10 }),
    },
  },
}));

// Mock try-catch to avoid error reporting
vi.mock("@/lib/try-catch", () => ({
  tryCatch: async <T>(promise: Promise<T>) => {
    try {
      const data = await promise;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
}));

// Import after mocking
import prisma from "@/lib/prisma";
import { GET } from "./route";

describe("/api/cron/cleanup-errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createRequest = (headers: Record<string, string> = {}) => {
    return new NextRequest("http://localhost/api/cron/cleanup-errors", {
      headers,
    });
  };

  describe("authentication", () => {
    it("should reject requests without CRON_SECRET in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSecret = process.env.CRON_SECRET;

      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.CRON_SECRET = "test-secret";

      try {
        const request = createRequest();
        const response = await GET(request);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe("Unauthorized");
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
        process.env.CRON_SECRET = originalSecret;
      }
    });

    it("should accept valid Bearer token", async () => {
      const secret = "valid-secret";
      const originalSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = secret;

      try {
        const request = createRequest({
          authorization: `Bearer ${secret}`,
        });
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      } finally {
        process.env.CRON_SECRET = originalSecret;
      }
    });

    it("should accept valid x-cron-secret header", async () => {
      const secret = "valid-secret";
      const originalSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = secret;

      try {
        const request = createRequest({
          "x-cron-secret": secret,
        });
        const response = await GET(request);

        expect(response.status).toBe(200);
      } finally {
        process.env.CRON_SECRET = originalSecret;
      }
    });
  });

  describe("cleanup operation", () => {
    it("should delete old error logs and return stats", async () => {
      const secret = "test-cleanup-secret";
      const originalSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = secret;

      try {
        const request = createRequest({
          "x-cron-secret": secret,
        });
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.retentionDays).toBe(30);
        expect(data.deleted.errorLogs).toBe(10);
        expect(data.totalDeleted).toBe(10);
        expect(data.durationMs).toBeDefined();
        expect(data.timestamp).toBeDefined();
      } finally {
        process.env.CRON_SECRET = originalSecret;
      }
    });

    it("should use correct cutoff date (30 days)", async () => {
      const secret = "test-cleanup-secret";
      const originalSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = secret;

      try {
        const request = createRequest({
          "x-cron-secret": secret,
        });
        await GET(request);

        expect(prisma.errorLog.deleteMany).toHaveBeenCalledOnce();
        const call = vi.mocked(prisma.errorLog.deleteMany).mock.calls[0]?.[0];

        // Check that the cutoff date is approximately 30 days ago
        const whereTimestamp = call?.where?.timestamp;
        const cutoffDate = whereTimestamp &&
            typeof whereTimestamp === "object" &&
            "lt" in whereTimestamp
          ? (whereTimestamp.lt as Date)
          : undefined;
        expect(cutoffDate).toBeDefined();
        const expectedCutoff = new Date();
        expectedCutoff.setDate(expectedCutoff.getDate() - 30);

        // Allow 1 day tolerance for test execution time
        const diff = Math.abs(
          cutoffDate!.getTime() - expectedCutoff.getTime(),
        );
        expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
      } finally {
        process.env.CRON_SECRET = originalSecret;
      }
    });

    it("should handle database errors gracefully", async () => {
      const secret = "test-cleanup-secret";
      const originalSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = secret;
      vi.mocked(prisma.errorLog.deleteMany).mockRejectedValueOnce(
        new Error("Database error"),
      );

      try {
        const request = createRequest({
          "x-cron-secret": secret,
        });
        const response = await GET(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toBe("Database error");
      } finally {
        process.env.CRON_SECRET = originalSecret;
      }
    });
  });
});
