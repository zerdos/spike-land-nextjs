import type { Session } from "next-auth";
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

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    isLimited: false,
    remaining: 30,
    resetAt: Date.now() + 60000,
  }),
  rateLimitConfigs: { imageUpload: { maxRequests: 30, windowMs: 60000 } },
}));

// Mock TokenBalanceManager - hoisted to avoid initialization error
const { mockTokenBalanceManager } = vi.hoisted(() => ({
  mockTokenBalanceManager: {
    hasEnoughTokens: vi.fn().mockResolvedValue(true),
    getBalance: vi.fn().mockResolvedValue({
      balance: 100,
      lifetimeEarned: 100,
    }),
    consumeTokens: vi.fn().mockResolvedValue({ success: true, balance: 98 }),
    refundTokens: vi.fn().mockResolvedValue({ success: true, balance: 100 }),
  },
}));

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: mockTokenBalanceManager,
}));

// Mock enhancement direct execution
vi.mock("@/workflows/enhance-image.direct", () => ({
  enhanceImageDirect: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock next/server after() function
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((callback: () => Promise<void>) => {
      // Execute callback immediately in tests
      void callback();
    }),
  };
});

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
        create: vi.fn().mockResolvedValue({
          id: "img-123",
          userId: "user-123",
          name: "test.jpg",
          originalUrl: "https://r2.dev/images/test.jpg",
          originalR2Key: "users/user-123/originals/test.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSizeBytes: 1024000,
          originalFormat: "jpeg",
          isPublic: false,
        }),
      },
      album: {
        findFirst: vi.fn().mockResolvedValue({
          id: "album-123",
          userId: "user-123",
          name: "Test Album",
          defaultTier: "TIER_1K",
          pipelineId: null,
        }),
      },
      albumImage: {
        create: vi.fn().mockResolvedValue({
          id: "album-image-123",
          albumId: "album-123",
          imageId: "img-123",
          sortOrder: 0,
        }),
      },
      imageEnhancementJob: {
        create: vi.fn().mockResolvedValue({
          id: "job-123",
          imageId: "img-123",
          userId: "user-123",
          tier: "TIER_1K",
          status: "PROCESSING",
        }),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Helper to create a mock file with arrayBuffer method
function createMockFile(name = "test.jpg", type = "image/jpeg") {
  const buffer = Buffer.from("test image content");
  return {
    name,
    type,
    size: buffer.length,
    arrayBuffer: () =>
      Promise.resolve(
        buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ),
      ),
  };
}

// Mock file type
type MockFile = ReturnType<typeof createMockFile>;

// Helper to create a mock request with formData
// albumId defaults to "album-123" since it's now required
function createMockRequest(
  file: MockFile | null,
  albumId: string | null = "album-123",
): NextRequest {
  const mockFormData = new Map<string, MockFile | string | null>();
  if (file) {
    mockFormData.set("file", file);
  }
  if (albumId) {
    mockFormData.set("albumId", albumId);
  }

  const req = new NextRequest("http://localhost/api/images/upload", {
    method: "POST",
  });

  // Override formData method
  req.formData = vi.fn().mockResolvedValue({
    get: (key: string) => mockFormData.get(key) ?? null,
  });

  return req;
}

