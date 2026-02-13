import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma
const mockPrisma = {
  workspace: {
    findFirst: vi.fn(),
  },
  relayDraft: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import type { ToolRegistry } from "../tool-registry";
import { registerOrbitRelayTools } from "./orbit-relay";

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

describe("orbit-relay tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerOrbitRelayTools(registry, userId);
  });

  it("should register 5 relay tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("relay_generate_drafts")).toBe(true);
    expect(registry.handlers.has("relay_list_drafts")).toBe(true);
    expect(registry.handlers.has("relay_approve_draft")).toBe(true);
    expect(registry.handlers.has("relay_reject_draft")).toBe(true);
    expect(registry.handlers.has("relay_get_metrics")).toBe(true);
  });

  describe("relay_generate_drafts", () => {
    it("should generate drafts via API", async () => {
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
              id: "draft-1",
              content: "Thank you for reaching out!",
              confidenceScore: 0.92,
              isPreferred: true,
            },
            {
              id: "draft-2",
              content: "We appreciate your feedback!",
              confidenceScore: 0.85,
              isPreferred: false,
            },
          ]),
      });

      const handler = registry.handlers.get("relay_generate_drafts")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        item_id: "item-1",
        count: 3,
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Drafts for item-1");
      expect(text).toContain("92%");
      expect(text).toContain("PREFERRED");
      expect(text).toContain("draft-1");
    });

    it("should handle empty drafts response", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const handler = registry.handlers.get("relay_generate_drafts")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        item_id: "item-1",
        count: 3,
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Drafts Generated (0)");
    });

    it("should return error when workspace not found", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("relay_generate_drafts")!;
      const result = await handler({
        workspace_slug: "nonexistent",
        item_id: "item-1",
        count: 3,
      });

      expect(result).toEqual(
        expect.objectContaining({ isError: true }),
      );
    });
  });

  describe("relay_list_drafts", () => {
    it("should list pending drafts from prisma", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockPrisma.relayDraft.findMany.mockResolvedValue([
        {
          id: "draft-1",
          content: "Thank you for your message!",
          confidenceScore: 0.9,
          status: "PENDING",
          isPreferred: true,
          createdAt: new Date("2025-01-15"),
          inboxItem: {
            id: "item-1",
            senderName: "Jane",
            platform: "TWITTER",
            content: "Great product!",
          },
        },
      ]);

      const handler = registry.handlers.get("relay_list_drafts")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        limit: 20,
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Relay Drafts (1)");
      expect(text).toContain("PENDING");
      expect(text).toContain("Jane");
      expect(text).toContain("TWITTER");
    });

    it("should show empty message when no drafts", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockPrisma.relayDraft.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("relay_list_drafts")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        limit: 20,
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Relay Drafts (0)");
      expect(text).toContain("relay_generate_drafts");
    });

    it("should filter by status", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockPrisma.relayDraft.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("relay_list_drafts")!;
      await handler({
        workspace_slug: "my-workspace",
        status: "APPROVED",
        limit: 10,
      });

      expect(mockPrisma.relayDraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "APPROVED",
          }),
        }),
      );
    });
  });

  describe("relay_approve_draft", () => {
    it("should approve draft via API", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const handler = registry.handlers.get("relay_approve_draft")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        draft_id: "draft-1",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Draft Approved!");
      expect(text).toContain("draft-1");
    });
  });

  describe("relay_reject_draft", () => {
    it("should reject draft with feedback via API", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const handler = registry.handlers.get("relay_reject_draft")!;
      const result = await handler({
        workspace_slug: "my-workspace",
        draft_id: "draft-1",
        feedback: "Too formal, needs a casual tone",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Draft Rejected");
      expect(text).toContain("Too formal, needs a casual tone");
    });
  });

  describe("relay_get_metrics", () => {
    it("should return metrics via API", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            totalDrafts: 100,
            approvedCount: 70,
            rejectedCount: 20,
            sentCount: 65,
            pendingCount: 10,
            averageConfidence: 0.87,
            approvalRate: 0.78,
            averageResponseTime: 12.5,
          }),
      });

      const handler = registry.handlers.get("relay_get_metrics")!;
      const result = await handler({
        workspace_slug: "my-workspace",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Relay Metrics for my-workspace");
      expect(text).toContain("Total Drafts:** 100");
      expect(text).toContain("Approved:** 70");
      expect(text).toContain("Approval Rate:** 78.0%");
      expect(text).toContain("Avg Response Time:** 12.5s");
    });

    it("should handle null response time", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            totalDrafts: 0,
            approvedCount: 0,
            rejectedCount: 0,
            sentCount: 0,
            pendingCount: 0,
            averageConfidence: 0,
            approvalRate: 0,
            averageResponseTime: null,
          }),
      });

      const handler = registry.handlers.get("relay_get_metrics")!;
      const result = await handler({
        workspace_slug: "my-workspace",
      });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).not.toContain("Avg Response Time");
    });

    it("should return error when workspace not found", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("relay_get_metrics")!;
      const result = await handler({
        workspace_slug: "nonexistent",
      });

      expect(result).toEqual(
        expect.objectContaining({ isError: true }),
      );
    });
  });
});
