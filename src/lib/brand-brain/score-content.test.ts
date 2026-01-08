import type { BrandGuardrail, BrandProfile, BrandVocabulary } from "@/types/brand-brain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _buildBrandScoringSystemPrompt,
  _formatGuardrails,
  _formatVocabulary,
  scoreContent,
  type ScoreContentParams,
} from "./score-content";

// Mock the Gemini client
const mockGenerateStructuredResponse = vi.fn();

vi.mock("@/lib/ai/gemini-client", () => ({
  generateStructuredResponse: (...args: unknown[]) => mockGenerateStructuredResponse(...args),
}));

// Test fixtures
const mockBrandProfile: BrandProfile = {
  id: "profile-123",
  workspaceId: "workspace-456",
  name: "Test Brand",
  mission: "To provide excellent service",
  values: ["Quality", "Innovation", "Trust"],
  toneDescriptors: {
    formalCasual: 30, // More formal
    technicalSimple: 70, // More simple
    seriousPlayful: 40, // More serious
    reservedEnthusiastic: 60, // Slightly enthusiastic
  },
  logoUrl: null,
  logoR2Key: null,
  colorPalette: [],
  version: 1,
  isActive: true,
  createdById: "user-123",
  updatedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockGuardrails: BrandGuardrail[] = [
  {
    id: "g1",
    brandProfileId: "profile-123",
    type: "PROHIBITED_TOPIC",
    name: "Competitor mentions",
    description: "Never mention competitor names",
    severity: "HIGH",
    ruleConfig: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "g2",
    brandProfileId: "profile-123",
    type: "REQUIRED_DISCLOSURE",
    name: "Affiliate disclosure",
    description: "Must include affiliate disclosure for sponsored content",
    severity: "CRITICAL",
    ruleConfig: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockVocabulary: BrandVocabulary[] = [
  {
    id: "v1",
    brandProfileId: "profile-123",
    type: "PREFERRED",
    term: "customers",
    replacement: null,
    context: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "v2",
    brandProfileId: "profile-123",
    type: "BANNED",
    term: "cheap",
    replacement: null,
    context: "Use 'affordable' instead",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "v3",
    brandProfileId: "profile-123",
    type: "REPLACEMENT",
    term: "users",
    replacement: "customers",
    context: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockParams: ScoreContentParams = {
  content: "This is test content for our customers.",
  contentType: "social_post",
  strictMode: false,
  brandProfile: mockBrandProfile,
  guardrails: mockGuardrails,
  vocabulary: mockVocabulary,
};

describe("score-content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("_formatGuardrails", () => {
    it("should format empty guardrails", () => {
      const result = _formatGuardrails([]);
      expect(result).toBe("No specific guardrails defined.");
    });

    it("should format guardrails with severity emojis", () => {
      const result = _formatGuardrails(mockGuardrails);

      expect(result).toContain("🟠"); // HIGH severity
      expect(result).toContain("🔴"); // CRITICAL severity
      expect(result).toContain("PROHIBITED_TOPIC");
      expect(result).toContain("REQUIRED_DISCLOSURE");
      expect(result).toContain("Competitor mentions");
      expect(result).toContain("Affiliate disclosure");
    });

    it("should handle LOW and MEDIUM severities", () => {
      const guardrails: BrandGuardrail[] = [
        {
          ...mockGuardrails[0]!,
          severity: "LOW",
        },
        {
          ...mockGuardrails[1]!,
          severity: "MEDIUM",
        },
      ];

      const result = _formatGuardrails(guardrails);

      expect(result).toContain("⚪"); // LOW severity
      expect(result).toContain("🟡"); // MEDIUM severity
    });
  });

  describe("_formatVocabulary", () => {
    it("should format empty vocabulary", () => {
      const result = _formatVocabulary([]);
      expect(result).toBe("No specific vocabulary rules defined.");
    });

    it("should group vocabulary by type", () => {
      const result = _formatVocabulary(mockVocabulary);

      expect(result).toContain("**Preferred Terms:** customers");
      expect(result).toContain(
        "**Banned Terms:** cheap (Use 'affordable' instead)",
      );
      expect(result).toContain('**Replacements:** "users" → "customers"');
    });

    it("should handle vocabulary without context", () => {
      const vocabulary: BrandVocabulary[] = [
        {
          ...mockVocabulary[1]!,
          context: null,
        },
      ];

      const result = _formatVocabulary(vocabulary);
      expect(result).toContain("**Banned Terms:** cheap");
      expect(result).not.toContain("(");
    });
  });

  describe("_buildBrandScoringSystemPrompt", () => {
    it("should include brand name", () => {
      const prompt = _buildBrandScoringSystemPrompt(mockParams);
      expect(prompt).toContain("Test Brand");
    });

    it("should include mission", () => {
      const prompt = _buildBrandScoringSystemPrompt(mockParams);
      expect(prompt).toContain("To provide excellent service");
    });

    it("should include values", () => {
      const prompt = _buildBrandScoringSystemPrompt(mockParams);
      expect(prompt).toContain("Quality, Innovation, Trust");
    });

    it("should include tone guidelines with targets", () => {
      const prompt = _buildBrandScoringSystemPrompt(mockParams);
      expect(prompt).toContain("Target 30"); // formalCasual
      expect(prompt).toContain("Target 70"); // technicalSimple
    });

    it("should include guardrails section", () => {
      const prompt = _buildBrandScoringSystemPrompt(mockParams);
      expect(prompt).toContain("Guardrails");
      expect(prompt).toContain("Competitor mentions");
    });

    it("should include vocabulary section", () => {
      const prompt = _buildBrandScoringSystemPrompt(mockParams);
      expect(prompt).toContain("Vocabulary Rules");
      expect(prompt).toContain("customers");
    });

    it("should include scoring guidelines", () => {
      const prompt = _buildBrandScoringSystemPrompt(mockParams);
      expect(prompt).toContain("Tone Alignment (40%)");
      expect(prompt).toContain("Vocabulary Compliance (30%)");
      expect(prompt).toContain("Guardrail Adherence (20%)");
      expect(prompt).toContain("Style Consistency (10%)");
    });

    it("should include JSON response format", () => {
      const prompt = _buildBrandScoringSystemPrompt(mockParams);
      expect(prompt).toContain("JSON");
      expect(prompt).toContain("score");
      expect(prompt).toContain("violations");
      expect(prompt).toContain("suggestions");
      expect(prompt).toContain("toneAnalysis");
    });

    it("should handle missing mission", () => {
      const params = {
        ...mockParams,
        brandProfile: { ...mockBrandProfile, mission: null },
      };

      const prompt = _buildBrandScoringSystemPrompt(params);
      expect(prompt).toContain("Not specified");
    });

    it("should handle missing values", () => {
      const params = {
        ...mockParams,
        brandProfile: { ...mockBrandProfile, values: null },
      };

      const prompt = _buildBrandScoringSystemPrompt(params);
      expect(prompt).toContain("Not specified");
    });

    it("should use default tone descriptors when null", () => {
      const params = {
        ...mockParams,
        brandProfile: { ...mockBrandProfile, toneDescriptors: null },
      };

      const prompt = _buildBrandScoringSystemPrompt(params);
      // Should use default value of 50
      expect(prompt).toContain("Target 50");
    });
  });

  describe("scoreContent", () => {
    const mockGeminiResponse = {
      score: 85,
      violations: [
        {
          type: "TONE_MISMATCH",
          severity: "LOW",
          message: "Slightly too casual",
          lineNumber: 1,
          suggestion: "Use more formal language",
        },
      ],
      suggestions: [
        {
          category: "TONE",
          recommendation: "Consider a more formal tone",
          priority: "MEDIUM",
        },
      ],
      toneAnalysis: {
        formalCasual: 55,
        technicalSimple: 65,
        seriousPlayful: 45,
        reservedEnthusiastic: 50,
        alignment: 80,
      },
    };

    it("should return score response from Gemini", async () => {
      mockGenerateStructuredResponse.mockResolvedValue(mockGeminiResponse);

      const result = await scoreContent(mockParams);

      expect(result.score).toBe(85);
      expect(result.overallAssessment).toBe("GOOD");
      expect(result.cached).toBe(false);
    });

    it("should pass correct parameters to Gemini", async () => {
      mockGenerateStructuredResponse.mockResolvedValue(mockGeminiResponse);

      await scoreContent(mockParams);

      expect(mockGenerateStructuredResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 4096,
          temperature: 0.3,
        }),
      );

      const call = mockGenerateStructuredResponse.mock.calls[0]![0];
      expect(call.systemPrompt).toContain("Test Brand");
      expect(call.prompt).toContain("social post");
      expect(call.prompt).toContain("This is test content for our customers.");
    });

    it("should apply strict mode when violations exist", async () => {
      mockGenerateStructuredResponse.mockResolvedValue(mockGeminiResponse);

      const result = await scoreContent({
        ...mockParams,
        strictMode: true,
      });

      // Score should be 0 due to strict mode and existing violations
      expect(result.score).toBe(0);
      expect(result.overallAssessment).toBe("OFF_BRAND");
    });

    it("should not apply strict mode when no violations", async () => {
      mockGenerateStructuredResponse.mockResolvedValue({
        ...mockGeminiResponse,
        violations: [],
      });

      const result = await scoreContent({
        ...mockParams,
        strictMode: true,
      });

      // Score should remain unchanged
      expect(result.score).toBe(85);
    });

    it("should throw error on Gemini failure", async () => {
      mockGenerateStructuredResponse.mockRejectedValue(new Error("API error"));

      await expect(scoreContent(mockParams)).rejects.toThrow(
        "Failed to score content: API error",
      );
    });

    it("should throw error on invalid response structure", async () => {
      mockGenerateStructuredResponse.mockResolvedValue({
        score: 85,
        // Missing required fields
      });

      await expect(scoreContent(mockParams)).rejects.toThrow(
        "Invalid score response structure from AI",
      );
    });

    it("should transform violations correctly", async () => {
      mockGenerateStructuredResponse.mockResolvedValue(mockGeminiResponse);

      const result = await scoreContent(mockParams);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.type).toBe("TONE_MISMATCH");
      expect(result.violations[0]!.location?.lineNumber).toBe(1);
    });

    it("should handle different content types", async () => {
      mockGenerateStructuredResponse.mockResolvedValue(mockGeminiResponse);

      await scoreContent({
        ...mockParams,
        contentType: "blog_article",
      });

      const call = mockGenerateStructuredResponse.mock.calls[0]![0];
      expect(call.prompt).toContain("blog article");
    });
  });
});
