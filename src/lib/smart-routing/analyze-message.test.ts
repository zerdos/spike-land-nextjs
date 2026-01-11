import { getGeminiClient } from "@/lib/ai/gemini-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeMessage } from "./analyze-message";

vi.mock("@/lib/ai/gemini-client", () => ({
  getGeminiClient: vi.fn(),
}));

describe("analyzeMessage", () => {
  const mockGenerateContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getGeminiClient as any).mockReturnValue({
      models: {
        generateContent: mockGenerateContent,
      },
    });
  });

  it("should analyze message successfully", async () => {
    // Mock response matches actual API structure (result.text property)
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        sentiment: "POSITIVE",
        sentimentScore: 0.8,
        urgency: "medium",
        category: "feedback",
        intent: "praise",
        suggestedResponses: ["Thanks"],
        reasoning: "Positive words",
      }),
    });

    const result = await analyzeMessage({
      content: "Great job on the update!",
      senderName: "User",
      platform: "TWITTER",
    });

    expect(result.sentiment).toBe("POSITIVE");
    expect(result.urgency).toBe("medium");
    expect(result.suggestedResponses).toContain("Thanks");
  });

  it("should handle invalid JSON from Gemini", async () => {
    // Mock response with invalid JSON in text property
    mockGenerateContent.mockResolvedValue({
      text: "Invalid JSON",
    });

    await expect(analyzeMessage({
      content: "Bad response",
      senderName: "User",
      platform: "TWITTER",
    })).rejects.toThrow();
  });
});
