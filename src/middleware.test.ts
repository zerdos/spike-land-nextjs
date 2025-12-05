/**
 * Tests for Next.js Middleware Protected Routes
 *
 * These tests verify that the middleware correctly:
 * - Allows authenticated users to access protected routes
 * - Redirects unauthenticated users from protected routes
 * - Allows all users to access public routes
 * - Properly identifies protected vs public paths
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to create the mock function before vi.mock runs
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}));

// Mock auth.config first (before next-auth)
vi.mock("@/auth.config", () => ({
  authConfig: {
    providers: [],
    callbacks: {},
    pages: {},
    session: { strategy: "jwt" },
  },
}));

// Mock next-auth - use mockAuth from hoisted variable
vi.mock("next-auth", () => ({
  default: () => ({
    auth: mockAuth,
  }),
}));

import { constantTimeCompare, isProtectedPath, middleware } from "./middleware";

// Use mockAuth as auth
const auth = mockAuth;

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constantTimeCompare", () => {
    it("should return true for identical strings", () => {
      expect(constantTimeCompare("secret123", "secret123")).toBe(true);
    });

    it("should return false for different strings of same length", () => {
      expect(constantTimeCompare("secret123", "secret456")).toBe(false);
    });

    it("should return false for different strings of different length", () => {
      expect(constantTimeCompare("secret", "secret123")).toBe(false);
      expect(constantTimeCompare("secret123", "secret")).toBe(false);
    });

    it("should return true for empty strings", () => {
      expect(constantTimeCompare("", "")).toBe(true);
    });

    it("should return false when one string is empty", () => {
      expect(constantTimeCompare("", "secret")).toBe(false);
      expect(constantTimeCompare("secret", "")).toBe(false);
    });

    it("should handle unicode characters correctly", () => {
      expect(constantTimeCompare("🔐secret🔑", "🔐secret🔑")).toBe(true);
      expect(constantTimeCompare("🔐secret🔑", "🔐secret🔒")).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(constantTimeCompare("Secret", "secret")).toBe(false);
      expect(constantTimeCompare("SECRET", "secret")).toBe(false);
    });
  });

  describe("isProtectedPath", () => {
    it("should return false for home page", () => {
      expect(isProtectedPath("/")).toBe(false);
    });

    it("should return false for public apps path", () => {
      expect(isProtectedPath("/apps")).toBe(false);
      expect(isProtectedPath("/apps/display")).toBe(false);
      expect(isProtectedPath("/apps/anything/nested")).toBe(false);
    });

    it("should return false for auth endpoints", () => {
      expect(isProtectedPath("/api/auth")).toBe(false);
      expect(isProtectedPath("/api/auth/signin")).toBe(false);
      expect(isProtectedPath("/api/auth/callback/github")).toBe(false);
    });

    it("should return false for auth pages", () => {
      expect(isProtectedPath("/auth/signin")).toBe(false);
      expect(isProtectedPath("/auth/error")).toBe(false);
    });

    it("should return true for my-apps paths", () => {
      expect(isProtectedPath("/my-apps")).toBe(true);
      expect(isProtectedPath("/my-apps/app-123")).toBe(true);
      expect(isProtectedPath("/my-apps/app-123/settings")).toBe(true);
    });

    it("should return true for settings path", () => {
      expect(isProtectedPath("/settings")).toBe(true);
      expect(isProtectedPath("/settings/profile")).toBe(true);
    });

    it("should return true for profile path", () => {
      expect(isProtectedPath("/profile")).toBe(true);
      expect(isProtectedPath("/profile/edit")).toBe(true);
    });

    it("should return false for non-protected paths", () => {
      expect(isProtectedPath("/about")).toBe(false);
      expect(isProtectedPath("/contact")).toBe(false);
      expect(isProtectedPath("/api/data")).toBe(false);
    });
  });

  describe("middleware function", () => {
    const createMockRequest = (pathname: string, url?: string): NextRequest => {
      const baseUrl = url || `http://localhost:3000${pathname}`;
      return {
        nextUrl: new URL(baseUrl),
        url: baseUrl,
        headers: new Headers(),
      } as unknown as NextRequest;
    };

    describe("public paths", () => {
      it("should allow access to home page without auth", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      });

      it("should allow access to public apps without auth", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/apps/display");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      });

      it("should allow access to auth endpoints without auth", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/api/auth/signin");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      });

      it("should allow access to signin page without auth", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/auth/signin");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      });

      it("should allow access to non-protected paths without auth", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/about");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      });
    });

    describe("protected paths - unauthenticated", () => {
      it("should redirect from /my-apps when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/my-apps");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
          "http://localhost:3000/auth/signin?callbackUrl=%2Fmy-apps",
        );
      });

      it("should redirect from /my-apps/app-123 when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/my-apps/app-123");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
          "http://localhost:3000/auth/signin?callbackUrl=%2Fmy-apps%2Fapp-123",
        );
      });

      it("should redirect from /settings when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/settings");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
          "http://localhost:3000/auth/signin?callbackUrl=%2Fsettings",
        );
      });

      it("should redirect from /profile when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/profile");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
          "http://localhost:3000/auth/signin?callbackUrl=%2Fprofile",
        );
      });

      it("should preserve callback URL for nested protected paths", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/my-apps/app-123/settings");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
          "http://localhost:3000/auth/signin?callbackUrl=%2Fmy-apps%2Fapp-123%2Fsettings",
        );
      });
    });

    describe("protected paths - authenticated", () => {
      const mockSession = {
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          image: "https://example.com/avatar.jpg",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      it("should allow access to /my-apps when authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(mockSession);
        const request = createMockRequest("/my-apps");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      });

      it("should allow access to /my-apps/app-123 when authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(mockSession);
        const request = createMockRequest("/my-apps/app-123");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      });

      it("should allow access to /settings when authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(mockSession);
        const request = createMockRequest("/settings");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      });

      it("should allow access to /profile when authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(mockSession);
        const request = createMockRequest("/profile");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      });

      it("should allow access to nested protected paths when authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(mockSession);
        const request = createMockRequest("/my-apps/app-123/settings");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      });
    });

    describe("E2E test bypass with secret header", () => {
      let originalEnv: string | undefined;

      const createMockRequestWithHeader = (pathname: string, headerValue?: string): NextRequest => {
        const baseUrl = `http://localhost:3000${pathname}`;
        const headers = new Headers();
        if (headerValue !== undefined) {
          headers.set("x-e2e-auth-bypass", headerValue);
        }
        return {
          nextUrl: new URL(baseUrl),
          url: baseUrl,
          headers,
        } as unknown as NextRequest;
      };

      beforeEach(() => {
        originalEnv = process.env.E2E_BYPASS_SECRET;
      });

      afterEach(() => {
        if (originalEnv === undefined) {
          delete process.env.E2E_BYPASS_SECRET;
        } else {
          process.env.E2E_BYPASS_SECRET = originalEnv;
        }
      });

      it("should bypass auth for protected path with correct secret header", async () => {
        process.env.E2E_BYPASS_SECRET = "test-secret-123";

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequestWithHeader("/my-apps", "test-secret-123");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(auth).not.toHaveBeenCalled();
      });

      it("should NOT bypass auth with incorrect secret header", async () => {
        process.env.E2E_BYPASS_SECRET = "test-secret-123";

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequestWithHeader("/my-apps", "wrong-secret");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain("callbackUrl");
        expect(auth).toHaveBeenCalled();
      });

      it("should NOT bypass auth when header is missing", async () => {
        process.env.E2E_BYPASS_SECRET = "test-secret-123";

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/my-apps");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain("callbackUrl");
        expect(auth).toHaveBeenCalled();
      });

      it("should NOT bypass auth when E2E_BYPASS_SECRET is not configured", async () => {
        delete process.env.E2E_BYPASS_SECRET;

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequestWithHeader("/my-apps", "any-secret");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain("callbackUrl");
        expect(auth).toHaveBeenCalled();
      });

      it("should bypass auth for all protected paths with correct secret", async () => {
        process.env.E2E_BYPASS_SECRET = "test-secret-123";

        const protectedPaths = ["/my-apps", "/my-apps/app-123", "/settings", "/profile"];

        for (const path of protectedPaths) {
          vi.mocked(auth).mockResolvedValue(null);
          const request = createMockRequestWithHeader(path, "test-secret-123");
          const response = await middleware(request);

          expect(response.status).toBe(200);
          expect(response.headers.get("x-middleware-next")).toBe("1");
        }
      });

      it("should still allow public paths without bypass header", async () => {
        process.env.E2E_BYPASS_SECRET = "test-secret-123";

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      });

      it("should NOT bypass auth with empty string secret", async () => {
        process.env.E2E_BYPASS_SECRET = "";

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequestWithHeader("/my-apps", "");
        const response = await middleware(request);

        // Empty string secret should NOT bypass (falsy check in middleware)
        expect(response.status).toBe(307);
        expect(auth).toHaveBeenCalled();
      });
    });

    describe("E2E test bypass - production environment protection", () => {
      let originalEnv: string | undefined;
      let originalNodeEnv: string | undefined;
      let originalVercelEnv: string | undefined;
      let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

      const createMockRequestWithHeader = (pathname: string, headerValue?: string): NextRequest => {
        const baseUrl = `http://localhost:3000${pathname}`;
        const headers = new Headers();
        if (headerValue !== undefined) {
          headers.set("x-e2e-auth-bypass", headerValue);
        }
        return {
          nextUrl: new URL(baseUrl),
          url: baseUrl,
          headers,
        } as unknown as NextRequest;
      };

      beforeEach(() => {
        originalEnv = process.env.E2E_BYPASS_SECRET;
        originalNodeEnv = process.env.NODE_ENV;
        originalVercelEnv = process.env.VERCEL_ENV;
        consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      });

      afterEach(() => {
        if (originalEnv === undefined) {
          delete process.env.E2E_BYPASS_SECRET;
        } else {
          process.env.E2E_BYPASS_SECRET = originalEnv;
        }
        if (originalNodeEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = originalNodeEnv;
        }
        if (originalVercelEnv === undefined) {
          delete process.env.VERCEL_ENV;
        } else {
          process.env.VERCEL_ENV = originalVercelEnv;
        }
        consoleWarnSpy.mockRestore();
      });

      it("should BLOCK E2E bypass in production environment (both NODE_ENV and VERCEL_ENV)", async () => {
        process.env.E2E_BYPASS_SECRET = "test-secret-123";
        process.env.NODE_ENV = "production";
        process.env.VERCEL_ENV = "production";

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequestWithHeader("/my-apps", "test-secret-123");
        const response = await middleware(request);

        // Should redirect (bypass blocked)
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain("callbackUrl");
        expect(auth).toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it("should ALLOW E2E bypass in development environment", async () => {
        process.env.E2E_BYPASS_SECRET = "test-secret-123";
        process.env.NODE_ENV = "development";
        delete process.env.VERCEL_ENV;

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequestWithHeader("/my-apps", "test-secret-123");
        const response = await middleware(request);

        // Should allow bypass
        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(auth).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "[E2E Bypass]",
          expect.objectContaining({
            path: "/my-apps",
            environment: expect.objectContaining({
              NODE_ENV: "development",
            }),
          }),
        );
      });

      it("should ALLOW E2E bypass when NODE_ENV is production but VERCEL_ENV is preview", async () => {
        process.env.E2E_BYPASS_SECRET = "test-secret-123";
        process.env.NODE_ENV = "production";
        process.env.VERCEL_ENV = "preview";

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequestWithHeader("/my-apps", "test-secret-123");
        const response = await middleware(request);

        // Should allow bypass (not full production)
        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(auth).not.toHaveBeenCalled();
      });

      it("should ALLOW E2E bypass when VERCEL_ENV is production but NODE_ENV is development", async () => {
        process.env.E2E_BYPASS_SECRET = "test-secret-123";
        process.env.NODE_ENV = "development";
        process.env.VERCEL_ENV = "production";

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequestWithHeader("/my-apps", "test-secret-123");
        const response = await middleware(request);

        // Should allow bypass (not full production)
        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(auth).not.toHaveBeenCalled();
      });

      it("should log audit information when bypass is used", async () => {
        process.env.E2E_BYPASS_SECRET = "test-secret-123";
        process.env.NODE_ENV = "test";
        process.env.VERCEL_ENV = "preview";

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequestWithHeader("/my-apps/app-123", "test-secret-123");
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(consoleWarnSpy).toHaveBeenCalledWith("[E2E Bypass]", {
          timestamp: expect.any(String),
          path: "/my-apps/app-123",
          environment: {
            NODE_ENV: "test",
            VERCEL_ENV: "preview",
          },
        });
      });

      it("should NOT log when bypass is blocked in production", async () => {
        process.env.E2E_BYPASS_SECRET = "test-secret-123";
        process.env.NODE_ENV = "production";
        process.env.VERCEL_ENV = "production";

        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequestWithHeader("/my-apps", "test-secret-123");
        await middleware(request);

        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });

    describe("edge cases", () => {
      it("should handle session without user object", async () => {
        vi.mocked(auth).mockResolvedValue({ expires: new Date().toISOString() } as never);
        const request = createMockRequest("/my-apps");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
          "http://localhost:3000/auth/signin?callbackUrl=%2Fmy-apps",
        );
      });

      it("should handle null session", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/my-apps");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain("callbackUrl");
      });

      it("should handle undefined session", async () => {
        vi.mocked(auth).mockResolvedValue(undefined as never);
        const request = createMockRequest("/my-apps");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain("callbackUrl");
      });

      it("should handle auth function throwing error", async () => {
        vi.mocked(auth).mockRejectedValue(new Error("Auth error"));
        const request = createMockRequest("/my-apps");

        await expect(middleware(request)).rejects.toThrow("Auth error");
      });

      it("should correctly encode special characters in callback URL", async () => {
        vi.mocked(auth).mockResolvedValue(null);
        const request = createMockRequest("/my-apps/app with spaces/settings");
        const response = await middleware(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        // URL searchParams automatically encode the callback URL, spaces become %2520 (double encoded)
        expect(location).toContain("callbackUrl=");
        expect(location).toContain("my-apps");
      });
    });
  });
});
