import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { describe, expect, it, type Mock, vi } from "vitest";
import { PlatformHero } from "./PlatformHero";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

const mockUseSession = useSession as Mock;

describe("PlatformHero Component", () => {
  beforeEach(() => {
    // Default to logged out state
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
  });

  it("should render the main headline", () => {
    render(<PlatformHero />);
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toBeInTheDocument();
    expect(headline).toHaveTextContent(/Old Photos/);
    expect(headline).toHaveTextContent(/New Life/);
  });

  it("should render the subheadline", () => {
    render(<PlatformHero />);
    expect(
      screen.getByText(/iPhone 4 photos deserve iPhone 16 quality/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Free to try/)).toBeInTheDocument();
  });

  it("should link to /pixel when not logged in", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<PlatformHero />);
    const ctaLink = screen.getByRole("link", { name: /Restore Your Photos/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/pixel");
  });

  it("should link to /apps/pixel when logged in", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-123", name: "Test User" } },
      status: "authenticated",
    });
    render(<PlatformHero />);
    const ctaLink = screen.getByRole("link", { name: /Restore Your Photos/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/apps/pixel");
  });

  it("should render secondary CTA button linking to blog", () => {
    render(<PlatformHero />);
    const ctaLink = screen.getByRole("link", { name: /See Examples/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/blog/pixel-launch-announcement");
  });

  it("should have overflow hidden class", () => {
    const { container } = render(<PlatformHero />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("overflow-hidden");
  });

  it("should have responsive text sizing", () => {
    render(<PlatformHero />);
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveClass("text-4xl");
    expect(headline).toHaveClass("sm:text-5xl");
    expect(headline).toHaveClass("md:text-6xl");
    expect(headline).toHaveClass("lg:text-7xl");
  });

  it("should have gradient text on 'New Life.'", () => {
    render(<PlatformHero />);
    const gradientText = screen.getByText("New Life.");
    expect(gradientText).toHaveClass("text-gradient-primary");
  });

  it("should have shadow styling on primary CTA button", () => {
    const { container } = render(<PlatformHero />);
    // Default variant uses aurora-green shadow
    const ctaButton = container.querySelector(".shadow-lg");
    expect(ctaButton).toBeInTheDocument();
  });

  it("should have decorative spark SVG elements", () => {
    const { container } = render(<PlatformHero />);
    const sparkSvgs = container.querySelectorAll("svg path");
    expect(sparkSvgs.length).toBeGreaterThanOrEqual(2);
  });

  it("should have proper padding on section", () => {
    const { container } = render(<PlatformHero />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("pt-24");
    expect(section).toHaveClass("pb-8");
  });

  it("should have decorative gradient orbs", () => {
    const { container } = render(<PlatformHero />);
    const orbs = container.querySelectorAll(".blur-3xl");
    expect(orbs.length).toBeGreaterThanOrEqual(2);
  });

  it("should render Sparkles icon in primary CTA", () => {
    const { container } = render(<PlatformHero />);
    const sparklesIcon = container.querySelector("svg.lucide-sparkles");
    expect(sparklesIcon).toBeInTheDocument();
  });

  it("should render BookOpen icon in secondary CTA", () => {
    const { container } = render(<PlatformHero />);
    const bookIcon = container.querySelector("svg.lucide-book-open");
    expect(bookIcon).toBeInTheDocument();
  });

  it("should have responsive button layout", () => {
    const { container } = render(<PlatformHero />);
    const buttonContainer = container.querySelector(".flex.flex-col.gap-5");
    expect(buttonContainer).toHaveClass("sm:flex-row");
    expect(buttonContainer).toHaveClass("sm:justify-center");
  });
});
