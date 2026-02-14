import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  workspace: { findFirst: vi.fn() },
  socialAccount: { findMany: vi.fn(), findFirst: vi.fn() },
  socialPost: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
  socialPostAccount: { create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { createMockRegistry, getText } from "../__test-utils__";
import { registerSocialAccountsTools } from "./social-accounts";

describe("social-accounts tools", () => {
  const userId = "test-user-123";
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistry();
    mockPrisma.workspace.findFirst.mockResolvedValue({ id: "ws-1", slug: "my-ws", name: "My Workspace" });
    registerSocialAccountsTools(registry, userId);
  });

  it("should register 5 social-accounts tools", () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
    expect(registry.handlers.has("social_list_accounts")).toBe(true);
    expect(registry.handlers.has("social_get_account")).toBe(true);
    expect(registry.handlers.has("social_publish_post")).toBe(true);
    expect(registry.handlers.has("social_get_post")).toBe(true);
    expect(registry.handlers.has("social_delete_post")).toBe(true);
  });

  describe("social_list_accounts", () => {
    it("should return formatted list of accounts", async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([
        {
          id: "acc-1",
          platform: "INSTAGRAM",
          accountId: "ig-123",
          accountName: "MyBrand",
          status: "ACTIVE",
          connectedAt: new Date("2025-06-01"),
          metadata: null,
          health: { healthScore: 95, status: "HEALTHY" },
        },
        {
          id: "acc-2",
          platform: "TWITTER",
          accountId: "tw-456",
          accountName: "MyBrandTW",
          status: "ACTIVE",
          connectedAt: new Date("2025-06-15"),
          metadata: null,
          health: null,
        },
      ]);
      const handler = registry.handlers.get("social_list_accounts")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("Social Accounts");
      expect(text).toContain("2");
      expect(text).toContain("MyBrand");
      expect(text).toContain("INSTAGRAM");
      expect(text).toContain("95/100");
    });

    it("should handle empty list", async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("social_list_accounts")!;
      const result = await handler({ workspace_slug: "my-ws" });
      const text = getText(result);
      expect(text).toContain("No accounts found");
    });

    it("should filter by platform", async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([]);
      const handler = registry.handlers.get("social_list_accounts")!;
      await handler({ workspace_slug: "my-ws", platform: "INSTAGRAM" });
      expect(mockPrisma.socialAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ platform: "INSTAGRAM" }),
        }),
      );
    });
  });

  describe("social_get_account", () => {
    it("should return account details", async () => {
      mockPrisma.socialAccount.findFirst.mockResolvedValue({
        id: "acc-1",
        platform: "INSTAGRAM",
        accountId: "ig-123",
        accountName: "MyBrand",
        status: "ACTIVE",
        connectedAt: new Date("2025-06-01"),
        metadata: null,
        health: { healthScore: 90, status: "HEALTHY" },
        metrics: [
          { date: new Date("2025-07-01"), followers: 1000, engagementRate: 0.05, impressions: 5000, reach: 3000 },
        ],
        _count: { postAccounts: 12 },
      });
      const handler = registry.handlers.get("social_get_account")!;
      const result = await handler({ workspace_slug: "my-ws", account_id: "acc-1" });
      const text = getText(result);
      expect(text).toContain("Social Account Details");
      expect(text).toContain("MyBrand");
      expect(text).toContain("INSTAGRAM");
      expect(text).toContain("90/100");
      expect(text).toContain("12");
    });

    it("should return NOT_FOUND for missing account", async () => {
      mockPrisma.socialAccount.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("social_get_account")!;
      const result = await handler({ workspace_slug: "my-ws", account_id: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("social_publish_post", () => {
    it("should create a draft post", async () => {
      mockPrisma.socialPost.create.mockResolvedValue({ id: "post-1", status: "DRAFT" });
      mockPrisma.socialPostAccount.create.mockResolvedValue({ id: "pa-1" });
      const handler = registry.handlers.get("social_publish_post")!;
      const result = await handler({
        workspace_slug: "my-ws",
        account_ids: ["acc-1", "acc-2"],
        content: "Hello world!",
      });
      const text = getText(result);
      expect(text).toContain("Post Created");
      expect(text).toContain("post-1");
      expect(text).toContain("DRAFT");
      expect(text).toContain("2");
      expect(mockPrisma.socialPostAccount.create).toHaveBeenCalledTimes(2);
    });

    it("should create a scheduled post", async () => {
      mockPrisma.socialPost.create.mockResolvedValue({ id: "post-2", status: "SCHEDULED" });
      mockPrisma.socialPostAccount.create.mockResolvedValue({ id: "pa-2" });
      const handler = registry.handlers.get("social_publish_post")!;
      const result = await handler({
        workspace_slug: "my-ws",
        account_ids: ["acc-1"],
        content: "Scheduled post",
        scheduled_at: "2025-12-01T10:00:00Z",
      });
      const text = getText(result);
      expect(text).toContain("Post Created");
      expect(text).toContain("SCHEDULED");
      expect(text).toContain("2025-12-01T10:00:00Z");
    });
  });

  describe("social_get_post", () => {
    it("should return post with metrics", async () => {
      mockPrisma.socialPost.findFirst.mockResolvedValue({
        id: "post-1",
        content: "Hello world!",
        status: "PUBLISHED",
        scheduledAt: null,
        publishedAt: new Date("2025-07-01"),
        likes: 42,
        comments: 5,
        shares: 3,
        impressions: 1200,
        reach: 800,
        engagementRate: 0.042,
        createdAt: new Date("2025-06-30"),
        postAccounts: [
          { id: "pa-1", status: "PUBLISHED", publishedAt: new Date("2025-07-01"), account: { platform: "INSTAGRAM", accountName: "MyBrand" } },
        ],
      });
      const handler = registry.handlers.get("social_get_post")!;
      const result = await handler({ workspace_slug: "my-ws", post_id: "post-1" });
      const text = getText(result);
      expect(text).toContain("Social Post");
      expect(text).toContain("Hello world!");
      expect(text).toContain("42");
      expect(text).toContain("MyBrand");
    });

    it("should return NOT_FOUND for missing post", async () => {
      mockPrisma.socialPost.findFirst.mockResolvedValue(null);
      const handler = registry.handlers.get("social_get_post")!;
      const result = await handler({ workspace_slug: "my-ws", post_id: "missing" });
      expect(getText(result)).toContain("NOT_FOUND");
    });
  });

  describe("social_delete_post", () => {
    it("should delete post when confirmed", async () => {
      mockPrisma.socialPost.findFirst.mockResolvedValue({ id: "post-1" });
      mockPrisma.socialPost.delete.mockResolvedValue({ id: "post-1" });
      const handler = registry.handlers.get("social_delete_post")!;
      const result = await handler({ workspace_slug: "my-ws", post_id: "post-1", confirm: true });
      const text = getText(result);
      expect(text).toContain("Post Deleted");
      expect(mockPrisma.socialPost.delete).toHaveBeenCalledWith({ where: { id: "post-1" } });
    });

    it("should reject when confirm is false", async () => {
      const handler = registry.handlers.get("social_delete_post")!;
      const result = await handler({ workspace_slug: "my-ws", post_id: "post-1", confirm: false });
      const text = getText(result);
      expect(text).toContain("CONFIRMATION_REQUIRED");
      expect(mockPrisma.socialPost.delete).not.toHaveBeenCalled();
    });
  });
});
