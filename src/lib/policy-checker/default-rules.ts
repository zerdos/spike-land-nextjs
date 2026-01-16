/**
 * Default Policy Rules
 *
 * Platform-specific and global policy rules to be seeded.
 *
 * Resolves #584: Build Policy Checker
 */

import type { PolicyRuleInput } from "./types";

/**
 * Twitter/X specific rules
 */
export const TWITTER_RULES: PolicyRuleInput[] = [
  {
    name: "Twitter Post Character Limit",
    description: "Twitter posts must be 280 characters or less",
    platform: "TWITTER",
    category: "CHARACTER_LIMITS",
    ruleType: "CHARACTER_COUNT",
    conditions: { maxLength: 280 },
    severity: "CRITICAL",
    isBlocking: true,
    sourceUrl: "https://developer.twitter.com/en/docs/counting-characters",
  },
  {
    name: "Twitter Bio Character Limit",
    description: "Twitter bios must be 160 characters or less",
    platform: "TWITTER",
    category: "CHARACTER_LIMITS",
    ruleType: "CHARACTER_COUNT",
    conditions: { maxLength: 160 },
    severity: "CRITICAL",
    isBlocking: true,
  },
  {
    name: "Twitter Hashtag Limit",
    description: "Twitter recommends using no more than 2 hashtags per post",
    platform: "TWITTER",
    category: "HASHTAG_RULES",
    ruleType: "REGEX_PATTERN",
    conditions: {
      pattern: "^(?:[^#]*#[^#]*){3,}$",
      flags: "g",
    },
    severity: "WARNING",
    isBlocking: false,
  },
];

/**
 * Facebook rules
 */
export const FACEBOOK_RULES: PolicyRuleInput[] = [
  {
    name: "Facebook Post Character Limit",
    description: "Facebook posts have a maximum of 63,206 characters",
    platform: "FACEBOOK",
    category: "CHARACTER_LIMITS",
    ruleType: "CHARACTER_COUNT",
    conditions: { maxLength: 63206 },
    severity: "CRITICAL",
    isBlocking: true,
  },
  {
    name: "Facebook Bio Character Limit",
    description: "Facebook bios must be 101 characters or less",
    platform: "FACEBOOK",
    category: "CHARACTER_LIMITS",
    ruleType: "CHARACTER_COUNT",
    conditions: { maxLength: 101 },
    severity: "CRITICAL",
    isBlocking: true,
  },
];

/**
 * Instagram rules
 */
export const INSTAGRAM_RULES: PolicyRuleInput[] = [
  {
    name: "Instagram Caption Character Limit",
    description: "Instagram captions must be 2,200 characters or less",
    platform: "INSTAGRAM",
    category: "CHARACTER_LIMITS",
    ruleType: "CHARACTER_COUNT",
    conditions: { maxLength: 2200 },
    severity: "CRITICAL",
    isBlocking: true,
    sourceUrl: "https://help.instagram.com/",
  },
  {
    name: "Instagram Bio Character Limit",
    description: "Instagram bios must be 150 characters or less",
    platform: "INSTAGRAM",
    category: "CHARACTER_LIMITS",
    ruleType: "CHARACTER_COUNT",
    conditions: { maxLength: 150 },
    severity: "CRITICAL",
    isBlocking: true,
  },
  {
    name: "Instagram Hashtag Limit",
    description: "Instagram allows maximum 30 hashtags per post",
    platform: "INSTAGRAM",
    category: "HASHTAG_RULES",
    ruleType: "REGEX_PATTERN",
    conditions: {
      pattern: "^(?:[^#]*#[^#]*){31,}$",
      flags: "g",
    },
    severity: "ERROR",
    isBlocking: true,
  },
  {
    name: "Instagram Hashtag Recommendation",
    description: "Instagram recommends 3-5 hashtags for best engagement",
    platform: "INSTAGRAM",
    category: "HASHTAG_RULES",
    ruleType: "REGEX_PATTERN",
    conditions: {
      pattern: "^(?:[^#]*#[^#]*){11,}$",
      flags: "g",
    },
    severity: "INFO",
    isBlocking: false,
  },
];

/**
 * LinkedIn rules
 */
export const LINKEDIN_RULES: PolicyRuleInput[] = [
  {
    name: "LinkedIn Post Character Limit",
    description: "LinkedIn posts must be 3,000 characters or less",
    platform: "LINKEDIN",
    category: "CHARACTER_LIMITS",
    ruleType: "CHARACTER_COUNT",
    conditions: { maxLength: 3000 },
    severity: "CRITICAL",
    isBlocking: true,
    sourceUrl: "https://www.linkedin.com/help/linkedin",
  },
  {
    name: "LinkedIn Comment Character Limit",
    description: "LinkedIn comments must be 1,250 characters or less",
    platform: "LINKEDIN",
    category: "CHARACTER_LIMITS",
    ruleType: "CHARACTER_COUNT",
    conditions: { maxLength: 1250 },
    severity: "CRITICAL",
    isBlocking: true,
  },
  {
    name: "LinkedIn Hashtag Recommendation",
    description: "LinkedIn recommends 3-5 hashtags per post",
    platform: "LINKEDIN",
    category: "HASHTAG_RULES",
    ruleType: "REGEX_PATTERN",
    conditions: {
      pattern: "^(?:[^#]*#[^#]*){6,}$",
      flags: "g",
    },
    severity: "WARNING",
    isBlocking: false,
  },
];

/**
 * TikTok rules
 */
