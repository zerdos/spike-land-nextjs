/**
 * Twitter Collector Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TwitterCollector } from "./twitter-collector";

// Mock global fetch
global.fetch = vi.fn();

describe("TwitterCollector", () => {
  let collector: TwitterCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new TwitterCollector();
  });

  describe("platform", () => {
    it("should be TWITTER", () => {
      expect(collector.platform).toBe("TWITTER");
    });
  });

  describe("canCollect", () => {
    it("should return true when authentication succeeds", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: "123", name: "Test User", username: "testuser" },
        }),
        headers: new Headers(),
      } as Response);

      const result = await collector.canCollect("valid-token");

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/me"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer valid-token",
          }),
        }),
      );
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
    it("should collect mentions successfully", async () => {
      const mockResponse = {
        data: [
          {
            id: "tweet-1",
            text: "Hey @testuser check this out",
            author_id: "author-1",
            created_at: "2024-01-15T10:00:00Z",
          },
        ],
        includes: {
          users: [
            {
              id: "author-1",
              name: "John Doe",
              username: "johndoe",
              profile_image_url: "https://example.com/avatar.jpg",
            },
          ],
        },
        meta: {
          result_count: 1,
          next_token: "next-page-token",
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({
          "x-rate-limit-remaining": "100",
          "x-rate-limit-limit": "150",
          "x-rate-limit-reset": String(Math.floor(Date.now() / 1000) + 3600),
        }),
      } as Response);

      const result = await collector.collectMentions("token", "account-1");

      expect(result.platform).toBe("TWITTER");
      expect(result.accountId).toBe("account-1");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        platformItemId: "tweet-1",
        type: "MENTION",
        content: "Hey @testuser check this out",
        senderName: "John Doe",
        senderHandle: "@johndoe",
      });
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe("next-page-token");
    });

    it("should handle replies to tweets", async () => {
      const mockResponse = {
        data: [
          {
            id: "reply-1",
            text: "Great post @testuser!",
            author_id: "author-1",
            created_at: "2024-01-15T10:00:00Z",
            referenced_tweets: [{ type: "replied_to", id: "original-tweet" }],
          },
        ],
        includes: {
          users: [
            { id: "author-1", name: "Jane Doe", username: "janedoe" },
          ],
          tweets: [
            { id: "original-tweet", text: "Original tweet content" },
          ],
        },
        meta: { result_count: 1 },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({
          "x-rate-limit-remaining": "100",
          "x-rate-limit-limit": "150",
          "x-rate-limit-reset": String(Math.floor(Date.now() / 1000) + 3600),
        }),
      } as Response);

      const result = await collector.collectMentions("token", "account-1");

      expect(result.messages[0]?.type).toBe("REPLY");
      expect(result.messages[0]?.originalPostId).toBe("original-tweet");
      expect(result.messages[0]?.originalPostContent).toBe(
        "Original tweet content",
      );
    });

    it("should return empty result when no mentions", async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectMentions("token", "account-1");

      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it("should handle API errors with retry", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => "Service Unavailable",
          headers: new Headers(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [], meta: { result_count: 0 } }),
          headers: new Headers(),
        } as Response);

      vi.useFakeTimers();

      const promise = collector.collectMentions("token", "account-1");

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.messages).toHaveLength(0);

      vi.useRealTimers();
    });

    it("should include pagination options", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], meta: { result_count: 0 } }),
        headers: new Headers(),
      } as Response);

      await collector.collectMentions("token", "account-1", {
        sinceId: "last-id",
        cursor: "page-token",
        maxResults: 50,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("since_id=last-id"),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("pagination_token=page-token"),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("max_results=50"),
        expect.anything(),
      );
    });
  });

  describe("collectDirectMessages", () => {
    it("should collect direct messages successfully", async () => {
      const mockResponse = {
        data: [
          {
            id: "dm-1",
            event_type: "MessageCreate",
            text: "Hello!",
            sender_id: "sender-1",
            created_at: "2024-01-15T10:00:00Z",
            dm_conversation_id: "conv-1",
          },
        ],
        includes: {
          users: [
            {
              id: "sender-1",
              name: "Alice",
              username: "alice",
              profile_image_url: "https://example.com/alice.jpg",
            },
          ],
        },
        meta: { result_count: 1, next_token: "next-dm-token" },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({
          "x-rate-limit-remaining": "100",
          "x-rate-limit-limit": "150",
          "x-rate-limit-reset": String(Math.floor(Date.now() / 1000) + 3600),
        }),
      } as Response);

      const result = await collector.collectDirectMessages("token", "account-1");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        platformItemId: "dm-1",
        type: "DIRECT_MESSAGE",
        content: "Hello!",
        senderName: "Alice",
        senderHandle: "@alice",
      });
      expect(result.hasMore).toBe(true);
    });

    it("should filter out non-MessageCreate events", async () => {
      const mockResponse = {
        data: [
          {
            id: "dm-1",
            event_type: "MessageCreate",
            text: "Valid message",
            sender_id: "sender-1",
            created_at: "2024-01-15T10:00:00Z",
            dm_conversation_id: "conv-1",
          },
          {
            id: "dm-2",
            event_type: "ParticipantJoin",
            text: "",
            sender_id: "sender-2",
            created_at: "2024-01-15T11:00:00Z",
            dm_conversation_id: "conv-1",
          },
        ],
        includes: {
          users: [
            { id: "sender-1", name: "Alice", username: "alice" },
          ],
        },
        meta: { result_count: 2 },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectDirectMessages("token", "account-1");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.platformItemId).toBe("dm-1");
    });

    it("should return empty result when access denied", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "Forbidden",
        headers: new Headers(),
      } as Response);

      const result = await collector.collectDirectMessages("token", "account-1");

      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it("should handle 401 unauthorized gracefully", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
        headers: new Headers(),
      } as Response);

      const result = await collector.collectDirectMessages("token", "account-1");

      expect(result.messages).toHaveLength(0);
    });
  });

  describe("collectComments", () => {
    it("should return empty result for Twitter", async () => {
      const result = await collector.collectComments("token", "account-1");

      expect(result.platform).toBe("TWITTER");
      expect(result.accountId).toBe("account-1");
      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("rate limit handling", () => {
    it("should update rate limit status from headers", async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3600;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], meta: { result_count: 0 } }),
        headers: new Headers({
          "x-rate-limit-remaining": "50",
          "x-rate-limit-limit": "150",
          "x-rate-limit-reset": String(resetTime),
        }),
      } as Response);

      await collector.collectMentions("token", "account-1");

      const status = collector.getRateLimitStatus();

      expect(status).not.toBeNull();
      expect(status?.remaining).toBe(50);
      expect(status?.limit).toBe(150);
    });

    it("should throw error on rate limit", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
        headers: new Headers(),
      } as Response);

      await expect(
        collector.collectMentions("token", "account-1"),
      ).rejects.toThrow("Rate limit exceeded");
    });
  });

  describe("getUserInfo", () => {
    it("should extract user info from includes", async () => {
      const mockResponse = {
        data: [
          {
            id: "tweet-1",
            text: "Test",
            author_id: "user-123",
            created_at: "2024-01-15T10:00:00Z",
          },
        ],
        includes: {
          users: [
            {
              id: "user-123",
              name: "Test User",
              username: "testuser",
              profile_image_url: "https://example.com/avatar.jpg",
            },
          ],
        },
        meta: { result_count: 1 },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectMentions("token", "account-1");

      expect(result.messages[0]?.senderName).toBe("Test User");
      expect(result.messages[0]?.senderHandle).toBe("@testuser");
      expect(result.messages[0]?.senderAvatarUrl).toBe(
        "https://example.com/avatar.jpg",
      );
    });

    it("should handle missing user info", async () => {
      const mockResponse = {
        data: [
          {
            id: "tweet-1",
            text: "Test",
            author_id: "unknown-user",
            created_at: "2024-01-15T10:00:00Z",
          },
        ],
        includes: {
          users: [],
        },
        meta: { result_count: 1 },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers(),
      } as Response);

      const result = await collector.collectMentions("token", "account-1");

      expect(result.messages[0]?.senderName).toBe("Unknown User");
      expect(result.messages[0]?.senderHandle).toBeUndefined();
    });
  });
});
