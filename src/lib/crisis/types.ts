/**
 * Crisis Detection System Types
 *
 * Type definitions for the crisis detection, alerting, and response system.
 *
 * Resolves #588: Create Crisis Detection System
 */

import type {
  CrisisDetectionEvent,
  CrisisEventStatus,
  CrisisResponseTemplate,
  CrisisRuleType,
  CrisisSeverity,
  SocialPlatform,
} from "@prisma/client";

// =============================================================================
// Crisis Event Types
// =============================================================================

export interface CreateCrisisEventOptions {
  workspaceId: string;
  severity: CrisisSeverity;
  triggerType: string;
  triggerData: CrisisTriggerData;
  affectedAccountIds?: string[];
}

export interface CrisisTriggerData {
  source: "system" | "manual";
  metricType?: string;
  currentValue?: number;
  expectedValue?: number;
  percentChange?: number;
  relatedPostIds?: string[];
  relatedMessageIds?: string[];
  sentimentScore?: number;
  description?: string;
  detectionRuleId?: string;
  [key: string]: unknown;
}

export interface CrisisEventWithDetails extends CrisisDetectionEvent {
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
  acknowledgedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  resolvedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export interface AcknowledgeCrisisOptions {
  eventId: string;
  userId: string;
  notes?: string;
}

export interface ResolveCrisisOptions {
  eventId: string;
  userId: string;
  notes?: string;
  markAsFalseAlarm?: boolean;
}

// =============================================================================
// Crisis Alert Rule Types
// =============================================================================

export interface CreateAlertRuleOptions {
  workspaceId: string;
  name: string;
  description?: string;
  ruleType: CrisisRuleType;
  conditions: AlertRuleConditions;
  severity: CrisisSeverity;
  notifyChannels: string[];
  escalateAfterMinutes?: number;
  isActive?: boolean;
}

export interface UpdateAlertRuleOptions {
  name?: string;
  description?: string;
  ruleType?: CrisisRuleType;
  conditions?: AlertRuleConditions;
  severity?: CrisisSeverity;
  notifyChannels?: string[];
  escalateAfterMinutes?: number | null;
  isActive?: boolean;
}

export interface AlertRuleConditions {
  // For SENTIMENT_THRESHOLD
  sentimentThreshold?: number; // e.g., -0.5 for 50% negative
  timeWindowHours?: number;
  messageCount?: number;

  // For ENGAGEMENT_DROP
  engagementDropPercent?: number; // e.g., 30 for 30% drop
  comparisonPeriodDays?: number;

  // For MENTION_SPIKE
  mentionMultiplier?: number; // e.g., 3 for 3x normal
  baselineWindowDays?: number;

  // For FOLLOWER_DROP
  followerDropPercent?: number;
  followerDropAbsolute?: number;

  // For VIRAL_COMPLAINT
  negativeEngagementThreshold?: number;
  viralityThreshold?: number;

  // Common
  platforms?: SocialPlatform[];
  accountIds?: string[];
}

// =============================================================================
// Crisis Response Template Types
// =============================================================================

export type TemplateCategory =
  | "APOLOGY"
  | "ACKNOWLEDGMENT"
  | "REDIRECT"
  | "ESCALATION"
  | "EMPATHY"
  | "FOLLOW_UP";

export interface CreateTemplateOptions {
  workspaceId?: string | null;
  name: string;
  category: TemplateCategory;
  platform?: SocialPlatform | null;
  content: string;
  variables?: string[];
  isActive?: boolean;
}

export interface UpdateTemplateOptions {
  name?: string;
  category?: TemplateCategory;
  platform?: SocialPlatform | null;
  content?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface TemplateWithVariables extends CrisisResponseTemplate {
  renderedContent?: string;
}

export interface RenderTemplateOptions {
  templateId: string;
  variables: Record<string, string>;
}

// =============================================================================
// Automation Pause Types
// =============================================================================

export interface AutomationPauseStatus {
  isPaused: boolean;
  pausedAt?: Date;
  pausedById?: string;
  pauseReason?: string;
  relatedCrisisId?: string;
  scheduledResume?: Date;
}

export interface PauseAutomationOptions {
  workspaceId: string;
  userId: string;
  reason?: string;
  relatedCrisisId?: string;
  scheduledResumeAt?: Date;
}

// =============================================================================
// Crisis Timeline Types
// =============================================================================

export interface CrisisTimelineEvent {
  id: string;
  type:
    | "crisis_detected"
    | "crisis_acknowledged"
    | "crisis_resolved"
    | "automation_paused"
    | "automation_resumed"
    | "alert_sent"
    | "response_sent"
    | "note_added";
  timestamp: Date;
  actorId?: string;
  actorName?: string;
  crisisId?: string;
  severity?: CrisisSeverity;
  details?: Record<string, unknown>;
}

export interface CrisisTimeline {
  crisisId: string;
  startedAt: Date;
  endedAt?: Date;
  status: CrisisEventStatus;
  severity: CrisisSeverity;
  events: CrisisTimelineEvent[];
  affectedAccounts: Array<{
    id: string;
    platform: SocialPlatform;
    accountName: string;
  }>;
}

// =============================================================================
// Sentiment Analysis Types
// =============================================================================

export interface SentimentAnalysisResult {
  overallSentiment: "positive" | "negative" | "neutral" | "mixed";
  sentimentScore: number; // -1 to 1
  confidence: number; // 0 to 1
  messageCount: number;
  negativeProportion: number;
  criticalMessages: Array<{
    id: string;
    content: string;
    sentimentScore: number;
  }>;
}

// =============================================================================
// Crisis Detection Types
// =============================================================================

export interface CrisisDetectionResult {
  detected: boolean;
  crises: Array<{
    severity: CrisisSeverity;
    triggerType: string;
    triggerData: CrisisTriggerData;
    affectedAccountIds: string[];
    ruleId?: string;
  }>;
}

export interface CrisisMetrics {
  totalEvents: number;
  activeEvents: number;
  eventsBySeverity: Record<CrisisSeverity, number>;
  eventsByStatus: Record<CrisisEventStatus, number>;
  averageTimeToAcknowledge?: number; // in minutes
  averageTimeToResolve?: number; // in minutes
  eventsLast7Days: number;
  eventsLast30Days: number;
}

// =============================================================================
// Search & Pagination Types
// =============================================================================

export interface CrisisEventSearchParams {
  workspaceId?: string;
  severity?: CrisisSeverity[];
  status?: CrisisEventStatus[];
  triggerType?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: "detectedAt" | "severity" | "status";
  sortOrder?: "asc" | "desc";
}

export interface TemplateSearchParams {
  workspaceId?: string | null;
  category?: TemplateCategory;
  platform?: SocialPlatform;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
