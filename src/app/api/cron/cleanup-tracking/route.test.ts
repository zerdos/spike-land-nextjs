/**
 * Data Retention Cleanup Cron Job Tests
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Store original env
const originalEnv = { ...process.env };

// Mock functions - declared first at module scope
const mockPageViewDeleteMany = vi.fn();
const mockAnalyticsEventDeleteMany = vi.fn();
const mockVisitorSessionDeleteMany = vi.fn();
const mockCampaignMetricsCacheDeleteMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    pageView: {
      deleteMany: mockPageViewDeleteMany,
    },
    analyticsEvent: {
      deleteMany: mockAnalyticsEventDeleteMany,
    },
    visitorSession: {
      deleteMany: mockVisitorSessionDeleteMany,
    },
    campaignMetricsCache: {
      deleteMany: mockCampaignMetricsCacheDeleteMany,
    },
  },
}));

const { GET } = await import("./route");

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/cron/cleanup-tracking");

  return new NextRequest(url, {
    method: "GET",
    headers: new Headers(headers),
  });
}

describe("Data Retention Cleanup Cron Job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return 401 if no CRON_SECRET configured in production", async () => {
    (process.env as Record<string, string | undefined>)["NODE_ENV"] = "production";
    delete process.env.CRON_SECRET;

    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if wrong cron secret provided", async () => {
    process.env.CRON_SECRET = "correct-secret";

    const request = createMockRequest({
      authorization: "Bearer wrong-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("should accept valid Bearer token", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockPageViewDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockAnalyticsEventDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockVisitorSessionDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockCampaignMetricsCacheDeleteMany.mockResolvedValueOnce({ count: 0 });

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("should accept valid x-cron-secret header", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockPageViewDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockAnalyticsEventDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockVisitorSessionDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockCampaignMetricsCacheDeleteMany.mockResolvedValueOnce({ count: 0 });

    const request = createMockRequest({
      "x-cron-secret": "test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should allow requests in development without secret", async () => {
    (process.env as Record<string, string | undefined>)["NODE_ENV"] = "development";
    delete process.env.CRON_SECRET;
    mockPageViewDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockAnalyticsEventDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockVisitorSessionDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockCampaignMetricsCacheDeleteMany.mockResolvedValueOnce({ count: 0 });

    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should delete old tracking data and return stats", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockPageViewDeleteMany.mockResolvedValueOnce({ count: 1000 });
    mockAnalyticsEventDeleteMany.mockResolvedValueOnce({ count: 500 });
    mockVisitorSessionDeleteMany.mockResolvedValueOnce({ count: 200 });
    mockCampaignMetricsCacheDeleteMany.mockResolvedValueOnce({ count: 50 });

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.retentionDays).toBe(90);
    expect(data.deleted.visitorSessions).toBe(200);
    expect(data.deleted.pageViews).toBe(1000);
    expect(data.deleted.analyticsEvents).toBe(500);
    expect(data.deleted.metricsCache).toBe(50);
    expect(data.totalDeleted).toBe(1750);
    expect(data.durationMs).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });

  it("should use correct cutoff date (90 days ago)", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockPageViewDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockAnalyticsEventDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockVisitorSessionDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockCampaignMetricsCacheDeleteMany.mockResolvedValueOnce({ count: 0 });

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    await GET(request);

    // Verify the cutoff date is approximately 90 days ago
    const pageViewsCall = mockPageViewDeleteMany.mock.calls[0]?.[0] as {
      where: { timestamp: { lt: Date; }; };
    };
    expect(pageViewsCall).toBeDefined();
    const cutoffDate = pageViewsCall.where.timestamp.lt;
    const expectedCutoff = new Date();
    expectedCutoff.setDate(expectedCutoff.getDate() - 90);

    // Allow 1 day variance for timing
    const diffDays = Math.abs(
      (cutoffDate.getTime() - expectedCutoff.getTime()) / (1000 * 60 * 60 * 24),
    );
    expect(diffDays).toBeLessThan(1);
  });

  it("should delete page views and events before sessions", async () => {
    process.env.CRON_SECRET = "test-secret";
    const callOrder: string[] = [];

    mockPageViewDeleteMany.mockImplementationOnce(() => {
      callOrder.push("pageViews");
      return Promise.resolve({ count: 0 });
    });
    mockAnalyticsEventDeleteMany.mockImplementationOnce(() => {
      callOrder.push("analyticsEvents");
      return Promise.resolve({ count: 0 });
    });
    mockVisitorSessionDeleteMany.mockImplementationOnce(() => {
      callOrder.push("visitorSessions");
      return Promise.resolve({ count: 0 });
    });
    mockCampaignMetricsCacheDeleteMany.mockImplementationOnce(() => {
      callOrder.push("metricsCache");
      return Promise.resolve({ count: 0 });
    });

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    await GET(request);

    // Page views and events should be deleted before sessions
    expect(callOrder.indexOf("pageViews")).toBeLessThan(
      callOrder.indexOf("visitorSessions"),
    );
    expect(callOrder.indexOf("analyticsEvents")).toBeLessThan(
      callOrder.indexOf("visitorSessions"),
    );
  });

  it("should return 500 on database error", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockPageViewDeleteMany.mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("Database connection failed");
  });

  it("should handle zero records to delete", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockPageViewDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockAnalyticsEventDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockVisitorSessionDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockCampaignMetricsCacheDeleteMany.mockResolvedValueOnce({ count: 0 });

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.totalDeleted).toBe(0);
  });
});
