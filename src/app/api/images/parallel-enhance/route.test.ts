import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoist mocks before imports
const {
  mockPrisma,
  mockAuth,
  mockRateLimit,
  mockEnhanceImageDirect,
  mockLogger,
  mockTokenBalanceManager,
} = vi.hoisted(() => {
  return {
    mockPrisma: {
      enhancedImage: {
        findUnique: vi.fn(),
      },
      imageEnhancementJob: {
        create: vi.fn(),
        update: vi.fn(),
      },
      userTokenBalance: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      user: {
        upsert: vi.fn(),
      },
      tokenTransaction: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    mockAuth: vi.fn(),
    mockRateLimit: vi.fn(),
    mockEnhanceImageDirect: vi.fn(),
    mockLogger: {
      child: vi.fn(() => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      })),
    },
    mockTokenBalanceManager: {
      hasEnoughTokens: vi.fn(),
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mockRateLimit,
  rateLimitConfigs: { imageEnhancement: {} },
}));

vi.mock("@/workflows/enhance-image.direct", () => ({
  enhanceImageDirect: mockEnhanceImageDirect,
}));

// Mock next/server after() function
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((callback: () => Promise<void>) => {
      // Execute callback immediately in tests, handling any errors
      Promise.resolve().then(callback).catch(() => {
        // Errors in after() callbacks are logged, not thrown
      });
    }),
  };
});

vi.mock("@/lib/errors/structured-logger", () => ({
  generateRequestId: vi.fn(() => "test-request-id"),
  logger: mockLogger,
}));

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: mockTokenBalanceManager,
}));

// Import the route AFTER mocks are set up
import { POST } from "./route";

// Helper to create mock request
function createMockRequest(body: unknown): NextRequest {
  const req = new NextRequest("http://localhost/api/images/parallel-enhance", {
    method: "POST",
  });
  req.json = vi.fn().mockResolvedValue(body);
  return req;
}

