import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-title" className={className}>{children}</div>
  ),
}));

vi.mock("lucide-react", () => ({
  ArrowRight: () => null,
  Code2: () => null,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { AppCard } from "./app-card";

describe("AppCard", () => {
  it("renders title and description", () => {
    render(
      <AppCard
        title="Weather App"
        description="Check the weather in your city"
        slug="weather-app"
      />,
    );

    expect(screen.getByText("Weather App")).toBeInTheDocument();
    expect(screen.getByText("Check the weather in your city")).toBeInTheDocument();
  });

  it("links to /create/{slug}", () => {
    render(
      <AppCard
        title="Calculator"
        description="Basic calculator"
        slug="calculator"
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/create/calculator");
  });

  it("shows view count when viewCount is provided", () => {
    render(
      <AppCard
        title="Todo App"
        description="Manage your tasks"
        slug="todo-app"
        viewCount={42}
      />,
    );

    expect(screen.getByText("42 views")).toBeInTheDocument();
  });

  it("shows 'Try it' when viewCount is not provided", () => {
    render(
      <AppCard
        title="Chat App"
        description="Real-time chat"
        slug="chat-app"
      />,
    );

    expect(screen.getByText("Try it")).toBeInTheDocument();
  });

  it("applies line-clamp-2 class to description for truncation", () => {
    render(
      <AppCard
        title="Long Desc App"
        description="This is a very long description that should be truncated after two lines of text content"
        slug="long-desc"
      />,
    );

    const description = screen.getByText(
      "This is a very long description that should be truncated after two lines of text content",
    );
    expect(description.className).toContain("line-clamp-2");
  });
});
