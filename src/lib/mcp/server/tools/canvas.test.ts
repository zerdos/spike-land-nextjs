import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  canvas: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

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
    it("should return canvas details", async () => {
      mockPrisma.canvas.findUnique.mockResolvedValue({
        id: "cv1", title: "Banner", width: 1920, height: 1080, backgroundColor: "#ffffff",
        published: false, elementCount: 5, createdAt: new Date(),
      });
      const handler = registry.handlers.get("canvas_get")!;
      const result = await handler({ canvas_id: "cv1" });
      expect(getText(result)).toContain("Banner");
      expect(getText(result)).toContain("1920x1080");
    });

    it("should return NOT_FOUND", async () => {
      mockPrisma.canvas.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("canvas_get")!;
      const result = await handler({ canvas_id: "nope" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("canvas_create", () => {
    it("should create canvas", async () => {
      mockPrisma.canvas.create.mockResolvedValue({ id: "cv2" });
      const handler = registry.handlers.get("canvas_create")!;
      const result = await handler({ title: "New Banner" });
      expect(getText(result)).toContain("Canvas Created");
      expect(getText(result)).toContain("New Banner");
    });
  });

  describe("canvas_update", () => {
    it("should update canvas", async () => {
      mockPrisma.canvas.update.mockResolvedValue({ id: "cv1", published: true });
      const handler = registry.handlers.get("canvas_update")!;
      const result = await handler({ canvas_id: "cv1", published: true });
      expect(getText(result)).toContain("Canvas Updated");
    });
  });
});