describe("POST /api/images/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset token manager mocks to defaults
    mockTokenBalanceManager.hasEnoughTokens.mockResolvedValue(true);
    mockTokenBalanceManager.getBalance.mockResolvedValue({
      balance: 100,
      lifetimeEarned: 100,
    });
    mockTokenBalanceManager.consumeTokens.mockResolvedValue({
      success: true,
      balance: 98,
    });
    mockTokenBalanceManager.refundTokens.mockResolvedValue({
      success: true,
      balance: 100,
    });
    // Reset album mock to default
    mockPrisma.album.findFirst.mockResolvedValue({
      id: "album-123",
      userId: "user-123",
      name: "Test Album",
      defaultTier: "TIER_1K",
      pipelineId: null,
    });
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce(null);

    const req = createMockRequest(createMockFile());
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.suggestion).toBeDefined();
    expect(res.headers.get("X-Request-ID")).toBeDefined();
  });

  it("should return 401 if user id is missing in session", async () => {
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce({
      user: { name: "Test", email: "test@example.com" },
    } as unknown as Session);

    const req = createMockRequest(createMockFile());
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
    expect(data.title).toBeDefined();
    expect(res.headers.get("X-Request-ID")).toBeDefined();
  });

  it("should return 400 if no file provided", async () => {
    const req = createMockRequest(null);
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.suggestion).toContain("file");
    expect(res.headers.get("X-Request-ID")).toBeDefined();
  });

  it("should return 429 if rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limiter");
    const resetAt = Date.now() + 60000;

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      isLimited: true,
      remaining: 0,
      resetAt,
    });

    const req = createMockRequest(createMockFile());
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.retryAfter).toBeDefined();
    expect(res.headers.get("Retry-After")).toBeDefined();
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-Request-ID")).toBeDefined();
  });

  it("should upsert user before creating image for new users", async () => {
    const req = createMockRequest(createMockFile());
    await POST(req);

    // Verify user upsert was called with correct data (email excluded to avoid unique constraint errors)
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { id: "user-123" },
      update: {
        name: "Test User",
        image: "https://example.com/avatar.jpg",
      },
      create: {
        id: "user-123",
        name: "Test User",
        image: "https://example.com/avatar.jpg",
      },
    });
  });

  it("should upsert user before creating image for existing users", async () => {
    // Existing user - upsert should update their profile
    mockPrisma.user.upsert.mockResolvedValueOnce({
      id: "user-123",
      name: "Updated Name",
      email: "test@example.com",
      image: "https://example.com/new-avatar.jpg",
    });

    const req = createMockRequest(createMockFile());
    await POST(req);

    // Verify user upsert was called (it works for both new and existing users)
    expect(mockPrisma.user.upsert).toHaveBeenCalled();
    // Verify image creation happened after user upsert
    expect(mockPrisma.enhancedImage.create).toHaveBeenCalled();
  });

  it("should upload image successfully", async () => {
    const req = createMockRequest(createMockFile());
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.image).toBeDefined();
    expect(data.image.id).toBe("img-123");
    expect(data.image.name).toBe("test.jpg");
    expect(data.image.width).toBe(1920);
    expect(data.image.height).toBe(1080);
  });

  it("should return 500 if upload processing fails", async () => {
    const { processAndUploadImage } = await import(
      "@/lib/storage/upload-handler"
    );
    vi.mocked(processAndUploadImage).mockResolvedValueOnce({
      success: false,
      error: "Upload failed",
      imageId: "",
      url: "",
      r2Key: "",
      width: 0,
      height: 0,
      sizeBytes: 0,
      format: "",
    });

    const req = createMockRequest(createMockFile());
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.suggestion).toBeDefined();
    expect(res.headers.get("X-Request-ID")).toBeDefined();
  });

  it("should handle user upsert failure gracefully", async () => {
    mockPrisma.user.upsert.mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    const req = createMockRequest(createMockFile());
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.suggestion).toBeDefined();
    expect(res.headers.get("X-Request-ID")).toBeDefined();
  });

  it("should handle image creation failure", async () => {
    mockPrisma.enhancedImage.create.mockRejectedValueOnce(
      new Error("Foreign key constraint failed"),
    );

    const req = createMockRequest(createMockFile());
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.suggestion).toBeDefined();
    expect(res.headers.get("X-Request-ID")).toBeDefined();
  });

  it("should sync user profile data on every upload", async () => {
    // Simulate user with updated profile from OAuth
    const updatedSession = {
      user: {
        id: "user-123",
        name: "New Display Name",
        email: "newemail@example.com",
        image: "https://example.com/new-profile.jpg",
      },
    } as Session;
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce(
      updatedSession,
    );

    const req = createMockRequest(createMockFile());
    await POST(req);

    // Verify updated profile data is synced (email excluded to avoid unique constraint errors)
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { id: "user-123" },
      update: {
        name: "New Display Name",
        image: "https://example.com/new-profile.jpg",
      },
      create: {
        id: "user-123",
        name: "New Display Name",
        image: "https://example.com/new-profile.jpg",
      },
    });
  });

  describe("filename security validation", () => {
    it("should reject filename with path traversal (..) characters", async () => {
      const req = createMockRequest(createMockFile("../../../etc/passwd.jpg"));
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe(
        "Invalid filename. Filenames cannot contain path traversal characters or be hidden files.",
      );
      expect(res.headers.get("X-Request-ID")).toBeDefined();
    });

    it("should reject filename starting with dot (hidden file)", async () => {
      const req = createMockRequest(createMockFile(".hidden-file.jpg"));
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe(
        "Invalid filename. Filenames cannot contain path traversal characters or be hidden files.",
      );
      expect(res.headers.get("X-Request-ID")).toBeDefined();
    });

    it("should reject filename with forward slash", async () => {
      const req = createMockRequest(createMockFile("path/to/file.jpg"));
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe(
        "Invalid filename. Filenames cannot contain path traversal characters or be hidden files.",
      );
      expect(res.headers.get("X-Request-ID")).toBeDefined();
    });

    it("should reject filename with backslash", async () => {
      const req = createMockRequest(createMockFile("path\\to\\file.jpg"));
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe(
        "Invalid filename. Filenames cannot contain path traversal characters or be hidden files.",
      );
      expect(res.headers.get("X-Request-ID")).toBeDefined();
    });

    it("should accept valid filename without path traversal characters", async () => {
      const req = createMockRequest(createMockFile("valid-image-file.jpg"));
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("album association", () => {
    it("should allow upload without albumId using TIER_1K default", async () => {
      // Pass null explicitly to skip albumId - now allowed
      const req = createMockRequest(createMockFile(), null);
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      // Should create image but NOT link to album
      expect(mockPrisma.enhancedImage.create).toHaveBeenCalled();
      expect(mockPrisma.albumImage.create).not.toHaveBeenCalled();
      // Should use TIER_1K (2 tokens) as default
      expect(data.enhancement.tier).toBe("TIER_1K");
      expect(data.enhancement.tokenCost).toBe(2);
    });

    it("should return 400 if albumId is provided but album does not exist", async () => {
      mockPrisma.album.findFirst.mockResolvedValueOnce(null);

      const req = createMockRequest(createMockFile(), "non-existent-album");
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.suggestion).toContain("Album not found");
      expect(mockPrisma.enhancedImage.create).not.toHaveBeenCalled();
    });

    it("should return 400 if albumId belongs to another user", async () => {
      // album.findFirst returns null when album doesn't belong to user
      mockPrisma.album.findFirst.mockResolvedValueOnce(null);

      const req = createMockRequest(createMockFile(), "other-users-album");
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.suggestion).toContain("Album not found");
    });

    it("should create albumImage when valid albumId is provided", async () => {
      // Album mock is already set in beforeEach with defaultTier
      const req = createMockRequest(createMockFile(), "album-123");
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.albumImage.create).toHaveBeenCalledWith({
        data: {
          albumId: "album-123",
          imageId: "img-123",
        },
      });
    });

    it("should still return success even if albumImage creation is called", async () => {
      // Album mock is already set in beforeEach with defaultTier
      const req = createMockRequest(createMockFile(), "album-123");
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.image.id).toBe("img-123");
    });

    it("should return 402 if user has insufficient tokens (prepay model)", async () => {
      // With prepay model, consumeTokens fails directly
      mockTokenBalanceManager.consumeTokens.mockResolvedValueOnce({
        success: false,
        error: "Insufficient tokens",
      });
      mockTokenBalanceManager.getBalance.mockResolvedValueOnce({
        balance: 0,
        lifetimeEarned: 0,
      });

      const req = createMockRequest(createMockFile(), "album-123");
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(402);
      expect(data.required).toBeDefined();
      expect(data.balance).toBe(0);
    });

    it("should refund tokens if upload processing fails", async () => {
      const { processAndUploadImage } = await import(
        "@/lib/storage/upload-handler"
      );
      vi.mocked(processAndUploadImage).mockResolvedValueOnce({
        success: false,
        error: "Upload failed",
        imageId: "",
        url: "",
        r2Key: "",
        width: 0,
        height: 0,
        sizeBytes: 0,
        format: "",
      });

      const req = createMockRequest(createMockFile(), "album-123");
      const res = await POST(req);

      expect(res.status).toBe(500);
      // Verify refund was called since upload failed
      expect(mockTokenBalanceManager.refundTokens).toHaveBeenCalledWith(
        "user-123",
        expect.any(Number), // tokenCost
        expect.stringContaining("failed-upload"),
        "Upload processing failed",
      );
    });
  });
});
