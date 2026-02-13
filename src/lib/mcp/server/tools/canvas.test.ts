import { describe, expect, it, vi, beforeEach } from "vitest";

import type { ToolRegistry } from "../tool-registry";
import { registerCanvasTools } from "./canvas";

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

describe("canvas tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerCanvasTools(registry, userId); });

  it("should register 3 canvas tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(3);
    expect(registry.handlers.has("canvas_get")).toBe(true);
    expect(registry.handlers.has("canvas_create")).toBe(true);
    expect(registry.handlers.has("canvas_update")).toBe(true);
  });

  describe("canvas_get", () => {
    it("should return TODO stub for Canvas model", async () => {
      const handler = registry.handlers.get("canvas_get")!;
      const result = await handler({ canvas_id: "cv1" });
      expect(getText(result)).toContain("Canvas model not yet added to schema");
    });
  });

  describe("canvas_create", () => {
    it("should return TODO stub for Canvas model", async () => {
      const handler = registry.handlers.get("canvas_create")!;
      const result = await handler({ title: "New Banner" });
      expect(getText(result)).toContain("Canvas model not yet added to schema");
    });
  });

  describe("canvas_update", () => {
    it("should return TODO stub for Canvas model", async () => {
      const handler = registry.handlers.get("canvas_update")!;
      const result = await handler({ canvas_id: "cv1", published: true });
      expect(getText(result)).toContain("Canvas model not yet added to schema");
    });
  });
});
