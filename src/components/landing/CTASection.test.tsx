import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CTASection } from "./CTASection";

describe("CTASection Component", () => {
  it("should render the section heading", () => {
    render(<CTASection />);
    expect(screen.getByText("Blend your photos. Create something new."))
      .toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<CTASection />);
    expect(screen.getByText(/Combine two images into something unexpected/))
      .toBeInTheDocument();
  });

  it("should render the CTA button", () => {
    render(<CTASection />);
    expect(
      screen.getByRole("link", { name: /Try Photo Mixer/i }),
    ).toBeInTheDocument();
  });

  it("should have correct href for CTA button", () => {
    render(<CTASection />);
    const ctaLink = screen.getByRole("link", {
      name: /Try Photo Mixer/i,
    });
    expect(ctaLink).toHaveAttribute("href", "/apps/pixel/mix");
  });

  it("should render as a section element", () => {
    const { container } = render(<CTASection />);
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
  });

  it("should have gradient background class", () => {
    const { container } = render(<CTASection />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-gradient-primary");
  });

  it("should render Sparkles icon in CTA", () => {
    const { container } = render(<CTASection />);
    const sparklesIcon = container.querySelector("svg.lucide-sparkles");
    expect(sparklesIcon).toBeInTheDocument();
  });

  it("should have decorative blur elements", () => {
    const { container } = render(<CTASection />);
    const blurElements = container.querySelectorAll(".blur-3xl");
    expect(blurElements.length).toBeGreaterThanOrEqual(2);
  });
});
