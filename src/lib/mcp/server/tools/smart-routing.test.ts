import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  policyRule: { findMany: vi.fn(), update: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerSmartRoutingTools } from "./smart-routing";

function createMockRegistry(): ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> } {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn((def: { name: string; handler: (...args: unknown[]) => unknown }) => {
      handlers.set(def.name, def.handler);
    }),
    handlers,
  };
  return registry as unknown as ToolRegistry & { handlers: Map<string, (...args: unknown[]) => unknown> };
}

function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

describe("smart-routing tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerSmartRoutingTools(registry, userId);
  });

  it("should register 3 smart-routing tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(3);
    expect(registry.handlers.has("routing_get_config")).toBe(true);
    expect(registry.handlers.has("routing_update_rule")).toBe(true);
    expect(registry.handlers.has("routing_get_stats")).toBe(true);
  });

  describe("routing_get_config", () => {
    it("should return routing rules", async () => {
      mockPrisma.policyRule.findMany.mockResolvedValue([
        { id: "r1", name: "API Route", description: "Routes API traffic", category: "api", ruleType: "route", severity: "WARNING", isBlocking: false, isActive: true },
      ]);
      const handler = registry.handlers.get("routing_get_config")!;
      const result = await handler({});
      expect(getText(result)).toContain("API Route");
      expect(getText(result)).toContain("[ON]");
      expect(getText(result)).toContain("[WARNING]");
    });

    it("should return message when no rules", async () => {
      mockPrisma.policyRule.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("routing_get_config")!;
      const result = await handler({});
      expect(getText(result)).toContain("No routing rules configured");
    });
  });

  describe("routing_update_rule", () => {
    it("should update a rule", async () => {
      mockPrisma.policyRule.update.mockResolvedValue({
        id: "r1", name: "API Route", isActive: false, severity: "ERROR", isBlocking: true,
      });
      const handler = registry.handlers.get("routing_update_rule")!;
      const result = await handler({ rule_id: "r1", is_active: false, severity: "ERROR" });
      expect(getText(result)).toContain("Rule Updated");
      expect(getText(result)).toContain("API Route");
      expect(getText(result)).toContain("false");
    });

    it("should return message when no updates provided", async () => {
      const handler = registry.handlers.get("routing_update_rule")!;
      const result = await handler({ rule_id: "r1" });
      expect(getText(result)).toContain("No updates provided");
    });
  });

  describe("routing_get_stats", () => {
    it("should return routing stats", async () => {
      mockPrisma.policyRule.findMany.mockResolvedValue([
        { id: "r1", name: "API Route", category: "api", severity: "WARNING", isBlocking: false, version: 3 },
      ]);
      const handler = registry.handlers.get("routing_get_stats")!;
      const result = await handler({});
      expect(getText(result)).toContain("Routing Stats");
      expect(getText(result)).toContain("Active Rules:** 1");
      expect(getText(result)).toContain("API Route");
      expect(getText(result)).toContain("v3");
    });
  });
});
