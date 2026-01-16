/**
 * Tests for Pulse Dashboard API
 *
 * Resolves #649
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findFirst: vi.fn(),
    },
    socialAccount: {
      findMany: vi.fn(),
    },
    socialMetrics: {
      findMany: vi.fn(),
    },
    socialMetricAnomaly: {
      findMany: vi.fn(),
    },
  },
}));

// Mock anomaly detection
vi.mock("@/lib/social/anomaly-detection", () => ({
  getWorkspaceHealth: vi.fn(),
  getRecentAnomalies: vi.fn(),
}));

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getRecentAnomalies, getWorkspaceHealth } from "@/lib/social/anomaly-detection";

describe("Pulse API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/orbit/[workspaceSlug]/pulse", () => {
    const mockRequest = new NextRequest(
      "http://localhost:3000/api/orbit/test-workspace/pulse",
    );
    const mockParams = {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    };

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const response = await GET(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when workspace not found", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce(null);

      const response = await GET(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace not found or access denied");
    });

    it("should return pulse data successfully", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
        name: "Test Workspace",
      } as never);

      vi.mocked(getWorkspaceHealth).mockResolvedValueOnce({
        status: "healthy",
        criticalCount: 0,
        warningCount: 0,
        lastChecked: new Date("2024-01-15T10:00:00Z"),
      });

      vi.mocked(getRecentAnomalies).mockResolvedValueOnce([]);

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.socialMetricAnomaly.findMany).mockResolvedValueOnce([]);

      const response = await GET(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.health).toBeDefined();
      expect(data.health.status).toBe("healthy");
      expect(data.anomalies).toEqual([]);
      expect(data.platforms).toEqual([]);
      expect(data.trends).toEqual([]);
      expect(data.workspaceName).toBe("Test Workspace");
    });

    it("should return platform status data", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
        name: "Test Workspace",
      } as never);

      vi.mocked(getWorkspaceHealth).mockResolvedValueOnce({
        status: "warning",
        criticalCount: 0,
        warningCount: 1,
        lastChecked: new Date("2024-01-15T10:00:00Z"),
      });

      vi.mocked(getRecentAnomalies).mockResolvedValueOnce([
        {
          accountId: "account-1",
          platform: "LINKEDIN",
          metricType: "followers",
          currentValue: 10000,
          expectedValue: 5000,
          zScore: 2.5,
          severity: "warning",
          direction: "spike",
          percentChange: 100,
          detectedAt: new Date("2024-01-15T09:00:00Z"),
        },
      ]);

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValueOnce([
        {
          id: "account-1",
          platform: "LINKEDIN",
          accountName: "Test LinkedIn",
          updatedAt: new Date("2024-01-15T10:00:00Z"),
          metrics: [
            { followers: 10000, date: new Date("2024-01-15") },
            { followers: 9500, date: new Date("2024-01-14") },
          ],
        },
      ] as never);

      vi.mocked(prisma.socialMetricAnomaly.findMany).mockResolvedValueOnce([
        { accountId: "account-1", severity: "warning" },
      ] as never);

      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValueOnce([]);

      const response = await GET(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.health.status).toBe("warning");
      expect(data.anomalies).toHaveLength(1);
      expect(data.anomalies[0].platform).toBe("LINKEDIN");
      expect(data.platforms).toHaveLength(1);
      expect(data.platforms[0].platform).toBe("LINKEDIN");
      expect(data.platforms[0].status).toBe("warning");
    });

    it("should return trend data aggregated by date", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "USER" as const,
        },
        expires: new Date().toISOString(),
      });

      vi.mocked(prisma.workspace.findFirst).mockResolvedValueOnce({
        id: "workspace-1",
        name: "Test Workspace",
      } as never);

      vi.mocked(getWorkspaceHealth).mockResolvedValueOnce({
        status: "healthy",
        criticalCount: 0,
        warningCount: 0,
        lastChecked: new Date("2024-01-15T10:00:00Z"),
      });

      vi.mocked(getRecentAnomalies).mockResolvedValueOnce([]);
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.socialMetricAnomaly.findMany).mockResolvedValueOnce([]);

      const mockDate = new Date("2024-01-15T00:00:00Z");
      vi.mocked(prisma.socialMetrics.findMany).mockResolvedValueOnce([
        {
          date: mockDate,
          followers: 1000,
          impressions: 5000,
          reach: 3000,
          engagementRate: { toNumber: () => 4.5 },
        },
        {
          date: mockDate,
          followers: 2000,
          impressions: 6000,
          reach: 4000,
          engagementRate: { toNumber: () => 5.5 },
        },
      ] as never);

      const response = await GET(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trends).toHaveLength(1);
      expect(data.trends[0].followers).toBe(3000); // 1000 + 2000
      expect(data.trends[0].engagement).toBe(5); // (4.5 + 5.5) / 2
    });
  });
});
