import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mocks
const mockSession = {
  user: {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
  },
};

vi.mock("@/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: {
    hasEnoughTokens: vi.fn().mockResolvedValue(true),
    consumeTokens: vi.fn().mockResolvedValue({
      success: true,
      balance: 90,
    }),
    getBalance: vi.fn().mockResolvedValue({
      success: true,
      balance: 100,
    }),
    refundTokens: vi.fn().mockResolvedValue({
      success: true,
    }),
  },
}));

// Mock rate limiter
vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    isLimited: false,
    remaining: 4,
    resetAt: Date.now() + 60000,
  }),
  rateLimitConfigs: {
    albumBatchEnhancement: {
      maxRequests: 5,
      windowMs: 60 * 1000,
    },
  },
}));

// Mock the workflow start function
vi.mock("workflow/api", () => ({
  start: vi.fn().mockResolvedValue({ runId: "batch-workflow-run-123" }),
}));

// Mock the batchEnhanceImages workflow
vi.mock("@/workflows/batch-enhance.workflow", () => ({
  batchEnhanceImages: vi.fn(),
}));

// Mock the direct batch enhance
vi.mock("@/workflows/batch-enhance.direct", () => ({
  batchEnhanceImagesDirect: vi.fn().mockResolvedValue({
    batchId: "test-batch",
    results: [],
    summary: { total: 0, successful: 0, failed: 0 },
  }),
}));

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      album: {
        findUnique: vi.fn(),
      },
      albumImage: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Helper to create mock request
function createMockRequest(body: unknown): NextRequest {
  const req = new NextRequest("http://localhost/api/albums/test-album/enhance", {
    method: "POST",
  });
  req.json = vi.fn().mockResolvedValue(body);
  return req;
}

const mockRouteParams = { params: Promise.resolve({ id: "album-123" }) };

