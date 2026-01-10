/**
 * Policy Engine Tests
 *
 * Tests for the policy evaluation engine.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma to avoid DATABASE_URL requirement
vi.mock("@/lib/prisma", () => ({
  default: {
    policyRule: {
      findMany: vi.fn(),
    },
    policyCheck: {
      create: vi.fn(),
      update: vi.fn(),
    },
    policyViolation: {
      create: vi.fn(),
    },
  },
}));

import type { PolicyRule } from "@prisma/client";

import { evaluateRule, extractContentMetadata, getCharacterLimit } from "./policy-engine";
import type { PolicyRuleConditions } from "./types";

// Mock PolicyRule type for testing - cast conditions to match Prisma's JsonValue
const createMockRule = (
  overrides: Partial<{
    id: string;
    name: string;
    description: string;
    ruleType: string;
    severity: string;
    conditions: PolicyRuleConditions;
    isBlocking: boolean;
  }> = {},
): PolicyRule => ({
  id: overrides.id ?? "rule-1",
  workspaceId: null,
  name: overrides.name ?? "Test Rule",
  description: overrides.description ?? "Test description",
  platform: null,
  category: "CONTENT_GUIDELINES" as const,
  ruleType: (overrides.ruleType ?? "KEYWORD_MATCH") as
    | "KEYWORD_MATCH"
    | "REGEX_PATTERN"
    | "CHARACTER_COUNT"
    | "MEDIA_CHECK"
    | "LINK_VALIDATION"
    | "NLP_CLASSIFICATION"
    | "CUSTOM_LOGIC",
  conditions: (overrides.conditions ?? {}) as unknown as PolicyRule["conditions"],
  severity: (overrides.severity ?? "WARNING") as "INFO" | "WARNING" | "ERROR" | "CRITICAL",
  isBlocking: overrides.isBlocking ?? false,
  isActive: true,
  sourceUrl: null,
  lastVerifiedAt: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("Policy Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("evaluateRule - KEYWORD_MATCH", () => {
    it("should fail when content contains prohibited keyword", () => {
      const rule = createMockRule({
        ruleType: "KEYWORD_MATCH",
        conditions: {
          keywords: ["spam", "free money"],
          caseSensitive: false,
        },
      });

      const result = evaluateRule(rule, "Get your free money now!", undefined);

      expect(result.passed).toBe(false);
      expect(result.message).toContain("free money");
    });

    it("should pass when content does not contain prohibited keywords", () => {
      const rule = createMockRule({
        ruleType: "KEYWORD_MATCH",
        conditions: {
          keywords: ["spam", "free money"],
          caseSensitive: false,
        },
      });

      const result = evaluateRule(rule, "Check out our new product!", undefined);

      expect(result.passed).toBe(true);
    });

    it("should respect case sensitivity", () => {
      const rule = createMockRule({
        ruleType: "KEYWORD_MATCH",
        conditions: {
          keywords: ["SPAM"],
          caseSensitive: true,
        },
      });

      // Should pass - lowercase doesn't match
      const result1 = evaluateRule(rule, "This is not spam", undefined);
      expect(result1.passed).toBe(true);

      // Should fail - exact case match
      const result2 = evaluateRule(rule, "This is SPAM", undefined);
      expect(result2.passed).toBe(false);
    });
  });

  describe("evaluateRule - REGEX_PATTERN", () => {
    it("should fail when content matches regex pattern", () => {
      const rule = createMockRule({
        ruleType: "REGEX_PATTERN",
        conditions: {
          pattern: "\\d{3}-\\d{3}-\\d{4}",
          flags: "g",
        },
        description: "Phone numbers not allowed",
      });

      const result = evaluateRule(rule, "Call me at 555-123-4567", undefined);

      expect(result.passed).toBe(false);
      expect(result.matchedContent).toBe("555-123-4567");
    });

    it("should pass when content does not match regex pattern", () => {
      const rule = createMockRule({
        ruleType: "REGEX_PATTERN",
        conditions: {
          pattern: "\\d{3}-\\d{3}-\\d{4}",
        },
      });

      const result = evaluateRule(rule, "No phone numbers here", undefined);

      expect(result.passed).toBe(true);
    });

    it("should handle invalid regex gracefully", () => {
      const rule = createMockRule({
        ruleType: "REGEX_PATTERN",
        conditions: {
          pattern: "[invalid(regex",
        },
      });

      const result = evaluateRule(rule, "Test content", undefined);

      expect(result.passed).toBe(true);
      expect(result.message).toContain("Invalid regex");
    });
  });

  describe("evaluateRule - CHARACTER_COUNT", () => {
    it("should fail when content exceeds max length", () => {
      const rule = createMockRule({
        ruleType: "CHARACTER_COUNT",
        conditions: {
          maxLength: 50,
        },
      });

      const longContent =
        "This is a very long piece of content that exceeds the character limit set for this rule.";
      const result = evaluateRule(rule, longContent, undefined);

      expect(result.passed).toBe(false);
      expect(result.message).toContain("exceeds character limit");
      expect(result.suggestedFix).toContain("Reduce content");
    });

    it("should fail when content is below min length", () => {
      const rule = createMockRule({
        ruleType: "CHARACTER_COUNT",
        conditions: {
          minLength: 20,
        },
      });

      const result = evaluateRule(rule, "Too short", undefined);

      expect(result.passed).toBe(false);
      expect(result.message).toContain("too short");
    });

    it("should pass when content is within limits", () => {
      const rule = createMockRule({
        ruleType: "CHARACTER_COUNT",
        conditions: {
          minLength: 5,
          maxLength: 100,
        },
      });

      const result = evaluateRule(rule, "This content is just right!", undefined);

      expect(result.passed).toBe(true);
    });
  });

  describe("evaluateRule - MEDIA_CHECK", () => {
    it("should fail when media count exceeds maximum", () => {
      const rule = createMockRule({
        ruleType: "MEDIA_CHECK",
        conditions: {
          maxMediaCount: 2,
        },
      });

      const result = evaluateRule(rule, "Post content", {
        mediaUrls: ["img1.jpg", "img2.jpg", "img3.jpg"],
        mediaTypes: ["image", "image", "image"],
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain("Too many media items");
    });

    it("should fail when media count is below minimum", () => {
      const rule = createMockRule({
        ruleType: "MEDIA_CHECK",
        conditions: {
          minMediaCount: 1,
        },
      });

      const result = evaluateRule(rule, "Post without media", {});

      expect(result.passed).toBe(false);
      expect(result.message).toContain("Not enough media");
    });

    it("should pass when media count is within limits", () => {
      const rule = createMockRule({
        ruleType: "MEDIA_CHECK",
        conditions: {
          minMediaCount: 1,
          maxMediaCount: 4,
        },
      });

      const result = evaluateRule(rule, "Post with media", {
        mediaUrls: ["img1.jpg", "img2.jpg"],
        mediaTypes: ["image", "image"],
      });

      expect(result.passed).toBe(true);
    });
  });

  describe("evaluateRule - LINK_VALIDATION", () => {
    it("should fail when HTTP link is used and HTTPS is required", () => {
      const rule = createMockRule({
        ruleType: "LINK_VALIDATION",
        conditions: {
          requireHttps: true,
        },
      });

      const result = evaluateRule(rule, "Content", {
        links: ["http://example.com"],
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain("Non-HTTPS");
    });

    it("should fail when link is from blocked domain", () => {
      const rule = createMockRule({
        ruleType: "LINK_VALIDATION",
        conditions: {
          blockedDomains: ["spam.com", "malware.net"],
        },
      });

      const result = evaluateRule(rule, "Content", {
        links: ["https://spam.com/offer"],
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain("blocked domain");
    });

    it("should pass with valid HTTPS links from allowed domains", () => {
      const rule = createMockRule({
        ruleType: "LINK_VALIDATION",
        conditions: {
          requireHttps: true,
          allowedDomains: ["example.com", "trusted.org"],
        },
      });

      const result = evaluateRule(rule, "Content", {
        links: ["https://example.com/page"],
      });

      expect(result.passed).toBe(true);
    });
  });

  describe("evaluateRule - NLP_CLASSIFICATION", () => {
    it("should fail when content is classified as health claims", () => {
      const rule = createMockRule({
        ruleType: "NLP_CLASSIFICATION",
        conditions: {
          categories: ["health_claims"],
          minConfidence: 0.7,
        },
      });

      const result = evaluateRule(rule, "This product cures cancer!", undefined);

      expect(result.passed).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should pass for normal content", () => {
      const rule = createMockRule({
        ruleType: "NLP_CLASSIFICATION",
        conditions: {
          categories: ["health_claims"],
          minConfidence: 0.7,
        },
      });

      const result = evaluateRule(rule, "Check out our new fitness app!", undefined);

      expect(result.passed).toBe(true);
    });
  });

  describe("extractContentMetadata", () => {
    it("should extract links from content", () => {
      const content = "Check out https://example.com and http://test.org for more info.";
      const metadata = extractContentMetadata(content);

      expect(metadata.links).toHaveLength(2);
      expect(metadata.links).toContain("https://example.com");
      expect(metadata.links).toContain("http://test.org");
    });

    it("should extract hashtags from content", () => {
      const content = "This is #awesome and #trending content!";
      const metadata = extractContentMetadata(content);

      expect(metadata.hashtags).toHaveLength(2);
      expect(metadata.hashtags).toContain("#awesome");
      expect(metadata.hashtags).toContain("#trending");
    });

    it("should extract mentions from content", () => {
      const content = "Thanks to @user1 and @user2 for the help!";
      const metadata = extractContentMetadata(content);

      expect(metadata.mentions).toHaveLength(2);
      expect(metadata.mentions).toContain("@user1");
      expect(metadata.mentions).toContain("@user2");
    });

    it("should return empty arrays when no metadata found", () => {
      const content = "Just plain text without any links or hashtags.";
      const metadata = extractContentMetadata(content);

      expect(metadata.links).toHaveLength(0);
      expect(metadata.hashtags).toHaveLength(0);
      expect(metadata.mentions).toHaveLength(0);
    });
  });

  describe("getCharacterLimit", () => {
    it("should return correct limit for Twitter posts", () => {
      const limit = getCharacterLimit("TWITTER", "post");
      expect(limit).toBe(280);
    });

    it("should return correct limit for Instagram captions", () => {
      const limit = getCharacterLimit("INSTAGRAM", "post");
      expect(limit).toBe(2200);
    });

    it("should return correct limit for LinkedIn posts", () => {
      const limit = getCharacterLimit("LINKEDIN", "post");
      expect(limit).toBe(3000);
    });

    it("should return correct limit for bio types", () => {
      const twitterBio = getCharacterLimit("TWITTER", "bio");
      expect(twitterBio).toBe(160);

      const instaBio = getCharacterLimit("INSTAGRAM", "bio");
      expect(instaBio).toBe(150);
    });

    it("should return Infinity for unknown combinations", () => {
      // Cast to bypass type checking for test
      const limit = getCharacterLimit("UNKNOWN" as never, "post");
      expect(limit).toBe(Infinity);
    });
  });
});
