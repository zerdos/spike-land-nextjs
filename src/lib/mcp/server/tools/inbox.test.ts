import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  inboxItem: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  workspace: { findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerInboxTools } from "./inbox";

const WORKSPACE = { id: "ws-1", slug: "my-ws", name: "My Workspace" };

describe("inbox tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerInboxTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue(WORKSPACE);
  });

  it("should register 6 inbox tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(6);
    expect(registry.handlers.has("inbox_list_items")).toBe(true);
    expect(registry.handlers.has("inbox_get_item")).toBe(true);
    expect(registry.handlers.has("inbox_reply")).toBe(true);
    expect(registry.handlers.has("inbox_archive")).toBe(true);
    expect(registry.handlers.has("inbox_route")).toBe(true);
    expect(registry.handlers.has("inbox_get_priority_score")).toBe(true);
  });

  describe("inbox_list_items", () => {
    it("should return a list of inbox items", async () => {
      mockPrisma.inboxItem.findMany.mockResolvedValue([
        {
          id: "item-1",
          senderName: "Alice",
          platform: "instagram",
          type: "comment",
          sentiment: "positive",
          priorityScore: 85,
          status: "UNREAD",
          receivedAt: new Date("2025-06-01"),
        },
      ]);
      mockPrisma.inboxItem.count.mockResolvedValue(1);

      const handler = registry.handlers.get("inbox_list_items")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Inbox Items (1/1)");
      expect(text).toContain("Alice");
      expect(text).toContain("instagram");
      expect(text).toContain("UNREAD");
    });

    it("should handle empty inbox", async () => {
      mockPrisma.inboxItem.findMany.mockResolvedValue([]);
      mockPrisma.inboxItem.count.mockResolvedValue(0);

      const handler = registry.handlers.get("inbox_list_items")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Inbox Items (0/0)");
      expect(text).toContain("No items found");
    });

    it("should pass status and platform filters", async () => {
      mockPrisma.inboxItem.findMany.mockResolvedValue([]);
      mockPrisma.inboxItem.count.mockResolvedValue(0);

      const handler = registry.handlers.get("inbox_list_items")!;
      await handler({ workspace_slug: "my-ws", status: "UNREAD", platform: "twitter" });

      const where = mockPrisma.inboxItem.findMany.mock.calls[0]![0].where;
      expect(where).toMatchObject({
        workspaceId: "ws-1",
        status: "UNREAD",
        platform: "twitter",
      });
    });

    it("should use fallbacks for null senderName, platform, type, sentiment, priorityScore", async () => {
      mockPrisma.inboxItem.findMany.mockResolvedValue([
        {
          id: "item-null",
          senderName: null,
          platform: null,
          type: null,
          sentiment: null,
          priorityScore: null,
          status: "UNREAD",
          receivedAt: new Date("2025-06-01"),
        },
      ]);
      mockPrisma.inboxItem.count.mockResolvedValue(1);

      const handler = registry.handlers.get("inbox_list_items")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("**Unknown** via unknown");
      expect(text).toContain("Type: message");
      expect(text).toContain("Sentiment: neutral");
      expect(text).toContain("Priority: N/A");
    });

    it("should stringify non-Date receivedAt values", async () => {
      mockPrisma.inboxItem.findMany.mockResolvedValue([
        {
          id: "item-str",
          senderName: "Test",
          platform: "tiktok",
          type: "dm",
          sentiment: "positive",
          priorityScore: 50,
          status: "READ",
          receivedAt: "2025-06-01T00:00:00.000Z",
        },
      ]);
      mockPrisma.inboxItem.count.mockResolvedValue(1);

      const handler = registry.handlers.get("inbox_list_items")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("2025-06-01T00:00:00.000Z");
    });
  });

  describe("inbox_get_item", () => {
    it("should return full item details with relations", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({
        id: "item-1",
        senderName: "Bob",
        platform: "twitter",
        type: "mention",
        content: "Hey @brand great product!",
        status: "UNREAD",
        sentiment: "positive",
        sentimentScore: 0.92,
        priorityScore: 75,
        receivedAt: new Date("2025-06-01"),
        suggestedResponses: [{ content: "Thanks for the kind words!" }],
        drafts: [{ id: "draft-1", status: "PENDING", content: "Thank you!", createdAt: new Date() }],
        assignedTo: null,
        escalationHistory: [],
      });

      const handler = registry.handlers.get("inbox_get_item")!;
      const result = await handler({ workspace_slug: "my-ws", item_id: "item-1" });
      const text = getText(result);
      expect(text).toContain("Inbox Item Details");
      expect(text).toContain("Bob");
      expect(text).toContain("twitter");
      expect(text).toContain("great product");
      expect(text).toContain("positive");
      expect(text).toContain("Suggested Responses (1)");
      expect(text).toContain("Drafts:** 1");
    });

    it("should return NOT_FOUND for missing item", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("inbox_get_item")!;
      const result = await handler({ workspace_slug: "my-ws", item_id: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should use fallbacks for null fields", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({
        id: "item-null",
        senderName: null,
        platform: null,
        type: null,
        content: null,
        status: "UNREAD",
        sentiment: null,
        sentimentScore: null,
        priorityScore: null,
        receivedAt: new Date("2025-06-01"),
        suggestedResponses: [],
        drafts: undefined,
        assignedTo: null,
        escalationHistory: [],
      });

      const handler = registry.handlers.get("inbox_get_item")!;
      const result = await handler({ workspace_slug: "my-ws", item_id: "item-null" });
      const text = getText(result);
      expect(text).toContain("**Sender:** Unknown");
      expect(text).toContain("**Platform:** unknown");
      expect(text).toContain("**Type:** message");
      expect(text).toContain("**Content:** (empty)");
      expect(text).toContain("**Sentiment:** neutral (score: N/A)");
      expect(text).toContain("**Priority:** N/A");
    });

    it("should stringify non-Date receivedAt", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({
        id: "item-str-date",
        senderName: "Test",
        platform: "instagram",
        type: "comment",
        content: "Hello",
        status: "UNREAD",
        sentiment: "positive",
        sentimentScore: 0.5,
        priorityScore: 50,
        receivedAt: "2025-06-01T00:00:00.000Z",
        suggestedResponses: [],
        drafts: [],
        assignedTo: null,
        escalationHistory: [],
      });

      const handler = registry.handlers.get("inbox_get_item")!;
      const result = await handler({ workspace_slug: "my-ws", item_id: "item-str-date" });
      const text = getText(result);
      expect(text).toContain("2025-06-01T00:00:00.000Z");
    });

    it("should not show suggested responses section when empty", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({
        id: "item-no-sr",
        senderName: "Test",
        platform: "twitter",
        type: "mention",
        content: "Hi",
        status: "READ",
        sentiment: "neutral",
        sentimentScore: 0,
        priorityScore: 30,
        receivedAt: new Date("2025-06-01"),
        suggestedResponses: [],
        drafts: [{ id: "d1", status: "PENDING", content: "Draft", createdAt: new Date() }],
        assignedTo: null,
        escalationHistory: [],
      });

      const handler = registry.handlers.get("inbox_get_item")!;
      const result = await handler({ workspace_slug: "my-ws", item_id: "item-no-sr" });
      const text = getText(result);
      expect(text).not.toContain("Suggested Responses");
      expect(text).toContain("**Drafts:** 1");
    });

    it("should not show drafts section when undefined", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({
        id: "item-no-drafts",
        senderName: "Test",
        platform: "twitter",
        type: "mention",
        content: "Hi",
        status: "READ",
        sentiment: "neutral",
        sentimentScore: 0,
        priorityScore: 30,
        receivedAt: new Date("2025-06-01"),
        suggestedResponses: undefined,
        drafts: undefined,
        assignedTo: null,
        escalationHistory: [],
      });

      const handler = registry.handlers.get("inbox_get_item")!;
      const result = await handler({ workspace_slug: "my-ws", item_id: "item-no-drafts" });
      const text = getText(result);
      expect(text).not.toContain("Suggested Responses");
      expect(text).not.toContain("Drafts");
    });
  });

  describe("inbox_reply", () => {
    it("should mark item as resolved", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({ id: "item-1", status: "UNREAD" });
      mockPrisma.inboxItem.update.mockResolvedValue({ id: "item-1", status: "REPLIED" });

      const handler = registry.handlers.get("inbox_reply")!;
      const result = await handler({
        workspace_slug: "my-ws",
        item_id: "item-1",
        content: "Thanks for reaching out!",
      });
      const text = getText(result);
      expect(text).toContain("Reply Recorded");
      expect(text).toContain("RESOLVED");
      expect(mockPrisma.inboxItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "item-1" },
          data: expect.objectContaining({ status: "REPLIED" }),
        }),
      );
    });

    it("should return NOT_FOUND for missing item", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("inbox_reply")!;
      const result = await handler({
        workspace_slug: "my-ws",
        item_id: "missing",
        content: "Hello",
      });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("inbox_archive", () => {
    it("should archive multiple items", async () => {
      mockPrisma.inboxItem.updateMany.mockResolvedValue({ count: 3 });

      const handler = registry.handlers.get("inbox_archive")!;
      const result = await handler({
        workspace_slug: "my-ws",
        item_ids: ["item-1", "item-2", "item-3"],
      });
      const text = getText(result);
      expect(text).toContain("Items Archived");
      expect(text).toContain("Count:** 3 of 3");
      expect(mockPrisma.inboxItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ["item-1", "item-2", "item-3"] }, workspaceId: "ws-1" },
          data: { status: "ARCHIVED" },
        }),
      );
    });
  });

  describe("inbox_route", () => {
    it("should assign member and return routing info", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({
        id: "item-1",
        sentiment: "negative",
        priorityScore: 90,
        suggestedResponses: [{ content: "Sorry about that" }],
      });
      mockPrisma.inboxItem.update.mockResolvedValue({ id: "item-1" });

      const handler = registry.handlers.get("inbox_route")!;
      const result = await handler({
        workspace_slug: "my-ws",
        item_id: "item-1",
        assign_to_member_id: "member-42",
      });
      const text = getText(result);
      expect(text).toContain("Routing Result");
      expect(text).toContain("member-42");
      expect(text).toContain("negative");
      expect(text).toContain("90");
      expect(text).toContain("Suggested Responses:** 1");
      expect(mockPrisma.inboxItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { assignedToId: "member-42" },
        }),
      );
    });

    it("should return NOT_FOUND for missing item", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("inbox_route")!;
      const result = await handler({ workspace_slug: "my-ws", item_id: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should handle routing without assignment", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({
        id: "item-1",
        sentiment: null,
        priorityScore: null,
        suggestedResponses: undefined,
      });

      const handler = registry.handlers.get("inbox_route")!;
      const result = await handler({
        workspace_slug: "my-ws",
        item_id: "item-1",
      });
      const text = getText(result);
      expect(text).toContain("(unassigned)");
      expect(text).toContain("Sentiment:** neutral");
      expect(text).toContain("Priority:** N/A");
      expect(text).toContain("Suggested Responses:** 0");
      expect(mockPrisma.inboxItem.update).not.toHaveBeenCalled();
    });
  });

  describe("inbox_get_priority_score", () => {
    it("should return priority breakdown", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({
        id: "item-1",
        priorityScore: 88,
        priorityFactors: { urgency: "high", influence: "medium" },
        sentiment: "negative",
        sentimentScore: -0.7,
      });

      const handler = registry.handlers.get("inbox_get_priority_score")!;
      const result = await handler({ workspace_slug: "my-ws", item_id: "item-1" });
      const text = getText(result);
      expect(text).toContain("Priority Breakdown");
      expect(text).toContain("88");
      expect(text).toContain("negative");
      expect(text).toContain("-0.7");
      expect(text).toContain("urgency");
    });

    it("should return NOT_FOUND for missing item", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("inbox_get_priority_score")!;
      const result = await handler({ workspace_slug: "my-ws", item_id: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should use fallbacks for null fields and omit priorityFactors", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({
        id: "item-null",
        priorityScore: null,
        priorityFactors: null,
        sentiment: null,
        sentimentScore: null,
      });

      const handler = registry.handlers.get("inbox_get_priority_score")!;
      const result = await handler({ workspace_slug: "my-ws", item_id: "item-null" });
      const text = getText(result);
      expect(text).toContain("**Priority Score:** N/A");
      expect(text).toContain("**Sentiment:** neutral");
      expect(text).toContain("**Sentiment Score:** N/A");
      expect(text).not.toContain("Priority Factors");
    });
  });
});
