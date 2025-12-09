import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SharePageClient } from "./SharePageClient";

vi.mock("@/components/enhance/ImageComparisonSlider", () => ({
  ImageComparisonSlider: ({
    originalUrl,
    enhancedUrl,
    originalLabel,
    enhancedLabel,
  }: {
    originalUrl: string;
    enhancedUrl: string;
    originalLabel: string;
    enhancedLabel: string;
    width: number;
    height: number;
  }) => (
    <div data-testid="image-comparison-slider">
      <span data-testid="slider-original-url">{originalUrl}</span>
      <span data-testid="slider-enhanced-url">{enhancedUrl}</span>
      <span data-testid="slider-original-label">{originalLabel}</span>
      <span data-testid="slider-enhanced-label">{enhancedLabel}</span>
    </div>
  ),
}));

const defaultProps = {
  imageName: "Beautiful Sunset",
  description: "A stunning sunset over the mountains",
  originalUrl: "https://example.com/original.jpg",
  enhancedUrl: "https://example.com/enhanced.jpg",
  originalWidth: 1920,
  originalHeight: 1080,
};

describe("SharePageClient", () => {
  it("renders the image name as title", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Beautiful Sunset" }),
    ).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(
      screen.getByText("A stunning sunset over the mountains"),
    ).toBeInTheDocument();
  });

  it("does not render description when null", () => {
    render(<SharePageClient {...defaultProps} description={null} />);

    expect(
      screen.queryByText("A stunning sunset over the mountains"),
    ).not.toBeInTheDocument();
  });

  it("renders the ImageComparisonSlider with correct props", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(screen.getByTestId("image-comparison-slider")).toBeInTheDocument();
    expect(screen.getByTestId("slider-original-url")).toHaveTextContent(
      "https://example.com/original.jpg",
    );
    expect(screen.getByTestId("slider-enhanced-url")).toHaveTextContent(
      "https://example.com/enhanced.jpg",
    );
    expect(screen.getByTestId("slider-original-label")).toHaveTextContent(
      "Before",
    );
    expect(screen.getByTestId("slider-enhanced-label")).toHaveTextContent(
      "After",
    );
  });

  it("renders the CTA button linking to home page", () => {
    render(<SharePageClient {...defaultProps} />);

    const ctaButton = screen.getByRole("link", {
      name: /enhance your photos/i,
    });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute("href", "/");
  });

  it("renders the header with Pixel branding", () => {
    render(<SharePageClient {...defaultProps} />);

    const headerLink = screen.getAllByRole("link").find(
      (link) => link.textContent === "Pixel",
    );
    expect(headerLink).toBeInTheDocument();
    expect(headerLink).toHaveAttribute("href", "/");
  });

  it("renders the footer with Pixel branding", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(screen.getByText(/made with/i)).toBeInTheDocument();
    const footerLink = screen.getByRole("contentinfo").querySelector("a");
    expect(footerLink).toHaveAttribute("href", "/");
    expect(footerLink).toHaveTextContent("Pixel");
  });

  it("displays 'Enhanced with Pixel' subtitle", () => {
    render(<SharePageClient {...defaultProps} />);

    const aiImageTexts = screen.getAllByText(/ai image enhancement/i);
    expect(aiImageTexts.length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/enhanced with/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders want to enhance text", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(
      screen.getByText(/want to enhance your own photos with ai/i),
    ).toBeInTheDocument();
  });
});
