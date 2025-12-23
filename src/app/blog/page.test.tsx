import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the get-posts module
vi.mock("@/lib/blog/get-posts", () => ({
  getAllPosts: vi.fn(),
}));

// Mock the BlogCard component
vi.mock("@/components/blog", () => ({
  BlogCard: (
    { post }: { post: { slug: string; frontmatter: { title: string; }; }; },
  ) => <div data-testid={`blog-card-${post.slug}`}>{post.frontmatter.title}</div>,
}));

import { getAllPosts } from "@/lib/blog/get-posts";

import BlogPage from "./page";

describe("BlogPage", () => {
  it("renders the page title", () => {
    vi.mocked(getAllPosts).mockReturnValue([]);

    render(<BlogPage />);

    expect(screen.getByRole("heading", { name: "Blog" })).toBeInTheDocument();
  });

  it("renders the page description", () => {
    vi.mocked(getAllPosts).mockReturnValue([]);

    render(<BlogPage />);

    expect(
      screen.getByText(/Latest news, tutorials, and updates from Spike Land/),
    ).toBeInTheDocument();
  });

  it("shows empty state when no posts exist", () => {
    vi.mocked(getAllPosts).mockReturnValue([]);

    render(<BlogPage />);

    expect(
      screen.getByText("No blog posts yet. Check back soon!"),
    ).toBeInTheDocument();
  });

  it("renders BlogCard for each post", () => {
    vi.mocked(getAllPosts).mockReturnValue([
      {
        frontmatter: {
          title: "First Post",
          slug: "first-post",
          description: "Description 1",
          date: "2025-01-01",
          author: "Author",
          category: "Tech",
          tags: [],
          listed: true,
        },
        slug: "first-post",
        readingTime: "2 min",
      },
      {
        frontmatter: {
          title: "Second Post",
          slug: "second-post",
          description: "Description 2",
          date: "2025-01-02",
          author: "Author",
          category: "Tech",
          tags: [],
          listed: true,
        },
        slug: "second-post",
        readingTime: "3 min",
      },
    ]);

    render(<BlogPage />);

    expect(screen.getByTestId("blog-card-first-post")).toBeInTheDocument();
    expect(screen.getByTestId("blog-card-second-post")).toBeInTheDocument();
    expect(screen.getByText("First Post")).toBeInTheDocument();
    expect(screen.getByText("Second Post")).toBeInTheDocument();
  });

  it("does not show empty state when posts exist", () => {
    vi.mocked(getAllPosts).mockReturnValue([
      {
        frontmatter: {
          title: "Post",
          slug: "post",
          description: "Desc",
          date: "2025-01-01",
          author: "Author",
          category: "Tech",
          tags: [],
          listed: true,
        },
        slug: "post",
        readingTime: "2 min",
      },
    ]);

    render(<BlogPage />);

    expect(
      screen.queryByText("No blog posts yet. Check back soon!"),
    ).not.toBeInTheDocument();
  });
});
