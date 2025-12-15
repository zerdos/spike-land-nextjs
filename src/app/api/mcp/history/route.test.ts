import { JobStatus, McpJobType } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies using vi.hoisted
const { mockAuthenticateMcpOrSession, mockCheckRateLimit, mockGetJobHistory } = vi.hoisted(
  () => ({
    mockAuthenticateMcpOrSession: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockGetJobHistory: vi.fn(),
  }),
);

vi.mock("@/lib/mcp/auth", () => ({
  authenticateMcpOrSession: mockAuthenticateMcpOrSession,
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: mockCheckRateLimit,
  rateLimitConfigs: {
    mcpJobStatus: { windowMs: 60000, max: 60 },
  },
}));

vi.mock("@/lib/mcp/generation-service", () => ({
  getJobHistory: mockGetJobHistory,
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

// Helper to create mock NextRequest with URL and query params
function createMockRequest(
  headers: Record<string, string> = {},
  queryParams: Record<string, string> = {},
): NextRequest {
  const url = new URL("http://localhost/api/mcp/history");
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    headers: {
      get: (name: string) => headers[name] || null,
    },
    nextUrl: url,
  } as unknown as NextRequest;
}

describe("GET /api/mcp/history", () => {
  const testUserId = "test-user-123";
  const mockDate = new Date("2024-01-15T12:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful auth
    mockAuthenticateMcpOrSession.mockResolvedValue({
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
      mockAuthenticateMcpOrSession.mockResolvedValue({
        success: false,
        error: "Authentication required. Provide an API key or sign in.",
      });

      const request = createMockRequest({});
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toContain("Authentication required");
    });

    it("should accept API key auth", async () => {
      mockAuthenticateMcpOrSession.mockResolvedValue({
        success: true,
        userId: testUserId,
        apiKeyId: "api-key-123",
      });
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({
        Authorization: "Bearer sk_test_validkey",
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockAuthenticateMcpOrSession).toHaveBeenCalledWith(request);
    });

    it("should accept session auth", async () => {
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({}); // No Authorization header = session auth
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe("rate limiting", () => {
    it("should return 429 when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue({
        isLimited: true,
        resetAt: Date.now() + 30000,
      });

      const request = createMockRequest({
        Authorization: "Bearer sk_test_validkey",
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBe("Rate limit exceeded");
    });
  });

  describe("query parameters", () => {
    it("should use default limit and offset", async () => {
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({});
      await GET(request);

      expect(mockGetJobHistory).toHaveBeenCalledWith(testUserId, {
        limit: 20,
        offset: 0,
        type: undefined,
      });
    });

    it("should respect custom limit", async () => {
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({}, { limit: "50" });
      await GET(request);

      expect(mockGetJobHistory).toHaveBeenCalledWith(testUserId, {
        limit: 50,
        offset: 0,
        type: undefined,
      });
    });

    it("should cap limit at 100", async () => {
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({}, { limit: "200" });
      await GET(request);

      expect(mockGetJobHistory).toHaveBeenCalledWith(testUserId, {
        limit: 100,
        offset: 0,
        type: undefined,
      });
    });

    it("should handle invalid limit", async () => {
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({}, { limit: "invalid" });
      await GET(request);

      expect(mockGetJobHistory).toHaveBeenCalledWith(testUserId, {
        limit: 20,
        offset: 0,
        type: undefined,
      });
    });

    it("should respect custom offset", async () => {
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({}, { offset: "40" });
      await GET(request);

      expect(mockGetJobHistory).toHaveBeenCalledWith(testUserId, {
        limit: 20,
        offset: 40,
        type: undefined,
      });
    });

    it("should handle negative offset", async () => {
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({}, { offset: "-10" });
      await GET(request);

      expect(mockGetJobHistory).toHaveBeenCalledWith(testUserId, {
        limit: 20,
        offset: 0,
        type: undefined,
      });
    });

    it("should filter by GENERATE type", async () => {
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({}, { type: "GENERATE" });
      await GET(request);

      expect(mockGetJobHistory).toHaveBeenCalledWith(testUserId, {
        limit: 20,
        offset: 0,
        type: McpJobType.GENERATE,
      });
    });

    it("should filter by MODIFY type", async () => {
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({}, { type: "MODIFY" });
      await GET(request);

      expect(mockGetJobHistory).toHaveBeenCalledWith(testUserId, {
        limit: 20,
        offset: 0,
        type: McpJobType.MODIFY,
      });
    });

    it("should ignore invalid type filter", async () => {
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({}, { type: "INVALID" });
      await GET(request);

      expect(mockGetJobHistory).toHaveBeenCalledWith(testUserId, {
        limit: 20,
        offset: 0,
        type: undefined,
      });
    });
  });

  describe("success cases", () => {
    it("should return job history with jobs", async () => {
      const mockJobs = [
        {
          id: "job1",
          type: McpJobType.GENERATE,
          tier: "TIER_1K",
          tokensCost: 2,
          status: JobStatus.COMPLETED,
          prompt: "Test prompt 1",
          inputImageUrl: null,
          outputImageUrl: "https://example.com/output1.jpg",
          outputWidth: 1024,
          outputHeight: 1024,
          createdAt: mockDate,
          processingCompletedAt: mockDate,
          apiKeyName: "Test Key",
        },
        {
          id: "job2",
          type: McpJobType.MODIFY,
          tier: "TIER_2K",
          tokensCost: 5,
          status: JobStatus.PROCESSING,
          prompt: "Test prompt 2",
          inputImageUrl: "https://example.com/input.jpg",
          outputImageUrl: null,
          outputWidth: null,
          outputHeight: null,
          createdAt: mockDate,
          processingCompletedAt: null,
          apiKeyName: null,
        },
      ];

      mockGetJobHistory.mockResolvedValue({
        jobs: mockJobs,
        total: 50,
        hasMore: true,
      });

      const request = createMockRequest({});
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.jobs).toHaveLength(2);
      expect(body.total).toBe(50);
      expect(body.hasMore).toBe(true);
    });

    it("should return empty array when no jobs", async () => {
      mockGetJobHistory.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });

      const request = createMockRequest({});
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.jobs).toEqual([]);
      expect(body.total).toBe(0);
      expect(body.hasMore).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should return 500 when getJobHistory throws", async () => {
      mockGetJobHistory.mockRejectedValue(new Error("Database error"));

      const request = createMockRequest({});
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to fetch job history");
    });
  });
});