describe("POST /api/albums/[id]/enhance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: dev mode
    delete process.env.VERCEL;

    // Default album setup
    mockPrisma.album.findUnique.mockResolvedValue({
      id: "album-123",
      userId: "user-123",
      name: "Test Album",
      description: null,
      coverImageId: null,
      privacy: "PRIVATE",
      shareToken: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Default: 2 images, none enhanced
    // Set up count mocks for optimized query
    mockPrisma.albumImage.count.mockImplementation((args) => {
      // First call: total count
      if (!args.where?.image) {
        return Promise.resolve(2);
      }
      // Second call: images to enhance count
      return Promise.resolve(2);
    });

    // Optimized query returns only id and originalR2Key
    mockPrisma.albumImage.findMany.mockResolvedValue([
      {
        image: {
          id: "img-1",
          originalR2Key: "images/image1.jpg",
        },
      },
      {
        image: {
          id: "img-2",
          originalR2Key: "images/image2.jpg",
        },
      },
    ]);
  });

  afterEach(() => {
    delete process.env.VERCEL;
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce(null);

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(401);
  });

  it("should return 401 if user id is missing", async () => {
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce({
      user: { name: "Test", email: "test@example.com" },
    });

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(401);
  });

  it("should return 400 if tier is missing", async () => {
    const req = createMockRequest({});
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid tier");
  });

  it("should return 400 if tier is invalid", async () => {
    const req = createMockRequest({ tier: "INVALID_TIER" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid tier");
  });

  it("should return 404 if album not found", async () => {
    mockPrisma.album.findUnique.mockResolvedValueOnce(null);

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Album not found");
  });

  it("should return 403 if user does not own album", async () => {
    mockPrisma.album.findUnique.mockResolvedValueOnce({
      id: "album-123",
      userId: "different-user",
      name: "Test Album",
      description: null,
      coverImageId: null,
      privacy: "PRIVATE",
      shareToken: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden");
  });

  it("should return 404 if album has no images", async () => {
    mockPrisma.albumImage.count.mockResolvedValueOnce(0);

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("No images found in album");
  });

  it("should return 400 if too many images to enhance", async () => {
    // Mock count to return 21 for both total and to-enhance count
    mockPrisma.albumImage.count.mockResolvedValue(21);

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Maximum 20 images allowed");
    expect(data.totalImages).toBe(21);
    expect(data.toEnhance).toBe(21);
    expect(data.maxBatchSize).toBe(20);
  });

  it("should skip already enhanced images by default", async () => {
    // Mock counts: 2 total images, 1 needs enhancement
    mockPrisma.albumImage.count.mockImplementation((args) => {
      if (!args.where?.image) {
        return Promise.resolve(2); // Total count
      }
      return Promise.resolve(1); // Images to enhance (1 not enhanced)
    });

    // Return only the image that needs enhancement
    mockPrisma.albumImage.findMany.mockResolvedValueOnce([
      {
        image: {
          id: "img-2",
          originalR2Key: "images/image2.jpg",
        },
      },
    ]);

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.totalImages).toBe(2);
    expect(data.skipped).toBe(1);
    expect(data.queued).toBe(1);
    expect(data.totalCost).toBe(2); // TIER_1K = 2 tokens, 1 image
  });

  it("should enhance all images when skipAlreadyEnhanced is false", async () => {
    // Mock counts: 1 total image, 1 to enhance (because skipAlreadyEnhanced=false)
    mockPrisma.albumImage.count.mockResolvedValue(1);

    mockPrisma.albumImage.findMany.mockResolvedValueOnce([
      {
        image: {
          id: "img-1",
          originalR2Key: "images/image1.jpg",
        },
      },
    ]);

    const req = createMockRequest({
      tier: "TIER_1K",
      skipAlreadyEnhanced: false,
    });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.totalImages).toBe(1);
    expect(data.skipped).toBe(0);
    expect(data.queued).toBe(1);
  });

  it("should return success with no jobs if all images already enhanced", async () => {
    // Mock counts: 1 total image, 0 to enhance (all already enhanced)
    mockPrisma.albumImage.count.mockImplementation((args) => {
      if (!args.where?.image) {
        return Promise.resolve(1); // Total count
      }
      return Promise.resolve(0); // Images to enhance (all already enhanced)
    });

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.totalImages).toBe(1);
    expect(data.skipped).toBe(1);
    expect(data.queued).toBe(0);
    expect(data.totalCost).toBe(0);
    expect(data.jobs).toEqual([]);
  });

  it("should return 402 if insufficient tokens", async () => {
    const { TokenBalanceManager } = await import("@/lib/tokens/balance-manager");
    vi.mocked(TokenBalanceManager.hasEnoughTokens).mockResolvedValueOnce(false);

    const req = createMockRequest({ tier: "TIER_2K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.error).toBe("Insufficient tokens");
    expect(data.required).toBe(10); // 2 images * 5 tokens
  });

  it("should return 500 if token consumption fails", async () => {
    const { TokenBalanceManager } = await import("@/lib/tokens/balance-manager");
    vi.mocked(TokenBalanceManager.consumeTokens).mockResolvedValueOnce({
      success: false,
      error: "Database error",
    });

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Database error");
  });

  it("should start batch enhancement workflow in production", async () => {
    process.env.VERCEL = "1";
    const { start } = await import("workflow/api");
    const { batchEnhanceImages } = await import("@/workflows/batch-enhance.workflow");

    const req = createMockRequest({ tier: "TIER_2K" });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.totalCost).toBe(10); // 2 images * 5 tokens

    // Verify workflow was started
    expect(start).toHaveBeenCalledWith(batchEnhanceImages, [
      expect.objectContaining({
        batchId: expect.stringContaining("album-"),
        userId: "user-123",
        tier: "TIER_2K",
        images: expect.arrayContaining([
          { imageId: "img-1", originalR2Key: "images/image1.jpg" },
          { imageId: "img-2", originalR2Key: "images/image2.jpg" },
        ]),
      }),
    ]);
  });

  it("should run direct enhancement in dev mode", async () => {
    const { batchEnhanceImagesDirect } = await import("@/workflows/batch-enhance.direct");

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify direct enhancement was called
    expect(batchEnhanceImagesDirect).toHaveBeenCalledWith({
      batchId: expect.stringContaining("album-"),
      userId: "user-123",
      images: [
        { imageId: "img-1", originalR2Key: "images/image1.jpg" },
        { imageId: "img-2", originalR2Key: "images/image2.jpg" },
      ],
      tier: "TIER_1K",
    });
  });

  it("should calculate costs for different tiers", async () => {
    const req1K = createMockRequest({ tier: "TIER_1K" });
    const res1K = await POST(req1K, mockRouteParams);
    const data1K = await res1K.json();
    expect(data1K.totalCost).toBe(4); // 2 * 2

    vi.clearAllMocks();

    const req2K = createMockRequest({ tier: "TIER_2K" });
    const res2K = await POST(req2K, mockRouteParams);
    const data2K = await res2K.json();
    expect(data2K.totalCost).toBe(10); // 2 * 5

    vi.clearAllMocks();

    const req4K = createMockRequest({ tier: "TIER_4K" });
    const res4K = await POST(req4K, mockRouteParams);
    const data4K = await res4K.json();
    expect(data4K.totalCost).toBe(20); // 2 * 10
  });

  it("should consume correct amount of tokens", async () => {
    const { TokenBalanceManager } = await import("@/lib/tokens/balance-manager");

    const req = createMockRequest({ tier: "TIER_4K" });
    await POST(req, mockRouteParams);

    expect(TokenBalanceManager.consumeTokens).toHaveBeenCalledWith({
      userId: "user-123",
      amount: 20, // 2 images * 10 tokens
      source: "album_batch_enhancement",
      sourceId: expect.stringContaining("album-"),
      metadata: { tier: "TIER_4K", albumId: "album-123", imageCount: 2 },
    });
  });

  it("should return new balance after token consumption", async () => {
    const { TokenBalanceManager } = await import("@/lib/tokens/balance-manager");
    vi.mocked(TokenBalanceManager.consumeTokens).mockResolvedValueOnce({
      success: true,
      balance: 85,
    });

    const req = createMockRequest({ tier: "TIER_2K" });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(data.newBalance).toBe(85);
  });

  it("should handle single image album", async () => {
    mockPrisma.albumImage.count.mockResolvedValue(1);

    mockPrisma.albumImage.findMany.mockResolvedValueOnce([
      {
        image: {
          id: "img-1",
          originalR2Key: "images/image1.jpg",
        },
      },
    ]);

    const req = createMockRequest({ tier: "TIER_2K" });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalImages).toBe(1);
    expect(data.queued).toBe(1);
    expect(data.totalCost).toBe(5); // 1 * 5
  });

  it("should handle large album (20 images max)", async () => {
    mockPrisma.albumImage.count.mockResolvedValue(20);

    const imageIds = Array.from({ length: 20 }, (_, i) => ({
      image: {
        id: `img-${i}`,
        originalR2Key: `images/image-${i}.jpg`,
      },
    }));

    mockPrisma.albumImage.findMany.mockResolvedValueOnce(imageIds);

    const req = createMockRequest({ tier: "TIER_2K" });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalImages).toBe(20);
    expect(data.queued).toBe(20);
    expect(data.totalCost).toBe(100); // 20 * 5
  });

  it("should optimize query for large albums by checking count before fetching data", async () => {
    // Mock count to return 100 images (over the limit)
    mockPrisma.albumImage.count.mockResolvedValue(100);

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Maximum 20 images allowed");
    expect(data.totalImages).toBe(100);
    expect(data.toEnhance).toBe(100);

    // Verify findMany was NEVER called (optimization: we don't fetch if count exceeds limit)
    expect(mockPrisma.albumImage.findMany).not.toHaveBeenCalled();
  });

  it("should handle unexpected errors", async () => {
    mockPrisma.album.findUnique.mockRejectedValueOnce(new Error("Database connection lost"));

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Database connection lost");
  });

  it("should refund tokens if workflow fails to start in production", async () => {
    process.env.VERCEL = "1";
    const { start } = await import("workflow/api");
    const { TokenBalanceManager } = await import("@/lib/tokens/balance-manager");

    // Mock workflow start to fail
    vi.mocked(start).mockRejectedValueOnce(new Error("Workflow service unavailable"));

    const req = createMockRequest({ tier: "TIER_2K" });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to start enhancement workflow. Tokens have been refunded.");

    // Verify refund was called with correct parameters
    expect(TokenBalanceManager.refundTokens).toHaveBeenCalledWith(
      "user-123",
      10, // 2 images * 5 tokens (TIER_2K)
      expect.stringContaining("album-"),
      "Workflow failed to start",
    );
  });

  it("should refund tokens if direct enhancement throws in dev mode", async () => {
    const { batchEnhanceImagesDirect } = await import("@/workflows/batch-enhance.direct");
    const { TokenBalanceManager } = await import("@/lib/tokens/balance-manager");

    // Mock direct enhancement to throw immediately (not in catch block)
    vi.mocked(batchEnhanceImagesDirect).mockImplementation(() => {
      throw new Error("Direct enhancement initialization failed");
    });

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to start enhancement workflow. Tokens have been refunded.");

    // Verify refund was called
    expect(TokenBalanceManager.refundTokens).toHaveBeenCalledWith(
      "user-123",
      4, // 2 images * 2 tokens (TIER_1K)
      expect.stringContaining("album-"),
      "Workflow failed to start",
    );
  });

  it("should not refund tokens if workflow starts successfully", async () => {
    process.env.VERCEL = "1";
    const { TokenBalanceManager } = await import("@/lib/tokens/balance-manager");

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);

    expect(res.status).toBe(200);

    // Verify refund was NOT called (only consume was called)
    expect(TokenBalanceManager.consumeTokens).toHaveBeenCalled();
    expect(TokenBalanceManager.refundTokens).not.toHaveBeenCalled();
  });

  it("should return 429 when rate limit is exceeded", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limiter");
    const resetAt = Date.now() + 120000; // 2 minutes from now

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      isLimited: true,
      remaining: 0,
      resetAt,
    });

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toBe("Rate limit exceeded for batch enhancement");
    expect(data.retryAfter).toBeDefined();
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBe(String(resetAt));
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  it("should include correct rate limit headers when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limiter");
    const resetAt = Date.now() + 60000; // 1 minute from now

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      isLimited: true,
      remaining: 0,
      resetAt,
    });

    const req = createMockRequest({ tier: "TIER_2K" });
    const res = await POST(req, mockRouteParams);

    expect(res.status).toBe(429);
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBe(String(resetAt));

    const retryAfter = res.headers.get("Retry-After");
    expect(retryAfter).toBeDefined();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(Number(retryAfter)).toBeLessThanOrEqual(60);
  });

  it("should check rate limit with correct identifier", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limiter");

    const req = createMockRequest({ tier: "TIER_1K" });
    await POST(req, mockRouteParams);

    expect(checkRateLimit).toHaveBeenCalledWith(
      "album-batch-enhance:user-123",
      expect.objectContaining({
        maxRequests: 5,
        windowMs: 60 * 1000,
      }),
    );
  });

  it("should not consume tokens when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limiter");
    const { TokenBalanceManager } = await import("@/lib/tokens/balance-manager");

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      isLimited: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);

    expect(res.status).toBe(429);
    expect(TokenBalanceManager.consumeTokens).not.toHaveBeenCalled();
  });
});
