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

import prisma from "@/lib/prisma";
import type { PolicyRule } from "@prisma/client";

import {
  checkContent,
  evaluateRule,
  extractContentMetadata,
  getApplicableRules,
  getCharacterLimit,
} from "./policy-engine";
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
  severity: (overrides.severity ?? "WARNING") as
    | "INFO"
    | "WARNING"
    | "ERROR"
    | "CRITICAL",
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

      const result = evaluateRule(
        rule,
        "Check out our new product!",
        undefined,
      );

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

      const result = evaluateRule(
        rule,
        "This content is just right!",
        undefined,
      );

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

      const result = evaluateRule(
        rule,
        "This product cures cancer!",
        undefined,
      );

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

      const result = evaluateRule(
        rule,
        "Check out our new fitness app!",
        undefined,
      );

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

    it("should return correct limit for comment types", () => {
      const linkedinComment = getCharacterLimit("LINKEDIN", "comment");
      expect(linkedinComment).toBe(1250);
    });

    it("should return correct limit for TikTok comments", () => {
      const tiktokComment = getCharacterLimit("TIKTOK", "comment");
      expect(tiktokComment).toBe(150);
    });
  });

  describe("evaluateRule - CUSTOM_LOGIC", () => {
    it("should pass with custom logic placeholder", () => {
      const rule = createMockRule({
        ruleType: "CUSTOM_LOGIC",
        conditions: {},
      });

      const result = evaluateRule(rule, "Any content", undefined);

      expect(result.passed).toBe(true);
      expect(result.message).toContain("Custom logic");
    });
  });

  describe("evaluateRule - Unknown rule type", () => {
    it("should pass for unknown rule types with appropriate message", () => {
      const rule = createMockRule({
        ruleType: "UNKNOWN_TYPE" as never,
        conditions: {},
      });

      const result = evaluateRule(rule, "Any content", undefined);

      expect(result.passed).toBe(true);
      expect(result.message).toContain("Unknown rule type");
    });
  });

  describe("evaluateRule - Additional NLP cases", () => {
    it("should detect financial claims", () => {
      const rule = createMockRule({
        ruleType: "NLP_CLASSIFICATION",
        conditions: {
          categories: ["financial_claims"],
          minConfidence: 0.7,
        },
      });

      const result = evaluateRule(
        rule,
        "Get guaranteed returns on your investment!",
        undefined,
      );

      expect(result.passed).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should detect spam content", () => {
      const rule = createMockRule({
        ruleType: "NLP_CLASSIFICATION",
        conditions: {
          categories: ["spam"],
          minConfidence: 0.5,
        },
      });

      const result = evaluateRule(
        rule,
        "Click here for limited time offer! Act now!",
        undefined,
      );

      expect(result.passed).toBe(false);
    });

    it("should pass for unknown NLP category", () => {
      const rule = createMockRule({
        ruleType: "NLP_CLASSIFICATION",
        conditions: {
          categories: ["unknown_category"],
          minConfidence: 0.7,
        },
      });

      const result = evaluateRule(rule, "Normal content here", undefined);

      expect(result.passed).toBe(true);
    });
  });

  describe("evaluateRule - Additional link validation cases", () => {
    it("should fail for non-allowed domain when allowedDomains is set", () => {
      const rule = createMockRule({
        ruleType: "LINK_VALIDATION",
        conditions: {
          allowedDomains: ["trusted.com"],
        },
      });

      const result = evaluateRule(rule, "Content", {
        links: ["https://untrusted.com/page"],
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain("non-allowed domain");
    });

    it("should fail for invalid URL format", () => {
      const rule = createMockRule({
        ruleType: "LINK_VALIDATION",
        conditions: {
          requireHttps: true,
        },
      });

      const result = evaluateRule(rule, "Content", {
        links: ["not-a-valid-url"],
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain("Invalid URL");
    });

    it("should pass when no links provided", () => {
      const rule = createMockRule({
        ruleType: "LINK_VALIDATION",
        conditions: {
          requireHttps: true,
        },
      });

      const result = evaluateRule(rule, "Content without links", {});

      expect(result.passed).toBe(true);
    });
  });

  describe("evaluateRule - Additional media check cases", () => {
    it("should fail when required media types are missing", () => {
      const rule = createMockRule({
        ruleType: "MEDIA_CHECK",
        conditions: {
          requiredMediaTypes: ["video"],
        },
      });

      const result = evaluateRule(rule, "Post content", {
        mediaUrls: ["img1.jpg"],
        mediaTypes: ["image"],
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain("Missing required media types");
    });

    it("should pass when all required media types are present", () => {
      const rule = createMockRule({
        ruleType: "MEDIA_CHECK",
        conditions: {
          requiredMediaTypes: ["image", "video"],
        },
      });

      const result = evaluateRule(rule, "Post content", {
        mediaUrls: ["img1.jpg", "video.mp4"],
        mediaTypes: ["image", "video"],
      });

      expect(result.passed).toBe(true);
    });
  });

  describe("getApplicableRules", () => {
    beforeEach(() => {
      vi.mocked(prisma.policyRule.findMany).mockReset();
    });

    it("should get rules for workspace and platform", async () => {
      vi.mocked(prisma.policyRule.findMany).mockResolvedValue([
        createMockRule({ id: "rule-1", name: "Test Rule 1" }),
        createMockRule({ id: "rule-2", name: "Test Rule 2" }),
      ]);

      const rules = await getApplicableRules({
        workspaceId: "workspace-1",
        platform: "TWITTER",
        contentType: "POST",
        checkScope: "FULL",
      });

      expect(rules).toHaveLength(2);
      expect(vi.mocked(prisma.policyRule.findMany)).toHaveBeenCalled();
    });

    it("should filter by severity for QUICK scope", async () => {
      vi.mocked(prisma.policyRule.findMany).mockResolvedValue([
        createMockRule({ id: "rule-1", severity: "CRITICAL" }),
      ]);

      await getApplicableRules({
        workspaceId: "workspace-1",
        platform: "TWITTER",
        contentType: "POST",
        checkScope: "QUICK",
      });

      const callArgs = vi.mocked(prisma.policyRule.findMany).mock.calls[0]
        ?.[0] as {
          where?: { severity?: unknown; };
        } | undefined;
      expect(callArgs?.where?.severity).toEqual({ in: ["CRITICAL", "ERROR"] });
    });

    it("should include global and workspace-specific rules", async () => {
      vi.mocked(prisma.policyRule.findMany).mockResolvedValue([]);

      await getApplicableRules({
        workspaceId: "workspace-1",
        platform: undefined,
        contentType: "POST",
        checkScope: "FULL",
      });

      expect(vi.mocked(prisma.policyRule.findMany)).toHaveBeenCalled();
    });
  });

  describe("checkContent", () => {
    beforeEach(() => {
      vi.mocked(prisma.policyRule.findMany).mockReset();
      vi.mocked(prisma.policyCheck.create).mockReset();
      vi.mocked(prisma.policyCheck.update).mockReset();
      vi.mocked(prisma.policyViolation.create).mockReset();
    });

    it("should create check record and return result for passing content", async () => {
      vi.mocked(prisma.policyCheck.create).mockResolvedValue({
        id: "check-1",
        workspaceId: "workspace-1",
        contentType: "POST",
        contentText: "Valid content",
        status: "IN_PROGRESS",
      } as never);

      vi.mocked(prisma.policyRule.findMany).mockResolvedValue([
        createMockRule({
          id: "rule-1",
          ruleType: "CHARACTER_COUNT",
          conditions: { maxLength: 280 },
        }),
      ]);

      vi.mocked(prisma.policyCheck.update).mockResolvedValue({} as never);

      const result = await checkContent("workspace-1", {
        contentType: "POST",
        contentText: "Valid content",
        platform: "TWITTER",
      });

      expect(result.status).toBe("COMPLETED");
      expect(result.overallResult).toBe("PASSED");
      expect(result.canPublish).toBe(true);
      expect(result.passedRules).toBe(1);
      expect(result.failedRules).toBe(0);
    });

    it("should record violations for failing content", async () => {
      vi.mocked(prisma.policyCheck.create).mockResolvedValue({
        id: "check-1",
        workspaceId: "workspace-1",
        contentType: "POST",
        contentText: "A".repeat(300),
        status: "IN_PROGRESS",
      } as never);

      vi.mocked(prisma.policyRule.findMany).mockResolvedValue([
        createMockRule({
          id: "rule-1",
          ruleType: "CHARACTER_COUNT",
          conditions: { maxLength: 280 },
          severity: "CRITICAL",
          isBlocking: true,
        }),
      ]);

      vi.mocked(prisma.policyViolation.create).mockResolvedValue({} as never);
      vi.mocked(prisma.policyCheck.update).mockResolvedValue({} as never);

      const result = await checkContent("workspace-1", {
        contentType: "POST",
        contentText: "A".repeat(300),
        platform: "TWITTER",
      });

      expect(result.status).toBe("COMPLETED");
      expect(result.overallResult).toBe("BLOCKED");
      expect(result.canPublish).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(vi.mocked(prisma.policyViolation.create)).toHaveBeenCalled();
    });

    it("should return PASSED_WITH_WARNINGS for warning violations", async () => {
      vi.mocked(prisma.policyCheck.create).mockResolvedValue({
        id: "check-1",
        workspaceId: "workspace-1",
        contentType: "POST",
        contentText: "Get your free money now!",
        status: "IN_PROGRESS",
      } as never);

      vi.mocked(prisma.policyRule.findMany).mockResolvedValue([
        createMockRule({
          id: "rule-1",
          ruleType: "KEYWORD_MATCH",
          conditions: {
            keywords: ["free money"],
            caseSensitive: false,
          },
          severity: "WARNING",
          isBlocking: false,
        }),
      ]);

      vi.mocked(prisma.policyViolation.create).mockResolvedValue({} as never);
      vi.mocked(prisma.policyCheck.update).mockResolvedValue({} as never);

      const result = await checkContent("workspace-1", {
        contentType: "POST",
        contentText: "Get your free money now!",
      });

      expect(result.overallResult).toBe("PASSED_WITH_WARNINGS");
      expect(result.canPublish).toBe(true);
    });

    it("should return FAILED for error violations", async () => {
      vi.mocked(prisma.policyCheck.create).mockResolvedValue({
        id: "check-1",
        workspaceId: "workspace-1",
        contentType: "POST",
        contentText: "This treats cancer",
        status: "IN_PROGRESS",
      } as never);

      vi.mocked(prisma.policyRule.findMany).mockResolvedValue([
        createMockRule({
          id: "rule-1",
          ruleType: "KEYWORD_MATCH",
          conditions: {
            keywords: ["treats cancer"],
            caseSensitive: false,
          },
          severity: "ERROR",
          isBlocking: false,
        }),
      ]);

      vi.mocked(prisma.policyViolation.create).mockResolvedValue({} as never);
      vi.mocked(prisma.policyCheck.update).mockResolvedValue({} as never);

      const result = await checkContent("workspace-1", {
        contentType: "POST",
        contentText: "This treats cancer",
      });

      expect(result.overallResult).toBe("FAILED");
      expect(result.canPublish).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(prisma.policyCheck.create).mockResolvedValue({
        id: "check-1",
        workspaceId: "workspace-1",
        status: "IN_PROGRESS",
      } as never);

      vi.mocked(prisma.policyRule.findMany).mockRejectedValue(
        new Error("Database error"),
      );
      vi.mocked(prisma.policyCheck.update).mockResolvedValue({} as never);

      await expect(
        checkContent("workspace-1", {
          contentType: "POST",
          contentText: "Content",
        }),
      ).rejects.toThrow("Database error");

      expect(vi.mocked(prisma.policyCheck.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "FAILED",
          }),
        }),
      );
    });

    it("should auto-extract metadata when not provided", async () => {
      vi.mocked(prisma.policyCheck.create).mockResolvedValue({
        id: "check-1",
        workspaceId: "workspace-1",
        status: "IN_PROGRESS",
      } as never);

      vi.mocked(prisma.policyRule.findMany).mockResolvedValue([]);
      vi.mocked(prisma.policyCheck.update).mockResolvedValue({} as never);

      const result = await checkContent("workspace-1", {
        contentType: "POST",
        contentText: "Check out https://example.com and #trending @user",
      });

      expect(result.status).toBe("COMPLETED");
      expect(result.overallResult).toBe("PASSED");
    });
  });
});
