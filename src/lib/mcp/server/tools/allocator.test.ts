import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  allocatorCampaign: { findMany: vi.fn(), findFirst: vi.fn() },
  allocatorAutopilotExecution: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  allocatorAutopilotConfig: { upsert: vi.fn(), findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerAllocatorTools } from "./allocator";

describe("allocator tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    mockPrisma.workspace.findFirst.mockResolvedValue({ id: "ws1", slug: "my-ws", name: "My Workspace" });
    registerAllocatorTools(registry, userId);
  });

  it("should register 6 allocator tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(6);
  });

  describe("allocator_get_recommendations", () => {
    it("should list pending recommendations", async () => {
      mockPrisma.allocatorAutopilotExecution.findMany.mockResolvedValue([
        {
          id: "exec1",
          recommendationType: "INCREASE_BUDGET",
          budgetChange: 50,
          executedAt: new Date("2024-06-01"),
          campaign: { name: "Summer Sale", platform: "FACEBOOK_ADS" },
        },
      ]);
      const handler = registry.handlers.get("allocator_get_recommendations")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("Pending Recommendations");
      expect(getText(result)).toContain("INCREASE_BUDGET");
      expect(getText(result)).toContain("Summer Sale");
      expect(getText(result)).toContain("FACEBOOK_ADS");
    });

    it("should return empty when no recommendations", async () => {
      mockPrisma.allocatorAutopilotExecution.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("allocator_get_recommendations")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("No pending recommendations");
    });

    it("should filter by campaign_id", async () => {
      mockPrisma.allocatorAutopilotExecution.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("allocator_get_recommendations")!;
      await handler({ workspace_slug: "my-ws", campaign_id: "camp1" });
      expect(mockPrisma.allocatorAutopilotExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ campaignId: "camp1" }),
        }),
      );
    });
  });

  describe("allocator_list_campaigns", () => {
    it("should list campaigns with autopilot info", async () => {
      mockPrisma.allocatorCampaign.findMany.mockResolvedValue([
        {
          id: "camp1",
          name: "Winter Promo",
          platform: "GOOGLE_ADS",
          status: "ACTIVE",
          budget: 1000,
          spend: 450,
          autopilotConfig: [{ isEnabled: true, mode: "AGGRESSIVE" }],
          _count: { adSets: 3 },
        },
      ]);
      const handler = registry.handlers.get("allocator_list_campaigns")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("Winter Promo");
      expect(getText(result)).toContain("GOOGLE_ADS");
      expect(getText(result)).toContain("ACTIVE");
      expect(getText(result)).toContain("ON");
      expect(getText(result)).toContain("AGGRESSIVE");
      expect(getText(result)).toContain("Ad Sets: 3");
    });

    it("should return empty when no campaigns", async () => {
      mockPrisma.allocatorCampaign.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("allocator_list_campaigns")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("No campaigns found");
    });

    it("should filter by platform", async () => {
      mockPrisma.allocatorCampaign.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("allocator_list_campaigns")!;
      await handler({ workspace_slug: "my-ws", platform: "LINKEDIN_ADS" });
      expect(mockPrisma.allocatorCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ platform: "LINKEDIN_ADS" }),
        }),
      );
    });
  });

  describe("allocator_get_benchmarks", () => {
    it("should display campaign benchmarks", async () => {
      mockPrisma.allocatorCampaign.findFirst.mockResolvedValue({
        id: "camp1",
        name: "Test Campaign",
        platform: "FACEBOOK_ADS",
        metrics: { cpa: 12.5, roas: 3.2, ctr: 0.045, cpm: 8.75 },
      });
      const handler = registry.handlers.get("allocator_get_benchmarks")!;
      const result = await handler({ workspace_slug: "my-ws", campaign_id: "camp1" });
      expect(getText(result)).toContain("Benchmarks for Test Campaign");
      expect(getText(result)).toContain("12.5");
      expect(getText(result)).toContain("3.2");
      expect(getText(result)).toContain("0.045");
      expect(getText(result)).toContain("8.75");
    });

    it("should handle campaign not found", async () => {
      mockPrisma.allocatorCampaign.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("allocator_get_benchmarks")!;
      const result = await handler({ workspace_slug: "my-ws", campaign_id: "nonexistent" });
      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should handle campaign with no metrics", async () => {
      mockPrisma.allocatorCampaign.findFirst.mockResolvedValue({
        id: "camp1",
        name: "Empty Campaign",
        platform: "GOOGLE_ADS",
        metrics: null,
      });
      const handler = registry.handlers.get("allocator_get_benchmarks")!;
      const result = await handler({ workspace_slug: "my-ws", campaign_id: "camp1" });
      expect(getText(result)).toContain("No metrics data available");
    });
  });

  describe("allocator_execute_move", () => {
    it("should execute a pending move", async () => {
      mockPrisma.allocatorAutopilotExecution.findFirst.mockResolvedValue({
        id: "exec1",
        recommendationType: "DECREASE_BUDGET",
        budgetChange: -30,
        campaign: { name: "Fall Sale" },
      });
      mockPrisma.allocatorAutopilotExecution.update.mockResolvedValue({
        id: "exec1",
        status: "COMPLETED",
      });
      const handler = registry.handlers.get("allocator_execute_move")!;
      const result = await handler({ workspace_slug: "my-ws", execution_id: "exec1", confirm: true });
      expect(getText(result)).toContain("Execution Completed");
      expect(getText(result)).toContain("DECREASE_BUDGET");
      expect(getText(result)).toContain("Fall Sale");
    });

    it("should reject without confirm", async () => {
      const handler = registry.handlers.get("allocator_execute_move")!;
      const result = await handler({ workspace_slug: "my-ws", execution_id: "exec1", confirm: false });
      expect(getText(result)).toContain("VALIDATION_ERROR");
      expect(getText(result)).toContain("confirm=true");
    });

    it("should handle execution not found", async () => {
      mockPrisma.allocatorAutopilotExecution.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("allocator_execute_move")!;
      const result = await handler({ workspace_slug: "my-ws", execution_id: "bad-id", confirm: true });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("allocator_get_audit_log", () => {
    it("should list audit log entries", async () => {
      mockPrisma.allocatorAutopilotExecution.findMany.mockResolvedValue([
        {
          id: "exec1",
          recommendationType: "INCREASE_BUDGET",
          status: "COMPLETED",
          budgetChange: 100,
          executedAt: new Date("2024-06-15"),
          campaign: { name: "Spring Push" },
        },
        {
          id: "exec2",
          recommendationType: "PAUSE",
          status: "PENDING",
          budgetChange: null,
          executedAt: null,
          campaign: { name: "Spring Push" },
        },
      ]);
      const handler = registry.handlers.get("allocator_get_audit_log")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("Audit Log");
      expect(getText(result)).toContain("INCREASE_BUDGET");
      expect(getText(result)).toContain("COMPLETED");
      expect(getText(result)).toContain("PAUSE");
      expect(getText(result)).toContain("PENDING");
    });

    it("should return empty when no audit entries", async () => {
      mockPrisma.allocatorAutopilotExecution.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("allocator_get_audit_log")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("No executions found");
    });

    it("should respect limit parameter", async () => {
      mockPrisma.allocatorAutopilotExecution.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("allocator_get_audit_log")!;
      await handler({ workspace_slug: "my-ws", limit: 5 });
      expect(mockPrisma.allocatorAutopilotExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe("allocator_set_guardrails", () => {
    it("should upsert guardrail configuration", async () => {
      mockPrisma.allocatorAutopilotConfig.upsert.mockResolvedValue({
        id: "cfg1",
        maxDailyBudgetChange: 200,
        maxSingleChange: 50,
        minRoasThreshold: 2.0,
        maxCpaThreshold: 25,
        pauseOnAnomaly: true,
      });
      const handler = registry.handlers.get("allocator_set_guardrails")!;
      const result = await handler({
        workspace_slug: "my-ws",
        max_daily_budget_change: 200,
        max_single_change: 50,
        min_roas_threshold: 2.0,
        max_cpa_threshold: 25,
        pause_on_anomaly: true,
      });
      expect(getText(result)).toContain("Guardrails Updated");
      expect(getText(result)).toContain("200");
      expect(getText(result)).toContain("50");
      expect(getText(result)).toContain("2");
      expect(getText(result)).toContain("25");
      expect(getText(result)).toContain("true");
    });

    it("should support campaign-specific guardrails", async () => {
      mockPrisma.allocatorAutopilotConfig.upsert.mockResolvedValue({
        id: "cfg2",
        maxDailyBudgetChange: 100,
        maxSingleChange: null,
        minRoasThreshold: null,
        maxCpaThreshold: null,
        pauseOnAnomaly: null,
      });
      const handler = registry.handlers.get("allocator_set_guardrails")!;
      const result = await handler({
        workspace_slug: "my-ws",
        campaign_id: "camp1",
        max_daily_budget_change: 100,
      });
      expect(getText(result)).toContain("Guardrails Updated");
      expect(mockPrisma.allocatorAutopilotConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workspaceId_campaignId: { workspaceId: "ws1", campaignId: "camp1" },
          },
        }),
      );
    });

    it("should handle workspace not found", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("allocator_set_guardrails")!;
      const result = await handler({ workspace_slug: "bad-ws" });
      expect(getText(result)).toContain("Error");
    });
  });
});
