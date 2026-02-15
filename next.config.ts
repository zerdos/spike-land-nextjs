import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import path from "path";

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
    value: "camera=(), microphone=(self), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // esbuild-wasm uses __dirname/__filename to locate its WASM binary — must not be bundled by Turbopack/webpack
  serverExternalPackages: ["esbuild-wasm"],
  // Configure Turbopack for Yarn PnP compatibility
  turbopack: {
    root: __dirname,
    resolveAlias: {
      // Point to unplugged next package for PnP compatibility
      next: path.resolve(
        __dirname,
        ".yarn/unplugged/next-virtual-425b36e32e/node_modules/next",
      ),
    },
  },
  // Transpile ESM packages to avoid runtime resolution issues with PnP
  // NOTE: @spike-npm-land/code and @spike-npm-land/video are excluded because they are standalone tools
  // (Vite app / Remotion) whose build artifacts might be missing in production/CI builds where
  // SKIP_TS_BUILD_CHECK=true, causing "Cannot read properties of undefined (reading 'length')"
  transpilePackages: ["next-mdx-remote", "@spike-npm-land/shared", "react-ts-worker"],
  typescript: {
    // TypeScript checking is handled by CI's `tsc --noEmit` step
    // Skip during build to reduce memory usage when SKIP_TS_BUILD_CHECK=true
    ignoreBuildErrors: process.env.SKIP_TS_BUILD_CHECK === "true",
  },
  // Enable standalone output for Docker deployment (~200MB vs ~1GB)
  // output: process.env.STANDALONE === "true" ? "standalone" : undefined,
  ...(process.env.STANDALONE === "true" ? { output: "standalone" } : {}),
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
        source: "/.well-known/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
      {
        source: "/api/mcp",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
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
    return [
      {
        source: "/docs/SKILLS",
        destination: "/store/skills/bazdmeg",
        permanent: false,
      },
      // Landing theme pages → dynamic pages
      { source: "/landing/apple", destination: "/p/landing-apple", permanent: true },
      { source: "/landing/stripe", destination: "/p/landing-stripe", permanent: true },
      { source: "/landing/vercel", destination: "/p/landing-vercel", permanent: true },
      { source: "/landing/linear", destination: "/p/landing-linear", permanent: true },
      { source: "/landing/figma", destination: "/p/landing-figma", permanent: true },
      { source: "/landing/notion", destination: "/p/landing-notion", permanent: true },
      { source: "/landing/discord", destination: "/p/landing-discord", permanent: true },
      { source: "/landing/framer", destination: "/p/landing-framer", permanent: true },
      { source: "/landing/supabase", destination: "/p/landing-supabase", permanent: true },
      { source: "/landing/brutalist", destination: "/p/landing-brutalist", permanent: true },
      { source: "/landing", destination: "/p/landing-gallery", permanent: true },
      // Feature pages → dynamic pages
      { source: "/features/ab-testing", destination: "/p/features-ab-testing", permanent: true },
      { source: "/features/ai-calendar", destination: "/p/features-ai-calendar", permanent: true },
      { source: "/features/ai-tools", destination: "/p/features-ai-tools", permanent: true },
      { source: "/features/analytics", destination: "/p/features-analytics", permanent: true },
      { source: "/features/brand-brain", destination: "/p/features-brand-brain", permanent: true },
      { source: "/features/calendar", destination: "/p/features-calendar", permanent: true },
      { source: "/features", destination: "/p/features", permanent: true },
      // Persona pages → dynamic pages
      { source: "/personas/:slug", destination: "/p/persona-:slug", permanent: true },
      { source: "/personas", destination: "/p/personas", permanent: true },
    ];
  },
  // Webpack configuration for Yarn PnP compatibility
  webpack: (config) => {
    // Map @prisma/client to the generated Prisma client location
    // This ensures both TypeScript and webpack resolve to the same generated client
    config.resolve.alias["@prisma/client"] = path.resolve(
      __dirname,
      "src/generated/prisma",
    );
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  // Upload source maps to Sentry for readable stack traces
  org: "spikeland",
  project: "javascript-nextjs",

  // Suppress source map upload logs during build
  silent: !process.env.CI,

  // Disable source map uploads in CI — Vercel handles its own source map uploads
  // during deployment. The CI build is validation-only.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN || process.env.CI === "true",
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
