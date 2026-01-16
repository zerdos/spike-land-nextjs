/**
 * Policy Engine
 *
 * Core engine for evaluating content against policy rules.
 * Supports keyword matching, regex patterns, character limits, and NLP classification.
 *
 * Resolves #584: Build Policy Checker
 */

import type { PolicyRule, Prisma, SocialPlatform } from "@prisma/client";

import prisma from "@/lib/prisma";

import type {
  ContentMetadata,
  PolicyCheckInput,
  PolicyCheckOutput,
  PolicyRuleConditions,
  RuleContext,
  RuleEvaluationResult,
  ViolationSummary,
} from "./types";
import { PLATFORM_CHARACTER_LIMITS } from "./types";

/**
 * Evaluate a single rule against content
 */
export function evaluateRule(
  rule: PolicyRule,
  content: string,
  metadata: ContentMetadata | undefined,
): RuleEvaluationResult {
  const conditions = rule.conditions as PolicyRuleConditions;

  switch (rule.ruleType) {
    case "KEYWORD_MATCH":
      return evaluateKeywordMatch(rule, content, conditions);
    case "REGEX_PATTERN":
      return evaluateRegexPattern(rule, content, conditions);
    case "CHARACTER_COUNT":
      return evaluateCharacterCount(rule, content, conditions);
    case "MEDIA_CHECK":
      return evaluateMediaCheck(rule, metadata, conditions);
    case "LINK_VALIDATION":
      return evaluateLinkValidation(rule, metadata, conditions);
    case "NLP_CLASSIFICATION":
      return evaluateNlpClassification(rule, content, conditions);
    case "CUSTOM_LOGIC":
      return evaluateCustomLogic(rule, content, metadata, conditions);
    default:
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: true,
        severity: rule.severity,
        message: `Unknown rule type: ${rule.ruleType}`,
      };
  }
}

/**
 * Evaluate keyword match rules
 */
function evaluateKeywordMatch(
  rule: PolicyRule,
  content: string,
  conditions: PolicyRuleConditions,
): RuleEvaluationResult {
  const keywords = conditions.keywords || [];
  const caseSensitive = conditions.caseSensitive ?? false;
  const searchContent = caseSensitive ? content : content.toLowerCase();

  for (const keyword of keywords) {
    const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
    const index = searchContent.indexOf(searchKeyword);

    if (index !== -1) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        severity: rule.severity,
        message: `Content contains prohibited keyword: "${keyword}"`,
        matchedContent: content.slice(
          Math.max(0, index - 20),
          Math.min(content.length, index + keyword.length + 20),
        ),
        matchLocation: {
          startIndex: index,
          endIndex: index + keyword.length,
          context: content.slice(
            Math.max(0, index - 50),
            Math.min(content.length, index + keyword.length + 50),
          ),
        },
        suggestedFix: `Remove or replace "${keyword}"`,
      };
    }
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    passed: true,
    severity: rule.severity,
  };
}

/**
 * Evaluate regex pattern rules
 */
function evaluateRegexPattern(
  rule: PolicyRule,
  content: string,
  conditions: PolicyRuleConditions,
): RuleEvaluationResult {
  if (!conditions.pattern) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: true,
      severity: rule.severity,
      message: "No pattern defined",
    };
  }

  try {
    const regex = new RegExp(conditions.pattern, conditions.flags || "gi");
    const match = regex.exec(content);

    if (match) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        severity: rule.severity,
        message: rule.description,
        matchedContent: match[0],
        matchLocation: {
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          context: content.slice(
            Math.max(0, match.index - 30),
            Math.min(content.length, match.index + match[0].length + 30),
          ),
        },
        suggestedFix: `Review and modify the flagged content: "${match[0]}"`,
      };
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: true,
      severity: rule.severity,
    };
  } catch {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: true,
      severity: rule.severity,
      message: `Invalid regex pattern: ${conditions.pattern}`,
    };
  }
}

/**
 * Evaluate character count rules
 */
function evaluateCharacterCount(
  rule: PolicyRule,
  content: string,
  conditions: PolicyRuleConditions,
): RuleEvaluationResult {
  const length = content.length;
  const minLength = conditions.minLength ?? 0;
  const maxLength = conditions.maxLength ?? Infinity;

  if (length < minLength) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: false,
      severity: rule.severity,
      message: `Content is too short. Minimum: ${minLength} characters, Current: ${length}`,
      suggestedFix: `Add at least ${minLength - length} more characters`,
    };
  }

  if (length > maxLength) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: false,
      severity: rule.severity,
      message:
        `Content exceeds character limit. Maximum: ${maxLength} characters, Current: ${length}`,
      matchedContent: content.slice(
        maxLength,
        Math.min(content.length, maxLength + 50),
      ),
      matchLocation: {
        startIndex: maxLength,
        endIndex: content.length,
      },
      suggestedFix: `Reduce content by ${length - maxLength} characters`,
    };
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    passed: true,
    severity: rule.severity,
  };
}

