import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

type EnhancedImageWithJobs = EnhancedImage & {
  enhancementJobs: ImageEnhancementJob[];
};

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    enhancedImage: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  rateLimitConfigs: {
    general: {
      maxRequests: 100,
      windowMs: 60000,
    },
  },
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { checkRateLimit } = await import("@/lib/rate-limiter");

describe("GET /api/images/[id]/versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: false,
      remaining: 99,
      resetAt: Date.now() + 60000,
    });
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/images/img-1/versions",
    );
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 429 when rate limit is exceeded", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const resetAt = Date.now() + 60000;
    vi.mocked(checkRateLimit).mockResolvedValue({
      isLimited: true,
      remaining: 0,
      resetAt,
    });

    const request = new NextRequest(
      "http://localhost/api/images/img-1/versions",
    );
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("Too many requests");
    expect(data.resetAt).toBe(resetAt);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("X-RateLimit-Reset")).toBe(resetAt.toString());
  });

  it("should return 404 if image not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/images/img-1/versions",
    );
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Image not found");
  });

  it("should return 403 if user does not own private image", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-2", email: "other@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      name: "Test Image",
      description: null,
      originalUrl: "https://example.com/img.jpg",
      originalR2Key: "original.jpg",
      originalWidth: 1920,
      originalHeight: 1080,
      originalSizeBytes: 500000,
      originalFormat: "jpg",
      isPublic: false,
      viewCount: 0,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      enhancementJobs: [],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImageWithJobs,
    );

    const request = new NextRequest(
      "http://localhost/api/images/img-1/versions",
    );
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return versions for owned image", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      name: "Test Image",
      description: "A test image",
      originalUrl: "https://example.com/original.jpg",
      originalR2Key: "original.jpg",
      originalWidth: 1920,
      originalHeight: 1080,
      originalSizeBytes: 500000,
      originalFormat: "jpg",
      isPublic: false,
      viewCount: 5,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      enhancementJobs: [
        {
          id: "job-1",
          imageId: "img-1",
          userId: "user-1",
          tier: "TIER_1K",
          tokensCost: 5,
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-1k.jpg",
          enhancedR2Key: "enhanced-1k.jpg",
          enhancedWidth: 1000,
          enhancedHeight: 750,
          enhancedSizeBytes: 300000,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          geminiPrompt: null,
          processingStartedAt: new Date("2024-01-01T10:00:00Z"),
          processingCompletedAt: new Date("2024-01-01T10:00:15Z"),
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:00:15Z"),
        },
        {
          id: "job-2",
          imageId: "img-1",
          userId: "user-1",
          tier: "TIER_2K",
          tokensCost: 10,
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-2k.jpg",
          enhancedR2Key: "enhanced-2k.jpg",
          enhancedWidth: 2000,
          enhancedHeight: 1500,
          enhancedSizeBytes: 600000,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          geminiPrompt: null,
          processingStartedAt: new Date("2024-01-01T11:00:00Z"),
          processingCompletedAt: new Date("2024-01-01T11:00:20Z"),
          createdAt: new Date("2024-01-01T11:00:00Z"),
          updatedAt: new Date("2024-01-01T11:00:20Z"),
        },
      ],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as unknown as EnhancedImageWithJobs,
    );

    const request = new NextRequest(
      "http://localhost/api/images/img-1/versions",
    );
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.imageId).toBe("img-1");
    expect(data.imageName).toBe("Test Image");
    expect(data.originalUrl).toBe("https://example.com/original.jpg");
    expect(data.versions).toHaveLength(2);

    // Verify first version
    expect(data.versions[0].jobId).toBe("job-1");
    expect(data.versions[0].tier).toBe("TIER_1K");
    expect(data.versions[0].status).toBe("COMPLETED");
    expect(data.versions[0].resultUrl).toBe(
      "https://example.com/enhanced-1k.jpg",
    );
    expect(data.versions[0].tokensSpent).toBe(5);
    expect(data.versions[0].processingTimeMs).toBe(15000);
    expect(data.versions[0].width).toBe(1000);
    expect(data.versions[0].height).toBe(750);
    expect(data.versions[0].sizeBytes).toBe(300000);

    // Verify second version
    expect(data.versions[1].jobId).toBe("job-2");
    expect(data.versions[1].tier).toBe("TIER_2K");
    expect(data.versions[1].processingTimeMs).toBe(20000);

    // Verify rate limit headers
    expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("99");
    expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("should return public image versions for any authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-2", email: "other@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      name: "Public Image",
      description: null,
      originalUrl: "https://example.com/public.jpg",
      originalR2Key: "public.jpg",
      originalWidth: 1920,
      originalHeight: 1080,
      originalSizeBytes: 500000,
      originalFormat: "jpg",
      isPublic: true,
      viewCount: 100,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      enhancementJobs: [
        {
          id: "job-1",
          imageId: "img-1",
          userId: "user-1",
          tier: "TIER_4K",
          tokensCost: 20,
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-4k.jpg",
          enhancedR2Key: "enhanced-4k.jpg",
          enhancedWidth: 4000,
          enhancedHeight: 3000,
          enhancedSizeBytes: 1200000,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          geminiPrompt: null,
          processingStartedAt: new Date("2024-01-01T12:00:00Z"),
          processingCompletedAt: new Date("2024-01-01T12:00:30Z"),
          createdAt: new Date("2024-01-01T12:00:00Z"),
          updatedAt: new Date("2024-01-01T12:00:30Z"),
        },
      ],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as unknown as EnhancedImageWithJobs,
    );

    const request = new NextRequest(
      "http://localhost/api/images/img-1/versions",
    );
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.versions).toHaveLength(1);
    expect(data.versions[0].tier).toBe("TIER_4K");
  });

  it("should filter out non-completed jobs", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      name: "Test Image",
      description: null,
      originalUrl: "https://example.com/original.jpg",
      originalR2Key: "original.jpg",
      originalWidth: 1920,
      originalHeight: 1080,
      originalSizeBytes: 500000,
      originalFormat: "jpg",
      isPublic: false,
      viewCount: 0,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      enhancementJobs: [
        {
          id: "job-1",
          imageId: "img-1",
          userId: "user-1",
          tier: "TIER_1K",
          tokensCost: 5,
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-1k.jpg",
          enhancedR2Key: "enhanced-1k.jpg",
          enhancedWidth: 1000,
          enhancedHeight: 750,
          enhancedSizeBytes: 300000,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          geminiPrompt: null,
          processingStartedAt: new Date("2024-01-01T10:00:00Z"),
          processingCompletedAt: new Date("2024-01-01T10:00:15Z"),
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:00:15Z"),
        },
        {
          id: "job-2",
          imageId: "img-1",
          userId: "user-1",
          tier: "TIER_2K",
          tokensCost: 10,
          status: "PENDING",
          enhancedUrl: null,
          enhancedR2Key: null,
          enhancedWidth: null,
          enhancedHeight: null,
          enhancedSizeBytes: null,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          geminiPrompt: null,
          processingStartedAt: null,
          processingCompletedAt: null,
          createdAt: new Date("2024-01-01T11:00:00Z"),
          updatedAt: new Date("2024-01-01T11:00:00Z"),
        },
        {
          id: "job-3",
          imageId: "img-1",
          userId: "user-1",
          tier: "TIER_4K",
          tokensCost: 20,
          status: "FAILED",
          enhancedUrl: null,
          enhancedR2Key: null,
          enhancedWidth: null,
          enhancedHeight: null,
          enhancedSizeBytes: null,
          errorMessage: "Processing failed",
          retryCount: 3,
          maxRetries: 3,
          geminiPrompt: null,
          processingStartedAt: new Date("2024-01-01T12:00:00Z"),
          processingCompletedAt: null,
          createdAt: new Date("2024-01-01T12:00:00Z"),
          updatedAt: new Date("2024-01-01T12:00:05Z"),
        },
      ],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as unknown as EnhancedImageWithJobs,
    );

    const request = new NextRequest(
      "http://localhost/api/images/img-1/versions",
    );
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.versions).toHaveLength(1);
    expect(data.versions[0].jobId).toBe("job-1");
    expect(data.versions[0].status).toBe("COMPLETED");
  });

  it("should handle jobs with null processing times", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      name: "Test Image",
      description: null,
      originalUrl: "https://example.com/original.jpg",
      originalR2Key: "original.jpg",
      originalWidth: 1920,
      originalHeight: 1080,
      originalSizeBytes: 500000,
      originalFormat: "jpg",
      isPublic: false,
      viewCount: 0,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      enhancementJobs: [
        {
          id: "job-1",
          imageId: "img-1",
          userId: "user-1",
          tier: "TIER_1K",
          tokensCost: 5,
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-1k.jpg",
          enhancedR2Key: "enhanced-1k.jpg",
          enhancedWidth: 1000,
          enhancedHeight: 750,
          enhancedSizeBytes: 300000,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          geminiPrompt: null,
          processingStartedAt: null,
          processingCompletedAt: null,
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-01T10:00:15Z"),
        },
      ],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as unknown as EnhancedImageWithJobs,
    );

    const request = new NextRequest(
      "http://localhost/api/images/img-1/versions",
    );
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.versions[0].processingTimeMs).toBeNull();
  });

  it("should return empty versions array if no completed jobs", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      name: "Test Image",
      description: null,
      originalUrl: "https://example.com/original.jpg",
      originalR2Key: "original.jpg",
      originalWidth: 1920,
      originalHeight: 1080,
      originalSizeBytes: 500000,
      originalFormat: "jpg",
      isPublic: false,
      viewCount: 0,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      enhancementJobs: [],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImageWithJobs,
    );

    const request = new NextRequest(
      "http://localhost/api/images/img-1/versions",
    );
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.versions).toEqual([]);
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.enhancedImage.findUnique).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new NextRequest(
      "http://localhost/api/images/img-1/versions",
    );
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database connection failed");
  });
});
