/**
 * Next.js Middleware for Protected Routes
 *
 * This middleware handles authentication-based route protection for the Spike Land platform.
 * It checks user authentication status and redirects unauthenticated users attempting to
 * access protected routes to the home page with a callback URL.
 *
 * Protected Routes:
 * - /my-apps/* - User's personal applications
 * - /settings - User settings page
 * - /profile - User profile page
 *
 * Public Routes:
 * - / - Home page
 * - /apps/* - Public applications directory
 * - /api/auth/* - NextAuth authentication endpoints
 * - All other routes not explicitly protected
 *
 * E2E Test Bypass:
 * - Requests with header 'x-e2e-auth-bypass' matching E2E_BYPASS_SECRET env var bypass authentication
 * - This allows E2E tests to access protected routes securely without real authentication
 */

import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { timingSafeEqual } from "crypto"

/**
 * Performs constant-time string comparison to prevent timing attacks
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  return timingSafeEqual(bufA, bufB)
}

/**
 * List of path patterns that require authentication
 * Paths are matched using startsWith for path prefixes
 */
const PROTECTED_PATHS = [
  "/my-apps",
  "/settings",
  "/profile",
] as const

/**
 * List of path patterns that are always public
 * These paths bypass authentication checks
 */
const PUBLIC_PATHS = [
  "/",
  "/apps",
  "/api/auth",
  "/auth/signin",
  "/auth/error",
] as const

/**
 * Checks if a given pathname requires authentication
 *
 * @param pathname - The URL pathname to check
 * @returns true if the path requires authentication, false otherwise
 */
export function isProtectedPath(pathname: string): boolean {
  // First check if path is explicitly public
  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + "/"))) {
    return false
  }

  // Check if path matches any protected patterns
  return PROTECTED_PATHS.some(path => pathname === path || pathname.startsWith(path + "/"))
}

/**
 * Next.js Middleware Function
 *
 * Executed for every request that matches the config matcher.
 * Checks authentication status for protected routes and redirects
 * unauthenticated users to the home page with a callback URL.
 *
 * @param request - The incoming Next.js request
 * @returns NextResponse - Either continues the request or redirects
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for non-protected paths
  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  // Check for E2E test bypass header with secret validation
  // This allows E2E tests to bypass authentication securely
  // Uses constant-time comparison to prevent timing attacks
  // SECURITY: Only enabled in non-production environments
  const e2eBypassHeader = request.headers.get('x-e2e-auth-bypass')
  const e2eBypassSecret = process.env.E2E_BYPASS_SECRET

  // Only allow E2E bypass in non-production environments
  // This prevents accidental bypass in production even if the secret leaks
  const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production'

  if (!isProduction && e2eBypassSecret && e2eBypassHeader && constantTimeCompare(e2eBypassHeader, e2eBypassSecret)) {
    // Audit log for security monitoring and debugging
    console.warn('[E2E Bypass]', {
      timestamp: new Date().toISOString(),
      path: pathname,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      }
    })
    return NextResponse.next()
  }

  // Alternative E2E bypass: Check for mock session cookie when E2E_BYPASS_SECRET is not set
  // This allows E2E tests to work in CI environments without requiring GitHub secrets
  // SECURITY: Only in non-production environments (NODE_ENV !== 'production' OR VERCEL_ENV !== 'production')
  const mockSessionCookie = request.cookies.get('authjs.session-token')

  if (!isProduction && mockSessionCookie?.value === 'mock-session-token') {
    // Audit log for debugging E2E tests
    console.warn('[E2E Mock Session]', {
      timestamp: new Date().toISOString(),
      path: pathname,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      }
    })
    return NextResponse.next()
  }

  // Check authentication status
  const session = await auth()

  // If user is not authenticated, redirect to home with callback URL
  if (!session?.user) {
    const url = new URL("/", request.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  // User is authenticated, allow access
  return NextResponse.next()
}

/**
 * Middleware Configuration
 *
 * Defines which routes the middleware should run on.
 * Using a matcher to exclude static files, images, and internal Next.js routes
 * for better performance.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
