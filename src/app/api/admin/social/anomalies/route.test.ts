/**
 * Tests for Social Media Anomaly Detection API
 *
 * Resolves #647
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { detectAnomalies, getRecentAnomalies, storeAnomaly } from "@/lib/social/anomaly-detection";
import type { SocialPlatform } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/auth/admin-middleware", () => ({
  requireAdminByUserId: vi.fn(),
}));
vi.mock("@/lib/social/anomaly-detection");
vi.mock("@/lib/prisma", () => ({
  default: {},
}));

describe("GET /api/admin/social/anomalies", () => {
  const mockSession = {
    user: { id: "user-1", email: "admin@test.com" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/admin/social/anomalies?workspaceId=ws-1",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not admin", async () => {
    vi.mocked(requireAdminByUserId).mockRejectedValue(
      new Error("Forbidden: Admin access required"),
    );

    const request = new NextRequest(
      "http://localhost/api/admin/social/anomalies?workspaceId=ws-1",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Forbidden");
  });

  it("should return 400 when workspaceId is missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/social/anomalies",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("workspaceId");
  });

  it("should return recent anomalies successfully", async () => {
    const mockAnomalies = [
      {
        accountId: "account-1",
        platform: "LINKEDIN" as SocialPlatform,
        metricType: "followers" as const,
        currentValue: 200,
        expectedValue: 100,
        zScore: 3.5,
        severity: "critical" as const,
        direction: "spike" as const,
        percentChange: 100,
        detectedAt: new Date(),
      },
    ];

    vi.mocked(getRecentAnomalies).mockResolvedValue(mockAnomalies);

    const request = new NextRequest(
      "http://localhost/api/admin/social/anomalies?workspaceId=ws-1&limit=5",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.anomalies).toHaveLength(1);
    expect(data.anomalies[0].severity).toBe("critical");
    expect(data.timestamp).toBeDefined();

    expect(getRecentAnomalies).toHaveBeenCalledWith("ws-1", 5);
  });

  it("should use default limit when not specified", async () => {
    vi.mocked(getRecentAnomalies).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/admin/social/anomalies?workspaceId=ws-1",
    );
    await GET(request);

    expect(getRecentAnomalies).toHaveBeenCalledWith("ws-1", 10);
  });
});

describe("POST /api/admin/social/anomalies", () => {
  const mockSession = {
    user: { id: "user-1", email: "admin@test.com" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(requireAdminByUserId).mockResolvedValue(undefined);
    vi.mocked(storeAnomaly).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/admin/social/anomalies",
      {
        method: "POST",
        body: JSON.stringify({ workspaceId: "ws-1" }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when workspaceId is missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/social/anomalies",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("workspaceId");
  });

  it("should trigger anomaly detection successfully", async () => {
    const mockResult = {
      workspaceId: "ws-1",
      analyzedAccounts: 5,
      anomalies: [
        {
          accountId: "account-1",
          platform: "LINKEDIN" as SocialPlatform,
          metricType: "followers" as const,
          currentValue: 200,
          expectedValue: 100,
          zScore: 3.5,
          severity: "critical" as const,
          direction: "spike" as const,
          percentChange: 100,
          detectedAt: new Date(),
        },
        {
          accountId: "account-2",
          platform: "INSTAGRAM" as SocialPlatform,
          metricType: "impressions" as const,
          currentValue: 500,
          expectedValue: 1000,
          zScore: -2.5,
          severity: "warning" as const,
          direction: "drop" as const,
          percentChange: -50,
          detectedAt: new Date(),
        },
      ],
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 150,
    };

    vi.mocked(detectAnomalies).mockResolvedValue(mockResult);

    const request = new NextRequest(
      "http://localhost/api/admin/social/anomalies",
      {
        method: "POST",
        body: JSON.stringify({ workspaceId: "ws-1" }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.analyzedAccounts).toBe(5);
    expect(data.result.anomalyCount).toBe(2);
    expect(data.result.criticalCount).toBe(1);
    expect(data.result.warningCount).toBe(1);
    expect(data.anomalies).toHaveLength(2);

    expect(detectAnomalies).toHaveBeenCalledWith("ws-1", undefined);
    expect(storeAnomaly).toHaveBeenCalledTimes(2);
  });

  it("should pass custom config to detection", async () => {
    vi.mocked(detectAnomalies).mockResolvedValue({
      workspaceId: "ws-1",
      analyzedAccounts: 0,
      anomalies: [],
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 50,
    });

    const config = {
      windowSize: 14,
      warningThreshold: 1.5,
      criticalThreshold: 2.5,
    };

    const request = new NextRequest(
      "http://localhost/api/admin/social/anomalies",
      {
        method: "POST",
        body: JSON.stringify({ workspaceId: "ws-1", config }),
      },
    );
    await POST(request);

    expect(detectAnomalies).toHaveBeenCalledWith("ws-1", config);
  });

  it("should handle detection errors gracefully", async () => {
    vi.mocked(detectAnomalies).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new NextRequest(
      "http://localhost/api/admin/social/anomalies",
      {
        method: "POST",
        body: JSON.stringify({ workspaceId: "ws-1" }),
      },
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Anomaly detection failed");
  });
});
