import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => ({
  ArrowRight: () => <span data-testid="icon-arrow-right" />,
  BookOpen: () => <span data-testid="icon-book-open" />,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

import { TopicCard } from "./topic-card";

describe("TopicCard", () => {
  it("renders title and description", () => {
    render(
      <TopicCard
        title="React Hooks"
        description="Learn about React hooks"
        slug="react-hooks"
      />,
    );

    expect(screen.getByText("React Hooks")).toBeInTheDocument();
    expect(screen.getByText("Learn about React hooks")).toBeInTheDocument();
  });

  it("links to the correct slug", () => {
    render(
      <TopicCard
        title="React Hooks"
        description="Learn about hooks"
        slug="react-hooks"
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/learnit/react-hooks");
  });

  it("strips markdown from description", () => {
    render(
      <TopicCard
        title="React"
        description="Learn about **React** and *hooks* with `useState`"
        slug="react"
      />,
    );

    expect(screen.getByText("Learn about React and hooks with useState")).toBeInTheDocument();
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    expect(screen.queryByText(/`/)).not.toBeInTheDocument();
  });

  it("strips markdown links from description", () => {
    render(
      <TopicCard
        title="React"
        description="Check out [React docs](https://react.dev) for more"
        slug="react"
      />,
    );

    expect(screen.getByText("Check out React docs for more")).toBeInTheDocument();
  });

  it("strips markdown headings from description", () => {
    render(
      <TopicCard
        title="Intro"
        description="## Introduction to React"
        slug="intro"
      />,
    );

    expect(screen.getByText("Introduction to React")).toBeInTheDocument();
  });

  it("displays view count when provided", () => {
    render(
      <TopicCard
        title="React"
        description="Desc"
        slug="react"
        viewCount={42}
      />,
    );

    expect(screen.getByText("42 views")).toBeInTheDocument();
  });

  it("displays 'Start learning' when no view count", () => {
    render(
      <TopicCard
        title="React"
        description="Desc"
        slug="react"
      />,
    );

    expect(screen.getByText("Start learning")).toBeInTheDocument();
  });
});
