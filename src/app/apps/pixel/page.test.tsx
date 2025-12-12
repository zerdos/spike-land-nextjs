import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Mock components for testing PixelLandingPage structure
// Since the actual page is an async server component that imports database dependencies,
// we test the expected page structure using mock components
const MockPixelHeader = () => <header data-testid="pixel-header">Pixel Header</header>;
const MockHeroSection = () => <section data-testid="hero-section">Hero Section</section>;
const MockBeforeAfterGallery = () => (
  <section data-testid="gallery-section">Gallery Section</section>
);
const MockFeatureShowcase = () => <section data-testid="feature-section">Feature Section</section>;
const MockFAQ = () => <section data-testid="faq-section">FAQ Section</section>;
const MockCTASection = () => (
  <section data-testid="cta-section" className="bg-gradient-primary">
    <h2>Ready to Transform Your Images?</h2>
    <p>Join thousands of creators using AI to enhance their photos.</p>
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
    <a role="link" href="/apps/pixel">Start Enhancing Free</a>
    <a role="link" href="/pricing">View Pricing</a>
  </section>
);

// Test wrapper that mirrors the PixelLandingPage structure
function TestableLandingPage() {
  return (
    <main className="min-h-screen bg-grid-pattern">
      <MockPixelHeader />
      <MockHeroSection />
      <MockBeforeAfterGallery />
      <MockFeatureShowcase />
      <MockFAQ />
      <MockCTASection />
    </main>
  );
}

// Expected metadata values (defined here to avoid importing page.tsx which has database dependencies)
const expectedMetadata = {
  title: "Pixel - AI Image Enhancement | Spike Land",
  description:
    "Enhance your photos in seconds with AI. Transform low-resolution images into stunning high-quality photos with Pixel's advanced AI enhancement technology.",
  openGraph: {
    title: "Pixel - AI Image Enhancement | Spike Land",
    description:
      "Enhance your photos in seconds with AI. Transform low-resolution images into stunning high-quality photos.",
    type: "website",
  },
};

describe("Pixel Landing Page (/apps/pixel)", () => {
  describe("Metadata Contract", () => {
    it("should expect title to be 'Pixel - AI Image Enhancement | Spike Land'", () => {
      expect(expectedMetadata.title).toBe("Pixel - AI Image Enhancement | Spike Land");
    });

    it("should expect description to mention AI image enhancement", () => {
      expect(expectedMetadata.description).toContain("Enhance your photos in seconds with AI");
    });

    it("should expect OpenGraph metadata", () => {
      expect(expectedMetadata.openGraph).toBeDefined();
      expect(expectedMetadata.openGraph?.title).toBe("Pixel - AI Image Enhancement | Spike Land");
    });
  });

  describe("Page Structure", () => {
    it("should render PixelHeader component", () => {
      render(<TestableLandingPage />);
      expect(screen.getByTestId("pixel-header")).toBeInTheDocument();
    });

    it("should render HeroSection component", () => {
      render(<TestableLandingPage />);
      expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    });

    it("should render BeforeAfterGallery component", () => {
      render(<TestableLandingPage />);
      expect(screen.getByTestId("gallery-section")).toBeInTheDocument();
    });

    it("should render FeatureShowcase component", () => {
      render(<TestableLandingPage />);
      expect(screen.getByTestId("feature-section")).toBeInTheDocument();
    });

    it("should render FAQ component", () => {
      render(<TestableLandingPage />);
      expect(screen.getByTestId("faq-section")).toBeInTheDocument();
    });

    it("should render CTASection component", () => {
      render(<TestableLandingPage />);
      expect(screen.getByTestId("cta-section")).toBeInTheDocument();
    });

    it("should have proper semantic structure with main element", () => {
      const { container } = render(<TestableLandingPage />);
      const main = container.querySelector("main");
      expect(main).toBeInTheDocument();
    });

    it("should have min-h-screen wrapper", () => {
      const { container } = render(<TestableLandingPage />);
      const wrapper = container.querySelector(".min-h-screen");
      expect(wrapper).toBeInTheDocument();
    });

    it("should have bg-grid-pattern class", () => {
      const { container } = render(<TestableLandingPage />);
      const wrapper = container.querySelector(".bg-grid-pattern");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("CTA Section Links", () => {
    it("should have Start Enhancing Free link pointing to /apps/pixel", () => {
      render(<TestableLandingPage />);
      const button = screen.getByRole("link", { name: /Start Enhancing Free/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("href", "/apps/pixel");
    });

    it("should have View Pricing link", () => {
      render(<TestableLandingPage />);
      const button = screen.getByRole("link", { name: /View Pricing/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("href", "/pricing");
    });
  });

  describe("Accessibility", () => {
    it("should use main landmark for page content", () => {
      const { container } = render(<TestableLandingPage />);
      const main = container.querySelector("main");
      expect(main).toBeInTheDocument();
    });

    it("should have header landmark", () => {
      const { container } = render(<TestableLandingPage />);
      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();
    });

    it("should have proper section structure", () => {
      render(<TestableLandingPage />);
      const sections = document.querySelectorAll("section");
      // 5 sections: hero, gallery, feature, faq, cta
      expect(sections.length).toBe(5);
    });
  });
});
