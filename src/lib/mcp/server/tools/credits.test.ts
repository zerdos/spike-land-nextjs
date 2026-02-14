import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetBalance = vi.fn();

vi.mock("@/lib/credits/workspace-credit-manager", () => ({
  WorkspaceCreditManager: {
    getBalance: mockGetBalance,
  },
}));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerCreditsTools } from "./credits";

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
