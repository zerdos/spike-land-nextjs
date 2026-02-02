import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreVariant } from "../variant-scorer";
import * as geminiClient from "@/lib/ai/gemini-client";

vi.mock("@/lib/ai/gemini-client", () => ({
  generateStructuredResponse: vi.fn(),
}));

describe("scoreVariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return variant score", async () => {
    const mockScore = {
      predictedCTR: 2.5,
      predictedER: 4.0,
      predictedCR: 1.5,
      confidenceScore: 85,
      factorsAnalyzed: {
        clarity: 9,
        persuasion: 8,
        relevance: 9,
        urgency: 7,
        explanation: "Good copy",
      },
    };

    (geminiClient.generateStructuredResponse as any).mockResolvedValue(mockScore);

    const result = await scoreVariant({
      headline: "Test Headline",
      bodyText: "Test Body",
    });

    expect(result).toEqual(mockScore);
  });

  it("should handle error by returning zero score", async () => {
    (geminiClient.generateStructuredResponse as any).mockRejectedValue(
      new Error("API Error")
    );

    const result = await scoreVariant({
      headline: "Test",
      bodyText: "Test",
    });

    expect(result.predictedCTR).toBe(0);
    expect(result.factorsAnalyzed.explanation).toBe("Scoring failed");
  });
});
