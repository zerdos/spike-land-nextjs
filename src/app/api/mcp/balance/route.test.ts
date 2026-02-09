import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies using vi.hoisted
const {
  mockAuthenticateMcpOrSession,
  mockCheckRateLimit,
  mockWorkspaceCreditManager,
} = vi.hoisted(
  () => ({
    mockAuthenticateMcpOrSession: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockWorkspaceCreditManager: {
      getBalance: vi.fn(),
    },
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

vi.mock("@/lib/credits/workspace-credit-manager", () => ({
  WorkspaceCreditManager: mockWorkspaceCreditManager,
}));

import type { NextRequest } from "next/server";
import { GET } from "./route";

// Helper to create mock NextRequest
function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get: (name: string) => headers[name] || null,
    },
  } as unknown as NextRequest;
}

describe("GET /api/mcp/balance", () => {
  const testUserId = "test-user-123";
  const testWorkspaceId = "workspace-456";

  beforeEach(() => {
    vi.clearAllMocks();
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

      const request = createMockRequest({});
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Missing Authorization header");
    });

    it("should return 401 for invalid API key", async () => {
      mockAuthenticateMcpOrSession.mockResolvedValue({
        success: false,
        error: "Invalid API key",
      });

      const request = createMockRequest({
        Authorization: "Bearer invalid_key",
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Invalid API key");
    });
  });

  describe("rate limiting", () => {
    it("should return 429 when rate limited", async () => {
      mockAuthenticateMcpOrSession.mockResolvedValue({
        success: true,
        userId: testUserId,
      });
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
      expect(body.retryAfter).toBeDefined();
      expect(response.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("success cases", () => {
    it("should return credit balance information", async () => {
      mockAuthenticateMcpOrSession.mockResolvedValue({
        success: true,
        userId: testUserId,
      });
      mockCheckRateLimit.mockResolvedValue({
        isLimited: false,
      });
      mockWorkspaceCreditManager.getBalance.mockResolvedValue({
        remaining: 50,
        limit: 100,
        used: 50,
        tier: "PRO",
        workspaceId: testWorkspaceId,
      });

      const request = createMockRequest({
        Authorization: "Bearer sk_test_validkey",
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.remaining).toBe(50);
      expect(body.limit).toBe(100);
      expect(body.used).toBe(50);
      expect(body.tier).toBe("PRO");
      expect(body.workspaceId).toBe(testWorkspaceId);
      expect(mockWorkspaceCreditManager.getBalance).toHaveBeenCalledWith(
        testUserId,
      );
    });
  });

  describe("error handling", () => {
    it("should return 500 when getBalance throws", async () => {
      mockAuthenticateMcpOrSession.mockResolvedValue({
        success: true,
        userId: testUserId,
      });
      mockCheckRateLimit.mockResolvedValue({
        isLimited: false,
      });
      mockWorkspaceCreditManager.getBalance.mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest({
        Authorization: "Bearer sk_test_validkey",
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to get credit balance");
    });

    it("should return 500 when getBalance returns null", async () => {
      mockAuthenticateMcpOrSession.mockResolvedValue({
        success: true,
        userId: testUserId,
      });
      mockCheckRateLimit.mockResolvedValue({
        isLimited: false,
      });
      mockWorkspaceCreditManager.getBalance.mockResolvedValue(null);

      const request = createMockRequest({
        Authorization: "Bearer sk_test_validkey",
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to get credit balance");
    });
  });
});
