import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mocks
const mockSession = {
  user: {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
    image: "https://example.com/avatar.jpg",
  },
};

vi.mock("@/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/lib/storage/upload-handler", () => ({
  processAndUploadImage: vi.fn().mockResolvedValue({
    success: true,
    url: "https://r2.dev/images/test.jpg",
    r2Key: "users/user-123/originals/test.jpg",
    width: 1920,
    height: 1080,
    sizeBytes: 1024000,
    format: "jpeg",
  }),
}));

vi.mock("@/lib/storage/r2-client", () => ({
  deleteFromR2: vi.fn().mockResolvedValue({
    success: true,
  }),
  uploadToR2: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    isLimited: false,
    resetAt: Date.now() + 60000,
  }),
  rateLimitConfigs: {
    imageUpload: { points: 10, duration: 60 },
  },
}));

vi.mock("@/lib/errors/error-messages", () => ({
  getUserFriendlyError: vi.fn((error: Error, statusCode?: number) => ({
    message: error.message,
    title: "Error",
    suggestion: "Please try again",
    statusCode: statusCode || 500,
  })),
}));

vi.mock("@/lib/errors/structured-logger", () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
  generateRequestId: vi.fn(() => "test-request-id"),
}));

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      user: {
        upsert: vi.fn().mockResolvedValue({
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          image: "https://example.com/avatar.jpg",
        }),
      },
      enhancedImage: {
        create: vi.fn().mockImplementation(({ data }) => {
          return Promise.resolve({
            id: `img-${data.name}`,
            userId: data.userId,
            name: data.name,
            originalUrl: data.originalUrl,
            originalR2Key: data.originalR2Key,
            originalWidth: data.originalWidth,
            originalHeight: data.originalHeight,
            originalSizeBytes: data.originalSizeBytes,
            originalFormat: data.originalFormat,
            isPublic: data.isPublic,
          });
        }),
      },
      $transaction: vi.fn().mockImplementation(async (operations) => {
        // Execute all operations in sequence for testing
        const results = [];
        for (const op of operations) {
          results.push(await op);
        }
        return results;
      }),
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Helper to create a mock file with arrayBuffer method
function createMockFile(name = "test.jpg", type = "image/jpeg", size = 1024) {
  const buffer = Buffer.from("test image content");
  return {
    name,
    type,
    size,
    arrayBuffer: () =>
      Promise.resolve(
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      ),
  };
}

// Mock file type
type MockFile = ReturnType<typeof createMockFile>;

// Helper to create a mock request with formData
function createMockRequest(files: MockFile[]): NextRequest {
  const req = new NextRequest("http://localhost/api/images/batch-upload", {
    method: "POST",
  });

  // Override formData method
  req.formData = vi.fn().mockResolvedValue({
    getAll: (key: string) => (key === "files" ? files : []),
  });

  return req;
}

