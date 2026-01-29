/**
 * Public Facebook API Client Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicFacebookClient } from "./facebook";

describe("PublicFacebookClient", () => {
  let client: PublicFacebookClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new PublicFacebookClient();
  });

  describe("getAccountInfo", () => {
    it("should return mock account info for valid handle", async () => {
      const handle = "testpage";

      const result = await client.getAccountInfo(handle);

      expect(result).toEqual({
        handle,
        name: "Testpage's Page",
        profileUrl: `https://www.facebook.com/${handle}`,
        avatarUrl: expect.stringContaining(handle),
      });
    });

    it("should return null for empty handle", async () => {
      const result = await client.getAccountInfo("");

      expect(result).toBeNull();
    });

    it("should capitalize first letter of handle in name", async () => {
      const handle = "mycompany";

      const result = await client.getAccountInfo(handle);

      expect(result?.name).toBe("Mycompany's Page");
    });

    it("should handle single character handle", async () => {
      const handle = "a";

      const result = await client.getAccountInfo(handle);

      expect(result?.name).toBe("A's Page");
    });

    it("should include handle in avatar URL", async () => {
      const handle = "testpage";

      const result = await client.getAccountInfo(handle);

      expect(result?.avatarUrl).toContain(handle);
    });
  });

  describe("getPosts", () => {
    it("should return mock posts for valid handle", async () => {
      const handle = "testpage";

      const result = await client.getPosts(handle);

      expect(result).toHaveLength(5);
      expect(result[0]).toMatchObject({
        id: expect.stringContaining("mock_fb_post_"),
        content: expect.stringContaining(handle),
        authorHandle: handle,
        url: expect.stringContaining(handle),
        likes: expect.any(Number),
        comments: expect.any(Number),
        shares: expect.any(Number),
      });
    });

    it("should return empty array for empty handle", async () => {
      const result = await client.getPosts("");

      expect(result).toEqual([]);
    });

    it("should generate 5 posts", async () => {
      const handle = "testpage";

      const result = await client.getPosts(handle);

      expect(result).toHaveLength(5);
    });

    it("should have different post IDs", async () => {
      const handle = "testpage";

      const result = await client.getPosts(handle);

      const ids = result.map((post) => post.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(5);
    });

    it("should have posts with recent timestamps", async () => {
      const handle = "testpage";

      const result = await client.getPosts(handle);

      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      result.forEach((post) => {
        expect(post.publishedAt.getTime()).toBeLessThanOrEqual(now);
        expect(post.publishedAt.getTime()).toBeGreaterThan(
          oneDayAgo - 5 * 24 * 60 * 60 * 1000,
        );
      });
    });

    it("should have posts with positive engagement numbers", async () => {
      const handle = "testpage";

      const result = await client.getPosts(handle);

      result.forEach((post) => {
        expect(post.likes).toBeGreaterThan(0);
        expect(post.comments).toBeGreaterThan(0);
        expect(post.shares).toBeGreaterThan(0);
      });
    });

    it("should include hashtags in post content", async () => {
      const handle = "testpage";

      const result = await client.getPosts(handle);

      result.forEach((post) => {
        expect(post.content).toContain("#mock");
        expect(post.content).toContain("#testing");
      });
    });
  });

  describe("validateAccount", () => {
    it("should return true for valid handle", async () => {
      const handle = "testpage";

      const result = await client.validateAccount(handle);

      expect(result).toBe(true);
    });

    it("should return false for empty handle", async () => {
      const result = await client.validateAccount("");

      expect(result).toBe(false);
    });

    it("should return true for any non-empty string", async () => {
      const handles = ["a", "test", "company-page", "user123"];

      for (const handle of handles) {
        const result = await client.validateAccount(handle);
        expect(result).toBe(true);
      }
    });
  });

});
