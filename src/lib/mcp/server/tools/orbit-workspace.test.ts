import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma
const mockPrisma = {
  workspace: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  socialAccount: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  inboxItem: {
    groupBy: vi.fn(),
  },
  relayDraft: {
    count: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import type { ToolRegistry } from "../tool-registry";
import { registerOrbitWorkspaceTools } from "./orbit-workspace";

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

describe("orbit-workspace tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    registerOrbitWorkspaceTools(registry, userId);
  });

  it("should register 3 workspace tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(3);
    expect(registry.handlers.has("workspace_list")).toBe(true);
    expect(registry.handlers.has("workspace_get_accounts")).toBe(true);
    expect(registry.handlers.has("workspace_get_pulse")).toBe(true);
  });

  describe("workspace_list", () => {
    it("should list workspaces the user is a member of", async () => {
      mockPrisma.workspace.findMany.mockResolvedValue([
        {
          id: "ws-1",
          name: "My Workspace",
          slug: "my-workspace",
          isPersonal: true,
          subscriptionTier: "FREE",
          _count: { socialAccounts: 2, inboxItems: 10, members: 1 },
        },
        {
          id: "ws-2",
          name: "Team Space",
          slug: "team-space",
          isPersonal: false,
          subscriptionTier: "PRO",
          _count: { socialAccounts: 5, inboxItems: 42, members: 3 },
        },
      ]);

      const handler = registry.handlers.get("workspace_list")!;
      const result = await handler({});

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Workspaces (2)");
      expect(text).toContain("My Workspace");
      expect(text).toContain("my-workspace");
      expect(text).toContain("[Personal]");
      expect(text).toContain("Team Space");
      expect(text).toContain("PRO");
    });

    it("should show empty message when no workspaces", async () => {
      mockPrisma.workspace.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("workspace_list")!;
      const result = await handler({});

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Workspaces (0)");
      expect(text).toContain("No workspaces found");
    });

    it("should handle database errors", async () => {
      mockPrisma.workspace.findMany.mockRejectedValue(
        new Error("DB error"),
      );

      const handler = registry.handlers.get("workspace_list")!;
      const result = await handler({});

      expect(result).toEqual(
        expect.objectContaining({ isError: true }),
      );
    });
  });

  describe("workspace_get_accounts", () => {
    it("should list social accounts for a workspace", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockPrisma.socialAccount.findMany.mockResolvedValue([
        {
          id: "acc-1",
          platform: "TWITTER",
          accountName: "@myhandle",
          status: "ACTIVE",
          connectedAt: new Date("2025-01-15"),
        },
        {
          id: "acc-2",
          platform: "LINKEDIN",
          accountName: "Company Page",
          status: "ACTIVE",
          connectedAt: new Date("2025-02-01"),
        },
      ]);

      const handler = registry.handlers.get("workspace_get_accounts")!;
      const result = await handler({ workspace_slug: "my-workspace" });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Accounts for My Workspace (2)");
      expect(text).toContain("TWITTER");
      expect(text).toContain("@myhandle");
      expect(text).toContain("LINKEDIN");
    });

    it("should return error when workspace not found", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("workspace_get_accounts")!;
      const result = await handler({ workspace_slug: "nonexistent" });

      expect(result).toEqual(
        expect.objectContaining({ isError: true }),
      );
      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("WORKSPACE_NOT_FOUND");
    });

    it("should show empty message when no accounts", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "empty-ws",
        name: "Empty WS",
      });
      mockPrisma.socialAccount.findMany.mockResolvedValue([]);

      const handler = registry.handlers.get("workspace_get_accounts")!;
      const result = await handler({ workspace_slug: "empty-ws" });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Accounts for Empty WS (0)");
      expect(text).toContain("No social accounts connected");
    });
  });

  describe("workspace_get_pulse", () => {
    it("should return pulse metrics", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockPrisma.inboxItem.groupBy
        .mockResolvedValueOnce([
          { status: "UNREAD", _count: 5 },
          { status: "REPLIED", _count: 12 },
        ])
        .mockResolvedValueOnce([
          { platform: "TWITTER", _count: 10 },
          { platform: "LINKEDIN", _count: 7 },
        ])
        .mockResolvedValueOnce([
          { sentiment: "POSITIVE", _count: 8 },
          { sentiment: "NEGATIVE", _count: 3 },
        ]);
      mockPrisma.socialAccount.count.mockResolvedValue(3);
      mockPrisma.relayDraft.count.mockResolvedValue(2);

      const handler = registry.handlers.get("workspace_get_pulse")!;
      const result = await handler({ workspace_slug: "my-workspace" });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Pulse: My Workspace");
      expect(text).toContain("Active Accounts:** 3");
      expect(text).toContain("Pending Drafts:** 2");
      expect(text).toContain("UNREAD: 5");
      expect(text).toContain("TWITTER: 10");
      expect(text).toContain("POSITIVE: 8");
    });

    it("should return error when workspace not found", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue(null);

      const handler = registry.handlers.get("workspace_get_pulse")!;
      const result = await handler({ workspace_slug: "nonexistent" });

      expect(result).toEqual(
        expect.objectContaining({ isError: true }),
      );
    });

    it("should handle empty sentiment data", async () => {
      mockPrisma.workspace.findFirst.mockResolvedValue({
        id: "ws-1",
        slug: "my-workspace",
        name: "My Workspace",
      });
      mockPrisma.inboxItem.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.socialAccount.count.mockResolvedValue(0);
      mockPrisma.relayDraft.count.mockResolvedValue(0);

      const handler = registry.handlers.get("workspace_get_pulse")!;
      const result = await handler({ workspace_slug: "my-workspace" });

      const text = (result as { content: Array<{ text: string }> }).content[0]!
        .text;
      expect(text).toContain("Active Accounts:** 0");
      expect(text).not.toContain("Inbox by Sentiment");
    });
  });
});
