/**
 * Benchmark API Route Tests
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

// Mock workspace-metrics
vi.mock("@/lib/scout/workspace-metrics", () => ({
  getWorkspaceMetrics: vi.fn(),
}));

// Mock competitor-analyzer
vi.mock("@/lib/scout/competitor-analyzer", () => ({
  generateBenchmarkReport: vi.fn(),
}));

// Import after mocks
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateBenchmarkReport } from "@/lib/scout/competitor-analyzer";
import { getWorkspaceMetrics } from "@/lib/scout/workspace-metrics";

import { GET } from "./route";

describe("Benchmark API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/orbit/test-workspace/scout/benchmark",
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: "test-workspace" }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when workspace not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/orbit/nonexistent/scout/benchmark",
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: "nonexistent" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Workspace not found");
  });

  it("should return 400 for invalid startDate", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue({
      id: "ws-1",
      slug: "test-workspace",
    } as any);

    const req = new NextRequest(
      "http://localhost/api/orbit/test-workspace/scout/benchmark?startDate=invalid",
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: "test-workspace" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid startDate parameter");
  });

  it("should return 400 for invalid endDate", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue({
      id: "ws-1",
      slug: "test-workspace",
    } as any);

    const req = new NextRequest(
      "http://localhost/api/orbit/test-workspace/scout/benchmark?endDate=invalid",
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: "test-workspace" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid endDate parameter");
  });

  it("should return benchmark data with default dates", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue({
      id: "ws-1",
      slug: "test-workspace",
    } as any);

    const mockOwnMetrics = {
      averageLikes: 100,
      averageComments: 20,
      averageShares: 10,
      totalPosts: 50,
      engagementRate: 0.05,
    };

    const mockBenchmark = {
      competitorMetrics: {
        averageLikes: 80,
        averageComments: 15,
        averageShares: 8,
        totalPosts: 40,
      },
    };

    vi.mocked(getWorkspaceMetrics).mockResolvedValue(mockOwnMetrics);
    vi.mocked(generateBenchmarkReport).mockResolvedValue(mockBenchmark as any);

    const req = new NextRequest(
      "http://localhost/api/orbit/test-workspace/scout/benchmark",
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: "test-workspace" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ownMetrics).toEqual(mockOwnMetrics);
    expect(data.competitorMetrics).toEqual(mockBenchmark.competitorMetrics);
    expect(data.period).toBeDefined();
    expect(data.period.startDate).toBeDefined();
    expect(data.period.endDate).toBeDefined();
  });

  it("should return benchmark data with custom dates", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue({
      id: "ws-1",
      slug: "test-workspace",
    } as any);

    const mockOwnMetrics = {
      averageLikes: 100,
      averageComments: 20,
      averageShares: 10,
      totalPosts: 50,
      engagementRate: 0.05,
    };

    const mockBenchmark = {
      competitorMetrics: {
        averageLikes: 80,
        averageComments: 15,
        averageShares: 8,
        totalPosts: 40,
      },
    };

    vi.mocked(getWorkspaceMetrics).mockResolvedValue(mockOwnMetrics);
    vi.mocked(generateBenchmarkReport).mockResolvedValue(mockBenchmark as any);

    const req = new NextRequest(
      "http://localhost/api/orbit/test-workspace/scout/benchmark?startDate=2024-01-01&endDate=2024-01-31",
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: "test-workspace" }) });
    await res.json(); // Parse response to ensure it's valid JSON

    expect(res.status).toBe(200);
    expect(getWorkspaceMetrics).toHaveBeenCalledWith(
      "ws-1",
      expect.any(Date),
      expect.any(Date),
    );

    // Verify the dates were parsed correctly
    const callArgs = vi.mocked(getWorkspaceMetrics).mock.calls[0];
    expect(callArgs?.[1]?.toISOString()).toContain("2024-01-01");
    expect(callArgs?.[2]?.toISOString()).toContain("2024-01-31");
  });

  it("should return default competitor metrics when no benchmark exists", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue({
      id: "ws-1",
      slug: "test-workspace",
    } as any);

    const mockOwnMetrics = {
      averageLikes: 100,
      averageComments: 20,
      averageShares: 10,
      totalPosts: 50,
      engagementRate: 0.05,
    };

    vi.mocked(getWorkspaceMetrics).mockResolvedValue(mockOwnMetrics);
    vi.mocked(generateBenchmarkReport).mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/orbit/test-workspace/scout/benchmark",
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: "test-workspace" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.competitorMetrics).toEqual({
      averageLikes: 0,
      averageComments: 0,
      averageShares: 0,
      totalPosts: 0,
    });
  });

  it("should return 500 on internal error", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.workspace.findFirst).mockRejectedValue(
      new Error("Database error"),
    );

    const req = new NextRequest(
      "http://localhost/api/orbit/test-workspace/scout/benchmark",
    );
    const res = await GET(req, { params: Promise.resolve({ workspaceSlug: "test-workspace" }) });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal Server Error");
  });
});
