/**
 * Stream Aggregator Tests
 *
 * Comprehensive tests for stream aggregation, filtering, sorting, and pagination.
 */

import type { SocialPlatform } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  type AccountContext,
  type AggregateOptions,
  aggregateStreamPosts,
  calculateEngagementRate,
  createAccountContext,
  decodeCursor,
  encodeCursor,
  filterStreamPosts,
  mergeStreamPosts,
  sortStreamPosts,
  transformToStreamPost,
} from "./stream-aggregator";
import type { PostMetrics, SocialAccountInfo, SocialPost, StreamFilter, StreamPost } from "./types";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockSocialPost(overrides: Partial<SocialPost> = {}): SocialPost {
  return {
    id: "post-1",
    platformPostId: "platform-post-1",
    platform: "TWITTER" as SocialPlatform,
    content: "Test post content",
    publishedAt: new Date("2024-01-15T10:00:00Z"),
    url: "https://twitter.com/user/status/123",
    metrics: {
      likes: 100,
      comments: 20,
      shares: 10,
      impressions: 1000,
    },
    ...overrides,
  };
}

function createMockAccountContext(overrides: Partial<AccountContext> = {}): AccountContext {
  return {
    accountId: "account-1",
    accountName: "Test Account",
    accountAvatarUrl: "https://example.com/avatar.jpg",
    platform: "TWITTER" as SocialPlatform,
    ...overrides,
  };
}

function createMockStreamPost(overrides: Partial<StreamPost> = {}): StreamPost {
  return {
    id: "post-1",
    platformPostId: "platform-post-1",
    platform: "TWITTER" as SocialPlatform,
    content: "Test post content",
    publishedAt: new Date("2024-01-15T10:00:00Z"),
    url: "https://twitter.com/user/status/123",
    metrics: {
      likes: 100,
      comments: 20,
      shares: 10,
      impressions: 1000,
    },
    accountId: "account-1",
    accountName: "Test Account",
    accountAvatarUrl: "https://example.com/avatar.jpg",
    canLike: true,
    canReply: true,
    canShare: true,
    ...overrides,
  };
}

function createDefaultFilter(overrides: Partial<StreamFilter> = {}): StreamFilter {
  return {
    sortBy: "publishedAt",
    sortOrder: "desc",
    ...overrides,
  };
}

// =============================================================================
// calculateEngagementRate Tests
// =============================================================================

describe("calculateEngagementRate", () => {
  it("should return undefined when metrics are undefined", () => {
    const result = calculateEngagementRate(undefined);
    expect(result).toBeUndefined();
  });

  it("should return undefined when impressions are zero", () => {
    const metrics: PostMetrics = {
      likes: 10,
      comments: 5,
      shares: 2,
      impressions: 0,
    };
    const result = calculateEngagementRate(metrics);
    expect(result).toBeUndefined();
  });

  it("should return undefined when impressions are missing", () => {
    const metrics: PostMetrics = {
      likes: 10,
      comments: 5,
      shares: 2,
    };
    const result = calculateEngagementRate(metrics);
    expect(result).toBeUndefined();
  });

  it("should calculate engagement rate correctly", () => {
    const metrics: PostMetrics = {
      likes: 100,
      comments: 20,
      shares: 10,
      impressions: 1000,
    };
    const result = calculateEngagementRate(metrics);
    // (100 + 20 + 10) / 1000 * 100 = 13%
    expect(result).toBe(13);
  });

  it("should handle zero engagement", () => {
    const metrics: PostMetrics = {
      likes: 0,
      comments: 0,
      shares: 0,
      impressions: 1000,
    };
    const result = calculateEngagementRate(metrics);
    expect(result).toBe(0);
  });

  it("should handle high engagement rate", () => {
    const metrics: PostMetrics = {
      likes: 500,
      comments: 300,
      shares: 200,
      impressions: 1000,
    };
    const result = calculateEngagementRate(metrics);
    // (500 + 300 + 200) / 1000 * 100 = 100%
    expect(result).toBe(100);
  });
});

// =============================================================================
// transformToStreamPost Tests
// =============================================================================

