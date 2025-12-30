import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

// Mock the blog functions
vi.mock("@/lib/blog/get-posts", () => ({
  getAllPosts: vi.fn(() => [
    {
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
      readingTime: "2 min read",
    },
  ]),
  getPostsByCategory: vi.fn(() => []),
  getPostsByTag: vi.fn(() => []),
  getFeaturedPosts: vi.fn(() => []),
}));

describe("GET /api/blog/posts", () => {
  it("returns blog posts list", async () => {
    const request = new Request("http://localhost:3000/api/blog/posts");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toHaveLength(1);
    expect(data.posts[0].slug).toBe("test-post");
    expect(data.posts[0].title).toBe("Test Post");
    expect(data.posts[0].excerpt).toBe("Test description");
    expect(data.total).toBe(1);
  });

  it("returns paginated results", async () => {
    const request = new Request(
      "http://localhost:3000/api/blog/posts?page=1&limit=5",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(5);
    expect(data.totalPages).toBe(1);
  });

  it("transforms post data correctly", async () => {
    const request = new Request("http://localhost:3000/api/blog/posts");
    const response = await GET(request);
    const data = await response.json();

    const post = data.posts[0];
    expect(post.slug).toBe("test-post");
    expect(post.title).toBe("Test Post");
    expect(post.excerpt).toBe("Test description");
    expect(post.content).toBe(""); // List endpoint doesn't include content
    expect(post.date).toBe("2025-01-01");
    expect(post.author).toBe("Test Author");
    expect(post.image).toBe("/test.jpg");
    expect(post.category).toBe("Test Category");
    expect(post.tags).toEqual(["test", "example"]);
    expect(post.readingTime).toBe("2 min read");
    expect(post.featured).toBe(true);
  });
});
