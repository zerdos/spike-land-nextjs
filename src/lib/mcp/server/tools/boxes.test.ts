import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  box: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  boxMessage: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerBoxesTools } from "./boxes";

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

describe("boxes tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => { vi.clearAllMocks(); registry = createMockRegistry(); registerBoxesTools(registry, userId); });

  it("should register 7 boxes tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(7);
  });

  describe("boxes_list", () => {
    it("should list boxes", async () => {
      mockPrisma.box.findMany.mockResolvedValue([
        { id: "b1", name: "My Box", description: "Stuff", status: "ACTIVE", itemCount: 3, createdAt: new Date() },
      ]);
      const handler = registry.handlers.get("boxes_list")!;
      const result = await handler({});
      expect(getText(result)).toContain("My Box");
      expect(getText(result)).toContain("3 items");
    });

    it("should return empty message", async () => {
      mockPrisma.box.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("boxes_list")!;
      const result = await handler({});
      expect(getText(result)).toContain("No boxes found");
    });
  });

  describe("boxes_create", () => {
    it("should create box", async () => {
      mockPrisma.box.create.mockResolvedValue({ id: "b2" });
      const handler = registry.handlers.get("boxes_create")!;
      const result = await handler({ name: "New Box" });
      expect(getText(result)).toContain("Box Created");
    });
  });

  describe("boxes_get", () => {
    it("should return box details", async () => {
      mockPrisma.box.findUnique.mockResolvedValue({
        id: "b1", name: "My Box", description: "Stuff", category: "storage",
        status: "ACTIVE", itemCount: 3, createdAt: new Date(),
      });
      const handler = registry.handlers.get("boxes_get")!;
      const result = await handler({ box_id: "b1" });
      expect(getText(result)).toContain("My Box");
    });

    it("should return NOT_FOUND", async () => {
      mockPrisma.box.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("boxes_get")!;
      const result = await handler({ box_id: "nope" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("boxes_update", () => {
    it("should update box", async () => {
      mockPrisma.box.update.mockResolvedValue({ name: "Updated Box", status: "ARCHIVED" });
      const handler = registry.handlers.get("boxes_update")!;
      const result = await handler({ box_id: "b1", status: "ARCHIVED" });
      expect(getText(result)).toContain("Box Updated");
    });
  });

  describe("boxes_delete", () => {
    it("should delete box and items", async () => {
      mockPrisma.boxMessage.deleteMany.mockResolvedValue({});
      mockPrisma.box.delete.mockResolvedValue({});
      const handler = registry.handlers.get("boxes_delete")!;
      const result = await handler({ box_id: "b1" });
      expect(getText(result)).toContain("Box Deleted");
    });
  });

  describe("boxes_add_item", () => {
    it("should add item to box", async () => {
      mockPrisma.boxMessage.create.mockResolvedValue({ id: "bi1" });
      mockPrisma.box.update.mockResolvedValue({});
      const handler = registry.handlers.get("boxes_add_item")!;
      const result = await handler({ box_id: "b1", item_name: "Widget" });
      expect(getText(result)).toContain("Item Added");
    });
  });

  describe("boxes_list_items", () => {
    it("should list items", async () => {
      mockPrisma.boxMessage.findMany.mockResolvedValue([
        { id: "bi1", name: "Widget", type: "gadget", createdAt: new Date() },
      ]);
      const handler = registry.handlers.get("boxes_list_items")!;
      const result = await handler({ box_id: "b1" });
      expect(getText(result)).toContain("Widget");
    });

    it("should return empty message", async () => {
      mockPrisma.boxMessage.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("boxes_list_items")!;
      const result = await handler({ box_id: "b1" });
      expect(getText(result)).toContain("Box is empty");
    });
  });
});
