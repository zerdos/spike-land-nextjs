import { sendEmail } from "@/lib/email/client";
import GuardrailAlertEmail from "@/lib/email/templates/guardrail-alert";
import { getWorkspacePreferences } from "@/lib/notifications/channel-manager";
import { postToSlack } from "@/lib/notifications/slack-channel";
import prisma from "@/lib/prisma";
import type {
  AlertSeverity,
  AllocatorAlertType,
  AllocatorGuardrailAlert,
  Prisma,
} from "@prisma/client";

export class GuardrailAlertService {
  /**
   * Create a new guardrail alert
   */
  static async createAlert(data: {
    workspaceId: string;
    campaignId?: string;
    alertType: AllocatorAlertType;
    severity: AlertSeverity;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const alert = await prisma.allocatorGuardrailAlert.create({
      data: {
        workspaceId: data.workspaceId,
        campaignId: data.campaignId,
        alertType: data.alertType,
        severity: data.severity,
        message: data.message,
        metadata: (data.metadata as Prisma.InputJsonValue) || undefined,
      },
    });

    // Send notifications (email and Slack)
    await this.sendAlertNotification(alert);

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(alertId: string, userId: string) {
    return prisma.allocatorGuardrailAlert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });
  }

  /**
   * Get active (unacknowledged) alerts for a workspace
   */
  static async getActiveAlerts(workspaceId: string) {
    return prisma.allocatorGuardrailAlert.findMany({
      where: {
        workspaceId,
        acknowledged: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        campaign: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Internal method to dispatch notifications
   */
  private static async sendAlertNotification(
    alert: AllocatorGuardrailAlert & { campaign?: { name: string; }; },
  ) {
    try {
      // 1. Fetch Workspace details and owners
      const workspace = await prisma.workspace.findUnique({
        where: { id: alert.workspaceId },
        include: {
          members: {
            where: { role: { in: ["OWNER", "ADMIN"] } },
            include: { user: true },
          },
        },
      });

      if (!workspace) return;

      // 2. Send Emails
      const recipients = workspace.members
        .map((m) => m.user?.email)
        .filter((email): email is string => !!email);

      if (recipients.length > 0) {
        await sendEmail({
          to: recipients,
          subject: `[${alert.severity}] Autopilot Guardrail Alert: ${alert.alertType}`,
          react: GuardrailAlertEmail({
            alertType: alert.alertType,
            severity: alert.severity,
            message: alert.message,
            workspaceName: workspace.name,
            campaignName: alert.campaign?.name,
            metadata: (alert.metadata as Record<string, unknown>) || {},
            actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orbit/${workspace.slug}/allocator`,
          }),
        });
      }

      // 3. Send Slack Notification (if configured)
      const preferences = await getWorkspacePreferences(alert.workspaceId);
      if (preferences.channels.slack && preferences.slackWebhookUrl) {
        await postToSlack(preferences.slackWebhookUrl, {
          text: `*${alert.severity}*: ${alert.message} (${workspace.name})`,
        });
      }
    } catch (error) {
      console.error("Failed to send alert notification:", error);
      // Don't throw, just log
    }
  }
}
