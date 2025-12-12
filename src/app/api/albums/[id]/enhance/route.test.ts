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
    mockPrisma.albumImage.findMany.mockResolvedValue([
      {
        id: "album-image-1",
        albumId: "album-123",
        imageId: "img-1",
        sortOrder: 0,
        addedAt: new Date(),
        image: {
          id: "img-1",
          userId: "user-123",
          name: "Image 1",
          description: null,
          originalUrl: "https://example.com/image1.jpg",
          originalR2Key: "images/image1.jpg",
          originalWidth: 1024,
          originalHeight: 768,
          originalSizeBytes: 100000,
          originalFormat: "JPEG",
          isPublic: false,
          viewCount: 0,
          shareToken: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          enhancementJobs: [],
        },
      },
      {
        id: "album-image-2",
        albumId: "album-123",
        imageId: "img-2",
        sortOrder: 1,
        addedAt: new Date(),
        image: {
          id: "img-2",
          userId: "user-123",
          name: "Image 2",
          description: null,
          originalUrl: "https://example.com/image2.jpg",
          originalR2Key: "images/image2.jpg",
          originalWidth: 1024,
          originalHeight: 768,
          originalSizeBytes: 100000,
          originalFormat: "JPEG",
          isPublic: false,
          viewCount: 0,
          shareToken: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          enhancementJobs: [],
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
    mockPrisma.albumImage.findMany.mockResolvedValueOnce([]);

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("No images found in album");
  });

  it("should return 400 if too many images to enhance", async () => {
    const manyImages = Array.from({ length: 21 }, (_, i) => ({
      id: `album-image-${i}`,
      albumId: "album-123",
      imageId: `img-${i}`,
      sortOrder: i,
      addedAt: new Date(),
      image: {
        id: `img-${i}`,
        userId: "user-123",
        name: `Image ${i}`,
        description: null,
        originalUrl: `https://example.com/image-${i}.jpg`,
        originalR2Key: `images/image-${i}.jpg`,
        originalWidth: 1024,
        originalHeight: 768,
        originalSizeBytes: 100000,
        originalFormat: "JPEG",
        isPublic: false,
        viewCount: 0,
        shareToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        enhancementJobs: [],
      },
    }));

    mockPrisma.albumImage.findMany.mockResolvedValueOnce(manyImages);

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Maximum 20 images allowed");
  });

  it("should skip already enhanced images by default", async () => {
    mockPrisma.albumImage.findMany.mockResolvedValueOnce([
      {
        id: "album-image-1",
        albumId: "album-123",
        imageId: "img-1",
        sortOrder: 0,
        addedAt: new Date(),
        image: {
          id: "img-1",
          userId: "user-123",
          name: "Image 1",
          description: null,
          originalUrl: "https://example.com/image1.jpg",
          originalR2Key: "images/image1.jpg",
          originalWidth: 1024,
          originalHeight: 768,
          originalSizeBytes: 100000,
          originalFormat: "JPEG",
          isPublic: false,
          viewCount: 0,
          shareToken: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          enhancementJobs: [{ id: "job-1" }], // Already enhanced
        },
      },
      {
        id: "album-image-2",
        albumId: "album-123",
        imageId: "img-2",
        sortOrder: 1,
        addedAt: new Date(),
        image: {
          id: "img-2",
          userId: "user-123",
          name: "Image 2",
          description: null,
          originalUrl: "https://example.com/image2.jpg",
          originalR2Key: "images/image2.jpg",
          originalWidth: 1024,
          originalHeight: 768,
          originalSizeBytes: 100000,
          originalFormat: "JPEG",
          isPublic: false,
          viewCount: 0,
          shareToken: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          enhancementJobs: [], // Not enhanced
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
    mockPrisma.albumImage.findMany.mockResolvedValueOnce([
      {
        id: "album-image-1",
        albumId: "album-123",
        imageId: "img-1",
        sortOrder: 0,
        addedAt: new Date(),
        image: {
          id: "img-1",
          userId: "user-123",
          name: "Image 1",
          description: null,
          originalUrl: "https://example.com/image1.jpg",
          originalR2Key: "images/image1.jpg",
          originalWidth: 1024,
          originalHeight: 768,
          originalSizeBytes: 100000,
          originalFormat: "JPEG",
          isPublic: false,
          viewCount: 0,
          shareToken: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          enhancementJobs: [{ id: "job-1" }], // Already enhanced
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
    mockPrisma.albumImage.findMany.mockResolvedValueOnce([
      {
        id: "album-image-1",
        albumId: "album-123",
        imageId: "img-1",
        sortOrder: 0,
        addedAt: new Date(),
        image: {
          id: "img-1",
          userId: "user-123",
          name: "Image 1",
          description: null,
          originalUrl: "https://example.com/image1.jpg",
          originalR2Key: "images/image1.jpg",
          originalWidth: 1024,
          originalHeight: 768,
          originalSizeBytes: 100000,
          originalFormat: "JPEG",
          isPublic: false,
          viewCount: 0,
          shareToken: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          enhancementJobs: [{ id: "job-1" }], // Already enhanced
        },
      },
    ]);

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
    mockPrisma.albumImage.findMany.mockResolvedValueOnce([
      {
        id: "album-image-1",
        albumId: "album-123",
        imageId: "img-1",
        sortOrder: 0,
        addedAt: new Date(),
        image: {
          id: "img-1",
          userId: "user-123",
          name: "Image 1",
          description: null,
          originalUrl: "https://example.com/image1.jpg",
          originalR2Key: "images/image1.jpg",
          originalWidth: 1024,
          originalHeight: 768,
          originalSizeBytes: 100000,
          originalFormat: "JPEG",
          isPublic: false,
          viewCount: 0,
          shareToken: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          enhancementJobs: [],
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
    const imageIds = Array.from({ length: 20 }, (_, i) => ({
      id: `album-image-${i}`,
      albumId: "album-123",
      imageId: `img-${i}`,
      sortOrder: i,
      addedAt: new Date(),
      image: {
        id: `img-${i}`,
        userId: "user-123",
        name: `Image ${i}`,
        description: null,
        originalUrl: `https://example.com/image-${i}.jpg`,
        originalR2Key: `images/image-${i}.jpg`,
        originalWidth: 1024,
        originalHeight: 768,
        originalSizeBytes: 100000,
        originalFormat: "JPEG",
        isPublic: false,
        viewCount: 0,
        shareToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        enhancementJobs: [],
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

  it("should handle unexpected errors", async () => {
    mockPrisma.album.findUnique.mockRejectedValueOnce(new Error("Database connection lost"));

    const req = createMockRequest({ tier: "TIER_1K" });
    const res = await POST(req, mockRouteParams);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Database connection lost");
  });
});