export const TIKTOK_RULES: PolicyRuleInput[] = [
  {
    name: "TikTok Caption Character Limit",
    description: "TikTok captions must be 2,200 characters or less",
    platform: "TIKTOK",
    category: "CHARACTER_LIMITS",
    ruleType: "CHARACTER_COUNT",
    conditions: { maxLength: 2200 },
    severity: "CRITICAL",
    isBlocking: true,
  },
  {
    name: "TikTok Bio Character Limit",
    description: "TikTok bios must be 80 characters or less",
    platform: "TIKTOK",
    category: "CHARACTER_LIMITS",
    ruleType: "CHARACTER_COUNT",
    conditions: { maxLength: 80 },
    severity: "CRITICAL",
    isBlocking: true,
  },
];

/**
 * Global content guidelines (apply to all platforms)
 */
export const GLOBAL_CONTENT_RULES: PolicyRuleInput[] = [
  // Health Claims
  {
    name: "Unsubstantiated Health Claims",
    description:
      "Content should not make unsubstantiated health claims like 'cures', 'treats', or 'prevents' diseases",
    platform: null,
    category: "CLAIMS_RESTRICTIONS",
    ruleType: "REGEX_PATTERN",
    conditions: {
      pattern: "\\b(cures?|treats?|prevents?|heals?)\\s+(cancer|diabetes|covid|disease|illness)\\b",
      flags: "gi",
    },
    severity: "ERROR",
    isBlocking: false,
  },
  {
    name: "FDA Approval Claims",
    description: "Content should not falsely claim FDA approval",
    platform: null,
    category: "CLAIMS_RESTRICTIONS",
    ruleType: "REGEX_PATTERN",
    conditions: {
      pattern: "\\bFDA\\s+approved\\b",
      flags: "gi",
    },
    severity: "WARNING",
    isBlocking: false,
  },

  // Financial Claims
  {
    name: "Guaranteed Financial Returns",
    description: "Content should not promise guaranteed financial returns",
    platform: null,
    category: "CLAIMS_RESTRICTIONS",
    ruleType: "REGEX_PATTERN",
    conditions: {
      pattern: "\\b(guaranteed|certain)\\s+(returns?|profit|income|earnings)\\b",
      flags: "gi",
    },
    severity: "ERROR",
    isBlocking: false,
  },
  {
    name: "Get Rich Quick Schemes",
    description: "Content should avoid get-rich-quick language",
    platform: null,
    category: "CLAIMS_RESTRICTIONS",
    ruleType: "REGEX_PATTERN",
    conditions: {
      pattern: "\\b(get rich|make money)\\s+(quick|fast|easy|overnight)\\b",
      flags: "gi",
    },
    severity: "WARNING",
    isBlocking: false,
  },

  // Spam Indicators
  {
    name: "Spam Language Detection",
    description: "Content should avoid spammy language patterns",
    platform: null,
    category: "CONTENT_GUIDELINES",
    ruleType: "KEYWORD_MATCH",
    conditions: {
      keywords: [
        "click here now",
        "limited time offer",
        "act now",
        "congratulations you won",
        "you have been selected",
      ],
      caseSensitive: false,
    },
    severity: "WARNING",
    isBlocking: false,
  },

  // Brand Safety
  {
    name: "Profanity Filter",
    description: "Content should not contain profanity",
    platform: null,
    category: "BRAND_SAFETY",
    ruleType: "KEYWORD_MATCH",
    conditions: {
      keywords: [
        // Common profanity - this would be expanded in production
        "damn",
        "hell",
      ],
      caseSensitive: false,
    },
    severity: "WARNING",
    isBlocking: false,
  },

  // Link Policies
  {
    name: "HTTPS Links Required",
    description: "All links should use HTTPS for security",
    platform: null,
    category: "LINK_POLICIES",
    ruleType: "LINK_VALIDATION",
    conditions: {
      requireHttps: true,
    },
    severity: "WARNING",
    isBlocking: false,
  },
];

/**
 * Ad-specific rules
 */
export const AD_COMPLIANCE_RULES: PolicyRuleInput[] = [
  {
    name: "Ad Disclosure Required",
    description: "Paid promotions should include proper disclosure",
    platform: null,
    category: "AD_COMPLIANCE",
    ruleType: "KEYWORD_MATCH",
    conditions: {
      keywords: ["#ad", "#sponsored", "#partner", "#paid"],
      caseSensitive: false,
    },
    severity: "INFO",
    isBlocking: false,
  },
  {
    name: "Misleading Ad Language",
    description: "Ads should not contain misleading urgency language",
    platform: null,
    category: "AD_COMPLIANCE",
    ruleType: "KEYWORD_MATCH",
    conditions: {
      keywords: [
        "limited time only",
        "offer expires soon",
        "last chance",
        "final sale",
      ],
      caseSensitive: false,
    },
    severity: "INFO",
    isBlocking: false,
  },
];

/**
 * All default rules combined
 */
export const ALL_DEFAULT_RULES: PolicyRuleInput[] = [
  ...TWITTER_RULES,
  ...FACEBOOK_RULES,
  ...INSTAGRAM_RULES,
  ...LINKEDIN_RULES,
  ...TIKTOK_RULES,
  ...GLOBAL_CONTENT_RULES,
  ...AD_COMPLIANCE_RULES,
];

/**
 * Seed default rules into the database
 */
export async function seedDefaultRules(): Promise<number> {
  const { bulkCreateRules } = await import("./rule-manager");
  return bulkCreateRules(ALL_DEFAULT_RULES);
}
