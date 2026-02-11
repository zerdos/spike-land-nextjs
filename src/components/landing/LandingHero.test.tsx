import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LandingHero } from "./LandingHero";

vi.mock("@/components/create/composer-box", () => ({
  ComposerBox: ({ initialPrompt }: { initialPrompt?: string }) => (
    <div data-testid="composer-box" data-initial-prompt={initialPrompt}>ComposerBox</div>
  ),
}));

vi.mock("@/components/landing/TemplateCards", () => ({
  TemplateCards: ({ onSelect }: { onSelect: (prompt: string) => void }) => (
    <div data-testid="template-cards">
      <button onClick={() => onSelect("test prompt")}>Template</button>
    </div>
  ),
}));

vi.mock("@/components/landing/CreationStats", () => ({
  CreationStats: ({ appsCreated, creatorCount }: { appsCreated: number; creatorCount: number }) => (
    <div data-testid="creation-stats">{appsCreated} apps, {creatorCount} creators</div>
  ),
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

  it("renders the ComposerBox component", () => {
    render(<LandingHero />);
    expect(screen.getByTestId("composer-box")).toBeInTheDocument();
  });

  it("renders the TemplateCards component", () => {
    render(<LandingHero />);
    expect(screen.getByTestId("template-cards")).toBeInTheDocument();
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

  it("renders CreationStats when stats are provided", () => {
    render(<LandingHero stats={{ appsCreated: 100, creatorCount: 50 }} />);
    expect(screen.getByTestId("creation-stats")).toBeInTheDocument();
    expect(screen.getByText("100 apps, 50 creators")).toBeInTheDocument();
  });

  it("does not render CreationStats when stats are not provided", () => {
    render(<LandingHero />);
    expect(screen.queryByTestId("creation-stats")).not.toBeInTheDocument();
  });
});
