import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockCreateGenerationJob, mockCreateModificationJob, mockPrisma, mockFetch } = vi.hoisted(() => {
  const mockCreateGenerationJob = vi.fn();
  const mockCreateModificationJob = vi.fn();
  const mockPrisma = {
    mcpGenerationJob: { findUnique: vi.fn() },
  };
  const mockFetch = vi.fn();
  return { mockCreateGenerationJob, mockCreateModificationJob, mockPrisma, mockFetch };
});

vi.mock("@/lib/mcp/generation-service", () => ({
  createGenerationJob: (...args: unknown[]) => mockCreateGenerationJob(...args),
  createModificationJob: (...args: unknown[]) => mockCreateModificationJob(...args),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

vi.stubGlobal("fetch", mockFetch);

import type { ToolRegistry } from "../tool-registry";
import { registerImageTools } from "./image";

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

describe("image tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerImageTools(registry, userId);
  });

  it("should register 3 image tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(3);
    expect(registry.handlers.has("generate_image")).toBe(true);
    expect(registry.handlers.has("modify_image")).toBe(true);
    expect(registry.handlers.has("check_job")).toBe(true);
  });

  describe("generate_image", () => {
    it("should generate image with wait", async () => {
      mockCreateGenerationJob.mockResolvedValue({ success: true, jobId: "job-1", creditsCost: 2 });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-1", status: "COMPLETED", outputImageUrl: "https://example.com/image.jpg",
        outputWidth: 1024, outputHeight: 1024, creditsCost: 2, errorMessage: null, type: "GENERATE", prompt: "a cat",
      });
      const handler = registry.handlers.get("generate_image")!;
      const result = await handler({ prompt: "a cat", wait_for_completion: true });
      expect(getText(result)).toContain("Image generated");
      expect(getText(result)).toContain("job-1");
    });

    it("should return job ID without wait", async () => {
      mockCreateGenerationJob.mockResolvedValue({ success: true, jobId: "job-2", creditsCost: 2 });
      const handler = registry.handlers.get("generate_image")!;
      const result = await handler({ prompt: "a dog", wait_for_completion: false });
      expect(getText(result)).toContain("Generation started");
      expect(getText(result)).toContain("job-2");
    });

    it("should return error on failure", async () => {
      mockCreateGenerationJob.mockResolvedValue({ success: false, error: "Insufficient credits" });
      const handler = registry.handlers.get("generate_image")!;
      const result = await handler({ prompt: "test" });
      expect(getText(result)).toContain("Insufficient credits");
    });
  });

  describe("modify_image", () => {
    it("should require image source", async () => {
      const handler = registry.handlers.get("modify_image")!;
      const result = await handler({ prompt: "make it blue" });
      expect(getText(result)).toContain("image_url or image_base64 required");
    });

    it("should modify with base64", async () => {
      mockCreateModificationJob.mockResolvedValue({ success: true, jobId: "job-3", creditsCost: 2 });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-3", status: "COMPLETED", outputImageUrl: "https://example.com/modified.jpg",
        outputWidth: 1024, outputHeight: 1024, creditsCost: 2, errorMessage: null, type: "MODIFY", prompt: "blue",
      });
      const handler = registry.handlers.get("modify_image")!;
      const result = await handler({ prompt: "make it blue", image_base64: "base64data", wait_for_completion: true });
      expect(getText(result)).toContain("Image modified");
    });
  });

  describe("check_job", () => {
    it("should return completed job", async () => {
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-1", type: "GENERATE", status: "COMPLETED", prompt: "a cat",
        creditsCost: 2, outputImageUrl: "https://example.com/image.jpg",
        outputWidth: 1024, outputHeight: 1024, errorMessage: null,
      });
      const handler = registry.handlers.get("check_job")!;
      const result = await handler({ job_id: "job-1" });
      expect(getText(result)).toContain("COMPLETED");
      expect(getText(result)).toContain("Image URL");
    });

    it("should return not found", async () => {
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue(null);
      const handler = registry.handlers.get("check_job")!;
      const result = await handler({ job_id: "nope" });
      expect(getText(result)).toContain("Job not found");
    });

    it("should return failed job with error", async () => {
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-2", type: "GENERATE", status: "FAILED", prompt: "test",
        creditsCost: 0, outputImageUrl: null, outputWidth: null, outputHeight: null,
        errorMessage: "Model timeout",
      });
      const handler = registry.handlers.get("check_job")!;
      const result = await handler({ job_id: "job-2" });
      expect(getText(result)).toContain("FAILED");
      expect(getText(result)).toContain("Model timeout");
    });
  });
});
