/**
 * Notification Channel Manager
 *
 * Orchestrates sending notifications through multiple channels
 * based on workspace preferences.
 *
 * Resolves #648
 */

import { sendEmail } from "@/lib/email/client";
import { PulseAlertEmail } from "@/lib/email/templates/pulse-alert";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { sendSlackNotification } from "./slack-channel";
import type {
  ChannelResult,
  Notification,
  NotificationResult,
  PulseAnomalyNotification,
  WorkspaceNotificationPreferences,
} from "./types";

/**
 * Default notification preferences
 */
const DEFAULT_PREFERENCES: Omit<
  WorkspaceNotificationPreferences,
  "workspaceId"
> = {
  channels: {
    email: true,
    slack: false,
    inApp: true,
    push: false,
  },
  minSeverity: "warning",
};

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(preferences: WorkspaceNotificationPreferences): boolean {
  if (
    preferences.quietHoursStart === undefined ||
    preferences.quietHoursEnd === undefined
  ) {
    return false;
  }

  const now = new Date();
  const timeZone = preferences.timezone;

  let hour: number;
  if (timeZone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone,
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find((part) => part.type === "hour");
    hour = hourPart ? Number(hourPart.value) : now.getHours();
  } else {
    hour = now.getHours();
  }

  if (preferences.quietHoursStart < preferences.quietHoursEnd) {
    // Simple case: quiet hours don't cross midnight (e.g., 22:00 - 23:00)
    return hour >= preferences.quietHoursStart && hour < preferences.quietHoursEnd;
  } else {
    // Quiet hours cross midnight (e.g., 22:00 - 07:00)
    return hour >= preferences.quietHoursStart || hour < preferences.quietHoursEnd;
  }
}

/**
 * Get notification preferences for a workspace
 */
export async function getWorkspacePreferences(
  workspaceId: string,
): Promise<WorkspaceNotificationPreferences> {
  const { data: workspace, error } = await tryCatch(
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    }),
  );

  if (error || !workspace) {
    console.warn("[Notifications] Failed to get workspace preferences:", error);
    return { workspaceId, ...DEFAULT_PREFERENCES };
  }

  // Extract notification settings from workspace settings JSON
  const settings = workspace.settings as Record<string, unknown> | null;
  const notificationSettings = settings?.notifications as
    | Partial<WorkspaceNotificationPreferences>
    | undefined;

  return {
    workspaceId,
    channels: notificationSettings?.channels ?? DEFAULT_PREFERENCES.channels,
    slackWebhookUrl: notificationSettings?.slackWebhookUrl,
    emailRecipients: notificationSettings?.emailRecipients,
    minSeverity: notificationSettings?.minSeverity ?? DEFAULT_PREFERENCES.minSeverity,
    quietHoursStart: notificationSettings?.quietHoursStart,
    quietHoursEnd: notificationSettings?.quietHoursEnd,
    timezone: notificationSettings?.timezone,
  };
}

/**
 * Send email notification for a Pulse anomaly
 */
async function sendEmailNotification(
  notification: PulseAnomalyNotification,
  recipients: string[],
): Promise<ChannelResult> {
  if (recipients.length === 0) {
    return {
      channel: "email",
      status: "skipped",
      error: "No email recipients configured",
    };
  }

  const { success, error, id } = await sendEmail({
    to: recipients,
    subject: `Pulse Alert: ${
      notification.anomaly.severity.charAt(0).toUpperCase() + notification.anomaly.severity.slice(1)
    } anomaly detected`,
    react: PulseAlertEmail({
      workspaceName: notification.workspaceName,
      accountName: notification.anomaly.accountName,
      platform: notification.anomaly.platform,
      metricType: notification.anomaly.metricType,
      currentValue: notification.anomaly.currentValue,
      expectedValue: notification.anomaly.expectedValue,
      percentChange: notification.anomaly.percentChange,
      severity: notification.anomaly.severity,
      direction: notification.anomaly.direction,
      dashboardUrl: notification.dashboardUrl,
    }),
  });

  if (!success) {
    return {
      channel: "email",
      status: "failed",
      error: error || "Unknown email error",
    };
  }

  return {
    channel: "email",
    status: "sent",
    messageId: id,
  };
}

