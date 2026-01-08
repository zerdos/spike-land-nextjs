/**
 * Pulse Notification System Types
 *
 * Resolves #648
 */

import type { AnomalyDirection, AnomalySeverity, MetricType } from "@/lib/social/anomaly-detection";
import type { SocialPlatform } from "@prisma/client";

/**
 * Available notification channels
 */
export type NotificationChannel = "email" | "slack" | "in_app" | "push";

/**
 * Notification priority levels
 */
export type NotificationPriority = "low" | "medium" | "high" | "urgent";

/**
 * Status of a sent notification
 */
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

/**
 * Configuration for which channels to use for notifications
 */
export interface ChannelConfig {
  email: boolean;
  slack: boolean;
  inApp: boolean;
  push: boolean;
}

/**
 * Workspace-level notification preferences
 */
export interface WorkspaceNotificationPreferences {
  workspaceId: string;
  channels: ChannelConfig;
  slackWebhookUrl?: string;
  emailRecipients?: string[];
  minSeverity: AnomalySeverity;
  quietHoursStart?: number; // Hour in 24h format (e.g., 22 for 10 PM)
  quietHoursEnd?: number; // Hour in 24h format (e.g., 7 for 7 AM)
  timezone?: string;
}

/**
 * Base notification payload
 */
export interface BaseNotification {
  id?: string;
  workspaceId: string;
  workspaceName?: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: Date;
}

/**
 * Pulse anomaly notification payload
 */
export interface PulseAnomalyNotification extends BaseNotification {
  type: "pulse_anomaly";
  anomaly: {
    accountId: string;
    accountName: string;
    platform: SocialPlatform;
    metricType: MetricType;
    currentValue: number;
    expectedValue: number;
    percentChange: number;
    severity: AnomalySeverity;
    direction: AnomalyDirection;
    zScore: number;
  };
  dashboardUrl?: string;
}

/**
 * Generic notification type union
 */
export type Notification = PulseAnomalyNotification;

/**
 * Result of sending a notification through a channel
 */
export interface ChannelResult {
  channel: NotificationChannel;
  status: NotificationStatus;
  error?: string;
  messageId?: string;
}

/**
 * Result of sending a notification through all channels
 */
export interface NotificationResult {
  success: boolean;
  channels: ChannelResult[];
  notification: Notification;
  timestamp: Date;
}

/**
 * Slack message block types (simplified)
 */
export interface SlackBlock {
  type: "section" | "divider" | "context" | "header";
  text?: {
    type: "mrkdwn" | "plain_text";
    text: string;
  };
  elements?: Array<{
    type: string;
    text: string;
  }>;
  accessory?: {
    type: string;
    text: {
      type: string;
      text: string;
    };
    url: string;
  };
}

/**
 * Slack message payload
 */
export interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
  attachments?: Array<{
    color: string;
    blocks: SlackBlock[];
  }>;
}
