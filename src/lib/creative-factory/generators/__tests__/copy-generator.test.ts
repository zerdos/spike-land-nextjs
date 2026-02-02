import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateCopyVariants } from "../copy-generator";
import * as geminiClient from "@/lib/ai/gemini-client";

// Mock the gemini client
vi.mock("@/lib/ai/gemini-client", () => ({
  generateStructuredResponse: vi.fn(),
}));

describe("generateCopyVariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate variants successfully", async () => {
    const mockVariants = [
      {
        headline: "Variant 1",
        bodyText: "Body 1",
        callToAction: "CTA 1",
        tone: "professional",
        length: "medium",
        explanation: "Test 1",
      },
      {
        headline: "Variant 2",
        bodyText: "Body 2",
        callToAction: "CTA 2",
        tone: "professional",
        length: "medium",
        explanation: "Test 2",
      },
    ];

    (geminiClient.generateStructuredResponse as any).mockResolvedValue({
      variants: mockVariants,
    });

    const result = await generateCopyVariants({
      seedContent: "Test seed content",
      count: 2,
      tone: "professional",
    });

    expect(result).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result[0]!.headline).toBe("Variant 1");
    expect(geminiClient.generateStructuredResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Test seed content"),
        systemPrompt: expect.stringContaining("marketing copywriter"),
      })
    );
  });

  it("should handle default parameters", async () => {
    (geminiClient.generateStructuredResponse as any).mockResolvedValue({
      variants: [],
    });

    await generateCopyVariants({
      seedContent: "Test",
    });

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
    expect(params.prompt).toContain("Tone: balanced");
    expect(params.prompt).toContain("Length: medium");
  });

  it("should throw error on failure", async () => {
    (geminiClient.generateStructuredResponse as any).mockRejectedValue(
      new Error("API Error")
    );

    await expect(
      generateCopyVariants({ seedContent: "Test" })
    ).rejects.toThrow("Failed to generate copy variants");
  });
});
