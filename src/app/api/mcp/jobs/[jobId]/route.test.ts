import { JobStatus, McpJobType } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies using vi.hoisted
const { mockAuthenticateMcpRequest, mockCheckRateLimit, mockGetJob } = vi.hoisted(() => ({
  mockAuthenticateMcpRequest: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockGetJob: vi.fn(),
}));

vi.mock("@/lib/mcp/auth", () => ({
  authenticateMcpRequest: mockAuthenticateMcpRequest,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mockCheckRateLimit,
  rateLimitConfigs: {
    mcpJobStatus: { windowMs: 60000, max: 60 },
  },
}));

vi.mock("@/lib/mcp/generation-service", () => ({
  getJob: mockGetJob,
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

// Helper to create mock NextRequest
function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get: (name: string) => headers[name] || null,
    },
  } as unknown as NextRequest;
}

// Helper to create route params
function createRouteParams(jobId: string) {
  return {
    params: Promise.resolve({ jobId }),
  };
}

describe("GET /api/mcp/jobs/[jobId]", () => {
  const testUserId = "test-user-123";
  const testJobId = "job-789";
  const mockDate = new Date("2024-01-15T12:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful auth
    mockAuthenticateMcpRequest.mockResolvedValue({
      success: true,
      userId: testUserId,
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
      mockAuthenticateMcpRequest.mockResolvedValue({
        success: false,
        error: "Invalid API key",
      });

      const request = createMockRequest({});
      const response = await GET(request, createRouteParams(testJobId));
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

      const request = createMockRequest({ Authorization: "Bearer sk_test_validkey" });
      const response = await GET(request, createRouteParams(testJobId));
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBe("Rate limit exceeded");
      expect(body.retryAfter).toBeDefined();
    });
  });

  describe("success cases", () => {
    it("should return completed generation job details", async () => {
      const mockJob = {
        id: testJobId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        tokensCost: 2,
        status: JobStatus.COMPLETED,
        prompt: "A beautiful sunset",
        inputImageUrl: null,
        outputImageUrl: "https://example.com/output.jpg",
        outputWidth: 1024,
        outputHeight: 1024,
        errorMessage: null,
        createdAt: mockDate,
        processingStartedAt: mockDate,
        processingCompletedAt: mockDate,
      };

      mockGetJob.mockResolvedValue(mockJob);

      const request = createMockRequest({ Authorization: "Bearer sk_test_validkey" });
      const response = await GET(request, createRouteParams(testJobId));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.id).toBe(testJobId);
      expect(body.type).toBe(McpJobType.GENERATE);
      expect(body.tier).toBe("TIER_1K");
      expect(body.tokensCost).toBe(2);
      expect(body.status).toBe(JobStatus.COMPLETED);
      expect(body.prompt).toBe("A beautiful sunset");
      expect(body.inputImageUrl).toBeNull();
      expect(body.outputImageUrl).toBe("https://example.com/output.jpg");
      expect(body.outputWidth).toBe(1024);
      expect(body.outputHeight).toBe(1024);
      expect(body.errorMessage).toBeNull();
      expect(body.createdAt).toBe(mockDate.toISOString());
      expect(body.processingStartedAt).toBe(mockDate.toISOString());
      expect(body.processingCompletedAt).toBe(mockDate.toISOString());

      expect(mockGetJob).toHaveBeenCalledWith(testJobId, testUserId);
    });

    it("should return processing modification job details", async () => {
      const mockJob = {
        id: testJobId,
        type: McpJobType.MODIFY,
        tier: "TIER_2K",
        tokensCost: 5,
        status: JobStatus.PROCESSING,
        prompt: "Add a rainbow",
        inputImageUrl: "https://example.com/input.jpg",
        outputImageUrl: null,
        outputWidth: null,
        outputHeight: null,
        errorMessage: null,
        createdAt: mockDate,
        processingStartedAt: mockDate,
        processingCompletedAt: null,
      };

      mockGetJob.mockResolvedValue(mockJob);

      const request = createMockRequest({ Authorization: "Bearer sk_test_validkey" });
      const response = await GET(request, createRouteParams(testJobId));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.type).toBe(McpJobType.MODIFY);
      expect(body.status).toBe(JobStatus.PROCESSING);
      expect(body.inputImageUrl).toBe("https://example.com/input.jpg");
      expect(body.outputImageUrl).toBeNull();
      expect(body.processingCompletedAt).toBeNull();
    });

    it("should return failed job with error message", async () => {
      const mockJob = {
        id: testJobId,
        type: McpJobType.GENERATE,
        tier: "TIER_4K",
        tokensCost: 10,
        status: JobStatus.FAILED,
        prompt: "Test",
        inputImageUrl: null,
        outputImageUrl: null,
        outputWidth: null,
        outputHeight: null,
        errorMessage: "AI generation failed",
        createdAt: mockDate,
        processingStartedAt: mockDate,
        processingCompletedAt: mockDate,
      };

      mockGetJob.mockResolvedValue(mockJob);

      const request = createMockRequest({ Authorization: "Bearer sk_test_validkey" });
      const response = await GET(request, createRouteParams(testJobId));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe(JobStatus.FAILED);
      expect(body.errorMessage).toBe("AI generation failed");
    });
  });

  describe("not found", () => {
    it("should return 404 for non-existent job", async () => {
      mockGetJob.mockResolvedValue(null);

      const request = createMockRequest({ Authorization: "Bearer sk_test_validkey" });
      const response = await GET(request, createRouteParams("nonexistent-job"));
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Job not found");
    });

    it("should return 404 when job belongs to different user", async () => {
      // The getJob function returns null if job doesn't belong to user
      mockGetJob.mockResolvedValue(null);

      const request = createMockRequest({ Authorization: "Bearer sk_test_validkey" });
      const response = await GET(request, createRouteParams(testJobId));
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Job not found");

      // Verify getJob was called with correct userId
      expect(mockGetJob).toHaveBeenCalledWith(testJobId, testUserId);
    });
  });

  describe("error handling", () => {
    it("should return 500 when getJob throws", async () => {
      mockGetJob.mockRejectedValue(new Error("Database error"));

      const request = createMockRequest({ Authorization: "Bearer sk_test_validkey" });
      const response = await GET(request, createRouteParams(testJobId));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to fetch job status");
    });
  });

  describe("authorization scope", () => {
    it("should only fetch job for authenticated user", async () => {
      mockGetJob.mockResolvedValue({
        id: testJobId,
        type: McpJobType.GENERATE,
        tier: "TIER_1K",
        tokensCost: 2,
        status: JobStatus.COMPLETED,
        prompt: "Test",
        inputImageUrl: null,
        outputImageUrl: "https://example.com/output.jpg",
        outputWidth: 1024,
        outputHeight: 1024,
        errorMessage: null,
        createdAt: mockDate,
        processingStartedAt: mockDate,
        processingCompletedAt: mockDate,
      });

      const request = createMockRequest({ Authorization: "Bearer sk_test_validkey" });
      await GET(request, createRouteParams(testJobId));

      // Verify getJob was called with the authenticated user's ID
      expect(mockGetJob).toHaveBeenCalledWith(testJobId, testUserId);
    });
  });
});
