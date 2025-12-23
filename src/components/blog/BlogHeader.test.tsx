import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BlogPostFrontmatter } from "@/lib/blog/types";

import { BlogHeader } from "./BlogHeader";

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
    priority?: boolean;
    className?: string;
    // eslint-disable-next-line @next/next/no-img-element
  }) => <img src={src} alt={alt} data-testid="header-image" {...props} />,
}));

describe("BlogHeader", () => {
  const mockFrontmatter: BlogPostFrontmatter = {
    title: "Amazing Blog Post Title",
    slug: "amazing-blog-post",
    description: "This is a compelling description of the blog post.",
    date: "2025-01-15",
    author: "John Doe",
    category: "Technology",
    tags: ["tech", "ai", "innovation"],
    image: "/images/hero.jpg",
    featured: true,
    listed: true,
  };

  const mockReadingTime = "5 min read";

  it("renders the post title", () => {
    render(
      <BlogHeader
        frontmatter={mockFrontmatter}
        readingTime={mockReadingTime}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Amazing Blog Post Title" }),
    ).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(
      <BlogHeader
        frontmatter={mockFrontmatter}
        readingTime={mockReadingTime}
      />,
    );

    expect(
      screen.getByText("This is a compelling description of the blog post."),
    ).toBeInTheDocument();
  });

  it("renders the category", () => {
    render(
      <BlogHeader
        frontmatter={mockFrontmatter}
        readingTime={mockReadingTime}
      />,
    );

    expect(screen.getByText("Technology")).toBeInTheDocument();
  });

  it("renders the author", () => {
    render(
      <BlogHeader
        frontmatter={mockFrontmatter}
        readingTime={mockReadingTime}
      />,
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("renders formatted date", () => {
    render(
      <BlogHeader
        frontmatter={mockFrontmatter}
        readingTime={mockReadingTime}
      />,
    );

    // Full date format: January 15, 2025
    expect(screen.getByText("January 15, 2025")).toBeInTheDocument();
  });

  it("renders reading time", () => {
    render(
      <BlogHeader
        frontmatter={mockFrontmatter}
        readingTime={mockReadingTime}
      />,
    );

    expect(screen.getByText("5 min read")).toBeInTheDocument();
  });

  it("renders all tags with hashtag prefix", () => {
    render(
      <BlogHeader
        frontmatter={mockFrontmatter}
        readingTime={mockReadingTime}
      />,
    );

    expect(screen.getByText("#tech")).toBeInTheDocument();
    expect(screen.getByText("#ai")).toBeInTheDocument();
    expect(screen.getByText("#innovation")).toBeInTheDocument();
  });

  it("renders featured image when provided", () => {
    render(
      <BlogHeader
        frontmatter={mockFrontmatter}
        readingTime={mockReadingTime}
      />,
    );

    const image = screen.getByTestId("header-image");
    expect(image).toHaveAttribute("src", "/images/hero.jpg");
    expect(image).toHaveAttribute("alt", "Amazing Blog Post Title");
  });

  it("does not render image when not provided", () => {
    const frontmatterWithoutImage: BlogPostFrontmatter = {
      ...mockFrontmatter,
      image: undefined,
    };

    render(
      <BlogHeader
        frontmatter={frontmatterWithoutImage}
        readingTime={mockReadingTime}
      />,
    );

    expect(screen.queryByTestId("header-image")).not.toBeInTheDocument();
  });

  it("handles empty tags array", () => {
    const frontmatterWithNoTags: BlogPostFrontmatter = {
      ...mockFrontmatter,
      tags: [],
    };

    render(
      <BlogHeader
        frontmatter={frontmatterWithNoTags}
        readingTime={mockReadingTime}
      />,
    );

    // Should not crash
    expect(screen.queryByText("#")).not.toBeInTheDocument();
  });

  it("renders date with correct datetime attribute", () => {
    render(
      <BlogHeader
        frontmatter={mockFrontmatter}
        readingTime={mockReadingTime}
      />,
    );

    const timeElement = screen.getByText("January 15, 2025");
    expect(timeElement).toHaveAttribute("datetime", "2025-01-15");
  });
});
