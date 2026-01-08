/**
 * Tests for Slack Notification Channel
 *
 * Resolves #648
 */

import type { SocialPlatform } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSlackMessage, isValidSlackWebhookUrl, sendSlackNotification } from "./slack-channel";
import type { PulseAnomalyNotification } from "./types";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Slack Channel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isValidSlackWebhookUrl", () => {
    it("should validate correct Slack webhook URLs", () => {
      expect(
        isValidSlackWebhookUrl(
          "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
        ),
      ).toBe(true);
    });

    it("should reject non-Slack URLs", () => {
      expect(isValidSlackWebhookUrl("https://example.com/webhook")).toBe(false);
      expect(isValidSlackWebhookUrl("https://hooks.slack.com/")).toBe(false);
    });

    it("should reject HTTP URLs", () => {
      expect(
        isValidSlackWebhookUrl(
          "http://hooks.slack.com/services/T00/B00/XXX",
        ),
      ).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(isValidSlackWebhookUrl("not-a-url")).toBe(false);
      expect(isValidSlackWebhookUrl("")).toBe(false);
    });
  });

  describe("buildSlackMessage", () => {
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

    it("should build a valid Slack message", () => {
      const message = buildSlackMessage(mockNotification);

      expect(message.text).toContain("CRITICAL");
      expect(message.text).toContain("followers");
      expect(message.text).toContain("Test Account");
      expect(message.attachments).toBeDefined();
      expect(message.attachments![0]!.color).toBe("#dc2626"); // Critical color
    });

    it("should use warning color for warning severity", () => {
      const warningNotification = {
        ...mockNotification,
        anomaly: {
          ...mockNotification.anomaly,
          severity: "warning" as const,
        },
      };

      const message = buildSlackMessage(warningNotification);
      expect(message.attachments![0]!.color).toBe("#f59e0b"); // Warning color
    });

    it("should include dashboard button when URL is provided", () => {
      const message = buildSlackMessage(mockNotification);
      const blocks = message.attachments![0]!.blocks || [];

      const hasButton = blocks.some(
        (block) => block.type === "section" && block.accessory?.type === "button",
      );
      expect(hasButton).toBe(true);
    });

    it("should not include button when no dashboard URL", () => {
      const noUrlNotification = {
        ...mockNotification,
        dashboardUrl: undefined,
      };

      const message = buildSlackMessage(noUrlNotification);
      const blocks = message.attachments![0]!.blocks || [];

      const hasButton = blocks.some(
        (block) => block.type === "section" && block.accessory?.type === "button",
      );
      expect(hasButton).toBe(false);
    });
  });

  describe("sendSlackNotification", () => {
    const mockNotification: PulseAnomalyNotification = {
      type: "pulse_anomaly",
      workspaceId: "ws-1",
      workspaceName: "Test Workspace",
      title: "Warning anomaly detected",
      message: "impressions drop detected",
      priority: "high",
      timestamp: new Date(),
      anomaly: {
        accountId: "account-1",
        accountName: "Test Account",
        platform: "INSTAGRAM" as SocialPlatform,
        metricType: "impressions",
        currentValue: 500,
        expectedValue: 1000,
        percentChange: -50,
        severity: "warning",
        direction: "drop",
        zScore: -2.5,
      },
    };

    it("should return skipped when webhook URL is empty", async () => {
      const result = await sendSlackNotification("", mockNotification);

      expect(result.status).toBe("skipped");
      expect(result.error).toContain("not configured");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should send notification successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("ok"),
      });

      const result = await sendSlackNotification(
        "https://hooks.slack.com/services/T00/B00/XXX",
        mockNotification,
      );

      expect(result.status).toBe("sent");
      expect(result.channel).toBe("slack");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/T00/B00/XXX",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("invalid_payload"),
      });

      const result = await sendSlackNotification(
        "https://hooks.slack.com/services/T00/B00/XXX",
        mockNotification,
      );

      expect(result.status).toBe("failed");
      expect(result.error).toContain("400");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await sendSlackNotification(
        "https://hooks.slack.com/services/T00/B00/XXX",
        mockNotification,
      );

      expect(result.status).toBe("failed");
      expect(result.error).toContain("Network error");
    });
  });
});
