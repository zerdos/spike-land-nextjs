/**
 * Tests for Admin Photos API Route
 */

import { JobStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const VALID_ADMIN_ID = "user_abc123def456abc123def456";
const VALID_USER_ID = "user_def456abc123def456abc123";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    enhancedImage: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;

const { requireAdminByUserId } = await import("@/lib/auth/admin-middleware");

describe("Admin Photos API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/photos");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return paginated photos with default limit", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(25);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
        {
          id: "img1",
          name: "test.jpg",
          originalUrl: "https://example.com/test.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSizeBytes: 1024000,
          originalFormat: "JPEG",
          createdAt: new Date("2025-01-01"),
          user: {
            id: VALID_USER_ID,
            name: "Test User",
            email: "test@example.com",
          },
          enhancementJobs: [{ status: JobStatus.COMPLETED }],
          _count: { enhancementJobs: 1 },
        },
      ] as any);

      const request = new NextRequest("http://localhost/api/admin/photos");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(1);
      expect(data.images[0].name).toBe("test.jpg");
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
      });
    });

    it("should filter photos by userId", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(5);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost/api/admin/photos?userId=${VALID_USER_ID}`,
      );

      await GET(request);

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: VALID_USER_ID },
        }),
      );
    });

    it("should filter photos by date range", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(5);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

      const startDate = "2025-01-01T00:00:00.000Z";
      const endDate = "2025-01-31T23:59:59.999Z";

      const request = new NextRequest(
        `http://localhost/api/admin/photos?startDate=${startDate}&endDate=${endDate}`,
      );

      await GET(request);

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
        }),
      );
    });

    it("should return 400 for invalid pagination parameters", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      const request = new NextRequest(
        "http://localhost/api/admin/photos?page=0",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid pagination parameters");
    });

    it("should return 400 for invalid userId format", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      const request = new NextRequest(
        "http://localhost/api/admin/photos?userId=invalid",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid user ID format");
    });

    it("should return 400 for invalid startDate", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      const request = new NextRequest(
        "http://localhost/api/admin/photos?startDate=invalid",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid startDate format");
    });

    it("should return 400 for invalid endDate", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      const request = new NextRequest(
        "http://localhost/api/admin/photos?endDate=invalid",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid endDate format");
    });

    it("should enforce max limit", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(200);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/photos?limit=200",
      );

      await GET(request);

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it("should handle page 2 correctly", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(50);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/admin/photos?page=2&limit=20",
      );

      await GET(request);

      expect(prisma.enhancedImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );
    });

    it("should return 403 if admin check fails", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Forbidden: Admin access required"),
      );

      const request = new NextRequest("http://localhost/api/admin/photos");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden: Admin access required");
    });

    it("should handle database count errors gracefully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.enhancedImage.count).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest("http://localhost/api/admin/photos");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should handle database findMany errors gracefully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(10);
      vi.mocked(prisma.enhancedImage.findMany).mockRejectedValue(
        new Error("Query failed"),
      );

      const request = new NextRequest("http://localhost/api/admin/photos");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should handle auth() throwing an error", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth service unavailable"));

      const request = new NextRequest("http://localhost/api/admin/photos");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should handle non-Forbidden admin check errors", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(requireAdminByUserId).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest("http://localhost/api/admin/photos");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return empty array when no photos found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(0);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/admin/photos");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images).toEqual([]);
      expect(data.pagination.total).toBe(0);
      expect(data.pagination.totalPages).toBe(0);
    });

    it("should include enhancement job status", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(1);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
        {
          id: "img1",
          name: "test.jpg",
          originalUrl: "https://example.com/test.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSizeBytes: 1024000,
          originalFormat: "JPEG",
          createdAt: new Date("2025-01-01"),
          user: {
            id: VALID_USER_ID,
            name: "Test User",
            email: "test@example.com",
          },
          enhancementJobs: [{ status: JobStatus.PROCESSING }],
          _count: { enhancementJobs: 3 },
        },
      ] as any);

      const request = new NextRequest("http://localhost/api/admin/photos");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images[0].latestJobStatus).toBe(JobStatus.PROCESSING);
      expect(data.images[0].enhancementCount).toBe(3);
    });

    it("should handle photos with no enhancement jobs", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.enhancedImage.count).mockResolvedValue(1);
      vi.mocked(prisma.enhancedImage.findMany).mockResolvedValue([
        {
          id: "img1",
          name: "test.jpg",
          originalUrl: "https://example.com/test.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSizeBytes: 1024000,
          originalFormat: "JPEG",
          createdAt: new Date("2025-01-01"),
          user: {
            id: VALID_USER_ID,
            name: "Test User",
            email: "test@example.com",
          },
          enhancementJobs: [],
          _count: { enhancementJobs: 0 },
        },
      ] as any);

      const request = new NextRequest("http://localhost/api/admin/photos");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images[0].latestJobStatus).toBeUndefined();
      expect(data.images[0].enhancementCount).toBe(0);
    });
  });
});
