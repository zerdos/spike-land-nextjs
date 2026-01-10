/**
 * Crisis Detection System
 *
 * Comprehensive crisis detection, alerting, and response system.
 *
 * Resolves #588: Create Crisis Detection System
 *
 * @module
 */

export { CrisisAlertManager } from "./alert-manager";
export { AutomationPauseManager } from "./automation-pause";
export { CrisisDetector } from "./crisis-detector";
export { CrisisResponseTemplates } from "./response-templates";
export { CrisisTimelineService } from "./timeline-service";

// Re-export types
export type {
  // Event types
  AcknowledgeCrisisOptions,
  // Rule types
  AlertRuleConditions,
  // Pause types
  AutomationPauseStatus,
  CreateAlertRuleOptions,
  CreateCrisisEventOptions,
  // Template types
  CreateTemplateOptions,
  CrisisDetectionResult,
  CrisisEventSearchParams,
  CrisisEventWithDetails,
  CrisisMetrics,
  // Timeline types
  CrisisTimeline,
  CrisisTimelineEvent,
  CrisisTriggerData,
  // Common types
  PaginatedResponse,
  PauseAutomationOptions,
  RenderTemplateOptions,
  ResolveCrisisOptions,
  // Sentiment types
  SentimentAnalysisResult,
  TemplateCategory,
  TemplateSearchParams,
  TemplateWithVariables,
  UpdateAlertRuleOptions,
  UpdateTemplateOptions,
} from "./types";
