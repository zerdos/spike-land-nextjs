import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  crisisDetectionEvent: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  crisisResponseTemplate: { findMany: vi.fn(), findFirst: vi.fn() },
  crisisResponse: { create: vi.fn() },
  socialAccount: { updateMany: vi.fn() },
  allocatorAutopilotConfig: { updateMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerCrisisTools } from "./crisis";

describe("crisis tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerCrisisTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue({
      id: "ws-1", slug: "test-ws", name: "Test Workspace",
    });
  });

  it("should register 5 crisis tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("crisis_detect")).toBe(true);
    expect(registry.handlers.has("crisis_get_timeline")).toBe(true);
    expect(registry.handlers.has("crisis_pause_automation")).toBe(true);
    expect(registry.handlers.has("crisis_get_templates")).toBe(true);
    expect(registry.handlers.has("crisis_respond")).toBe(true);
  });

  describe("crisis_detect", () => {
    it("should return active crises", async () => {
      mockPrisma.crisisDetectionEvent.findMany.mockResolvedValue([
        {
          id: "cr-1",
          crisisType: "BRAND_ATTACK",
          severity: "HIGH",
          affectedAccounts: 3,
          detectedAt: new Date("2025-06-01T10:00:00Z"),
        },
      ]);

      const handler = registry.handlers.get("crisis_detect")!;
      const result = await handler({ workspace_slug: "test-ws" });

      const text = getText(result);
      expect(text).toContain("Active Crises");
      expect(text).toContain("cr-1");
      expect(text).toContain("BRAND_ATTACK");
      expect(text).toContain("HIGH");
      expect(text).toContain("3");
    });

    it("should filter by severity", async () => {
      mockPrisma.crisisDetectionEvent.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("crisis_detect")!;
      await handler({ workspace_slug: "test-ws", severity: "CRITICAL" });

      expect(mockPrisma.crisisDetectionEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ severity: "CRITICAL" }),
        }),
      );
    });

    it("should return empty message when no crises", async () => {
      mockPrisma.crisisDetectionEvent.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("crisis_detect")!;
      const result = await handler({ workspace_slug: "test-ws" });

      expect(getText(result)).toContain("No active crises detected");
    });

    it("should handle null affectedAccounts", async () => {
      mockPrisma.crisisDetectionEvent.findMany.mockResolvedValue([
        {
          id: "cr-2",
          crisisType: "CONTENT_LEAK",
          severity: "MEDIUM",
          affectedAccounts: null,
          detectedAt: new Date("2025-06-01"),
        },
      ]);

      const handler = registry.handlers.get("crisis_detect")!;
      const result = await handler({ workspace_slug: "test-ws" });

      expect(getText(result)).toContain("0");
    });
  });

  describe("crisis_get_timeline", () => {
    it("should return crisis timeline with responses", async () => {
      mockPrisma.crisisDetectionEvent.findFirst.mockResolvedValue({
        id: "cr-1",
        crisisType: "BRAND_ATTACK",
        severity: "HIGH",
        isResolved: false,
        detectedAt: new Date("2025-06-01T10:00:00Z"),
        responses: [
          {
            action: "TEMPLATE_RESPONSE",
            content: "We are investigating the issue",
            respondedAt: new Date("2025-06-01T10:30:00Z"),
          },
        ],
      });

      const handler = registry.handlers.get("crisis_get_timeline")!;
      const result = await handler({
        workspace_slug: "test-ws",
        crisis_id: "cr-1",
      });

      const text = getText(result);
      expect(text).toContain("Crisis Timeline");
      expect(text).toContain("BRAND_ATTACK");
      expect(text).toContain("Active");
      expect(text).toContain("TEMPLATE_RESPONSE");
      expect(text).toContain("We are investigating");
    });

    it("should show no responses message when empty", async () => {
      mockPrisma.crisisDetectionEvent.findFirst.mockResolvedValue({
        id: "cr-1",
        crisisType: "PR_CRISIS",
        severity: "LOW",
        isResolved: true,
        detectedAt: new Date("2025-06-01"),
        responses: [],
      });

      const handler = registry.handlers.get("crisis_get_timeline")!;
      const result = await handler({
        workspace_slug: "test-ws",
        crisis_id: "cr-1",
      });

      const text = getText(result);
      expect(text).toContain("No responses yet");
      expect(text).toContain("Resolved");
    });

    it("should return NOT_FOUND for missing crisis", async () => {
      mockPrisma.crisisDetectionEvent.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("crisis_get_timeline")!;
      const result = await handler({
        workspace_slug: "test-ws",
        crisis_id: "nonexistent",
      });

      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("crisis_pause_automation", () => {
    it("should pause all accounts when no account_ids specified", async () => {
      mockPrisma.socialAccount.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.allocatorAutopilotConfig.updateMany.mockResolvedValue({ count: 3 });

      const handler = registry.handlers.get("crisis_pause_automation")!;
      const result = await handler({
        workspace_slug: "test-ws",
        reason: "Brand crisis detected",
        confirm: true,
      });

      const text = getText(result);
      expect(text).toContain("Automation Paused");
      expect(text).toContain("5");
      expect(text).toContain("All accounts");
      expect(text).toContain("Brand crisis detected");
    });

    it("should pause specific accounts when account_ids provided", async () => {
      mockPrisma.socialAccount.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.allocatorAutopilotConfig.updateMany.mockResolvedValue({ count: 1 });

      const handler = registry.handlers.get("crisis_pause_automation")!;
      const result = await handler({
        workspace_slug: "test-ws",
        account_ids: ["acc-1", "acc-2"],
        reason: "Targeted pause",
        confirm: true,
      });

      const text = getText(result);
      expect(text).toContain("2");
      expect(text).toContain("Selected accounts");
      expect(mockPrisma.socialAccount.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ["acc-1", "acc-2"] } }),
        }),
      );
    });

    it("should reject without confirmation", async () => {
      const handler = registry.handlers.get("crisis_pause_automation")!;
      const result = await handler({
        workspace_slug: "test-ws",
        reason: "Testing",
        confirm: false,
      });

      expect(getText(result)).toContain("VALIDATION_ERROR");
      expect(mockPrisma.socialAccount.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("crisis_get_templates", () => {
    it("should return templates", async () => {
      mockPrisma.crisisResponseTemplate.findMany.mockResolvedValue([
        {
          id: "tpl-1",
          crisisType: "BRAND_ATTACK",
          name: "Brand Defense",
          tone: "professional",
          content: "We take this seriously...",
        },
      ]);

      const handler = registry.handlers.get("crisis_get_templates")!;
      const result = await handler({ workspace_slug: "test-ws" });

      const text = getText(result);
      expect(text).toContain("Crisis Response Templates");
      expect(text).toContain("tpl-1");
      expect(text).toContain("BRAND_ATTACK");
      expect(text).toContain("Brand Defense");
      expect(text).toContain("professional");
    });

    it("should filter by crisis type", async () => {
      mockPrisma.crisisResponseTemplate.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("crisis_get_templates")!;
      await handler({ workspace_slug: "test-ws", crisis_type: "PR_CRISIS" });

      expect(mockPrisma.crisisResponseTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ crisisType: "PR_CRISIS" }),
        }),
      );
    });

    it("should return empty message when no templates", async () => {
      mockPrisma.crisisResponseTemplate.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("crisis_get_templates")!;
      const result = await handler({ workspace_slug: "test-ws" });

      expect(getText(result)).toContain("No templates found");
    });
  });

  describe("crisis_respond", () => {
    it("should respond using template", async () => {
      mockPrisma.crisisDetectionEvent.findFirst.mockResolvedValue({
        id: "cr-1",
        crisisType: "BRAND_ATTACK",
      });
      mockPrisma.crisisResponseTemplate.findFirst.mockResolvedValue({
        id: "tpl-1",
        content: "We are aware of the situation and taking immediate action.",
        isActive: true,
      });
      mockPrisma.crisisResponse.create.mockResolvedValue({ id: "resp-1" });
      mockPrisma.crisisDetectionEvent.update.mockResolvedValue({ id: "cr-1" });

      const handler = registry.handlers.get("crisis_respond")!;
      const result = await handler({
        workspace_slug: "test-ws",
        crisis_id: "cr-1",
        template_id: "tpl-1",
      });

      const text = getText(result);
      expect(text).toContain("Crisis Response Recorded");
      expect(text).toContain("Template");
      expect(text).toContain("We are aware");
      expect(text).toContain("RESPONDED");
    });

    it("should respond with custom response", async () => {
      mockPrisma.crisisDetectionEvent.findFirst.mockResolvedValue({
        id: "cr-1",
        crisisType: "CONTENT_LEAK",
      });
      mockPrisma.crisisResponse.create.mockResolvedValue({ id: "resp-2" });
      mockPrisma.crisisDetectionEvent.update.mockResolvedValue({ id: "cr-1" });

      const handler = registry.handlers.get("crisis_respond")!;
      const result = await handler({
        workspace_slug: "test-ws",
        crisis_id: "cr-1",
        custom_response: "We are investigating this matter.",
      });

      const text = getText(result);
      expect(text).toContain("Custom");
      expect(text).toContain("We are investigating");
    });

    it("should return error when neither template nor custom response", async () => {
      mockPrisma.crisisDetectionEvent.findFirst.mockResolvedValue({
        id: "cr-1",
        crisisType: "BRAND_ATTACK",
      });

      const handler = registry.handlers.get("crisis_respond")!;
      const result = await handler({
        workspace_slug: "test-ws",
        crisis_id: "cr-1",
      });

      expect(getText(result)).toContain("VALIDATION_ERROR");
    });

    it("should return NOT_FOUND for missing crisis", async () => {
      mockPrisma.crisisDetectionEvent.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("crisis_respond")!;
      const result = await handler({
        workspace_slug: "test-ws",
        crisis_id: "nonexistent",
        custom_response: "Response text",
      });

      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should return NOT_FOUND for inactive template", async () => {
      mockPrisma.crisisDetectionEvent.findFirst.mockResolvedValue({
        id: "cr-1",
        crisisType: "BRAND_ATTACK",
      });
      mockPrisma.crisisResponseTemplate.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("crisis_respond")!;
      const result = await handler({
        workspace_slug: "test-ws",
        crisis_id: "cr-1",
        template_id: "nonexistent",
      });

      expect(getText(result)).toContain("NOT_FOUND");
      expect(getText(result)).toContain("template");
    });
  });
});
