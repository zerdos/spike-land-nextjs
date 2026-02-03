import { sendEmail } from "@/lib/email/client";
import { getWorkspacePreferences } from "@/lib/notifications/channel-manager";
import { postToSlack } from "@/lib/notifications/slack-channel";
import prisma from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuardrailAlertService } from "./guardrail-alert-service";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    allocatorGuardrailAlert: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/notifications/slack-channel", () => ({
  postToSlack: vi.fn(),
}));

vi.mock("@/lib/notifications/channel-manager", () => ({
  getWorkspacePreferences: vi.fn(),
}));

describe("GuardrailAlertService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation for preferences
    (getWorkspacePreferences as any).mockResolvedValue({
      channels: { slack: false },
      slackWebhookUrl: undefined,
    });
  });

  describe("createAlert", () => {
    it("should create an alert and send notifications", async () => {
      const mockAlert = {
        id: "alert-1",
        workspaceId: "ws-1",
        alertType: "BUDGET_FLOOR_HIT",
        severity: "WARNING",
        message: "Budget too low",
        metadata: { suggested: 100, min: 200 },
      };

      (prisma.allocatorGuardrailAlert.create as any).mockResolvedValue(
        mockAlert,
      );

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
        slug: "test-ws",
        members: [
          { user: { email: "owner@test.com" } },
        ],
      });

      await GuardrailAlertService.createAlert({
        workspaceId: "ws-1",
        alertType: "BUDGET_FLOOR_HIT",
        severity: "WARNING",
        message: "Budget too low",
        metadata: { suggested: 100, min: 200 },
      });

      expect(prisma.allocatorGuardrailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: "ws-1",
          alertType: "BUDGET_FLOOR_HIT",
          severity: "WARNING",
        }),
      });

      expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        include: expect.any(Object),
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(getWorkspacePreferences).toHaveBeenCalledWith("ws-1");
    });

    it("should send slack notification if configured", async () => {
      // Mock preferences to have slack enabled
      (getWorkspacePreferences as any).mockResolvedValue({
        channels: { slack: true },
        slackWebhookUrl: "https://hooks.slack.com/services/xxx",
      });

      const mockAlert = {
        id: "alert-1",
        workspaceId: "ws-1",
        alertType: "EMERGENCY_STOP",
        severity: "CRITICAL",
        message: "Stop",
      };

      (prisma.allocatorGuardrailAlert.create as any).mockResolvedValue(
        mockAlert,
      );
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
        members: [],
      });

      await GuardrailAlertService.createAlert({
        workspaceId: "ws-1",
        alertType: "EMERGENCY_STOP_ACTIVATED",
        severity: "CRITICAL",
        message: "Stop",
      } as any);

      expect(getWorkspacePreferences).toHaveBeenCalledWith("ws-1");
      expect(postToSlack).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/xxx",
        expect.objectContaining({
          text: expect.stringContaining("CRITICAL"),
        }),
      );
    });

    it("should NOT send slack notification if slack channel is disabled", async () => {
      // Mock preferences to have slack disabled but webhook present
      (getWorkspacePreferences as any).mockResolvedValue({
        channels: { slack: false },
        slackWebhookUrl: "https://hooks.slack.com/services/xxx",
      });

      const mockAlert = {
        id: "alert-1",
        workspaceId: "ws-1",
        alertType: "EMERGENCY_STOP",
        severity: "CRITICAL",
        message: "Stop",
      };

      (prisma.allocatorGuardrailAlert.create as any).mockResolvedValue(
        mockAlert,
      );
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
        members: [],
      });

      await GuardrailAlertService.createAlert({
        workspaceId: "ws-1",
        alertType: "EMERGENCY_STOP_ACTIVATED",
        severity: "CRITICAL",
        message: "Stop",
      } as any);

      expect(getWorkspacePreferences).toHaveBeenCalledWith("ws-1");
      expect(postToSlack).not.toHaveBeenCalled();
    });

    it("should NOT send slack notification if webhook is missing", async () => {
      // Mock preferences to have slack enabled but no webhook
      (getWorkspacePreferences as any).mockResolvedValue({
        channels: { slack: true },
        slackWebhookUrl: undefined,
      });

      const mockAlert = {
        id: "alert-1",
        workspaceId: "ws-1",
        alertType: "EMERGENCY_STOP",
        severity: "CRITICAL",
        message: "Stop",
      };

      (prisma.allocatorGuardrailAlert.create as any).mockResolvedValue(
        mockAlert,
      );
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: "ws-1",
        name: "Test Workspace",
        members: [],
      });

      await GuardrailAlertService.createAlert({
        workspaceId: "ws-1",
        alertType: "EMERGENCY_STOP_ACTIVATED",
        severity: "CRITICAL",
        message: "Stop",
      } as any);

      expect(getWorkspacePreferences).toHaveBeenCalledWith("ws-1");
      expect(postToSlack).not.toHaveBeenCalled();
    });
  });
});
