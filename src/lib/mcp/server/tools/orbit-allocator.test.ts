import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  allocatorDailyBudgetMove: { findMany: vi.fn() },
  allocatorAuditLog: { findMany: vi.fn() },
  allocatorAutopilotConfig: { upsert: vi.fn(), findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerOrbitAllocatorTools } from "./orbit-allocator";

function createMockRegistry(): ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> } {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => { handlers.set(def.name, def.handler); }),
    handlers,
  };
  return registry as unknown as ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> };
}

function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

describe("orbit-allocator tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerOrbitAllocatorTools(registry, userId); });

  it("should register 7 orbit-allocator tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(7);
  });

  describe("allocator_get_allocations", () => {
    it("should return not-yet-available message", async () => {
      const handler = registry.handlers.get("allocator_get_allocations")!;
      const result = await handler({});
      expect(getText(result)).toContain("Per-channel budget allocation tracking is not yet available");
    });

    it("should suggest using allocator_dashboard", async () => {
      const handler = registry.handlers.get("allocator_get_allocations")!;
      const result = await handler({});
      expect(getText(result)).toContain("allocator_dashboard");
    });
  });

  describe("allocator_update_allocation", () => {
    it("should return not-yet-available message", async () => {
      const handler = registry.handlers.get("allocator_update_allocation")!;
      const result = await handler({ allocation_id: "a1", amount: 2000 });
      expect(getText(result)).toContain("Direct per-channel allocation updates are not yet available");
    });
  });

  describe("allocator_create_allocation", () => {
    it("should return not-yet-available message", async () => {
      const handler = registry.handlers.get("allocator_create_allocation")!;
      const result = await handler({ channel: "email", amount: 500 });
      expect(getText(result)).toContain("Per-channel budget allocation creation is not yet available");
    });
  });

  describe("allocator_dashboard", () => {
    it("should return dashboard stats", async () => {
      mockPrisma.allocatorDailyBudgetMove.findMany.mockResolvedValue([
        { id: "m1", campaignId: "c1", totalMoved: 1000, netChange: 200, executionCount: 3, date: new Date() },
        { id: "m2", campaignId: "c2", totalMoved: 500, netChange: -100, executionCount: 2, date: new Date() },
      ]);
      const handler = registry.handlers.get("allocator_dashboard")!;
      const result = await handler({});
      expect(getText(result)).toContain("Allocator Dashboard");
      expect(getText(result)).toContain("$1500.00");
      expect(getText(result)).toContain("Net Change");
      expect(getText(result)).toContain("**Campaigns:** 2");
    });

    it("should return no moves message when empty", async () => {
      mockPrisma.allocatorDailyBudgetMove.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("allocator_dashboard")!;
      const result = await handler({});
      expect(getText(result)).toContain("No budget moves found");
    });
  });

  describe("allocator_audit_trail", () => {
    it("should return audit entries", async () => {
      mockPrisma.allocatorAuditLog.findMany.mockResolvedValue([
        {
          id: "log1",
          decisionType: "BUDGET_INCREASE",
          decisionOutcome: "APPROVED",
          aiReasoning: "Performance metrics improved",
          triggeredBy: "autopilot",
          createdAt: new Date("2025-01-15T10:00:00Z"),
        },
      ]);
      const handler = registry.handlers.get("allocator_audit_trail")!;
      const result = await handler({});
      expect(getText(result)).toContain("BUDGET_INCREASE");
      expect(getText(result)).toContain("APPROVED");
      expect(getText(result)).toContain("autopilot");
    });

    it("should return message when no entries", async () => {
      mockPrisma.allocatorAuditLog.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("allocator_audit_trail")!;
      const result = await handler({});
      expect(getText(result)).toContain("No audit entries found");
    });
  });

  describe("allocator_set_autopilot", () => {
    it("should enable autopilot", async () => {
      mockPrisma.allocatorAutopilotConfig.upsert.mockResolvedValue({});
      const handler = registry.handlers.get("allocator_set_autopilot")!;
      const result = await handler({ enabled: true, workspace_id: "ws-1" });
      expect(getText(result)).toContain("Autopilot Enabled");
      expect(getText(result)).toContain("ws-1");
    });

    it("should disable autopilot", async () => {
      mockPrisma.allocatorAutopilotConfig.upsert.mockResolvedValue({});
      const handler = registry.handlers.get("allocator_set_autopilot")!;
      const result = await handler({ enabled: false, workspace_id: "ws-1" });
      expect(getText(result)).toContain("Autopilot Disabled");
    });
  });

  describe("allocator_autopilot_status", () => {
    it("should return autopilot config", async () => {
      mockPrisma.allocatorAutopilotConfig.findMany.mockResolvedValue([
        {
          id: "cfg-1",
          campaignId: "c1",
          isEnabled: true,
          mode: "CONSERVATIVE",
          maxDailyBudgetChange: 100,
          maxSingleChange: 50,
          isEmergencyStopped: false,
          createdAt: new Date(),
        },
      ]);
      const handler = registry.handlers.get("allocator_autopilot_status")!;
      const result = await handler({ workspace_id: "ws-1" });
      expect(getText(result)).toContain("Autopilot Status");
      expect(getText(result)).toContain("CONSERVATIVE");
      expect(getText(result)).toContain("$100.00");
    });

    it("should return not configured message", async () => {
      mockPrisma.allocatorAutopilotConfig.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("allocator_autopilot_status")!;
      const result = await handler({ workspace_id: "ws-1" });
      expect(getText(result)).toContain("Not configured");
    });
  });
});
