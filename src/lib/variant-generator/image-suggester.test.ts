/**
 * Tests for image suggestion service
 * Resolves #551
 */

import { describe, it, expect, vi } from "vitest";
import { suggestImagesForCopy, suggestMultipleImages } from "./image-suggester";

// Mock the Gemini client
vi.mock("@/lib/ai/gemini-client", () => ({
  generateStructuredResponse: vi.fn().mockResolvedValue({
    prompt:
      "A vibrant lifestyle image showing happy people using the product in a modern setting",
    theme: "lifestyle",
    description: "Energetic scene showcasing product benefits",
    aspectRatio: "16:9",
    includePeople: true,
    colorPalette: ["#FF6B6B", "#4ECDC4", "#45B7D1"],
  }),
}));

describe("image-suggester", () => {
  describe("suggestImagesForCopy", () => {
    it("should generate image suggestions based on copy", async () => {
      const params = {
        copyText: "Transform your business with our amazing solution!",
        targetAudience: { age: "25-40", interests: ["technology", "business"] },
        platform: "instagram" as const,
      };

      const suggestions = await suggestImagesForCopy(params);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toHaveProperty("prompt");
      expect(suggestions[0]).toHaveProperty("theme");
      expect(suggestions[0]).toHaveProperty("description");
      expect(suggestions[0]).toHaveProperty("colorPalette");
      expect(Array.isArray(suggestions[0]?.colorPalette)).toBe(true);
    });

    it("should apply platform-specific aspect ratio", async () => {
      const params = {
        copyText: "Test copy",
        platform: "facebook" as const,
      };

      const suggestions = await suggestImagesForCopy(params);

      expect(suggestions[0]?.aspectRatio).toBeTruthy();
    });

    it("should handle errors gracefully", async () => {
      const { generateStructuredResponse } = await import(
        "@/lib/ai/gemini-client"
      );
      vi.mocked(generateStructuredResponse).mockRejectedValueOnce(
        new Error("API Error"),
      );

      const params = {
        copyText: "Test copy",
      };

      const suggestions = await suggestImagesForCopy(params);

      // Should return default suggestion instead of throwing
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toHaveProperty("prompt");
      expect(suggestions[0]?.theme).toBe("general");
    });
  });

  describe("suggestMultipleImages", () => {
    it("should generate multiple image suggestions", async () => {
      const params = {
        copyText: "Amazing product for you",
        platform: "instagram" as const,
      };

      const suggestions = await suggestMultipleImages(params, 3);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it("should respect count parameter", async () => {
      const params = {
        copyText: "Test",
      };

      const suggestions = await suggestMultipleImages(params, 2);

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });
});
