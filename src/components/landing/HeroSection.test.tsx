import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroSection } from "./HeroSection";

describe("HeroSection Component", () => {
  it("should render the main headline", () => {
    render(<HeroSection />);
    expect(screen.getByText(/Transform Your Images/)).toBeInTheDocument();
    expect(screen.getByText(/with AI/)).toBeInTheDocument();
  });

  it("should render the social proof badge", () => {
    render(<HeroSection />);
    expect(screen.getByText(/Trusted by 10,000\+ creators/)).toBeInTheDocument();
  });

  it("should render the subheadline", () => {
    render(<HeroSection />);
    expect(screen.getByText(/Enhance photos instantly/)).toBeInTheDocument();
  });

  it("should render primary CTA button linking to enhance page", () => {
    render(<HeroSection />);
    const ctaLink = screen.getByRole("link", { name: /Enhance Your First Image/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/enhance");
  });

  it("should render secondary CTA button linking to gallery", () => {
    render(<HeroSection />);
    const secondaryLink = screen.getByRole("link", { name: /See Examples/i });
    expect(secondaryLink).toBeInTheDocument();
    expect(secondaryLink).toHaveAttribute("href", "#gallery");
  });

  it("should render trust indicators", () => {
    render(<HeroSection />);
    expect(screen.getByText("No signup required")).toBeInTheDocument();
    expect(screen.getByText("Free first enhancement")).toBeInTheDocument();
    expect(screen.getByText("Results in seconds")).toBeInTheDocument();
  });

  it("should have gradient background class", () => {
    const { container } = render(<HeroSection />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-gradient-hero");
    expect(section).toHaveClass("relative");
    expect(section).toHaveClass("overflow-hidden");
  });

  it("should have decorative background elements", () => {
    const { container } = render(<HeroSection />);
    const blurElements = container.querySelectorAll(".blur-3xl");
    expect(blurElements.length).toBe(2);
  });

  it("should have responsive text sizing", () => {
    render(<HeroSection />);
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveClass("text-4xl");
    expect(headline).toHaveClass("sm:text-5xl");
    expect(headline).toHaveClass("md:text-6xl");
    expect(headline).toHaveClass("lg:text-7xl");
  });
});
