import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeroSection } from "./HeroSection";

// Mock the ImageComparisonSlider component
vi.mock("@/components/enhance/ImageComparisonSlider", () => ({
  ImageComparisonSlider: ({
    originalUrl,
    enhancedUrl,
    originalLabel,
    enhancedLabel,
  }: {
    originalUrl: string;
    enhancedUrl: string;
    originalLabel?: string;
    enhancedLabel?: string;
  }) => (
    <div
      data-testid="image-comparison-slider"
      data-original={originalUrl}
      data-enhanced={enhancedUrl}
      data-original-label={originalLabel}
      data-enhanced-label={enhancedLabel}
    >
      Comparison Slider
    </div>
  ),
}));

describe("HeroSection Component", () => {
  it("should render the main headline", () => {
    render(<HeroSection />);
    expect(screen.getByText(/Enhance Your Photos in/)).toBeInTheDocument();
    expect(screen.getByText(/Seconds/)).toBeInTheDocument();
    expect(screen.getByText(/with AI\./)).toBeInTheDocument();
  });

  it("should render the subheadline", () => {
    render(<HeroSection />);
    expect(
      screen.getByText(/Bring old, blurry images back to life/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/restores details and clarity instantly/),
    ).toBeInTheDocument();
  });

  it("should render the ImageComparisonSlider", () => {
    render(<HeroSection />);
    expect(screen.getByTestId("image-comparison-slider")).toBeInTheDocument();
  });

  it("should use fallback URLs when no props provided", () => {
    render(<HeroSection />);
    const slider = screen.getByTestId("image-comparison-slider");
    expect(slider).toHaveAttribute(
      "data-original",
      expect.stringContaining("unsplash.com"),
    );
    expect(slider).toHaveAttribute(
      "data-enhanced",
      expect.stringContaining("unsplash.com"),
    );
  });

  it("should use custom URLs when props provided", () => {
    const customOriginal = "https://example.com/original.jpg";
    const customEnhanced = "https://example.com/enhanced.jpg";
    render(
      <HeroSection originalUrl={customOriginal} enhancedUrl={customEnhanced} />,
    );
    const slider = screen.getByTestId("image-comparison-slider");
    expect(slider).toHaveAttribute("data-original", customOriginal);
    expect(slider).toHaveAttribute("data-enhanced", customEnhanced);
  });

  it("should pass correct labels to ImageComparisonSlider", () => {
    render(<HeroSection />);
    const slider = screen.getByTestId("image-comparison-slider");
    expect(slider).toHaveAttribute("data-original-label", "Original");
    expect(slider).toHaveAttribute("data-enhanced-label", "Enhanced by Pixel");
  });

  it("should render primary CTA button linking to enhance page", () => {
    render(<HeroSection />);
    const ctaLink = screen.getByRole("link", { name: /Try it Free/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/pixel");
  });

  it("should have overflow hidden class", () => {
    const { container } = render(<HeroSection />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("overflow-hidden");
  });

  it("should have responsive text sizing", () => {
    render(<HeroSection />);
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveClass("text-4xl");
    expect(headline).toHaveClass("sm:text-5xl");
    expect(headline).toHaveClass("md:text-6xl");
    expect(headline).toHaveClass("lg:text-7xl");
  });

  it("should have gradient text on 'Seconds'", () => {
    render(<HeroSection />);
    const gradientText = screen.getByText("Seconds");
    expect(gradientText).toHaveClass("text-gradient-primary");
  });

  it("should have cyan glow on CTA button", () => {
    const { container } = render(<HeroSection />);
    const ctaButton = container.querySelector(".shadow-glow-cyan");
    expect(ctaButton).toBeInTheDocument();
  });

  it("should have decorative spark SVG elements", () => {
    const { container } = render(<HeroSection />);
    const sparkSvgs = container.querySelectorAll("svg path");
    expect(sparkSvgs.length).toBeGreaterThanOrEqual(2);
  });

  it("should have proper padding on section", () => {
    const { container } = render(<HeroSection />);
    const section = container.querySelector("section");
    expect(section).toHaveClass("pt-24");
    expect(section).toHaveClass("pb-8");
  });
});