describe("POST /api/images/batch-upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore transaction mock implementation after clearAllMocks
    mockPrisma.$transaction.mockImplementation(async (operations) => {
      const results = [];
      for (const op of operations) {
        results.push(await op);
      }
      return results;
    });
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce(null);

    const req = createMockRequest([createMockFile()]);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 401 if user id is missing in session", async () => {
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce({
      user: { name: "Test", email: "test@example.com" },
    });

    const req = createMockRequest([createMockFile()]);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if no files provided", async () => {
    const req = createMockRequest([]);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid input");
    expect(data.suggestion).toBe("Please provide files to upload.");
  });

  it("should return 400 if more than 20 files provided", async () => {
    const files = Array.from({ length: 21 }, (_, i) => createMockFile(`test${i}.jpg`));
    const req = createMockRequest(files);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid input");
    expect(data.suggestion).toContain("maximum of 20 files");
  });

  it("should return 400 if any file exceeds 10MB", async () => {
    const files = [
      createMockFile("test1.jpg", "image/jpeg", 5 * 1024 * 1024),
      createMockFile("test2.jpg", "image/jpeg", 11 * 1024 * 1024), // Too large
    ];
    const req = createMockRequest(files);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid input");
    expect(data.suggestion).toContain("test2.jpg");
    expect(data.suggestion).toContain("10MB");
  });

  it("should return 400 if total batch size exceeds 50MB", async () => {
    const files = [
      createMockFile("test1.jpg", "image/jpeg", 9 * 1024 * 1024),
      createMockFile("test2.jpg", "image/jpeg", 9 * 1024 * 1024),
      createMockFile("test3.jpg", "image/jpeg", 9 * 1024 * 1024),
      createMockFile("test4.jpg", "image/jpeg", 9 * 1024 * 1024),
      createMockFile("test5.jpg", "image/jpeg", 9 * 1024 * 1024),
      createMockFile("test6.jpg", "image/jpeg", 9 * 1024 * 1024), // 54MB total > 50MB
    ];
    const req = createMockRequest(files);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid input");
    expect(data.suggestion).toContain("50MB");
  });

  it("should upsert user before uploading images", async () => {
    const files = [createMockFile("test1.jpg"), createMockFile("test2.jpg")];
    const req = createMockRequest(files);
    await POST(req);

    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { id: "user-123" },
      update: {
        name: "Test User",
        email: "test@example.com",
        image: "https://example.com/avatar.jpg",
      },
      create: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        image: "https://example.com/avatar.jpg",
      },
    });
  });

  it("should upload multiple files successfully", async () => {
    const files = [
      createMockFile("test1.jpg"),
      createMockFile("test2.png"),
      createMockFile("test3.webp"),
    ];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results).toHaveLength(3);
    expect(data.summary.total).toBe(3);
    expect(data.summary.successful).toBe(3);
    expect(data.summary.failed).toBe(0);

    // Check each result
    expect(data.results[0].success).toBe(true);
    expect(data.results[0].filename).toBe("test1.jpg");
    expect(data.results[0].imageId).toBeDefined();
    expect(data.results[1].success).toBe(true);
    expect(data.results[1].filename).toBe("test2.png");
    expect(data.results[2].success).toBe(true);
    expect(data.results[2].filename).toBe("test3.webp");
  });

  it("should handle partial upload failure", async () => {
    const { processAndUploadImage } = await import("@/lib/storage/upload-handler");

    // First file succeeds, second fails DURING UPLOAD (before transaction)
    vi.mocked(processAndUploadImage)
      .mockResolvedValueOnce({
        success: true,
        url: "https://r2.dev/images/test1.jpg",
        r2Key: "users/user-123/originals/test1.jpg",
        width: 1920,
        height: 1080,
        sizeBytes: 1024000,
        format: "jpeg",
        imageId: "img-1",
      })
      .mockResolvedValueOnce({
        success: false,
        error: "Processing failed",
        url: "",
        r2Key: "",
        width: 0,
        height: 0,
        sizeBytes: 0,
        format: "",
        imageId: "",
      });

    const files = [createMockFile("test1.jpg"), createMockFile("test2.jpg")];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(2);
    // File 1: Successfully uploaded to R2 and saved to database
    expect(data.results[0].success).toBe(true);
    expect(data.results[0].errorType).toBeUndefined();
    // File 2: Failed during R2 upload, marked as upload error
    expect(data.results[1].success).toBe(false);
    expect(data.results[1].error).toBe("Processing failed");
    expect(data.results[1].errorType).toBe("upload");
    expect(data.summary.successful).toBe(1);
    expect(data.summary.failed).toBe(1);
  });

  it("should handle individual file processing error", async () => {
    const { processAndUploadImage } = await import("@/lib/storage/upload-handler");

    vi.mocked(processAndUploadImage)
      .mockResolvedValueOnce({
        success: true,
        url: "https://r2.dev/images/test1.jpg",
        r2Key: "users/user-123/originals/test1.jpg",
        width: 1920,
        height: 1080,
        sizeBytes: 1024000,
        format: "jpeg",
        imageId: "img-1",
      })
      .mockRejectedValueOnce(new Error("Network error"));

    const files = [createMockFile("test1.jpg"), createMockFile("test2.jpg")];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(2);
    expect(data.results[0].success).toBe(true);
    expect(data.results[1].success).toBe(false);
    expect(data.results[1].error).toBe("Network error");
    expect(data.results[1].errorType).toBe("unknown");
  });

  it("should handle database transaction failure", async () => {
    // Mock successful R2 uploads for both files
    const { processAndUploadImage } = await import("@/lib/storage/upload-handler");
    vi.mocked(processAndUploadImage).mockResolvedValue({
      success: true,
      url: "https://r2.dev/images/test.jpg",
      r2Key: "users/user-123/originals/test.jpg",
      width: 1920,
      height: 1080,
      sizeBytes: 1024000,
      format: "jpeg",
      imageId: "img-1",
    });

    // Mock database transaction failure
    mockPrisma.$transaction.mockRejectedValueOnce(new Error("Database error"));

    const files = [createMockFile("test1.jpg"), createMockFile("test2.jpg")];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(2);
    // Both files fail because transaction failed (even though R2 uploads succeeded)
    expect(data.results[0].success).toBe(false);
    expect(data.results[0].errorType).toBe("database");
    expect(data.results[1].success).toBe(false);
    expect(data.results[1].errorType).toBe("database");
    expect(data.summary.successful).toBe(0);
    expect(data.summary.failed).toBe(2);
  });

  it("should upload exactly 20 files successfully", async () => {
    const files = Array.from({ length: 20 }, (_, i) => createMockFile(`test${i}.jpg`));
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(20);
    expect(data.summary.total).toBe(20);
    expect(data.summary.successful).toBe(20);
  });

  it("should handle user upsert failure gracefully", async () => {
    mockPrisma.user.upsert.mockRejectedValueOnce(new Error("Database connection failed"));

    const files = [createMockFile("test1.jpg")];
    const req = createMockRequest(files);
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Database connection failed");
  });

  it("should return all metadata for successfully uploaded images", async () => {
    const files = [createMockFile("test1.jpg")];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results[0]).toEqual({
      success: true,
      filename: "test1.jpg",
      imageId: "img-test1.jpg",
      url: "https://r2.dev/images/test.jpg",
      width: 1920,
      height: 1080,
      size: 1024000,
      format: "jpeg",
    });
  });

  it("should handle all files failing", async () => {
    const { processAndUploadImage } = await import("@/lib/storage/upload-handler");

    vi.mocked(processAndUploadImage).mockResolvedValue({
      success: false,
      error: "Upload failed",
      url: "",
      r2Key: "",
      width: 0,
      height: 0,
      sizeBytes: 0,
      format: "",
      imageId: "",
    });

    const files = [createMockFile("test1.jpg"), createMockFile("test2.jpg")];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.successful).toBe(0);
    expect(data.summary.failed).toBe(2);
  });

  it("should sync user profile data on batch upload", async () => {
    const updatedSession = {
      user: {
        id: "user-123",
        name: "Updated Name",
        email: "updated@example.com",
        image: "https://example.com/new-avatar.jpg",
      },
    };
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce(updatedSession);

    const files = [createMockFile("test1.jpg")];
    const req = createMockRequest(files);
    await POST(req);

    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { id: "user-123" },
      update: {
        name: "Updated Name",
        email: "updated@example.com",
        image: "https://example.com/new-avatar.jpg",
      },
      create: {
        id: "user-123",
        name: "Updated Name",
        email: "updated@example.com",
        image: "https://example.com/new-avatar.jpg",
      },
    });
  });

  // TRANSACTIONAL SAFETY TESTS
  // Note: Transaction usage is verified implicitly by the rollback tests below

  it("should rollback R2 uploads when database transaction fails", async () => {
    const { deleteFromR2 } = await import("@/lib/storage/r2-client");

    // Mock successful R2 uploads
    const { processAndUploadImage } = await import("@/lib/storage/upload-handler");
    vi.mocked(processAndUploadImage)
      .mockResolvedValueOnce({
        success: true,
        url: "https://r2.dev/images/test1.jpg",
        r2Key: "users/user-123/originals/test1.jpg",
        width: 1920,
        height: 1080,
        sizeBytes: 1024000,
        format: "jpeg",
        imageId: "img-1",
      })
      .mockResolvedValueOnce({
        success: true,
        url: "https://r2.dev/images/test2.jpg",
        r2Key: "users/user-123/originals/test2.jpg",
        width: 1920,
        height: 1080,
        sizeBytes: 1024000,
        format: "jpeg",
        imageId: "img-2",
      });

    // Mock database transaction failure
    mockPrisma.$transaction.mockRejectedValueOnce(new Error("Database transaction failed"));

    const files = [createMockFile("test1.jpg"), createMockFile("test2.jpg")];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    // Verify R2 cleanup was called for both files
    expect(deleteFromR2).toHaveBeenCalledTimes(2);
    expect(deleteFromR2).toHaveBeenCalledWith("users/user-123/originals/test1.jpg");
    expect(deleteFromR2).toHaveBeenCalledWith("users/user-123/originals/test2.jpg");

    // Verify all results marked as failed
    expect(data.summary.successful).toBe(0);
    expect(data.summary.failed).toBe(2);
    expect(data.results[0].success).toBe(false);
    expect(data.results[0].errorType).toBe("database");
    expect(data.results[1].success).toBe(false);
    expect(data.results[1].errorType).toBe("database");
  });

  it("should handle R2 cleanup failure gracefully during rollback", async () => {
    const { deleteFromR2 } = await import("@/lib/storage/r2-client");

    // Mock successful R2 upload
    const { processAndUploadImage } = await import("@/lib/storage/upload-handler");
    vi.mocked(processAndUploadImage).mockResolvedValueOnce({
      success: true,
      url: "https://r2.dev/images/test1.jpg",
      r2Key: "users/user-123/originals/test1.jpg",
      width: 1920,
      height: 1080,
      sizeBytes: 1024000,
      format: "jpeg",
      imageId: "img-1",
    });

    // Mock database transaction failure
    mockPrisma.$transaction.mockRejectedValueOnce(new Error("Database error"));

    // Mock R2 cleanup failure
    vi.mocked(deleteFromR2).mockRejectedValueOnce(new Error("R2 cleanup failed"));

    const files = [createMockFile("test1.jpg")];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    // Should still return response even if cleanup fails
    expect(res.status).toBe(200);
    expect(data.summary.successful).toBe(0);
    expect(data.summary.failed).toBe(1);
    expect(data.results[0].errorType).toBe("database");
  });

  it("should categorize upload errors correctly", async () => {
    const { processAndUploadImage } = await import("@/lib/storage/upload-handler");

    // Mock R2 upload failure
    vi.mocked(processAndUploadImage).mockResolvedValueOnce({
      success: false,
      error: "R2 upload failed",
      url: "",
      r2Key: "",
      width: 0,
      height: 0,
      sizeBytes: 0,
      format: "",
      imageId: "",
    });

    const files = [createMockFile("test1.jpg")];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    expect(data.results[0].success).toBe(false);
    expect(data.results[0].errorType).toBe("upload");
    expect(data.results[0].error).toBe("R2 upload failed");
  });

  it("should handle mixed upload and database failures", async () => {
    const { processAndUploadImage } = await import("@/lib/storage/upload-handler");
    const { deleteFromR2 } = await import("@/lib/storage/r2-client");

    // First file: upload fails
    // Second file: upload succeeds
    // Third file: upload succeeds
    vi.mocked(processAndUploadImage)
      .mockResolvedValueOnce({
        success: false,
        error: "R2 upload failed",
        url: "",
        r2Key: "",
        width: 0,
        height: 0,
        sizeBytes: 0,
        format: "",
        imageId: "",
      })
      .mockResolvedValueOnce({
        success: true,
        url: "https://r2.dev/images/test2.jpg",
        r2Key: "users/user-123/originals/test2.jpg",
        width: 1920,
        height: 1080,
        sizeBytes: 1024000,
        format: "jpeg",
        imageId: "img-2",
      })
      .mockResolvedValueOnce({
        success: true,
        url: "https://r2.dev/images/test3.jpg",
        r2Key: "users/user-123/originals/test3.jpg",
        width: 1920,
        height: 1080,
        sizeBytes: 1024000,
        format: "jpeg",
        imageId: "img-3",
      });

    // Mock database transaction failure for the two successful uploads
    mockPrisma.$transaction.mockRejectedValueOnce(new Error("Database error"));

    const files = [
      createMockFile("test1.jpg"),
      createMockFile("test2.jpg"),
      createMockFile("test3.jpg"),
    ];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    // Verify R2 cleanup was only called for successfully uploaded files
    expect(deleteFromR2).toHaveBeenCalledTimes(2);
    expect(deleteFromR2).toHaveBeenCalledWith("users/user-123/originals/test2.jpg");
    expect(deleteFromR2).toHaveBeenCalledWith("users/user-123/originals/test3.jpg");

    // Verify results
    expect(data.summary.total).toBe(3);
    expect(data.summary.successful).toBe(0);
    expect(data.summary.failed).toBe(3);

    // File 1: upload error
    expect(data.results[0].filename).toBe("test1.jpg");
    expect(data.results[0].errorType).toBe("upload");

    // Files 2 & 3: database error
    expect(data.results[1].filename).toBe("test2.jpg");
    expect(data.results[1].errorType).toBe("database");
    expect(data.results[2].filename).toBe("test3.jpg");
    expect(data.results[2].errorType).toBe("database");
  });

  it("should not call transaction when all files fail upload", async () => {
    const { processAndUploadImage } = await import("@/lib/storage/upload-handler");

    // All uploads fail
    vi.mocked(processAndUploadImage).mockResolvedValue({
      success: false,
      error: "Upload failed",
      url: "",
      r2Key: "",
      width: 0,
      height: 0,
      sizeBytes: 0,
      format: "",
      imageId: "",
    });

    const files = [createMockFile("test1.jpg"), createMockFile("test2.jpg")];
    const req = createMockRequest(files);
    await POST(req);

    // Transaction should not be called
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("should return partial success when some files upload successfully after transaction failure", async () => {
    const { processAndUploadImage } = await import("@/lib/storage/upload-handler");

    // First batch: upload succeeds, transaction succeeds
    vi.mocked(processAndUploadImage)
      .mockResolvedValueOnce({
        success: true,
        url: "https://r2.dev/images/test1.jpg",
        r2Key: "users/user-123/originals/test1.jpg",
        width: 1920,
        height: 1080,
        sizeBytes: 1024000,
        format: "jpeg",
        imageId: "img-1",
      })
      .mockResolvedValueOnce({
        success: false,
        error: "Upload failed",
        url: "",
        r2Key: "",
        width: 0,
        height: 0,
        sizeBytes: 0,
        format: "",
        imageId: "",
      });

    const files = [createMockFile("test1.jpg"), createMockFile("test2.jpg")];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    // Should show partial success
    expect(data.success).toBe(true);
    expect(data.summary.successful).toBe(1);
    expect(data.summary.failed).toBe(1);
  });
});
