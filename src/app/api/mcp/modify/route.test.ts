import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies using vi.hoisted
const {
  mockAuthenticateMcpOrSession,
  mockCheckRateLimit,
  mockCreateModificationJob,
} = vi.hoisted(
  () => ({
    mockAuthenticateMcpOrSession: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockCreateModificationJob: vi.fn(),
  }),
);

vi.mock("@/lib/mcp/auth", () => ({
  authenticateMcpOrSession: mockAuthenticateMcpOrSession,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mockCheckRateLimit,
  rateLimitConfigs: {
    mcpModify: { windowMs: 60000, max: 10 },
  },
}));

vi.mock("@/lib/mcp/generation-service", () => ({
  createModificationJob: mockCreateModificationJob,
}));

vi.mock("@/lib/tokens/costs", () => ({
  EnhancementTier: {},
  MCP_GENERATION_COSTS: {
    TIER_1K: 2,
    TIER_2K: 5,
    TIER_4K: 10,
  },
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

// Small test image in base64 (1x1 pixel PNG)
const SMALL_TEST_IMAGE =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Helper to create mock NextRequest with JSON body
function createMockRequest(
  headers: Record<string, string> = {},
  body: Record<string, unknown> | null = null,
): NextRequest {
  return {
    headers: {
      get: (name: string) => headers[name] || null,
    },
    json: body !== null
      ? vi.fn().mockResolvedValue(body)
      : vi.fn().mockRejectedValue(new Error("Invalid JSON")),
  } as unknown as NextRequest;
}

describe("POST /api/mcp/modify", () => {
  const testUserId = "test-user-123";
  const testApiKeyId = "api-key-456";
  const testJobId = "job-789";

  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful auth
    mockAuthenticateMcpOrSession.mockResolvedValue({
      success: true,
      userId: testUserId,
      apiKeyId: testApiKeyId,
    });
    // Default no rate limit
    mockCheckRateLimit.mockResolvedValue({
      isLimited: false,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("authentication", () => {
    it("should return 401 when authentication fails", async () => {
      mockAuthenticateMcpOrSession.mockResolvedValue({
        success: false,
        error: "Invalid API key",
      });

      const request = createMockRequest({}, {
        prompt: "test",
        tier: "TIER_1K",
        image: SMALL_TEST_IMAGE,
        mimeType: "image/png",
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Invalid API key");
    });
  });

  describe("rate limiting", () => {
    it("should return 429 when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue({
        isLimited: true,
        resetAt: Date.now() + 30000,
      });

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        {
          prompt: "test",
          tier: "TIER_1K",
          image: SMALL_TEST_IMAGE,
          mimeType: "image/png",
        },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBe("Rate limit exceeded");
    });
  });

  describe("validation", () => {
    it("should return 400 for invalid JSON body", async () => {
      const request = createMockRequest({
        Authorization: "Bearer sk_test_validkey",
      }, null);
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid JSON body");
    });

    it("should return 400 when prompt is missing", async () => {
      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { tier: "TIER_1K", image: SMALL_TEST_IMAGE, mimeType: "image/png" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Prompt is required");
    });

    it("should return 400 when prompt is too long", async () => {
      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        {
          prompt: "a".repeat(4001),
          tier: "TIER_1K",
          image: SMALL_TEST_IMAGE,
          mimeType: "image/png",
        },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Prompt must be 4000 characters or less");
    });

    it("should return 400 when tier is invalid", async () => {
      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        {
          prompt: "Add a rainbow",
          tier: "TIER_INVALID",
          image: SMALL_TEST_IMAGE,
          mimeType: "image/png",
        },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Invalid tier");
      expect(body.pricing).toBeDefined();
    });

    it("should return 400 when image is missing", async () => {
      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { prompt: "Add a rainbow", tier: "TIER_1K", mimeType: "image/png" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Image is required (base64 encoded)");
    });

    it("should return 400 when mimeType is missing", async () => {
      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { prompt: "Add a rainbow", tier: "TIER_1K", image: SMALL_TEST_IMAGE },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Invalid mimeType");
    });

    it("should return 400 when mimeType is invalid", async () => {
      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        {
          prompt: "Add a rainbow",
          tier: "TIER_1K",
          image: SMALL_TEST_IMAGE,
          mimeType: "image/bmp",
        },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Invalid mimeType");
    });

    it("should return 400 when image is too large", async () => {
      // Create a large base64 string that exceeds 20MB when decoded
      // 20MB = 20 * 1024 * 1024 bytes
      // Base64 encoding increases size by ~33%, so we need about 28MB of base64
      // For testing, we'll mock the Buffer.from to return a large length
      const originalFrom = Buffer.from;
      vi.spyOn(Buffer, "from").mockImplementation((data, encoding) => {
        if (encoding === "base64") {
          return { length: 25 * 1024 * 1024 } as Buffer; // 25MB
        }
        return originalFrom(data as string, encoding);
      });

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        {
          prompt: "Add a rainbow",
          tier: "TIER_1K",
          image: "largeimagedata",
          mimeType: "image/png",
        },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Image too large");

      vi.restoreAllMocks();
    });
  });

  describe("success cases", () => {
    it("should create modification job successfully", async () => {
      mockCreateModificationJob.mockResolvedValue({
        success: true,
        jobId: testJobId,
        tokensCost: 2,
      });

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        {
          prompt: "Add a rainbow",
          tier: "TIER_1K",
          image: SMALL_TEST_IMAGE,
          mimeType: "image/png",
        },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.jobId).toBe(testJobId);
      expect(body.tokensCost).toBe(2);
      expect(body.message).toContain("Poll /api/mcp/jobs/");

      expect(mockCreateModificationJob).toHaveBeenCalledWith({
        userId: testUserId,
        apiKeyId: testApiKeyId,
        prompt: "Add a rainbow",
        tier: "TIER_1K",
        imageData: SMALL_TEST_IMAGE,
        mimeType: "image/png",
      });
    });

    it("should accept different image formats", async () => {
      mockCreateModificationJob.mockResolvedValue({
        success: true,
        jobId: testJobId,
        tokensCost: 5,
      });

      for (
        const mimeType of ["image/jpeg", "image/png", "image/webp", "image/gif"]
      ) {
        const request = createMockRequest(
          { Authorization: "Bearer sk_test_validkey" },
          {
            prompt: "Add a rainbow",
            tier: "TIER_2K",
            image: SMALL_TEST_IMAGE,
            mimeType,
          },
        );
        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });
  });

  describe("error handling", () => {
    it("should return 402 when insufficient tokens", async () => {
      mockCreateModificationJob.mockResolvedValue({
        success: false,
        error: "Insufficient tokens",
      });

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        {
          prompt: "Add a rainbow",
          tier: "TIER_4K",
          image: SMALL_TEST_IMAGE,
          mimeType: "image/png",
        },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(402);
      expect(body.error).toBe("Insufficient tokens");
    });

    it("should return 500 when modification service fails", async () => {
      mockCreateModificationJob.mockResolvedValue({
        success: false,
        error: "Internal error",
      });

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        {
          prompt: "Add a rainbow",
          tier: "TIER_1K",
          image: SMALL_TEST_IMAGE,
          mimeType: "image/png",
        },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Internal error");
    });

    it("should return 500 when createModificationJob throws", async () => {
      mockCreateModificationJob.mockRejectedValue(new Error("Database error"));

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        {
          prompt: "Add a rainbow",
          tier: "TIER_1K",
          image: SMALL_TEST_IMAGE,
          mimeType: "image/png",
        },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to start image modification");
    });
  });
});
