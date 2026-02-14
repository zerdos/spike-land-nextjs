import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspaceMember: {
    findFirst: vi.fn(),
  },
  workspace: {
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerBillingTools } from "./billing";

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

describe("billing tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerBillingTools(registry, userId); });

  it("should register 2 billing tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(2);
  });

  describe("billing_create_checkout", () => {
    it("should create checkout intent for tokens", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValue({ role: "OWNER" });
      const handler = registry.handlers.get("billing_create_checkout")!;
      const result = await handler({ type: "tokens", workspace_id: "ws-1" });
      expect(getText(result)).toContain("Checkout Session Intent");
      expect(getText(result)).toContain("tokens");
      expect(getText(result)).toContain("ws-1");
      expect(getText(result)).toContain("OWNER");
    });

    it("should create checkout intent for subscription", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValue({ role: "ADMIN" });
      const handler = registry.handlers.get("billing_create_checkout")!;
      const result = await handler({ type: "subscription", workspace_id: "ws-2" });
      expect(getText(result)).toContain("Checkout Session Intent");
      expect(getText(result)).toContain("subscription");
      expect(getText(result)).toContain("ws-2");
      expect(getText(result)).toContain("ADMIN");
    });

    it("should create checkout intent for workspace_tier", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValue({ role: "MEMBER" });
      const handler = registry.handlers.get("billing_create_checkout")!;
      const result = await handler({ type: "workspace_tier", workspace_id: "ws-3" });
      expect(getText(result)).toContain("Checkout Session Intent");
      expect(getText(result)).toContain("workspace_tier");
      expect(getText(result)).toContain("ws-3");
      expect(getText(result)).toContain("MEMBER");
    });

    it("should return error when not a workspace member", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("billing_create_checkout")!;
      const result = await handler({ type: "tokens", workspace_id: "ws-nope" });
      expect(getText(result)).toContain("Error");
      expect(getText(result)).toContain("Workspace not found or you are not a member");
    });

    it("should verify workspace membership with correct params", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValue({ role: "OWNER" });
      const handler = registry.handlers.get("billing_create_checkout")!;
      await handler({ type: "tokens", workspace_id: "ws-check" });
      expect(mockPrisma.workspaceMember.findFirst).toHaveBeenCalledWith({
        where: { userId, workspaceId: "ws-check" },
        select: { role: true },
      });
    });

    it("should include checkout instructions in result", async () => {
      mockPrisma.workspaceMember.findFirst.mockResolvedValue({ role: "OWNER" });
      const handler = registry.handlers.get("billing_create_checkout")!;
      const result = await handler({ type: "tokens", workspace_id: "ws-1" });
      expect(getText(result)).toContain("billing page");
      expect(getText(result)).toContain("POST /api/stripe/checkout");
    });
  });

  describe("billing_get_subscription", () => {
    it("should return subscription status", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        name: "My Workspace",
        subscriptionTier: "PRO",
        stripeSubscriptionId: "sub_abc123",
        monthlyAiCredits: 5000,
        usedAiCredits: 1200,
      });
      const handler = registry.handlers.get("billing_get_subscription")!;
      const result = await handler({});
      expect(getText(result)).toContain("Subscription Status");
      expect(getText(result)).toContain("My Workspace");
      expect(getText(result)).toContain("ws-1");
      expect(getText(result)).toContain("PRO");
      expect(getText(result)).toContain("Yes");
      expect(getText(result)).toContain("5000");
      expect(getText(result)).toContain("1200");
      expect(getText(result)).toContain("3800");
    });

    it("should show No for active subscription when no stripeSubscriptionId", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-2",
        name: "Free Workspace",
        subscriptionTier: "FREE",
        stripeSubscriptionId: null,
        monthlyAiCredits: 100,
        usedAiCredits: 50,
      });
      const handler = registry.handlers.get("billing_get_subscription")!;
      const result = await handler({});
      expect(getText(result)).toContain("**Active Stripe Subscription:** No");
      expect(getText(result)).toContain("FREE");
      expect(getText(result)).toContain("**Remaining:** 50");
    });

    it("should clamp remaining credits to 0 when overused", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-3",
        name: "Overused Workspace",
        subscriptionTier: "STARTER",
        stripeSubscriptionId: "sub_xyz",
        monthlyAiCredits: 200,
        usedAiCredits: 300,
      });
      const handler = registry.handlers.get("billing_get_subscription")!;
      const result = await handler({});
      expect(getText(result)).toContain("**Remaining:** 0");
      expect(getText(result)).toContain("**Used:** 300");
    });

    it("should return error when no personal workspace found", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("billing_get_subscription")!;
      const result = await handler({});
      expect(getText(result)).toContain("Error");
      expect(getText(result)).toContain("No personal workspace found");
    });

    it("should query workspace with correct filters", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        name: "Test",
        subscriptionTier: "FREE",
        stripeSubscriptionId: null,
        monthlyAiCredits: 100,
        usedAiCredits: 0,
      });
      const handler = registry.handlers.get("billing_get_subscription")!;
      await handler({});
      expect(mockPrisma.workspace.findFirst).toHaveBeenCalledWith({
        where: {
          isPersonal: true,
          members: { some: { userId } },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          subscriptionTier: true,
          stripeSubscriptionId: true,
          monthlyAiCredits: true,
          usedAiCredits: true,
        },
      });
    });
  });
});
