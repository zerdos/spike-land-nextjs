/**
 * Policy Checker
 *
 * Content policy validation system for social media platforms.
 * Validates content against platform policies, content guidelines,
 * ad compliance rules, and provides pre-publish warnings.
 *
 * Resolves #584: Build Policy Checker
 */

// Main policy engine
export {
  checkContent,
  evaluateRule,
  extractContentMetadata,
  getApplicableRules,
  getCharacterLimit,
} from "./policy-engine";

// Rule management
export {
  bulkCreateRules,
  cloneRule,
  createRule,
  deleteRule,
  getGlobalRules,
  getRule,
  getRulesForWorkspace,
  getRulesNeedingVerification,
  getRuleStatistics,
  getWorkspaceRules,
  markRuleVerified,
  toggleRuleActive,
  updateRule,
} from "./rule-manager";

// Violation management
export {
  cleanupOldChecks,
  getCheck,
  getCheckHistory,
  getChecksForContent,
  getViolation,
  getViolationHistory,
  getViolationsForCheck,
  getViolationStatistics,
  overrideViolation,
  removeOverride,
  violationToSummary,
} from "./violation-manager";

// Default rules
export {
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

// Types
export type {
  ContentMetadata,
  MatchLocation,
  PlatformCharacterLimits,
  PolicyCheckInput,
  PolicyCheckOutput,
  PolicyRuleConditions,
  PolicyRuleInput,
  RuleContext,
  RuleEvaluationResult,
  ViolationSummary,
} from "./types";

export { PLATFORM_CHARACTER_LIMITS, PROHIBITED_CONTENT_PATTERNS } from "./types";
