import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies using vi.hoisted
const {
  mockAuthenticateMcpOrSession,
  mockCheckRateLimit,
  mockTokenBalanceManager,
} = vi.hoisted(
  () => ({
    mockAuthenticateMcpOrSession: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockTokenBalanceManager: {
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

vi.mock("@/lib/tokens/balance-manager", () => ({
  TokenBalanceManager: mockTokenBalanceManager,
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
  const mockDate = new Date("2024-01-15T12:00:00Z");

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
    it("should return balance information", async () => {
      mockAuthenticateMcpOrSession.mockResolvedValue({
        success: true,
        userId: testUserId,
      });
      mockCheckRateLimit.mockResolvedValue({
        isLimited: false,
      });
      mockTokenBalanceManager.getBalance.mockResolvedValue({
        balance: 50,
        lastRegeneration: mockDate,
      });

      const request = createMockRequest({
        Authorization: "Bearer sk_test_validkey",
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.balance).toBe(50);
      expect(body.lastRegeneration).toBe(mockDate.toISOString());
      expect(mockTokenBalanceManager.getBalance).toHaveBeenCalledWith(
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
      mockTokenBalanceManager.getBalance.mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest({
        Authorization: "Bearer sk_test_validkey",
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to get token balance");
    });
  });
});
