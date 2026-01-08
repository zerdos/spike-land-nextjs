/**
 * Tests for Pulse Metrics Collection Cron Route
 *
 * Resolves #646
 */

import { collectPulseMetrics } from "@/lib/social/metrics-collector";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Mock dependencies
vi.mock("@/lib/social/metrics-collector");
vi.mock("@/lib/prisma", () => ({
  default: {},
}));

describe("GET /api/cron/pulse-metrics", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should successfully collect metrics when authenticated with Bearer token", async () => {
    process.env.CRON_SECRET = "test-secret-123";

    const mockResult = {
      totalAccounts: 5,
      successCount: 4,
      failureCount: 1,
      skippedCount: 0,
      results: [],
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 1500,
    };

    vi.mocked(collectPulseMetrics).mockResolvedValue(mockResult);

    const request = new NextRequest("http://localhost/api/cron/pulse-metrics", {
      method: "GET",
      headers: {
        authorization: "Bearer test-secret-123",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.totalAccounts).toBe(5);
    expect(data.result.successCount).toBe(4);
    expect(data.result.failureCount).toBe(1);
    expect(data.result.durationMs).toBe(1500);
    expect(data.timestamp).toBeDefined();

    expect(collectPulseMetrics).toHaveBeenCalledWith();
  });

  it("should authenticate with x-cron-secret header (Vercel Cron)", async () => {
    process.env.CRON_SECRET = "vercel-cron-secret";

    vi.mocked(collectPulseMetrics).mockResolvedValue({
      totalAccounts: 2,
      successCount: 2,
      failureCount: 0,
      skippedCount: 0,
      results: [],
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 500,
    });

    const request = new NextRequest("http://localhost/api/cron/pulse-metrics", {
      method: "GET",
      headers: {
        "x-cron-secret": "vercel-cron-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(collectPulseMetrics).toHaveBeenCalled();
  });

  it("should return 401 when cron secret is missing", async () => {
    process.env.CRON_SECRET = "test-secret-123";

    const request = new NextRequest("http://localhost/api/cron/pulse-metrics", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(collectPulseMetrics).not.toHaveBeenCalled();
  });

  it("should return 401 when cron secret is incorrect", async () => {
    process.env.CRON_SECRET = "correct-secret";

    const request = new NextRequest("http://localhost/api/cron/pulse-metrics", {
      method: "GET",
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(collectPulseMetrics).not.toHaveBeenCalled();
  });

  it("should allow access when CRON_SECRET is not set (development mode)", async () => {
    delete process.env.CRON_SECRET;
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true });

    vi.mocked(collectPulseMetrics).mockResolvedValue({
      totalAccounts: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      results: [],
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 100,
    });

    const request = new NextRequest("http://localhost/api/cron/pulse-metrics", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(collectPulseMetrics).toHaveBeenCalled();
  });

  it("should return 401 when CRON_SECRET is not set in production", async () => {
    delete process.env.CRON_SECRET;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });

    const request = new NextRequest("http://localhost/api/cron/pulse-metrics", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(collectPulseMetrics).not.toHaveBeenCalled();
  });

  it("should return appropriate response when no accounts found", async () => {
    process.env.CRON_SECRET = "test-secret";

    vi.mocked(collectPulseMetrics).mockResolvedValue({
      totalAccounts: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      results: [],
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 50,
    });

    const request = new NextRequest("http://localhost/api/cron/pulse-metrics", {
      method: "GET",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.totalAccounts).toBe(0);
    expect(data.result.successCount).toBe(0);
  });

  it("should handle collection errors gracefully", async () => {
    process.env.CRON_SECRET = "test-secret";

    vi.mocked(collectPulseMetrics).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new NextRequest("http://localhost/api/cron/pulse-metrics", {
      method: "GET",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Metrics collection failed");
    expect(data.details).toContain("Database connection failed");
  });

  it("should include skipped count in response", async () => {
    process.env.CRON_SECRET = "test-secret";

    vi.mocked(collectPulseMetrics).mockResolvedValue({
      totalAccounts: 10,
      successCount: 8,
      failureCount: 0,
      skippedCount: 2, // e.g., TikTok accounts not yet supported
      results: [],
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 2000,
    });

    const request = new NextRequest("http://localhost/api/cron/pulse-metrics", {
      method: "GET",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.skippedCount).toBe(2);
  });

  it("should include timestamp in response", async () => {
    process.env.CRON_SECRET = "test-secret";

    vi.mocked(collectPulseMetrics).mockResolvedValue({
      totalAccounts: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      results: [],
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 100,
    });

    const request = new NextRequest("http://localhost/api/cron/pulse-metrics", {
      method: "GET",
      headers: {
        authorization: "Bearer test-secret",
      },
    });

    const beforeTime = new Date();
    const response = await GET(request);
    const afterTime = new Date();
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    const responseTime = new Date(data.timestamp);
    expect(responseTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(responseTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });
});
