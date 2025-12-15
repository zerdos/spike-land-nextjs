import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks before they are hoisted
const {
  mockGetPostBySlug,
  mockGetAllPosts,
  mockGetPostSlugs,
  mockSerialize,
  mockNotFound,
} = vi.hoisted(() => ({
  mockGetPostBySlug: vi.fn(),
  mockGetAllPosts: vi.fn(),
  mockGetPostSlugs: vi.fn(),
  mockSerialize: vi.fn(),
  mockNotFound: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/blog/get-posts", () => ({
  getPostBySlug: mockGetPostBySlug,
  getAllPosts: mockGetAllPosts,
  getPostSlugs: mockGetPostSlugs,
}));

vi.mock("next-mdx-remote/serialize", () => ({
  serialize: mockSerialize,
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

// Mock the MDXContent component to avoid serialization issues in tests
vi.mock("@/components/blog/MDXContent", () => ({
  MDXContent: ({ source }: { source: unknown; }) => (
    <div data-testid="mdx-content">{JSON.stringify(source)}</div>
  ),
}));

// Import after mocks are set up
import BlogPostPage, { generateMetadata, generateStaticParams } from "./page";

describe("BlogPostPage", () => {
  const mockPost = {
    frontmatter: {
      title: "Test Blog Post",
      slug: "test-post",
      description: "This is a test blog post description",
      date: "2024-12-01",
      author: "Test Author",
      category: "Tutorial",
      tags: ["test", "blog"],
      image: "/images/test.jpg",
      featured: true,
    },
    content: "# Test Content\n\nThis is test content.",
    slug: "test-post",
    readingTime: "2 min read",
  };

  const mockAllPosts = [
    {
      frontmatter: {
        title: "Newer Post",
        slug: "newer-post",
        description: "A newer post",
        date: "2024-12-15",
        author: "Author",
        category: "News",
        tags: ["news"],
      },
      slug: "newer-post",
      readingTime: "3 min read",
    },
    mockPost,
    {
      frontmatter: {
        title: "Older Post",
        slug: "older-post",
        description: "An older post",
        date: "2024-11-15",
        author: "Author",
        category: "Updates",
        tags: ["updates"],
      },
      slug: "older-post",
      readingTime: "1 min read",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSerialize.mockResolvedValue({ compiledSource: "compiled" });
  });

  describe("generateStaticParams", () => {
    it("returns all blog post slugs for static generation", async () => {
      mockGetPostSlugs.mockReturnValue(["post-1", "post-2", "post-3"]);

      const result = await generateStaticParams();

      expect(result).toEqual([
        { slug: "post-1" },
        { slug: "post-2" },
        { slug: "post-3" },
      ]);
    });

    it("returns empty array when no posts exist", async () => {
      mockGetPostSlugs.mockReturnValue([]);

      const result = await generateStaticParams();

      expect(result).toEqual([]);
    });
  });

  describe("generateMetadata", () => {
    it("returns correct metadata for existing post", async () => {
      mockGetPostBySlug.mockReturnValue(mockPost);

      const params = Promise.resolve({ slug: "test-post" });
      const metadata = await generateMetadata({ params });

      expect(metadata.title).toBe("Test Blog Post | Spike Land Blog");
      expect(metadata.description).toBe("This is a test blog post description");
      expect(metadata.authors).toEqual([{ name: "Test Author" }]);
      expect(metadata.keywords).toEqual(["test", "blog"]);
      expect(metadata.openGraph?.title).toBe("Test Blog Post");
      expect(metadata.openGraph?.images).toEqual([{ url: "/images/test.jpg" }]);
      expect(metadata.twitter?.card).toBe("summary_large_image");
    });

    it("returns 404 metadata for non-existent post", async () => {
      mockGetPostBySlug.mockReturnValue(null);

      const params = Promise.resolve({ slug: "non-existent" });
      const metadata = await generateMetadata({ params });

      expect(metadata.title).toBe("Post Not Found | Spike Land Blog");
    });

    it("handles posts without images", async () => {
      const postWithoutImage = {
        ...mockPost,
        frontmatter: { ...mockPost.frontmatter, image: undefined },
      };
      mockGetPostBySlug.mockReturnValue(postWithoutImage);

      const params = Promise.resolve({ slug: "test-post" });
      const metadata = await generateMetadata({ params });

      expect(metadata.openGraph?.images).toBeUndefined();
      expect(metadata.twitter?.images).toBeUndefined();
    });
  });

  describe("BlogPostPage component", () => {
    it("renders blog post with content", async () => {
      mockGetPostBySlug.mockReturnValue(mockPost);
      mockGetAllPosts.mockReturnValue(mockAllPosts);

      const params = Promise.resolve({ slug: "test-post" });
      render(await BlogPostPage({ params }));

      expect(screen.getByText("Test Blog Post")).toBeInTheDocument();
      expect(screen.getByText("Tutorial")).toBeInTheDocument();
      expect(screen.getByText("2 min read")).toBeInTheDocument();
      expect(screen.getByTestId("mdx-content")).toBeInTheDocument();
    });

    it("returns 404 for non-existent post", async () => {
      mockGetPostBySlug.mockReturnValue(null);

      const params = Promise.resolve({ slug: "non-existent" });
      await expect(BlogPostPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalled();
    });

    it("shows back to blog link", async () => {
      mockGetPostBySlug.mockReturnValue(mockPost);
      mockGetAllPosts.mockReturnValue(mockAllPosts);

      const params = Promise.resolve({ slug: "test-post" });
      render(await BlogPostPage({ params }));

      const backLink = screen.getByRole("link", { name: /back to blog/i });
      expect(backLink).toHaveAttribute("href", "/blog");
    });

    it("shows prev/next navigation when posts exist", async () => {
      mockGetPostBySlug.mockReturnValue(mockPost);
      mockGetAllPosts.mockReturnValue(mockAllPosts);

      const params = Promise.resolve({ slug: "test-post" });
      render(await BlogPostPage({ params }));

      // Check for previous post link (older post)
      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Older Post")).toBeInTheDocument();

      // Check for next post link (newer post)
      expect(screen.getByText("Next")).toBeInTheDocument();
      expect(screen.getByText("Newer Post")).toBeInTheDocument();
    });

    it("hides navigation for only post", async () => {
      mockGetPostBySlug.mockReturnValue(mockPost);
      mockGetAllPosts.mockReturnValue([mockPost]);

      const params = Promise.resolve({ slug: "test-post" });
      render(await BlogPostPage({ params }));

      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
    });

    it("displays CTA section", async () => {
      mockGetPostBySlug.mockReturnValue(mockPost);
      mockGetAllPosts.mockReturnValue(mockAllPosts);

      const params = Promise.resolve({ slug: "test-post" });
      render(await BlogPostPage({ params }));

      expect(screen.getByText("Ready to try Pixel?")).toBeInTheDocument();
      expect(screen.getByText(/Transform your photos/i)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /try pixel free/i }),
      ).toHaveAttribute("href", "/apps/pixel");
    });

    it("displays author and date", async () => {
      mockGetPostBySlug.mockReturnValue(mockPost);
      mockGetAllPosts.mockReturnValue(mockAllPosts);

      const params = Promise.resolve({ slug: "test-post" });
      render(await BlogPostPage({ params }));

      expect(screen.getByText("Test Author")).toBeInTheDocument();
    });

    it("displays tags with hashtag prefix", async () => {
      mockGetPostBySlug.mockReturnValue(mockPost);
      mockGetAllPosts.mockReturnValue(mockAllPosts);

      const params = Promise.resolve({ slug: "test-post" });
      render(await BlogPostPage({ params }));

      // Tags are rendered with "#" prefix in BlogHeader component
      expect(screen.getByText("#test")).toBeInTheDocument();
      expect(screen.getByText("#blog")).toBeInTheDocument();
    });
  });
});