describe("transformToStreamPost", () => {
  it("should transform a Twitter post with correct capabilities", () => {
    const post = createMockSocialPost({ platform: "TWITTER" });
    const context = createMockAccountContext({ platform: "TWITTER" });

    const result = transformToStreamPost(post, context);

    expect(result.accountId).toBe("account-1");
    expect(result.accountName).toBe("Test Account");
    expect(result.accountAvatarUrl).toBe("https://example.com/avatar.jpg");
    expect(result.canLike).toBe(true);
    expect(result.canReply).toBe(true);
    expect(result.canShare).toBe(true);
    expect(result.isLiked).toBeUndefined();
  });

  it("should transform a Facebook post with correct capabilities", () => {
    const post = createMockSocialPost({ platform: "FACEBOOK" });
    const context = createMockAccountContext({ platform: "FACEBOOK" });

    const result = transformToStreamPost(post, context);

    expect(result.canLike).toBe(true);
    expect(result.canReply).toBe(true);
    expect(result.canShare).toBe(false);
  });

  it("should transform an Instagram post with correct capabilities", () => {
    const post = createMockSocialPost({ platform: "INSTAGRAM" });
    const context = createMockAccountContext({ platform: "INSTAGRAM" });

    const result = transformToStreamPost(post, context);

    expect(result.canLike).toBe(true);
    expect(result.canReply).toBe(true);
    expect(result.canShare).toBe(false);
  });

  it("should transform a LinkedIn post with correct capabilities", () => {
    const post = createMockSocialPost({ platform: "LINKEDIN" });
    const context = createMockAccountContext({ platform: "LINKEDIN" });

    const result = transformToStreamPost(post, context);

    expect(result.canLike).toBe(true);
    expect(result.canReply).toBe(true);
    expect(result.canShare).toBe(false);
  });

  it("should transform a TikTok post with correct capabilities", () => {
    const post = createMockSocialPost({ platform: "TIKTOK" });
    const context = createMockAccountContext({ platform: "TIKTOK" });

    const result = transformToStreamPost(post, context);

    expect(result.canLike).toBe(false);
    expect(result.canReply).toBe(false);
    expect(result.canShare).toBe(false);
  });

  it("should preserve all original post properties", () => {
    const post = createMockSocialPost({
      id: "unique-id",
      content: "Unique content",
      mediaUrls: ["https://example.com/image.jpg"],
    });
    const context = createMockAccountContext();

    const result = transformToStreamPost(post, context);

    expect(result.id).toBe("unique-id");
    expect(result.content).toBe("Unique content");
    expect(result.mediaUrls).toEqual(["https://example.com/image.jpg"]);
    expect(result.metrics).toEqual(post.metrics);
  });

  it("should handle context without avatar URL", () => {
    const post = createMockSocialPost();
    const context = createMockAccountContext({ accountAvatarUrl: undefined });

    const result = transformToStreamPost(post, context);

    expect(result.accountAvatarUrl).toBeUndefined();
  });
});

// =============================================================================
// createAccountContext Tests
// =============================================================================

describe("createAccountContext", () => {
  it("should create account context from account info", () => {
    const accountInfo: SocialAccountInfo = {
      platformId: "platform-123",
      username: "testuser",
      displayName: "Test User Display",
      avatarUrl: "https://example.com/avatar.jpg",
      followersCount: 1000,
      followingCount: 500,
    };

    const result = createAccountContext("db-account-id", accountInfo, "TWITTER");

    expect(result.accountId).toBe("db-account-id");
    expect(result.accountName).toBe("Test User Display");
    expect(result.accountAvatarUrl).toBe("https://example.com/avatar.jpg");
    expect(result.platform).toBe("TWITTER");
  });

  it("should use username when displayName is empty", () => {
    const accountInfo: SocialAccountInfo = {
      platformId: "platform-123",
      username: "testuser",
      displayName: "",
      avatarUrl: "https://example.com/avatar.jpg",
    };

    const result = createAccountContext("db-account-id", accountInfo, "FACEBOOK");

    // displayName is empty string which is falsy, so username is used
    expect(result.accountName).toBe("testuser");
  });

  it("should handle missing avatar URL", () => {
    const accountInfo: SocialAccountInfo = {
      platformId: "platform-123",
      username: "testuser",
      displayName: "Test User",
    };

    const result = createAccountContext("db-account-id", accountInfo, "INSTAGRAM");

    expect(result.accountAvatarUrl).toBeUndefined();
  });
});

// =============================================================================
// filterStreamPosts Tests
// =============================================================================

