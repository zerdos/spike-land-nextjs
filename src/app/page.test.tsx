import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

// Mock landing components
vi.mock("@/components/landing", () => ({
  HeroSection: () => <section data-testid="hero-section">Hero Section</section>,
  BeforeAfterGallery: () => <section data-testid="gallery-section">Gallery Section</section>,
  FeatureShowcase: () => <section data-testid="feature-section">Feature Section</section>,
  ComponentDemo: () => <section data-testid="component-demo-section">Component Demo</section>,
  FAQ: () => <section data-testid="faq-section">FAQ Section</section>,
}));

describe("Home Page", () => {
  describe("Page Structure", () => {
    it("should render HeroSection component", () => {
      render(<Home />);
      expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    });

    it("should render BeforeAfterGallery component", () => {
      render(<Home />);
      expect(screen.getByTestId("gallery-section")).toBeInTheDocument();
    });

    it("should render FeatureShowcase component", () => {
      render(<Home />);
      expect(screen.getByTestId("feature-section")).toBeInTheDocument();
    });

    it("should render ComponentDemo component", () => {
      render(<Home />);
      expect(screen.getByTestId("component-demo-section")).toBeInTheDocument();
    });

    it("should render FAQ component", () => {
      render(<Home />);
      expect(screen.getByTestId("faq-section")).toBeInTheDocument();
    });

    it("should have proper semantic structure with sections", () => {
      render(<Home />);
      const sections = document.querySelectorAll("section");
      // 5 mocked sections + 1 final CTA section
      expect(sections.length).toBe(6);
    });
  });

  describe("Final CTA Section", () => {
    it("should render the CTA heading", () => {
      render(<Home />);
      expect(screen.getByText("Ready to Transform Your Images?")).toBeInTheDocument();
    });

    it("should render the CTA description", () => {
      render(<Home />);
      expect(screen.getByText(/Join thousands of creators/)).toBeInTheDocument();
    });

    it("should render Start Enhancing Free button", () => {
      render(<Home />);
      const button = screen.getByRole("link", { name: /Start Enhancing Free/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("href", "/enhance");
    });

    it("should render View Pricing button", () => {
      render(<Home />);
      const button = screen.getByRole("link", { name: /View Pricing/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("href", "/pricing");
    });

    it("should have primary gradient background color", () => {
      const { container } = render(<Home />);
      const ctaSection = container.querySelector("section.bg-gradient-primary");
      expect(ctaSection).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      const { container } = render(<Home />);
      const h2 = container.querySelector("h2");
      expect(h2).toBeInTheDocument();
      expect(h2).toHaveTextContent("Ready to Transform Your Images?");
    });

    it("should have min-h-screen wrapper", () => {
      const { container } = render(<Home />);
      const wrapper = container.querySelector(".min-h-screen");
      expect(wrapper).toBeInTheDocument();
    });
  });
});
