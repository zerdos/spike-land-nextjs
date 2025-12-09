import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CTASection } from "./CTASection";

describe("CTASection Component", () => {
  it("should render the section heading", () => {
    render(<CTASection />);
    expect(screen.getByText("Ready to Transform Your Images?")).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<CTASection />);
    expect(screen.getByText(/Join thousands of creators/)).toBeInTheDocument();
  });

  it("should render the enhance button", () => {
    render(<CTASection />);
    expect(screen.getByRole("link", { name: /Start Enhancing Free/i })).toBeInTheDocument();
  });

  it("should render the pricing button", () => {
    render(<CTASection />);
    expect(screen.getByRole("link", { name: /View Pricing/i })).toBeInTheDocument();
  });

  it("should have correct href for enhance button", () => {
    render(<CTASection />);
    const enhanceLink = screen.getByRole("link", { name: /Start Enhancing Free/i });
    expect(enhanceLink).toHaveAttribute("href", "/enhance");
  });

  it("should have correct href for pricing button", () => {
    render(<CTASection />);
    const pricingLink = screen.getByRole("link", { name: /View Pricing/i });
    expect(pricingLink).toHaveAttribute("href", "/pricing");
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
});
