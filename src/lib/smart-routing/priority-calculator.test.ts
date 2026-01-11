import { describe, it, expect } from "vitest";
import { calculatePriorityScore } from "./priority-calculator";
import { SmartRoutingSettings, AnalysisResult } from "./types";
import { InboxItem } from "@prisma/client";

describe("calculatePriorityScore", () => {
    const mockSettings: SmartRoutingSettings = {
        enabled: true,
        autoAnalyzeOnFetch: true,
        priorityWeights: {
            sentiment: 30,
            urgency: 25,
            followerCount: 20,
            accountTier: 15,
            engagement: 10,
        },
        negativeSentimentThreshold: -0.5,
        escalation: {
            levels: [],
            slaTimeoutMinutes: 120,
        },
        autoResponse: {
            enabled: false,
            confidenceThreshold: 0.9,
        },
    };

    const mockItem = {
        id: "test",
    } as InboxItem;

    const baseAnalysis: AnalysisResult = {
        sentiment: "NEUTRAL",
        sentimentScore: 0,
        urgency: "low",
        category: "general",
        intent: "inquiry",
        suggestedResponses: [],
        reasoning: "",
    };

    it("should calculate score for low urgency generic user", () => {
        const result = calculatePriorityScore({
            analysis: baseAnalysis,
            item: mockItem,
            settings: mockSettings,
        });
        // All zero except maybe base? No base.
        expect(result.score).toBe(0);
    });

    it("should calculate score for high urgency", () => {
        const analysis = { ...baseAnalysis, urgency: "high" as const };
        const result = calculatePriorityScore({
            analysis,
            item: mockItem,
            settings: mockSettings,
        });
        // Urgency high = 70. Weight 25%. -> 70 * 0.25 = 17.5
        expect(result.factors.urgency).toBe(17.5);
        expect(result.score).toBe(18); // Rounded
    });

    it("should boost score for negative sentiment", () => {
        const analysis = { ...baseAnalysis, sentimentScore: -0.8 };
        const result = calculatePriorityScore({
            analysis,
            item: mockItem,
            settings: mockSettings,
        });
        // Sentiment -0.8 -> 80 * 0.30 = 24
        expect(result.factors.sentiment).toBe(24);
    });

    it("should boost score for VIP/Enterprise", () => {
        const result = calculatePriorityScore({
            analysis: baseAnalysis,
            item: mockItem,
            senderTier: "ENTERPRISE",
            settings: mockSettings,
        });
        // Enterprise = 100 * 0.15 = 15
        expect(result.factors.accountTier).toBe(15);
    });
});
