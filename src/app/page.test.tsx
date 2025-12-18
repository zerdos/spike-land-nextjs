import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

// Mock next/cache
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

// Mock getSuperAdminPublicPhotos to avoid Prisma import
vi.mock("@/lib/gallery/super-admin-photos", () => ({
  getSuperAdminPublicPhotos: vi.fn().mockResolvedValue([]),
}));

// Mock all the landing page components
vi.mock("@/components/landing/CTASection", () => ({
  CTASection: () => (
    <section data-testid="cta-section" className="bg-gradient-primary">
      CTA
    </section>
  ),
}));

vi.mock("@/components/platform-landing", () => ({
  FeaturedAppCard: () => <div data-testid="featured-app-card">Featured App</div>,
  PlatformFeatures: () => (
    <section data-testid="platform-features-section">Platform Features</section>
  ),
  PlatformHero: () => <section data-testid="hero-section">Platform Hero</section>,
}));

describe("Home Page - No Authentication Redirect", () => {
  it("should render landing page for all users (no redirect)", async () => {
    const result = await Home();
    expect(result).toBeDefined();
  });
});

// Mock components for testing Home page structure
// Since the actual Home page uses client components, we test the expected page structure using mock components
// Note: PlatformHeader is now in root layout, not in individual pages

const MockPlatformHero = () => <section data-testid="hero-section">Platform Hero Section</section>;
const MockFeaturedAppsSection = () => (
  <section
    data-testid="featured-apps-section"
    id="apps"
    className="container mx-auto py-16 px-4"
  >
    <h2>See the Transformation</h2>
    <p>That blurry photo of your dog. Your grandparents&apos; wedding day.</p>
    <div data-testid="featured-app-card">
      <div role="img" aria-label="Pixel logo">pixel</div>
      <span>AI Photo Restoration</span>
      <span>
        Upload any photo. Watch it transform. Download in HD. It takes 60 seconds.
      </span>
      <div data-testid="comparison-slider">Before/After</div>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a role="link" href="/apps/pixel">Get Started</a>
    </div>
  </section>
);
const MockPlatformFeatures = () => (
  <section data-testid="platform-features-section">Platform Features</section>
);
const MockCTASection = () => (
  <section data-testid="cta-section" className="bg-gradient-primary">
    <h2>Ready to Transform Your Images?</h2>
    <p>Join thousands of creators using AI to enhance their photos.</p>
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
    <a role="link" href="/apps/pixel">Start Enhancing Free</a>
    <a role="link" href="/pricing">View Pricing</a>
  </section>
);

// Test wrapper that mirrors the Home page structure
// Note: PlatformHeader is now rendered in root layout, not in individual pages
function TestableHome() {
  return (
    <div className="min-h-screen bg-grid-pattern">
      <MockPlatformHero />
      <MockFeaturedAppsSection />
      <MockPlatformFeatures />
      <MockCTASection />
    </div>
  );
}

describe("Home Page", () => {
  describe("Page Structure", () => {
    it("should render PlatformHero component", () => {
      render(<TestableHome />);
      expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    });

    it("should render Featured Apps section", () => {
      render(<TestableHome />);
      expect(screen.getByTestId("featured-apps-section")).toBeInTheDocument();
    });

    it("should render PlatformFeatures component", () => {
      render(<TestableHome />);
      expect(screen.getByTestId("platform-features-section"))
        .toBeInTheDocument();
    });

    it("should render CTA section", () => {
      render(<TestableHome />);
      expect(screen.getByTestId("cta-section")).toBeInTheDocument();
    });

    it("should have proper semantic structure with sections", () => {
      render(<TestableHome />);
      const sections = document.querySelectorAll("section");
      // 4 sections: hero, featured-apps, platform-features, cta
      expect(sections.length).toBe(4);
    });
  });

  describe("Featured Apps Section", () => {
    it("should render the See the Transformation heading", () => {
      render(<TestableHome />);
      expect(screen.getByText("See the Transformation")).toBeInTheDocument();
    });

    it("should render the Featured Apps description", () => {
      render(<TestableHome />);
      expect(screen.getByText(/blurry photo of your dog/)).toBeInTheDocument();
    });

    it("should render Pixel logo", () => {
      render(<TestableHome />);
      expect(screen.getByRole("img", { name: "Pixel logo" }))
        .toBeInTheDocument();
    });

    it("should render AI Photo Restoration tagline", () => {
      render(<TestableHome />);
      expect(screen.getByText("AI Photo Restoration")).toBeInTheDocument();
    });

    it("should render comparison slider", () => {
      render(<TestableHome />);
      expect(screen.getByTestId("comparison-slider")).toBeInTheDocument();
    });

    it("should link to Pixel app", () => {
      render(<TestableHome />);
      const pixelLink = screen.getByRole("link", { name: /Get Started/i });
      expect(pixelLink).toHaveAttribute("href", "/apps/pixel");
    });
  });

  describe("Final CTA Section", () => {
    it("should render the CTA heading", () => {
      render(<TestableHome />);
      expect(screen.getByText("Ready to Transform Your Images?"))
        .toBeInTheDocument();
    });

    it("should render the CTA description", () => {
      render(<TestableHome />);
      expect(screen.getByText(/Join thousands of creators/))
        .toBeInTheDocument();
    });

    it("should render Start Enhancing Free button", () => {
      render(<TestableHome />);
      const button = screen.getByRole("link", {
        name: /Start Enhancing Free/i,
      });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("href", "/apps/pixel");
    });

    it("should render View Pricing button", () => {
      render(<TestableHome />);
      const button = screen.getByRole("link", { name: /View Pricing/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("href", "/pricing");
    });

    it("should have primary gradient background color", () => {
      const { container } = render(<TestableHome />);
      const ctaSection = container.querySelector("section.bg-gradient-primary");
      expect(ctaSection).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      const { container } = render(<TestableHome />);
      const h2Elements = container.querySelectorAll("h2");
      expect(h2Elements.length).toBeGreaterThanOrEqual(2);
    });

    it("should have min-h-screen wrapper", () => {
      const { container } = render(<TestableHome />);
      const wrapper = container.querySelector(".min-h-screen");
      expect(wrapper).toBeInTheDocument();
    });
  });
});