describe("filterStreamPosts", () => {
  const mockPosts: StreamPost[] = [
    createMockStreamPost({
      id: "1",
      platform: "TWITTER",
      content: "Hello world from Twitter",
      publishedAt: new Date("2024-01-15T10:00:00Z"),
    }),
    createMockStreamPost({
      id: "2",
      platform: "FACEBOOK",
      content: "Facebook post here",
      publishedAt: new Date("2024-01-16T10:00:00Z"),
    }),
    createMockStreamPost({
      id: "3",
      platform: "INSTAGRAM",
      content: "Instagram photo caption",
      publishedAt: new Date("2024-01-17T10:00:00Z"),
    }),
    createMockStreamPost({
      id: "4",
      platform: "TWITTER",
      content: "Another Twitter post",
      publishedAt: new Date("2024-01-18T10:00:00Z"),
    }),
  ];

  describe("platform filtering", () => {
    it("should return all posts when no platform filter", () => {
      const filter = createDefaultFilter();
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(4);
    });

    it("should return all posts when platforms array is empty", () => {
      const filter = createDefaultFilter({ platforms: [] });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(4);
    });

    it("should filter by single platform", () => {
      const filter = createDefaultFilter({ platforms: ["TWITTER"] });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.platform === "TWITTER")).toBe(true);
    });

    it("should filter by multiple platforms", () => {
      const filter = createDefaultFilter({ platforms: ["TWITTER", "FACEBOOK"] });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(3);
      expect(result.every((p) => ["TWITTER", "FACEBOOK"].includes(p.platform))).toBe(true);
    });

    it("should return empty array when no posts match platform", () => {
      const filter = createDefaultFilter({ platforms: ["LINKEDIN"] });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(0);
    });
  });

  describe("date range filtering", () => {
    it("should filter by date range", () => {
      const filter = createDefaultFilter({
        dateRange: {
          start: new Date("2024-01-16T00:00:00Z"),
          end: new Date("2024-01-17T23:59:59Z"),
        },
      });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toEqual(["2", "3"]);
    });

    it("should include posts on boundary dates", () => {
      const filter = createDefaultFilter({
        dateRange: {
          start: new Date("2024-01-15T10:00:00Z"),
          end: new Date("2024-01-15T10:00:00Z"),
        },
      });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("1");
    });

    it("should return empty when no posts in date range", () => {
      const filter = createDefaultFilter({
        dateRange: {
          start: new Date("2024-02-01T00:00:00Z"),
          end: new Date("2024-02-28T23:59:59Z"),
        },
      });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(0);
    });
  });

  describe("search query filtering", () => {
    it("should filter by search query (case insensitive)", () => {
      const filter = createDefaultFilter({ searchQuery: "twitter" });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(2);
    });

    it("should handle uppercase search query", () => {
      const filter = createDefaultFilter({ searchQuery: "FACEBOOK" });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(1);
      expect(result[0]!.platform).toBe("FACEBOOK");
    });

    it("should handle partial matches", () => {
      const filter = createDefaultFilter({ searchQuery: "post" });
      const result = filterStreamPosts(mockPosts, filter);
      // Matches: "Facebook post here" and "Another Twitter post"
      // Note: "Hello world from Twitter" and "Instagram photo caption" don't contain "post"
      expect(result).toHaveLength(2);
    });

    it("should ignore empty search query", () => {
      const filter = createDefaultFilter({ searchQuery: "" });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(4);
    });

    it("should ignore whitespace-only search query", () => {
      const filter = createDefaultFilter({ searchQuery: "   " });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(4);
    });

    it("should return empty when no posts match query", () => {
      const filter = createDefaultFilter({ searchQuery: "nonexistent" });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(0);
    });
  });

  describe("combined filters", () => {
    it("should apply platform and date range filters together", () => {
      const filter = createDefaultFilter({
        platforms: ["TWITTER"],
        dateRange: {
          start: new Date("2024-01-17T00:00:00Z"),
          end: new Date("2024-01-19T00:00:00Z"),
        },
      });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("4");
    });

    it("should apply all filters together", () => {
      const filter = createDefaultFilter({
        platforms: ["TWITTER"],
        dateRange: {
          start: new Date("2024-01-01T00:00:00Z"),
          end: new Date("2024-01-31T23:59:59Z"),
        },
        searchQuery: "Another",
      });
      const result = filterStreamPosts(mockPosts, filter);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("4");
    });
  });

  it("should not mutate the original array", () => {
    const originalLength = mockPosts.length;
    const filter = createDefaultFilter({ platforms: ["TWITTER"] });
    filterStreamPosts(mockPosts, filter);
    expect(mockPosts).toHaveLength(originalLength);
  });
});

