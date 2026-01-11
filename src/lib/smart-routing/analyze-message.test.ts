import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeMessage } from "./analyze-message";
import { getGeminiClient } from "@/lib/ai/gemini-client";

vi.mock("@/lib/ai/gemini-client", () => ({
    getGeminiClient: vi.fn(),
}));

describe("analyzeMessage", () => {
    const mockGenerateContent = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (getGeminiClient as any).mockReturnValue({
            getGenerativeModel: vi.fn().mockReturnValue({
                generateContent: mockGenerateContent,
            }),
        });
    });

    it("should analyze message successfully", async () => {
        const mockResponse = {
            response: {
                text: () => JSON.stringify({
                    sentiment: "POSITIVE",
                    sentimentScore: 0.8,
                    urgency: "medium",
                    category: "feedback",
                    intent: "praise",
                    summary: "Good job",
                    suggestedResponses: ["Thanks"],
                    reasoning: "Positive words",
                    confidenceScore: 0.9
                }),
            },
        };
        mockGenerateContent.mockResolvedValue(mockResponse);

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
        const mockResponse = {
            response: {
                text: () => "Invalid JSON",
            },
        };
        mockGenerateContent.mockResolvedValue(mockResponse);

        await expect(analyzeMessage({
            content: "Bad response",
            senderName: "User",
            platform: "TWITTER",
        })).rejects.toThrow();
    });
});