describe("POST /api/images/parallel-enhance", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set default mock return values
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockRateLimit.mockResolvedValue({ isLimited: false });
    mockTokenBalanceManager.hasEnoughTokens.mockResolvedValue(true);
    mockEnhanceImageDirect.mockResolvedValue(undefined);
  });

  // ========================================
  // 1. Authentication Tests (3 tests)
  // ========================================

  describe("Authentication", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("should return 401 if user id is missing", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { name: "Test", email: "test@example.com" },
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should proceed when authenticated", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 95,
      });

      mockPrisma.imageEnhancementJob.create.mockResolvedValue({
        id: "job-1",
        tier: "TIER_2K",
        tokensCost: 5,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // 2. Rate Limiting Tests (2 tests)
  // ========================================

  describe("Rate Limiting", () => {
    it("should return 429 when rate limited with retry headers", async () => {
      const resetAt = Date.now() + 60000;

      mockRateLimit.mockResolvedValueOnce({
        isLimited: true,
        resetAt,
        remaining: 0,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.retryAfter).toBeDefined();
      expect(res.headers.get("Retry-After")).toBeDefined();
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(res.headers.get("X-RateLimit-Reset")).toBe(String(resetAt));
      expect(res.headers.get("X-Request-ID")).toBe("test-request-id");
    });

    it("should proceed when within rate limit", async () => {
      mockRateLimit.mockResolvedValueOnce({
        isLimited: false,
      });

      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 95,
      });

      mockPrisma.imageEnhancementJob.create.mockResolvedValue({
        id: "job-1",
        tier: "TIER_2K",
        tokensCost: 5,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // 3. Input Validation Tests (7 tests)
  // ========================================

  describe("Input Validation", () => {
    it("should return 400 when imageId is missing", async () => {
      const req = createMockRequest({
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.suggestion).toContain("imageId");
    });

    it("should return 400 when tiers is missing", async () => {
      const req = createMockRequest({
        imageId: "img-1",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.suggestion).toContain("array of tiers");
    });

    it("should return 400 when tiers is not an array", async () => {
      const req = createMockRequest({
        imageId: "img-1",
        tiers: "TIER_2K",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 when tiers array is empty", async () => {
      const req = createMockRequest({
        imageId: "img-1",
        tiers: [],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.suggestion).toContain("1-3 enhancement tiers");
    });

    it("should return 400 when more than 3 tiers provided", async () => {
      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_1K", "TIER_2K", "TIER_4K", "TIER_1K"],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.suggestion).toContain("1-3 enhancement tiers");
    });

    it("should return 400 when duplicate tiers provided", async () => {
      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K", "TIER_2K"],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.suggestion).toContain("Each tier can only be selected once");
    });

    it("should return 400 when invalid tier names provided", async () => {
      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["INVALID_TIER", "TIER_2K"],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.suggestion).toContain("valid enhancement tiers");
    });
  });

  // ========================================
  // 4. Authorization Tests (2 tests)
  // ========================================

  describe("Authorization", () => {
    it("should return 404 when image not found", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue(null);

      const req = createMockRequest({
        imageId: "nonexistent",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("should return 404 when image belongs to different user", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "other-user-456",
        originalR2Key: "originals/img-1.jpg",
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });
  });

  // ========================================
  // 5. Token Management Tests (4 tests)
  // ========================================

  describe("Token Management", () => {
    it("should return 402 when insufficient tokens", async () => {
      mockTokenBalanceManager.hasEnoughTokens.mockResolvedValueOnce(false);

      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_4K"],
      });
      const res = await POST(req);
      expect(res.status).toBe(402);
      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.required).toBe(10);
    });

    it("should calculate correct cost for single tier", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 98,
      });

      mockPrisma.imageEnhancementJob.create.mockResolvedValue({
        id: "job-1",
        tier: "TIER_1K",
        tokensCost: 2,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_1K"],
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.totalCost).toBe(2);
    });

    it("should calculate correct cost for multiple tiers", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 83,
      });

      let callCount = 0;
      mockPrisma.imageEnhancementJob.create.mockImplementation(() => {
        callCount++;
        const tiers = ["TIER_1K", "TIER_2K", "TIER_4K"];
        const costs = [2, 5, 10];
        return Promise.resolve({
          id: `job-${callCount}`,
          tier: tiers[callCount - 1],
          tokensCost: costs[callCount - 1],
        });
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_1K", "TIER_2K", "TIER_4K"],
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.totalCost).toBe(17); // 2 + 5 + 10
    });

    it("should deduct tokens correctly in transaction", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 90,
      });

      mockPrisma.imageEnhancementJob.create.mockResolvedValue({
        id: "job-1",
        tier: "TIER_4K",
        tokensCost: 10,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_4K"],
      });
      await POST(req);

      expect(mockPrisma.userTokenBalance.update).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        data: {
          balance: {
            decrement: 10,
          },
        },
      });
    });
  });

  // ========================================
  // 6. Transaction & Job Creation Tests (6 tests)
  // ========================================

  describe("Transaction & Job Creation", () => {
    it("should create token balance if it does not exist", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      // First call returns null (no balance), second call returns created balance
      mockPrisma.userTokenBalance.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          userId: "user-123",
          balance: 0,
        });

      mockPrisma.userTokenBalance.create.mockResolvedValue({
        userId: "user-123",
        balance: 0,
        lastRegeneration: new Date(),
      });

      mockPrisma.user.upsert.mockResolvedValue({
        id: "user-123",
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });

      // This should fail with insufficient tokens since balance is 0
      const res = await POST(req);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { id: "user-123" },
        update: {},
        create: { id: "user-123" },
      });

      expect(mockPrisma.userTokenBalance.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          balance: 0,
          lastRegeneration: expect.any(Date),
        },
      });

      // Should fail due to insufficient balance
      expect(res.status).toBe(500); // Transaction throws error
    });

    it("should create token transaction record", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 95,
      });

      mockPrisma.tokenTransaction.create.mockResolvedValue({
        id: "txn-1",
        userId: "user-123",
        amount: -5,
        type: "SPEND_ENHANCEMENT",
        source: "parallel_image_enhancement",
        sourceId: "img-1",
        balanceAfter: 95,
      });

      mockPrisma.imageEnhancementJob.create.mockResolvedValue({
        id: "job-1",
        tier: "TIER_2K",
        tokensCost: 5,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      await POST(req);

      expect(mockPrisma.tokenTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          amount: -5,
          type: "SPEND_ENHANCEMENT",
          source: "parallel_image_enhancement",
          sourceId: "img-1",
          balanceAfter: 95,
          metadata: {
            tiers: ["TIER_2K"],
            requestId: "test-request-id",
          },
        },
      });
    });

    it("should create job for each tier", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 83,
      });

      let callCount = 0;
      mockPrisma.imageEnhancementJob.create.mockImplementation(() => {
        callCount++;
        const tiers = ["TIER_1K", "TIER_2K", "TIER_4K"];
        const costs = [2, 5, 10];
        return Promise.resolve({
          id: `job-${callCount}`,
          tier: tiers[callCount - 1],
          tokensCost: costs[callCount - 1],
        });
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_1K", "TIER_2K", "TIER_4K"],
      });
      await POST(req);

      expect(mockPrisma.imageEnhancementJob.create).toHaveBeenCalledTimes(3);
    });

    it("should return newBalance in response", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 95,
      });

      mockPrisma.imageEnhancementJob.create.mockResolvedValue({
        id: "job-1",
        tier: "TIER_2K",
        tokensCost: 5,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.newBalance).toBe(95);
    });

    it("should handle transaction failure when insufficient balance in transaction", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        // Mock the transaction to throw error due to insufficient balance
        mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
          userId: "user-123",
          balance: 3, // Less than required 5
        });

        return callback(mockPrisma);
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
    });

    it("should handle transaction failure gracefully", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockRejectedValue(
        new Error("Database transaction failed"),
      );

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // 7. Background Execution Tests (3 tests)
  // ========================================

  describe("Background Execution", () => {
    it("should call enhanceImageDirect for background processing", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 95,
      });

      mockPrisma.imageEnhancementJob.create.mockResolvedValue({
        id: "job-1",
        tier: "TIER_2K",
        tokensCost: 5,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      await POST(req);

      // Wait a bit for async promises (after() executes immediately in test)
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockEnhanceImageDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: "job-1",
          imageId: "img-1",
          userId: "user-123",
          originalR2Key: "originals/img-1.jpg",
          tier: "TIER_2K",
          tokensCost: 5,
        }),
      );
    });

    it("should handle enhanceImageDirect failure gracefully", async () => {
      mockEnhanceImageDirect.mockRejectedValue(new Error("Enhancement failed"));

      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 95,
      });

      mockPrisma.imageEnhancementJob.create.mockResolvedValue({
        id: "job-1",
        tier: "TIER_2K",
        tokensCost: 5,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);

      // Wait a bit for async promises and error handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should still return 200 - error is caught and logged (fire-and-forget)
      expect(res.status).toBe(200);
    });

    it("should handle non-Error in enhanceImageDirect failure", async () => {
      mockEnhanceImageDirect.mockRejectedValue("String error");

      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 95,
      });

      mockPrisma.imageEnhancementJob.create.mockResolvedValue({
        id: "job-1",
        tier: "TIER_2K",
        tokensCost: 5,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);

      // Wait a bit for async promises and error handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should still return 200
      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // 8. Response Tests (3 tests)
  // ========================================

  describe("Response", () => {
    it("should return correct success response structure", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 95,
      });

      mockPrisma.imageEnhancementJob.create.mockResolvedValue({
        id: "job-1",
        tier: "TIER_2K",
        tokensCost: 5,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data).toEqual({
        success: true,
        jobs: expect.any(Array),
        totalCost: 5,
        newBalance: 95,
      });
    });

    it("should return correct jobs array structure", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 83,
      });

      let callCount = 0;
      mockPrisma.imageEnhancementJob.create.mockImplementation(() => {
        callCount++;
        const tiers = ["TIER_1K", "TIER_2K", "TIER_4K"];
        const costs = [2, 5, 10];
        return Promise.resolve({
          id: `job-${callCount}`,
          tier: tiers[callCount - 1],
          tokensCost: costs[callCount - 1],
        });
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_1K", "TIER_2K", "TIER_4K"],
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.jobs).toHaveLength(3);
      expect(data.jobs[0]).toEqual({
        jobId: "job-1",
        tier: "TIER_1K",
        tokenCost: 2,
        status: "PROCESSING",
      });
      expect(data.jobs[1]).toEqual({
        jobId: "job-2",
        tier: "TIER_2K",
        tokenCost: 5,
        status: "PROCESSING",
      });
      expect(data.jobs[2]).toEqual({
        jobId: "job-3",
        tier: "TIER_4K",
        tokenCost: 10,
        status: "PROCESSING",
      });
    });

    it("should include request ID in response headers", async () => {
      mockPrisma.enhancedImage.findUnique.mockResolvedValue({
        id: "img-1",
        userId: "user-123",
        originalR2Key: "originals/img-1.jpg",
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.userTokenBalance.findUnique.mockResolvedValue({
        userId: "user-123",
        balance: 100,
      });

      mockPrisma.userTokenBalance.update.mockResolvedValue({
        userId: "user-123",
        balance: 95,
      });

      mockPrisma.imageEnhancementJob.create.mockResolvedValue({
        id: "job-1",
        tier: "TIER_2K",
        tokensCost: 5,
      });

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);

      expect(res.headers.get("X-Request-ID")).toBe("test-request-id");
    });
  });

  // ========================================
  // 9. Error Handling Tests (2 tests)
  // ========================================

  describe("Error Handling", () => {
    it("should return 500 on unexpected errors", async () => {
      mockPrisma.enhancedImage.findUnique.mockRejectedValue(
        new Error("Unexpected database error"),
      );

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(res.headers.get("X-Request-ID")).toBe("test-request-id");
    });

    it("should return user-friendly error messages", async () => {
      mockPrisma.enhancedImage.findUnique.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data).toHaveProperty("error");
      expect(data).toHaveProperty("title");
      expect(data).toHaveProperty("suggestion");
    });

    it("should handle non-Error exceptions", async () => {
      mockPrisma.enhancedImage.findUnique.mockRejectedValue("String error");

      const req = createMockRequest({
        imageId: "img-1",
        tiers: ["TIER_2K"],
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });
});