// =============================================================================
// sortStreamPosts Tests
// =============================================================================

describe("sortStreamPosts", () => {
  const mockPosts: StreamPost[] = [
    createMockStreamPost({
      id: "1",
      publishedAt: new Date("2024-01-15T10:00:00Z"),
      metrics: { likes: 50, comments: 10, shares: 5, impressions: 1000 },
    }),
    createMockStreamPost({
      id: "2",
      publishedAt: new Date("2024-01-17T10:00:00Z"),
      metrics: { likes: 200, comments: 5, shares: 20, impressions: 2000 },
    }),
    createMockStreamPost({
      id: "3",
      publishedAt: new Date("2024-01-16T10:00:00Z"),
      metrics: { likes: 100, comments: 30, shares: 10, impressions: 500 },
    }),
  ];

  describe("sort by publishedAt", () => {
    it("should sort by publishedAt descending", () => {
      const result = sortStreamPosts(mockPosts, "publishedAt", "desc");
      expect(result.map((p) => p.id)).toEqual(["2", "3", "1"]);
    });

    it("should sort by publishedAt ascending", () => {
      const result = sortStreamPosts(mockPosts, "publishedAt", "asc");
      expect(result.map((p) => p.id)).toEqual(["1", "3", "2"]);
    });
  });

  describe("sort by likes", () => {
    it("should sort by likes descending", () => {
      const result = sortStreamPosts(mockPosts, "likes", "desc");
      expect(result.map((p) => p.id)).toEqual(["2", "3", "1"]);
    });

    it("should sort by likes ascending", () => {
      const result = sortStreamPosts(mockPosts, "likes", "asc");
      expect(result.map((p) => p.id)).toEqual(["1", "3", "2"]);
    });
  });

  describe("sort by comments", () => {
    it("should sort by comments descending", () => {
      const result = sortStreamPosts(mockPosts, "comments", "desc");
      expect(result.map((p) => p.id)).toEqual(["3", "1", "2"]);
    });

    it("should sort by comments ascending", () => {
      const result = sortStreamPosts(mockPosts, "comments", "asc");
      expect(result.map((p) => p.id)).toEqual(["2", "1", "3"]);
    });
  });

  describe("sort by engagementRate", () => {
    it("should sort by engagementRate descending", () => {
      // Post 1: (50+10+5)/1000*100 = 6.5%
      // Post 2: (200+5+20)/2000*100 = 11.25%
      // Post 3: (100+30+10)/500*100 = 28%
      const result = sortStreamPosts(mockPosts, "engagementRate", "desc");
      expect(result.map((p) => p.id)).toEqual(["3", "2", "1"]);
    });

    it("should sort by engagementRate ascending", () => {
      const result = sortStreamPosts(mockPosts, "engagementRate", "asc");
      expect(result.map((p) => p.id)).toEqual(["1", "2", "3"]);
    });
  });

  describe("edge cases", () => {
    it("should handle posts with missing metrics when sorting by likes", () => {
      const postsWithMissingMetrics: StreamPost[] = [
        createMockStreamPost({ id: "1", metrics: { likes: 100, comments: 10, shares: 5 } }),
        createMockStreamPost({ id: "2", metrics: undefined }),
        createMockStreamPost({ id: "3", metrics: { likes: 50, comments: 5, shares: 2 } }),
      ];

      const result = sortStreamPosts(postsWithMissingMetrics, "likes", "desc");
      expect(result.map((p) => p.id)).toEqual(["1", "3", "2"]);
    });

    it("should handle posts with missing metrics when sorting by comments", () => {
      const postsWithMissingMetrics: StreamPost[] = [
        createMockStreamPost({ id: "1", metrics: { likes: 100, comments: 20, shares: 5 } }),
        createMockStreamPost({ id: "2", metrics: undefined }),
        createMockStreamPost({ id: "3", metrics: { likes: 50, comments: 10, shares: 2 } }),
      ];

      const result = sortStreamPosts(postsWithMissingMetrics, "comments", "desc");
      expect(result.map((p) => p.id)).toEqual(["1", "3", "2"]);
    });

    it("should handle empty array", () => {
      const result = sortStreamPosts([], "publishedAt", "desc");
      expect(result).toEqual([]);
    });

    it("should handle single element array", () => {
      const singlePost = [createMockStreamPost({ id: "only" })];
      const result = sortStreamPosts(singlePost, "likes", "desc");
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("only");
    });

    it("should not mutate the original array", () => {
      const original = [...mockPosts];
      sortStreamPosts(mockPosts, "likes", "desc");
      expect(mockPosts).toEqual(original);
    });

    it("should handle posts without impressions when sorting by engagementRate", () => {
      const postsWithoutImpressions: StreamPost[] = [
        createMockStreamPost({
          id: "1",
          metrics: { likes: 100, comments: 10, shares: 5 }, // no impressions
        }),
        createMockStreamPost({
          id: "2",
          metrics: { likes: 50, comments: 5, shares: 2, impressions: 1000 },
        }),
      ];

      const result = sortStreamPosts(postsWithoutImpressions, "engagementRate", "desc");
      // Post without impressions has rate 0, post with impressions has 5.7%
      expect(result.map((p) => p.id)).toEqual(["2", "1"]);
    });

    it("should fall back to publishedAt for unknown sort field", () => {
      // This tests the default case in getSortValue (unreachable in normal TypeScript use)
      // but ensures coverage for defensive programming
      const posts: StreamPost[] = [
        createMockStreamPost({
          id: "1",
          publishedAt: new Date("2024-01-15T10:00:00Z"),
        }),
        createMockStreamPost({
          id: "2",
          publishedAt: new Date("2024-01-17T10:00:00Z"),
        }),
      ];

      // Cast to test the default case
      const result = sortStreamPosts(posts, "unknownField" as any, "desc");
      expect(result.map((p) => p.id)).toEqual(["2", "1"]);
    });
  });
});

