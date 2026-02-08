import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BlogPreviewSection } from "./BlogPreviewSection";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    h2: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <h2 className={className}>{children}</h2>,
    p: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <p className={className}>{children}</p>,
  },
}));

describe("BlogPreviewSection", () => {
  it("renders the section header", () => {
    render(<BlogPreviewSection />);

    expect(screen.getByText("Latest Updates")).toBeInTheDocument();
    expect(screen.getByText(/Insights from the/)).toBeInTheDocument();
    expect(screen.getByText("Spike Land Blog")).toBeInTheDocument();
  });

  it("renders all blog posts", () => {
    render(<BlogPreviewSection />);

    expect(
      screen.getByText("The Future of AI in Social Media Marketing"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Maximizing ROI with Data-Driven Campaigns"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Building Authentic Communities in 2025"),
    ).toBeInTheDocument();
  });

  it("displays post categories", () => {
    render(<BlogPreviewSection />);

    expect(screen.getByText("AI Trends")).toBeInTheDocument();
    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
  });

  it("displays post dates and read times", () => {
    render(<BlogPreviewSection />);

    expect(screen.getByText("Oct 12, 2024")).toBeInTheDocument();
    expect(screen.getByText("5 min read")).toBeInTheDocument();
  });

  it("renders View all posts button", () => {
    render(<BlogPreviewSection />);

    expect(
      screen.getByRole("link", { name: /view all posts/i }),
    ).toBeInTheDocument();
  });

  it("renders Read article links for each post", () => {
    render(<BlogPreviewSection />);

    const readArticleLinks = screen.getAllByText(/read article/i);
    expect(readArticleLinks).toHaveLength(3);
  });
});
