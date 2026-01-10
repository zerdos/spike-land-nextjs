/**
 * Allocator API Route Tests
 *
 * Unit tests for the Allocator recommendations API endpoint.
 * Part of #548: Build Allocator recommendation engine
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    marketingAccount: {
      findMany: vi.fn(),
    },
    campaignAttribution: {
      findMany: vi.fn(),
    },
  },
}));

// Mock allocator service
vi.mock("@/lib/allocator", () => ({
  getAllocatorRecommendations: vi.fn(),
}));

import { auth } from "@/auth";
import { getAllocatorRecommendations } from "@/lib/allocator";
import prisma from "@/lib/prisma";

describe("GET /api/orbit/[workspaceSlug]/allocator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(
    workspaceSlug: string,
    params: Record<string, string> = {},
  ): NextRequest {
    const searchParams = new URLSearchParams(params);
    return new NextRequest(
      `http://localhost:3000/api/orbit/${workspaceSlug}/allocator?${searchParams.toString()}`,
    );
  }

  const mockSession = {
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@test.com",
      role: "USER" as const,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockWorkspace = {
    id: "workspace-1",
    name: "Test Workspace",
  } as never;

  it("returns 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = createRequest("test-workspace");
    const response = await GET(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 if workspace not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

    const request = createRequest("non-existent");
    const response = await GET(request, {
      params: Promise.resolve({ workspaceSlug: "non-existent" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("not found");
  });

  it("returns 400 for invalid lookbackDays", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace);

    const request = createRequest("test-workspace", { lookbackDays: "invalid" });
    const response = await GET(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("lookbackDays");
  });

  it("returns 400 for lookbackDays out of range", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace);

    const request = createRequest("test-workspace", { lookbackDays: "200" });
    const response = await GET(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("lookbackDays");
  });

  it("returns recommendations successfully", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace);

    const now = new Date();
    const mockRecommendations = {
      campaignAnalyses: [
        {
          campaignId: "campaign-1",
          campaignName: "Test Campaign",
          platform: "FACEBOOK" as const,
          accountId: "account-1",
          currentBudget: 10000,
          currency: "USD",
          metrics: {
            roas: 2.5,
            cpa: 3500,
            ctr: 1.2,
            conversionRate: 2.5,
            spend: 10000,
            conversions: 3,
            impressions: 5000,
            clicks: 60,
          },
          trend: {
            roas: "improving" as const,
            cpa: "stable" as const,
            conversions: "improving" as const,
          },
          performanceScore: 75,
          efficiencyScore: 80,
          periodStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          periodEnd: now,
          daysAnalyzed: 30,
        },
      ],
      recommendations: [
        {
          id: "rec-1",
          type: "SCALE_WINNER" as const,
          confidence: "high" as const,
          targetCampaign: {
            id: "campaign-1",
            name: "Test Campaign",
            platform: "FACEBOOK" as const,
            currentBudget: 10000,
          },
          suggestedBudgetChange: 2000,
          suggestedNewBudget: 12000,
          currency: "USD",
          projectedImpact: {
            estimatedRoasChange: 15,
            estimatedCpaChange: -10,
            estimatedConversionChange: 20,
            estimatedSpendChange: 2000,
            confidenceInterval: { low: 10, high: 30 },
          },
          reason: "High performer with improving conversions",
          supportingData: ["ROAS: 2.5x", "Performance score: 75%"],
          createdAt: now,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      ],
      summary: {
        totalCampaignsAnalyzed: 1,
        totalCurrentSpend: 10000,
        currency: "USD",
        averageRoas: 2.5,
        averageCpa: 3500,
        projectedTotalImpact: {
          estimatedRoasImprovement: 15,
          estimatedCpaSavings: -10,
          estimatedConversionIncrease: 20,
        },
      },
      analysisRange: {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now,
      },
      hasEnoughData: true,
      dataQualityScore: 85,
    };

    vi.mocked(getAllocatorRecommendations).mockResolvedValue(mockRecommendations);

    const request = createRequest("test-workspace");
    const response = await GET(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.campaignAnalyses).toHaveLength(1);
    expect(body.recommendations).toHaveLength(1);
    expect(body.hasEnoughData).toBe(true);
    expect(body.workspaceName).toBe("Test Workspace");
  });

  it("passes accountIds filter to service", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace);
    vi.mocked(getAllocatorRecommendations).mockResolvedValue({
      campaignAnalyses: [],
      recommendations: [],
      summary: {
        totalCampaignsAnalyzed: 0,
        totalCurrentSpend: 0,
        currency: "USD",
        averageRoas: 0,
        averageCpa: 0,
        projectedTotalImpact: {
          estimatedRoasImprovement: 0,
          estimatedCpaSavings: 0,
          estimatedConversionIncrease: 0,
        },
      },
      analysisRange: { start: new Date(), end: new Date() },
      hasEnoughData: false,
      dataQualityScore: 0,
    });

    const request = createRequest("test-workspace", {
      accountIds: "acc-1,acc-2",
    });
    await GET(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(getAllocatorRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({
        accountIds: ["acc-1", "acc-2"],
      }),
    );
  });

  it("passes custom lookbackDays to service", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace);
    vi.mocked(getAllocatorRecommendations).mockResolvedValue({
      campaignAnalyses: [],
      recommendations: [],
      summary: {
        totalCampaignsAnalyzed: 0,
        totalCurrentSpend: 0,
        currency: "USD",
        averageRoas: 0,
        averageCpa: 0,
        projectedTotalImpact: {
          estimatedRoasImprovement: 0,
          estimatedCpaSavings: 0,
          estimatedConversionIncrease: 0,
        },
      },
      analysisRange: { start: new Date(), end: new Date() },
      hasEnoughData: false,
      dataQualityScore: 0,
    });

    const request = createRequest("test-workspace", { lookbackDays: "60" });
    await GET(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(getAllocatorRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({
        lookbackDays: 60,
      }),
    );
  });

  it("passes riskTolerance to service", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace);
    vi.mocked(getAllocatorRecommendations).mockResolvedValue({
      campaignAnalyses: [],
      recommendations: [],
      summary: {
        totalCampaignsAnalyzed: 0,
        totalCurrentSpend: 0,
        currency: "USD",
        averageRoas: 0,
        averageCpa: 0,
        projectedTotalImpact: {
          estimatedRoasImprovement: 0,
          estimatedCpaSavings: 0,
          estimatedConversionIncrease: 0,
        },
      },
      analysisRange: { start: new Date(), end: new Date() },
      hasEnoughData: false,
      dataQualityScore: 0,
    });

    const request = createRequest("test-workspace", {
      riskTolerance: "aggressive",
    });
    await GET(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(getAllocatorRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({
        riskTolerance: "aggressive",
      }),
    );
  });

  it("uses moderate riskTolerance by default for invalid value", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace);
    vi.mocked(getAllocatorRecommendations).mockResolvedValue({
      campaignAnalyses: [],
      recommendations: [],
      summary: {
        totalCampaignsAnalyzed: 0,
        totalCurrentSpend: 0,
        currency: "USD",
        averageRoas: 0,
        averageCpa: 0,
        projectedTotalImpact: {
          estimatedRoasImprovement: 0,
          estimatedCpaSavings: 0,
          estimatedConversionIncrease: 0,
        },
      },
      analysisRange: { start: new Date(), end: new Date() },
      hasEnoughData: false,
      dataQualityScore: 0,
    });

    const request = createRequest("test-workspace", {
      riskTolerance: "invalid-value",
    });
    await GET(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(getAllocatorRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({
        riskTolerance: "moderate",
      }),
    );
  });

  it("returns 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace);
    vi.mocked(getAllocatorRecommendations).mockRejectedValue(
      new Error("Database error"),
    );

    const request = createRequest("test-workspace");
    const response = await GET(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to generate");
  });
});