/**
 * Evaluate media check rules
 */
function evaluateMediaCheck(
  rule: PolicyRule,
  metadata: ContentMetadata | undefined,
  conditions: PolicyRuleConditions,
): RuleEvaluationResult {
  const mediaTypes = metadata?.mediaTypes || [];
  const mediaCount = metadata?.mediaUrls?.length || 0;

  // Check minimum media count
  if (
    conditions.minMediaCount !== undefined &&
    mediaCount < conditions.minMediaCount
  ) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: false,
      severity: rule.severity,
      message: `Not enough media. Required: ${conditions.minMediaCount}, Provided: ${mediaCount}`,
      suggestedFix: `Add at least ${conditions.minMediaCount - mediaCount} more media items`,
    };
  }

  // Check maximum media count
  if (
    conditions.maxMediaCount !== undefined &&
    mediaCount > conditions.maxMediaCount
  ) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed: false,
      severity: rule.severity,
      message:
        `Too many media items. Maximum: ${conditions.maxMediaCount}, Provided: ${mediaCount}`,
      suggestedFix: `Remove ${mediaCount - conditions.maxMediaCount} media items`,
    };
  }

  // Check required media types
  if (
    conditions.requiredMediaTypes && conditions.requiredMediaTypes.length > 0
  ) {
    const missingTypes = conditions.requiredMediaTypes.filter((type) => !mediaTypes.includes(type));

    if (missingTypes.length > 0) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        severity: rule.severity,
        message: `Missing required media types: ${missingTypes.join(", ")}`,
        suggestedFix: `Add media of type: ${missingTypes.join(", ")}`,
      };
    }
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    passed: true,
    severity: rule.severity,
  };
}

/**
 * Evaluate link validation rules
 */
function evaluateLinkValidation(
  rule: PolicyRule,
  metadata: ContentMetadata | undefined,
  conditions: PolicyRuleConditions,
): RuleEvaluationResult {
  const links = metadata?.links || [];

  for (const link of links) {
    try {
      const url = new URL(link);
      const domain = url.hostname.toLowerCase();

      // Check HTTPS requirement
      if (conditions.requireHttps && url.protocol !== "https:") {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          passed: false,
          severity: rule.severity,
          message: `Non-HTTPS link detected: ${link}`,
          matchedContent: link,
          suggestedFix: "Use HTTPS instead of HTTP",
        };
      }

      // Check blocked domains
      if (conditions.blockedDomains) {
        const isBlocked = conditions.blockedDomains.some(
          (blocked) => domain === blocked || domain.endsWith(`.${blocked}`),
        );

        if (isBlocked) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            passed: false,
            severity: rule.severity,
            message: `Link to blocked domain detected: ${domain}`,
            matchedContent: link,
            suggestedFix: "Remove the link or use an allowed domain",
          };
        }
      }

      // Check allowed domains
      if (conditions.allowedDomains && conditions.allowedDomains.length > 0) {
        const isAllowed = conditions.allowedDomains.some(
          (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
        );

        if (!isAllowed) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            passed: false,
            severity: rule.severity,
            message: `Link to non-allowed domain: ${domain}`,
            matchedContent: link,
            suggestedFix: `Use links from allowed domains: ${conditions.allowedDomains.join(", ")}`,
          };
        }
      }
    } catch {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        severity: rule.severity,
        message: `Invalid URL format: ${link}`,
        matchedContent: link,
        suggestedFix: "Fix the URL format",
      };
    }
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    passed: true,
    severity: rule.severity,
  };
}

/**
 * Evaluate NLP classification rules
 * This is a simplified implementation - in production, this would use an actual NLP service
 */
function evaluateNlpClassification(
  rule: PolicyRule,
  content: string,
  conditions: PolicyRuleConditions,
): RuleEvaluationResult {
  // Simple heuristic-based classification for common categories
  const categories = conditions.categories || [];
  const minConfidence = conditions.minConfidence ?? 0.7;

  for (const category of categories) {
    const result = classifyContent(content, category);

    if (result.confidence >= minConfidence) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        severity: rule.severity,
        message: `Content classified as "${category}" with ${
          (result.confidence * 100).toFixed(0)
        }% confidence`,
        matchedContent: result.matchedText,
        confidence: result.confidence,
        suggestedFix: `Review and modify content to remove ${category} elements`,
      };
    }
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    passed: true,
    severity: rule.severity,
  };
}

