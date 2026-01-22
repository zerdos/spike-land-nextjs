/**
 * Tests for Notification Channel Manager
 *
 * Tests notification routing through multiple channels including in-app storage.
 *
 * Resolves #802
 */

import type { SocialPlatform } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";

import {
  getWorkspacePreferences,
  sendAnomalyNotifications,
  sendNotification,
} from "./channel-manager";
import type { PulseAnomalyNotification } from "./types";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, id: "email-id-1" }),
}));

vi.mock("./slack-channel", () => ({
  sendSlackNotification: vi.fn().mockResolvedValue({
    channel: "slack",
    status: "sent",
    messageId: "slack-msg-1",
  }),
}));

describe("Notification Channel Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getWorkspacePreferences", () => {
    it("returns default preferences when workspace not found", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      const prefs = await getWorkspacePreferences("ws-nonexistent");

      expect(prefs.workspaceId).toBe("ws-nonexistent");
      expect(prefs.channels.email).toBe(true);
      expect(prefs.channels.inApp).toBe(true);
      expect(prefs.minSeverity).toBe("warning");
    });

    it("returns custom preferences from workspace settings", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
        settings: {
          notifications: {
            channels: { email: false, slack: true, inApp: true, push: false },
            slackWebhookUrl: "https://hooks.slack.com/services/test",
            minSeverity: "critical",
          },
        },
      } as never);

      const prefs = await getWorkspacePreferences("ws-1");

      expect(prefs.channels.email).toBe(false);
      expect(prefs.channels.slack).toBe(true);
      expect(prefs.slackWebhookUrl).toBe("https://hooks.slack.com/services/test");
      expect(prefs.minSeverity).toBe("critical");
    });
  });

  describe("storeInAppNotification (via sendNotification)", () => {
    const mockNotification: PulseAnomalyNotification = {
      type: "pulse_anomaly",
      workspaceId: "ws-1",
      workspaceName: "Test Workspace",
      title: "Critical anomaly detected",
      message: "followers spike detected for Test Account",
      priority: "urgent",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      anomaly: {
        accountId: "account-1",
        accountName: "Test Account",
        platform: "LINKEDIN" as SocialPlatform,
        metricType: "followers",
        currentValue: 10500,
        expectedValue: 5000,
        percentChange: 110,
        severity: "critical",
        direction: "spike",
        zScore: 4.2,
      },
      dashboardUrl: "https://spike.land/orbit/test/dashboard",
    };

    it("stores in-app notification when channel is enabled", async () => {
      // Setup preferences with inApp enabled
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
        settings: {
          notifications: {
            channels: { email: false, slack: false, inApp: true, push: false },
            minSeverity: "warning",
          },
        },
      } as never);

      // Mock successful notification creation
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
        workspaceId: "ws-1",
        type: "PULSE_ANOMALY",
        title: "Critical anomaly detected",
        message: "followers spike detected for Test Account",
        priority: "URGENT",
        read: false,
        entityType: "SocialAccount",
        entityId: "account-1",
        createdAt: new Date(),
      } as never);

      const result = await sendNotification(mockNotification);

      expect(result.success).toBe(true);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: "ws-1",
          type: "PULSE_ANOMALY",
          title: "Critical anomaly detected",
          priority: "URGENT",
          entityType: "SocialAccount",
          entityId: "account-1",
          metadata: expect.objectContaining({
            platform: "LINKEDIN",
            metricType: "followers",
            severity: "critical",
            direction: "spike",
          }),
        }),
      });

      const inAppResult = result.channels.find((c) => c.channel === "in_app");
      expect(inAppResult?.status).toBe("sent");
      expect(inAppResult?.messageId).toBe("notif-1");
    });

    it("handles in-app notification creation failure gracefully", async () => {
      // Setup preferences with inApp enabled
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
        settings: {
          notifications: {
            channels: { email: false, slack: false, inApp: true, push: false },
            minSeverity: "warning",
          },
        },
      } as never);

      // Mock notification creation failure
      vi.mocked(prisma.notification.create).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await sendNotification(mockNotification);

      // Should still return success overall (graceful degradation)
      const inAppResult = result.channels.find((c) => c.channel === "in_app");
      expect(inAppResult?.status).toBe("failed");
      expect(inAppResult?.error).toContain("Database connection failed");
    });

    it("maps priority correctly", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
        settings: {
          notifications: {
            channels: { email: false, slack: false, inApp: true, push: false },
            minSeverity: "warning",
          },
        },
      } as never);

      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
      } as never);

      const priorities = [
        { input: "low", expected: "LOW" },
        { input: "medium", expected: "MEDIUM" },
        { input: "high", expected: "HIGH" },
        { input: "urgent", expected: "URGENT" },
      ] as const;

      for (const { input, expected } of priorities) {
        vi.clearAllMocks();
        vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
          id: "ws-1",
          name: "Test Workspace",
          settings: {
            notifications: {
              channels: { email: false, slack: false, inApp: true, push: false },
              minSeverity: "warning",
            },
          },
        } as never);
        vi.mocked(prisma.notification.create).mockResolvedValue({
          id: "notif-1",
        } as never);

        await sendNotification({
          ...mockNotification,
          priority: input,
        });

        expect(prisma.notification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            priority: expected,
          }),
        });
      }
    });

    it("skips in-app notification when channel is disabled", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
        settings: {
          notifications: {
            channels: { email: false, slack: false, inApp: false, push: false },
            minSeverity: "warning",
          },
        },
      } as never);

      const result = await sendNotification(mockNotification);

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(result.channels.find((c) => c.channel === "in_app")).toBeUndefined();
    });
  });

  describe("sendAnomalyNotifications", () => {
    it("creates notifications for multiple anomalies", async () => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
        settings: {
          notifications: {
            channels: { email: false, slack: false, inApp: true, push: false },
            minSeverity: "warning",
          },
        },
      } as never);

      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
      } as never);

      const anomalies = [
        {
          accountId: "acc-1",
          accountName: "Account 1",
          platform: "TWITTER",
          metricType: "followers",
          currentValue: 1000,
          expectedValue: 500,
          percentChange: 100,
          severity: "warning" as const,
          direction: "spike" as const,
          zScore: 2.5,
        },
        {
          accountId: "acc-2",
          accountName: "Account 2",
          platform: "INSTAGRAM",
          metricType: "impressions",
          currentValue: 200,
          expectedValue: 1000,
          percentChange: -80,
          severity: "critical" as const,
          direction: "drop" as const,
          zScore: -3.5,
        },
      ];

      const results = await sendAnomalyNotifications("ws-1", anomalies, {
        workspaceName: "Test Workspace",
        dashboardUrl: "https://spike.land/orbit/test",
      });

      expect(results).toHaveLength(2);
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });
  });
});
