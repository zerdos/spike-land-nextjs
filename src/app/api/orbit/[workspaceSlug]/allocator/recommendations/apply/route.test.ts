/**
 * Apply Recommendation API Route Tests
 *
 * Unit tests for the POST /api/orbit/[workspaceSlug]/allocator/recommendations/apply endpoint.
 * Resolves #807: Implement allocator recommendation application API
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
    },
    allocatorCampaign: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock AutopilotService
vi.mock("@/lib/allocator/autopilot-service", () => ({
  AutopilotService: {
    executeRecommendation: vi.fn(),
  },
}));

import { auth } from "@/auth";
import { AutopilotService } from "@/lib/allocator/autopilot-service";
import prisma from "@/lib/prisma";

describe("POST /api/orbit/[workspaceSlug]/allocator/recommendations/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(body: object): NextRequest {
    return new NextRequest(
      "http://localhost:3000/api/orbit/test-workspace/allocator/recommendations/apply",
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
      },
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
    slug: "test-workspace",
    name: "Test Workspace",
    members: [{ userId: "user-1", role: "ADMIN" }],
  };

  const mockCampaign = {
    id: "campaign-1",
    workspaceId: "workspace-1",
    name: "Test Campaign",
    platform: "FACEBOOK",
    status: "ACTIVE",
  };

  const validRequestBody = {
    recommendationId: "rec-1",
    campaignId: "campaign-1",
    currentBudget: 50000,
    suggestedNewBudget: 60000,
    type: "INCREASE_BUDGET",
    reason: "High performer",
    confidence: "high",
  };

  it("returns 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = createRequest(validRequestBody);
    const response = await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin or owner", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
      ...mockWorkspace,
      members: [], // No admin/owner role
    } as never);

    const request = createRequest(validRequestBody);
    const response = await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("Admin privileges required");
  });

  it("returns 400 if request body is invalid JSON", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );

    const request = new NextRequest(
      "http://localhost:3000/api/orbit/test-workspace/allocator/recommendations/apply",
      {
        method: "POST",
        body: "invalid-json",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid request body");
  });

  it("returns 400 if required fields are missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );

    const request = createRequest({
      currentBudget: 50000,
      suggestedNewBudget: 60000,
      // Missing recommendationId and campaignId
    });

    const response = await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 400 if budget values are not numbers", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );

    const request = createRequest({
      ...validRequestBody,
      currentBudget: "not-a-number",
      suggestedNewBudget: "also-not-a-number",
    });

    const response = await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("must be numbers");
  });

  it("returns 404 if campaign not found in workspace", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(null);

    const request = createRequest(validRequestBody);
    const response = await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("Campaign not found");
  });

  it("executes recommendation successfully with COMPLETED status", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: 10000,
      newBudget: 60000,
    });

    const request = createRequest(validRequestBody);
    const response = await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.result.status).toBe("COMPLETED");
    expect(body.message).toContain("successfully");
  });

  it("returns appropriate message for SKIPPED status", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "skipped",
      status: "SKIPPED",
      budgetChange: 0,
      newBudget: 50000,
      message: "Daily budget limit reached",
    });

    const request = createRequest(validRequestBody);
    const response = await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.result.status).toBe("SKIPPED");
    expect(body.message).toContain("skipped");
  });

  it("passes correct recommendation object to AutopilotService", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: 10000,
      newBudget: 60000,
    });

    const request = createRequest(validRequestBody);
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "rec-1",
        type: "BUDGET_INCREASE",
        workspaceId: "workspace-1",
        campaignId: "campaign-1",
        currentBudget: 50000,
        suggestedBudget: 60000,
        reason: "High performer",
        confidence: 0.9,
      }),
      "MANUAL",
    );
  });

  it("maps recommendation types correctly", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: -10000,
      newBudget: 40000,
    });

    // Test DECREASE_BUDGET mapping
    const request = createRequest({
      ...validRequestBody,
      type: "DECREASE_BUDGET",
      suggestedNewBudget: 40000,
    });
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "BUDGET_DECREASE",
      }),
      "MANUAL",
    );
  });

  it("maps REALLOCATE type correctly", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: 10000,
      newBudget: 60000,
    });

    const request = createRequest({
      ...validRequestBody,
      type: "REALLOCATE",
    });
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "REALLOCATE",
      }),
      "MANUAL",
    );
  });

  it("maps confidence levels correctly", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: 10000,
      newBudget: 60000,
    });

    // Test low confidence mapping
    const request = createRequest({
      ...validRequestBody,
      confidence: "low",
    });
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        confidence: 0.5,
      }),
      "MANUAL",
    );
  });

  it("maps medium confidence correctly", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: 10000,
      newBudget: 60000,
    });

    const request = createRequest({
      ...validRequestBody,
      confidence: "medium",
    });
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        confidence: 0.7,
      }),
      "MANUAL",
    );
  });

  it("uses default confidence for unknown values", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: 10000,
      newBudget: 60000,
    });

    const request = createRequest({
      ...validRequestBody,
      confidence: "unknown-value",
    });
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        confidence: 0.7, // Default value
      }),
      "MANUAL",
    );
  });

  it("returns 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = createRequest(validRequestBody);
    const response = await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Database connection failed");
  });

  it("includes user metadata in recommendation", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: 10000,
      newBudget: 60000,
    });

    const request = createRequest(validRequestBody);
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          userId: "user-1",
          source: "MANUAL",
        }),
        correlationId: expect.stringContaining("manual-apply-rec-1"),
      }),
      "MANUAL",
    );
  });

  it("maps SCALE_WINNER type correctly", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: 10000,
      newBudget: 60000,
    });

    const request = createRequest({
      ...validRequestBody,
      type: "SCALE_WINNER",
    });
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "BUDGET_INCREASE",
      }),
      "MANUAL",
    );
  });

  it("maps PAUSE_CAMPAIGN type correctly", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: -50000,
      newBudget: 0,
    });

    const request = createRequest({
      ...validRequestBody,
      type: "PAUSE_CAMPAIGN",
      suggestedNewBudget: 0,
    });
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "BUDGET_DECREASE",
      }),
      "MANUAL",
    );
  });

  it("maps RESUME_CAMPAIGN type correctly", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: 50000,
      newBudget: 50000,
    });

    const request = createRequest({
      ...validRequestBody,
      currentBudget: 0,
      type: "RESUME_CAMPAIGN",
    });
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "BUDGET_INCREASE",
      }),
      "MANUAL",
    );
  });

  it("uses default type mapping for unknown types", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: 10000,
      newBudget: 60000,
    });

    const request = createRequest({
      ...validRequestBody,
      type: "UNKNOWN_TYPE",
    });
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "BUDGET_INCREASE", // Default fallback
      }),
      "MANUAL",
    );
  });

  it("uses default reason when not provided", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(
      mockWorkspace as never,
    );
    vi.mocked(prisma.allocatorCampaign.findFirst).mockResolvedValue(
      mockCampaign as never,
    );
    vi.mocked(AutopilotService.executeRecommendation).mockResolvedValue({
      executionId: "exec-1",
      status: "COMPLETED",
      budgetChange: 10000,
      newBudget: 60000,
    });

    const request = createRequest({
      ...validRequestBody,
      reason: "",
    });
    await POST(request, {
      params: Promise.resolve({ workspaceSlug: "test-workspace" }),
    });

    expect(AutopilotService.executeRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "Manual application of budget recommendation",
      }),
      "MANUAL",
    );
  });
});
