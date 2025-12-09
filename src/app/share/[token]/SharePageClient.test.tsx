import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SharePageClient } from "./SharePageClient";

vi.mock("@/components/enhance/ImageComparisonSlider", () => ({
  ImageComparisonSlider: ({
    originalUrl,
    enhancedUrl,
    originalLabel,
    enhancedLabel,
    width,
    height,
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
      <span data-testid="slider-width">{width}</span>
      <span data-testid="slider-height">{height}</span>
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
  enhancedWidth: 3840,
  enhancedHeight: 2160,
  tier: "TIER_4K",
};

describe("SharePageClient", () => {
  it("renders the image name as title", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Beautiful Sunset" }),
    ).toBeInTheDocument();
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

  it("uses enhanced dimensions for the slider", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(screen.getByTestId("slider-width")).toHaveTextContent("3840");
    expect(screen.getByTestId("slider-height")).toHaveTextContent("2160");
  });

  it("falls back to original dimensions when enhanced are null", () => {
    render(
      <SharePageClient
        {...defaultProps}
        enhancedWidth={null}
        enhancedHeight={null}
      />,
    );

    expect(screen.getByTestId("slider-width")).toHaveTextContent("1920");
    expect(screen.getByTestId("slider-height")).toHaveTextContent("1080");
  });

  it("renders download original button with correct link", () => {
    render(<SharePageClient {...defaultProps} />);

    const downloadOriginal = screen.getByRole("link", {
      name: /download original/i,
    });
    expect(downloadOriginal).toBeInTheDocument();
    expect(downloadOriginal).toHaveAttribute(
      "href",
      "https://example.com/original.jpg",
    );
    expect(downloadOriginal).toHaveAttribute("download");
  });

  it("renders download enhanced button with correct link", () => {
    render(<SharePageClient {...defaultProps} />);

    const downloadEnhanced = screen.getByRole("link", {
      name: /download enhanced/i,
    });
    expect(downloadEnhanced).toBeInTheDocument();
    expect(downloadEnhanced).toHaveAttribute(
      "href",
      "https://example.com/enhanced.jpg",
    );
    expect(downloadEnhanced).toHaveAttribute("download");
  });

  it("renders the header with Pixel branding", () => {
    render(<SharePageClient {...defaultProps} />);

    const headerLink = screen.getByRole("link", { name: /pixel/i });
    expect(headerLink).toBeInTheDocument();
    expect(headerLink).toHaveAttribute("href", "/");
  });

  it("has dark background styling", () => {
    const { container } = render(<SharePageClient {...defaultProps} />);

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).toContain("bg-neutral-950");
  });

  it("sets max width based on enhanced dimensions", () => {
    const { container } = render(<SharePageClient {...defaultProps} />);

    const mainContent = container.querySelector("main > div");
    expect(mainContent).toHaveStyle({ maxWidth: "min(3840px, 90vw)" });
  });
});
