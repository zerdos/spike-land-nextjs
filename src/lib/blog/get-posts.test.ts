import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs module
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

// Mock gray-matter
vi.mock("gray-matter", () => ({
  default: vi.fn(),
}));

// Mock reading-time
vi.mock("reading-time", () => ({
  default: vi.fn(),
}));

import fs from "fs";
import matter from "gray-matter";
import readingTime from "reading-time";

import {
  getAllCategories,
  getAllPosts,
  getAllTags,
  getFeaturedPosts,
  getPostBySlug,
  getPostsByCategory,
  getPostsByTag,
  getPostSlugs,
} from "./get-posts";

describe("get-posts", () => {
  const mockFrontmatter = {
    title: "Test Post",
    slug: "test-post",
    description: "A test post",
    date: "2025-01-01",
    author: "Test Author",
    category: "Testing",
    tags: ["test", "vitest"],
    featured: false,
  };

  const mockContent = "This is the content of the test post.";

  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock implementations
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      "test-post.mdx" as unknown as import("fs").Dirent,
    ]);
    vi.mocked(fs.readFileSync).mockReturnValue(
      `---\ntitle: Test Post\n---\n${mockContent}`,
    );
    vi.mocked(matter).mockReturnValue({
      data: mockFrontmatter,
      content: mockContent,
      matter: "",
      language: "",
      orig: Buffer.from(""),
      stringify: vi.fn(),
    });
    vi.mocked(readingTime).mockReturnValue({
      text: "1 min read",
      minutes: 1,
      time: 60000,
      words: 200,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getPostSlugs", () => {
    it("returns empty array when blog directory does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const slugs = getPostSlugs();

      expect(slugs).toEqual([]);
    });

    it("returns slugs from mdx files", () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        "post-1.mdx" as unknown as import("fs").Dirent,
        "post-2.mdx" as unknown as import("fs").Dirent,
        "not-mdx.txt" as unknown as import("fs").Dirent,
      ]);

      const slugs = getPostSlugs();

      expect(slugs).toEqual(["post-1", "post-2"]);
    });

    it("filters out non-mdx files", () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        "post.mdx" as unknown as import("fs").Dirent,
        "readme.md" as unknown as import("fs").Dirent,
        "script.ts" as unknown as import("fs").Dirent,
      ]);

      const slugs = getPostSlugs();

      expect(slugs).toEqual(["post"]);
    });
  });

  describe("getPostBySlug", () => {
    it("returns null when post file does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const post = getPostBySlug("non-existent");

      expect(post).toBeNull();
    });

    it("returns post with frontmatter, content, slug and reading time", () => {
      const post = getPostBySlug("test-post");

      expect(post).toEqual({
        frontmatter: mockFrontmatter,
        content: mockContent,
        slug: "test-post",
        readingTime: "1 min read",
      });
    });

    it("calls gray-matter with file contents", () => {
      const fileContent = "mock file content";
      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);

      getPostBySlug("test-post");

      expect(matter).toHaveBeenCalledWith(fileContent);
    });
  });

  describe("getAllPosts", () => {
    it("returns empty array when no posts exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const posts = getAllPosts();

      expect(posts).toEqual([]);
    });

    it("returns posts sorted by date (newest first)", () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        "old-post.mdx" as unknown as import("fs").Dirent,
        "new-post.mdx" as unknown as import("fs").Dirent,
      ]);

      // Mock different dates for each post
      let callCount = 0;
      vi.mocked(matter).mockImplementation(() => {
        callCount++;
        return {
          data: {
            ...mockFrontmatter,
            date: callCount === 1 ? "2024-01-01" : "2025-01-01",
            slug: callCount === 1 ? "old-post" : "new-post",
          },
          content: mockContent,
          matter: "",
          language: "",
          orig: Buffer.from(""),
          stringify: vi.fn(),
        };
      });

      const posts = getAllPosts();

      expect(posts[0].frontmatter.date).toBe("2025-01-01");
      expect(posts[1].frontmatter.date).toBe("2024-01-01");
    });

    it("filters out invalid posts", () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        "valid-post.mdx" as unknown as import("fs").Dirent,
        "invalid-post.mdx" as unknown as import("fs").Dirent,
      ]);

      // First call returns valid, second returns null
      let callCount = 0;
      vi.mocked(fs.existsSync).mockImplementation(() => {
        callCount++;
        return callCount !== 2;
      });

      const posts = getAllPosts();

      expect(posts).toHaveLength(1);
    });
  });

  describe("getPostsByCategory", () => {
    it("returns posts matching category (case insensitive)", () => {
      vi.mocked(matter).mockReturnValue({
        data: { ...mockFrontmatter, category: "Testing" },
        content: mockContent,
        matter: "",
        language: "",
        orig: Buffer.from(""),
        stringify: vi.fn(),
      });

      const posts = getPostsByCategory("testing");

      expect(posts).toHaveLength(1);
      expect(posts[0].frontmatter.category).toBe("Testing");
    });

    it("returns empty array when no posts match category", () => {
      const posts = getPostsByCategory("NonExistent");

      expect(posts).toEqual([]);
    });
  });

  describe("getPostsByTag", () => {
    it("returns posts containing tag (case insensitive)", () => {
      vi.mocked(matter).mockReturnValue({
        data: { ...mockFrontmatter, tags: ["Test", "Vitest"] },
        content: mockContent,
        matter: "",
        language: "",
        orig: Buffer.from(""),
        stringify: vi.fn(),
      });

      const posts = getPostsByTag("test");

      expect(posts).toHaveLength(1);
    });

    it("returns empty array when no posts have tag", () => {
      const posts = getPostsByTag("nonexistent");

      expect(posts).toEqual([]);
    });
  });

  describe("getFeaturedPosts", () => {
    it("returns only featured posts", () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        "featured.mdx" as unknown as import("fs").Dirent,
        "not-featured.mdx" as unknown as import("fs").Dirent,
      ]);

      let callCount = 0;
      vi.mocked(matter).mockImplementation(() => {
        callCount++;
        return {
          data: { ...mockFrontmatter, featured: callCount === 1 },
          content: mockContent,
          matter: "",
          language: "",
          orig: Buffer.from(""),
          stringify: vi.fn(),
        };
      });

      const posts = getFeaturedPosts();

      expect(posts).toHaveLength(1);
      expect(posts[0].frontmatter.featured).toBe(true);
    });
  });

  describe("getAllCategories", () => {
    it("returns unique categories sorted alphabetically", () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        "post1.mdx" as unknown as import("fs").Dirent,
        "post2.mdx" as unknown as import("fs").Dirent,
        "post3.mdx" as unknown as import("fs").Dirent,
      ]);

      let callCount = 0;
      const categories = ["Zebra", "Alpha", "Alpha"];
      vi.mocked(matter).mockImplementation(() => {
        const category = categories[callCount++];
        return {
          data: { ...mockFrontmatter, category },
          content: mockContent,
          matter: "",
          language: "",
          orig: Buffer.from(""),
          stringify: vi.fn(),
        };
      });

      const result = getAllCategories();

      expect(result).toEqual(["Alpha", "Zebra"]);
    });
  });

  describe("getAllTags", () => {
    it("returns unique tags sorted alphabetically", () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        "post1.mdx" as unknown as import("fs").Dirent,
        "post2.mdx" as unknown as import("fs").Dirent,
      ]);

      let callCount = 0;
      const tagSets = [
        ["alpha", "beta"],
        ["beta", "gamma"],
      ];
      vi.mocked(matter).mockImplementation(() => {
        const tags = tagSets[callCount++];
        return {
          data: { ...mockFrontmatter, tags },
          content: mockContent,
          matter: "",
          language: "",
          orig: Buffer.from(""),
          stringify: vi.fn(),
        };
      });

      const result = getAllTags();

      expect(result).toEqual(["alpha", "beta", "gamma"]);
    });
  });
});
