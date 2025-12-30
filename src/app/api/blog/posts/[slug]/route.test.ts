import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// Mock the blog functions
vi.mock("@/lib/blog/get-posts", () => ({
  getPostBySlug: vi.fn((slug: string) => {
    if (slug === "test-post") {
      return {
        slug: "test-post",
        frontmatter: {
          title: "Test Post",
          slug: "test-post",
          description: "Test description",
          date: "2025-01-01",
          author: "Test Author",
          category: "Test Category",
          tags: ["test", "example"],
          image: "/test.jpg",
          featured: true,
          listed: true,
        },
        content: "# Test Content\n\nThis is the post content.",
        readingTime: "2 min read",
      };
    }
    return null;
  }),
}));

describe("GET /api/blog/posts/[slug]", () => {
  it("returns a single blog post", async () => {
    const request = new Request(
      "http://localhost:3000/api/blog/posts/test-post",
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "test-post" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.post).toBeDefined();
    expect(data.post.slug).toBe("test-post");
    expect(data.post.title).toBe("Test Post");
  });

  it("returns 404 for non-existent post", async () => {
    const request = new Request(
      "http://localhost:3000/api/blog/posts/not-found",
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "not-found" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Post not found");
  });

  it("includes full content for single post", async () => {
    const request = new Request(
      "http://localhost:3000/api/blog/posts/test-post",
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "test-post" }),
    });
    const data = await response.json();

    expect(data.post.content).toBe(
      "# Test Content\n\nThis is the post content.",
    );
  });

  it("transforms post data correctly", async () => {
    const request = new Request(
      "http://localhost:3000/api/blog/posts/test-post",
    );
    const response = await GET(request, {
      params: Promise.resolve({ slug: "test-post" }),
    });
    const data = await response.json();

    const post = data.post;
    expect(post.slug).toBe("test-post");
    expect(post.title).toBe("Test Post");
    expect(post.excerpt).toBe("Test description");
    expect(post.date).toBe("2025-01-01");
    expect(post.author).toBe("Test Author");
    expect(post.image).toBe("/test.jpg");
    expect(post.category).toBe("Test Category");
    expect(post.tags).toEqual(["test", "example"]);
    expect(post.readingTime).toBe("2 min read");
    expect(post.featured).toBe(true);
  });
});
