import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageComparisonSlider } from "./ImageComparisonSlider";

// Mock next/image
vi.mock("next/image", () => ({
  default: (
    { src, alt, className, onError, style, ...props }: {
      src: string;
      alt: string;
      className?: string;
      onError?: () => void;
      style?: React.CSSProperties;
      [key: string]: unknown;
    },
  ) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={onError}
      style={style}
      {...props}
    />
  ),
}));

// Mock fetch for error logging
global.fetch = vi.fn();

describe("ImageComparisonSlider", () => {
  const defaultProps = {
    originalUrl: "/original.jpg",
    enhancedUrl: "/enhanced.jpg",
    width: 100,
    height: 100,
  };

  it("renders both images with object-cover class", () => {
    render(<ImageComparisonSlider {...defaultProps} />);

    const originalImage = screen.getByAltText("Original");
    const enhancedImage = screen.getByAltText("Enhanced");

    expect(originalImage).toBeDefined();
    expect(enhancedImage).toBeDefined();
    expect(originalImage.className).toContain("object-cover");
    expect(enhancedImage.className).toContain("object-cover");
  });

  it("applies correct aspect ratio from width/height props", () => {
    const { container } = render(
      <ImageComparisonSlider {...defaultProps} width={1600} height={900} />,
    );

    // Find the container div with the style
    // The structure is: div > div(style) > images
    const wrapper = container.firstChild?.firstChild as HTMLElement;
    expect(wrapper).toBeDefined();
    expect(wrapper.style.aspectRatio).toBe("1600 / 900");
  });

  it("uses default aspect ratio if width/height missing", () => {
    const { container } = render(
      <ImageComparisonSlider
        originalUrl="/original.jpg"
        enhancedUrl="/enhanced.jpg"
      />,
    );

    const wrapper = container.firstChild?.firstChild as HTMLElement;
    expect(wrapper.style.aspectRatio).toBe("16 / 9");
  });

  it("handles image load errors gracefully", () => {
    render(<ImageComparisonSlider {...defaultProps} />);

    const enhancedImage = screen.getByAltText("Enhanced");
    fireEvent.error(enhancedImage);

    expect(screen.getByText("Enhanced image failed to load")).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/logs/image-error",
      expect.any(Object),
    );
  });

  it("handles original image load errors gracefully", () => {
    render(<ImageComparisonSlider {...defaultProps} />);

    const originalImage = screen.getByAltText("Original");
    fireEvent.error(originalImage);

    expect(screen.getByText("Original image failed to load")).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/logs/image-error",
      expect.any(Object),
    );
  });

  it("updates slider position on mouse down", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector('[class*="cursor-ew-resize"]') as HTMLElement;

    // Mock getBoundingClientRect
    sliderContainer.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      width: 1000,
      top: 0,
      right: 1000,
      bottom: 500,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    // Simulate mouse down at 25% position
    fireEvent.mouseDown(sliderContainer, { clientX: 250 });

    // Check that the divider moved (the divider uses left style with percentage)
    const divider = container.querySelector('[class*="bg-white"]') as HTMLElement;
    expect(divider.style.left).toBe("25%");
  });

  it("updates slider position on touch start", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector('[class*="cursor-ew-resize"]') as HTMLElement;

    sliderContainer.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      width: 1000,
      top: 0,
      right: 1000,
      bottom: 500,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    // Simulate touch start at 75% position
    fireEvent.touchStart(sliderContainer, {
      touches: [{ clientX: 750 }],
    });

    const divider = container.querySelector('[class*="bg-white"]') as HTMLElement;
    expect(divider.style.left).toBe("75%");
  });

  it("clamps slider position between 0 and 100", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector('[class*="cursor-ew-resize"]') as HTMLElement;

    sliderContainer.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      width: 800,
      top: 0,
      right: 900,
      bottom: 500,
      height: 500,
      x: 100,
      y: 0,
      toJSON: () => {},
    }));

    // Try to drag beyond left boundary
    fireEvent.mouseDown(sliderContainer, { clientX: 0 });
    let divider = container.querySelector('[class*="bg-white"]') as HTMLElement;
    expect(divider.style.left).toBe("0%");

    // Try to drag beyond right boundary
    fireEvent.mouseDown(sliderContainer, { clientX: 2000 });
    divider = container.querySelector('[class*="bg-white"]') as HTMLElement;
    expect(divider.style.left).toBe("100%");
  });

  it("has correct cursor style for dragging", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector('[class*="cursor-ew-resize"]');
    expect(sliderContainer?.className).toContain("cursor-ew-resize");
  });

  it("has correct touch-action style", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector('[class*="cursor-ew-resize"]') as HTMLElement;
    expect(sliderContainer).toBeDefined();
    expect(sliderContainer?.style.touchAction).toBe("none");
  });

  it("renders divider line at slider position", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const divider = container.querySelector('[class*="bg-white"]') as HTMLElement;

    expect(divider).toBeDefined();
    expect(divider.style.left).toBe("50%");
    expect(divider.style.transform).toBe("translateX(-50%)");
  });

  it("renders labels for both images", () => {
    render(<ImageComparisonSlider {...defaultProps} />);
    expect(screen.getByText("Original")).toBeDefined();
    expect(screen.getByText("Enhanced")).toBeDefined();
  });

  it("uses custom labels when provided", () => {
    render(
      <ImageComparisonSlider
        {...defaultProps}
        originalLabel="Before"
        enhancedLabel="After"
      />,
    );
    expect(screen.getByText("Before")).toBeDefined();
    expect(screen.getByText("After")).toBeDefined();
  });

  it("has pointer-events-none on divider", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const divider = container.querySelector('[class*="bg-white"]');
    expect(divider?.className).toContain("pointer-events-none");
  });

  it("applies select-none class to prevent text selection", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector('[class*="select-none"]');
    expect(sliderContainer).toBeDefined();
  });
});
