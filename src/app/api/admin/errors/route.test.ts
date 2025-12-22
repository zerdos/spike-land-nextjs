/**
 * Tests for Admin Errors API Route
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    errorLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");

describe("Admin Errors API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireAdminByUserId).mockResolvedValue();
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost/api/admin/errors");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 if auth throws an error", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth service unavailable"));

      const request = new Request("http://localhost/api/admin/errors");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 403 if admin check fails with Forbidden", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user_123" },
      } as any);
      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const request = new Request("http://localhost/api/admin/errors");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should return 500 if admin check throws non-Forbidden error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user_123" },
      } as any);
      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new Request("http://localhost/api/admin/errors");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return errors list for admin users", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      const mockErrors = [
        {
          id: "err1",
          timestamp: new Date("2025-01-15T10:00:00Z"),
          message: "Test error",
          stack: "Error: Test\n  at test.ts:1",
          sourceFile: "src/test.ts",
          sourceLine: 10,
          sourceColumn: 5,
          callerName: "testFunc",
          userId: null,
          route: "/api/test",
          environment: "BACKEND",
          errorType: "Error",
          errorCode: null,
          metadata: null,
        },
      ];

      vi.mocked(prisma.errorLog.findMany).mockResolvedValue(mockErrors as any);
      vi.mocked(prisma.errorLog.count).mockResolvedValue(1);
      vi.mocked(prisma.errorLog.groupBy).mockResolvedValue([]);

      const request = new Request("http://localhost/api/admin/errors");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].message).toBe("Test error");
      expect(data.pagination.total).toBe(1);
      expect(data.stats.total24h).toBe(1);
    });

    it("should handle search filter", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.errorLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.errorLog.count).mockResolvedValue(0);
      vi.mocked(prisma.errorLog.groupBy).mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/admin/errors?search=TypeError",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.errorLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { message: { contains: "TypeError", mode: "insensitive" } },
            ]),
          }),
        }),
      );
    });

    it("should handle environment filter", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.errorLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.errorLog.count).mockResolvedValue(0);
      vi.mocked(prisma.errorLog.groupBy).mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/admin/errors?environment=FRONTEND",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.errorLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            environment: "FRONTEND",
          }),
        }),
      );
    });

    it("should handle sourceFile filter", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.errorLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.errorLog.count).mockResolvedValue(0);
      vi.mocked(prisma.errorLog.groupBy).mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/admin/errors?sourceFile=src/test.ts",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.errorLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sourceFile: { contains: "src/test.ts", mode: "insensitive" },
          }),
        }),
      );
    });

    it("should handle errorType filter", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.errorLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.errorLog.count).mockResolvedValue(0);
      vi.mocked(prisma.errorLog.groupBy).mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/admin/errors?errorType=TypeError",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.errorLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            errorType: { contains: "TypeError", mode: "insensitive" },
          }),
        }),
      );
    });

    it("should handle date range filters", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.errorLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.errorLog.count).mockResolvedValue(0);
      vi.mocked(prisma.errorLog.groupBy).mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/admin/errors?startDate=2025-01-01&endDate=2025-01-31",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.errorLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it("should return 500 if database query fails", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.errorLog.findMany).mockRejectedValue(
        new Error("Database error"),
      );
      vi.mocked(prisma.errorLog.count).mockRejectedValue(
        new Error("Database error"),
      );
      vi.mocked(prisma.errorLog.groupBy).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new Request("http://localhost/api/admin/errors");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should handle pagination", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.errorLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.errorLog.count).mockResolvedValue(100);
      vi.mocked(prisma.errorLog.groupBy).mockResolvedValue([]);

      const request = new Request(
        "http://localhost/api/admin/errors?page=2&limit=25",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(25);
      expect(prisma.errorLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25,
          take: 25,
        }),
      );
    });

    it("should return stats with error type and file groupings", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.errorLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.errorLog.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(5);
      vi.mocked(prisma.errorLog.groupBy)
        .mockResolvedValueOnce([
          { errorType: "TypeError", _count: { errorType: 3 } },
          { errorType: "Error", _count: { errorType: 2 } },
        ] as any)
        .mockResolvedValueOnce([
          { sourceFile: "src/test.ts", _count: { sourceFile: 5 } },
        ] as any);

      const request = new Request("http://localhost/api/admin/errors");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.totalByType).toEqual({
        TypeError: 3,
        Error: 2,
      });
      expect(data.stats.totalByFile).toEqual({
        "src/test.ts": 5,
      });
    });
  });

  describe("DELETE", () => {
    it("should delete all error logs", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.errorLog.deleteMany).mockResolvedValue({ count: 42 });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(42);
      expect(data.message).toBe("Deleted 42 error logs");
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 500 if auth throws an error", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth service unavailable"));

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 403 if admin check fails with Forbidden", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user_123" },
      } as any);
      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Forbidden");
    });

    it("should return 500 if admin check throws non-Forbidden error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user_123" },
      } as any);
      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 500 if deleteMany throws an error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);
      vi.mocked(prisma.errorLog.deleteMany).mockRejectedValue(
        new Error("Database error"),
      );

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should handle zero deleted records", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin_123" },
      } as any);

      vi.mocked(prisma.errorLog.deleteMany).mockResolvedValue({ count: 0 });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(0);
      expect(data.message).toBe("Deleted 0 error logs");
    });
  });
});
