import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  emailLog: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerEmailTools } from "./email";

describe("email tools", () => {
  const userId = "test-user-123";
  const wsId = "ws-1";
  const mockWorkspace = { id: wsId, slug: "my-ws", name: "My Workspace" };
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerEmailTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue(mockWorkspace);
  });

  it("should register 3 email tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(3);
    expect(registry.handlers.has("email_send")).toBe(true);
    expect(registry.handlers.has("email_get_status")).toBe(true);
    expect(registry.handlers.has("email_list")).toBe(true);
  });

  describe("email_send", () => {
    it("should create an email log with SENT status", async () => {
      mockPrisma.emailLog.create.mockResolvedValue({ id: "email-1" });
      const handler = registry.handlers.get("email_send")!;
      const result = await handler({
        workspace_slug: "my-ws",
        to: "recipient@example.com",
        subject: "Hello",
        template: "welcome",
      });
      const text = getText(result);
      expect(text).toContain("Email Queued");
      expect(text).toContain("email-1");
      expect(text).toContain("recipient@example.com");
      expect(text).toContain("SENT");
      expect(mockPrisma.emailLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          to: "recipient@example.com",
          subject: "Hello",
          template: "welcome",
          status: "SENT",
        }),
      });
    });
  });

  describe("email_get_status", () => {
    it("should return email delivery status", async () => {
      mockPrisma.emailLog.findFirst.mockResolvedValue({
        id: "email-1",
        to: "user@example.com",
        subject: "Hello",
        status: "DELIVERED",
        openedAt: new Date("2025-06-01"),
        clickedAt: null,
        bouncedAt: null,
      });
      const handler = registry.handlers.get("email_get_status")!;
      const result = await handler({ workspace_slug: "my-ws", email_id: "email-1" });
      const text = getText(result);
      expect(text).toContain("Email Status");
      expect(text).toContain("DELIVERED");
      expect(text).toContain("Opened:");
      expect(text).toContain("Clicked:** No");
    });

    it("should return NOT_FOUND for missing email", async () => {
      mockPrisma.emailLog.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("email_get_status")!;
      const result = await handler({ workspace_slug: "my-ws", email_id: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("email_list", () => {
    it("should list email logs", async () => {
      mockPrisma.emailLog.findMany.mockResolvedValue([
        { id: "e-1", subject: "Welcome", to: "a@test.com", status: "SENT", sentAt: new Date("2025-06-01") },
      ]);
      const handler = registry.handlers.get("email_list")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Email Logs");
      expect(text).toContain("Welcome");
    });

    it("should return message when no emails found", async () => {
      mockPrisma.emailLog.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("email_list")!;
      const result = await handler({ workspace_slug: "my-ws" });
      expect(getText(result)).toContain("No email records found");
    });
  });
});
