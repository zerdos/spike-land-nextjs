import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  user: { findUnique: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerBrandBrainTools } from "./brand-brain";

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

describe("brand-brain tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerBrandBrainTools(registry, userId);
  });

  it("should register 2 brand-brain tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(2);
    expect(registry.handlers.has("brand_brain_rewrite")).toBe(true);
    expect(registry.handlers.has("brand_brain_analyze")).toBe(true);
  });

  describe("brand_brain_rewrite", () => {
    it("should rewrite text", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId, name: "Alice" });
      const handler = registry.handlers.get("brand_brain_rewrite")!;
      const result = await handler({ text: "Buy our product now!" });
      const text = getText(result);
      expect(text).toContain("Brand Brain Rewrite");
      expect(text).toContain("Buy our product now!");
    });

    it("should use custom voice and tone", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId, name: "Alice" });
      const handler = registry.handlers.get("brand_brain_rewrite")!;
      const result = await handler({ text: "Hello world", brand_voice: "spike", tone: "casual" });
      const text = getText(result);
      expect(text).toContain("spike");
      expect(text).toContain("casual");
    });

    it("should return NOT_FOUND for missing user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("brand_brain_rewrite")!;
      const result = await handler({ text: "test" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("brand_brain_analyze", () => {
    it("should analyze text", async () => {
      const handler = registry.handlers.get("brand_brain_analyze")!;
      const result = await handler({ text: "This is a professional business communication. We aim to deliver excellence." });
      const text = getText(result);
      expect(text).toContain("Brand Voice Analysis");
      expect(text).toContain("Word Count");
      expect(text).toContain("Sentences");
    });

    it("should detect casual tone", async () => {
      const handler = registry.handlers.get("brand_brain_analyze")!;
      const result = await handler({ text: "Hey! Cool app! Love it!" });
      const text = getText(result);
      expect(text).toContain("Has Exclamations:** true");
    });
  });
});
