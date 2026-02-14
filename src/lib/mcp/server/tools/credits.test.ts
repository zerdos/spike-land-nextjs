import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetBalance = vi.fn();

vi.mock("@/lib/credits/workspace-credit-manager", () => ({
  WorkspaceCreditManager: {
    getBalance: mockGetBalance,
  },
}));

import type { ToolRegistry } from "../tool-registry";
import { registerCreditsTools } from "./credits";

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

describe("credits tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerCreditsTools(registry, userId); });

  it("should register 1 credits tool", () => {
    expect(registry.register).toHaveBeenCalledTimes(1);
  });

  describe("credits_get_balance", () => {
    it("should return credit balance details", async () => {
      mockGetBalance.mockResolvedValue({
        remaining: 750,
        limit: 1000,
        used: 250,
        tier: "PRO",
        workspaceId: "ws-abc",
      });
      const handler = registry.handlers.get("credits_get_balance")!;
      const result = await handler({});
      expect(getText(result)).toContain("AI Credit Balance");
      expect(getText(result)).toContain("750");
      expect(getText(result)).toContain("1000");
      expect(getText(result)).toContain("250");
      expect(getText(result)).toContain("PRO");
      expect(getText(result)).toContain("ws-abc");
    });

    it("should return error when balance is null", async () => {
      mockGetBalance.mockResolvedValue(null);
      const handler = registry.handlers.get("credits_get_balance")!;
      const result = await handler({});
      expect(getText(result)).toContain("Error");
      expect(getText(result)).toContain("Unable to retrieve credit balance");
      expect(getText(result)).toContain("No active workspace found");
    });

    it("should call getBalance with correct userId", async () => {
      mockGetBalance.mockResolvedValue({
        remaining: 0,
        limit: 100,
        used: 100,
        tier: "FREE",
        workspaceId: "ws-123",
      });
      const handler = registry.handlers.get("credits_get_balance")!;
      await handler({});
      expect(mockGetBalance).toHaveBeenCalledWith(userId);
    });

    it("should display zero remaining credits", async () => {
      mockGetBalance.mockResolvedValue({
        remaining: 0,
        limit: 500,
        used: 500,
        tier: "STARTER",
        workspaceId: "ws-zero",
      });
      const handler = registry.handlers.get("credits_get_balance")!;
      const result = await handler({});
      expect(getText(result)).toContain("**Remaining:** 0");
      expect(getText(result)).toContain("**Used:** 500");
      expect(getText(result)).toContain("**Limit:** 500");
    });
  });
});
