import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LandingHero } from "./LandingHero";

vi.mock("@/components/create/create-search", () => ({
  CreateSearch: () => <div data-testid="create-search">CreateSearch</div>,
}));

vi.mock("@/components/orbit-landing/ScrollReveal", () => ({
  ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

describe("LandingHero", () => {
  it("renders the heading", () => {
    render(<LandingHero />);
    expect(screen.getByText(/Build the/)).toBeInTheDocument();
    expect(screen.getByText("Impossible.")).toBeInTheDocument();
  });

  it("renders the subheading", () => {
    render(<LandingHero />);
    expect(
      screen.getByText(/Spike Land is an AI-powered universe/),
    ).toBeInTheDocument();
  });

  it("renders the CreateSearch component", () => {
    render(<LandingHero />);
    expect(screen.getByTestId("create-search")).toBeInTheDocument();
  });

  it("renders the explore apps link", () => {
    render(<LandingHero />);
    const link = screen.getByRole("link", { name: /explore the galaxy/i });
    expect(link).toHaveAttribute("href", "/create");
  });

  it("renders the badge", () => {
    render(<LandingHero />);
    expect(screen.getByText("The Future of Creation")).toBeInTheDocument();
  });
});
