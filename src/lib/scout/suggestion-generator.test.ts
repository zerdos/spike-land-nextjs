/**
 * Scout Suggestion Generator Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CompetitorData, SuggestionGenerationInput, TopicData } from "./types";

import {
  buildAIContext,
  calculateOverallScore,
  DEFAULT_CONFIG,
  generateSuggestions,
} from "./suggestion-generator";

// Mock Anthropic
const mockCreate = vi.fn().mockResolvedValue({
  content: [
    {
      type: "text",
      text: JSON.stringify({
        suggestions: [
          {
            title: "Test Suggestion",
            description: "A test description",
            draftContent: "Draft content here",
            contentType: "POST",
            suggestedPlatforms: ["TWITTER", "INSTAGRAM"],
            relevanceScore: 0.8,
            timelinessScore: 0.7,
            brandAlignmentScore: 0.9,
            trendSources: ["Topic monitoring trend"],
          },
        ],
      }),
    },
  ],
});

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockCreate,
      };
    },
  };
});

describe("Suggestion Generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  describe("buildAIContext", () => {
    it("should build context with brand voice", () => {
      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
        brandVoice: {
          tone: "professional",
          style: "informative",
          values: ["innovation", "quality"],
          keywords: ["tech", "future"],
          avoidWords: ["cheap", "basic"],
        },
      };

      const context = buildAIContext(input);

      expect(context).toContain("Brand Voice Guidelines");
      expect(context).toContain("professional");
      expect(context).toContain("informative");
      expect(context).toContain("innovation");
      expect(context).toContain("tech");
      expect(context).toContain("cheap");
    });

    it("should build context with sample posts", () => {
      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
        brandVoice: {
          tone: "casual",
          style: "conversational",
          values: [],
          keywords: [],
          avoidWords: [],
          samplePosts: ["Hey everyone! Check this out", "Love this feature!"],
        },
      };

      const context = buildAIContext(input);

      expect(context).toContain("Sample posts in brand voice");
      expect(context).toContain("Hey everyone!");
    });

    it("should build context with topics", () => {
      const topics: TopicData[] = [
        {
          id: "topic-1",
          keyword: "AI trends",
          volume: 5000,
          trend: "RISING",
          sentiment: "POSITIVE",
          relatedHashtags: ["#AI", "#Tech"],
        },
        {
          id: "topic-2",
          keyword: "Marketing automation",
          volume: 3000,
          trend: "STABLE",
          sentiment: "NEUTRAL",
        },
      ];

      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
        topics,
      };

      const context = buildAIContext(input);

      expect(context).toContain("Trending Topics");
      expect(context).toContain("AI trends");
      expect(context).toContain("📈"); // Rising trend emoji
      expect(context).toContain("#AI");
    });

    it("should build context with competitors", () => {
      const competitors: CompetitorData[] = [
        {
          id: "comp-1",
          accountId: "competitor123",
          platform: "TWITTER",
          recentPosts: [
            {
              id: "post-1",
              content: "Great content from competitor",
              engagementScore: 150,
              postedAt: new Date(),
            },
          ],
          engagementRate: 0.045,
          topPerformingContent: ["Product launches", "Industry news"],
        },
      ];

      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
        competitors,
      };

      const context = buildAIContext(input);

      expect(context).toContain("Competitor Content Analysis");
      expect(context).toContain("TWITTER");
      expect(context).toContain("4.5%"); // Engagement rate
      expect(context).toContain("Product launches");
    });

    it("should include content type preferences", () => {
      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
        contentTypes: ["POST", "THREAD", "STORY"],
      };

      const context = buildAIContext(input);

      expect(context).toContain("Preferred content types");
      expect(context).toContain("POST");
      expect(context).toContain("THREAD");
    });

    it("should include platform preferences", () => {
      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
        platforms: ["TWITTER", "LINKEDIN"],
      };

      const context = buildAIContext(input);

      expect(context).toContain("Target platforms");
      expect(context).toContain("TWITTER");
      expect(context).toContain("LINKEDIN");
    });

    it("should handle empty input", () => {
      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
      };

      const context = buildAIContext(input);

      expect(context).toBe("");
    });
  });

  describe("calculateOverallScore", () => {
    it("should calculate weighted score with default weights", () => {
      const score = calculateOverallScore(0.8, 0.6, 0.9);

      // 0.8 * 0.4 + 0.6 * 0.3 + 0.9 * 0.3 = 0.32 + 0.18 + 0.27 = 0.77
      expect(score).toBeCloseTo(0.77, 2);
    });

    it("should use custom weights", () => {
      const customWeights = {
        relevance: 0.5,
        timeliness: 0.3,
        brandAlignment: 0.2,
      };

      const score = calculateOverallScore(1.0, 0.5, 0.5, customWeights);

      // 1.0 * 0.5 + 0.5 * 0.3 + 0.5 * 0.2 = 0.5 + 0.15 + 0.1 = 0.75
      expect(score).toBeCloseTo(0.75, 2);
    });

    it("should handle zero scores", () => {
      const score = calculateOverallScore(0, 0, 0);
      expect(score).toBe(0);
    });

    it("should handle perfect scores", () => {
      const score = calculateOverallScore(1, 1, 1);
      expect(score).toBe(1);
    });
  });

  describe("generateSuggestions", () => {
    it("should generate suggestions with valid input", async () => {
      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
        brandVoice: {
          tone: "professional",
          style: "informative",
          values: ["quality"],
          keywords: ["innovation"],
          avoidWords: [],
        },
        topics: [
          {
            id: "topic-1",
            keyword: "AI",
            volume: 1000,
            trend: "RISING",
            sentiment: "POSITIVE",
          },
        ],
      };

      const result = await generateSuggestions(input);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0]!.title).toBe("Test Suggestion");
      expect(result.suggestions[0]!.workspaceId).toBe("ws-1");
      expect(result.suggestions[0]!.status).toBe("PENDING");
      expect(result.generatedCount).toBe(1);
      expect(result.topicsAnalyzed).toBe(1);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should filter low-scoring suggestions", async () => {
      // Mock returns low score
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              suggestions: [
                {
                  title: "Low Score Suggestion",
                  description: "Description",
                  draftContent: "Draft",
                  contentType: "POST",
                  suggestedPlatforms: ["TWITTER"],
                  relevanceScore: 0.1,
                  timelinessScore: 0.1,
                  brandAlignmentScore: 0.1,
                  trendSources: ["test"],
                },
              ],
            }),
          },
        ],
      });

      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
      };

      const result = await generateSuggestions(input);

      // Should be filtered out due to low score (below 0.5 threshold)
      expect(result.suggestions).toHaveLength(0);
    });

    it("should throw error without API key", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
      };

      await expect(generateSuggestions(input)).rejects.toThrow(
        "ANTHROPIC_API_KEY environment variable is not set",
      );
    });

    it("should use custom config", async () => {
      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
        maxSuggestions: 5,
      };

      const customConfig = {
        ...DEFAULT_CONFIG,
        maxSuggestions: 5,
        expirationHours: 24,
      };

      const result = await generateSuggestions(input, customConfig);

      expect(result.suggestions[0]!.expiresAt).toBeDefined();
      // Check expiration is approximately 24 hours from now
      const expiresAt = result.suggestions[0]!.expiresAt!;
      const expectedExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it("should track processing time", async () => {
      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
      };

      const result = await generateSuggestions(input);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should count analyzed topics and competitors", async () => {
      const input: SuggestionGenerationInput = {
        workspaceId: "ws-1",
        topics: [
          { id: "1", keyword: "a", volume: 1, trend: "STABLE", sentiment: "NEUTRAL" },
          { id: "2", keyword: "b", volume: 2, trend: "RISING", sentiment: "POSITIVE" },
        ],
        competitors: [
          {
            id: "c1",
            accountId: "acc1",
            platform: "TWITTER",
            recentPosts: [],
            engagementRate: 0.05,
          },
        ],
      };

      const result = await generateSuggestions(input);

      expect(result.topicsAnalyzed).toBe(2);
      expect(result.competitorsAnalyzed).toBe(1);
    });
  });

  describe("DEFAULT_CONFIG", () => {
    it("should have valid default values", () => {
      expect(DEFAULT_CONFIG.maxSuggestions).toBe(10);
      expect(DEFAULT_CONFIG.minRelevanceScore).toBe(0.5);
      expect(DEFAULT_CONFIG.expirationHours).toBe(48);
      expect(DEFAULT_CONFIG.scoringWeights.relevance).toBe(0.4);
      expect(DEFAULT_CONFIG.scoringWeights.timeliness).toBe(0.3);
      expect(DEFAULT_CONFIG.scoringWeights.brandAlignment).toBe(0.3);
    });

    it("should have scoring weights that sum to 1", () => {
      const sum = DEFAULT_CONFIG.scoringWeights.relevance +
        DEFAULT_CONFIG.scoringWeights.timeliness +
        DEFAULT_CONFIG.scoringWeights.brandAlignment;

      expect(sum).toBe(1);
    });
  });
});
