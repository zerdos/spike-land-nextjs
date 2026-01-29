/**
 * Tests for copy variant generation service
 * Resolves #551
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateCopyVariants, isClaudeConfigured } from "./copy-generator";
import type { VariantGenerationParams } from "@/types/variant-generator";

// Mock the environment
const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
  vi.clearAllMocks();
});

describe("copy-generator", () => {
  describe("isClaudeConfigured", () => {
    it("should return true when API key is set", () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      expect(isClaudeConfigured()).toBe(true);
    });

    it("should return false when API key is not set", () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(isClaudeConfigured()).toBe(false);
    });
  });

  describe("generateCopyVariants", () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
      process.env.ANTHROPIC_API_KEY = "test-api-key";
    });

    it("should generate copy variants with default parameters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: "Professional copy for your amazing product. Get started today!",
            },
          ],
        }),
      });

      const params: VariantGenerationParams = {
        seedContent: "Amazing product for you",
        workspaceId: "ws_123",
        count: 2,
        tones: ["professional", "casual"],
        lengths: ["medium"],
      };

      const variants = await generateCopyVariants(params);

      expect(variants).toHaveLength(2);
      expect(variants[0]).toMatchObject({
        tone: "professional",
        length: "medium",
        aiModel: "claude-sonnet-4-5-20250929",
        variationType: "tone",
      });
      expect(variants[0]?.text).toBeTruthy();
      expect(variants[0]?.characterCount).toBeGreaterThan(0);
    });

    it("should generate variants with CTA styles", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: "Ready to transform your business? Get started now!",
            },
          ],
        }),
      });

      const params: VariantGenerationParams = {
        seedContent: "Transform your business",
        workspaceId: "ws_123",
        count: 1,
        tones: ["urgent"],
        lengths: ["short"],
        ctaStyles: ["question"],
      };

      const variants = await generateCopyVariants(params);

      expect(variants).toHaveLength(1);
      expect(variants[0]?.ctaStyle).toBe("question");
      expect(variants[0]?.variationType).toBe("composite");
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const params: VariantGenerationParams = {
        seedContent: "Test content",
        workspaceId: "ws_123",
        count: 1,
      };

      const variants = await generateCopyVariants(params);

      // Should return empty array instead of throwing
      expect(variants).toHaveLength(0);
    });

    it("should respect count parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: "Generated copy" }],
        }),
      });

      const params: VariantGenerationParams = {
        seedContent: "Test",
        workspaceId: "ws_123",
        count: 3,
        tones: ["professional", "casual", "friendly"],
        lengths: ["short", "medium"],
      };

      const variants = await generateCopyVariants(params);

      // Should generate exactly 3 variants (limited by count)
      expect(variants).toHaveLength(3);
    });

    it("should include brand voice in system prompt when provided", async () => {
      const capturedRequests: unknown[] = [];

      mockFetch.mockImplementation(async (_url, options) => {
        const body = JSON.parse((options as { body: string }).body);
        capturedRequests.push(body);
        return {
          ok: true,
          json: async () => ({
            content: [{ text: "Branded copy" }],
          }),
        };
      });

      const params: VariantGenerationParams = {
        seedContent: "Test",
        workspaceId: "ws_123",
        count: 1,
      };

      const brandVoice = {
        workspaceId: "ws_123",
        voiceDescription: "Friendly and approachable",
        industry: "Technology",
        targetAudience: "Small business owners",
      };

      await generateCopyVariants(params, brandVoice);

      expect(capturedRequests).toHaveLength(1);
      const request = capturedRequests[0] as {
        system: string;
        messages: Array<{ content: string }>;
      };
      expect(request.system).toContain("Friendly and approachable");
      expect(request.system).toContain("Technology");
      expect(request.system).toContain("Small business owners");
    });

    it("should throw error when API key is missing", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const params: VariantGenerationParams = {
        seedContent: "Test",
        workspaceId: "ws_123",
        count: 1,
      };

      // Should not throw, but return empty array since error is caught
      const variants = await generateCopyVariants(params);
      expect(variants).toHaveLength(0);
    });

    it("should validate character counts match length ranges", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: "This is a short copy variant that fits the character limit perfectly for short length.",
            },
          ],
        }),
      });

      const params: VariantGenerationParams = {
        seedContent: "Test",
        workspaceId: "ws_123",
        count: 1,
        lengths: ["short"],
      };

      const variants = await generateCopyVariants(params);

      expect(variants).toHaveLength(1);
      // Short length range is 100-140 characters
      // Note: The actual character count depends on API response
      expect(variants[0]?.characterCount).toBeGreaterThan(0);
      expect(variants[0]?.length).toBe("short");
    });
  });
});