/**
 * Simple content classification helper
 */
function classifyContent(
  content: string,
  category: string,
): { confidence: number; matchedText?: string; } {
  const lowerContent = content.toLowerCase();

  // Health claims detection
  if (category === "health_claims") {
    const healthPatterns = [
      /\b(cures?|treats?|prevents?|heals?)\s+\w+/gi,
      /\b(guaranteed|proven)\s+(weight loss|results)/gi,
      /\bFDA\s+approved\b/gi,
    ];

    for (const pattern of healthPatterns) {
      const match = pattern.exec(content);
      if (match) {
        return { confidence: 0.85, matchedText: match[0] };
      }
    }
  }

  // Financial claims detection
  if (category === "financial_claims") {
    const financialPatterns = [
      /\b(guaranteed|certain)\s+(returns?|profit|income)/gi,
      /\b(get rich|make money)\s+(quick|fast|easy)/gi,
    ];

    for (const pattern of financialPatterns) {
      const match = pattern.exec(content);
      if (match) {
        return { confidence: 0.8, matchedText: match[0] };
      }
    }
  }

  // Spam detection
  if (category === "spam") {
    const spamIndicators = [
      "click here",
      "limited time",
      "act now",
      "free money",
      "congratulations you won",
    ];

    let matches = 0;
    for (const indicator of spamIndicators) {
      if (lowerContent.includes(indicator)) {
        matches++;
      }
    }

    if (matches > 0) {
      return { confidence: Math.min(0.3 + matches * 0.2, 0.95) };
    }
  }

  return { confidence: 0 };
}

/**
 * Evaluate custom logic rules
 */
function evaluateCustomLogic(
  rule: PolicyRule,
  _content: string,
  _metadata: ContentMetadata | undefined,
  _conditions: PolicyRuleConditions,
): RuleEvaluationResult {
  // Custom logic can be extended based on specific rule requirements
  // This is a placeholder for workspace-specific custom validations
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    passed: true,
    severity: rule.severity,
    message: "Custom logic rule - no specific implementation",
  };
}

/**
 * Get applicable rules for a given context
 */
export async function getApplicableRules(
  context: RuleContext,
): Promise<PolicyRule[]> {
  const { workspaceId, platform, checkScope } = context;
  // Note: contentType could be used for filtering rules that apply to specific content types

  // Build where clause with proper typing
  const whereConditions: Prisma.PolicyRuleWhereInput = {
    isActive: true,
    OR: [
      { workspaceId: null }, // System/global rules
      { workspaceId }, // Workspace-specific rules
    ],
  };

  // Filter by platform - use OR to match both platform-specific and global (null) rules
  if (platform) {
    whereConditions.OR = [
      { workspaceId: null, platform: null },
      { workspaceId: null, platform },
      { workspaceId, platform: null },
      { workspaceId, platform },
    ];
  }

  // For quick scope, only get critical rules
  if (checkScope === "QUICK") {
    whereConditions.severity = { in: ["CRITICAL", "ERROR"] };
  }

  return prisma.policyRule.findMany({
    where: whereConditions,
    orderBy: [{ severity: "desc" }, { category: "asc" }],
  });
}

/**
 * Get character limit for a platform
 */
export function getCharacterLimit(
  platform: SocialPlatform,
  contentType: "post" | "bio" | "comment",
): number {
  const platformLimits = PLATFORM_CHARACTER_LIMITS.find((p) => p.platform === platform);

  if (!platformLimits) {
    return Infinity;
  }

  switch (contentType) {
    case "post":
      return platformLimits.postLimit;
    case "bio":
      return platformLimits.bioLimit ?? Infinity;
    case "comment":
      return platformLimits.commentLimit ?? Infinity;
    default:
      return platformLimits.postLimit;
  }
}

/**
 * Extract metadata from content
 */
export function extractContentMetadata(content: string): ContentMetadata {
  // Extract links
  const linkRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const links = content.match(linkRegex) || [];

  // Extract hashtags
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const hashtags = content.match(hashtagRegex) || [];

  // Extract mentions
  const mentionRegex = /@[a-zA-Z0-9_]+/g;
  const mentions = content.match(mentionRegex) || [];

  return {
    links,
    hashtags,
    mentions,
  };
}

/**
 * Determine overall result from violations
 */
