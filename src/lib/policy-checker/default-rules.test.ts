/**
 * Default Rules Tests
 *
 * Tests for the default policy rules definitions.
 */

import { describe, expect, it, vi } from "vitest";

import {
  AD_COMPLIANCE_RULES,
  ALL_DEFAULT_RULES,
  FACEBOOK_RULES,
  GLOBAL_CONTENT_RULES,
  INSTAGRAM_RULES,
  LINKEDIN_RULES,
  seedDefaultRules,
  TIKTOK_RULES,
  TWITTER_RULES,
} from "./default-rules";

// Mock the rule-manager module
vi.mock("./rule-manager", () => ({
  bulkCreateRules: vi.fn().mockResolvedValue(25),
}));

describe("Default Rules", () => {
  describe("TWITTER_RULES", () => {
    it("should have correct structure for all rules", () => {
      expect(TWITTER_RULES.length).toBeGreaterThan(0);
      TWITTER_RULES.forEach((rule) => {
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.platform).toBe("TWITTER");
        expect(rule.category).toBeDefined();
        expect(rule.ruleType).toBeDefined();
        expect(rule.conditions).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(typeof rule.isBlocking).toBe("boolean");
      });
    });

    it("should include post character limit rule", () => {
      const postLimitRule = TWITTER_RULES.find((r) => r.name === "Twitter Post Character Limit");
      expect(postLimitRule).toBeDefined();
      expect(postLimitRule?.conditions).toEqual({ maxLength: 280 });
      expect(postLimitRule?.isBlocking).toBe(true);
    });

    it("should include bio character limit rule", () => {
      const bioLimitRule = TWITTER_RULES.find((r) => r.name === "Twitter Bio Character Limit");
      expect(bioLimitRule).toBeDefined();
      expect(bioLimitRule?.conditions).toEqual({ maxLength: 160 });
    });

    it("should include hashtag recommendation rule", () => {
      const hashtagRule = TWITTER_RULES.find((r) => r.name === "Twitter Hashtag Limit");
      expect(hashtagRule).toBeDefined();
      expect(hashtagRule?.severity).toBe("WARNING");
      expect(hashtagRule?.isBlocking).toBe(false);
    });
  });

  describe("FACEBOOK_RULES", () => {
    it("should have correct structure for all rules", () => {
      expect(FACEBOOK_RULES.length).toBeGreaterThan(0);
      FACEBOOK_RULES.forEach((rule) => {
        expect(rule.platform).toBe("FACEBOOK");
        expect(rule.category).toBe("CHARACTER_LIMITS");
      });
    });

    it("should include post character limit rule", () => {
      const postLimitRule = FACEBOOK_RULES.find((r) => r.name === "Facebook Post Character Limit");
      expect(postLimitRule).toBeDefined();
      expect(postLimitRule?.conditions).toEqual({ maxLength: 63206 });
    });

    it("should include bio character limit rule", () => {
      const bioLimitRule = FACEBOOK_RULES.find((r) => r.name === "Facebook Bio Character Limit");
      expect(bioLimitRule).toBeDefined();
      expect(bioLimitRule?.conditions).toEqual({ maxLength: 101 });
    });
  });

  describe("INSTAGRAM_RULES", () => {
    it("should have correct structure for all rules", () => {
      expect(INSTAGRAM_RULES.length).toBeGreaterThan(0);
      INSTAGRAM_RULES.forEach((rule) => {
        expect(rule.platform).toBe("INSTAGRAM");
      });
    });

    it("should include caption character limit rule", () => {
      const captionRule = INSTAGRAM_RULES.find(
        (r) => r.name === "Instagram Caption Character Limit",
      );
      expect(captionRule).toBeDefined();
      expect(captionRule?.conditions).toEqual({ maxLength: 2200 });
    });

    it("should include bio character limit rule", () => {
      const bioRule = INSTAGRAM_RULES.find((r) => r.name === "Instagram Bio Character Limit");
      expect(bioRule).toBeDefined();
      expect(bioRule?.conditions).toEqual({ maxLength: 150 });
    });

    it("should include hashtag limit rule", () => {
      const hashtagRule = INSTAGRAM_RULES.find((r) => r.name === "Instagram Hashtag Limit");
      expect(hashtagRule).toBeDefined();
      expect(hashtagRule?.severity).toBe("ERROR");
      expect(hashtagRule?.isBlocking).toBe(true);
    });

    it("should include hashtag recommendation rule", () => {
      const recommendationRule = INSTAGRAM_RULES.find(
        (r) => r.name === "Instagram Hashtag Recommendation",
      );
      expect(recommendationRule).toBeDefined();
      expect(recommendationRule?.severity).toBe("INFO");
    });
  });

  describe("LINKEDIN_RULES", () => {
    it("should have correct structure for all rules", () => {
      expect(LINKEDIN_RULES.length).toBeGreaterThan(0);
      LINKEDIN_RULES.forEach((rule) => {
        expect(rule.platform).toBe("LINKEDIN");
      });
    });

    it("should include post character limit rule", () => {
      const postRule = LINKEDIN_RULES.find((r) => r.name === "LinkedIn Post Character Limit");
      expect(postRule).toBeDefined();
      expect(postRule?.conditions).toEqual({ maxLength: 3000 });
    });

    it("should include comment character limit rule", () => {
      const commentRule = LINKEDIN_RULES.find((r) => r.name === "LinkedIn Comment Character Limit");
      expect(commentRule).toBeDefined();
      expect(commentRule?.conditions).toEqual({ maxLength: 1250 });
    });
  });

  describe("TIKTOK_RULES", () => {
    it("should have correct structure for all rules", () => {
      expect(TIKTOK_RULES.length).toBeGreaterThan(0);
      TIKTOK_RULES.forEach((rule) => {
        expect(rule.platform).toBe("TIKTOK");
        expect(rule.category).toBe("CHARACTER_LIMITS");
      });
    });

    it("should include caption character limit rule", () => {
      const captionRule = TIKTOK_RULES.find((r) => r.name === "TikTok Caption Character Limit");
      expect(captionRule).toBeDefined();
      expect(captionRule?.conditions).toEqual({ maxLength: 2200 });
    });

    it("should include bio character limit rule", () => {
      const bioRule = TIKTOK_RULES.find((r) => r.name === "TikTok Bio Character Limit");
      expect(bioRule).toBeDefined();
      expect(bioRule?.conditions).toEqual({ maxLength: 80 });
    });
  });

  describe("GLOBAL_CONTENT_RULES", () => {
    it("should have null platform for all rules", () => {
      expect(GLOBAL_CONTENT_RULES.length).toBeGreaterThan(0);
      GLOBAL_CONTENT_RULES.forEach((rule) => {
        expect(rule.platform).toBeNull();
      });
    });

    it("should include health claims detection", () => {
      const healthRule = GLOBAL_CONTENT_RULES.find(
        (r) => r.name === "Unsubstantiated Health Claims",
      );
      expect(healthRule).toBeDefined();
      expect(healthRule?.category).toBe("CLAIMS_RESTRICTIONS");
      expect(healthRule?.ruleType).toBe("REGEX_PATTERN");
    });

    it("should include FDA approval claims detection", () => {
      const fdaRule = GLOBAL_CONTENT_RULES.find((r) => r.name === "FDA Approval Claims");
      expect(fdaRule).toBeDefined();
      expect(fdaRule?.severity).toBe("WARNING");
    });

    it("should include guaranteed financial returns detection", () => {
      const financialRule = GLOBAL_CONTENT_RULES.find(
        (r) => r.name === "Guaranteed Financial Returns",
      );
      expect(financialRule).toBeDefined();
      expect(financialRule?.category).toBe("CLAIMS_RESTRICTIONS");
    });

    it("should include get rich quick detection", () => {
      const richQuickRule = GLOBAL_CONTENT_RULES.find((r) => r.name === "Get Rich Quick Schemes");
      expect(richQuickRule).toBeDefined();
    });

    it("should include spam language detection", () => {
      const spamRule = GLOBAL_CONTENT_RULES.find((r) => r.name === "Spam Language Detection");
      expect(spamRule).toBeDefined();
      expect(spamRule?.ruleType).toBe("KEYWORD_MATCH");
      expect((spamRule?.conditions as { keywords: string[]; }).keywords)
        .toContain(
          "click here now",
        );
    });

    it("should include profanity filter", () => {
      const profanityRule = GLOBAL_CONTENT_RULES.find((r) => r.name === "Profanity Filter");
      expect(profanityRule).toBeDefined();
      expect(profanityRule?.category).toBe("BRAND_SAFETY");
    });

    it("should include HTTPS link requirement", () => {
      const httpsRule = GLOBAL_CONTENT_RULES.find((r) => r.name === "HTTPS Links Required");
      expect(httpsRule).toBeDefined();
      expect(httpsRule?.ruleType).toBe("LINK_VALIDATION");
      expect((httpsRule?.conditions as { requireHttps: boolean; }).requireHttps)
        .toBe(true);
    });
  });

  describe("AD_COMPLIANCE_RULES", () => {
    it("should have null platform for all rules", () => {
      expect(AD_COMPLIANCE_RULES.length).toBeGreaterThan(0);
      AD_COMPLIANCE_RULES.forEach((rule) => {
        expect(rule.platform).toBeNull();
        expect(rule.category).toBe("AD_COMPLIANCE");
      });
    });

    it("should include ad disclosure rule", () => {
      const disclosureRule = AD_COMPLIANCE_RULES.find((r) => r.name === "Ad Disclosure Required");
      expect(disclosureRule).toBeDefined();
      expect((disclosureRule?.conditions as { keywords: string[]; }).keywords)
        .toContain("#ad");
      expect((disclosureRule?.conditions as { keywords: string[]; }).keywords)
        .toContain(
          "#sponsored",
        );
    });

    it("should include misleading ad language rule", () => {
      const misleadingRule = AD_COMPLIANCE_RULES.find((r) => r.name === "Misleading Ad Language");
      expect(misleadingRule).toBeDefined();
      expect(misleadingRule?.severity).toBe("INFO");
    });
  });

  describe("ALL_DEFAULT_RULES", () => {
    it("should combine all rule arrays", () => {
      const expectedLength = TWITTER_RULES.length +
        FACEBOOK_RULES.length +
        INSTAGRAM_RULES.length +
        LINKEDIN_RULES.length +
        TIKTOK_RULES.length +
        GLOBAL_CONTENT_RULES.length +
        AD_COMPLIANCE_RULES.length;

      expect(ALL_DEFAULT_RULES.length).toBe(expectedLength);
    });

    it("should include rules from all platforms", () => {
      const platforms = new Set(ALL_DEFAULT_RULES.map((r) => r.platform));
      expect(platforms.has("TWITTER")).toBe(true);
      expect(platforms.has("FACEBOOK")).toBe(true);
      expect(platforms.has("INSTAGRAM")).toBe(true);
      expect(platforms.has("LINKEDIN")).toBe(true);
      expect(platforms.has("TIKTOK")).toBe(true);
      expect(platforms.has(null)).toBe(true); // Global rules
    });

    it("should have unique rule names", () => {
      const names = ALL_DEFAULT_RULES.map((r) => r.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe("seedDefaultRules", () => {
    it("should call bulkCreateRules with all default rules", async () => {
      const result = await seedDefaultRules();
      expect(result).toBe(25);

      const { bulkCreateRules } = await import("./rule-manager");
      expect(bulkCreateRules).toHaveBeenCalledWith(ALL_DEFAULT_RULES);
    });
  });
});
