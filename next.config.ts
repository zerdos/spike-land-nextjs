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
    key: "X-Frame-Options",
    value: "DENY",
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
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com https://images.unsplash.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com https://generativelanguage.googleapis.com https://va.vercel-analytics.com https://vitals.vercel-insights.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
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
    ],
  },
  async headers() {
    // Create modified headers for sitemap preview (allows same-origin iframes)
    const sitemapHeaders = securityHeaders.map((h) =>
      h.key === "X-Frame-Options"
        ? { ...h, value: "SAMEORIGIN" }
        : h.key === "Content-Security-Policy"
        ? {
          ...h,
          value: h.value.replace(
            "frame-ancestors 'none'",
            "frame-ancestors 'self'",
          ),
        }
        : h
    );

    return [
      {
        // Sitemap preview needs SAMEORIGIN to load iframes of our own pages
        source: "/admin/sitemap",
        headers: sitemapHeaders,
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withWorkflow(nextConfig);
