/**
 * Slack Notification Channel
 *
 * Sends notifications to Slack via webhook.
 *
 * Resolves #648
 */

import { tryCatch } from "@/lib/try-catch";
import type { ChannelResult, PulseAnomalyNotification, SlackMessage } from "./types";

/**
 * Platform emojis for Slack messages
 */
const PLATFORM_EMOJIS: Record<string, string> = {
  LINKEDIN: ":linkedin:",
  INSTAGRAM: ":instagram:",
  FACEBOOK: ":facebook:",
  TWITTER: ":twitter:",
  YOUTUBE: ":youtube:",
  TIKTOK: ":tiktok:",
  DISCORD: ":discord:",
};

/**
 * Get severity color for Slack attachment
 */
function getSeverityColor(severity: "warning" | "critical"): string {
  return severity === "critical" ? "#dc2626" : "#f59e0b";
}

/**
 * Get severity emoji
 */
function getSeverityEmoji(severity: "warning" | "critical"): string {
  return severity === "critical" ? ":rotating_light:" : ":warning:";
}

/**
 * Get direction emoji
 */
function getDirectionEmoji(direction: "spike" | "drop"): string {
  return direction === "spike" ? ":chart_with_upwards_trend:" : ":chart_with_downwards_trend:";
}

/**
 * Format a number with appropriate suffixes
 */
function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

/**
 * Format percent change with sign
 */
function formatPercentChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Build a Slack message for a Pulse anomaly notification
 */
export function buildSlackMessage(
  notification: PulseAnomalyNotification,
): SlackMessage {
  const { anomaly, workspaceName, dashboardUrl } = notification;
  const platformEmoji = PLATFORM_EMOJIS[anomaly.platform] || ":chart_with_upwards_trend:";
  const severityEmoji = getSeverityEmoji(anomaly.severity);
  const directionEmoji = getDirectionEmoji(anomaly.direction);

  const text =
    `${severityEmoji} *${anomaly.severity.toUpperCase()}*: ${anomaly.metricType} ${anomaly.direction} detected for ${anomaly.accountName}`;

  const blocks = [
    {
      type: "header" as const,
      text: {
        type: "plain_text" as const,
        text: `${severityEmoji} Pulse Alert: ${
          anomaly.severity.charAt(0).toUpperCase() + anomaly.severity.slice(1)
        } Anomaly Detected`,
      },
    },
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: `${platformEmoji} *${anomaly.platform}* - ${anomaly.accountName}`,
      },
    },
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: [
          `*Metric:* ${anomaly.metricType}`,
          `*Direction:* ${directionEmoji} ${
            anomaly.direction.charAt(0).toUpperCase() + anomaly.direction.slice(1)
          }`,
          `*Current Value:* ${formatNumber(anomaly.currentValue)}`,
          `*Expected Value:* ${formatNumber(anomaly.expectedValue)}`,
          `*Change:* ${formatPercentChange(anomaly.percentChange)}`,
          `*Z-Score:* ${anomaly.zScore.toFixed(2)}`,
        ].join("\n"),
      },
    },
    {
      type: "divider" as const,
    },
    {
      type: "context" as const,
      elements: [
        {
          type: "mrkdwn" as const,
          text: `Workspace: *${
            workspaceName || notification.workspaceId
          }* | Detected at: ${notification.timestamp.toISOString()}`,
        },
      ],
    },
  ];

  // Add action button if dashboard URL is provided
  if (dashboardUrl) {
    blocks.push(
      {
        type: "section" as const,
        text: {
          type: "mrkdwn" as const,
          text: " ",
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Dashboard",
          },
          url: dashboardUrl,
        },
      } as typeof blocks[number],
    );
  }

  return {
    text,
    attachments: [
      {
        color: getSeverityColor(anomaly.severity),
        blocks,
      },
    ],
  };
}

/**
 * Send a Slack notification via webhook
 *
 * @param webhookUrl - The Slack webhook URL
 * @param notification - The notification to send
 * @returns Channel result with status
 */
export async function sendSlackNotification(
  webhookUrl: string,
  notification: PulseAnomalyNotification,
): Promise<ChannelResult> {
  if (!webhookUrl) {
    return {
      channel: "slack",
      status: "skipped",
      error: "Slack webhook URL not configured",
    };
  }

  const message = buildSlackMessage(notification);

  const { error } = await tryCatch(
    fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Slack API error: ${response.status} - ${body}`);
      }
      return response;
    }),
  );

  if (error) {
    console.error("[Slack] Failed to send notification:", error);
    return {
      channel: "slack",
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    channel: "slack",
    status: "sent",
  };
}

/**
 * Validate a Slack webhook URL
 */
export function isValidSlackWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "hooks.slack.com" &&
      parsed.pathname.startsWith("/services/")
    );
  } catch {
    return false;
  }
}
