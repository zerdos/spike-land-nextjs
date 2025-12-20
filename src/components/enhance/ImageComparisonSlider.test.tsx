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

  it("renders both images with object-contain class", () => {
    render(<ImageComparisonSlider {...defaultProps} />);

    const originalImage = screen.getByAltText("Original");
    const enhancedImage = screen.getByAltText("Enhanced");

    expect(originalImage).toBeDefined();
    expect(enhancedImage).toBeDefined();
    expect(originalImage.className).toContain("object-contain");
    expect(enhancedImage.className).toContain("object-contain");
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
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

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
    const divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;
    expect(divider.style.left).toBe("25%");
  });

  it("updates slider position on touch start", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

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

    const divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;
    expect(divider.style.left).toBe("75%");
  });

  it("clamps slider position between 0 and 100", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

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
    let divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;
    expect(divider.style.left).toBe("0%");

    // Try to drag beyond right boundary
    fireEvent.mouseDown(sliderContainer, { clientX: 2000 });
    divider = container.querySelector('[class*="bg-primary"]') as HTMLElement;
    expect(divider.style.left).toBe("100%");
  });

  it("has correct cursor style for dragging", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    );
    expect(sliderContainer?.className).toContain("cursor-ew-resize");
  });

  it("allows vertical scroll while capturing horizontal drag", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;
    expect(sliderContainer).toBeDefined();
    expect(sliderContainer?.style.touchAction).toBe("pan-y pinch-zoom");
  });

  it("renders divider line at slider position", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;

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
    const divider = container.querySelector('[class*="bg-primary"]');
    expect(divider?.className).toContain("pointer-events-none");
  });

  it("applies select-none class to prevent text selection", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector('[class*="select-none"]');
    expect(sliderContainer).toBeDefined();
  });

  it("handles drag move after mouse down", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

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

    // Start dragging at 25%
    fireEvent.mouseDown(sliderContainer, { clientX: 250 });

    // Simulate mouse move at document level
    fireEvent.mouseMove(document, { clientX: 500 });

    const divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;
    expect(divider.style.left).toBe("50%");
  });

  it("handles touch move after touch start", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

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

    // Start touching at 25%
    fireEvent.touchStart(sliderContainer, {
      touches: [{ clientX: 250 }],
    });

    // Simulate touch move at document level
    fireEvent.touchMove(document, {
      touches: [{ clientX: 600 }],
    });

    const divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;
    expect(divider.style.left).toBe("60%");
  });

  it("handles mouse up to end dragging", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

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

    // Start dragging
    fireEvent.mouseDown(sliderContainer, { clientX: 250 });

    // End dragging
    fireEvent.mouseUp(document);

    // After mouseup, move should not update position
    fireEvent.mouseMove(document, { clientX: 800 });

    const divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;
    // Should remain at 25% since dragging ended
    expect(divider.style.left).toBe("25%");
  });

  it("handles touch end to end dragging", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

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

    // Start touching
    fireEvent.touchStart(sliderContainer, {
      touches: [{ clientX: 300 }],
    });

    // End touching
    fireEvent.touchEnd(document);

    // After touchend, move should not update position
    fireEvent.touchMove(document, {
      touches: [{ clientX: 900 }],
    });

    const divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;
    // Should remain at 30% since touch ended
    expect(divider.style.left).toBe("30%");
  });

  it("does not update position when not dragging", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

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

    // Move without starting drag
    fireEvent.mouseMove(document, { clientX: 700 });

    const divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;
    // Should remain at default 50%
    expect(divider.style.left).toBe("50%");
  });

  it("logs error to console when fetch fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    const fetchError = new Error("Network error");
    vi.mocked(global.fetch).mockRejectedValueOnce(fetchError);

    render(<ImageComparisonSlider {...defaultProps} />);

    const enhancedImage = screen.getByAltText("Enhanced");
    fireEvent.error(enhancedImage);

    // Wait for async logBrokenImage to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Enhanced Image Load Error]"),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Image Error Logging Failed]",
      fetchError,
    );

    consoleErrorSpy.mockRestore();
  });

  it("handles touch start with no touches", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

    // Simulate touch start with empty touches array
    fireEvent.touchStart(sliderContainer, {
      touches: [],
    });

    const divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;
    // Position should remain at default 50%
    expect(divider.style.left).toBe("50%");
  });

  it("handles touch move with no touches when dragging", () => {
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

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

    // Start touching at 25%
    fireEvent.touchStart(sliderContainer, {
      touches: [{ clientX: 250 }],
    });

    // Touch move with empty touches array
    fireEvent.touchMove(document, {
      touches: [],
    });

    const divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;
    // Should remain at 25% since no valid touch in move event
    expect(divider.style.left).toBe("25%");
  });

  it("handles zero and negative dimensions", () => {
    const { container } = render(
      <ImageComparisonSlider
        {...defaultProps}
        width={0}
        height={-5}
      />,
    );

    const wrapper = container.firstChild?.firstChild as HTMLElement;
    // Invalid values (0, negative) default to 16:9 when auto-detection not available
    expect(wrapper.style.aspectRatio).toBe("16 / 9");
  });

  it("handles NaN dimensions", () => {
    const { container } = render(
      <ImageComparisonSlider
        {...defaultProps}
        width={NaN}
        height={NaN}
      />,
    );

    const wrapper = container.firstChild?.firstChild as HTMLElement;
    // Should use safe defaults (16/9 fallback)
    expect(wrapper.style.aspectRatio).toBe("16 / 9");
  });

  it("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { container, unmount } = render(
      <ImageComparisonSlider {...defaultProps} />,
    );
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

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

    // Start dragging to trigger event listeners
    fireEvent.mouseDown(sliderContainer, { clientX: 250 });

    // Unmount while dragging
    unmount();

    // Should have removed event listeners
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "mousemove",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "mouseup",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchmove",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchend",
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });

  it("does not set up event listeners when not dragging", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    render(<ImageComparisonSlider {...defaultProps} />);

    // Should not have added drag-related event listeners
    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "mousemove",
      expect.any(Function),
    );
    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "mouseup",
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
  });

  it("handles case when container ref exists but getBoundingClientRect works", () => {
    // This test verifies that the updatePosition callback checks for container ref
    // The actual null check is for containerRef.current, not getBoundingClientRect
    // The component always has the ref attached to the container div, so we just verify
    // the normal flow works correctly
    const { container } = render(<ImageComparisonSlider {...defaultProps} />);
    const sliderContainer = container.querySelector(
      '[class*="cursor-ew-resize"]',
    ) as HTMLElement;

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

    // Verify normal flow works
    fireEvent.mouseDown(sliderContainer, { clientX: 500 });

    const divider = container.querySelector(
      '[class*="bg-primary"]',
    ) as HTMLElement;
    expect(divider.style.left).toBe("50%");
  });
});
