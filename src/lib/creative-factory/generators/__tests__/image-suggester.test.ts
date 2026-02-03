import * as geminiClient from "@/lib/ai/gemini-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { suggestImagesForCopy } from "../image-suggester";

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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result[0]!.imagePrompt).toContain("happy dog");

    const calls = (geminiClient.generateStructuredResponse as any).mock.calls;
    if (!calls || !calls[0]) {
      throw new Error("Expected geminiClient.generateStructuredResponse to be called");
    }
    const firstCall = calls[0];
    if (!firstCall || !firstCall[0]) {
      throw new Error("Expected call arguments to be present");
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const params = firstCall[0]!;
    expect(params.prompt).toContain("Best dog food ever!");
    expect(params.prompt).toContain("Dog owners");
  });

  it("should handle error", async () => {
    (geminiClient.generateStructuredResponse as any).mockRejectedValue(
      new Error("API Error"),
    );

    await expect(
      suggestImagesForCopy({ copyText: "Test" }),
    ).rejects.toThrow("Failed to generate image suggestions");
  });
});
