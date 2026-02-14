import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma
const mockPrisma = {
  app: {
    findMany: vi.fn(),
  },
  appMessage: {
    findMany: vi.fn(),
  },
  appCodeVersion: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

// Mock app-lookup
const mockFindAppByIdentifierSimple = vi.fn();
vi.mock("@/lib/app-lookup", () => ({
  findAppByIdentifierSimple: (...args: unknown[]) =>
    mockFindAppByIdentifierSimple(...args),
}));

import { createMockRegistry } from "../__test-utils__";
import { registerAppsTools } from "./apps";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("apps tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerAppsTools(registry, userId);
  });

  it("should register 11 apps tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(11);
    expect(registry.handlers.has("apps_create")).toBe(true);
    expect(registry.handlers.has("apps_list")).toBe(true);
    expect(registry.handlers.has("apps_get")).toBe(true);
    expect(registry.handlers.has("apps_chat")).toBe(true);
    expect(registry.handlers.has("apps_get_messages")).toBe(true);
    expect(registry.handlers.has("apps_set_status")).toBe(true);
    expect(registry.handlers.has("apps_bin")).toBe(true);
    expect(registry.handlers.has("apps_restore")).toBe(true);
    expect(registry.handlers.has("apps_delete_permanent")).toBe(true);
    expect(registry.handlers.has("apps_list_versions")).toBe(true);
    expect(registry.handlers.has("apps_batch_status")).toBe(true);
  });

  describe("apps_create", () => {
    it("should create an app via API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "app-1",
            name: "My App",
            slug: "my-app",
            status: "WAITING",
            codespaceId: "my-app",
            codespaceUrl: "/api/codespace/my-app/embed",
          }),
      });

      const handler = registry.handlers.get("apps_create")!;
      const result = await handler({
        prompt: "Build a todo app",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("App Created!");
      expect(text).toContain("My App");
      expect(text).toContain("app-1");
    });

    it("should pass optional params to API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "app-2",
            name: "Custom App",
            slug: "custom-slug",
            status: "WAITING",
            codespaceId: "custom-slug",
            codespaceUrl: "/api/codespace/custom-slug/embed",
          }),
      });

      const handler = registry.handlers.get("apps_create")!;
      await handler({
        prompt: "Build a dashboard",
        codespace_id: "custom-slug",
        image_ids: ["img-1"],
        template_id: "react-basic",
      });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.codespaceId).toBe("custom-slug");
      expect(body.imageIds).toEqual(["img-1"]);
      expect(body.templateId).toBe("react-basic");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        text: () => Promise.resolve(JSON.stringify({ error: "Name taken" })),
      });

      const handler = registry.handlers.get("apps_create")!;
      const result = await handler({ prompt: "test" });

      expect(result).toEqual(
        expect.objectContaining({ isError: true }),
      );
      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("CONFLICT");
    });
  });

  describe("apps_list", () => {
    it("should list user apps from prisma", async () => {
      mockPrisma.app.findMany.mockResolvedValue([
        {
          id: "app-1",
          name: "Todo App",
          slug: "todo-app",
          status: "LIVE",
          codespaceId: "todo-app",
          lastAgentActivity: null,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-02"),
          _count: { messages: 5, images: 2, codeVersions: 3 },
        },
      ]);

      const handler = registry.handlers.get("apps_list")!;
      const result = await handler({ limit: 20 });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("My Apps (1)");
      expect(text).toContain("Todo App");
      expect(text).toContain("LIVE");
      expect(text).toContain("todo-app");
    });

    it("should show empty message when no apps", async () => {
      mockPrisma.app.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("apps_list")!;
      const result = await handler({ limit: 20 });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("My Apps (0)");
      expect(text).toContain("apps_create");
    });

    it("should filter by status when provided", async () => {
      mockPrisma.app.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("apps_list")!;
      await handler({ status: "LIVE", limit: 10 });

      expect(mockPrisma.app.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "LIVE",
            userId,
            deletedAt: null,
          }),
        }),
      );
    });

    it("should handle database errors", async () => {
      mockPrisma.app.findMany.mockRejectedValue(new Error("DB error"));

      const handler = registry.handlers.get("apps_list")!;
      const result = await handler({ limit: 20 });

      expect(result).toEqual(
        expect.objectContaining({ isError: true }),
      );
    });
  });

  describe("apps_get", () => {
    it("should fetch app details via API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "app-1",
            name: "My App",
            slug: "my-app",
            description: "A test app",
            status: "LIVE",
            codespaceId: "my-app",
            codespaceUrl: "/api/codespace/my-app/embed",
            agentWorking: false,
            lastAgentActivity: null,
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-02T00:00:00Z",
          }),
      });

      const handler = registry.handlers.get("apps_get")!;
      const result = await handler({ app_id: "my-app" });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("App: My App");
      expect(text).toContain("LIVE");
      expect(text).toContain("Agent Working:** No");
    });

    it("should handle 404 errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify({ error: "App not found" })),
      });

      const handler = registry.handlers.get("apps_get")!;
      const result = await handler({ app_id: "nonexistent" });

      expect(result).toEqual(
        expect.objectContaining({ isError: true }),
      );
    });
  });

  describe("apps_chat", () => {
    it("should send message via API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "msg-1",
            content: "Build a todo app",
            role: "USER",
            createdAt: "2025-01-01T00:00:00Z",
          }),
      });

      const handler = registry.handlers.get("apps_chat")!;
      const result = await handler({
        app_id: "my-app",
        message: "Add dark mode",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Message Sent!");
      expect(text).toContain("msg-1");
    });
  });

  describe("apps_get_messages", () => {
    it("should list messages from prisma", async () => {
      mockFindAppByIdentifierSimple.mockResolvedValue({
        id: "app-1",
        slug: "my-app",
      });
      mockPrisma.appMessage.findMany.mockResolvedValue([
        {
          id: "msg-1",
          role: "USER",
          content: "Build a todo app",
          createdAt: new Date("2025-01-01"),
          codeVersion: null,
        },
        {
          id: "msg-2",
          role: "AGENT",
          content: "Here is your todo app",
          createdAt: new Date("2025-01-02"),
          codeVersion: { id: "v-1", hash: "abc123def" },
        },
      ]);

      const handler = registry.handlers.get("apps_get_messages")!;
      const result = await handler({ app_id: "my-app", limit: 20 });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Messages for my-app");
      expect(text).toContain("Build a todo app");
      expect(text).toContain("Agent");
      expect(text).toContain("abc123de");
    });

    it("should return error when app not found", async () => {
      mockFindAppByIdentifierSimple.mockResolvedValue(null);

      const handler = registry.handlers.get("apps_get_messages")!;
      const result = await handler({ app_id: "nonexistent", limit: 20 });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("APP_NOT_FOUND");
    });

    it("should show empty message when no messages", async () => {
      mockFindAppByIdentifierSimple.mockResolvedValue({
        id: "app-1",
        slug: "my-app",
      });
      mockPrisma.appMessage.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("apps_get_messages")!;
      const result = await handler({ app_id: "my-app", limit: 20 });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("No messages yet");
    });
  });

  describe("apps_set_status", () => {
    it("should update status via API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const handler = registry.handlers.get("apps_set_status")!;
      const result = await handler({
        app_id: "my-app",
        status: "ARCHIVED",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Status Updated!");
      expect(text).toContain("ARCHIVED");
    });
  });

  describe("apps_bin", () => {
    it("should soft-delete via API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const handler = registry.handlers.get("apps_bin")!;
      const result = await handler({ app_id: "my-app" });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Moved to Bin!");
      expect(text).toContain("apps_restore");
    });
  });

  describe("apps_restore", () => {
    it("should restore from bin via API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const handler = registry.handlers.get("apps_restore")!;
      const result = await handler({ app_id: "my-app" });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Restored!");
    });
  });

  describe("apps_delete_permanent", () => {
    it("should require confirm=true", async () => {
      const handler = registry.handlers.get("apps_delete_permanent")!;
      const result = await handler({ app_id: "my-app", confirm: false });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Safety Check Failed");
    });

    it("should permanently delete when confirmed", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const handler = registry.handlers.get("apps_delete_permanent")!;
      const result = await handler({ app_id: "my-app", confirm: true });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Permanently Deleted!");
    });
  });

  describe("apps_list_versions", () => {
    it("should list code versions from prisma", async () => {
      mockFindAppByIdentifierSimple.mockResolvedValue({
        id: "app-1",
        slug: "my-app",
      });
      mockPrisma.appCodeVersion.findMany.mockResolvedValue([
        {
          id: "v-1",
          hash: "abc123def456",
          description: "Initial version",
          createdAt: new Date("2025-01-01"),
        },
      ]);

      const handler = registry.handlers.get("apps_list_versions")!;
      const result = await handler({ app_id: "my-app", limit: 10 });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Versions for my-app");
      expect(text).toContain("abc123de");
      expect(text).toContain("Initial version");
    });

    it("should return error when app not found", async () => {
      mockFindAppByIdentifierSimple.mockResolvedValue(null);

      const handler = registry.handlers.get("apps_list_versions")!;
      const result = await handler({ app_id: "nope", limit: 10 });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("APP_NOT_FOUND");
    });
  });

  describe("apps_batch_status", () => {
    it("should update multiple apps", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const handler = registry.handlers.get("apps_batch_status")!;
      const result = await handler({
        app_ids: ["app-1", "app-2"],
        status: "ARCHIVED",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Batch Status Update");
      expect(text).toContain("Succeeded:** 2/2");
    });

    it("should report failures in batch", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: () =>
            Promise.resolve(JSON.stringify({ error: "App not found" })),
        });

      const handler = registry.handlers.get("apps_batch_status")!;
      const result = await handler({
        app_ids: ["app-1", "app-2"],
        status: "ARCHIVED",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Succeeded:** 1/2");
      expect(text).toContain("Failed:");
      expect(text).toContain("app-2");
    });
  });
});
