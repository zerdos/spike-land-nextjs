/**
 * Tests for Next.js Middleware Protected Routes
 *
 * These tests verify that the middleware correctly:
 * - Allows authenticated users to access protected routes
 * - Redirects unauthenticated users from protected routes
 * - Allows all users to access public routes
 * - Properly identifies protected vs public paths
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { middleware, isProtectedPath } from "./middleware"
import { NextRequest } from "next/server"

// Mock the auth module
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

import { auth } from "@/auth"

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("isProtectedPath", () => {
    it("should return false for home page", () => {
      expect(isProtectedPath("/")).toBe(false)
    })

    it("should return false for public apps path", () => {
      expect(isProtectedPath("/apps")).toBe(false)
      expect(isProtectedPath("/apps/display")).toBe(false)
      expect(isProtectedPath("/apps/anything/nested")).toBe(false)
    })

    it("should return false for auth endpoints", () => {
      expect(isProtectedPath("/api/auth")).toBe(false)
      expect(isProtectedPath("/api/auth/signin")).toBe(false)
      expect(isProtectedPath("/api/auth/callback/github")).toBe(false)
    })

    it("should return false for auth pages", () => {
      expect(isProtectedPath("/auth/signin")).toBe(false)
      expect(isProtectedPath("/auth/error")).toBe(false)
    })

    it("should return true for my-apps paths", () => {
      expect(isProtectedPath("/my-apps")).toBe(true)
      expect(isProtectedPath("/my-apps/app-123")).toBe(true)
      expect(isProtectedPath("/my-apps/app-123/settings")).toBe(true)
    })

    it("should return true for settings path", () => {
      expect(isProtectedPath("/settings")).toBe(true)
      expect(isProtectedPath("/settings/profile")).toBe(true)
    })

    it("should return true for profile path", () => {
      expect(isProtectedPath("/profile")).toBe(true)
      expect(isProtectedPath("/profile/edit")).toBe(true)
    })

    it("should return false for non-protected paths", () => {
      expect(isProtectedPath("/about")).toBe(false)
      expect(isProtectedPath("/contact")).toBe(false)
      expect(isProtectedPath("/api/data")).toBe(false)
    })
  })

  describe("middleware function", () => {
    const createMockRequest = (pathname: string, url?: string): NextRequest => {
      const baseUrl = url || `http://localhost:3000${pathname}`
      return {
        nextUrl: new URL(baseUrl),
        url: baseUrl,
        headers: new Headers(),
      } as unknown as NextRequest
    }

    describe("public paths", () => {
      it("should allow access to home page without auth", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")
      })

      it("should allow access to public apps without auth", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/apps/display")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")
      })

      it("should allow access to auth endpoints without auth", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/api/auth/signin")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")
      })

      it("should allow access to signin page without auth", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/auth/signin")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")
      })

      it("should allow access to non-protected paths without auth", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/about")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")
      })
    })

    describe("protected paths - unauthenticated", () => {
      it("should redirect from /my-apps when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/my-apps")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toBe("http://localhost:3000/?callbackUrl=%2Fmy-apps")
      })

      it("should redirect from /my-apps/app-123 when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/my-apps/app-123")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toBe("http://localhost:3000/?callbackUrl=%2Fmy-apps%2Fapp-123")
      })

      it("should redirect from /settings when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/settings")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toBe("http://localhost:3000/?callbackUrl=%2Fsettings")
      })

      it("should redirect from /profile when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/profile")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toBe("http://localhost:3000/?callbackUrl=%2Fprofile")
      })

      it("should preserve callback URL for nested protected paths", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/my-apps/app-123/settings")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toBe("http://localhost:3000/?callbackUrl=%2Fmy-apps%2Fapp-123%2Fsettings")
      })
    })

    describe("protected paths - authenticated", () => {
      const mockSession = {
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          image: "https://example.com/avatar.jpg",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }

      it("should allow access to /my-apps when authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(mockSession)
        const request = createMockRequest("/my-apps")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")
      })

      it("should allow access to /my-apps/app-123 when authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(mockSession)
        const request = createMockRequest("/my-apps/app-123")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")
      })

      it("should allow access to /settings when authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(mockSession)
        const request = createMockRequest("/settings")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")
      })

      it("should allow access to /profile when authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(mockSession)
        const request = createMockRequest("/profile")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")
      })

      it("should allow access to nested protected paths when authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(mockSession)
        const request = createMockRequest("/my-apps/app-123/settings")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")
      })
    })

    describe("E2E test bypass with secret header", () => {
      const createMockRequestWithHeader = (pathname: string, headerValue?: string): NextRequest => {
        const baseUrl = `http://localhost:3000${pathname}`
        const headers = new Headers()
        if (headerValue !== undefined) {
          headers.set('x-e2e-auth-bypass', headerValue)
        }
        return {
          nextUrl: new URL(baseUrl),
          url: baseUrl,
          headers,
        } as unknown as NextRequest
      }

      it("should bypass auth for protected path with correct secret header", async () => {
        const originalEnv = process.env.E2E_BYPASS_SECRET
        process.env.E2E_BYPASS_SECRET = 'test-secret-123'

        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequestWithHeader("/my-apps", "test-secret-123")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")
        expect(auth).not.toHaveBeenCalled()

        process.env.E2E_BYPASS_SECRET = originalEnv
      })

      it("should NOT bypass auth with incorrect secret header", async () => {
        const originalEnv = process.env.E2E_BYPASS_SECRET
        process.env.E2E_BYPASS_SECRET = 'test-secret-123'

        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequestWithHeader("/my-apps", "wrong-secret")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toContain("callbackUrl")
        expect(auth).toHaveBeenCalled()

        process.env.E2E_BYPASS_SECRET = originalEnv
      })

      it("should NOT bypass auth when header is missing", async () => {
        const originalEnv = process.env.E2E_BYPASS_SECRET
        process.env.E2E_BYPASS_SECRET = 'test-secret-123'

        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/my-apps")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toContain("callbackUrl")
        expect(auth).toHaveBeenCalled()

        process.env.E2E_BYPASS_SECRET = originalEnv
      })

      it("should NOT bypass auth when E2E_BYPASS_SECRET is not configured", async () => {
        const originalEnv = process.env.E2E_BYPASS_SECRET
        delete process.env.E2E_BYPASS_SECRET

        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequestWithHeader("/my-apps", "any-secret")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toContain("callbackUrl")
        expect(auth).toHaveBeenCalled()

        process.env.E2E_BYPASS_SECRET = originalEnv
      })

      it("should bypass auth for all protected paths with correct secret", async () => {
        const originalEnv = process.env.E2E_BYPASS_SECRET
        process.env.E2E_BYPASS_SECRET = 'test-secret-123'

        const protectedPaths = ["/my-apps", "/my-apps/app-123", "/settings", "/profile"]

        for (const path of protectedPaths) {
          vi.mocked(auth).mockResolvedValue(null)
          const request = createMockRequestWithHeader(path, "test-secret-123")
          const response = await middleware(request)

          expect(response.status).toBe(200)
          expect(response.headers.get("x-middleware-next")).toBe("1")
        }

        process.env.E2E_BYPASS_SECRET = originalEnv
      })

      it("should still allow public paths without bypass header", async () => {
        const originalEnv = process.env.E2E_BYPASS_SECRET
        process.env.E2E_BYPASS_SECRET = 'test-secret-123'

        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/")
        const response = await middleware(request)

        expect(response.status).toBe(200)
        expect(response.headers.get("x-middleware-next")).toBe("1")

        process.env.E2E_BYPASS_SECRET = originalEnv
      })

      it("should bypass auth with empty string secret if configured", async () => {
        const originalEnv = process.env.E2E_BYPASS_SECRET
        process.env.E2E_BYPASS_SECRET = ''

        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequestWithHeader("/my-apps", "")
        const response = await middleware(request)

        // Empty string secret should NOT bypass (falsy check in middleware)
        expect(response.status).toBe(307)
        expect(auth).toHaveBeenCalled()

        process.env.E2E_BYPASS_SECRET = originalEnv
      })
    })

    describe("edge cases", () => {
      it("should handle session without user object", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(auth).mockResolvedValue({ expires: new Date().toISOString() } as any)
        const request = createMockRequest("/my-apps")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toBe("http://localhost:3000/?callbackUrl=%2Fmy-apps")
      })

      it("should handle null session", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/my-apps")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toContain("callbackUrl")
      })

      it("should handle undefined session", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(auth).mockResolvedValue(undefined as any)
        const request = createMockRequest("/my-apps")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get("location")).toContain("callbackUrl")
      })

      it("should handle auth function throwing error", async () => {
        vi.mocked(auth).mockRejectedValue(new Error("Auth error"))
        const request = createMockRequest("/my-apps")

        await expect(middleware(request)).rejects.toThrow("Auth error")
      })

      it("should correctly encode special characters in callback URL", async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const request = createMockRequest("/my-apps/app with spaces/settings")
        const response = await middleware(request)

        expect(response.status).toBe(307)
        const location = response.headers.get("location")
        // URL searchParams automatically encode the callback URL, spaces become %2520 (double encoded)
        expect(location).toContain("callbackUrl=")
        expect(location).toContain("my-apps")
      })
    })
  })
})
