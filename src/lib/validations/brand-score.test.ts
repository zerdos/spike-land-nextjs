import { describe, expect, it } from "vitest";
import {
  CONTENT_TYPES,
  contentScoreRequestSchema,
  contentScoreResponseSchema,
  contentViolationSchema,
  geminiScoreResponseSchema,
  getOverallAssessment,
  OVERALL_ASSESSMENTS,
  SUGGESTION_CATEGORIES,
  SUGGESTION_PRIORITIES,
  transformGeminiResponse,
  VIOLATION_SEVERITIES,
  VIOLATION_TYPES,
} from "./brand-score";

describe("brand-score validation schemas", () => {
  // ============================================
  // Constants
  // ============================================

  describe("constants", () => {
    it("should have correct CONTENT_TYPES", () => {
      expect(CONTENT_TYPES).toEqual([
        "social_post",
        "blog_article",
        "email",
        "marketing_copy",
        "general",
      ]);
    });

    it("should have correct VIOLATION_TYPES", () => {
      expect(VIOLATION_TYPES).toEqual([
        "BANNED_WORD",
        "TONE_MISMATCH",
        "GUARDRAIL_VIOLATION",
        "MISSING_DISCLOSURE",
        "STYLE_DEVIATION",
      ]);
    });

    it("should have correct VIOLATION_SEVERITIES", () => {
      expect(VIOLATION_SEVERITIES).toEqual(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
    });

    it("should have correct OVERALL_ASSESSMENTS", () => {
      expect(OVERALL_ASSESSMENTS).toEqual([
        "EXCELLENT",
        "GOOD",
        "NEEDS_WORK",
        "POOR",
        "OFF_BRAND",
      ]);
    });

    it("should have correct SUGGESTION_CATEGORIES", () => {
      expect(SUGGESTION_CATEGORIES).toEqual([
        "TONE",
        "VOCABULARY",
        "GUARDRAILS",
        "STYLE",
      ]);
    });

    it("should have correct SUGGESTION_PRIORITIES", () => {
      expect(SUGGESTION_PRIORITIES).toEqual(["HIGH", "MEDIUM", "LOW"]);
    });
  });

  // ============================================
  // Request Schema
  // ============================================

  describe("contentScoreRequestSchema", () => {
    it("should accept valid request with all fields", () => {
      const result = contentScoreRequestSchema.safeParse({
        content: "This is test content",
        contentType: "social_post",
        strictMode: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("This is test content");
        expect(result.data.contentType).toBe("social_post");
        expect(result.data.strictMode).toBe(true);
      }
    });

    it("should accept valid request with only content (defaults applied)", () => {
      const result = contentScoreRequestSchema.safeParse({
        content: "Test content",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("Test content");
        expect(result.data.contentType).toBe("general");
        expect(result.data.strictMode).toBe(false);
      }
    });

    it("should reject empty content", () => {
      const result = contentScoreRequestSchema.safeParse({
        content: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toBe("Content is required");
      }
    });

    it("should reject content exceeding 50,000 characters", () => {
      const result = contentScoreRequestSchema.safeParse({
        content: "a".repeat(50001),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toBe(
          "Content must be less than 50,000 characters",
        );
      }
    });

    it("should reject invalid contentType", () => {
      const result = contentScoreRequestSchema.safeParse({
        content: "Test content",
        contentType: "invalid_type",
      });

      expect(result.success).toBe(false);
    });

    it("should accept all valid contentType values", () => {
      for (const type of CONTENT_TYPES) {
        const result = contentScoreRequestSchema.safeParse({
          content: "Test content",
          contentType: type,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  // ============================================
  // Violation Schema
  // ============================================

  describe("contentViolationSchema", () => {
    it("should accept valid violation with all fields", () => {
      const result = contentViolationSchema.safeParse({
        type: "BANNED_WORD",
        severity: "HIGH",
        message: "Found banned word 'spam'",
        location: {
          lineNumber: 5,
          wordIndex: 12,
          excerpt: "...check out this spam offer...",
        },
        suggestion: "Remove the word 'spam'",
      });

      expect(result.success).toBe(true);
    });

    it("should accept valid violation with minimum fields", () => {
      const result = contentViolationSchema.safeParse({
        type: "TONE_MISMATCH",
        severity: "LOW",
        message: "Tone is too casual",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid violation type", () => {
      const result = contentViolationSchema.safeParse({
        type: "INVALID_TYPE",
        severity: "HIGH",
        message: "Test message",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid severity", () => {
      const result = contentViolationSchema.safeParse({
        type: "BANNED_WORD",
        severity: "SUPER_HIGH",
        message: "Test message",
      });

      expect(result.success).toBe(false);
    });

    it("should accept all valid violation types", () => {
      for (const type of VIOLATION_TYPES) {
        const result = contentViolationSchema.safeParse({
          type,
          severity: "MEDIUM",
          message: "Test",
        });
        expect(result.success).toBe(true);
      }
    });

    it("should accept all valid severity levels", () => {
      for (const severity of VIOLATION_SEVERITIES) {
        const result = contentViolationSchema.safeParse({
          type: "BANNED_WORD",
          severity,
          message: "Test",
        });
        expect(result.success).toBe(true);
      }
    });
  });

  // ============================================
  // Response Schema
  // ============================================

  describe("contentScoreResponseSchema", () => {
    const validResponse = {
      score: 85,
      overallAssessment: "GOOD" as const,
      violations: [
        {
          type: "TONE_MISMATCH" as const,
          severity: "LOW" as const,
          message: "Slightly too casual",
        },
      ],
      suggestions: [
        {
          category: "TONE" as const,
          recommendation: "Use more formal language",
          priority: "MEDIUM" as const,
        },
      ],
      toneAnalysis: {
        formalCasual: 65,
        technicalSimple: 50,
        seriousPlayful: 40,
        reservedEnthusiastic: 55,
        alignment: 80,
      },
      cached: false,
    };

    it("should accept valid response", () => {
      const result = contentScoreResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it("should accept response with cachedAt", () => {
      const result = contentScoreResponseSchema.safeParse({
        ...validResponse,
        cached: true,
        cachedAt: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });

    it("should reject score below 0", () => {
      const result = contentScoreResponseSchema.safeParse({
        ...validResponse,
        score: -5,
      });
      expect(result.success).toBe(false);
    });

    it("should reject score above 100", () => {
      const result = contentScoreResponseSchema.safeParse({
        ...validResponse,
        score: 105,
      });
      expect(result.success).toBe(false);
    });

    it("should accept boundary scores (0 and 100)", () => {
      const resultZero = contentScoreResponseSchema.safeParse({
        ...validResponse,
        score: 0,
        overallAssessment: "OFF_BRAND",
      });
      expect(resultZero.success).toBe(true);

      const resultHundred = contentScoreResponseSchema.safeParse({
        ...validResponse,
        score: 100,
        overallAssessment: "EXCELLENT",
      });
      expect(resultHundred.success).toBe(true);
    });
  });

  // ============================================
  // Gemini Response Schema
  // ============================================

  describe("geminiScoreResponseSchema", () => {
    const validGeminiResponse = {
      score: 75,
      violations: [
        {
          type: "BANNED_WORD",
          severity: "MEDIUM",
          message: "Found banned word",
          lineNumber: 3,
          excerpt: "...test excerpt...",
          suggestion: "Remove it",
        },
      ],
      suggestions: [
        {
          category: "VOCABULARY",
          recommendation: "Use preferred terms",
          priority: "HIGH",
        },
      ],
      toneAnalysis: {
        formalCasual: 60,
        technicalSimple: 45,
        seriousPlayful: 30,
        reservedEnthusiastic: 70,
        alignment: 75,
      },
    };

    it("should accept valid Gemini response", () => {
      const result = geminiScoreResponseSchema.safeParse(validGeminiResponse);
      expect(result.success).toBe(true);
    });

    it("should accept response with optional fields missing", () => {
      const result = geminiScoreResponseSchema.safeParse({
        score: 50,
        violations: [],
        suggestions: [],
        toneAnalysis: {
          formalCasual: 50,
          technicalSimple: 50,
          seriousPlayful: 50,
          reservedEnthusiastic: 50,
          alignment: 50,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // Helper Functions
  // ============================================

  describe("getOverallAssessment", () => {
    it("should return EXCELLENT for scores 90-100", () => {
      expect(getOverallAssessment(90)).toBe("EXCELLENT");
      expect(getOverallAssessment(95)).toBe("EXCELLENT");
      expect(getOverallAssessment(100)).toBe("EXCELLENT");
    });

    it("should return GOOD for scores 70-89", () => {
      expect(getOverallAssessment(70)).toBe("GOOD");
      expect(getOverallAssessment(80)).toBe("GOOD");
      expect(getOverallAssessment(89)).toBe("GOOD");
    });

    it("should return NEEDS_WORK for scores 50-69", () => {
      expect(getOverallAssessment(50)).toBe("NEEDS_WORK");
      expect(getOverallAssessment(60)).toBe("NEEDS_WORK");
      expect(getOverallAssessment(69)).toBe("NEEDS_WORK");
    });

    it("should return POOR for scores 25-49", () => {
      expect(getOverallAssessment(25)).toBe("POOR");
      expect(getOverallAssessment(35)).toBe("POOR");
      expect(getOverallAssessment(49)).toBe("POOR");
    });

    it("should return OFF_BRAND for scores 0-24", () => {
      expect(getOverallAssessment(0)).toBe("OFF_BRAND");
      expect(getOverallAssessment(10)).toBe("OFF_BRAND");
      expect(getOverallAssessment(24)).toBe("OFF_BRAND");
    });
  });

  describe("transformGeminiResponse", () => {
    it("should transform Gemini response to API response format", () => {
      const geminiResponse = {
        score: 85,
        violations: [
          {
            type: "BANNED_WORD" as const,
            severity: "HIGH" as const,
            message: "Found banned word",
            lineNumber: 5,
            wordIndex: 10,
            excerpt: "test excerpt",
            suggestion: "Remove it",
          },
        ],
        suggestions: [
          {
            category: "VOCABULARY" as const,
            recommendation: "Use preferred terms",
            priority: "MEDIUM" as const,
          },
        ],
        toneAnalysis: {
          formalCasual: 55.7,
          technicalSimple: 48.3,
          seriousPlayful: 62.1,
          reservedEnthusiastic: 44.9,
          alignment: 78.5,
        },
      };

      const result = transformGeminiResponse(geminiResponse, false);

      expect(result.score).toBe(85);
      expect(result.overallAssessment).toBe("GOOD");
      expect(result.cached).toBe(false);
      expect(result.cachedAt).toBeUndefined();

      // Check violations are transformed correctly
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.location).toEqual({
        lineNumber: 5,
        wordIndex: 10,
        excerpt: "test excerpt",
      });

      // Check tone analysis values are rounded
      expect(result.toneAnalysis.formalCasual).toBe(56);
      expect(result.toneAnalysis.technicalSimple).toBe(48);
      expect(result.toneAnalysis.seriousPlayful).toBe(62);
      expect(result.toneAnalysis.reservedEnthusiastic).toBe(45);
      expect(result.toneAnalysis.alignment).toBe(79);
    });

    it("should handle cached response", () => {
      const geminiResponse = {
        score: 100,
        violations: [],
        suggestions: [],
        toneAnalysis: {
          formalCasual: 50,
          technicalSimple: 50,
          seriousPlayful: 50,
          reservedEnthusiastic: 50,
          alignment: 100,
        },
      };

      const cachedAt = new Date();
      const result = transformGeminiResponse(geminiResponse, true, cachedAt);

      expect(result.cached).toBe(true);
      expect(result.cachedAt).toBe(cachedAt.toISOString());
      expect(result.overallAssessment).toBe("EXCELLENT");
    });

    it("should omit location if no location fields present", () => {
      const geminiResponse = {
        score: 50,
        violations: [
          {
            type: "TONE_MISMATCH" as const,
            severity: "LOW" as const,
            message: "Too casual",
          },
        ],
        suggestions: [],
        toneAnalysis: {
          formalCasual: 80,
          technicalSimple: 50,
          seriousPlayful: 50,
          reservedEnthusiastic: 50,
          alignment: 50,
        },
      };

      const result = transformGeminiResponse(geminiResponse, false);
      expect(result.violations[0]!.location).toBeUndefined();
    });
  });
});
