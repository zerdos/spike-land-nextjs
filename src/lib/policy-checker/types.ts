/**
 * Policy Checker Types
 *
 * Type definitions for the content policy validation system.
 *
 * Resolves #584: Build Policy Checker
 */

import type {
  PolicyCategory,
  PolicyCheckResult,
  PolicyCheckScope,
  PolicyCheckStatus,
  PolicyContentType,
  PolicyRuleType,
  PolicySeverity,
  SocialPlatform,
} from "@prisma/client";

/**
 * Configuration for a policy rule
 */
export interface PolicyRuleConditions {
  // For KEYWORD_MATCH rules
  keywords?: string[];
  caseSensitive?: boolean;

  // For REGEX_PATTERN rules
  pattern?: string;
  flags?: string;

  // For CHARACTER_COUNT rules
  minLength?: number;
  maxLength?: number;

  // For MEDIA_CHECK rules
  requiredMediaTypes?: string[];
  maxMediaCount?: number;
  minMediaCount?: number;

  // For LINK_VALIDATION rules
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireHttps?: boolean;

  // For NLP_CLASSIFICATION rules
  categories?: string[];
  minConfidence?: number;

  // Generic conditions
  applyTo?: PolicyContentType[];
}

/**
 * Input for creating/updating a policy rule
 */
export interface PolicyRuleInput {
  name: string;
  description: string;
  platform?: SocialPlatform | null;
  category: PolicyCategory;
  ruleType: PolicyRuleType;
  conditions: PolicyRuleConditions;
  severity?: PolicySeverity;
  isBlocking?: boolean;
  isActive?: boolean;
  sourceUrl?: string | null;
}

/**
 * Content to be checked against policies
 */
export interface PolicyCheckInput {
  contentType: PolicyContentType;
  contentId?: string;
  contentText: string;
  contentMetadata?: ContentMetadata;
  platform?: SocialPlatform;
  checkScope?: PolicyCheckScope;
}

/**
 * Metadata about the content being checked
 */
export interface ContentMetadata {
  mediaUrls?: string[];
  mediaTypes?: string[];
  links?: string[];
  hashtags?: string[];
  mentions?: string[];
  language?: string;
}

/**
 * Result from evaluating a single rule
 */
export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: PolicySeverity;
  message?: string;
  matchedContent?: string;
  matchLocation?: MatchLocation;
  confidence?: number;
  suggestedFix?: string;
}

/**
 * Location of a match in content
 */
export interface MatchLocation {
  startIndex?: number;
  endIndex?: number;
  line?: number;
  context?: string;
}

/**
 * Complete result of a policy check
 */
export interface PolicyCheckOutput {
  checkId: string;
  status: PolicyCheckStatus;
  overallResult: PolicyCheckResult | null;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  violations: ViolationSummary[];
  summary: string;
  durationMs: number;
  canPublish: boolean;
}

/**
 * Summary of a single violation
 */
export interface ViolationSummary {
  ruleId: string;
  ruleName: string;
  ruleCategory: PolicyCategory;
  severity: PolicySeverity;
  message: string;
  matchedContent?: string;
  suggestedFix?: string;
  confidence?: number;
  isBlocking: boolean;
}

/**
 * Platform-specific character limits
 */
export interface PlatformCharacterLimits {
  platform: SocialPlatform;
  postLimit: number;
  bioLimit?: number;
  commentLimit?: number;
  hashtagLimit?: number;
  mentionLimit?: number;
}

/**
 * Default character limits by platform
 */
export const PLATFORM_CHARACTER_LIMITS: PlatformCharacterLimits[] = [
  {
    platform: "TWITTER",
    postLimit: 280,
    bioLimit: 160,
    commentLimit: 280,
    hashtagLimit: 10,
  },
  {
    platform: "FACEBOOK",
    postLimit: 63206,
    bioLimit: 101,
    commentLimit: 8000,
  },
  {
    platform: "INSTAGRAM",
    postLimit: 2200,
    bioLimit: 150,
    commentLimit: 2200,
    hashtagLimit: 30,
  },
  {
    platform: "LINKEDIN",
    postLimit: 3000,
    bioLimit: 2600,
    commentLimit: 1250,
    hashtagLimit: 5,
  },
  {
    platform: "TIKTOK",
    postLimit: 2200,
    bioLimit: 80,
    commentLimit: 150,
  },
  {
    platform: "YOUTUBE",
    postLimit: 5000,
    bioLimit: 1000,
    commentLimit: 10000,
  },
  {
    platform: "DISCORD",
    postLimit: 2000,
    bioLimit: 190,
    commentLimit: 2000,
  },
];

/**
 * Common prohibited content patterns
 */
export const PROHIBITED_CONTENT_PATTERNS = {
  // Health claims that require medical substantiation
  healthClaims: [
    /\b(cures?|treats?|prevents?|heals?)\s+(cancer|diabetes|covid|disease)/gi,
    /\b(guaranteed|proven)\s+(weight loss|results)/gi,
    /\b(doctor|FDA)\s+approved\b/gi,
  ],

  // Financial claims
  financialClaims: [
    /\b(guaranteed|certain)\s+(returns?|profit|income)/gi,
    /\b(get rich|make money)\s+(quick|fast|easy)/gi,
    /\b(investment|trading)\s+advice\b/gi,
  ],

  // Prohibited advertising terms
  prohibitedAdTerms: [
    /\b(free)\s+(money|gift card|iphone)/gi,
    /\b(limited time|act now|hurry)\b/gi,
    /\b(click here|buy now)\b/gi,
  ],
};

/**
 * Rule execution context
 */
export interface RuleContext {
  workspaceId: string;
  platform?: SocialPlatform;
  contentType: PolicyContentType;
  checkScope: PolicyCheckScope;
}