// =============================================================================
// Cursor Tests
// =============================================================================

describe("cursor encoding/decoding", () => {
  describe("encodeCursor", () => {
    it("should encode offset to base64 string", () => {
      const cursor = encodeCursor(20);
      expect(typeof cursor).toBe("string");
      expect(cursor.length).toBeGreaterThan(0);
    });

    it("should encode zero offset", () => {
      const cursor = encodeCursor(0);
      expect(typeof cursor).toBe("string");
    });

    it("should encode large offsets", () => {
      const cursor = encodeCursor(10000);
      expect(typeof cursor).toBe("string");
    });
  });

  describe("decodeCursor", () => {
    it("should decode valid cursor", () => {
      const cursor = encodeCursor(42);
      const offset = decodeCursor(cursor);
      expect(offset).toBe(42);
    });

    it("should return 0 for undefined cursor", () => {
      const offset = decodeCursor(undefined);
      expect(offset).toBe(0);
    });

    it("should return 0 for empty string cursor", () => {
      const offset = decodeCursor("");
      expect(offset).toBe(0);
    });

    it("should return 0 for invalid base64", () => {
      const offset = decodeCursor("not-valid-base64!!!");
      expect(offset).toBe(0);
    });

    it("should return 0 for invalid JSON", () => {
      const invalidJson = Buffer.from("not json").toString("base64");
      const offset = decodeCursor(invalidJson);
      expect(offset).toBe(0);
    });

    it("should return 0 for missing offset in JSON", () => {
      const missingOffset = Buffer.from(JSON.stringify({ other: "data" })).toString("base64");
      const offset = decodeCursor(missingOffset);
      expect(offset).toBe(0);
    });

    it("should return 0 for non-number offset", () => {
      const stringOffset = Buffer.from(JSON.stringify({ offset: "not a number" })).toString(
        "base64",
      );
      const offset = decodeCursor(stringOffset);
      expect(offset).toBe(0);
    });
  });

  it("should round-trip correctly", () => {
    const originalOffset = 150;
    const cursor = encodeCursor(originalOffset);
    const decodedOffset = decodeCursor(cursor);
    expect(decodedOffset).toBe(originalOffset);
  });
});

// =============================================================================
// aggregateStreamPosts Tests
// =============================================================================

