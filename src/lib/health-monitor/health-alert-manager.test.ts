/**
 * Health Alert Manager Tests
 *
 * Tests for health alert management functions.
 */

import type { SocialAccount, SocialAccountHealth } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sendEmail } from "@/lib/email/client";
import prisma from "@/lib/prisma";

import {
  createHealthEvent,
  detectAndLogStatusChange,
  getAccountHealthEvents,
  getRecentHealthEvents,
  logErrorEvent,
  logRateLimitEvent,
  logTokenExpiryEvent,
  sendHealthAlertEmail,
  sendHealthAlerts,
} from "./health-alert-manager";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    accountHealthEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    socialAccount: {
      findMany: vi.fn(),
    },
    workspaceMember: {
      findMany: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn(),
}));

describe("Health Alert Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createHealthEvent", () => {
    it("creates a health event record", async () => {
      vi.mocked(prisma.accountHealthEvent.create).mockResolvedValue({
        id: "event-1",
        accountId: "account-1",
        workspaceId: "workspace-1",
        eventType: "STATUS_CHANGED",
        severity: "WARNING",
        newStatus: "DEGRADED",
        newScore: 60,
        message: "Health degraded",
        createdAt: new Date(),
      } as never);

      const eventId = await createHealthEvent({
        accountId: "account-1",
        workspaceId: "workspace-1",
        eventType: "STATUS_CHANGED",
        severity: "WARNING",
        newStatus: "DEGRADED",
        newScore: 60,
        message: "Health degraded",
      });

      expect(eventId).toBe("event-1");
      expect(prisma.accountHealthEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accountId: "account-1",
          workspaceId: "workspace-1",
          eventType: "STATUS_CHANGED",
          severity: "WARNING",
        }),
      });
    });

    it("includes optional fields when provided", async () => {
      vi.mocked(prisma.accountHealthEvent.create).mockResolvedValue({
        id: "event-2",
      } as never);

      await createHealthEvent({
        accountId: "account-1",
        workspaceId: "workspace-1",
        eventType: "SCORE_DECREASED",
        severity: "INFO",
        previousStatus: "HEALTHY",
        newStatus: "DEGRADED",
        previousScore: 85,
        newScore: 65,
        message: "Score decreased",
        details: { reason: "API errors" },
      });

      expect(prisma.accountHealthEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          previousStatus: "HEALTHY",
          previousScore: 85,
          details: { reason: "API errors" },
        }),
      });
    });
  });

  describe("detectAndLogStatusChange", () => {
    const mockAccount: Partial<SocialAccount> = {
      id: "account-1",
      workspaceId: "workspace-1",
      platform: "TWITTER",
      accountName: "testaccount",
    };

    it("does not log event when no change", async () => {
      const health: Partial<SocialAccountHealth> = {
        healthScore: 90,
      };

      await detectAndLogStatusChange(
        mockAccount as SocialAccount,
        health as SocialAccountHealth,
        90,
        "HEALTHY",
      );

      expect(prisma.accountHealthEvent.create).not.toHaveBeenCalled();
    });

    it("logs STATUS_CHANGED event when status changes to CRITICAL", async () => {
      const health: Partial<SocialAccountHealth> = {
        healthScore: 15,
      };

      vi.mocked(prisma.accountHealthEvent.create).mockResolvedValue({
        id: "event-1",
      } as never);

      await detectAndLogStatusChange(
        mockAccount as SocialAccount,
        health as SocialAccountHealth,
        60,
        "DEGRADED",
      );

      expect(prisma.accountHealthEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "STATUS_CHANGED",
          severity: "CRITICAL",
          previousStatus: "DEGRADED",
          newStatus: "CRITICAL",
        }),
      });
    });

    it("logs ACCOUNT_RECOVERED when status becomes HEALTHY", async () => {
      const health: Partial<SocialAccountHealth> = {
        healthScore: 90,
      };

      vi.mocked(prisma.accountHealthEvent.create).mockResolvedValue({
        id: "event-1",
      } as never);

      await detectAndLogStatusChange(
        mockAccount as SocialAccount,
        health as SocialAccountHealth,
        40,
        "UNHEALTHY",
      );

      expect(prisma.accountHealthEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "ACCOUNT_RECOVERED",
          severity: "INFO",
          newStatus: "HEALTHY",
        }),
      });
    });

    it("logs SCORE_DECREASED when score drops without status change", async () => {
      const health: Partial<SocialAccountHealth> = {
        healthScore: 55,
      };

      vi.mocked(prisma.accountHealthEvent.create).mockResolvedValue({
        id: "event-1",
      } as never);

      await detectAndLogStatusChange(
        mockAccount as SocialAccount,
        health as SocialAccountHealth,
        70,
        "DEGRADED",
      );

      expect(prisma.accountHealthEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "SCORE_DECREASED",
        }),
      });
    });
  });

  describe("logRateLimitEvent", () => {
    const mockAccount: Partial<SocialAccount> = {
      id: "account-1",
      workspaceId: "workspace-1",
      platform: "TWITTER",
      accountName: "testaccount",
    };

    const mockHealth: Partial<SocialAccountHealth> = {
      healthScore: 60,
      rateLimitResetAt: new Date(),
    };

    it("logs rate limit hit event", async () => {
      vi.mocked(prisma.accountHealthEvent.create).mockResolvedValue({
        id: "event-1",
      } as never);

      await logRateLimitEvent(
        mockAccount as SocialAccount,
        mockHealth as SocialAccountHealth,
        true,
      );

      expect(prisma.accountHealthEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "RATE_LIMIT_HIT",
          severity: "WARNING",
          message: expect.stringContaining("Rate limit hit"),
        }),
      });
    });

    it("logs rate limit cleared event", async () => {
      vi.mocked(prisma.accountHealthEvent.create).mockResolvedValue({
        id: "event-1",
      } as never);

      await logRateLimitEvent(
        mockAccount as SocialAccount,
        mockHealth as SocialAccountHealth,
        false,
      );

      expect(prisma.accountHealthEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "RATE_LIMIT_CLEARED",
          severity: "INFO",
        }),
      });
    });
  });

  describe("logErrorEvent", () => {
    const mockAccount: Partial<SocialAccount> = {
      id: "account-1",
      workspaceId: "workspace-1",
      platform: "FACEBOOK",
      accountName: "testpage",
    };

    it("logs error with critical severity for many consecutive errors", async () => {
      const mockHealth: Partial<SocialAccountHealth> = {
        healthScore: 30,
        consecutiveErrors: 6,
      };

      vi.mocked(prisma.accountHealthEvent.create).mockResolvedValue({
        id: "event-1",
      } as never);

      await logErrorEvent(
        mockAccount as SocialAccount,
        mockHealth as SocialAccountHealth,
        "API connection failed",
      );

      expect(prisma.accountHealthEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "ERROR_OCCURRED",
          severity: "CRITICAL",
          message: expect.stringContaining("API connection failed"),
        }),
      });
    });

    it("logs error with warning severity for few errors", async () => {
      const mockHealth: Partial<SocialAccountHealth> = {
        healthScore: 70,
        consecutiveErrors: 1,
      };

      vi.mocked(prisma.accountHealthEvent.create).mockResolvedValue({
        id: "event-1",
      } as never);

      await logErrorEvent(
        mockAccount as SocialAccount,
        mockHealth as SocialAccountHealth,
        "Temporary error",
      );

      expect(prisma.accountHealthEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: "WARNING",
        }),
      });
    });
  });

  describe("logTokenExpiryEvent", () => {
    const mockAccount: Partial<SocialAccount> = {
      id: "account-1",
      workspaceId: "workspace-1",
      platform: "LINKEDIN",
      accountName: "testprofile",
    };

    const mockHealth: Partial<SocialAccountHealth> = {
      healthScore: 40,
      tokenExpiresAt: new Date(),
    };

    it("logs token expired event", async () => {
      vi.mocked(prisma.accountHealthEvent.create).mockResolvedValue({
        id: "event-1",
      } as never);

      await logTokenExpiryEvent(
        mockAccount as SocialAccount,
        mockHealth as SocialAccountHealth,
        true,
      );

      expect(prisma.accountHealthEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "TOKEN_EXPIRED",
          severity: "ERROR",
        }),
      });
    });

    it("logs token refreshed event", async () => {
      vi.mocked(prisma.accountHealthEvent.create).mockResolvedValue({
        id: "event-1",
      } as never);

      await logTokenExpiryEvent(
        mockAccount as SocialAccount,
        mockHealth as SocialAccountHealth,
        false,
      );

      expect(prisma.accountHealthEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "TOKEN_REFRESHED",
          severity: "INFO",
        }),
      });
    });
  });

  describe("sendHealthAlertEmail", () => {
    it("sends email with correct content", async () => {
      vi.mocked(sendEmail).mockResolvedValue({ success: true });

      await sendHealthAlertEmail(
        { email: "test@example.com", name: "Test User" },
        {
          accountName: "testaccount",
          platform: "TWITTER",
          healthScore: 25,
          status: "UNHEALTHY",
          issue: "Multiple sync failures",
          dashboardUrl: "https://spike.land/dashboard/health/account-1",
        },
      );

      expect(sendEmail).toHaveBeenCalledWith({
        to: "test@example.com",
        subject: expect.stringContaining("Account Health Alert: testaccount"),
        react: expect.anything(),
      });
    });

    it("uses correct emoji for CRITICAL status", async () => {
      vi.mocked(sendEmail).mockResolvedValue({ success: true });

      await sendHealthAlertEmail(
        { email: "test@example.com" },
        {
          accountName: "testaccount",
          platform: "FACEBOOK",
          healthScore: 10,
          status: "CRITICAL",
          issue: "Account suspended",
          dashboardUrl: "https://spike.land/dashboard",
        },
      );

      expect(sendEmail).toHaveBeenCalledWith({
        to: "test@example.com",
        subject: expect.stringContaining("🚨"),
        react: expect.anything(),
      });
    });
  });

  describe("getRecentHealthEvents", () => {
    it("returns recent events for workspace", async () => {
      const mockEvents = [
        {
          id: "event-1",
          accountId: "account-1",
          eventType: "STATUS_CHANGED",
          severity: "WARNING",
          message: "Health degraded",
          createdAt: new Date(),
          account: { accountName: "testaccount", platform: "TWITTER" },
        },
      ];

      vi.mocked(prisma.accountHealthEvent.findMany).mockResolvedValue(
        mockEvents as never,
      );

      const events = await getRecentHealthEvents("workspace-1", 20);

      expect(prisma.accountHealthEvent.findMany).toHaveBeenCalledWith({
        where: { workspaceId: "workspace-1" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          account: { select: { accountName: true, platform: true } },
        },
      });
      expect(events).toHaveLength(1);
      expect(events[0]!.accountName).toBe("testaccount");
    });
  });

  describe("getAccountHealthEvents", () => {
    it("returns events for specific account", async () => {
      const mockEvents = [
        {
          id: "event-1",
          eventType: "ERROR_OCCURRED",
          severity: "ERROR",
          previousStatus: null,
          newStatus: "UNHEALTHY",
          previousScore: null,
          newScore: 35,
          message: "API error",
          createdAt: new Date(),
          resolvedAt: null,
        },
      ];

      vi.mocked(prisma.accountHealthEvent.findMany).mockResolvedValue(
        mockEvents as never,
      );

      const events = await getAccountHealthEvents("account-1", 50);

      expect(prisma.accountHealthEvent.findMany).toHaveBeenCalledWith({
        where: { accountId: "account-1" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      expect(events).toHaveLength(1);
    });

    it("uses default limit when not specified", async () => {
      vi.mocked(prisma.accountHealthEvent.findMany).mockResolvedValue([]);

      await getAccountHealthEvents("account-1");

      expect(prisma.accountHealthEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });
  });

  describe("sendHealthAlerts", () => {
    const mockAccountWithHealth = {
      id: "account-1",
      workspaceId: "workspace-1",
      platform: "TWITTER",
      accountName: "testaccount",
      health: {
        healthScore: 25,
        isRateLimited: false,
        tokenRefreshRequired: false,
        consecutiveErrors: 1,
      },
    };

    const mockAdmin = {
      user: {
        email: "admin@example.com",
        name: "Admin User",
      },
    };

    beforeEach(() => {
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        slug: "test-workspace",
      } as never);
    });

    it("creates in-app notification when in_app channel is enabled", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        mockAccountWithHealth,
      ] as never);
      vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
        mockAdmin,
      ] as never);
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
      } as never);

      await sendHealthAlerts("workspace-1", {
        workspaceId: "workspace-1",
        alertOnScoreBelow: 50,
        alertOnRateLimit: true,
        alertOnTokenExpiry: true,
        minSeverity: "WARNING",
        notifyChannels: ["in_app"],
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: "workspace-1",
          type: "HEALTH_ALERT",
          title: "Account Health Alert: testaccount",
          entityType: "SocialAccount",
          entityId: "account-1",
          priority: "HIGH", // UNHEALTHY maps to ERROR which maps to HIGH
          metadata: expect.objectContaining({
            platform: "TWITTER",
            healthScore: 25,
            status: "UNHEALTHY",
          }),
        }),
      });
    });

    it("does not create in-app notification when in_app channel is not enabled", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        mockAccountWithHealth,
      ] as never);
      vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
        mockAdmin,
      ] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true });

      await sendHealthAlerts("workspace-1", {
        workspaceId: "workspace-1",
        alertOnScoreBelow: 50,
        alertOnRateLimit: true,
        alertOnTokenExpiry: true,
        minSeverity: "WARNING",
        notifyChannels: ["email"],
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it("sends both email and in-app notification when both channels are enabled", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        mockAccountWithHealth,
      ] as never);
      vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
        mockAdmin,
      ] as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true });
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
      } as never);

      const alertsSent = await sendHealthAlerts("workspace-1", {
        workspaceId: "workspace-1",
        alertOnScoreBelow: 50,
        alertOnRateLimit: true,
        alertOnTokenExpiry: true,
        minSeverity: "WARNING",
        notifyChannels: ["email", "in_app"],
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(alertsSent).toBe(1); // 1 email sent to admin
    });

    it("handles in-app notification creation failure gracefully", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        mockAccountWithHealth,
      ] as never);
      vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
        mockAdmin,
      ] as never);
      vi.mocked(prisma.notification.create).mockRejectedValue(
        new Error("Database error"),
      );

      // Should not throw, just log error
      const alertsSent = await sendHealthAlerts("workspace-1", {
        workspaceId: "workspace-1",
        alertOnScoreBelow: 50,
        alertOnRateLimit: true,
        alertOnTokenExpiry: true,
        minSeverity: "WARNING",
        notifyChannels: ["in_app"],
      });

      // alertsSent is 0 because no email was sent (only in_app)
      expect(alertsSent).toBe(0);
    });

    it("maps severity correctly to notification priority", async () => {
      // Test with CRITICAL status (healthScore < 20)
      const criticalAccount = {
        ...mockAccountWithHealth,
        health: {
          ...mockAccountWithHealth.health,
          healthScore: 10, // CRITICAL status
        },
      };

      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
        criticalAccount,
      ] as never);
      vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
        mockAdmin,
      ] as never);
      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: "notif-1",
      } as never);

      await sendHealthAlerts("workspace-1", {
        workspaceId: "workspace-1",
        alertOnScoreBelow: 50,
        alertOnRateLimit: true,
        alertOnTokenExpiry: true,
        minSeverity: "INFO",
        notifyChannels: ["in_app"],
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: "URGENT", // CRITICAL maps to URGENT
          metadata: expect.objectContaining({
            status: "CRITICAL",
            severity: "CRITICAL",
          }),
        }),
      });
    });

    it("returns 0 when no accounts need attention", async () => {
      vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([]);

      const alertsSent = await sendHealthAlerts("workspace-1", {
        workspaceId: "workspace-1",
        alertOnScoreBelow: 50,
        minSeverity: "WARNING",
        notifyChannels: ["in_app"],
      });

      expect(alertsSent).toBe(0);
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
