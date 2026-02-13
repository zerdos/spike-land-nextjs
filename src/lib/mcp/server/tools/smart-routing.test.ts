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
        { id: "r1", name: "API Route", pattern: "/api/*", target: "backend-1", weight: 80, enabled: true },
      ]);
      const handler = registry.handlers.get("routing_get_config")!;
      const result = await handler({});
      expect(getText(result)).toContain("API Route");
      expect(getText(result)).toContain("80%");
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
        id: "r1", name: "API Route", enabled: false, weight: 50, target: "backend-2",
      });
      const handler = registry.handlers.get("routing_update_rule")!;
      const result = await handler({ rule_id: "r1", enabled: false, weight: 50 });
      expect(getText(result)).toContain("Rule Updated");
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
        { id: "r1", name: "API Route", weight: 80, requestCount: 1000 },
      ]);
      const handler = registry.handlers.get("routing_get_stats")!;
      const result = await handler({});
      expect(getText(result)).toContain("Routing Stats");
      expect(getText(result)).toContain("1000");
    });
  });
});
