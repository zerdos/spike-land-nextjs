import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  relayDraft: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    groupBy: vi.fn(),
    count: vi.fn(),
  },
  inboxItem: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  workspace: { findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerRelayTools } from "./relay";

const WORKSPACE = { id: "ws-1", slug: "my-ws", name: "My Workspace" };

describe("relay tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerRelayTools(registry, userId);
    mockPrisma.workspace.findFirst.mockResolvedValue(WORKSPACE);
  });

  it("should register 5 relay tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("relay_generate_drafts")).toBe(true);
    expect(registry.handlers.has("relay_approve_draft")).toBe(true);
    expect(registry.handlers.has("relay_reject_draft")).toBe(true);
    expect(registry.handlers.has("relay_get_metrics")).toBe(true);
    expect(registry.handlers.has("relay_list_pending")).toBe(true);
  });

  describe("relay_generate_drafts", () => {
    it("should create pending drafts for an inbox item", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({ id: "item-1" });
      let callCount = 0;
      mockPrisma.relayDraft.create.mockImplementation(() => {
        callCount++;
        return Promise.resolve({ id: `draft-${callCount}` });
      });

      const handler = registry.handlers.get("relay_generate_drafts")!;
      const result = await handler({
        workspace_slug: "my-ws",
        inbox_item_id: "item-1",
        count: 2,
        tone: "friendly",
      });
      const text = getText(result);
      expect(text).toContain("Drafts Created");
      expect(text).toContain("Count:** 2");
      expect(text).toContain("PENDING");
      expect(text).toContain("friendly");
      expect(text).toContain("draft-1");
      expect(text).toContain("draft-2");
      expect(mockPrisma.relayDraft.create).toHaveBeenCalledTimes(2);
    });

    it("should return NOT_FOUND when inbox item missing", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("relay_generate_drafts")!;
      const result = await handler({
        workspace_slug: "my-ws",
        inbox_item_id: "missing",
      });
      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should default to 3 drafts when count not specified", async () => {
      mockPrisma.inboxItem.findFirst.mockResolvedValue({ id: "item-1" });
      mockPrisma.relayDraft.create.mockResolvedValue({ id: "draft-x" });

      const handler = registry.handlers.get("relay_generate_drafts")!;
      const result = await handler({
        workspace_slug: "my-ws",
        inbox_item_id: "item-1",
      });
      const text = getText(result);
      expect(text).toContain("Count:** 3");
      expect(mockPrisma.relayDraft.create).toHaveBeenCalledTimes(3);
    });
  });

  describe("relay_approve_draft", () => {
    it("should approve a pending draft", async () => {
      mockPrisma.relayDraft.findFirst.mockResolvedValue({ id: "draft-1", status: "PENDING" });
      mockPrisma.relayDraft.update.mockResolvedValue({ id: "draft-1", status: "APPROVED" });

      const handler = registry.handlers.get("relay_approve_draft")!;
      const result = await handler({ workspace_slug: "my-ws", draft_id: "draft-1" });
      const text = getText(result);
      expect(text).toContain("Draft Approved");
      expect(text).toContain("APPROVED");
      expect(mockPrisma.relayDraft.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "draft-1" },
          data: expect.objectContaining({
            status: "APPROVED",
            reviewedById: userId,
          }),
        }),
      );
    });

    it("should return NOT_FOUND for missing draft", async () => {
      mockPrisma.relayDraft.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("relay_approve_draft")!;
      const result = await handler({ workspace_slug: "my-ws", draft_id: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });

    it("should reject approval of non-PENDING draft", async () => {
      mockPrisma.relayDraft.findFirst.mockResolvedValue({ id: "draft-1", status: "APPROVED" });

      const handler = registry.handlers.get("relay_approve_draft")!;
      const result = await handler({ workspace_slug: "my-ws", draft_id: "draft-1" });
      const text = getText(result);
      expect(text).toContain("INVALID_STATUS");
      expect(text).toContain("APPROVED");
    });
  });

  describe("relay_reject_draft", () => {
    it("should reject a draft with reason", async () => {
      mockPrisma.relayDraft.findFirst.mockResolvedValue({ id: "draft-1", status: "PENDING" });
      mockPrisma.relayDraft.update.mockResolvedValue({ id: "draft-1", status: "REJECTED" });

      const handler = registry.handlers.get("relay_reject_draft")!;
      const result = await handler({
        workspace_slug: "my-ws",
        draft_id: "draft-1",
        reason: "Too informal",
      });
      const text = getText(result);
      expect(text).toContain("Draft Rejected");
      expect(text).toContain("REJECTED");
      expect(text).toContain("Too informal");
      expect(mockPrisma.relayDraft.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "REJECTED",
            reason: "Too informal",
            reviewedById: userId,
          }),
        }),
      );
    });

    it("should return NOT_FOUND for missing draft", async () => {
      mockPrisma.relayDraft.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("relay_reject_draft")!;
      const result = await handler({ workspace_slug: "my-ws", draft_id: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("relay_get_metrics", () => {
    it("should return metrics with status counts", async () => {
      mockPrisma.inboxItem.findMany.mockResolvedValue([
        { id: "item-1" },
        { id: "item-2" },
      ]);
      mockPrisma.relayDraft.groupBy.mockResolvedValue([
        { status: "PENDING", _count: { status: 5 } },
        { status: "APPROVED", _count: { status: 8 } },
        { status: "REJECTED", _count: { status: 2 } },
      ]);

      const handler = registry.handlers.get("relay_get_metrics")!;
      const result = await handler({ workspace_slug: "my-ws", days: 7 });
      const text = getText(result);
      expect(text).toContain("Relay Metrics (7 days)");
      expect(text).toContain("PENDING");
      expect(text).toContain("APPROVED");
      expect(text).toContain("REJECTED");
      expect(text).toContain("Total Drafts:** 15");
      expect(text).toContain("53.3%");
    });

    it("should handle empty workspace with no inbox items", async () => {
      mockPrisma.inboxItem.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("relay_get_metrics")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("No inbox items found");
    });
  });

  describe("relay_list_pending", () => {
    it("should list pending drafts with inbox context", async () => {
      mockPrisma.inboxItem.findMany.mockResolvedValue([{ id: "item-1" }]);
      mockPrisma.relayDraft.findMany.mockResolvedValue([
        {
          id: "draft-1",
          content: "Thank you for your feedback!",
          createdAt: new Date("2025-06-01"),
          inboxItem: { senderName: "Alice", content: "Love the product" },
        },
      ]);

      const handler = registry.handlers.get("relay_list_pending")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Pending Drafts (1)");
      expect(text).toContain("draft-1");
      expect(text).toContain("Alice");
      expect(text).toContain("Thank you for your feedback!");
    });

    it("should handle no pending drafts", async () => {
      mockPrisma.inboxItem.findMany.mockResolvedValue([{ id: "item-1" }]);
      mockPrisma.relayDraft.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("relay_list_pending")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Pending Drafts (0)");
      expect(text).toContain("No pending drafts");
    });

    it("should handle empty workspace", async () => {
      mockPrisma.inboxItem.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("relay_list_pending")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("No inbox items found");
    });
  });
});
