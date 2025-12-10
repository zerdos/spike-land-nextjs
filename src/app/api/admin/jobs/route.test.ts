/**
 * Tests for Admin Jobs API Route
 */

import { EnhancementTier, JobStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const VALID_ADMIN_ID = "user_admin123456789012345678";
const VALID_USER_ID = "user_test12345678901234567890";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    imageEnhancementJob: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/admin-middleware", () => ({
  isAdminByUserId: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { isAdminByUserId } = await import("@/lib/auth/admin-middleware");

const mockJob = {
  id: "job_12345678901234567890123",
  imageId: "img_12345678901234567890123",
  userId: VALID_USER_ID,
  tier: "TIER_4K" as EnhancementTier,
  tokensCost: 10,
  status: "COMPLETED" as JobStatus,
  enhancedUrl: "https://example.com/enhanced.jpg",
  enhancedR2Key: "enhanced/test/job_12345.jpg",
  enhancedWidth: 4096,
  enhancedHeight: 2304,
  enhancedSizeBytes: 5000000,
  errorMessage: null,
  retryCount: 0,
  maxRetries: 3,
  geminiPrompt: "Enhance this image",
  geminiModel: "gemini-3-pro-image-preview",
  geminiTemp: null,
  processingStartedAt: new Date("2025-01-01T10:00:00Z"),
  processingCompletedAt: new Date("2025-01-01T10:00:12Z"),
  createdAt: new Date("2025-01-01T09:59:50Z"),
  updatedAt: new Date("2025-01-01T10:00:12Z"),
  workflowRunId: "workflow_123",
  image: {
    id: "img_12345678901234567890123",
    name: "vacation.jpg",
    originalUrl: "https://example.com/original.jpg",
    originalWidth: 1920,
    originalHeight: 1080,
    originalSizeBytes: 2000000,
  },
  user: {
    id: VALID_USER_ID,
    name: "Test User",
    email: "test@example.com",
  },
};

describe("Admin Jobs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(isAdminByUserId).mockResolvedValue(true);
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/jobs");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_USER_ID },
      } as any);
      vi.mocked(isAdminByUserId).mockResolvedValue(false);

      const request = new NextRequest("http://localhost/api/admin/jobs");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return paginated jobs with default parameters", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([mockJob] as any);
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(1);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([
        { status: "COMPLETED", _count: { status: 1 } },
        { status: "PENDING", _count: { status: 2 } },
      ] as any);

      const request = new NextRequest("http://localhost/api/admin/jobs");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].id).toBe(mockJob.id);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(data.statusCounts).toEqual({
        ALL: 3,
        COMPLETED: 1,
        PENDING: 2,
      });
    });

    it("should filter by status", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([mockJob] as any);
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(1);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([
        { status: "COMPLETED", _count: { status: 1 } },
      ] as any);

      const request = new NextRequest("http://localhost/api/admin/jobs?status=COMPLETED");
      const response = await GET(request);
      await response.json();

      expect(response.status).toBe(200);
      expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "COMPLETED" },
        }),
      );
    });

    it("should return 400 for invalid status", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/jobs?status=INVALID");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid status");
    });

    it("should handle pagination parameters", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(100);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/admin/jobs?page=3&limit=10");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(data.pagination.page).toBe(3);
      expect(data.pagination.limit).toBe(10);
    });

    it("should cap limit at 50", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(0);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/admin/jobs?limit=100");
      const response = await GET(request);
      await response.json();

      expect(response.status).toBe(200);
      expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it("should handle search by job ID", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([mockJob] as any);
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(1);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/admin/jobs?search=job_123");
      const response = await GET(request);
      await response.json();

      expect(response.status).toBe(200);
      expect(prisma.imageEnhancementJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { id: { contains: "job_123" } },
              { user: { email: { contains: "job_123", mode: "insensitive" } } },
            ],
          },
        }),
      );
    });

    it("should include job relations in response", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue([mockJob] as any);
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(1);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/admin/jobs");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs[0].image).toBeDefined();
      expect(data.jobs[0].image.name).toBe("vacation.jpg");
      expect(data.jobs[0].user).toBeDefined();
      expect(data.jobs[0].user.email).toBe("test@example.com");
    });

    it("should handle database errors", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: VALID_ADMIN_ID },
      } as any);

      vi.mocked(prisma.imageEnhancementJob.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest("http://localhost/api/admin/jobs");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
