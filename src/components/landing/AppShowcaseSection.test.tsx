import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShowcaseSection } from "./AppShowcaseSection";
import type { ShowcaseApp } from "@/lib/landing/showcase-feed";

vi.mock("@/components/create/live-app-card", () => ({
  LiveAppCard: () => <div data-testid="live-app-card">LiveAppCard</div>,
}));

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

describe("AppShowcaseSection", () => {
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

  it("renders the section heading", () => {
    render(<AppShowcaseSection apps={mockApps} />);
    expect(screen.getByText(/What people are/)).toBeInTheDocument();
    expect(screen.getByText("materializing")).toBeInTheDocument();
  });

  it("renders the subheading", () => {
    render(<AppShowcaseSection apps={mockApps} />);
    expect(
      screen.getByText(/Witness the raw power of AI/),
    ).toBeInTheDocument();
  });

  it("renders LiveAppCard for each app", () => {
    render(<AppShowcaseSection apps={mockApps} />);
    expect(screen.getAllByTestId("live-app-card")).toHaveLength(2);
  });

  it("renders the see all apps link", () => {
    render(<AppShowcaseSection apps={mockApps} />);
    const link = screen.getByRole("link", { name: /view the multiverse/i });
    expect(link).toHaveAttribute("href", "/create");
  });

  it("returns null when no apps provided", () => {
    const { container } = render(<AppShowcaseSection apps={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the badge", () => {
    render(<AppShowcaseSection apps={mockApps} />);
    expect(screen.getByText("Live Cosmic Entities")).toBeInTheDocument();
  });
});
