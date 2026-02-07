/**
 * Relay Workflow Metrics API Tests
 *
 * Unit tests for the workflow metrics API endpoint.
 * Resolves #569
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  },
}));

// Mock relay functions
vi.mock("@/lib/relay", () => ({
  getAggregatedFeedback: vi.fn(),
  getWorkflowMetrics: vi.fn(),
}));

// Import after mocks
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getAggregatedFeedback, getWorkflowMetrics } from "@/lib/relay";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockGetMetrics = getWorkflowMetrics as ReturnType<typeof vi.fn>;
const mockGetFeedback = getAggregatedFeedback as ReturnType<typeof vi.fn>;

describe("Relay Metrics API", () => {
  const mockSession = {
    user: { id: "user-123", email: "test@example.com" },
  };

  const mockWorkspace = {
    id: "workspace-123",
    name: "Test Workspace",
  };

  const mockMetrics = {
    averageApprovalTime: 60,
    approvalRate: 80,
    rejectionRate: 20,
    editBeforeApprovalRate: 10,
    averageEditsPerDraft: 0.5,
    sendSuccessRate: 95,
  };

  const mockFeedback = {
    totalEdits: 5,
    averageEditDistance: 10,
    editRate: 15,
    editTypeBreakdown: {
      MINOR_TWEAK: 3,
      TONE_ADJUSTMENT: 2,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(
      mockWorkspace as never,
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // GET /api/orbit/[workspaceSlug]/relay/metrics
  // ============================================

  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/metrics",
      );
      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });
      expect(response.status).toBe(401);
    });

    it("returns 404 when workspace not found", async () => {
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);
      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/metrics",
      );
      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });
      expect(response.status).toBe(404);
    });

    it("returns metrics and feedback successfully", async () => {
      mockGetMetrics.mockResolvedValue(mockMetrics);
      mockGetFeedback.mockResolvedValue(mockFeedback);

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/metrics",
      );
      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.metrics).toEqual(mockMetrics);
      expect(data.feedback).toEqual(mockFeedback);
    });

    it("validates date filters", async () => {
      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/metrics?startDate=invalid",
      );
      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid startDate");
    });

    it("passes valid dates to service functions", async () => {
      mockGetMetrics.mockResolvedValue(mockMetrics);
      mockGetFeedback.mockResolvedValue(mockFeedback);

      const startDate = "2023-01-01T00:00:00.000Z";
      const endDate = "2023-01-31T23:59:59.999Z";

      const request = new NextRequest(
        `http://localhost/api/orbit/test-workspace/relay/metrics?startDate=${startDate}&endDate=${endDate}`,
      );
      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(200);
      expect(mockGetMetrics).toHaveBeenCalledWith(
        "workspace-123",
        new Date(startDate),
        new Date(endDate),
      );
    });

    it("handles partial failure (missing feedback)", async () => {
      mockGetMetrics.mockResolvedValue(mockMetrics);
      mockGetFeedback.mockRejectedValue(new Error("Analysis service down"));

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/metrics",
      );
      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.metrics).toEqual(mockMetrics);
      expect(data.feedback).toBeNull();
    });

    it("returns 500 when metrics fetch fails", async () => {
      mockGetMetrics.mockRejectedValue(new Error("DB Error"));

      const request = new NextRequest(
        "http://localhost/api/orbit/test-workspace/relay/metrics",
      );
      const response = await GET(request, {
        params: Promise.resolve({ workspaceSlug: "test-workspace" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Failed to get workflow metrics");
    });
  });
});
