import { describe, it, expect, vi, beforeEach } from "vitest";
import { suggestImagesForCopy } from "../image-suggester";
import * as geminiClient from "@/lib/ai/gemini-client";

vi.mock("@/lib/ai/gemini-client", () => ({
  generateStructuredResponse: vi.fn(),
}));

describe("suggestImagesForCopy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate image suggestions", async () => {
    const mockSuggestions = [
      {
        imagePrompt: "A happy dog running in a park",
        style: "photorealistic",
        reasoning: "Matches the energetic tone",
      },
    ];

    (geminiClient.generateStructuredResponse as any).mockResolvedValue({
      suggestions: mockSuggestions,
    });

    const result = await suggestImagesForCopy({
      copyText: "Best dog food ever!",
      targetAudience: "Dog owners",
    });

    expect(result).toHaveLength(1);
    expect(result[0].imagePrompt).toContain("happy dog");

    const calls = (geminiClient.generateStructuredResponse as any).mock.calls;
    expect(calls[0][0].prompt).toContain("Best dog food ever!");
    expect(calls[0][0].prompt).toContain("Dog owners");
  });

  it("should handle error", async () => {
    (geminiClient.generateStructuredResponse as any).mockRejectedValue(
      new Error("API Error")
    );

    await expect(
      suggestImagesForCopy({ copyText: "Test" })
    ).rejects.toThrow("Failed to generate image suggestions");
  });
});
