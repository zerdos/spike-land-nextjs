import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma
const mockPrisma = {
  workspace: {
    findFirst: vi.fn(),
  },
  inboxItem: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import type { ToolRegistry } from "../tool-registry";
import { registerOrbitInboxTools } from "./orbit-inbox";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockRegistry(): ToolRegistry & {
  handlers: Map<string, (...args: unknown[]) => unknown>;
} {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const registry = {
    register: vi.fn(
      (def: { name: string; handler: (...args: unknown[]) => unknown }) => {
        handlers.set(def.name, def.handler);
      },
    ),
    handlers,
  };
  return registry as unknown as ToolRegistry & {
    handlers: Map<string, (...args: unknown[]) => unknown>;
  };
}

describe("orbit-inbox tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerOrbitInboxTools(registry, userId);
  });

  it("should register 7 inbox tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(7);
    expect(registry.handlers.has("inbox_list")).toBe(true);
    expect(registry.handlers.has("inbox_get")).toBe(true);
    expect(registry.handlers.has("inbox_reply")).toBe(true);
    expect(registry.handlers.has("inbox_analyze")).toBe(true);
    expect(registry.handlers.has("inbox_suggest_replies")).toBe(true);
    expect(registry.handlers.has("inbox_escalate")).toBe(true);
    expect(registry.handlers.has("inbox_batch_reply")).toBe(true);
  });

  describe("inbox_list", () => {
    it("should list inbox items", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockPrisma.inboxItem.findMany.mockResolvedValue([
        {
          id: "item-1",
          type: "MENTION",
          status: "UNREAD",
          platform: "TWITTER",
          senderName: "John Doe",
          senderHandle: "johndoe",
          content: "Hey @spike great product!",
          sentiment: "POSITIVE",
          sentimentScore: 0.9,
          priorityScore: 8,
          receivedAt: new Date("2025-01-15"),
          account: { accountName: "@spike" },
        },
      ]);

      const handler = registry.handlers.get("inbox_list")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        limit: 20,
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Inbox for My Workspace (1)");
      expect(text).toContain("John Doe");
      expect(text).toContain("TWITTER");
      expect(text).toContain("POSITIVE");
      expect(text).toContain("item-1");
    });

    it("should return error when workspace not found", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("inbox_list")!;
      const result = await handler({
        workspace_slug: "nonexistent",
        limit: 20,
      });

      expect(result).toEqual(
        expect.objectContaining({ isError: true }),
      );
    });

    it("should show empty message when no items", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockPrisma.inboxItem.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("inbox_list")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        limit: 20,
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Inbox for My Workspace (0)");
    });

    it("should apply filters when provided", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockPrisma.inboxItem.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("inbox_list")!;
      await handler({
        workspace_slug: "my-workspace",
        status: "REPLIED",
        platform: "LINKEDIN",
        sentiment: "NEGATIVE",
        limit: 10,
      });

      expect(mockPrisma.inboxItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: "ws-1",
            status: "REPLIED",
            platform: "LINKEDIN",
            sentiment: "NEGATIVE",
          }),
          take: 10,
        }),
      );
    });
  });

  describe("inbox_get", () => {
    it("should get full inbox item details", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockPrisma.inboxItem.findFirst.mockResolvedValue({
        id: "item-1",
        type: "COMMENT",
        status: "UNREAD",
        platform: "INSTAGRAM",
        senderName: "Jane",
        senderHandle: "jane_doe",
        content: "Love this post!",
        originalPostContent: "Check out our new feature",
        sentiment: "POSITIVE",
        sentimentScore: 0.95,
        priorityScore: 7,
        receivedAt: new Date("2025-01-15"),
        escalationStatus: "NONE",
        account: { accountName: "spike_official", platform: "INSTAGRAM" },
        suggestedResponses: [
          {
            id: "sr-1",
            content: "Thank you!",
            confidence: 0.9,
            strategy: "gratitude",
          },
        ],
        drafts: [
          {
            id: "d-1",
            content: "Thanks for the kind words!",
            status: "PENDING",
            confidenceScore: 0.85,
          },
        ],
      });

      const handler = registry.handlers.get("inbox_get")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        item_id: "item-1",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Inbox Item: Jane");
      expect(text).toContain("INSTAGRAM");
      expect(text).toContain("Love this post!");
      expect(text).toContain("Original Post:");
      expect(text).toContain("AI Suggestions:");
      expect(text).toContain("Relay Drafts:");
    });

    it("should return error when item not found", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockPrisma.inboxItem.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("inbox_get")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        item_id: "nonexistent",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Not Found");
    });
  });

  describe("inbox_reply", () => {
    it("should send reply via API", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, sentAt: "2025-01-15T12:00:00Z" }),
      });

      const handler = registry.handlers.get("inbox_reply")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        item_id: "item-1",
        content: "Thanks for reaching out!",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Reply Sent!");
    });
  });

  describe("inbox_analyze", () => {
    it("should return analysis via API", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            sentiment: "POSITIVE",
            sentimentScore: 0.92,
            intent: "praise",
            urgency: "low",
            suggestedStrategy: "thank and engage",
            keyTopics: ["product", "feedback"],
          }),
      });

      const handler = registry.handlers.get("inbox_analyze")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        item_id: "item-1",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("POSITIVE");
      expect(text).toContain("praise");
      expect(text).toContain("thank and engage");
      expect(text).toContain("product, feedback");
    });
  });

  describe("inbox_suggest_replies", () => {
    it("should return suggestions via API", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "s-1",
              content: "Thank you for the feedback!",
              confidence: 0.95,
              strategy: "gratitude",
            },
            {
              id: "s-2",
              content: "We appreciate your support!",
              confidence: 0.88,
              strategy: "engagement",
            },
          ]),
      });

      const handler = registry.handlers.get("inbox_suggest_replies")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        item_id: "item-1",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Reply Suggestions for item-1");
      expect(text).toContain("95%");
      expect(text).toContain("gratitude");
    });

    it("should handle empty suggestions", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const handler = registry.handlers.get("inbox_suggest_replies")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        item_id: "item-1",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("No suggestions generated");
    });
  });

  describe("inbox_escalate", () => {
    it("should escalate via API", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const handler = registry.handlers.get("inbox_escalate")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        item_id: "item-1",
        reason: "Customer is threatening legal action",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Escalated!");
      expect(text).toContain("Customer is threatening legal action");
    });
  });

  describe("inbox_batch_reply", () => {
    it("should send multiple replies", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const handler = registry.handlers.get("inbox_batch_reply")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        replies: [
          { item_id: "item-1", content: "Thanks!" },
          { item_id: "item-2", content: "We appreciate it!" },
        ],
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Batch Reply Results");
      expect(text).toContain("Succeeded:** 2/2");
    });

    it("should report partial failures", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: () =>
            Promise.resolve(JSON.stringify({ error: "Item not found" })),
        });

      const handler = registry.handlers.get("inbox_batch_reply")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        replies: [
          { item_id: "item-1", content: "Thanks!" },
          { item_id: "item-2", content: "Reply" },
        ],
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Succeeded:** 1/2");
      expect(text).toContain("Failed:");
      expect(text).toContain("item-2");
    });
  });
});
