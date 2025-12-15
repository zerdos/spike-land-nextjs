import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      enhancedImage: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "img-1",
            userId: "user-123",
            originalR2Key: "users/user-123/originals/img-1.jpg",
          },
          {
            id: "img-2",
            userId: "user-123",
            originalR2Key: "users/user-123/originals/img-2.jpg",
          },
        ]),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Helper to create mock request
function createMockRequest(body: unknown): NextRequest {
  const req = new NextRequest("http://localhost/api/images/batch-enhance", {
    method: "POST",
  });
  req.json = vi.fn().mockResolvedValue(body);
  return req;
}

describe("POST /api/images/batch-enhance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set Vercel environment to test workflow path
    process.env.VERCEL = "1";
  });

  afterEach(() => {
    delete process.env.VERCEL;
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce(null);

    const req = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_2K",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 401 if user id is missing", async () => {
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce({
      user: { name: "Test", email: "test@example.com" },
    });

    const req = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_2K",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if imageIds is missing", async () => {
    const req = createMockRequest({ tier: "TIER_2K" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing or invalid imageIds");
  });

  it("should return 400 if imageIds is not an array", async () => {
    const req = createMockRequest({
      imageIds: "not-an-array",
      tier: "TIER_2K",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing or invalid imageIds");
  });

  it("should return 400 if imageIds is empty", async () => {
    const req = createMockRequest({ imageIds: [], tier: "TIER_2K" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing or invalid imageIds");
  });

  it("should return 400 if more than 20 images in batch", async () => {
    const imageIds = Array.from({ length: 21 }, (_, i) => `img-${i}`);
    const req = createMockRequest({ imageIds, tier: "TIER_2K" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Maximum 20 images allowed per batch enhancement");
  });

  it("should return 400 if tier is invalid", async () => {
    const req = createMockRequest({
      imageIds: ["img-1"],
      tier: "INVALID_TIER",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid tier");
  });

  it("should return 404 if images not found", async () => {
    mockPrisma.enhancedImage.findMany.mockResolvedValueOnce([]);

    const req = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_2K",
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("One or more images not found or unauthorized");
  });

  it("should return 404 if some images not found", async () => {
    mockPrisma.enhancedImage.findMany.mockResolvedValueOnce([
      { id: "img-1", userId: "user-123", originalR2Key: "key1" },
    ]);

    const req = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_2K",
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("should return 402 if insufficient tokens", async () => {
    const { TokenBalanceManager } = await import(
      "@/lib/tokens/balance-manager"
    );
    vi.mocked(TokenBalanceManager.hasEnoughTokens).mockResolvedValueOnce(false);

    const req = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_2K",
    });
    const res = await POST(req);
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.error).toBe("Insufficient tokens");
    expect(data.required).toBe(10); // 2 images * 5 tokens
  });

  it("should return 500 if token consumption fails", async () => {
    const { TokenBalanceManager } = await import(
      "@/lib/tokens/balance-manager"
    );
    vi.mocked(TokenBalanceManager.consumeTokens).mockResolvedValueOnce({
      success: false,
      error: "Database error",
    });

    const req = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_2K",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Database error");
  });

  it("should start batch enhancement workflow successfully", async () => {
    const { start } = await import("workflow/api");
    const { batchEnhanceImages } = await import(
      "@/workflows/batch-enhance.workflow"
    );

    const req = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_2K",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.batchId).toMatch(/^batch-/);
    expect(data.summary.total).toBe(2);
    expect(data.summary.totalCost).toBe(10);

    // Verify workflow was started with correct params
    expect(start).toHaveBeenCalledWith(batchEnhanceImages, [
      expect.objectContaining({
        batchId: expect.stringContaining("batch-"),
        userId: "user-123",
        tier: "TIER_2K",
        images: expect.arrayContaining([
          expect.objectContaining({ imageId: "img-1" }),
          expect.objectContaining({ imageId: "img-2" }),
        ]),
      }),
    ]);
  });

  it("should consume correct amount of tokens", async () => {
    const { TokenBalanceManager } = await import(
      "@/lib/tokens/balance-manager"
    );

    const req = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_4K",
    });
    await POST(req);

    expect(TokenBalanceManager.consumeTokens).toHaveBeenCalledWith({
      userId: "user-123",
      amount: 20, // 2 images * 10 tokens
      source: "batch_image_enhancement",
      sourceId: expect.stringContaining("batch-"),
      metadata: { tier: "TIER_4K", imageCount: 2 },
    });
  });

  it("should calculate costs for different tiers", async () => {
    const req1K = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_1K",
    });
    const res1K = await POST(req1K);
    const data1K = await res1K.json();
    expect(data1K.summary.totalCost).toBe(4); // 2 * 2

    vi.clearAllMocks();

    const req2K = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_2K",
    });
    const res2K = await POST(req2K);
    const data2K = await res2K.json();
    expect(data2K.summary.totalCost).toBe(10); // 2 * 5

    vi.clearAllMocks();

    const req4K = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_4K",
    });
    const res4K = await POST(req4K);
    const data4K = await res4K.json();
    expect(data4K.summary.totalCost).toBe(20); // 2 * 10
  });

  it("should return new balance after token consumption", async () => {
    const { TokenBalanceManager } = await import(
      "@/lib/tokens/balance-manager"
    );
    vi.mocked(TokenBalanceManager.consumeTokens).mockResolvedValueOnce({
      success: true,
      balance: 85,
    });

    const req = createMockRequest({
      imageIds: ["img-1", "img-2"],
      tier: "TIER_2K",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.summary.newBalance).toBe(85);
  });

  it("should handle single image batch", async () => {
    mockPrisma.enhancedImage.findMany.mockResolvedValueOnce([
      { id: "img-1", userId: "user-123", originalR2Key: "key1" },
    ]);

    const req = createMockRequest({
      imageIds: ["img-1"],
      tier: "TIER_2K",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.total).toBe(1);
    expect(data.summary.totalCost).toBe(5);
  });

  it("should handle large batch", async () => {
    const imageIds = Array.from({ length: 20 }, (_, i) => `img-${i}`);
    const images = imageIds.map((id) => ({
      id,
      userId: "user-123",
      originalR2Key: `key-${id}`,
    }));

    mockPrisma.enhancedImage.findMany.mockResolvedValueOnce(images);

    const req = createMockRequest({
      imageIds,
      tier: "TIER_2K",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.total).toBe(20);
    expect(data.summary.totalCost).toBe(100); // 20 * 5
  });

  it("should handle unexpected errors", async () => {
    mockPrisma.enhancedImage.findMany.mockRejectedValueOnce(
      new Error("Unexpected error"),
    );

    const req = createMockRequest({
      imageIds: ["img-1"],
      tier: "TIER_2K",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Unexpected error");
  });
});
