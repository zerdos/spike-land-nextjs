/**
 * Marketing Sync Cron Job Tests
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Store original env
const originalEnv = { ...process.env };

// Mock campaign sync
const mockSyncExternalCampaigns = vi.fn();
vi.mock("@/lib/marketing/campaign-sync", () => ({
  syncExternalCampaigns: () => mockSyncExternalCampaigns(),
}));

// Mock metrics cache cleanup
const mockCleanupExpiredCache = vi.fn();
vi.mock("@/lib/tracking/metrics-cache", () => ({
  cleanupExpiredCache: () => mockCleanupExpiredCache(),
}));

const { GET } = await import("./route");

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/cron/marketing-sync");

  return new NextRequest(url, {
    method: "GET",
    headers: new Headers(headers),
  });
}

describe("Marketing Sync Cron Job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return 401 if no CRON_SECRET configured in production", async () => {
    process.env.NODE_ENV = "production";
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
    mockSyncExternalCampaigns.mockResolvedValueOnce({ synced: 0, errors: [] });
    mockCleanupExpiredCache.mockResolvedValueOnce(0);

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
    mockSyncExternalCampaigns.mockResolvedValueOnce({ synced: 0, errors: [] });
    mockCleanupExpiredCache.mockResolvedValueOnce(0);

    const request = createMockRequest({
      "x-cron-secret": "test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("should allow requests in development without secret", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.CRON_SECRET;
    mockSyncExternalCampaigns.mockResolvedValueOnce({ synced: 0, errors: [] });
    mockCleanupExpiredCache.mockResolvedValueOnce(0);

    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should return sync results on success", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockSyncExternalCampaigns.mockResolvedValueOnce({
      synced: 5,
      errors: [],
    });
    mockCleanupExpiredCache.mockResolvedValueOnce(3);

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.synced).toBe(5);
    expect(data.errors).toHaveLength(0);
    expect(data.cacheCleanedUp).toBe(3);
    expect(data.durationMs).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });

  it("should return errors from sync", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockSyncExternalCampaigns.mockResolvedValueOnce({
      synced: 2,
      errors: ["Account fb-123: Token expired", "Campaign camp-1: API error"],
    });
    mockCleanupExpiredCache.mockResolvedValueOnce(0);

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.synced).toBe(2);
    expect(data.errors).toHaveLength(2);
    expect(data.errors[0]).toContain("Token expired");
  });

  it("should return 500 on sync failure", async () => {
    process.env.CRON_SECRET = "test-secret";
    mockSyncExternalCampaigns.mockRejectedValueOnce(new Error("Database connection failed"));

    const request = createMockRequest({
      authorization: "Bearer test-secret",
    });
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("Database connection failed");
  });
});
