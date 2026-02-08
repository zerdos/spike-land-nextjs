import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LandingHero } from "./LandingHero";

vi.mock("@/components/create/create-search", () => ({
  CreateSearch: () => <div data-testid="create-search">CreateSearch</div>,
}));

vi.mock("@/components/orbit-landing/ScrollReveal", () => ({
  ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("LandingHero", () => {
  it("renders the heading", () => {
    render(<LandingHero />);
    expect(screen.getByText(/Build anything\./)).toBeInTheDocument();
    expect(screen.getByText("Ship instantly.")).toBeInTheDocument();
  });

  it("renders the subheading", () => {
    render(<LandingHero />);
    expect(
      screen.getByText(/Describe your idea and watch AI build/),
    ).toBeInTheDocument();
  });

  it("renders the CreateSearch component", () => {
    render(<LandingHero />);
    expect(screen.getByTestId("create-search")).toBeInTheDocument();
  });

  it("renders the explore apps link", () => {
    render(<LandingHero />);
    const link = screen.getByRole("link", { name: /explore all apps/i });
    expect(link).toHaveAttribute("href", "/create");
  });

  it("renders the AI-Powered badge", () => {
    render(<LandingHero />);
    expect(screen.getByText("AI-Powered App Builder")).toBeInTheDocument();
  });
});
