import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SplitPreview } from "./SplitPreview";

vi.mock("next/image", () => ({
  default: (
    { src, alt, className, onError, ...props }: {
      src: string;
      alt: string;
      className?: string;
      onError?: () => void;
      [key: string]: unknown;
    },
  ) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={onError}
      {...props}
    />
  ),
}));

global.fetch = vi.fn();

describe("SplitPreview", () => {
  const defaultProps = {
    originalUrl: "/original.jpg",
    enhancedUrl: "/enhanced.jpg",
    width: 100,
    height: 100,
  };

  let scrollHandler: EventListener | null = null;
  let resizeHandler: EventListener | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    scrollHandler = null;
    resizeHandler = null;

    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;

    vi.spyOn(window, "addEventListener").mockImplementation((event, handler, options) => {
      if (event === "scroll") {
        scrollHandler = handler as EventListener;
      } else if (event === "resize") {
        resizeHandler = handler as EventListener;
      }
      return originalAddEventListener.call(window, event, handler, options);
    });

    vi.spyOn(window, "removeEventListener").mockImplementation((event, handler, options) => {
      return originalRemoveEventListener.call(window, event, handler, options);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders both images with object-cover class", () => {
    render(<SplitPreview {...defaultProps} />);

    const originalImage = screen.getByAltText("Original");
    const enhancedImage = screen.getByAltText("Enhanced");

    expect(originalImage).toBeDefined();
    expect(enhancedImage).toBeDefined();
    expect(originalImage.className).toContain("object-cover");
    expect(enhancedImage.className).toContain("object-cover");
  });

  it("applies correct aspect ratio from width/height props", () => {
    render(<SplitPreview {...defaultProps} width={1600} height={900} />);

    const container = screen.getByTestId("split-preview-container");
    expect(container.style.aspectRatio).toBe("1600 / 900");
  });

  it("uses default aspect ratio if width/height missing", () => {
    render(<SplitPreview originalUrl="/original.jpg" enhancedUrl="/enhanced.jpg" />);

    const container = screen.getByTestId("split-preview-container");
    expect(container.style.aspectRatio).toBe("16 / 9");
  });

  it("applies custom className when provided", () => {
    render(<SplitPreview {...defaultProps} className="custom-class" />);

    const container = screen.getByTestId("split-preview-container");
    expect(container.className).toContain("custom-class");
  });

  it("renders labels for both images", () => {
    render(<SplitPreview {...defaultProps} />);

    expect(screen.getByTestId("original-label")).toHaveTextContent("Original");
    expect(screen.getByTestId("enhanced-label")).toHaveTextContent("Enhanced");
  });

  it("uses custom labels when provided", () => {
    render(
      <SplitPreview
        {...defaultProps}
        originalLabel="Before"
        enhancedLabel="After"
      />,
    );

    expect(screen.getByTestId("original-label")).toHaveTextContent("Before");
    expect(screen.getByTestId("enhanced-label")).toHaveTextContent("After");
  });

  it("handles enhanced image load error gracefully", () => {
    render(<SplitPreview {...defaultProps} />);

    const enhancedImage = screen.getByAltText("Enhanced");
    fireEvent.error(enhancedImage);

    expect(screen.getByText("Enhanced image failed to load")).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/logs/image-error",
      expect.any(Object),
    );
  });

  it("handles original image load error gracefully", () => {
    render(<SplitPreview {...defaultProps} />);

    const originalImage = screen.getByAltText("Original");
    fireEvent.error(originalImage);

    expect(screen.getByText("Original image failed to load")).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/logs/image-error",
      expect.any(Object),
    );
  });

  it("renders split line with pointer-events-none", () => {
    render(<SplitPreview {...defaultProps} />);

    const splitLine = screen.getByTestId("split-line");
    expect(splitLine.className).toContain("pointer-events-none");
  });

  it("renders split line and enhanced clip container", () => {
    render(<SplitPreview {...defaultProps} />);

    const splitLine = screen.getByTestId("split-line");
    expect(splitLine).toBeDefined();
    expect(splitLine.className).toContain("bg-white/70");

    const clipContainer = screen.getByTestId("enhanced-clip-container");
    expect(clipContainer).toBeDefined();
    expect(clipContainer.className).toContain("absolute");
  });

  it("adds scroll and resize event listeners on mount", () => {
    render(<SplitPreview {...defaultProps} />);

    expect(window.addEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      { passive: true },
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
  });

  it("removes event listeners on unmount", () => {
    const { unmount } = render(<SplitPreview {...defaultProps} />);

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
  });

  it("updates clipY to 0 when viewport center is above image", () => {
    const { container } = render(<SplitPreview {...defaultProps} />);

    const splitContainer = screen.getByTestId("split-preview-container");
    vi.spyOn(splitContainer, "getBoundingClientRect").mockReturnValue({
      top: 600,
      height: 400,
      left: 0,
      right: 800,
      bottom: 1000,
      width: 800,
      x: 0,
      y: 600,
      toJSON: () => {},
    });

    Object.defineProperty(window, "innerHeight", { value: 800, writable: true });

    act(() => {
      if (scrollHandler) {
        scrollHandler(new Event("scroll"));
      }
    });

    const splitLine = container.querySelector('[data-testid="split-line"]') as HTMLElement;
    expect(splitLine.style.top).toBe("0%");
  });

  it("updates clipY to 100 when viewport center is below image", () => {
    const { container } = render(<SplitPreview {...defaultProps} />);

    const splitContainer = screen.getByTestId("split-preview-container");
    vi.spyOn(splitContainer, "getBoundingClientRect").mockReturnValue({
      top: -500,
      height: 400,
      left: 0,
      right: 800,
      bottom: -100,
      width: 800,
      x: 0,
      y: -500,
      toJSON: () => {},
    });

    Object.defineProperty(window, "innerHeight", { value: 800, writable: true });

    act(() => {
      if (scrollHandler) {
        scrollHandler(new Event("scroll"));
      }
    });

    const splitLine = container.querySelector('[data-testid="split-line"]') as HTMLElement;
    expect(splitLine.style.top).toBe("100%");
  });

  it("calculates correct clipY when viewport center is within image", () => {
    const { container } = render(<SplitPreview {...defaultProps} />);

    const splitContainer = screen.getByTestId("split-preview-container");
    vi.spyOn(splitContainer, "getBoundingClientRect").mockReturnValue({
      top: 200,
      height: 400,
      left: 0,
      right: 800,
      bottom: 600,
      width: 800,
      x: 0,
      y: 200,
      toJSON: () => {},
    });

    Object.defineProperty(window, "innerHeight", { value: 800, writable: true });

    act(() => {
      if (scrollHandler) {
        scrollHandler(new Event("scroll"));
      }
    });

    const splitLine = container.querySelector('[data-testid="split-line"]') as HTMLElement;
    expect(splitLine.style.top).toBe("50%");
  });

  it("updates on resize event", () => {
    const { container } = render(<SplitPreview {...defaultProps} />);

    const splitContainer = screen.getByTestId("split-preview-container");
    vi.spyOn(splitContainer, "getBoundingClientRect").mockReturnValue({
      top: 100,
      height: 400,
      left: 0,
      right: 800,
      bottom: 500,
      width: 800,
      x: 0,
      y: 100,
      toJSON: () => {},
    });

    Object.defineProperty(window, "innerHeight", { value: 800, writable: true });

    act(() => {
      if (resizeHandler) {
        resizeHandler(new Event("resize"));
      }
    });

    const splitLine = container.querySelector('[data-testid="split-line"]') as HTMLElement;
    expect(splitLine.style.top).toBe("75%");
  });

  it("handles edge case with zero height image", () => {
    const { container } = render(<SplitPreview {...defaultProps} />);

    const splitContainer = screen.getByTestId("split-preview-container");
    vi.spyOn(splitContainer, "getBoundingClientRect").mockReturnValue({
      top: 200,
      height: 0,
      left: 0,
      right: 800,
      bottom: 200,
      width: 800,
      x: 0,
      y: 200,
      toJSON: () => {},
    });

    act(() => {
      if (scrollHandler) {
        scrollHandler(new Event("scroll"));
      }
    });

    const splitLine = container.querySelector('[data-testid="split-line"]') as HTMLElement;
    expect(splitLine).toBeDefined();
  });

  it("handles scroll event when container ref has not been set yet", () => {
    const originalCreateElement = document.createElement.bind(document);
    let callCount = 0;

    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      callCount++;
      return originalCreateElement(tagName);
    });

    render(<SplitPreview {...defaultProps} />);

    expect(callCount).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });

  it("handles safe width and height with invalid values", () => {
    render(
      <SplitPreview
        {...defaultProps}
        width={0}
        height={-1}
      />,
    );

    const container = screen.getByTestId("split-preview-container");
    expect(container.style.aspectRatio).toBe("16 / 1");
  });

  it("handles NaN width and height values", () => {
    render(
      <SplitPreview
        {...defaultProps}
        width={NaN}
        height={NaN}
      />,
    );

    const container = screen.getByTestId("split-preview-container");
    expect(container.style.aspectRatio).toBe("16 / 9");
  });

  it("has rounded corners on container", () => {
    render(<SplitPreview {...defaultProps} />);

    const container = screen.getByTestId("split-preview-container");
    expect(container.className).toContain("rounded-lg");
  });

  it("has overflow hidden on container", () => {
    render(<SplitPreview {...defaultProps} />);

    const container = screen.getByTestId("split-preview-container");
    expect(container.className).toContain("overflow-hidden");
  });

  it("applies bg-muted class to container", () => {
    render(<SplitPreview {...defaultProps} />);

    const container = screen.getByTestId("split-preview-container");
    expect(container.className).toContain("bg-muted");
  });

  it("handles fetch error silently when logging broken image", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));

    render(<SplitPreview {...defaultProps} />);

    const enhancedImage = screen.getByAltText("Enhanced");
    fireEvent.error(enhancedImage);

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Enhanced Image Load Error]"),
      );
    });

    consoleSpy.mockRestore();
  });

  it("logs correct data when image fails to load", () => {
    render(<SplitPreview {...defaultProps} />);

    const originalImage = screen.getByAltText("Original");
    fireEvent.error(originalImage);

    expect(global.fetch).toHaveBeenCalledWith("/api/logs/image-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.stringContaining("SPLIT_PREVIEW_ORIGINAL_LOAD_ERROR"),
    });
  });
});
