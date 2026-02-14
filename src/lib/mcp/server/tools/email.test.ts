import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  emailRecord: { create: vi.fn(), findFirst: vi.fn() },
  emailTemplate: { findFirst: vi.fn() },
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
    expect(registry.handlers.has("email_send_template")).toBe(true);
    expect(registry.handlers.has("email_get_status")).toBe(true);
  });

  describe("email_send", () => {
    it("should create an email record with PENDING status", async () => {
      mockPrisma.emailRecord.create.mockResolvedValue({ id: "email-1" });
      const handler = registry.handlers.get("email_send")!;
      const result = await handler({
        workspace_slug: "my-ws",
        to: "recipient@example.com",
        subject: "Hello",
        body: "World",
      });
      const text = getText(result);
      expect(text).toContain("Email Queued");
      expect(text).toContain("email-1");
      expect(text).toContain("recipient@example.com");
      expect(text).toContain("PENDING");
      expect(mockPrisma.emailRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: wsId,
          senderId: userId,
          to: "recipient@example.com",
          subject: "Hello",
          body: "World",
          replyTo: null,
          status: "PENDING",
        }),
      });
    });

    it("should include reply_to when provided", async () => {
      mockPrisma.emailRecord.create.mockResolvedValue({ id: "email-2" });
      const handler = registry.handlers.get("email_send")!;
      await handler({
        workspace_slug: "my-ws",
        to: "r@example.com",
        subject: "Re: Hello",
        body: "Reply body",
        reply_to: "sender@example.com",
      });
      expect(mockPrisma.emailRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ replyTo: "sender@example.com" }),
      });
    });
  });

  describe("email_send_template", () => {
    it("should create email from template", async () => {
      mockPrisma.emailTemplate.findFirst.mockResolvedValue({
        id: "tmpl-1",
        name: "welcome",
        subject: "Welcome {{name}}",
        body: "Hello {{name}}, welcome!",
      });
      mockPrisma.emailRecord.create.mockResolvedValue({ id: "email-3" });
      const handler = registry.handlers.get("email_send_template")!;
      const result = await handler({
        workspace_slug: "my-ws",
        template_name: "welcome",
        to: "user@example.com",
        variables: '{"name":"Alice"}',
      });
      const text = getText(result);
      expect(text).toContain("Templated Email Queued");
      expect(text).toContain("email-3");
      expect(text).toContain("welcome");
      expect(mockPrisma.emailRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          templateId: "tmpl-1",
          variables: '{"name":"Alice"}',
        }),
      });
    });

    it("should return NOT_FOUND for missing template", async () => {
      mockPrisma.emailTemplate.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("email_send_template")!;
      const result = await handler({
        workspace_slug: "my-ws",
        template_name: "nonexistent",
        to: "user@example.com",
        variables: "{}",
      });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("email_get_status", () => {
    it("should return email delivery status", async () => {
      mockPrisma.emailRecord.findFirst.mockResolvedValue({
        id: "email-1",
        to: "user@example.com",
        subject: "Hello",
        status: "DELIVERED",
        opened: true,
        clicked: false,
        bounced: false,
      });
      const handler = registry.handlers.get("email_get_status")!;
      const result = await handler({ workspace_slug: "my-ws", email_id: "email-1" });
      const text = getText(result);
      expect(text).toContain("Email Status");
      expect(text).toContain("DELIVERED");
      expect(text).toContain("Opened:** true");
      expect(text).toContain("Clicked:** false");
    });

    it("should return NOT_FOUND for missing email", async () => {
      mockPrisma.emailRecord.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("email_get_status")!;
      const result = await handler({ workspace_slug: "my-ws", email_id: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });
});
