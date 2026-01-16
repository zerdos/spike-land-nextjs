import { sendEmail } from "@/lib/email/client";
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

describe("GuardrailAlertService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_WEBHOOK_URL = "";
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
    });

    it("should send slack notification if configured", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/xxx";

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

      expect(postToSlack).toHaveBeenCalled();
    });
  });
});
