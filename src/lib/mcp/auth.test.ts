import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth from @/auth
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

// Mock OAuth token service
const { mockVerifyAccessToken } = vi.hoisted(() => ({
  mockVerifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/mcp/oauth/token-service", () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

import type { NextRequest } from "next/server";
import {
  authenticateMcpOrSession,
  authenticateMcpRequest,
} from "./auth";

// Helper to create mock NextRequest
function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get: (name: string) => headers[name] || null,
    },
  } as unknown as NextRequest;
}

describe("auth", () => {
  const testUserId = "test-user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("authenticateMcpRequest", () => {
    it("should return error when Authorization header is missing", async () => {
      const request = createMockRequest({});

      const result = await authenticateMcpRequest(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing Authorization header");
    });

    it("should return error when Authorization header doesn't start with Bearer", async () => {
      const request = createMockRequest({
        Authorization: "Basic abc123",
      });

      const result = await authenticateMcpRequest(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Invalid Authorization header format. Expected: Bearer <token>",
      );
    });

    it("should return error when token is empty", async () => {
      const request = createMockRequest({
        Authorization: "Bearer ",
      });

      const result = await authenticateMcpRequest(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing token");
    });

    it("should return error when token is just whitespace", async () => {
      const request = createMockRequest({
        Authorization: "Bearer    ",
      });

      const result = await authenticateMcpRequest(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing token");
    });

    it("should reject non-mcp_ tokens", async () => {
      const request = createMockRequest({
        Authorization: "Bearer sk_test_validkey",
      });

      const result = await authenticateMcpRequest(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Invalid token format. Only OAuth tokens are accepted.",
      );
    });

    it("should authenticate OAuth tokens (mcp_ prefix)", async () => {
      mockVerifyAccessToken.mockResolvedValue({
        userId: testUserId,
        clientId: "test-client-id",
        scope: "mcp",
      });

      const request = createMockRequest({
        Authorization: "Bearer mcp_test_oauth_token_abc123",
      });

      const result = await authenticateMcpRequest(request);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(testUserId);
      expect(result.oauthClientId).toBe("test-client-id");
    });

    it("should return error for invalid OAuth tokens", async () => {
      mockVerifyAccessToken.mockResolvedValue(null);

      const request = createMockRequest({
        Authorization: "Bearer mcp_invalid_token",
      });

      const result = await authenticateMcpRequest(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid or expired OAuth token");
    });

    it("should return error when OAuth verification throws", async () => {
      mockVerifyAccessToken.mockRejectedValue(
        new Error("Token service down"),
      );

      const request = createMockRequest({
        Authorization: "Bearer mcp_some_token",
      });

      const result = await authenticateMcpRequest(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("OAuth token verification failed");
    });
  });

  describe("authenticateMcpOrSession", () => {
    it("should use OAuth auth when Bearer token is provided", async () => {
      mockVerifyAccessToken.mockResolvedValue({
        userId: testUserId,
        clientId: "test-client-id",
        scope: "mcp",
      });

      const request = createMockRequest({
        Authorization: "Bearer mcp_test_token",
      });

      const result = await authenticateMcpOrSession(request);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(testUserId);
      expect(result.oauthClientId).toBe("test-client-id");
      expect(mockAuth).not.toHaveBeenCalled();
    });

    it("should fall back to session auth when no Bearer token", async () => {
      mockAuth.mockResolvedValue({
        user: { id: testUserId },
      });

      const request = createMockRequest({});

      const result = await authenticateMcpOrSession(request);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(testUserId);
      expect(mockAuth).toHaveBeenCalled();
    });

    it("should fall back to session auth with non-Bearer Authorization", async () => {
      mockAuth.mockResolvedValue({
        user: { id: testUserId },
      });

      const request = createMockRequest({
        Authorization: "Basic abc123",
      });

      const result = await authenticateMcpOrSession(request);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(testUserId);
      expect(mockAuth).toHaveBeenCalled();
    });

    it("should return error when neither token nor session is valid", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createMockRequest({});

      const result = await authenticateMcpOrSession(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Authentication required. Provide an OAuth token or sign in.",
      );
    });

    it("should return error when session exists but has no user", async () => {
      mockAuth.mockResolvedValue({});

      const request = createMockRequest({});

      const result = await authenticateMcpOrSession(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Authentication required. Provide an OAuth token or sign in.",
      );
    });

    it("should return error when session user has no id", async () => {
      mockAuth.mockResolvedValue({
        user: { email: "test@example.com" },
      });

      const request = createMockRequest({});

      const result = await authenticateMcpOrSession(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Authentication required. Provide an OAuth token or sign in.",
      );
    });

    it("should return error when session auth throws an exception", async () => {
      mockAuth.mockRejectedValue(new Error("Session service unavailable"));

      const request = createMockRequest({});

      const result = await authenticateMcpOrSession(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Session authentication failed");
    });
  });
});
