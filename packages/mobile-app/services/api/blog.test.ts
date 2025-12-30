/**
 * Blog API Service Tests
 */

import { apiClient } from "../api-client";
import {
  getBlogPost,
  getBlogPosts,
  getBlogPostsByCategory,
  getBlogPostsByTag,
  getFeaturedPosts,
} from "./blog";

// Mock the apiClient
jest.mock("../api-client", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("Blog API Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getBlogPosts", () => {
    it("should fetch all blog posts without parameters", async () => {
      const mockResponse = {
        data: {
          posts: [
            {
              slug: "test-post",
              title: "Test Post",
              excerpt: "Test excerpt",
              content: "Test content",
              date: "2024-01-01",
              author: "Test Author",
              category: "Tech",
              tags: ["react", "mobile"],
              readingTime: "5 min read",
            },
          ],
          total: 1,
        },
        error: null,
        status: 200,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getBlogPosts();

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/blog/posts");
      expect(result).toEqual(mockResponse);
    });

    it("should fetch blog posts with page parameter", async () => {
      const mockResponse = {
        data: { posts: [], total: 0 },
        error: null,
        status: 200,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await getBlogPosts({ page: 2 });

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/blog/posts?page=2");
    });

    it("should fetch blog posts with limit parameter", async () => {
      const mockResponse = {
        data: { posts: [], total: 0 },
        error: null,
        status: 200,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await getBlogPosts({ limit: 10 });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/blog/posts?limit=10",
      );
    });

    it("should fetch blog posts with category parameter", async () => {
      const mockResponse = {
        data: { posts: [], total: 0 },
        error: null,
        status: 200,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await getBlogPosts({ category: "Tech" });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/blog/posts?category=Tech",
      );
    });

    it("should fetch blog posts with tag parameter", async () => {
      const mockResponse = {
        data: { posts: [], total: 0 },
        error: null,
        status: 200,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await getBlogPosts({ tag: "react" });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/blog/posts?tag=react",
      );
    });

    it("should fetch blog posts with featured parameter", async () => {
      const mockResponse = {
        data: { posts: [], total: 0 },
        error: null,
        status: 200,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await getBlogPosts({ featured: true });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/blog/posts?featured=true",
      );
    });

    it("should fetch blog posts with multiple parameters", async () => {
      const mockResponse = {
        data: { posts: [], total: 0 },
        error: null,
        status: 200,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await getBlogPosts({ page: 1, limit: 5, category: "Tech" });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/blog/posts?page=1&limit=5&category=Tech",
      );
    });

    it("should handle API errors", async () => {
      const mockErrorResponse = {
        data: null,
        error: "Network error",
        status: 500,
      };

      mockApiClient.get.mockResolvedValue(mockErrorResponse);

      const result = await getBlogPosts();

      expect(result.error).toBe("Network error");
      expect(result.status).toBe(500);
    });
  });

  describe("getBlogPost", () => {
    it("should fetch a single blog post by slug", async () => {
      const mockResponse = {
        data: {
          post: {
            slug: "test-post",
            title: "Test Post",
            excerpt: "Test excerpt",
            content: "Full content here",
            date: "2024-01-01",
            author: "Test Author",
            category: "Tech",
            tags: ["react"],
            readingTime: "5 min read",
          },
        },
        error: null,
        status: 200,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getBlogPost("test-post");

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/blog/posts/test-post",
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle not found error", async () => {
      const mockErrorResponse = {
        data: null,
        error: "Post not found",
        status: 404,
      };

      mockApiClient.get.mockResolvedValue(mockErrorResponse);

      const result = await getBlogPost("non-existent");

      expect(result.error).toBe("Post not found");
      expect(result.status).toBe(404);
    });
  });

  describe("getFeaturedPosts", () => {
    it("should fetch featured blog posts", async () => {
      const mockResponse = {
        data: {
          posts: [
            {
              slug: "featured-post",
              title: "Featured Post",
              excerpt: "Featured excerpt",
              content: "Featured content",
              date: "2024-01-01",
              author: "Author",
              category: "News",
              tags: [],
              readingTime: "3 min read",
              featured: true,
            },
          ],
          total: 1,
        },
        error: null,
        status: 200,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getFeaturedPosts();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/blog/posts?featured=true",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getBlogPostsByCategory", () => {
    it("should fetch blog posts by category", async () => {
      const mockResponse = {
        data: { posts: [], total: 0 },
        error: null,
        status: 200,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await getBlogPostsByCategory("Tutorial");

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/blog/posts?category=Tutorial",
      );
    });
  });

  describe("getBlogPostsByTag", () => {
    it("should fetch blog posts by tag", async () => {
      const mockResponse = {
        data: { posts: [], total: 0 },
        error: null,
        status: 200,
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      await getBlogPostsByTag("typescript");

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/blog/posts?tag=typescript",
      );
    });
  });
});
