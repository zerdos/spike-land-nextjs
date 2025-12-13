import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformHero } from "./PlatformHero";

describe("PlatformHero Component", () => {
  it("should render the main headline", () => {
    render(<PlatformHero />);
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toBeInTheDocument();
    expect(headline).toHaveTextContent(/Build & Share/);
    expect(headline).toHaveTextContent(/AI-Powered/);
    expect(headline).toHaveTextContent(/Apps/);
  });

  it("should render the subheadline", () => {
    render(<PlatformHero />);
    expect(
      screen.getByText(/Create innovative applications with AI assistance/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/build, deploy, and monetize your ideas/),
    ).toBeInTheDocument();
  });

  it("should render primary CTA button linking to Pixel app", () => {
    render(<PlatformHero />);
    const ctaLink = screen.getByRole("link", { name: /Try Pixel Free/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/auth/signin?callbackUrl=/apps/pixel");
  });

  it("should render secondary CTA button linking to apps", () => {
    render(<PlatformHero />);
    const ctaLink = screen.getByRole("link", { name: /Browse Apps/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/apps");
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

  it("should have gradient text on 'AI-Powered'", () => {
    render(<PlatformHero />);
    const gradientText = screen.getByText("AI-Powered");
    expect(gradientText).toHaveClass("text-gradient-primary");
  });

  it("should have cyan glow on primary CTA button", () => {
    const { container } = render(<PlatformHero />);
    const ctaButton = container.querySelector(".shadow-glow-cyan");
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

  it("should render ArrowRight icon in secondary CTA", () => {
    const { container } = render(<PlatformHero />);
    const arrowIcon = container.querySelector("svg.lucide-arrow-right");
    expect(arrowIcon).toBeInTheDocument();
  });

  it("should have responsive button layout", () => {
    const { container } = render(<PlatformHero />);
    const buttonContainer = container.querySelector(".flex.flex-col.gap-5");
    expect(buttonContainer).toHaveClass("sm:flex-row");
    expect(buttonContainer).toHaveClass("sm:justify-center");
  });
});