function determineOverallResult(
  violations: ViolationSummary[],
): "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED" | "BLOCKED" {
  const hasBlocking = violations.some((v) => v.isBlocking);
  const hasCritical = violations.some((v) => v.severity === "CRITICAL");
  const hasError = violations.some((v) => v.severity === "ERROR");
  const hasWarning = violations.some((v) => v.severity === "WARNING");

  if (hasBlocking || hasCritical) {
    return "BLOCKED";
  }

  if (hasError) {
    return "FAILED";
  }

  if (hasWarning) {
    return "PASSED_WITH_WARNINGS";
  }

  return "PASSED";
}

/**
 * Main policy check function
 */
export async function checkContent(
  workspaceId: string,
  input: PolicyCheckInput,
  userId?: string,
): Promise<PolicyCheckOutput> {
  const startTime = Date.now();

  // Create the check record
  const check = await prisma.policyCheck.create({
    data: {
      workspaceId,
      contentType: input.contentType,
      contentId: input.contentId,
      contentText: input.contentText,
      contentMetadata: input.contentMetadata as object,
      platform: input.platform,
      checkScope: input.checkScope ?? "FULL",
      status: "IN_PROGRESS",
      checkedById: userId,
    },
  });

  try {
    // Get applicable rules
    const rules = await getApplicableRules({
      workspaceId,
      platform: input.platform,
      contentType: input.contentType,
      checkScope: input.checkScope ?? "FULL",
    });

    // Auto-extract metadata if not provided
    const metadata = input.contentMetadata ??
      extractContentMetadata(input.contentText);

    // Evaluate each rule
    const results: RuleEvaluationResult[] = [];
    for (const rule of rules) {
      const result = evaluateRule(rule, input.contentText, metadata);
      results.push(result);
    }

    // Separate passed and failed rules
    const passedResults = results.filter((r) => r.passed);
    const failedResults = results.filter((r) => !r.passed);

    // Create violations for failed rules
    const violations: ViolationSummary[] = [];

    for (const result of failedResults) {
      const rule = rules.find((r) => r.id === result.ruleId)!;

      // Create violation record
      await prisma.policyViolation.create({
        data: {
          checkId: check.id,
          ruleId: result.ruleId,
          workspaceId,
          severity: result.severity,
          message: result.message || rule.description,
          matchedContent: result.matchedContent,
          matchLocation: result.matchLocation as object,
          confidence: result.confidence,
          suggestedFix: result.suggestedFix,
        },
      });

      violations.push({
        ruleId: result.ruleId,
        ruleName: result.ruleName,
        ruleCategory: rule.category,
        severity: result.severity,
        message: result.message || rule.description,
        matchedContent: result.matchedContent,
        suggestedFix: result.suggestedFix,
        confidence: result.confidence,
        isBlocking: rule.isBlocking,
      });
    }

    // Determine overall result
    const overallResult = determineOverallResult(violations);
    const warningCount = violations.filter((v) => v.severity === "WARNING").length;
    const durationMs = Date.now() - startTime;

    // Generate summary
    const summary = generateSummary(
      passedResults.length,
      failedResults.length,
      warningCount,
      overallResult,
    );

    // Update check record
    await prisma.policyCheck.update({
      where: { id: check.id },
      data: {
        status: "COMPLETED",
        passedRules: passedResults.length,
        failedRules: failedResults.length,
        warningRules: warningCount,
        overallResult,
        summary,
        completedAt: new Date(),
        durationMs,
      },
    });

    return {
      checkId: check.id,
      status: "COMPLETED",
      overallResult,
      passedRules: passedResults.length,
      failedRules: failedResults.length,
      warningRules: warningCount,
      violations,
      summary,
      durationMs,
      canPublish: overallResult === "PASSED" ||
        overallResult === "PASSED_WITH_WARNINGS",
    };
  } catch (error) {
    // Mark check as failed
    await prisma.policyCheck.update({
      where: { id: check.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        summary: `Check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    });

    throw error;
  }
}

/**
 * Generate human-readable summary
 */
function generateSummary(
  passed: number,
  failed: number,
  warnings: number,
  result: "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED" | "BLOCKED",
): string {
  const total = passed + failed;

  switch (result) {
    case "PASSED":
      return `All ${total} policy checks passed.`;
    case "PASSED_WITH_WARNINGS":
      return `Passed with ${warnings} warning(s). ${passed}/${total} rules passed.`;
    case "FAILED":
      return `Failed ${failed} policy check(s). Please review and fix the violations before publishing.`;
    case "BLOCKED":
      return `Publishing blocked due to critical policy violations. ${failed}/${total} rules failed.`;
  }
}
