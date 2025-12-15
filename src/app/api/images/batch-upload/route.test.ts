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

// Hoist mocks that need to be referenced before vi.mock
const { mockTokenBalanceManager, mockPrisma } = vi.hoisted(() => {
  type CreateData = {
    name: string;
    userId: string;
    originalUrl: string;
    originalR2Key: string;
    originalWidth: number;
    originalHeight: number;
    originalSizeBytes: number;
    originalFormat: string;
    isPublic: boolean;
  };

  return {
    mockTokenBalanceManager: {
      getBalance: vi.fn().mockResolvedValue({ balance: 100 }),
      consumeTokens: vi.fn().mockResolvedValue({ success: true }),
      addTokens: vi.fn().mockResolvedValue({ success: true }),
    },
    mockPrisma: {
      user: {
        upsert: vi.fn().mockResolvedValue({
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          image: "https://example.com/avatar.jpg",
        }),
      },
      album: {
        findUnique: vi.fn().mockResolvedValue({
          id: "album-123",
          userId: "user-123",
          defaultTier: "TIER_1K",
        }),
      },
      enhancedImage: {
        create: vi.fn().mockImplementation(({ data }: { data: CreateData; }) => {
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
      albumImage: {
        create: vi.fn().mockResolvedValue({}),
        aggregate: vi.fn().mockResolvedValue({ _max: { sortOrder: 0 } }),
      },
      imageEnhancementJob: {
        create: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn().mockImplementation(async (callback: unknown) => {
        if (typeof callback === "function") {
          const mockTx = {
            enhancedImage: {
              create: vi.fn().mockImplementation(
                ({ data }: { data: CreateData; }) => {
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
                },
              ),
            },
            albumImage: {
              create: vi.fn().mockResolvedValue({}),
              aggregate: vi.fn().mockResolvedValue({ _max: { sortOrder: 0 } }),
            },
            imageEnhancementJob: {
              create: vi.fn().mockResolvedValue({}),
            },
          };
          return callback(mockTx);
        }
        const results = [];
        for (const op of callback as Promise<unknown>[]) {
          results.push(await op);
        }
        return results;
      }),
    },
  };
});

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: mockTokenBalanceManager,
}));

vi.mock("@/lib/tokens/costs", () => ({
  ENHANCEMENT_COSTS: {
    TIER_1K: 1,
    TIER_2K: 2,
    TIER_4K: 5,
  },
  EnhancementTier: {
    TIER_1K: "TIER_1K",
    TIER_2K: "TIER_2K",
    TIER_4K: "TIER_4K",
  },
}));

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
        buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ),
      ),
  };
}

type MockFile = ReturnType<typeof createMockFile>;

// Helper to create a mock request with formData including albumId
function createMockRequest(
  files: MockFile[],
  albumId = "album-123",
): NextRequest {
  const req = new NextRequest("http://localhost/api/images/batch-upload", {
    method: "POST",
  });

  req.formData = vi.fn().mockResolvedValue({
    getAll: (key: string) => (key === "files" ? files : []),
    get: (key: string) => (key === "albumId" ? albumId : null),
  });

  return req;
}

