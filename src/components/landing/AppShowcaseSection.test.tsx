import type { ShowcaseApp } from "@/lib/landing/showcase-feed";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShowcaseSection } from "./AppShowcaseSection";

vi.mock("@/components/create/live-app-card", () => ({
  LiveAppCard: ({ title }: { title: string }) => (
    <div data-testid="live-app-card">{title}</div>
  ),
}));

vi.mock("@/components/orbit-landing/ScrollReveal", () => ({
  ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockApps: ShowcaseApp[] = [
  {
    id: "1",
    title: "Todo App",
    description: "A todo list",
    slug: "todo-app",
    codespaceId: "cs-1",
    lastActivity: new Date("2025-01-01"),
    source: "created-app",
    viewCount: 10,
  },
  {
    id: "2",
    title: "Calculator",
    description: "A calculator",
    slug: "calculator",
    codespaceId: "cs-2",
    lastActivity: new Date("2025-01-02"),
    source: "app",
  },
];

describe("AppShowcaseSection", () => {
  it("renders the section heading", () => {
    render(<AppShowcaseSection apps={mockApps} />);
    expect(screen.getByText(/What people are/)).toBeInTheDocument();
    expect(screen.getByText("building")).toBeInTheDocument();
  });

  it("renders LiveAppCard for each app", () => {
    render(<AppShowcaseSection apps={mockApps} />);
    const cards = screen.getAllByTestId("live-app-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Todo App")).toBeInTheDocument();
    expect(screen.getByText("Calculator")).toBeInTheDocument();
  });

  it("renders the see all apps link", () => {
    render(<AppShowcaseSection apps={mockApps} />);
    const link = screen.getByRole("link", { name: /see all apps/i });
    expect(link).toHaveAttribute("href", "/create");
  });

  it("renders nothing when apps array is empty", () => {
    const { container } = render(<AppShowcaseSection apps={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the Live Apps badge", () => {
    render(<AppShowcaseSection apps={mockApps} />);
    expect(screen.getByText("Live Apps")).toBeInTheDocument();
  });
});
