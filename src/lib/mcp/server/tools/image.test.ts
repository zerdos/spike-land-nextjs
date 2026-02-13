import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ========================================
// Hoisted mocks
// ========================================
const {
  mockCreateGenerationJob,
  mockCreateModificationJob,
  mockPrisma,
} = vi.hoisted(() => ({
  mockCreateGenerationJob: vi.fn(),
  mockCreateModificationJob: vi.fn(),
  mockPrisma: {
    mcpGenerationJob: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mcp/generation-service", () => ({
  createGenerationJob: mockCreateGenerationJob,
  createModificationJob: mockCreateModificationJob,
}));

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Must import AFTER mocks
import { registerImageTools } from "./image";
import type { ToolDefinition } from "../tool-registry";

// ========================================
// Test Helpers
// ========================================

/** Extract text from a CallToolResult content array */
function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

class MockToolRegistry {
  tools = new Map<string, ToolDefinition>();

  register(def: ToolDefinition): void {
    this.tools.set(def.name, def);
  }

  getHandler(name: string) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    return tool.handler;
  }
}

// ========================================
// Tests
// ========================================

describe("MCP Image Tools", () => {
  let registry: MockToolRegistry;
  const USER_ID = "test-user-42";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    registry = new MockToolRegistry();
    registerImageTools(registry as never, USER_ID);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- Registration ----
  describe("registration", () => {
    it("registers all 3 tools", () => {
      expect(registry.tools.size).toBe(3);
      expect(registry.tools.has("generate_image")).toBe(true);
      expect(registry.tools.has("modify_image")).toBe(true);
      expect(registry.tools.has("check_job")).toBe(true);
    });

    it("all tools have category=image and tier=free", () => {
      for (const [, def] of registry.tools) {
        expect(def.category).toBe("image");
        expect(def.tier).toBe("free");
      }
    });

    it("generate_image description includes tier costs and aspect ratios", () => {
      const def = registry.tools.get("generate_image")!;
      expect(def.description).toContain("TIER_1K");
      expect(def.description).toContain("TIER_2K");
      expect(def.description).toContain("TIER_4K");
      expect(def.description).toContain("16:9");
      expect(def.description).toContain("1:1");
    });
  });

  // ---- generate_image ----
  describe("generate_image", () => {
    it("returns success text with job ID, image URL, dimensions, tokens (wait=true)", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: "job-gen-1",
        creditsCost: 2,
      });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-gen-1",
        status: "COMPLETED",
        outputImageUrl: "https://cdn.spike.land/img/gen1.png",
        outputWidth: 1024,
        outputHeight: 1024,
        creditsCost: 2,
        errorMessage: null,
        type: "GENERATION",
        prompt: "a cat",
      });

      const handler = registry.getHandler("generate_image");
      const resultPromise = handler({
        prompt: "  a cat  ",
        tier: "TIER_1K",
        wait_for_completion: true,
      });

      // Advance past the polling setTimeout
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result.isError).toBeUndefined();
      const text = textOf(result);
      expect(text).toContain("Image generated!");
      expect(text).toContain("job-gen-1");
      expect(text).toContain("https://cdn.spike.land/img/gen1.png");
      expect(text).toContain("1024x1024");
      expect(text).toContain("**Tokens:** 2");

      // Verify prompt was trimmed
      expect(mockCreateGenerationJob).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: "a cat", userId: USER_ID }),
      );
    });

    it("returns job ID immediately when wait_for_completion=false", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: "job-gen-2",
        creditsCost: 5,
      });

      const handler = registry.getHandler("generate_image");
      const result = await handler({
        prompt: "a dog",
        tier: "TIER_2K",
        wait_for_completion: false,
      });

      expect(result.isError).toBeUndefined();
      const text = textOf(result);
      expect(text).toContain("Generation started!");
      expect(text).toContain("job-gen-2");
      expect(text).toContain("**Tokens:** 5");
      expect(text).toContain("check_job");
      expect(mockPrisma.mcpGenerationJob.findUnique).not.toHaveBeenCalled();
    });

    it("forwards tier to service (Zod schema defaults TIER_1K upstream)", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: "job-gen-3",
        creditsCost: 2,
      });

      const handler = registry.getHandler("generate_image");
      // Zod applies .default("TIER_1K") before the handler sees it
      await handler({ prompt: "test", tier: "TIER_1K", wait_for_completion: false });

      expect(mockCreateGenerationJob).toHaveBeenCalledWith(
        expect.objectContaining({ tier: "TIER_1K", userId: USER_ID }),
      );
    });

    it("passes negative_prompt and aspect_ratio to service", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: "job-gen-4",
        creditsCost: 10,
      });

      const handler = registry.getHandler("generate_image");
      await handler({
        prompt: "landscape",
        tier: "TIER_4K",
        negative_prompt: " blurry ",
        aspect_ratio: "16:9",
        wait_for_completion: false,
      });

      expect(mockCreateGenerationJob).toHaveBeenCalledWith({
        userId: USER_ID,
        prompt: "landscape",
        tier: "TIER_4K",
        negativePrompt: "blurry",
        aspectRatio: "16:9",
      });
    });

    it("returns isError when service fails (insufficient credits)", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: false,
        error: "Insufficient credits",
      });

      const handler = registry.getHandler("generate_image");
      const result = await handler({ prompt: "test", wait_for_completion: true });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Insufficient credits");
    });

    it("returns isError when service returns no jobId", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: null,
      });

      const handler = registry.getHandler("generate_image");
      const result = await handler({ prompt: "test", wait_for_completion: true });

      expect(result.isError).toBe(true);
    });

    it("returns isError when job fails during polling", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: "job-fail-1",
        creditsCost: 2,
      });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-fail-1",
        status: "FAILED",
        outputImageUrl: null,
        outputWidth: null,
        outputHeight: null,
        creditsCost: 2,
        errorMessage: "GPU out of memory",
        type: "GENERATION",
        prompt: "test",
      });

      const handler = registry.getHandler("generate_image");
      const resultPromise = handler({ prompt: "test", wait_for_completion: true });
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("GPU out of memory");
    });

    it("returns isError for unexpected exceptions", async () => {
      mockCreateGenerationJob.mockRejectedValue(new Error("Network timeout"));

      const handler = registry.getHandler("generate_image");
      const result = await handler({ prompt: "test", wait_for_completion: false });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Network timeout");
    });

    it("returns 'Unknown error' when service fails with no error message", async () => {
      mockCreateGenerationJob.mockResolvedValue({ success: false });

      const handler = registry.getHandler("generate_image");
      const result = await handler({ prompt: "test", wait_for_completion: true });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Unknown error");
    });

    it("returns 'Unknown error' when job fails with no errorMessage", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true, jobId: "job-no-msg", creditsCost: 2,
      });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-no-msg", status: "FAILED", outputImageUrl: null,
        outputWidth: null, outputHeight: null, creditsCost: 2,
        errorMessage: null, type: "GENERATION", prompt: "test",
      });

      const handler = registry.getHandler("generate_image");
      const resultPromise = handler({ prompt: "test", wait_for_completion: true });
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Unknown error");
    });

    it("returns 'Unknown' for non-Error exception", async () => {
      mockCreateGenerationJob.mockRejectedValue("string-error");

      const handler = registry.getHandler("generate_image");
      const result = await handler({ prompt: "test", wait_for_completion: false });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Unknown");
    });
  });

  // ---- modify_image ----
  describe("modify_image", () => {
    it("passes base64 data directly to service", async () => {
      mockCreateModificationJob.mockResolvedValue({
        success: true,
        jobId: "job-mod-1",
        creditsCost: 2,
      });

      const handler = registry.getHandler("modify_image");
      const result = await handler({
        prompt: "make it red",
        image_base64: "iVBORw0KGgo=",
        mime_type: "image/png",
        tier: "TIER_1K",
        wait_for_completion: false,
      });

      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("Modification started!");
      expect(textOf(result)).toContain("job-mod-1");
      expect(mockCreateModificationJob).toHaveBeenCalledWith({
        userId: USER_ID,
        prompt: "make it red",
        imageData: "iVBORw0KGgo=",
        mimeType: "image/png",
        tier: "TIER_1K",
      });
    });

    it("fetches image from URL, converts to base64", async () => {
      const fakeImageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeImageBytes.buffer),
        headers: new Map([["content-type", "image/png"]]) as unknown as Headers,
      }));

      mockCreateModificationJob.mockResolvedValue({
        success: true,
        jobId: "job-mod-2",
        creditsCost: 2,
      });

      const handler = registry.getHandler("modify_image");
      const result = await handler({
        prompt: "add blur",
        image_url: "https://example.com/photo.png",
        wait_for_completion: false,
      });

      expect(result.isError).toBeUndefined();
      expect(vi.mocked(fetch)).toHaveBeenCalledWith("https://example.com/photo.png");
      expect(mockCreateModificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          imageData: Buffer.from(fakeImageBytes).toString("base64"),
          mimeType: "image/png",
        }),
      );

      vi.unstubAllGlobals();
    });

    it("returns isError when URL fetch fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      }));

      const handler = registry.getHandler("modify_image");
      const result = await handler({
        prompt: "edit",
        image_url: "https://example.com/missing.png",
        wait_for_completion: false,
      });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Not Found");

      vi.unstubAllGlobals();
    });

    it("returns isError when neither image_url nor image_base64 provided", async () => {
      const handler = registry.getHandler("modify_image");
      const result = await handler({
        prompt: "edit",
        wait_for_completion: false,
      });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("image_url or image_base64 required");
    });

    it("returns success text with job details (wait=true)", async () => {
      mockCreateModificationJob.mockResolvedValue({
        success: true,
        jobId: "job-mod-3",
        creditsCost: 5,
      });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-mod-3",
        status: "COMPLETED",
        outputImageUrl: "https://cdn.spike.land/img/mod3.png",
        outputWidth: 2048,
        outputHeight: 1536,
        creditsCost: 5,
        errorMessage: null,
        type: "MODIFICATION",
        prompt: "enhance",
      });

      const handler = registry.getHandler("modify_image");
      const resultPromise = handler({
        prompt: "enhance",
        image_base64: "abc123",
        tier: "TIER_2K",
        wait_for_completion: true,
      });

      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result.isError).toBeUndefined();
      const text = textOf(result);
      expect(text).toContain("Image modified!");
      expect(text).toContain("job-mod-3");
      expect(text).toContain("https://cdn.spike.land/img/mod3.png");
      expect(text).toContain("2048x1536");
      expect(text).toContain("**Tokens:** 5");
    });

    it("returns isError when service fails", async () => {
      mockCreateModificationJob.mockResolvedValue({
        success: false,
        error: "Image too large",
      });

      const handler = registry.getHandler("modify_image");
      const result = await handler({
        prompt: "edit",
        image_base64: "abc",
        wait_for_completion: false,
      });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Image too large");
    });

    it("returns isError when job fails during polling", async () => {
      mockCreateModificationJob.mockResolvedValue({
        success: true,
        jobId: "job-mod-fail",
        creditsCost: 2,
      });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-mod-fail",
        status: "FAILED",
        outputImageUrl: null,
        outputWidth: null,
        outputHeight: null,
        creditsCost: 2,
        errorMessage: "Content policy violation",
        type: "MODIFICATION",
        prompt: "edit",
      });

      const handler = registry.getHandler("modify_image");
      const resultPromise = handler({
        prompt: "edit",
        image_base64: "abc",
        wait_for_completion: true,
      });
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Content policy violation");
    });

    it("returns isError for unexpected exceptions", async () => {
      mockCreateModificationJob.mockRejectedValue(new Error("Service unavailable"));

      const handler = registry.getHandler("modify_image");
      const result = await handler({
        prompt: "edit",
        image_base64: "abc",
        wait_for_completion: false,
      });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Service unavailable");
    });

    it("returns 'Unknown error' when service fails with no error message", async () => {
      mockCreateModificationJob.mockResolvedValue({ success: false });

      const handler = registry.getHandler("modify_image");
      const result = await handler({
        prompt: "edit",
        image_base64: "abc",
        wait_for_completion: false,
      });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Unknown error");
    });

    it("returns 'Unknown error' when modification job fails with no errorMessage", async () => {
      mockCreateModificationJob.mockResolvedValue({
        success: true, jobId: "job-mod-no-msg", creditsCost: 2,
      });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-mod-no-msg", status: "FAILED", outputImageUrl: null,
        outputWidth: null, outputHeight: null, creditsCost: 2,
        errorMessage: null, type: "MODIFICATION", prompt: "edit",
      });

      const handler = registry.getHandler("modify_image");
      const resultPromise = handler({
        prompt: "edit", image_base64: "abc", wait_for_completion: true,
      });
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Unknown error");
    });

    it("returns 'Unknown' for non-Error exception", async () => {
      mockCreateModificationJob.mockRejectedValue(42);

      const handler = registry.getHandler("modify_image");
      const result = await handler({
        prompt: "edit", image_base64: "abc", wait_for_completion: false,
      });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Unknown");
    });

    it("falls back to mime_type param when response has no content-type", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
        headers: new Map() as unknown as Headers,
      }));

      mockCreateModificationJob.mockResolvedValue({
        success: true, jobId: "job-mod-noct", creditsCost: 2,
      });

      const handler = registry.getHandler("modify_image");
      await handler({
        prompt: "edit",
        image_url: "https://example.com/photo",
        mime_type: "image/jpeg",
        wait_for_completion: false,
      });

      expect(mockCreateModificationJob).toHaveBeenCalledWith(
        expect.objectContaining({ mimeType: "image/jpeg" }),
      );

      vi.unstubAllGlobals();
    });

    it("uses response content-type header when fetching URL", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
        headers: new Map([["content-type", "image/webp"]]) as unknown as Headers,
      }));

      mockCreateModificationJob.mockResolvedValue({
        success: true,
        jobId: "job-mod-ct",
        creditsCost: 2,
      });

      const handler = registry.getHandler("modify_image");
      await handler({
        prompt: "edit",
        image_url: "https://example.com/photo.webp",
        wait_for_completion: false,
      });

      expect(mockCreateModificationJob).toHaveBeenCalledWith(
        expect.objectContaining({ mimeType: "image/webp" }),
      );

      vi.unstubAllGlobals();
    });
  });

  // ---- check_job ----
  describe("check_job", () => {
    it("returns formatted text for COMPLETED job", async () => {
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-c1",
        type: "GENERATION",
        status: "COMPLETED",
        prompt: "a sunset",
        creditsCost: 2,
        outputImageUrl: "https://cdn.spike.land/img/c1.png",
        outputWidth: 1024,
        outputHeight: 768,
        errorMessage: null,
      });

      const handler = registry.getHandler("check_job");
      const result = await handler({ job_id: "job-c1" });

      expect(result.isError).toBeUndefined();
      const text = textOf(result);
      expect(text).toContain("**Job ID:** job-c1");
      expect(text).toContain("**Type:** GENERATION");
      expect(text).toContain("**Status:** COMPLETED");
      expect(text).toContain("**Tokens:** 2");
      expect(text).toContain("**Prompt:** a sunset");
      expect(text).toContain("**Image URL:** https://cdn.spike.land/img/c1.png");
      expect(text).toContain("**Dimensions:** 1024x768");
    });

    it("returns formatted text for FAILED job with error", async () => {
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-f1",
        type: "MODIFICATION",
        status: "FAILED",
        prompt: "edit this",
        creditsCost: 5,
        outputImageUrl: null,
        outputWidth: null,
        outputHeight: null,
        errorMessage: "Model inference failed",
      });

      const handler = registry.getHandler("check_job");
      const result = await handler({ job_id: "job-f1" });

      expect(result.isError).toBeUndefined();
      const text = textOf(result);
      expect(text).toContain("**Status:** FAILED");
      expect(text).toContain("**Error:** Model inference failed");
      expect(text).not.toContain("**Image URL:**");
      expect(text).not.toContain("**Dimensions:**");
    });

    it("returns formatted text for PROCESSING job (no image/error sections)", async () => {
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-p1",
        type: "GENERATION",
        status: "PROCESSING",
        prompt: "working on it",
        creditsCost: 10,
        outputImageUrl: null,
        outputWidth: null,
        outputHeight: null,
        errorMessage: null,
      });

      const handler = registry.getHandler("check_job");
      const result = await handler({ job_id: "job-p1" });

      expect(result.isError).toBeUndefined();
      const text = textOf(result);
      expect(text).toContain("**Status:** PROCESSING");
      expect(text).not.toContain("**Image URL:**");
      expect(text).not.toContain("**Dimensions:**");
      expect(text).not.toContain("**Error:**");
    });

    it("returns isError when job not found", async () => {
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue(null);

      const handler = registry.getHandler("check_job");
      const result = await handler({ job_id: "nonexistent" });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Job not found");
    });

    it("returns isError for database exceptions", async () => {
      mockPrisma.mcpGenerationJob.findUnique.mockRejectedValue(
        new Error("Connection refused"),
      );

      const handler = registry.getHandler("check_job");
      const result = await handler({ job_id: "job-x" });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Connection refused");
    });

    it("returns 'Unknown' for non-Error database exception", async () => {
      mockPrisma.mcpGenerationJob.findUnique.mockRejectedValue(null);

      const handler = registry.getHandler("check_job");
      const result = await handler({ job_id: "job-y" });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Unknown");
    });
  });

  // ---- waitForJobCompletion (tested through handlers) ----
  describe("waitForJobCompletion (via generate_image polling)", () => {
    it("resolves on COMPLETED status after multiple polls", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: "job-poll-1",
        creditsCost: 2,
      });

      let pollCount = 0;
      mockPrisma.mcpGenerationJob.findUnique.mockImplementation(async () => {
        pollCount++;
        if (pollCount < 3) {
          return {
            id: "job-poll-1",
            status: "PROCESSING",
            outputImageUrl: null,
            outputWidth: null,
            outputHeight: null,
            creditsCost: 2,
            errorMessage: null,
            type: "GENERATION",
            prompt: "test",
          };
        }
        return {
          id: "job-poll-1",
          status: "COMPLETED",
          outputImageUrl: "https://cdn.spike.land/img/poll1.png",
          outputWidth: 1024,
          outputHeight: 1024,
          creditsCost: 2,
          errorMessage: null,
          type: "GENERATION",
          prompt: "test",
        };
      });

      const handler = registry.getHandler("generate_image");
      const resultPromise = handler({ prompt: "test", wait_for_completion: true });

      // Advance through 3 poll cycles (2s each)
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("Image generated!");
      expect(pollCount).toBe(3);
    });

    it("resolves on FAILED status", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: "job-poll-fail",
        creditsCost: 2,
      });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-poll-fail",
        status: "FAILED",
        outputImageUrl: null,
        outputWidth: null,
        outputHeight: null,
        creditsCost: 2,
        errorMessage: "Out of memory",
        type: "GENERATION",
        prompt: "test",
      });

      const handler = registry.getHandler("generate_image");
      const resultPromise = handler({ prompt: "test", wait_for_completion: true });
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Out of memory");
    });

    it("resolves on REFUNDED status", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: "job-poll-refund",
        creditsCost: 2,
      });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-poll-refund",
        status: "REFUNDED",
        outputImageUrl: null,
        outputWidth: null,
        outputHeight: null,
        creditsCost: 0,
        errorMessage: null,
        type: "GENERATION",
        prompt: "test",
      });

      const handler = registry.getHandler("generate_image");
      const resultPromise = handler({ prompt: "test", wait_for_completion: true });
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      // REFUNDED is not FAILED, so handler returns success format
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain("Image generated!");
    });

    it("throws on timeout when job not found", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: "job-poll-gone",
        creditsCost: 2,
      });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue(null);

      const handler = registry.getHandler("generate_image");
      const resultPromise = handler({ prompt: "test", wait_for_completion: true });
      await vi.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Job not found");
    });

    it("throws on timeout when job stays stuck in PROCESSING", async () => {
      mockCreateGenerationJob.mockResolvedValue({
        success: true,
        jobId: "job-poll-stuck",
        creditsCost: 2,
      });
      mockPrisma.mcpGenerationJob.findUnique.mockResolvedValue({
        id: "job-poll-stuck",
        status: "PROCESSING",
        outputImageUrl: null,
        outputWidth: null,
        outputHeight: null,
        creditsCost: 2,
        errorMessage: null,
        type: "GENERATION",
        prompt: "test",
      });

      const handler = registry.getHandler("generate_image");
      const resultPromise = handler({ prompt: "test", wait_for_completion: true });

      // Advance through all 60 polling attempts (60 * 2000ms = 120s)
      for (let i = 0; i < 60; i++) {
        await vi.advanceTimersByTimeAsync(2000);
      }

      const result = await resultPromise;
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Job timed out");
    });
  });
});
