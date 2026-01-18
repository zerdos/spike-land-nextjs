import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mocks
const mockSession = { user: { id: "user-123" } };
vi.mock("@/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: {
    hasEnoughTokens: vi.fn().mockResolvedValue(true),
    consumeTokens: vi.fn().mockResolvedValue({ success: true, balance: 100 }),
    refundTokens: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ isLimited: false }),
  rateLimitConfigs: { imageEnhancement: {} },
}));

// Mock direct enhancement
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
      enhancedImage: {
        findUnique: vi.fn(),
      },
      imageEnhancementJob: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

describe("POST /api/images/enhance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(await import("@/auth")).auth.mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should start enhancement successfully", async () => {
    const { enhanceImageDirect } = await import(
      "@/workflows/enhance-image.direct"
    );

    // Setup mocks
    mockPrisma.enhancedImage.findUnique.mockResolvedValue({
      id: "img-1",
      userId: "user-123",
      originalR2Key: "originals/img-1.jpg",
    });

    mockPrisma.imageEnhancementJob.create.mockResolvedValue({
      id: "job-1",
    });

    const req = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
      body: JSON.stringify({ imageId: "img-1", tier: "TIER_4K" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.jobId).toBe("job-1");

    // Verify job creation
    expect(mockPrisma.imageEnhancementJob.create).toHaveBeenCalled();

    // Verify direct enhancement was called with correct params
    expect(enhanceImageDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job-1",
        imageId: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
        tier: "TIER_4K",
      }),
    );
  });

  it("should return 400 for missing imageId", async () => {
    const req = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
      body: JSON.stringify({ tier: "TIER_4K" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid tier", async () => {
    const req = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
      body: JSON.stringify({ imageId: "img-1", tier: "INVALID_TIER" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 404 if image not found", async () => {
    mockPrisma.enhancedImage.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
      body: JSON.stringify({ imageId: "nonexistent", tier: "TIER_4K" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("should return 402 if insufficient tokens", async () => {
    const { TokenBalanceManager } = await import(
      "@/lib/tokens/balance-manager"
    );

    mockPrisma.enhancedImage.findUnique.mockResolvedValue({
      id: "img-1",
      userId: "user-123",
      originalR2Key: "originals/img-1.jpg",
    });

    vi.mocked(TokenBalanceManager.hasEnoughTokens).mockResolvedValueOnce(false);

    const req = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
      body: JSON.stringify({ imageId: "img-1", tier: "TIER_4K" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(402);
  });

  it("should return 429 if rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limiter");

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      isLimited: true,
      resetAt: Date.now() + 60000,
      remaining: 0,
    });

    const req = new NextRequest("http://localhost/api/images/enhance", {
      method: "POST",
      body: JSON.stringify({ imageId: "img-1", tier: "TIER_4K" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});
