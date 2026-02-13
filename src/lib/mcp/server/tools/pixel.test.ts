import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  photo: { findUnique: vi.fn(), findMany: vi.fn() },
  pipeline: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import type { ToolRegistry } from "../tool-registry";
import { registerPixelTools } from "./pixel";

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

describe("pixel tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerPixelTools(registry, userId);
  });

  it("should register 7 pixel tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(7);
    expect(registry.handlers.has("pixel_get_image")).toBe(true);
    expect(registry.handlers.has("pixel_list_images")).toBe(true);
    expect(registry.handlers.has("pixel_create_pipeline")).toBe(true);
    expect(registry.handlers.has("pixel_get_pipeline")).toBe(true);
    expect(registry.handlers.has("pixel_run_pipeline")).toBe(true);
    expect(registry.handlers.has("pixel_list_pipelines")).toBe(true);
    expect(registry.handlers.has("pixel_list_tools")).toBe(true);
  });

  describe("pixel_get_image", () => {
    it("should return image details", async () => {
      mockPrisma.photo.findUnique.mockResolvedValue({
        id: "img-1", title: "Sunset", url: "https://example.com/sunset.jpg",
        width: 1920, height: 1080, moderationStatus: "APPROVED", createdAt: new Date(), userId,
      });
      const handler = registry.handlers.get("pixel_get_image")!;
      const result = await handler({ image_id: "img-1" });
      expect(getText(result)).toContain("Sunset");
      expect(getText(result)).toContain("1920x1080");
    });

    it("should return NOT_FOUND for missing image", async () => {
      mockPrisma.photo.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("pixel_get_image")!;
      const result = await handler({ image_id: "nope" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("pixel_list_images", () => {
    it("should list images", async () => {
      mockPrisma.photo.findMany.mockResolvedValue([
        { id: "img-1", title: "Beach", url: "https://example.com/beach.jpg", moderationStatus: "APPROVED", createdAt: new Date() },
      ]);
      const handler = registry.handlers.get("pixel_list_images")!;
      const result = await handler({});
      expect(getText(result)).toContain("Beach");
    });

    it("should return message when no images", async () => {
      mockPrisma.photo.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("pixel_list_images")!;
      const result = await handler({});
      expect(getText(result)).toContain("No pixel images found");
    });
  });

  describe("pixel_create_pipeline", () => {
    it("should create a pipeline", async () => {
      mockPrisma.pipeline.create.mockResolvedValue({ id: "pip-1", name: "Enhance", steps: ["upscale", "denoise"] });
      const handler = registry.handlers.get("pixel_create_pipeline")!;
      const result = await handler({ name: "Enhance", steps: ["upscale", "denoise"] });
      expect(getText(result)).toContain("Pipeline Created");
      expect(getText(result)).toContain("upscale → denoise");
    });
  });

  describe("pixel_get_pipeline", () => {
    it("should get pipeline details", async () => {
      mockPrisma.pipeline.findUnique.mockResolvedValue({
        id: "pip-1", name: "Enhance", status: "CREATED", steps: ["upscale", "denoise"],
      });
      const handler = registry.handlers.get("pixel_get_pipeline")!;
      const result = await handler({ pipeline_id: "pip-1" });
      expect(getText(result)).toContain("Enhance");
    });

    it("should return NOT_FOUND for missing pipeline", async () => {
      mockPrisma.pipeline.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("pixel_get_pipeline")!;
      const result = await handler({ pipeline_id: "nope" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("pixel_run_pipeline", () => {
    it("should start a pipeline", async () => {
      mockPrisma.pipeline.update.mockResolvedValue({ name: "Enhance", status: "RUNNING" });
      const handler = registry.handlers.get("pixel_run_pipeline")!;
      const result = await handler({ pipeline_id: "pip-1", image_id: "img-1" });
      expect(getText(result)).toContain("Pipeline Started");
      expect(getText(result)).toContain("RUNNING");
    });
  });

  describe("pixel_list_pipelines", () => {
    it("should list pipelines", async () => {
      mockPrisma.pipeline.findMany.mockResolvedValue([
        { id: "pip-1", name: "Enhance", status: "COMPLETED", createdAt: new Date() },
      ]);
      const handler = registry.handlers.get("pixel_list_pipelines")!;
      const result = await handler({});
      expect(getText(result)).toContain("Enhance");
    });
  });

  describe("pixel_list_tools", () => {
    it("should list all tools", async () => {
      const handler = registry.handlers.get("pixel_list_tools")!;
      const result = await handler({});
      expect(getText(result)).toContain("upscale");
      expect(getText(result)).toContain("denoise");
    });

    it("should filter by category", async () => {
      const handler = registry.handlers.get("pixel_list_tools")!;
      const result = await handler({ category: "enhancement" });
      expect(getText(result)).toContain("upscale");
      expect(getText(result)).toContain("denoise");
      expect(getText(result)).not.toContain("background_remove");
    });
  });
});
