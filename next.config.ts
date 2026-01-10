import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

/**
 * Security headers configuration
 *
 * These headers protect against common web vulnerabilities:
 * - X-DNS-Prefetch-Control: Enables DNS prefetching for performance
 * - X-Frame-Options: Prevents clickjacking attacks (OWASP A5:2017)
 * - X-Content-Type-Options: Prevents MIME type sniffing attacks
 * - X-XSS-Protection: Legacy XSS filter for older browsers
 * - Referrer-Policy: Controls referrer information leakage
 * - Permissions-Policy: Restricts browser feature access
 *
 * @see https://owasp.org/www-project-secure-headers/
 */
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    // Use SAMEORIGIN to allow admin sitemap preview while preventing cross-origin clickjacking
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript checking is handled by CI's `tsc --noEmit` step
    // Skip during build to reduce memory usage when SKIP_TS_BUILD_CHECK=true
    ignoreBuildErrors: process.env.SKIP_TS_BUILD_CHECK === "true",
  },
  // Enable standalone output for Docker deployment (~200MB vs ~1GB)
  // output: process.env.STANDALONE === "true" ? "standalone" : undefined,
  ...(process.env.STANDALONE === "true" ? { output: "standalone" } : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-cf0adddb5752426a96ef090997e0da95.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
  async headers() {
    // CORS headers for API routes (allows mobile app in development)
    const corsHeaders = [
      {
        key: "Access-Control-Allow-Origin",
        value: process.env.NODE_ENV === "development"
          ? "*"
          : "https://spike.land",
      },
      {
        key: "Access-Control-Allow-Methods",
        value: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      },
      {
        key: "Access-Control-Allow-Headers",
        value: "Content-Type, Authorization, X-API-Key",
      },
      {
        key: "Access-Control-Max-Age",
        value: "86400",
      },
    ];

    // Apply security headers to all routes
    // Note: X-Frame-Options: SAMEORIGIN and frame-ancestors 'self' allow
    // same-origin iframes (used by admin sitemap preview) while preventing
    // cross-origin clickjacking attacks
    return [
      {
        source: "/api/:path*",
        headers: corsHeaders,
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [];
  },
};

export default withWorkflow(nextConfig);
