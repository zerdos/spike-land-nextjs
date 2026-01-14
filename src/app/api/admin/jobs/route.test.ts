/**
 * Tests for Admin Jobs API Route
 */

import { createMockSession } from "@/test-utils";
import type { ImageEnhancementJob } from "@prisma/client";
import type { EnhancementTier, JobStatus } from "@prisma/client";
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
    mcpGenerationJob: {
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

/**
 * Type for ImageEnhancementJob with included relations (image and user).
 * This matches what Prisma returns when using include.
 */
type ImageEnhancementJobWithRelations = ImageEnhancementJob & {
  image: {
    id: string;
    name: string;
    originalUrl: string;
    originalWidth: number;
    originalHeight: number;
    originalSizeBytes: number;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

/**
 * Type for groupBy results - only includes status and _count.
 */
type StatusGroupByResult = {
  status: JobStatus;
  _count: { status: number; };
};

/**
 * Creates a mock ImageEnhancementJob with all required fields.
 */
function createMockEnhancementJob(
  overrides: Partial<ImageEnhancementJobWithRelations> = {},
): ImageEnhancementJobWithRelations {
  return {
    id: "job_12345678901234567890123",
    imageId: "img_12345678901234567890123",
    userId: VALID_USER_ID,
    tier: "TIER_4K" as EnhancementTier,
    tokensCost: 10,
    status: "COMPLETED" as JobStatus,
    currentStage: null,
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
    pipelineId: null,
    analysisResult: null,
    analysisSource: null,
    wasCropped: false,
    cropDimensions: null,
    sourceImageId: null,
    isBlend: false,
    isAnonymous: false,
    altText: null,
    qualityScore: null,
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
    ...overrides,
  };
}

const mockJob = createMockEnhancementJob();

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

    it("should return 500 if auth throws an error", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth service unavailable"));

      const request = new NextRequest("http://localhost/api/admin/jobs");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return 403 if not admin", async () => {
      vi.mocked(auth).mockResolvedValue(
        createMockSession({ id: VALID_USER_ID }),
      );
      vi.mocked(isAdminByUserId).mockResolvedValue(false);

      const request = new NextRequest("http://localhost/api/admin/jobs");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 500 if admin check throws an error", async () => {
      vi.mocked(auth).mockResolvedValue(
        createMockSession({ id: VALID_USER_ID }),
      );
      vi.mocked(isAdminByUserId).mockRejectedValue(
        new Error("Database connection lost"),
      );

      const request = new NextRequest("http://localhost/api/admin/jobs");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return paginated jobs with default parameters", async () => {
      vi.mocked(auth).mockResolvedValue(
        createMockSession({ id: VALID_ADMIN_ID, role: "ADMIN" }),
      );

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(
        [mockJob],
      );
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(1);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([
        { status: "COMPLETED" as JobStatus, _count: { status: 1 } },
        { status: "PENDING" as JobStatus, _count: { status: 2 } },
      ] as StatusGroupByResult[] as never);
      vi.mocked(prisma.mcpGenerationJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mcpGenerationJob.count).mockResolvedValue(0);
      vi.mocked(prisma.mcpGenerationJob.groupBy).mockResolvedValue(
        [] as StatusGroupByResult[] as never,
      );

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
      vi.mocked(auth).mockResolvedValue(
        createMockSession({ id: VALID_ADMIN_ID, role: "ADMIN" }),
      );

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(
        [mockJob],
      );
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(1);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue([
        { status: "COMPLETED" as JobStatus, _count: { status: 1 } },
      ] as StatusGroupByResult[] as never);
      vi.mocked(prisma.mcpGenerationJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mcpGenerationJob.count).mockResolvedValue(0);
      vi.mocked(prisma.mcpGenerationJob.groupBy).mockResolvedValue(
        [] as StatusGroupByResult[] as never,
      );

      const request = new NextRequest(
        "http://localhost/api/admin/jobs?status=COMPLETED",
      );
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
      vi.mocked(auth).mockResolvedValue(
        createMockSession({ id: VALID_ADMIN_ID, role: "ADMIN" }),
      );

      const request = new NextRequest(
        "http://localhost/api/admin/jobs?status=INVALID",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid status");
    });

    it("should handle pagination parameters", async () => {
      vi.mocked(auth).mockResolvedValue(
        createMockSession({ id: VALID_ADMIN_ID, role: "ADMIN" }),
      );

      // Create 25 mock jobs to test pagination
      const mockJobs = Array.from(
        { length: 25 },
        (_, i) =>
          createMockEnhancementJob({
            id: `job_${String(i).padStart(24, "0")}`,
            createdAt: new Date(
              `2025-01-01T${String(i).padStart(2, "0")}:00:00Z`,
            ),
          }),
      );

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(
        mockJobs,
      );
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(25);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue(
        [] as StatusGroupByResult[] as never,
      );
      vi.mocked(prisma.mcpGenerationJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mcpGenerationJob.count).mockResolvedValue(0);
      vi.mocked(prisma.mcpGenerationJob.groupBy).mockResolvedValue(
        [] as StatusGroupByResult[] as never,
      );

      const request = new NextRequest(
        "http://localhost/api/admin/jobs?page=3&limit=10",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Pagination is now applied in memory after fetching all jobs
      expect(data.pagination.page).toBe(3);
      expect(data.pagination.limit).toBe(10);
      // Page 3 with 25 items and limit 10 should return 5 items (items 21-25)
      expect(data.jobs).toHaveLength(5);
    });

    it("should cap limit at 50", async () => {
      vi.mocked(auth).mockResolvedValue(
        createMockSession({ id: VALID_ADMIN_ID, role: "ADMIN" }),
      );

      // Create 60 mock jobs to test limit capping
      const mockJobs = Array.from(
        { length: 60 },
        (_, i) =>
          createMockEnhancementJob({
            id: `job_${String(i).padStart(24, "0")}`,
            createdAt: new Date(Date.now() - i * 60000), // Each job 1 minute apart
            updatedAt: new Date(Date.now() - i * 60000),
          }),
      );

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(
        mockJobs,
      );
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(60);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue(
        [] as StatusGroupByResult[] as never,
      );
      vi.mocked(prisma.mcpGenerationJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mcpGenerationJob.count).mockResolvedValue(0);
      vi.mocked(prisma.mcpGenerationJob.groupBy).mockResolvedValue(
        [] as StatusGroupByResult[] as never,
      );

      const request = new NextRequest(
        "http://localhost/api/admin/jobs?limit=100",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Limit should be capped at 50 and applied during pagination
      expect(data.pagination.limit).toBe(50);
      expect(data.jobs).toHaveLength(50);
    });

    it("should handle search by job ID", async () => {
      vi.mocked(auth).mockResolvedValue(
        createMockSession({ id: VALID_ADMIN_ID, role: "ADMIN" }),
      );

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(
        [mockJob],
      );
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(1);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue(
        [] as StatusGroupByResult[] as never,
      );
      vi.mocked(prisma.mcpGenerationJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mcpGenerationJob.count).mockResolvedValue(0);
      vi.mocked(prisma.mcpGenerationJob.groupBy).mockResolvedValue(
        [] as StatusGroupByResult[] as never,
      );

      const request = new NextRequest(
        "http://localhost/api/admin/jobs?search=job_123",
      );
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
      vi.mocked(auth).mockResolvedValue(
        createMockSession({ id: VALID_ADMIN_ID, role: "ADMIN" }),
      );

      vi.mocked(prisma.imageEnhancementJob.findMany).mockResolvedValue(
        [mockJob],
      );
      vi.mocked(prisma.imageEnhancementJob.count).mockResolvedValue(1);
      vi.mocked(prisma.imageEnhancementJob.groupBy).mockResolvedValue(
        [] as StatusGroupByResult[] as never,
      );
      vi.mocked(prisma.mcpGenerationJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mcpGenerationJob.count).mockResolvedValue(0);
      vi.mocked(prisma.mcpGenerationJob.groupBy).mockResolvedValue(
        [] as StatusGroupByResult[] as never,
      );

      const request = new NextRequest("http://localhost/api/admin/jobs");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Jobs are now transformed to unified format with flattened fields
      expect(data.jobs[0].imageName).toBe("vacation.jpg");
      expect(data.jobs[0].userEmail).toBe("test@example.com");
      expect(data.jobs[0].userName).toBe("Test User");
      expect(data.jobs[0].source).toBe("enhancement");
    });

    it("should handle database errors", async () => {
      vi.mocked(auth).mockResolvedValue(
        createMockSession({ id: VALID_ADMIN_ID, role: "ADMIN" }),
      );

      vi.mocked(prisma.imageEnhancementJob.findMany).mockRejectedValue(
        new Error("Database connection failed"),
      );
      vi.mocked(prisma.mcpGenerationJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.mcpGenerationJob.count).mockResolvedValue(0);
      vi.mocked(prisma.mcpGenerationJob.groupBy).mockResolvedValue(
        [] as StatusGroupByResult[] as never,
      );

      const request = new NextRequest("http://localhost/api/admin/jobs");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
