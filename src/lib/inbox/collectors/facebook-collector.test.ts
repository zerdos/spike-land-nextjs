/**
 * Facebook Collector Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { FacebookCollector } from "./facebook-collector";

// Mock global fetch
global.fetch = vi.fn();

describe("FacebookCollector", () => {
  let collector: FacebookCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new FacebookCollector();
  });

  describe("platform", () => {
    it("should be FACEBOOK", () => {
      expect(collector.platform).toBe("FACEBOOK");
    });
  });

  describe("canCollect", () => {
    it("should return true when authentication succeeds", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: "123", name: "Test Page" }),
        headers: new Headers(),
      } as Response);

      const result = await collector.canCollect("valid-token");

      expect(result).toBe(true);
    });

    it("should return false when authentication fails", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
        headers: new Headers(),
      } as Response);

      const result = await collector.canCollect("invalid-token");

      expect(result).toBe(false);
    });
  });

  describe("collectMentions", () => {
    it("should collect tagged posts successfully", async () => {
      const mockResponse = {
        data: [
          {
            id: "tag-1",
            message: "Check out this post!",
            created_time: "2024-01-15T10:00:00+0000",
            from: {
              id: "user-1",
              name: "John Doe",
              picture: { data: { url: "https://example.com/avatar.jpg" } },
            },
          },
        ],
        paging: {
          cursors: { after: "next-cursor" },
          next: "https://graph.facebook.com/next-page",
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectMentions("token", "page-123");

      expect(result.platform).toBe("FACEBOOK");
      expect(result.accountId).toBe("page-123");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        platformItemId: "tag-1",
        type: "MENTION",
        content: "Check out this post!",
        senderName: "John Doe",
        senderAvatarUrl: "https://example.com/avatar.jpg",
      });
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe("next-cursor");
    });

    it("should return empty result when no tags", async () => {
      const mockResponse = { data: [] };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectMentions("token", "page-123");

      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it("should handle 400 error gracefully", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
        headers: new Headers(),
      } as Response);

      const result = await collector.collectMentions("token", "page-123");

      expect(result.messages).toHaveLength(0);
    });

    it("should track app usage rate limits", async () => {
      const mockResponse = { data: [] };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({
          "x-app-usage": JSON.stringify({ call_count: 85, total_time: 50 }),
        }),
      } as Response);

      await collector.collectMentions("token", "page-123");

      const status = collector.getRateLimitStatus();

      expect(status).not.toBeNull();
      expect(status?.remaining).toBe(15);
      expect(status?.limit).toBe(100);
    });

    it("should ignore invalid app usage headers", async () => {
      const mockResponse = { data: [] };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({
          "x-app-usage": "invalid-json",
        }),
      } as Response);

      await collector.collectMentions("token", "page-123");

      const status = collector.getRateLimitStatus();

      expect(status).toBeNull();
    });
  });

  describe("collectDirectMessages", () => {
    it("should collect messenger conversations and messages", async () => {
      const mockConversationsResponse = {
        data: [
          {
            id: "conv-1",
            updated_time: "2024-01-15T10:00:00+0000",
            participants: {
              data: [
                { id: "user-1", name: "Alice" },
                { id: "page-123", name: "Page" },
              ],
            },
          },
        ],
        paging: {
          cursors: { after: "conv-next" },
          next: "https://graph.facebook.com/conv-next",
        },
      };

      const mockMessagesResponse = {
        data: [
          {
            id: "msg-1",
            message: "Hello from Alice",
            created_time: "2024-01-15T10:00:00+0000",
            from: {
              id: "user-1",
              name: "Alice",
              picture: { data: { url: "https://example.com/alice.jpg" } },
            },
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConversationsResponse,
          headers: new Headers(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMessagesResponse,
          headers: new Headers(),
        } as Response);

      const result = await collector.collectDirectMessages("token", "page-123");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        platformItemId: "msg-1",
        type: "DIRECT_MESSAGE",
        content: "Hello from Alice",
        senderName: "Alice",
      });
      expect(result.hasMore).toBe(true);
    });

    it("should filter out own messages", async () => {
      const mockConversationsResponse = {
        data: [{ id: "conv-1", updated_time: "2024-01-15T10:00:00+0000" }],
      };

      const mockMessagesResponse = {
        data: [
          {
            id: "msg-1",
            message: "From user",
            created_time: "2024-01-15T10:00:00+0000",
            from: { id: "user-1", name: "User" },
          },
          {
            id: "msg-2",
            message: "From page",
            created_time: "2024-01-15T10:01:00+0000",
            from: { id: "page-123", name: "Page" },
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConversationsResponse,
          headers: new Headers(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMessagesResponse,
          headers: new Headers(),
        } as Response);

      const result = await collector.collectDirectMessages("token", "page-123");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.platformItemId).toBe("msg-1");
    });

    it("should limit to 10 conversations", async () => {
      const mockConversationsResponse = {
        data: Array.from({ length: 15 }, (_, i) => ({
          id: `conv-${i + 1}`,
          updated_time: "2024-01-15T10:00:00+0000",
        })),
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConversationsResponse,
          headers: new Headers(),
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ data: [] }),
          headers: new Headers(),
        } as Response);

      await collector.collectDirectMessages("token", "page-123");

      expect(global.fetch).toHaveBeenCalledTimes(11);
    });

    it("should return empty when no conversations", async () => {
      const mockResponse = { data: [] };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectDirectMessages("token", "page-123");

      expect(result.messages).toHaveLength(0);
    });

    it("should handle 403 forbidden gracefully", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "Forbidden",
        headers: new Headers(),
      } as Response);

      const result = await collector.collectDirectMessages("token", "page-123");

      expect(result.messages).toHaveLength(0);
    });

    it("should handle 200 status code error gracefully", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 200,
        text: async () => "Error",
        headers: new Headers(),
      } as Response);

      const result = await collector.collectDirectMessages("token", "page-123");

      expect(result.messages).toHaveLength(0);
    });
  });

  describe("collectComments", () => {
    it("should collect comments from recent posts", async () => {
      const mockPostsResponse = {
        data: [
          {
            id: "post-1",
            message: "Post content",
            created_time: "2024-01-15T10:00:00+0000",
          },
        ],
        paging: {
          cursors: { after: "posts-next" },
          next: "https://graph.facebook.com/posts-next",
        },
      };

      const mockCommentsResponse = {
        data: [
          {
            id: "comment-1",
            message: "Great post!",
            created_time: "2024-01-15T11:00:00+0000",
            from: {
              id: "user-1",
              name: "Bob",
              picture: { data: { url: "https://example.com/bob.jpg" } },
            },
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPostsResponse,
          headers: new Headers(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommentsResponse,
          headers: new Headers(),
        } as Response);

      const result = await collector.collectComments("token", "page-123");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        platformItemId: "comment-1",
        type: "COMMENT",
        content: "Great post!",
        senderName: "Bob",
        originalPostId: "post-1",
        originalPostContent: "Post content",
      });
      expect(result.hasMore).toBe(true);
    });

    it("should distinguish between comments and replies", async () => {
      const mockPostsResponse = {
        data: [{ id: "post-1", created_time: "2024-01-15T10:00:00+0000" }],
      };

      const mockCommentsResponse = {
        data: [
          {
            id: "comment-1",
            message: "Top-level comment",
            created_time: "2024-01-15T11:00:00+0000",
            from: { id: "user-1", name: "User1" },
          },
          {
            id: "reply-1",
            message: "Reply to comment",
            created_time: "2024-01-15T11:01:00+0000",
            from: { id: "user-2", name: "User2" },
            parent: { id: "comment-1" },
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPostsResponse,
          headers: new Headers(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommentsResponse,
          headers: new Headers(),
        } as Response);

      const result = await collector.collectComments("token", "page-123");

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]?.type).toBe("COMMENT");
      expect(result.messages[1]?.type).toBe("REPLY");
    });

    it("should return empty when no posts", async () => {
      const mockResponse = { data: [] };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectComments("token", "page-123");

      expect(result.messages).toHaveLength(0);
    });

    it("should continue with other posts if one fails", async () => {
      const mockPostsResponse = {
        data: [
          { id: "post-1", created_time: "2024-01-15T10:00:00+0000" },
          { id: "post-2", created_time: "2024-01-15T11:00:00+0000" },
        ],
      };

      const mockCommentsResponse = {
        data: [
          {
            id: "comment-2",
            message: "Comment on post 2",
            created_time: "2024-01-15T12:00:00+0000",
            from: { id: "user-1", name: "User" },
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPostsResponse,
          headers: new Headers(),
        } as Response)
        .mockRejectedValueOnce(new Error("Failed to fetch comments"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommentsResponse,
          headers: new Headers(),
        } as Response);

      const result = await collector.collectComments("token", "page-123");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.platformItemId).toBe("comment-2");
    });
  });

  describe("error handling", () => {
    it("should throw on 429 rate limit", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
        headers: new Headers(),
      } as Response);

      await expect(
        collector.collectMentions("token", "page-123"),
      ).rejects.toThrow("Rate limit exceeded");
    });
  });
});
