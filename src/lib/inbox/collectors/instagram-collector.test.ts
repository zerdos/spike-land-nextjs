/**
 * Instagram Collector Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { InstagramCollector } from "./instagram-collector";

// Mock global fetch
global.fetch = vi.fn();

describe("InstagramCollector", () => {
  let collector: InstagramCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new InstagramCollector();
  });

  describe("platform", () => {
    it("should be INSTAGRAM", () => {
      expect(collector.platform).toBe("INSTAGRAM");
    });
  });

  describe("canCollect", () => {
    it("should return true when authentication succeeds", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: "123", username: "testuser" }),
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
    it("should collect tagged media successfully", async () => {
      const mockResponse = {
        data: [
          {
            id: "media-1",
            caption: "Check this out!",
            timestamp: "2024-01-15T10:00:00+0000",
            media_type: "IMAGE",
            permalink: "https://instagram.com/p/abc123",
            username: "tagger",
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

      const result = await collector.collectMentions("token", "account-123");

      expect(result.platform).toBe("INSTAGRAM");
      expect(result.accountId).toBe("account-123");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        platformItemId: "media-1",
        type: "MENTION",
        content: "Check this out!",
        senderName: "tagger",
        senderHandle: "@tagger",
      });
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe("next-cursor");
    });

    it("should handle mentions without caption", async () => {
      const mockResponse = {
        data: [
          {
            id: "media-2",
            timestamp: "2024-01-15T10:00:00+0000",
            media_type: "VIDEO",
            permalink: "https://instagram.com/p/def456",
            username: "tagger2",
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectMentions("token", "account-123");

      expect(result.messages[0]?.content).toBe("");
    });

    it("should return empty when no tags", async () => {
      const mockResponse = { data: [] };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectMentions("token", "account-123");

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

      const result = await collector.collectMentions("token", "account-123");

      expect(result.messages).toHaveLength(0);
    });

    it("should track app usage rate limits", async () => {
      const mockResponse = { data: [] };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({
          "x-app-usage": JSON.stringify({ call_count: 90 }),
        }),
      } as Response);

      await collector.collectMentions("token", "account-123");

      const status = collector.getRateLimitStatus();

      expect(status).not.toBeNull();
      expect(status?.remaining).toBe(10);
    });
  });

  describe("collectDirectMessages", () => {
    it("should collect Instagram DM conversations and messages", async () => {
      const mockConversationsResponse = {
        data: [
          {
            id: "conv-1",
            updated_time: "2024-01-15T10:00:00+0000",
            participants: {
              data: [
                { id: "user-1", username: "alice" },
                { id: "account-123", username: "page" },
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
            message: "Hello!",
            created_time: "2024-01-15T10:00:00+0000",
            from: {
              id: "user-1",
              username: "alice",
              name: "Alice",
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

      const result = await collector.collectDirectMessages("token", "account-123");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        platformItemId: "msg-1",
        type: "DIRECT_MESSAGE",
        content: "Hello!",
        senderName: "Alice",
        senderHandle: "@alice",
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
            from: { id: "user-1", username: "alice" },
          },
          {
            id: "msg-2",
            message: "From account",
            created_time: "2024-01-15T10:01:00+0000",
            from: { id: "account-123", username: "page" },
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

      const result = await collector.collectDirectMessages("token", "account-123");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.platformItemId).toBe("msg-1");
    });

    it("should use username when name is not available", async () => {
      const mockConversationsResponse = {
        data: [{ id: "conv-1", updated_time: "2024-01-15T10:00:00+0000" }],
      };

      const mockMessagesResponse = {
        data: [
          {
            id: "msg-1",
            message: "Test",
            created_time: "2024-01-15T10:00:00+0000",
            from: { id: "user-1", username: "bob" },
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

      const result = await collector.collectDirectMessages("token", "account-123");

      expect(result.messages[0]?.senderName).toBe("bob");
    });

    it("should use Unknown when both name and username are missing", async () => {
      const mockConversationsResponse = {
        data: [{ id: "conv-1", updated_time: "2024-01-15T10:00:00+0000" }],
      };

      const mockMessagesResponse = {
        data: [
          {
            id: "msg-1",
            message: "Test",
            created_time: "2024-01-15T10:00:00+0000",
            from: { id: "user-1" },
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

      const result = await collector.collectDirectMessages("token", "account-123");

      expect(result.messages[0]?.senderName).toBe("Unknown");
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

      await collector.collectDirectMessages("token", "account-123");

      expect(global.fetch).toHaveBeenCalledTimes(11);
    });

    it("should continue with other conversations if one fails", async () => {
      const mockConversationsResponse = {
        data: [
          { id: "conv-1", updated_time: "2024-01-15T10:00:00+0000" },
          { id: "conv-2", updated_time: "2024-01-15T11:00:00+0000" },
        ],
      };

      const mockMessagesResponse = {
        data: [
          {
            id: "msg-2",
            message: "Message from conv 2",
            created_time: "2024-01-15T11:00:00+0000",
            from: { id: "user-1", username: "bob" },
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConversationsResponse,
          headers: new Headers(),
        } as Response)
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMessagesResponse,
          headers: new Headers(),
        } as Response);

      const result = await collector.collectDirectMessages("token", "account-123");

      expect(result.messages).toHaveLength(1);
    });

    it("should return empty when no conversations", async () => {
      const mockResponse = { data: [] };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectDirectMessages("token", "account-123");

      expect(result.messages).toHaveLength(0);
    });

    it("should handle permission errors gracefully", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "Forbidden",
        headers: new Headers(),
      } as Response);

      const result = await collector.collectDirectMessages("token", "account-123");

      expect(result.messages).toHaveLength(0);
    });

    it("should handle 400 bad request gracefully", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
        headers: new Headers(),
      } as Response);

      const result = await collector.collectDirectMessages("token", "account-123");

      expect(result.messages).toHaveLength(0);
    });

    it("should handle permission error text gracefully", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "permission denied",
        headers: new Headers(),
      } as Response);

      const result = await collector.collectDirectMessages("token", "account-123");

      expect(result.messages).toHaveLength(0);
    });
  });

  describe("collectComments", () => {
    it("should collect comments from recent media", async () => {
      const mockMediaResponse = {
        data: [
          {
            id: "media-1",
            caption: "My photo",
            timestamp: "2024-01-15T10:00:00+0000",
            media_type: "IMAGE",
            permalink: "https://instagram.com/p/abc",
          },
        ],
        paging: {
          cursors: { after: "media-next" },
          next: "https://graph.facebook.com/media-next",
        },
      };

      const mockCommentsResponse = {
        data: [
          {
            id: "comment-1",
            text: "Nice photo!",
            timestamp: "2024-01-15T11:00:00+0000",
            from: {
              id: "user-1",
              username: "bob",
              name: "Bob",
              profile_picture_url: "https://example.com/bob.jpg",
            },
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMediaResponse,
          headers: new Headers(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommentsResponse,
          headers: new Headers(),
        } as Response);

      const result = await collector.collectComments("token", "account-123");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        platformItemId: "comment-1",
        type: "COMMENT",
        content: "Nice photo!",
        senderName: "Bob",
        senderHandle: "@bob",
        senderAvatarUrl: "https://example.com/bob.jpg",
        originalPostId: "media-1",
        originalPostContent: "My photo",
      });
      expect(result.hasMore).toBe(true);
    });

    it("should distinguish between comments and replies", async () => {
      const mockMediaResponse = {
        data: [{ id: "media-1", timestamp: "2024-01-15T10:00:00+0000" }],
      };

      const mockCommentsResponse = {
        data: [
          {
            id: "comment-1",
            text: "Top-level comment",
            timestamp: "2024-01-15T11:00:00+0000",
            from: { id: "user-1", username: "alice", name: "Alice" },
          },
          {
            id: "reply-1",
            text: "Reply to comment",
            timestamp: "2024-01-15T11:01:00+0000",
            from: { id: "user-2", username: "bob", name: "Bob" },
            parent_id: "comment-1",
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMediaResponse,
          headers: new Headers(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommentsResponse,
          headers: new Headers(),
        } as Response);

      const result = await collector.collectComments("token", "account-123");

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]?.type).toBe("COMMENT");
      expect(result.messages[1]?.type).toBe("REPLY");
    });

    it("should use username when name is not available", async () => {
      const mockMediaResponse = {
        data: [{ id: "media-1", timestamp: "2024-01-15T10:00:00+0000" }],
      };

      const mockCommentsResponse = {
        data: [
          {
            id: "comment-1",
            text: "Test",
            timestamp: "2024-01-15T11:00:00+0000",
            from: { id: "user-1", username: "charlie" },
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMediaResponse,
          headers: new Headers(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommentsResponse,
          headers: new Headers(),
        } as Response);

      const result = await collector.collectComments("token", "account-123");

      expect(result.messages[0]?.senderName).toBe("charlie");
    });

    it("should return empty when no media", async () => {
      const mockResponse = { data: [] };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectComments("token", "account-123");

      expect(result.messages).toHaveLength(0);
    });

    it("should continue with other media if one fails", async () => {
      const mockMediaResponse = {
        data: [
          { id: "media-1", timestamp: "2024-01-15T10:00:00+0000" },
          { id: "media-2", timestamp: "2024-01-15T11:00:00+0000" },
        ],
      };

      const mockCommentsResponse = {
        data: [
          {
            id: "comment-2",
            text: "Comment on media 2",
            timestamp: "2024-01-15T12:00:00+0000",
            from: { id: "user-1", username: "dave", name: "Dave" },
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMediaResponse,
          headers: new Headers(),
        } as Response)
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommentsResponse,
          headers: new Headers(),
        } as Response);

      const result = await collector.collectComments("token", "account-123");

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
        collector.collectMentions("token", "account-123"),
      ).rejects.toThrow("Rate limit exceeded");
    });
  });
});