describe("aggregateStreamPosts", () => {
  const createPostsWithContext = (): Array<[SocialPost[], AccountContext]> => {
    const twitterPosts: SocialPost[] = [
      createMockSocialPost({
        id: "t1",
        platform: "TWITTER",
        content: "Twitter post 1",
        publishedAt: new Date("2024-01-15T10:00:00Z"),
        metrics: { likes: 100, comments: 10, shares: 5, impressions: 1000 },
      }),
      createMockSocialPost({
        id: "t2",
        platform: "TWITTER",
        content: "Twitter post 2",
        publishedAt: new Date("2024-01-17T10:00:00Z"),
        metrics: { likes: 200, comments: 20, shares: 10, impressions: 2000 },
      }),
    ];

    const facebookPosts: SocialPost[] = [
      createMockSocialPost({
        id: "f1",
        platform: "FACEBOOK",
        content: "Facebook post 1",
        publishedAt: new Date("2024-01-16T10:00:00Z"),
        metrics: { likes: 150, comments: 15, shares: 7, impressions: 1500 },
      }),
    ];

    const twitterContext = createMockAccountContext({
      accountId: "twitter-account",
      accountName: "Twitter User",
      platform: "TWITTER",
    });

    const facebookContext = createMockAccountContext({
      accountId: "facebook-account",
      accountName: "Facebook User",
      platform: "FACEBOOK",
    });

    return [
      [twitterPosts, twitterContext],
      [facebookPosts, facebookContext],
    ];
  };

  describe("basic aggregation", () => {
    it("should merge posts from multiple accounts", () => {
      const postsWithContext = createPostsWithContext();
      const options: AggregateOptions = {
        filter: createDefaultFilter(),
      };

      const result = aggregateStreamPosts(postsWithContext, options);

      expect(result.posts).toHaveLength(3);
      expect(result.totalCount).toBe(3);
    });

    it("should add account context to all posts", () => {
      const postsWithContext = createPostsWithContext();
      const options: AggregateOptions = {
        filter: createDefaultFilter(),
      };

      const result = aggregateStreamPosts(postsWithContext, options);

      const twitterPosts = result.posts.filter((p) => p.platform === "TWITTER");
      const facebookPosts = result.posts.filter((p) => p.platform === "FACEBOOK");

      expect(twitterPosts.every((p) => p.accountId === "twitter-account")).toBe(true);
      expect(twitterPosts.every((p) => p.accountName === "Twitter User")).toBe(true);
      expect(facebookPosts.every((p) => p.accountId === "facebook-account")).toBe(true);
    });

    it("should handle empty input", () => {
      const options: AggregateOptions = {
        filter: createDefaultFilter(),
      };

      const result = aggregateStreamPosts([], options);

      expect(result.posts).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should handle accounts with no posts", () => {
      const emptyAccount: [SocialPost[], AccountContext] = [
        [],
        createMockAccountContext({ accountId: "empty" }),
      ];
      const options: AggregateOptions = {
        filter: createDefaultFilter(),
      };

      const result = aggregateStreamPosts([emptyAccount], options);

      expect(result.posts).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("filtering", () => {
    it("should apply platform filter", () => {
      const postsWithContext = createPostsWithContext();
      const options: AggregateOptions = {
        filter: createDefaultFilter({ platforms: ["TWITTER"] }),
      };

      const result = aggregateStreamPosts(postsWithContext, options);

      expect(result.posts).toHaveLength(2);
      expect(result.posts.every((p) => p.platform === "TWITTER")).toBe(true);
      expect(result.totalCount).toBe(2);
    });

    it("should apply date range filter", () => {
      const postsWithContext = createPostsWithContext();
      const options: AggregateOptions = {
        filter: createDefaultFilter({
          dateRange: {
            start: new Date("2024-01-16T00:00:00Z"),
            end: new Date("2024-01-16T23:59:59Z"),
          },
        }),
      };

      const result = aggregateStreamPosts(postsWithContext, options);

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]!.platform).toBe("FACEBOOK");
    });

    it("should apply search query filter", () => {
      const postsWithContext = createPostsWithContext();
      const options: AggregateOptions = {
        filter: createDefaultFilter({ searchQuery: "Facebook" }),
      };

      const result = aggregateStreamPosts(postsWithContext, options);

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]!.content).toContain("Facebook");
    });
  });

  describe("sorting", () => {
    it("should sort by publishedAt descending by default", () => {
      const postsWithContext = createPostsWithContext();
      const options: AggregateOptions = {
        filter: createDefaultFilter({ sortBy: "publishedAt", sortOrder: "desc" }),
      };

      const result = aggregateStreamPosts(postsWithContext, options);

      expect(result.posts[0]!.id).toBe("t2"); // Jan 17
      expect(result.posts[1]!.id).toBe("f1"); // Jan 16
      expect(result.posts[2]!.id).toBe("t1"); // Jan 15
    });

    it("should sort by likes", () => {
      const postsWithContext = createPostsWithContext();
      const options: AggregateOptions = {
        filter: createDefaultFilter({ sortBy: "likes", sortOrder: "desc" }),
      };

      const result = aggregateStreamPosts(postsWithContext, options);

      expect(result.posts[0]!.id).toBe("t2"); // 200 likes
      expect(result.posts[1]!.id).toBe("f1"); // 150 likes
      expect(result.posts[2]!.id).toBe("t1"); // 100 likes
    });
  });

  describe("pagination", () => {
    it("should limit results to specified limit", () => {
      const postsWithContext = createPostsWithContext();
      const options: AggregateOptions = {
        filter: createDefaultFilter(),
        limit: 2,
      };

      const result = aggregateStreamPosts(postsWithContext, options);

      expect(result.posts).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
      expect(result.totalCount).toBe(3);
    });

    it("should use default limit of 20", () => {
      // Create more than 20 posts
      const manyPosts: SocialPost[] = Array.from({ length: 25 }, (_, i) =>
        createMockSocialPost({
          id: `post-${i}`,
          publishedAt: new Date(`2024-01-${String(i + 1).padStart(2, "0")}T10:00:00Z`),
        }));
      const context = createMockAccountContext();

      const options: AggregateOptions = {
        filter: createDefaultFilter(),
      };

      const result = aggregateStreamPosts([[manyPosts, context]], options);

      expect(result.posts).toHaveLength(20);
      expect(result.hasMore).toBe(true);
    });

    it("should handle cursor pagination", () => {
      const postsWithContext = createPostsWithContext();

      // First page
      const firstPageOptions: AggregateOptions = {
        filter: createDefaultFilter(),
        limit: 2,
      };
      const firstPage = aggregateStreamPosts(postsWithContext, firstPageOptions);

      expect(firstPage.posts).toHaveLength(2);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).toBeDefined();

      // Second page
      const secondPageOptions: AggregateOptions = {
        filter: createDefaultFilter(),
        limit: 2,
        cursor: firstPage.nextCursor,
      };
      const secondPage = aggregateStreamPosts(postsWithContext, secondPageOptions);

      expect(secondPage.posts).toHaveLength(1);
      expect(secondPage.hasMore).toBe(false);
      expect(secondPage.nextCursor).toBeUndefined();
    });

    it("should return hasMore=false when all posts fit", () => {
      const postsWithContext = createPostsWithContext();
      const options: AggregateOptions = {
        filter: createDefaultFilter(),
        limit: 10,
      };

      const result = aggregateStreamPosts(postsWithContext, options);

      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should handle invalid cursor gracefully", () => {
      const postsWithContext = createPostsWithContext();
      const options: AggregateOptions = {
        filter: createDefaultFilter(),
        cursor: "invalid-cursor",
      };

      const result = aggregateStreamPosts(postsWithContext, options);

      // Should start from beginning when cursor is invalid
      expect(result.posts).toHaveLength(3);
    });
  });
});

