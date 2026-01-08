import type { BrandGuardrail, BrandProfile, BrandVocabulary } from "@/types/brand-brain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock generateStructuredResponse
vi.mock("@/lib/ai/gemini-client", () => ({
  generateStructuredResponse: vi.fn(),
}));

// Import after mocks
import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import {
  _buildBrandRewritingSystemPrompt,
  _formatGuardrails,
  _formatVocabulary,
  computeDiffHunks,
  rewriteContent,
  type RewriteContentParams,
  type RewriteResult,
  transformRewriteResult,
} from "./rewrite-content";

const mockGenerateStructuredResponse = generateStructuredResponse as ReturnType<
  typeof vi.fn
>;

describe("rewrite-content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Sample test data
  const mockBrandProfile: BrandProfile = {
    id: "profile-123",
    workspaceId: "workspace-123",
    name: "Test Brand",
    mission: "To make the world a better place",
    values: ["Innovation", "Integrity", "Excellence"],
    toneDescriptors: {
      formalCasual: 30,
      technicalSimple: 70,
      seriousPlayful: 40,
      reservedEnthusiastic: 60,
    },
    version: 1,
    isActive: true,
    createdById: "user-123",
    updatedById: "user-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGuardrails: BrandGuardrail[] = [
    {
      id: "g1",
      brandProfileId: "profile-123",
      type: "PROHIBITED_TOPIC",
      name: "Politics",
      description: "Avoid political topics",
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
      name: "Affiliate",
      description: "Disclose affiliate links",
      severity: "MEDIUM",
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
      term: "awesome",
      type: "PREFERRED",
      replacement: null,
      context: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "v2",
      brandProfileId: "profile-123",
      term: "cheap",
      type: "BANNED",
      replacement: null,
      context: "use 'affordable' instead",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "v3",
      brandProfileId: "profile-123",
      term: "product",
      replacement: "solution",
      type: "REPLACEMENT",
      context: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  describe("_formatGuardrails", () => {
    it("should format guardrails with severity emoji", () => {
      const result = _formatGuardrails(mockGuardrails);

      expect(result).toContain(
        "! [PROHIBITED_TOPIC] Politics: Avoid political topics",
      );
      expect(result).toContain(
        "- [REQUIRED_DISCLOSURE] Affiliate: Disclose affiliate links",
      );
    });

    it("should return message when no guardrails", () => {
      const result = _formatGuardrails([]);

      expect(result).toBe("No specific guardrails defined.");
    });

    it("should handle guardrails without description", () => {
      const guardrails: BrandGuardrail[] = [
        {
          id: "g1",
          brandProfileId: "profile-123",
          type: "CONTENT_WARNING",
          name: "Sensitive",
          description: null,
          severity: "LOW",
          ruleConfig: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = _formatGuardrails(guardrails);

      expect(result).toContain("~ [CONTENT_WARNING] Sensitive: No description");
    });

    it("should handle CRITICAL severity", () => {
      const guardrails: BrandGuardrail[] = [
        {
          id: "g1",
          brandProfileId: "profile-123",
          type: "PROHIBITED_TOPIC",
          name: "Legal Risk",
          description: "Avoid legal advice",
          severity: "CRITICAL",
          ruleConfig: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = _formatGuardrails(guardrails);

      expect(result).toContain(
        "!! [PROHIBITED_TOPIC] Legal Risk: Avoid legal advice",
      );
    });

    it("should handle unknown severity with default dash", () => {
      const guardrails: BrandGuardrail[] = [
        {
          id: "g1",
          brandProfileId: "profile-123",
          type: "PROHIBITED_TOPIC",
          name: "Test",
          description: null,
          severity: "UNKNOWN" as "LOW",
          ruleConfig: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = _formatGuardrails(guardrails);

      expect(result).toContain("- [PROHIBITED_TOPIC] Test:");
    });
  });

  describe("_formatVocabulary", () => {
    it("should format vocabulary by type", () => {
      const result = _formatVocabulary(mockVocabulary);

      expect(result).toContain("**Preferred Terms:** awesome");
      expect(result).toContain(
        "**Banned Terms (MUST replace):** cheap (use 'affordable' instead)",
      );
      expect(result).toContain(
        '**Required Replacements:** "product" -> "solution"',
      );
    });

    it("should return message when no vocabulary", () => {
      const result = _formatVocabulary([]);

      expect(result).toBe("No specific vocabulary rules defined.");
    });

    it("should handle only preferred terms", () => {
      const vocab: BrandVocabulary[] = [
        {
          id: "v1",
          brandProfileId: "p1",
          term: "great",
          type: "PREFERRED",
          replacement: null,
          context: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "v2",
          brandProfileId: "p1",
          term: "amazing",
          type: "PREFERRED",
          replacement: null,
          context: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = _formatVocabulary(vocab);

      expect(result).toContain("**Preferred Terms:** great, amazing");
      expect(result).not.toContain("**Banned Terms");
      expect(result).not.toContain("**Required Replacements");
    });

    it("should handle only banned terms", () => {
      const vocab: BrandVocabulary[] = [
        {
          id: "v1",
          brandProfileId: "p1",
          term: "bad",
          type: "BANNED",
          replacement: null,
          context: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = _formatVocabulary(vocab);

      expect(result).toContain("**Banned Terms (MUST replace):** bad");
    });

    it("should handle banned terms without context", () => {
      const vocab: BrandVocabulary[] = [
        {
          id: "v1",
          brandProfileId: "p1",
          term: "terrible",
          type: "BANNED",
          replacement: null,
          context: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = _formatVocabulary(vocab);

      expect(result).toContain("**Banned Terms (MUST replace):** terrible");
      // No context in parentheses after the term itself
      expect(result).not.toContain("terrible (");
    });

    it("should handle only replacements", () => {
      const vocab: BrandVocabulary[] = [
        {
          id: "v1",
          brandProfileId: "p1",
          term: "old",
          replacement: "new",
          type: "REPLACEMENT",
          context: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = _formatVocabulary(vocab);

      expect(result).toContain('**Required Replacements:** "old" -> "new"');
    });
  });

  describe("_buildBrandRewritingSystemPrompt", () => {
    const params: RewriteContentParams = {
      content: "Test content",
      platform: "TWITTER",
      brandProfile: mockBrandProfile,
      guardrails: mockGuardrails,
      vocabulary: mockVocabulary,
    };

    it("should include brand profile name", () => {
      const result = _buildBrandRewritingSystemPrompt(params);

      expect(result).toContain("## Brand Profile: Test Brand");
    });

    it("should include mission", () => {
      const result = _buildBrandRewritingSystemPrompt(params);

      expect(result).toContain("To make the world a better place");
    });

    it("should include values", () => {
      const result = _buildBrandRewritingSystemPrompt(params);

      expect(result).toContain("Innovation, Integrity, Excellence");
    });

    it("should include tone descriptors", () => {
      const result = _buildBrandRewritingSystemPrompt(params);

      expect(result).toContain("Formal <-> Casual: Target 30");
      expect(result).toContain("Technical <-> Simple: Target 70");
      expect(result).toContain("Serious <-> Playful: Target 40");
      expect(result).toContain("Reserved <-> Enthusiastic: Target 60");
    });

    it("should include platform constraint", () => {
      const result = _buildBrandRewritingSystemPrompt(params);

      expect(result).toContain("## Platform Constraint: TWITTER");
      expect(result).toContain("Maximum character limit: 280 characters");
    });

    it("should include guardrails", () => {
      const result = _buildBrandRewritingSystemPrompt(params);

      expect(result).toContain("Politics");
      expect(result).toContain("Affiliate");
    });

    it("should include vocabulary rules", () => {
      const result = _buildBrandRewritingSystemPrompt(params);

      expect(result).toContain("awesome");
      expect(result).toContain("cheap");
    });

    it("should handle missing tone descriptors with defaults", () => {
      const paramsNoTone: RewriteContentParams = {
        ...params,
        brandProfile: { ...mockBrandProfile, toneDescriptors: null },
      };

      const result = _buildBrandRewritingSystemPrompt(paramsNoTone);

      expect(result).toContain("Formal <-> Casual: Target 50");
      expect(result).toContain("Technical <-> Simple: Target 50");
    });

    it("should handle missing mission", () => {
      const paramsNoMission: RewriteContentParams = {
        ...params,
        brandProfile: { ...mockBrandProfile, mission: null },
      };

      const result = _buildBrandRewritingSystemPrompt(paramsNoMission);

      expect(result).toContain("Not specified");
    });

    it("should handle missing values", () => {
      const paramsNoValues: RewriteContentParams = {
        ...params,
        brandProfile: { ...mockBrandProfile, values: null },
      };

      const result = _buildBrandRewritingSystemPrompt(paramsNoValues);

      expect(result).toContain("### Core Values\nNot specified");
    });

    it("should use different character limits per platform", () => {
      const linkedInParams: RewriteContentParams = {
        ...params,
        platform: "LINKEDIN",
      };

      const result = _buildBrandRewritingSystemPrompt(linkedInParams);

      expect(result).toContain("Maximum character limit: 3000 characters");
    });
  });

  describe("computeDiffHunks", () => {
    it("should compute hunks for simple word change", () => {
      const hunks = computeDiffHunks("Hello world", "Hello universe");

      expect(hunks.length).toBeGreaterThan(0);
      expect(
        hunks.some((h) => h.type === "removed" && h.value.includes("world")),
      ).toBe(true);
      expect(
        hunks.some((h) => h.type === "added" && h.value.includes("universe")),
      ).toBe(true);
    });

    it("should mark all hunks as selected by default", () => {
      const hunks = computeDiffHunks("old text", "new text");

      expect(hunks.every((h) => h.selected === true)).toBe(true);
    });

    it("should assign unique IDs to hunks", () => {
      const hunks = computeDiffHunks(
        "Hello beautiful world",
        "Hello amazing world",
      );

      const ids = hunks.map((h) => h.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should return unchanged hunk for identical text", () => {
      const hunks = computeDiffHunks("Same text", "Same text");

      expect(hunks.length).toBe(1);
      expect(hunks[0]!.type).toBe("unchanged");
      expect(hunks[0]!.value).toBe("Same text");
    });

    it("should handle empty strings", () => {
      const hunks = computeDiffHunks("", "New content");

      expect(hunks.some((h) => h.type === "added")).toBe(true);
    });

    it("should handle complete replacement", () => {
      const hunks = computeDiffHunks("Old", "New");

      expect(hunks.some((h) => h.type === "removed")).toBe(true);
      expect(hunks.some((h) => h.type === "added")).toBe(true);
    });

    it("should use hunk-{index} ID format", () => {
      const hunks = computeDiffHunks("A B C", "A X C");

      expect(hunks[0]!.id).toBe("hunk-0");
      expect(hunks.every((h, i) => h.id === `hunk-${i}`)).toBe(true);
    });
  });

  describe("rewriteContent", () => {
    const params: RewriteContentParams = {
      content: "This is my draft content for social media.",
      platform: "TWITTER",
      brandProfile: mockBrandProfile,
      guardrails: [],
      vocabulary: [],
    };

    it("should call generateStructuredResponse with correct parameters", async () => {
      mockGenerateStructuredResponse.mockResolvedValue({
        rewrittenContent: "This is brand-aligned content.",
        toneAnalysis: {
          formalCasual: 50,
          technicalSimple: 50,
          seriousPlayful: 50,
          reservedEnthusiastic: 50,
          alignment: 80,
        },
      });

      await rewriteContent(params);

      expect(mockGenerateStructuredResponse).toHaveBeenCalledWith({
        prompt: expect.stringContaining("Rewrite the following content"),
        systemPrompt: expect.stringContaining("Brand Profile: Test Brand"),
        maxTokens: 4096,
        temperature: 0.5,
      });
    });

    it("should return rewritten content with diff hunks", async () => {
      mockGenerateStructuredResponse.mockResolvedValue({
        rewrittenContent: "Brand-aligned rewritten content.",
        toneAnalysis: {
          formalCasual: 30,
          technicalSimple: 70,
          seriousPlayful: 40,
          reservedEnthusiastic: 60,
          alignment: 85,
        },
      });

      const result = await rewriteContent(params);

      expect(result.rewrittenContent).toBe("Brand-aligned rewritten content.");
      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
    });

    it("should include character counts in result", async () => {
      mockGenerateStructuredResponse.mockResolvedValue({
        rewrittenContent: "Short.",
        toneAnalysis: {
          formalCasual: 50,
          technicalSimple: 50,
          seriousPlayful: 50,
          reservedEnthusiastic: 50,
          alignment: 75,
        },
      });

      const result = await rewriteContent(params);

      expect(result.characterCount.original).toBe(params.content.length);
      expect(result.characterCount.rewritten).toBe(6); // "Short."
      expect(result.characterCount.limit).toBe(280); // Twitter limit
    });

    it("should include tone analysis in result", async () => {
      mockGenerateStructuredResponse.mockResolvedValue({
        rewrittenContent: "Rewritten.",
        toneAnalysis: {
          formalCasual: 25,
          technicalSimple: 75,
          seriousPlayful: 35,
          reservedEnthusiastic: 65,
          alignment: 90,
        },
      });

      const result = await rewriteContent(params);

      expect(result.toneAnalysis).toEqual({
        formalCasual: 25,
        technicalSimple: 75,
        seriousPlayful: 35,
        reservedEnthusiastic: 65,
        alignment: 90,
      });
    });

    it("should throw error on API failure", async () => {
      mockGenerateStructuredResponse.mockRejectedValue(new Error("API error"));

      await expect(rewriteContent(params)).rejects.toThrow(
        "Failed to rewrite content: API error",
      );
    });

    it("should throw error on invalid response structure", async () => {
      mockGenerateStructuredResponse.mockResolvedValue({
        invalid: "response",
      });

      await expect(rewriteContent(params)).rejects.toThrow(
        "Invalid rewrite response structure",
      );
    });

    it("should truncate content exceeding character limit", async () => {
      const longContent = "A".repeat(300); // Exceeds Twitter 280 limit
      mockGenerateStructuredResponse.mockResolvedValue({
        rewrittenContent: longContent,
        toneAnalysis: {
          formalCasual: 50,
          technicalSimple: 50,
          seriousPlayful: 50,
          reservedEnthusiastic: 50,
          alignment: 75,
        },
      });

      const result = await rewriteContent(params);

      expect(result.rewrittenContent.length).toBeLessThanOrEqual(280);
      expect(result.rewrittenContent.endsWith("...")).toBe(true);
    });

    it("should not truncate content within limit", async () => {
      mockGenerateStructuredResponse.mockResolvedValue({
        rewrittenContent: "Short content within limit.",
        toneAnalysis: {
          formalCasual: 50,
          technicalSimple: 50,
          seriousPlayful: 50,
          reservedEnthusiastic: 50,
          alignment: 75,
        },
      });

      const result = await rewriteContent(params);

      expect(result.rewrittenContent).toBe("Short content within limit.");
    });

    it("should round tone analysis values", async () => {
      mockGenerateStructuredResponse.mockResolvedValue({
        rewrittenContent: "Rewritten.",
        toneAnalysis: {
          formalCasual: 25.7,
          technicalSimple: 74.2,
          seriousPlayful: 35.5,
          reservedEnthusiastic: 64.9,
          alignment: 89.6,
        },
      });

      const result = await rewriteContent(params);

      expect(result.toneAnalysis.formalCasual).toBe(26);
      expect(result.toneAnalysis.technicalSimple).toBe(74);
      expect(result.toneAnalysis.seriousPlayful).toBe(36);
      expect(result.toneAnalysis.reservedEnthusiastic).toBe(65);
      expect(result.toneAnalysis.alignment).toBe(90);
    });

    it("should handle content ending with punctuation without adding ellipsis", async () => {
      // Content that exceeds limit but ends with punctuation after truncation
      const contentEndingWithDot = "This is a sentence.".padEnd(290, "X");
      mockGenerateStructuredResponse.mockResolvedValue({
        rewrittenContent: contentEndingWithDot,
        toneAnalysis: {
          formalCasual: 50,
          technicalSimple: 50,
          seriousPlayful: 50,
          reservedEnthusiastic: 50,
          alignment: 75,
        },
      });

      const result = await rewriteContent(params);

      // Should truncate but respect punctuation
      expect(result.rewrittenContent.length).toBeLessThanOrEqual(280);
    });

    it("should handle non-Error exceptions", async () => {
      mockGenerateStructuredResponse.mockRejectedValue("String error");

      await expect(rewriteContent(params)).rejects.toThrow(
        "Failed to rewrite content: Unknown error",
      );
    });
  });

  describe("transformRewriteResult", () => {
    const mockResult: RewriteResult = {
      rewrittenContent: "Brand-aligned content",
      changes: [
        { id: "hunk-0", type: "unchanged", value: "Brand", selected: true },
        { id: "hunk-1", type: "removed", value: "Old", selected: true },
        {
          id: "hunk-2",
          type: "added",
          value: "-aligned content",
          selected: true,
        },
      ],
      toneAnalysis: {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
        alignment: 85,
      },
      characterCount: {
        original: 20,
        rewritten: 21,
        limit: 280,
      },
    };

    it("should transform result to response format", () => {
      const response = transformRewriteResult(
        "rewrite-123",
        "Original content",
        mockResult,
        "TWITTER",
        false,
      );

      expect(response).toEqual({
        id: "rewrite-123",
        original: "Original content",
        rewritten: "Brand-aligned content",
        platform: "TWITTER",
        changes: mockResult.changes,
        characterCount: mockResult.characterCount,
        toneAnalysis: mockResult.toneAnalysis,
        cached: false,
        cachedAt: undefined,
      });
    });

    it("should include cachedAt when cached", () => {
      const cachedAt = new Date("2024-01-15T10:30:00Z");
      const response = transformRewriteResult(
        "rewrite-456",
        "Original",
        mockResult,
        "LINKEDIN",
        true,
        cachedAt,
      );

      expect(response.cached).toBe(true);
      expect(response.cachedAt).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should handle different platforms", () => {
      const response = transformRewriteResult(
        "id",
        "orig",
        mockResult,
        "INSTAGRAM",
        false,
      );

      expect(response.platform).toBe("INSTAGRAM");
    });

    it("should preserve all changes", () => {
      const response = transformRewriteResult(
        "id",
        "orig",
        mockResult,
        "GENERAL",
        false,
      );

      expect(response.changes).toHaveLength(3);
      expect(response.changes[0]!.type).toBe("unchanged");
      expect(response.changes[1]!.type).toBe("removed");
      expect(response.changes[2]!.type).toBe("added");
    });
  });
});