describe("POST /api/images/batch-upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTokenBalanceManager.getBalance.mockResolvedValue({ balance: 100 });
    mockTokenBalanceManager.consumeTokens.mockResolvedValue({ success: true });
    mockPrisma.album.findUnique.mockResolvedValue({
      id: "album-123",
      userId: "user-123",
      defaultTier: "TIER_1K",
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

  it("should return 400 if no albumId provided", async () => {
    const req = new NextRequest("http://localhost/api/images/batch-upload", {
      method: "POST",
    });
    req.formData = vi.fn().mockResolvedValue({
      getAll: () => [createMockFile()],
      get: () => null,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Album selection is required for upload.");
  });

  it("should return 404 if album not found", async () => {
    mockPrisma.album.findUnique.mockResolvedValueOnce(null);

    const req = createMockRequest([createMockFile()]);
    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Album not found or access denied.");
  });

  it("should return 404 if album belongs to different user", async () => {
    mockPrisma.album.findUnique.mockResolvedValueOnce({
      id: "album-123",
      userId: "different-user",
      defaultTier: "TIER_1K",
    });

    const req = createMockRequest([createMockFile()]);
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("should return 402 if insufficient token balance", async () => {
    mockTokenBalanceManager.getBalance.mockResolvedValueOnce({ balance: 0 });

    const req = createMockRequest([createMockFile()]);
    const res = await POST(req);
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.error).toContain("Insufficient tokens");
  });

  it("should return 400 if no files provided", async () => {
    const req = createMockRequest([]);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.suggestion).toBe("Please provide files to upload.");
  });

  it("should return 400 if more than 20 files provided", async () => {
    const files = Array.from(
      { length: 21 },
      (_, i) => createMockFile(`test${i}.jpg`),
    );
    const req = createMockRequest(files);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.suggestion).toContain("maximum of 20 files");
  });

  it("should return 400 if batch contains invalid filenames", async () => {
    const files = [
      createMockFile("valid.jpg"),
      createMockFile("../malicious.jpg"),
      createMockFile("another-valid.png"),
    ];
    const req = createMockRequest(files);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid filenames detected");
    expect(data.invalidFilenames).toEqual(["../malicious.jpg"]);
  });

  it("should return 400 if any file exceeds 10MB", async () => {
    const files = [
      createMockFile("test1.jpg", "image/jpeg", 5 * 1024 * 1024),
      createMockFile("test2.jpg", "image/jpeg", 11 * 1024 * 1024),
    ];
    const req = createMockRequest(files);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
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
      createMockFile("test6.jpg", "image/jpeg", 9 * 1024 * 1024),
    ];
    const req = createMockRequest(files);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.suggestion).toContain("50MB");
  });

  it("should consume tokens upfront", async () => {
    const files = [createMockFile("test1.jpg"), createMockFile("test2.jpg")];
    const req = createMockRequest(files);
    await POST(req);

    expect(mockTokenBalanceManager.consumeTokens).toHaveBeenCalledWith({
      userId: "user-123",
      amount: 2,
      source: "BATCH_UPLOAD",
      sourceId: "test-request-id",
      metadata: { albumId: "album-123", fileCount: 2, tier: "TIER_1K" },
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
  });

  it("should handle partial upload failure", async () => {
    const { processAndUploadImage } = await import(
      "@/lib/storage/upload-handler"
    );

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
    expect(data.results[0].success).toBe(true);
    expect(data.results[1].success).toBe(false);
    expect(data.results[1].error).toBe("Processing failed");
    expect(data.summary.successful).toBe(1);
    expect(data.summary.failed).toBe(1);
  });

  it("should refund tokens when all R2 uploads fail", async () => {
    const { processAndUploadImage } = await import(
      "@/lib/storage/upload-handler"
    );

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

    expect(mockTokenBalanceManager.addTokens).toHaveBeenCalledWith({
      userId: "user-123",
      amount: 2,
      type: "REFUND",
      source: "BATCH_UPLOAD_FAIL",
      sourceId: "test-request-id",
      metadata: { reason: "All R2 uploads failed" },
    });
  });

  it("should accept exactly 20 files", async () => {
    const files = Array.from(
      { length: 20 },
      (_, i) => createMockFile(`test${i}.jpg`),
    );
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    // Should not return 400 for 20 files (that's the max allowed)
    expect(res.status).toBe(200);
    expect(data.summary.total).toBe(20);
  });

  it("should handle database transaction failure", async () => {
    const { processAndUploadImage } = await import(
      "@/lib/storage/upload-handler"
    );
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

    mockPrisma.$transaction.mockRejectedValueOnce(new Error("Database error"));

    const files = [createMockFile("test1.jpg"), createMockFile("test2.jpg")];
    const req = createMockRequest(files);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(2);
    expect(data.results[0].success).toBe(false);
    expect(data.results[0].errorType).toBe("database");
    expect(data.results[1].success).toBe(false);
    expect(data.results[1].errorType).toBe("database");
  });

  it("should rollback R2 uploads when database transaction fails", async () => {
    const { deleteFromR2 } = await import("@/lib/storage/r2-client");
    const { processAndUploadImage } = await import(
      "@/lib/storage/upload-handler"
    );

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

    mockPrisma.$transaction.mockRejectedValueOnce(
      new Error("Database transaction failed"),
    );

    const files = [createMockFile("test1.jpg"), createMockFile("test2.jpg")];
    const req = createMockRequest(files);
    await POST(req);

    expect(deleteFromR2).toHaveBeenCalledTimes(2);
    expect(deleteFromR2).toHaveBeenCalledWith(
      "users/user-123/originals/test1.jpg",
    );
    expect(deleteFromR2).toHaveBeenCalledWith(
      "users/user-123/originals/test2.jpg",
    );
  });

  it("should not call transaction when all files fail upload", async () => {
    const { processAndUploadImage } = await import(
      "@/lib/storage/upload-handler"
    );

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

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("should return partial success when some files upload successfully", async () => {
    const { processAndUploadImage } = await import(
      "@/lib/storage/upload-handler"
    );

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

    expect(data.success).toBe(true);
    expect(data.summary.successful).toBe(1);
    expect(data.summary.failed).toBe(1);
  });

  it("should check album ownership", async () => {
    const files = [createMockFile("test1.jpg")];
    const req = createMockRequest(files);
    await POST(req);

    expect(mockPrisma.album.findUnique).toHaveBeenCalledWith({
      where: { id: "album-123" },
      select: {
        id: true,
        userId: true,
        defaultTier: true,
      },
    });
  });

  it("should handle individual file upload failures gracefully", async () => {
    const { processAndUploadImage } = await import(
      "@/lib/storage/upload-handler"
    );

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

    // Should return 200 with partial results
    expect(res.status).toBe(200);
    expect(data.summary.successful).toBe(1);
    expect(data.summary.failed).toBe(1);
  });
});
