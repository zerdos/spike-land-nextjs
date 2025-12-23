import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BlogPostMeta } from "@/lib/blog/types";

import { BlogCard } from "./BlogCard";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
    // eslint-disable-next-line @next/next/no-img-element
  }) => <img src={src} alt={alt} data-testid="blog-card-image" {...props} />,
}));

describe("BlogCard", () => {
  const mockPost: BlogPostMeta = {
    frontmatter: {
      title: "Test Blog Post Title",
      slug: "test-blog-post",
      description: "This is a test blog post description that should be displayed.",
      date: "2025-01-15",
      author: "Test Author",
      category: "Testing",
      tags: ["test", "vitest", "react"],
      image: "/images/test.jpg",
      featured: false,
      listed: true,
    },
    slug: "test-blog-post",
    readingTime: "3 min read",
  };

  it("renders the post title", () => {
    render(<BlogCard post={mockPost} />);

    expect(screen.getByText("Test Blog Post Title")).toBeInTheDocument();
  });

  it("renders the post description", () => {
    render(<BlogCard post={mockPost} />);

    expect(
      screen.getByText(/This is a test blog post description/),
    ).toBeInTheDocument();
  });

  it("renders the category", () => {
    render(<BlogCard post={mockPost} />);

    expect(screen.getByText("Testing")).toBeInTheDocument();
  });

  it("renders formatted date", () => {
    render(<BlogCard post={mockPost} />);

    // Date should be formatted as "Jan 15, 2025"
    expect(screen.getByText("Jan 15, 2025")).toBeInTheDocument();
  });

  it("renders reading time", () => {
    render(<BlogCard post={mockPost} />);

    expect(screen.getByText("3 min read")).toBeInTheDocument();
  });

  it("renders tags (up to 3)", () => {
    render(<BlogCard post={mockPost} />);

    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText("vitest")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
  });

  it("shows +N for more than 3 tags", () => {
    const postWithManyTags: BlogPostMeta = {
      ...mockPost,
      frontmatter: {
        ...mockPost.frontmatter,
        tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
      },
    };

    render(<BlogCard post={postWithManyTags} />);

    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("renders cover image when provided", () => {
    render(<BlogCard post={mockPost} />);

    const image = screen.getByTestId("blog-card-image");
    expect(image).toHaveAttribute("src", "/images/test.jpg");
    expect(image).toHaveAttribute("alt", "Test Blog Post Title");
  });

  it("does not render image when not provided", () => {
    const postWithoutImage: BlogPostMeta = {
      ...mockPost,
      frontmatter: {
        ...mockPost.frontmatter,
        image: undefined,
      },
    };

    render(<BlogCard post={postWithoutImage} />);

    expect(screen.queryByTestId("blog-card-image")).not.toBeInTheDocument();
  });

  it("shows featured badge when post is featured", () => {
    const featuredPost: BlogPostMeta = {
      ...mockPost,
      frontmatter: {
        ...mockPost.frontmatter,
        featured: true,
      },
    };

    render(<BlogCard post={featuredPost} />);

    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("does not show featured badge for non-featured posts", () => {
    render(<BlogCard post={mockPost} />);

    expect(screen.queryByText("Featured")).not.toBeInTheDocument();
  });

  it("links to the correct blog post URL", () => {
    render(<BlogCard post={mockPost} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/blog/test-blog-post");
  });

  it("handles empty tags array", () => {
    const postWithNoTags: BlogPostMeta = {
      ...mockPost,
      frontmatter: {
        ...mockPost.frontmatter,
        tags: [],
      },
    };

    render(<BlogCard post={postWithNoTags} />);

    // Should not crash and should not show any tags
    expect(screen.queryByText("test")).not.toBeInTheDocument();
  });
});