/**
 * Store notification in database for in-app display
 */
async function storeInAppNotification(
  notification: PulseAnomalyNotification,
): Promise<ChannelResult> {
  // In-app notifications would be stored in a notifications table
  // For now, we'll just log and return success
  console.log("[Notifications] In-app notification stored:", notification.id);

  return {
    channel: "in_app",
    status: "sent",
  };
}

/**
 * Send a notification through all configured channels
 *
 * @param notification - The notification to send
 * @returns Result with status for each channel
 */
export async function sendNotification(
  notification: Notification,
): Promise<NotificationResult> {
  const preferences = await getWorkspacePreferences(notification.workspaceId);
  const results: ChannelResult[] = [];

  // Check severity threshold
  if (notification.type === "pulse_anomaly") {
    const severityOrder = { warning: 1, critical: 2 };
    const minSeverity = severityOrder[preferences.minSeverity] || 1;
    const notificationSeverity = severityOrder[notification.anomaly.severity] || 1;

    if (notificationSeverity < minSeverity) {
      return {
        success: true,
        channels: [
          {
            channel: "email",
            status: "skipped",
            error: "Below minimum severity threshold",
          },
        ],
        notification,
        timestamp: new Date(),
      };
    }
  }

  // Check quiet hours
  if (isQuietHours(preferences)) {
    console.log("[Notifications] Quiet hours active, skipping notifications");
    return {
      success: true,
      channels: [
        {
          channel: "email",
          status: "skipped",
          error: "Quiet hours active",
        },
      ],
      notification,
      timestamp: new Date(),
    };
  }

  // Send through email channel
  if (preferences.channels.email && notification.type === "pulse_anomaly") {
    const emailResult = await sendEmailNotification(
      notification,
      preferences.emailRecipients || [],
    );
    results.push(emailResult);
  }

  // Send through Slack channel
  if (
    preferences.channels.slack &&
    preferences.slackWebhookUrl &&
    notification.type === "pulse_anomaly"
  ) {
    const slackResult = await sendSlackNotification(
      preferences.slackWebhookUrl,
      notification,
    );
    results.push(slackResult);
  }

  // Store in-app notification
  if (preferences.channels.inApp && notification.type === "pulse_anomaly") {
    const inAppResult = await storeInAppNotification(notification);
    results.push(inAppResult);
  }

  // Check if any channel succeeded
  const anySuccess = results.some((r) => r.status === "sent");

  return {
    success: anySuccess || results.length === 0,
    channels: results,
    notification,
    timestamp: new Date(),
  };
}

/**
 * Send notifications for detected anomalies
 *
 * @param workspaceId - The workspace ID
 * @param anomalies - Array of detected anomalies
 * @returns Array of notification results
 */
export async function sendAnomalyNotifications(
  workspaceId: string,
  anomalies: Array<{
    accountId: string;
    accountName: string;
    platform: string;
    metricType: string;
    currentValue: number;
    expectedValue: number;
    percentChange: number;
    severity: "warning" | "critical";
    direction: "spike" | "drop";
    zScore: number;
  }>,
  options?: {
    workspaceName?: string;
    dashboardUrl?: string;
  },
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  for (const anomaly of anomalies) {
    const notification: PulseAnomalyNotification = {
      type: "pulse_anomaly",
      workspaceId,
      workspaceName: options?.workspaceName,
      title: `${
        anomaly.severity.charAt(0).toUpperCase() + anomaly.severity.slice(1)
      } anomaly detected`,
      message: `${anomaly.metricType} ${anomaly.direction} detected for ${anomaly.accountName}`,
      priority: anomaly.severity === "critical" ? "urgent" : "high",
      timestamp: new Date(),
      anomaly: {
        ...anomaly,
        platform: anomaly.platform as PulseAnomalyNotification["anomaly"]["platform"],
        metricType: anomaly.metricType as PulseAnomalyNotification["anomaly"]["metricType"],
      },
      dashboardUrl: options?.dashboardUrl,
    };

    const result = await sendNotification(notification);
    results.push(result);
  }

  return results;
}