// =============================================================================
// mergeStreamPosts Tests
// =============================================================================

describe("mergeStreamPosts", () => {
  it("should merge multiple arrays of stream posts", () => {
    const array1 = [createMockStreamPost({ id: "1" }), createMockStreamPost({ id: "2" })];
    const array2 = [createMockStreamPost({ id: "3" })];
    const array3 = [createMockStreamPost({ id: "4" }), createMockStreamPost({ id: "5" })];

    const result = mergeStreamPosts(array1, array2, array3);

    expect(result).toHaveLength(5);
    expect(result.map((p) => p.id)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("should handle empty arrays", () => {
    const array1: StreamPost[] = [];
    const array2 = [createMockStreamPost({ id: "1" })];
    const array3: StreamPost[] = [];

    const result = mergeStreamPosts(array1, array2, array3);

    expect(result).toHaveLength(1);
  });

  it("should handle single array", () => {
    const array = [createMockStreamPost({ id: "1" }), createMockStreamPost({ id: "2" })];

    const result = mergeStreamPosts(array);

    expect(result).toHaveLength(2);
  });

  it("should handle no arguments", () => {
    const result = mergeStreamPosts();

    expect(result).toEqual([]);
  });

  it("should handle all empty arrays", () => {
    const result = mergeStreamPosts([], [], []);

    expect(result).toEqual([]);
  });
});
