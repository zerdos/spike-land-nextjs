/**
 * Crisis Alert Manager
 *
 * Handles sending alerts through multiple channels and managing escalations.
 * Extends the existing notification channel manager.
 *
 * Resolves #588: Create Crisis Detection System
 */

import { sendEmail } from "@/lib/email/client";
import { CrisisAlertEmail } from "@/lib/email/templates/crisis-alert";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { CrisisDetectionEvent, CrisisSeverity, Prisma } from "@prisma/client";

import type { CrisisTimelineEvent } from "./types";

interface AlertRecipient {
  userId: string;
  email?: string;
  name?: string;
}

interface CrisisAlertContent {
  subject: string;
  title: string;
  message: string;
  severity: CrisisSeverity;
  triggerType: string;
  detectedAt: Date;
  affectedAccounts: string[];
  dashboardUrl: string;
}

/**
 * Crisis Alert Manager
 */
export class CrisisAlertManager {
  /**
   * Send alerts for a crisis event through configured channels
   */
  static async sendAlerts(
    event: CrisisDetectionEvent,
    channels: string[],
    workspaceSlug: string,
  ): Promise<{ success: boolean; channelResults: Record<string, boolean>; }> {
    const results: Record<string, boolean> = {};

    // Get workspace members to notify (admins and owners)
    const members = await this.getAlertRecipients(event.workspaceId);

    // Build alert content
    const content = this.buildAlertContent(event, workspaceSlug);

    // Send through each channel
    for (const channel of channels) {
      switch (channel) {
        case "email":
          results.email = await this.sendEmailAlerts(members, content);
          break;
        case "slack":
          results.slack = await this.sendSlackAlert(event.workspaceId, content);
          break;
        case "in_app":
          results.in_app = await this.createInAppNotifications(
            members,
            event,
            content,
          );
          break;
        default:
          results[channel] = false;
      }
    }

    // Log the alert in timeline
    await this.logTimelineEvent({
      workspaceId: event.workspaceId,
      type: "alert_sent",
      crisisId: event.id,
      severity: event.severity,
      details: {
        channels,
        results,
        recipientCount: members.length,
      },
    });

    return {
      success: Object.values(results).some((v) => v),
      channelResults: results,
    };
  }

  /**
   * Get members who should receive alerts (admins and owners)
   */
  private static async getAlertRecipients(
    workspaceId: string,
  ): Promise<AlertRecipient[]> {
    const { data: members, error } = await tryCatch(
      prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          role: { in: ["OWNER", "ADMIN"] },
        },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
    );

    if (error || !members) {
      return [];
    }

