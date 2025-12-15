import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies using vi.hoisted
const {
  mockAuthenticateMcpOrSession,
  mockCheckRateLimit,
  mockCreateGenerationJob,
} = vi.hoisted(
  () => ({
    mockAuthenticateMcpOrSession: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockCreateGenerationJob: vi.fn(),
  }),
);

vi.mock("@/lib/mcp/auth", () => ({
  authenticateMcpOrSession: mockAuthenticateMcpOrSession,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mockCheckRateLimit,
  rateLimitConfigs: {
    mcpGenerate: { windowMs: 60000, max: 10 },
  },
}));

vi.mock("@/lib/mcp/generation-service", () => ({
  createGenerationJob: mockCreateGenerationJob,
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

describe("POST /api/mcp/generate", () => {
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
        error: "Missing Authorization header",
      });

      const request = createMockRequest({}, {
        prompt: "test",
        tier: "TIER_1K",
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Missing Authorization header");
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
        { prompt: "test", tier: "TIER_1K" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBe("Rate limit exceeded");
      expect(body.retryAfter).toBeDefined();
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
        { tier: "TIER_1K" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Prompt is required");
    });

    it("should return 400 when prompt is empty", async () => {
      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { prompt: "   ", tier: "TIER_1K" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Prompt is required");
    });

    it("should return 400 when prompt is too long", async () => {
      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { prompt: "a".repeat(4001), tier: "TIER_1K" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Prompt must be 4000 characters or less");
    });

    it("should return 400 when tier is missing", async () => {
      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { prompt: "A beautiful sunset" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Invalid tier");
    });

    it("should return 400 when tier is invalid", async () => {
      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { prompt: "A beautiful sunset", tier: "TIER_8K" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Invalid tier");
      expect(body.pricing).toBeDefined();
    });
  });

  describe("success cases", () => {
    it("should create generation job successfully", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: testJobId,
        tokensCost: 2,
      });

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { prompt: "A beautiful sunset", tier: "TIER_1K" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.jobId).toBe(testJobId);
      expect(body.tokensCost).toBe(2);
      expect(body.message).toContain("Poll /api/mcp/jobs/");

      expect(mockCreateGenerationJob).toHaveBeenCalledWith({
        userId: testUserId,
        apiKeyId: testApiKeyId,
        prompt: "A beautiful sunset",
        tier: "TIER_1K",
        negativePrompt: undefined,
      });
    });

    it("should handle negative prompt", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: testJobId,
        tokensCost: 5,
      });

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        {
          prompt: "A beautiful sunset",
          tier: "TIER_2K",
          negativePrompt: "blurry, dark",
        },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);

      expect(mockCreateGenerationJob).toHaveBeenCalledWith({
        userId: testUserId,
        apiKeyId: testApiKeyId,
        prompt: "A beautiful sunset",
        tier: "TIER_2K",
        negativePrompt: "blurry, dark",
      });
    });

    it("should trim prompt whitespace", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: testJobId,
        tokensCost: 2,
      });

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { prompt: "  A beautiful sunset  ", tier: "TIER_1K" },
      );
      await POST(request);

      expect(mockCreateGenerationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "A beautiful sunset",
        }),
      );
    });
  });

  describe("error handling", () => {
    it("should return 402 when insufficient tokens", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: false,
        error: "Insufficient tokens",
      });

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { prompt: "A beautiful sunset", tier: "TIER_1K" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(402);
      expect(body.error).toBe("Insufficient tokens");
    });

    it("should return 500 when generation service fails", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: false,
        error: "Internal error",
      });

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { prompt: "A beautiful sunset", tier: "TIER_1K" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Internal error");
    });

    it("should return 500 when createGenerationJob throws", async () => {
      mockCreateGenerationJob.mockRejectedValue(new Error("Database error"));

      const request = createMockRequest(
        { Authorization: "Bearer sk_test_validkey" },
        { prompt: "A beautiful sunset", tier: "TIER_1K" },
      );
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to start image generation");
    });
  });
});
