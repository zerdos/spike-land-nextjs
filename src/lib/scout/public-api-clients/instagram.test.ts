/**
 * Public Instagram API Client Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicInstagramClient } from "./instagram";

describe("PublicInstagramClient", () => {
  let client: PublicInstagramClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new PublicInstagramClient();
  });

  describe("getAccountInfo", () => {
    it("should return mock account info for valid handle", async () => {
      const handle = "testuser";

      const result = await client.getAccountInfo(handle);

      expect(result).toEqual({
        handle,
        name: `${handle}'s Photos`,
        profileUrl: `https://www.instagram.com/${handle}`,
        avatarUrl: expect.stringContaining(handle),
      });
    });

    it("should return null for empty handle", async () => {
      const result = await client.getAccountInfo("");

      expect(result).toBeNull();
    });

    it("should format name with Photos suffix", async () => {
      const handle = "photographer";

      const result = await client.getAccountInfo(handle);

      expect(result?.name).toBe("photographer's Photos");
    });

    it("should handle single character handle", async () => {
      const handle = "x";

      const result = await client.getAccountInfo(handle);

      expect(result?.name).toBe("x's Photos");
    });

    it("should include handle in avatar URL", async () => {
      const handle = "testuser";

      const result = await client.getAccountInfo(handle);

      expect(result?.avatarUrl).toContain(handle);
    });
  });

  describe("getPosts", () => {
    it("should return mock posts for valid handle", async () => {
      const handle = "testuser";

      const result = await client.getPosts(handle);

      expect(result).toHaveLength(5);
      expect(result[0]).toMatchObject({
        id: expect.stringContaining("mock_ig_post_"),
        content: expect.stringContaining(handle),
        authorHandle: handle,
        url: expect.stringContaining("/p/"),
        likes: expect.any(Number),
        comments: expect.any(Number),
      });
    });

    it("should return empty array for empty handle", async () => {
      const result = await client.getPosts("");

      expect(result).toEqual([]);
    });

    it("should generate 5 posts", async () => {
      const handle = "testuser";

      const result = await client.getPosts(handle);

      expect(result).toHaveLength(5);
    });

    it("should have different post IDs", async () => {
      const handle = "testuser";

      const result = await client.getPosts(handle);

      const ids = result.map((post) => post.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(5);
    });

    it("should not have shares property", async () => {
      const handle = "testuser";

      const result = await client.getPosts(handle);

      result.forEach((post) => {
        expect(post).not.toHaveProperty("shares");
      });
    });

    it("should have posts with recent timestamps", async () => {
      const handle = "testuser";

      const result = await client.getPosts(handle);

      const now = Date.now();
      const someDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      result.forEach((post) => {
        expect(post.publishedAt.getTime()).toBeLessThanOrEqual(now);
        expect(post.publishedAt.getTime()).toBeGreaterThan(someDaysAgo);
      });
    });

    it("should have posts with positive engagement numbers", async () => {
      const handle = "testuser";

      const result = await client.getPosts(handle);

      result.forEach((post) => {
        expect(post.likes).toBeGreaterThan(0);
        expect(post.comments).toBeGreaterThan(0);
      });
    });

    it("should include hashtags in post content", async () => {
      const handle = "testuser";

      const result = await client.getPosts(handle);

      result.forEach((post) => {
        expect(post.content).toContain("#instagram");
        expect(post.content).toContain("#mock");
        expect(post.content).toContain("#test");
      });
    });

    it("should have posts published approximately 1.5 days apart", async () => {
      const handle = "testuser";

      const result = await client.getPosts(handle);

      if (result.length > 1) {
        const firstPost = result[0]!;
        const secondPost = result[1]!;

        const timeDiff = firstPost.publishedAt.getTime() - secondPost.publishedAt.getTime();
        const expectedDiff = 36 * 60 * 60 * 1000; // 1.5 days in ms

        expect(timeDiff).toBeCloseTo(expectedDiff, -2);
      }
    });
  });

  describe("validateAccount", () => {
    it("should return true for valid handle", async () => {
      const handle = "testuser";

      const result = await client.validateAccount(handle);

      expect(result).toBe(true);
    });

    it("should return false for empty handle", async () => {
      const result = await client.validateAccount("");

      expect(result).toBe(false);
    });

    it("should return true for any non-empty string", async () => {
      const handles = ["a", "test", "user_name", "user123"];

      for (const handle of handles) {
        const result = await client.validateAccount(handle);
        expect(result).toBe(true);
      }
    });
  });

});
