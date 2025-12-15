import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "./route";

// Type for EnhancedImage with jobs relation
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
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/storage/r2-client", () => ({
  deleteFromR2: vi.fn(),
}));

const { auth } = await import("@/auth");
const prisma = (await import("@/lib/prisma")).default;
const { deleteFromR2 } = await import("@/lib/storage/r2-client");

describe("GET /api/images/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/images/img-1");
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if image not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/images/img-1");
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
      description: "A test image",
      originalUrl: "https://example.com/img.jpg",
      originalR2Key: "original.jpg",
      originalWidth: 1920,
      originalHeight: 1080,
      originalSizeBytes: 500000,
      originalFormat: "jpg",
      isPublic: false,
      viewCount: 5,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      enhancementJobs: [],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImageWithJobs,
    );

    const request = new NextRequest("http://localhost/api/images/img-1");
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return image if user owns it", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      name: "Test Image",
      description: "A test image",
      originalUrl: "https://example.com/img.jpg",
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
          tokensCost: 10,
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced.jpg",
          enhancedR2Key: "enhanced.jpg",
          enhancedWidth: 1920,
          enhancedHeight: 1080,
          enhancedSizeBytes: 600000,
          errorMessage: null,
          retryCount: 0,
          maxRetries: 3,
          geminiPrompt: null,
          processingStartedAt: new Date("2024-01-01"),
          processingCompletedAt: new Date("2024-01-01"),
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImageWithJobs,
    );

    const request = new NextRequest("http://localhost/api/images/img-1");
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.image.id).toBe("img-1");
    expect(data.image.name).toBe("Test Image");
    expect(data.image.jobs).toHaveLength(1);
    expect(data.image.jobs[0].id).toBe("job-1");
  });

  it("should return public image for any authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-2", email: "other@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      name: "Public Image",
      description: "A public image",
      originalUrl: "https://example.com/public.jpg",
      originalR2Key: "public.jpg",
      originalWidth: 1920,
      originalHeight: 1080,
      originalSizeBytes: 500000,
      originalFormat: "jpg",
      isPublic: true,
      viewCount: 100,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      enhancementJobs: [],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImageWithJobs,
    );

    const request = new NextRequest("http://localhost/api/images/img-1");
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.image.isPublic).toBe(true);
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.enhancedImage.findUnique).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new NextRequest("http://localhost/api/images/img-1");
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database connection failed");
  });
});

describe("DELETE /api/images/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/images/img-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if image not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/images/img-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Image not found");
  });

  it("should return 403 if user does not own image", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-2", email: "other@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      originalR2Key: "original.jpg",
      enhancementJobs: [],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImageWithJobs,
    );

    const request = new NextRequest("http://localhost/api/images/img-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should delete image and cleanup R2 files successfully", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      originalR2Key: "original.jpg",
      enhancementJobs: [
        {
          id: "job-1",
          enhancedR2Key: "enhanced-1k.jpg",
        },
        {
          id: "job-2",
          enhancedR2Key: "enhanced-2k.jpg",
        },
      ],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImageWithJobs,
    );

    vi.mocked(prisma.enhancedImage.delete).mockResolvedValue(
      mockImage as EnhancedImage,
    );

    vi.mocked(deleteFromR2).mockResolvedValue({
      success: true,
      key: "test-key",
    });

    const request = new NextRequest("http://localhost/api/images/img-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Image deleted successfully");

    // Verify R2 cleanup was called for original + 2 enhanced images
    expect(deleteFromR2).toHaveBeenCalledTimes(3);
    expect(deleteFromR2).toHaveBeenCalledWith("original.jpg");
    expect(deleteFromR2).toHaveBeenCalledWith("enhanced-1k.jpg");
    expect(deleteFromR2).toHaveBeenCalledWith("enhanced-2k.jpg");

    // Verify database deletion was called
    expect(prisma.enhancedImage.delete).toHaveBeenCalledWith({
      where: { id: "img-1" },
    });
  });

  it("should handle jobs with null enhancedR2Key", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      originalR2Key: "original.jpg",
      enhancementJobs: [
        {
          id: "job-1",
          enhancedR2Key: null, // Job not completed yet
        },
        {
          id: "job-2",
          enhancedR2Key: "enhanced-2k.jpg",
        },
      ],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImageWithJobs,
    );

    vi.mocked(prisma.enhancedImage.delete).mockResolvedValue(
      mockImage as EnhancedImage,
    );

    vi.mocked(deleteFromR2).mockResolvedValue({
      success: true,
      key: "test-key",
    });

    const request = new NextRequest("http://localhost/api/images/img-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Only original + 1 enhanced image (job-2) should be deleted
    expect(deleteFromR2).toHaveBeenCalledTimes(2);
    expect(deleteFromR2).toHaveBeenCalledWith("original.jpg");
    expect(deleteFromR2).toHaveBeenCalledWith("enhanced-2k.jpg");
  });

  it("should return 500 if R2 deletion fails (transactional rollback)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      originalR2Key: "original.jpg",
      enhancementJobs: [],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImageWithJobs,
    );

    // R2 deletion fails
    vi.mocked(deleteFromR2).mockResolvedValue({
      success: false,
      key: "original.jpg",
      error: "R2 service unavailable",
    });

    const request = new NextRequest("http://localhost/api/images/img-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    // Should return 500 when R2 deletion fails
    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to delete R2 files");
    expect(data.error).toContain("original.jpg");
    expect(data.error).toContain("R2 service unavailable");

    // Verify database deletion was NOT called (transactional rollback)
    expect(prisma.enhancedImage.delete).not.toHaveBeenCalled();
  });

  it("should return 500 if R2 deletion partially fails", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    const mockImage = {
      id: "img-1",
      userId: "user-1",
      originalR2Key: "original.jpg",
      enhancementJobs: [
        {
          id: "job-1",
          enhancedR2Key: "enhanced-1k.jpg",
        },
        {
          id: "job-2",
          enhancedR2Key: "enhanced-2k.jpg",
        },
      ],
    };

    vi.mocked(prisma.enhancedImage.findUnique).mockResolvedValue(
      mockImage as EnhancedImageWithJobs,
    );

    // First deletion succeeds, second and third fail
    vi.mocked(deleteFromR2)
      .mockResolvedValueOnce({
        success: true,
        key: "original.jpg",
      })
      .mockResolvedValueOnce({
        success: false,
        key: "enhanced-1k.jpg",
        error: "Network timeout",
      })
      .mockResolvedValueOnce({
        success: false,
        key: "enhanced-2k.jpg",
        error: "Access denied",
      });

    const request = new NextRequest("http://localhost/api/images/img-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    // Should return 500 when any R2 deletion fails
    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to delete R2 files");
    expect(data.error).toContain("enhanced-1k.jpg");
    expect(data.error).toContain("Network timeout");
    expect(data.error).toContain("enhanced-2k.jpg");
    expect(data.error).toContain("Access denied");

    // Verify database deletion was NOT called (transactional rollback)
    expect(prisma.enhancedImage.delete).not.toHaveBeenCalled();
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as Session);

    vi.mocked(prisma.enhancedImage.findUnique).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new NextRequest("http://localhost/api/images/img-1", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "img-1" }) };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database connection failed");
  });
});
