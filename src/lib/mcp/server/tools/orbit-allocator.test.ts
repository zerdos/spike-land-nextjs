import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  budgetAllocation: { findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  auditLog: { findMany: vi.fn() },
  autopilotConfig: { upsert: vi.fn(), findUnique: vi.fn() },
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
    it("should return allocations", async () => {
      mockPrisma.budgetAllocation.findMany.mockResolvedValue([
        { id: "a1", channel: "social", amount: 1000, spent: 500, period: "current" },
      ]);
      const handler = registry.handlers.get("allocator_get_allocations")!;
      const result = await handler({});
      expect(getText(result)).toContain("social");
      expect(getText(result)).toContain("$500.00");
    });

    it("should return message when no allocations", async () => {
      mockPrisma.budgetAllocation.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("allocator_get_allocations")!;
      const result = await handler({});
      expect(getText(result)).toContain("No allocations found");
    });
  });

  describe("allocator_update_allocation", () => {
    it("should update allocation", async () => {
      mockPrisma.budgetAllocation.update.mockResolvedValue({ id: "a1", channel: "social", amount: 2000 });
      const handler = registry.handlers.get("allocator_update_allocation")!;
      const result = await handler({ allocation_id: "a1", amount: 2000 });
      expect(getText(result)).toContain("Allocation Updated");
    });
  });

  describe("allocator_create_allocation", () => {
    it("should create allocation", async () => {
      mockPrisma.budgetAllocation.create.mockResolvedValue({ id: "a2" });
      const handler = registry.handlers.get("allocator_create_allocation")!;
      const result = await handler({ channel: "email", amount: 500 });
      expect(getText(result)).toContain("Allocation Created");
    });
  });

  describe("allocator_dashboard", () => {
    it("should return dashboard stats", async () => {
      mockPrisma.budgetAllocation.findMany.mockResolvedValue([
        { channel: "social", amount: 1000, spent: 500 },
        { channel: "email", amount: 500, spent: 200 },
      ]);
      const handler = registry.handlers.get("allocator_dashboard")!;
      const result = await handler({});
      expect(getText(result)).toContain("Allocator Dashboard");
      expect(getText(result)).toContain("$1500.00");
    });
  });

  describe("allocator_audit_trail", () => {
    it("should return audit entries", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: "log1", action: "UPDATE", details: "Changed budget", createdAt: new Date() },
      ]);
      const handler = registry.handlers.get("allocator_audit_trail")!;
      const result = await handler({});
      expect(getText(result)).toContain("UPDATE");
    });

    it("should return message when no entries", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("allocator_audit_trail")!;
      const result = await handler({});
      expect(getText(result)).toContain("No audit entries found");
    });
  });

  describe("allocator_set_autopilot", () => {
    it("should enable autopilot", async () => {
      mockPrisma.autopilotConfig.upsert.mockResolvedValue({});
      const handler = registry.handlers.get("allocator_set_autopilot")!;
      const result = await handler({ enabled: true, max_daily_spend: 100 });
      expect(getText(result)).toContain("Autopilot Enabled");
    });
  });

  describe("allocator_autopilot_status", () => {
    it("should return autopilot config", async () => {
      mockPrisma.autopilotConfig.findUnique.mockResolvedValue({ enabled: true, maxDailySpend: 100, channels: ["social"] });
      const handler = registry.handlers.get("allocator_autopilot_status")!;
      const result = await handler({});
      expect(getText(result)).toContain("Autopilot Status");
    });

    it("should return not configured message", async () => {
      mockPrisma.autopilotConfig.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("allocator_autopilot_status")!;
      const result = await handler({});
      expect(getText(result)).toContain("Not configured");
    });
  });
});
