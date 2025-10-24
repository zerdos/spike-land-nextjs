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
 */

import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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

  // Skip authentication check in E2E test environment
  if (process.env.E2E_BYPASS_AUTH === 'true') {
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
