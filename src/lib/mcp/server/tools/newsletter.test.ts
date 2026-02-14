import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  newsletterSubscriber: { upsert: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerNewsletterTools } from "./newsletter";

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

describe("newsletter tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerNewsletterTools(registry, userId); });

  it("should register 1 newsletter tool", () => {
    expect(registry.register).toHaveBeenCalledTimes(1);
  });

  describe("newsletter_subscribe", () => {
    it("should subscribe a new email", async () => {
      mockPrisma.newsletterSubscriber.upsert.mockResolvedValue({
        email: "test@example.com",
        subscribedAt: new Date("2024-06-15T12:00:00Z"),
        source: "mcp",
      });
      const handler = registry.handlers.get("newsletter_subscribe")!;
      const result = await handler({ email: "test@example.com" });
      expect(getText(result)).toContain("Newsletter Subscription Confirmed!");
      expect(getText(result)).toContain("test@example.com");
      expect(getText(result)).toContain("2024-06-15");
      expect(getText(result)).toContain("mcp");
      expect(mockPrisma.newsletterSubscriber.upsert).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        create: { email: "test@example.com", source: "mcp" },
        update: { unsubscribed: false, unsubscribedAt: null },
      });
    });

    it("should re-subscribe a previously unsubscribed email", async () => {
      mockPrisma.newsletterSubscriber.upsert.mockResolvedValue({
        email: "returning@example.com",
        subscribedAt: new Date("2024-01-01T00:00:00Z"),
        source: "mcp",
      });
      const handler = registry.handlers.get("newsletter_subscribe")!;
      const result = await handler({ email: "returning@example.com" });
      expect(getText(result)).toContain("Newsletter Subscription Confirmed!");
      expect(getText(result)).toContain("returning@example.com");
      expect(mockPrisma.newsletterSubscriber.upsert).toHaveBeenCalledWith(expect.objectContaining({
        update: { unsubscribed: false, unsubscribedAt: null },
      }));
    });

    it("should handle database errors gracefully via safeToolCall", async () => {
      mockPrisma.newsletterSubscriber.upsert.mockRejectedValue(new Error("Database connection failed"));
      const handler = registry.handlers.get("newsletter_subscribe")!;
      const result = await handler({ email: "fail@example.com" });
      expect(getText(result)).toContain("Error");
    });
  });
});