    return members.map((m) => ({
      userId: m.user.id,
      email: m.user.email ?? undefined,
      name: m.user.name ?? undefined,
    }));
  }

  /**
   * Build alert content from crisis event
   */
  private static buildAlertContent(
    event: CrisisDetectionEvent,
    workspaceSlug: string,
  ): CrisisAlertContent {
    const severityEmoji = {
      LOW: "\u{1F7E1}", // Yellow circle
      MEDIUM: "\u{1F7E0}", // Orange circle
      HIGH: "\u{1F534}", // Red circle
      CRITICAL: "\u{1F6A8}", // Emergency light
    };

    const triggerData = event.triggerData as Record<string, unknown>;

    return {
      subject: `${severityEmoji[event.severity]} ${event.severity} Crisis Alert - ${
        event.triggerType.replace(/_/g, " ")
      }`,
      title: `Crisis Detected: ${event.triggerType.replace(/_/g, " ")}`,
      message: this.buildAlertMessage(event, triggerData),
      severity: event.severity,
      triggerType: event.triggerType,
      detectedAt: event.detectedAt,
      affectedAccounts: event.affectedAccountIds,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orbit/${workspaceSlug}/crisis/${event.id}`,
    };
  }

  /**
   * Build descriptive alert message
   */
  private static buildAlertMessage(
    event: CrisisDetectionEvent,
    triggerData: Record<string, unknown>,
  ): string {
    const parts: string[] = [];

    parts.push(
      `A ${event.severity.toLowerCase()} severity crisis has been detected.`,
    );

    if (triggerData.description) {
      parts.push(String(triggerData.description));
    }

    if (triggerData.percentChange) {
      const change = Number(triggerData.percentChange);
      parts.push(
        `Metric change: ${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
      );
    }

    if (triggerData.sentimentScore !== undefined) {
      const score = Number(triggerData.sentimentScore);
      parts.push(`Sentiment score: ${score.toFixed(2)}`);
    }

    if (event.affectedAccountIds.length > 0) {
      parts.push(
        `Affected accounts: ${event.affectedAccountIds.length}`,
      );
    }

    return parts.join("\n");
  }

  /**
   * Send email alerts to recipients
   */
  private static async sendEmailAlerts(
    recipients: AlertRecipient[],
    content: CrisisAlertContent,
  ): Promise<boolean> {
    let success = false;

    for (const recipient of recipients) {
      if (!recipient.email) continue;

      const emailComponent = CrisisAlertEmail({
        recipientName: recipient.name,
        severity: content.severity,
        title: content.title,
        message: content.message,
        triggerType: content.triggerType,
        detectedAt: content.detectedAt,
        affectedAccountCount: content.affectedAccounts.length,
        dashboardUrl: content.dashboardUrl,
      });

      const { error } = await tryCatch(
        sendEmail({
          to: recipient.email,
          subject: content.subject,
          react: emailComponent,
        }),
      );

      if (!error) {
        success = true;
      }
    }

    return success;
  }

  /**
   * Send Slack alert
   */
  private static async sendSlackAlert(
    workspaceId: string,
    content: CrisisAlertContent,
  ): Promise<boolean> {
    // Get workspace Slack settings
    const { data: workspace, error: fetchError } = await tryCatch(
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      }),
    );

    if (fetchError || !workspace) {
      return false;
    }

    const settings = workspace.settings as Record<string, unknown> | null;
    const slackWebhook = (settings?.notifications as Record<string, unknown>)
      ?.slackWebhookUrl as string | undefined;

    if (!slackWebhook) {
      return false;
    }

    const severityEmoji = {
      LOW: ":large_yellow_circle:",
      MEDIUM: ":large_orange_circle:",
      HIGH: ":red_circle:",
      CRITICAL: ":rotating_light:",
    };

    const severityColor = {
      LOW: "#FCD34D",
      MEDIUM: "#FB923C",
      HIGH: "#EF4444",
      CRITICAL: "#DC2626",
    };

    const slackMessage = {
      text: content.subject,
      attachments: [
        {
          color: severityColor[content.severity],
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `${severityEmoji[content.severity]} ${content.title}`,
                emoji: true,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: content.message,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text:
                    `*Severity:* ${content.severity} | *Detected:* ${content.detectedAt.toISOString()}`,
                },
              ],
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: " ",
              },
              accessory: {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "View Dashboard",
                },
                url: content.dashboardUrl,
                style: "primary",
              },
            },
          ],
        },
      ],
    };

    const { error } = await tryCatch(
      fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackMessage),
      }).then(async (response) => {
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Slack API error: ${response.status} - ${body}`);
        }
        return response;
      }),
    );

    return !error;
  }

  /**
   * Create in-app notifications for recipients
   */
  private static async createInAppNotifications(
    recipients: AlertRecipient[],
    event: CrisisDetectionEvent,
    content: CrisisAlertContent,
  ): Promise<boolean> {
    // Store notifications in workspace settings for now
    // In a full implementation, this would use a dedicated notifications table
    const { data: workspace, error: fetchError } = await tryCatch(
      prisma.workspace.findUnique({
        where: { id: event.workspaceId },
        select: { settings: true },
      }),
    );

    if (fetchError || !workspace) {
      return false;
    }

    const settings = (workspace.settings as Record<string, unknown>) || {};
    const notifications = (settings.inAppNotifications as Array<Record<string, unknown>>) || [];

    notifications.unshift({
      id: `crisis-${event.id}`,
      type: "crisis_alert",
      title: content.title,
      message: content.message,
      severity: event.severity,
      crisisId: event.id,
      createdAt: new Date().toISOString(),
      read: false,
      recipientIds: recipients.map((r) => r.userId),
    });

    // Keep only last 100 notifications
    const trimmedNotifications = notifications.slice(0, 100);

    const { error } = await tryCatch(
      prisma.workspace.update({
        where: { id: event.workspaceId },
        data: {
          settings: {
            ...settings,
            inAppNotifications: trimmedNotifications,
          } as Prisma.InputJsonValue,
        },
      }),
    );

    return !error;
  }

  /**
   * Check for events that need escalation
   */
  static async checkEscalations(workspaceId: string): Promise<void> {
    // Get unacknowledged events with escalation rules
    const { data: rules } = await tryCatch(
      prisma.crisisAlertRule.findMany({
        where: {
          workspaceId,
          isActive: true,
          escalateAfterMinutes: { not: null },
        },
      }),
    );

    if (!rules || rules.length === 0) {
      return;
    }

    const { data: events } = await tryCatch(
      prisma.crisisDetectionEvent.findMany({
        where: {
          workspaceId,
          status: "DETECTED",
        },
      }),
    );

    if (!events) {
      return;
    }

    const now = new Date();

    for (const event of events) {
      const triggerData = event.triggerData as Record<string, unknown>;
      const ruleId = triggerData.detectionRuleId as string | undefined;

      if (!ruleId) continue;

      const rule = rules.find((r) => r.id === ruleId);
      if (!rule || !rule.escalateAfterMinutes) continue;

      const minutesSinceDetected = (now.getTime() - event.detectedAt.getTime()) / 60000;

      if (minutesSinceDetected >= rule.escalateAfterMinutes) {
        // Escalate by increasing severity
        const escalatedSeverity = this.getEscalatedSeverity(event.severity);

        await prisma.crisisDetectionEvent.update({
          where: { id: event.id },
          data: {
            severity: escalatedSeverity,
            triggerData: {
              ...(event.triggerData as object),
              escalated: true,
              escalatedAt: now.toISOString(),
              originalSeverity: event.severity,
            },
          },
        });

        // Send escalation alerts
        const { data: workspace } = await tryCatch(
          prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { slug: true },
          }),
        );

        if (workspace) {
          await this.sendAlerts(
            { ...event, severity: escalatedSeverity },
            rule.notifyChannels,
            workspace.slug,
          );
        }
      }
    }
  }

  /**
   * Get escalated severity level
   */
  private static getEscalatedSeverity(
    currentSeverity: CrisisSeverity,
  ): CrisisSeverity {
    const severityOrder: CrisisSeverity[] = [
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL",
    ];
    const currentIndex = severityOrder.indexOf(currentSeverity);
    const escalatedIndex = Math.min(currentIndex + 1, severityOrder.length - 1);
    return severityOrder[escalatedIndex]!;
  }

  /**
   * Log an event to the crisis timeline
   */
  static async logTimelineEvent(
    event: Omit<CrisisTimelineEvent, "id" | "timestamp"> & {
      workspaceId: string;
    },
  ): Promise<void> {
    const { data: workspace, error: fetchError } = await tryCatch(
      prisma.workspace.findUnique({
        where: { id: event.workspaceId },
        select: { settings: true },
      }),
    );

    if (fetchError || !workspace) {
      return;
    }

    const settings = (workspace.settings as Record<string, unknown>) || {};
    const timeline = (settings.crisisTimeline as Array<Record<string, unknown>>) || [];

    timeline.unshift({
      id: `timeline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: event.type,
      timestamp: new Date().toISOString(),
      actorId: event.actorId,
      actorName: event.actorName,
      crisisId: event.crisisId,
      severity: event.severity,
      details: event.details,
    });

    // Keep last 500 timeline events
    const trimmedTimeline = timeline.slice(0, 500);

    await tryCatch(
      prisma.workspace.update({
        where: { id: event.workspaceId },
        data: {
          settings: {
            ...settings,
            crisisTimeline: trimmedTimeline,
          } as Prisma.InputJsonValue,
        },
      }),
    );
  }
}
