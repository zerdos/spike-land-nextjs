/**
 * Next.js Proxy for Protected Routes
 *
 * This proxy handles authentication-based route protection for the Spike Land platform.
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

import { authConfig } from "@/auth.config";
import { CSP_NONCE_HEADER, generateNonce } from "@/lib/security/csp-nonce";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Create Edge-compatible auth (no database operations)
const { auth } = NextAuth(authConfig);

/**
 * Performs constant-time string comparison to prevent timing attacks
 * Uses Web Crypto API compatible approach for Edge runtime
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  // Convert strings to Uint8Array for byte-by-byte comparison
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);

  // Double-check lengths match after encoding
  if (bufA.length !== bufB.length) return false;

  // Perform constant-time comparison
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    // TypeScript assertion safe due to length check above
    result |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return result === 0;
}

/**
 * List of path patterns that require authentication
 * Paths are matched using startsWith for path prefixes
 */
const PROTECTED_PATHS = [
  "/my-apps",
  "/settings",
  "/profile",
  "/enhance",
] as const;

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
] as const;

/**
 * Checks if a given pathname requires authentication
 *
 * @param pathname - The URL pathname to check
 * @returns true if the path requires authentication, false otherwise
 */
export function isProtectedPath(pathname: string): boolean {
  // First check if path is explicitly public
  if (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))
  ) {
    return false;
  }

  // Check if path matches any protected patterns
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

/**
 * Helper to add CORS headers for development
 */
function addCorsHeaders(response: NextResponse, origin: string): NextResponse {
  if (process.env.NODE_ENV === "development") {
    const allowedOrigins = [
      "http://localhost:8081",
      "http://localhost:3000",
      "http://localhost:19006",
    ];
    if (allowedOrigins.includes(origin) || !origin) {
      response.headers.set("Access-Control-Allow-Origin", origin || "*");
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
  }
  return response;
}

/**
 * Next.js Proxy Function
 *
 * Executed for every request that matches the config matcher.
 * Checks authentication status for protected routes and redirects
 * unauthenticated users to the home page with a callback URL.
 *
 * @param request - The incoming Next.js request
 * @returns NextResponse - Either continues the request or redirects
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin") || "";

  // Handle CORS preflight requests for API routes
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const response = new NextResponse(null, { status: 204 });
    if (process.env.NODE_ENV === "development") {
      response.headers.set("Access-Control-Allow-Origin", origin || "*");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-API-Key, X-Requested-With",
      );
      response.headers.set("Access-Control-Max-Age", "86400");
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return response;
  }

  // Generate CSP Nonce and Header
  const nonce = generateNonce();
  const cspHeader = `
    default-src 'self';
    img-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com https://images.unsplash.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://www.facebook.com https://platform-lookaside.fbsbx.com https://vercel.live https://vercel.com data: blob:;
    script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://va.vercel-scripts.com https://connect.facebook.net https://vercel.live;
    style-src 'self' 'unsafe-inline' https://vercel.live;
    font-src 'self' https://vercel.live https://assets.vercel.com https://fonts.gstatic.com data:;
    frame-src 'self' https://vercel.live;
    connect-src 'self' blob: data: https://*.r2.dev https://*.r2.cloudflarestorage.com https://generativelanguage.googleapis.com https://va.vercel-analytics.com https://vitals.vercel-insights.com https://www.facebook.com https://connect.facebook.net https://vercel.live https://fonts.gstatic.com https://fonts.googleapis.com wss://ws-us3.pusher.com wss://*.peerjs.com;
    worker-src 'self' blob: data:;
    frame-ancestors 'self';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  // Helper to apply headers to response
  const applyHeaders = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", cspHeader);
    // Add CORS headers for API routes in development
    if (pathname.startsWith("/api/")) {
      addCorsHeaders(response, origin);
    }
    return response;
  };

  // Skip proxy for non-protected paths
  if (!isProtectedPath(pathname)) {
    return applyHeaders(NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }));
  }

  // Check for E2E test bypass header with secret validation
  // This allows E2E tests to bypass authentication securely
  // Uses constant-time comparison to prevent timing attacks
  // SECURITY: Only enabled in non-production environments
  const e2eBypassHeader = request.headers.get("x-e2e-auth-bypass");
  const e2eBypassSecret = process.env.E2E_BYPASS_SECRET;

  // Only allow E2E bypass in non-production environments
  // This prevents accidental bypass in production even if the secret leaks
  const isProduction = process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV === "production";

  if (
    !isProduction && e2eBypassSecret && e2eBypassHeader &&
    constantTimeCompare(e2eBypassHeader, e2eBypassSecret)
  ) {
    // Audit log for security monitoring and debugging
    console.warn("[E2E Bypass]", {
      timestamp: new Date().toISOString(),
      path: pathname,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
    });
    return applyHeaders(NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }));
  }

  // Check authentication status
  const session = await auth();

  // If user is not authenticated, redirect to sign in page with callback URL
  if (!session?.user) {
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return applyHeaders(NextResponse.redirect(url));
  }

  // User is authenticated, allow access
  return applyHeaders(NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  }));
}

/**
 * Proxy Configuration
 *
 * Defines which routes the proxy should run on.
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
};
