import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the workflow module
vi.mock("workflow/next", () => ({
  withWorkflow: (config: any) => config,
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  withSentryConfig: (config: any) => config,
}));

describe("next.config.ts", () => {
  let nextConfig: any;

  beforeEach(async () => {
    // Dynamically import to pick up the mock
    const configModule = await import("./next.config");
    nextConfig = configModule.default;
  });

  describe("security headers", () => {
    it("should have headers configuration", async () => {
      expect(nextConfig.headers).toBeDefined();
      expect(typeof nextConfig.headers).toBe("function");
    });

    it("should return security headers with CSP", async () => {
      const headers = await nextConfig.headers!();
      expect(headers).toBeDefined();
      expect(Array.isArray(headers)).toBe(true);
      expect(headers.length).toBeGreaterThan(0);
    });

    it("should have CSP header for all paths", async () => {
      const headers = await nextConfig.headers!();
      const rootHeaders = headers.find((h) => h.source === "/:path*");
      expect(rootHeaders).toBeDefined();

      const cspHeader = rootHeaders?.headers.find(
        (h) => h.key === "Content-Security-Policy",
      );
      expect(cspHeader).toBeDefined();
    });

    it("should allow Vercel Analytics scripts in CSP", async () => {
      const headers = await nextConfig.headers!();
      const rootHeaders = headers.find((h) => h.source === "/:path*");
      const cspHeader = rootHeaders?.headers.find(
        (h) => h.key === "Content-Security-Policy",
      );

      expect(cspHeader?.value).toContain("script-src");
      expect(cspHeader?.value).toContain("https://va.vercel-scripts.com");
    });

    it("should allow Vercel Analytics connections in CSP", async () => {
      const headers = await nextConfig.headers!();
      const rootHeaders = headers.find((h) => h.source === "/:path*");
      const cspHeader = rootHeaders?.headers.find(
        (h) => h.key === "Content-Security-Policy",
      );

      expect(cspHeader?.value).toContain("connect-src");
      expect(cspHeader?.value).toContain("https://va.vercel-analytics.com");
      expect(cspHeader?.value).toContain("https://vitals.vercel-insights.com");
    });

    it("should allow Sentry connections in CSP", async () => {
      const headers = await nextConfig.headers!();
      const rootHeaders = headers.find((h) => h.source === "/:path*");
      const cspHeader = rootHeaders?.headers.find(
        (h) => h.key === "Content-Security-Policy",
      );

      expect(cspHeader?.value).toContain("https://*.ingest.sentry.io");
    });

    it("should have HSTS header", async () => {
      const headers = await nextConfig.headers!();
      const rootHeaders = headers.find((h) => h.source === "/:path*");
      const hstsHeader = rootHeaders?.headers.find(
        (h) => h.key === "Strict-Transport-Security",
      );

      expect(hstsHeader).toBeDefined();
      expect(hstsHeader?.value).toContain("max-age=31536000");
      expect(hstsHeader?.value).toContain("includeSubDomains");
    });

    it("should have X-Frame-Options header", async () => {
      const headers = await nextConfig.headers!();
      const rootHeaders = headers.find((h) => h.source === "/:path*");
      const xFrameOptions = rootHeaders?.headers.find(
        (h) => h.key === "X-Frame-Options",
      );

      expect(xFrameOptions).toBeDefined();
      expect(xFrameOptions?.value).toBe("DENY");
    });

    it("should have X-Content-Type-Options header", async () => {
      const headers = await nextConfig.headers!();
      const rootHeaders = headers.find((h) => h.source === "/:path*");
      const xContentType = rootHeaders?.headers.find(
        (h) => h.key === "X-Content-Type-Options",
      );

      expect(xContentType).toBeDefined();
      expect(xContentType?.value).toBe("nosniff");
    });

    it("should have Referrer-Policy header", async () => {
      const headers = await nextConfig.headers!();
      const rootHeaders = headers.find((h) => h.source === "/:path*");
      const referrerPolicy = rootHeaders?.headers.find(
        (h) => h.key === "Referrer-Policy",
      );

      expect(referrerPolicy).toBeDefined();
      expect(referrerPolicy?.value).toBe("strict-origin-when-cross-origin");
    });

    it("should have Permissions-Policy header", async () => {
      const headers = await nextConfig.headers!();
      const rootHeaders = headers.find((h) => h.source === "/:path*");
      const permissionsPolicy = rootHeaders?.headers.find(
        (h) => h.key === "Permissions-Policy",
      );

      expect(permissionsPolicy).toBeDefined();
      expect(permissionsPolicy?.value).toContain("camera=()");
      expect(permissionsPolicy?.value).toContain("microphone=()");
      expect(permissionsPolicy?.value).toContain("geolocation=()");
    });
  });

  describe("images configuration", () => {
    it("should have images remote patterns configured", () => {
      expect(nextConfig.images).toBeDefined();
      expect(nextConfig.images?.remotePatterns).toBeDefined();
      expect(Array.isArray(nextConfig.images?.remotePatterns)).toBe(true);
    });

    it("should allow Cloudflare R2 images", () => {
      const patterns = nextConfig.images?.remotePatterns || [];
      const r2Pattern = patterns.find((p) => p.hostname.includes("r2.dev"));
      expect(r2Pattern).toBeDefined();
    });

    it("should allow Unsplash images", () => {
      const patterns = nextConfig.images?.remotePatterns || [];
      const unsplashPattern = patterns.find((p) => p.hostname === "images.unsplash.com");
      expect(unsplashPattern).toBeDefined();
    });
  });
});
