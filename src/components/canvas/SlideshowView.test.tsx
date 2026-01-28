import type { GalleryImage, GalleryTransition } from "@/lib/canvas/types";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SlideshowView, type SlideshowViewProps } from "./SlideshowView";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    fill,
    className,
    priority,
    sizes,
    ...props
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
    priority?: boolean;
    sizes?: string;
    "data-testid"?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      data-fill={fill}
      data-priority={priority}
      data-sizes={sizes}
      className={className}
      {...props}
    />
  ),
}));

// Mock the animations module
vi.mock("@/lib/canvas/animations", () => ({
  calculateHeroTransform: vi.fn(() => ({
    x: 100,
    y: 50,
    scaleX: 0.5,
    scaleY: 0.5,
  })),
  applyHeroTransformStyles: vi.fn(),
  clearHeroTransformStyles: vi.fn(),
  ANIMATION_DURATIONS: {
    heroExpand: 400,
    heroCollapse: 400,
    gridFade: 300,
    thumbnailSwap: 200,
    peekTransition: 150,
  },
}));

describe("SlideshowView", () => {
  const mockImages: GalleryImage[] = [
    {
      id: "1",
      url: "https://example.com/image1.jpg",
      name: "Image 1",
      width: 1920,
      height: 1080,
      originalUrl: "https://example.com/original1.jpg",
      enhancedUrl: "https://example.com/enhanced1.jpg",
    },
    {
      id: "2",
      url: "https://example.com/image2.jpg",
      name: "Image 2",
      width: 1920,
      height: 1080,
      originalUrl: "https://example.com/original2.jpg",
      enhancedUrl: "https://example.com/enhanced2.jpg",
    },
    {
      id: "3",
      url: "https://example.com/image3.jpg",
      name: "Image 3",
      width: 1920,
      height: 1080,
      originalUrl: "https://example.com/original3.jpg",
      enhancedUrl: null, // No enhanced version
    },
  ];

  const defaultTransitionState: GalleryTransition = {
    isActive: false,
    originRect: null,
    direction: "expand",
  };

  const mockOnNavigate = vi.fn();
  const mockOnExit = vi.fn();

  const defaultProps: SlideshowViewProps = {
    images: mockImages,
    currentIndex: 0,
    isPeeking: false,
    onNavigate: mockOnNavigate,
    onExit: mockOnExit,
    transitionState: defaultTransitionState,
    rotation: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders the slideshow view container", () => {
      render(<SlideshowView {...defaultProps} />);

      const container = screen.getByTestId("slideshow-view");
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute("role", "dialog");
      expect(container).toHaveAttribute("aria-modal", "true");
      expect(container).toHaveAttribute("aria-label", "Image slideshow");
    });

    it("renders the current image", () => {
      render(<SlideshowView {...defaultProps} />);

      const image = screen.getByTestId("slideshow-image");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", mockImages[0]!.enhancedUrl);
      expect(image).toHaveAttribute("alt", mockImages[0]!.name);
    });

    it("renders navigation buttons", () => {
      render(<SlideshowView {...defaultProps} />);

      expect(screen.getByTestId("slideshow-prev-button")).toBeInTheDocument();
      expect(screen.getByTestId("slideshow-next-button")).toBeInTheDocument();
    });

    it("renders exit button", () => {
      render(<SlideshowView {...defaultProps} />);

      expect(screen.getByTestId("slideshow-exit-button")).toBeInTheDocument();
    });

    it("renders touch area", () => {
      render(<SlideshowView {...defaultProps} />);

      expect(screen.getByTestId("slideshow-touch-area")).toBeInTheDocument();
    });

    it("returns null when no current image", () => {
      const { container } = render(
        <SlideshowView {...defaultProps} images={[]} currentIndex={0} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("returns null when currentIndex is out of bounds", () => {
      const { container } = render(
        <SlideshowView {...defaultProps} currentIndex={10} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Image display logic", () => {
    it("displays enhanced URL when available and not peeking", () => {
      render(<SlideshowView {...defaultProps} />);

      const image = screen.getByTestId("slideshow-image");
      expect(image).toHaveAttribute("src", mockImages[0]!.enhancedUrl);
    });

    it("displays original URL when peeking", () => {
      render(<SlideshowView {...defaultProps} isPeeking={true} />);

      const image = screen.getByTestId("slideshow-image");
      expect(image).toHaveAttribute("src", mockImages[0]!.originalUrl);
    });

    it("displays original URL when no enhanced version exists", () => {
      render(<SlideshowView {...defaultProps} currentIndex={2} />);

      const image = screen.getByTestId("slideshow-image");
      expect(image).toHaveAttribute("src", mockImages[2]!.originalUrl);
    });

    it("displays different image based on currentIndex", () => {
      render(<SlideshowView {...defaultProps} currentIndex={1} />);

      const image = screen.getByTestId("slideshow-image");
      expect(image).toHaveAttribute("src", mockImages[1]!.enhancedUrl);
      expect(image).toHaveAttribute("alt", mockImages[1]!.name);
    });
  });

  describe("Rotation", () => {
    it("applies no rotation when rotation is 0", () => {
      render(<SlideshowView {...defaultProps} rotation={0} />);

      const image = screen.getByTestId("slideshow-image");
      const container = image.parentElement;
      expect(container).not.toHaveStyle({ transform: "rotate(0deg)" });
    });

    it("applies 90 degree rotation", () => {
      render(<SlideshowView {...defaultProps} rotation={90} />);

      const image = screen.getByTestId("slideshow-image");
      const container = image.parentElement;
      expect(container).toHaveStyle({ transform: "rotate(90deg)" });
    });

    it("applies 180 degree rotation", () => {
      render(<SlideshowView {...defaultProps} rotation={180} />);

      const image = screen.getByTestId("slideshow-image");
      const container = image.parentElement;
      expect(container).toHaveStyle({ transform: "rotate(180deg)" });
    });

    it("applies 270 degree rotation", () => {
      render(<SlideshowView {...defaultProps} rotation={270} />);

      const image = screen.getByTestId("slideshow-image");
      const container = image.parentElement;
      expect(container).toHaveStyle({ transform: "rotate(270deg)" });
    });
  });

  describe("Rotation buttons", () => {
    const mockOnRotate = vi.fn();

    beforeEach(() => {
      mockOnRotate.mockClear();
    });

    it("does not render rotation buttons when onRotate is not provided", () => {
      render(<SlideshowView {...defaultProps} />);

      expect(screen.queryByTestId("rotate-cw-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("rotate-ccw-button")).not.toBeInTheDocument();
    });

    it("renders rotation buttons when onRotate is provided", () => {
      render(<SlideshowView {...defaultProps} onRotate={mockOnRotate} />);

      expect(screen.getByTestId("rotate-cw-button")).toBeInTheDocument();
      expect(screen.getByTestId("rotate-ccw-button")).toBeInTheDocument();
    });

    it("calls onRotate with cw when clockwise button is clicked", () => {
      render(<SlideshowView {...defaultProps} onRotate={mockOnRotate} />);

      const cwButton = screen.getByTestId("rotate-cw-button");
      fireEvent.click(cwButton);

      expect(mockOnRotate).toHaveBeenCalledWith("cw");
    });

    it("calls onRotate with ccw when counter-clockwise button is clicked", () => {
      render(<SlideshowView {...defaultProps} onRotate={mockOnRotate} />);

      const ccwButton = screen.getByTestId("rotate-ccw-button");
      fireEvent.click(ccwButton);

      expect(mockOnRotate).toHaveBeenCalledWith("ccw");
    });

    it("clockwise button has correct aria-label", () => {
      render(<SlideshowView {...defaultProps} onRotate={mockOnRotate} />);

      const cwButton = screen.getByTestId("rotate-cw-button");
      expect(cwButton).toHaveAttribute("aria-label", "Rotate clockwise");
    });

    it("counter-clockwise button has correct aria-label", () => {
      render(<SlideshowView {...defaultProps} onRotate={mockOnRotate} />);

      const ccwButton = screen.getByTestId("rotate-ccw-button");
      expect(ccwButton).toHaveAttribute(
        "aria-label",
        "Rotate counter-clockwise",
      );
    });
  });

  describe("Navigation", () => {
    it("calls onNavigate with 'prev' when previous button is clicked", async () => {
      render(<SlideshowView {...defaultProps} />);

      const prevButton = screen.getByTestId("slideshow-prev-button");
      fireEvent.click(prevButton);

      expect(mockOnNavigate).toHaveBeenCalledWith("prev");
    });

    it("calls onNavigate with 'next' when next button is clicked", async () => {
      render(<SlideshowView {...defaultProps} />);

      const nextButton = screen.getByTestId("slideshow-next-button");
      fireEvent.click(nextButton);

      expect(mockOnNavigate).toHaveBeenCalledWith("next");
    });

    it("disables navigation buttons when there is only one image", () => {
      const singleImage = [mockImages[0]!];
      render(<SlideshowView {...defaultProps} images={singleImage} />);

      const prevButton = screen.getByTestId("slideshow-prev-button");
      const nextButton = screen.getByTestId("slideshow-next-button");

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    it("navigation buttons are enabled when there are multiple images", () => {
      render(<SlideshowView {...defaultProps} />);

      const prevButton = screen.getByTestId("slideshow-prev-button");
      const nextButton = screen.getByTestId("slideshow-next-button");

      expect(prevButton).not.toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });

    it("previous button has correct aria-label", () => {
      render(<SlideshowView {...defaultProps} />);

      const prevButton = screen.getByTestId("slideshow-prev-button");
      expect(prevButton).toHaveAttribute("aria-label", "Previous image");
    });

    it("next button has correct aria-label", () => {
      render(<SlideshowView {...defaultProps} />);

      const nextButton = screen.getByTestId("slideshow-next-button");
      expect(nextButton).toHaveAttribute("aria-label", "Next image");
    });
  });

  describe("Exit functionality", () => {
    it("calls onExit when exit button is clicked", () => {
      render(<SlideshowView {...defaultProps} />);

      const exitButton = screen.getByTestId("slideshow-exit-button");
      fireEvent.click(exitButton);

      expect(mockOnExit).toHaveBeenCalled();
    });

    it("calls onExit when Escape key is pressed", () => {
      render(<SlideshowView {...defaultProps} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(mockOnExit).toHaveBeenCalled();
    });

    it("does not call onExit when other keys are pressed", () => {
      render(<SlideshowView {...defaultProps} />);

      fireEvent.keyDown(document, { key: "Enter" });
      fireEvent.keyDown(document, { key: "Space" });
      fireEvent.keyDown(document, { key: "ArrowLeft" });

      expect(mockOnExit).not.toHaveBeenCalled();
    });

    it("exit button has correct aria-label", () => {
      render(<SlideshowView {...defaultProps} />);

      const exitButton = screen.getByTestId("slideshow-exit-button");
      expect(exitButton).toHaveAttribute("aria-label", "Exit slideshow");
    });
  });

  describe("Controls visibility", () => {
    it("shows controls on mouse movement", () => {
      render(<SlideshowView {...defaultProps} />);

      const container = screen.getByTestId("slideshow-view");
      const controls = screen.getByTestId("slideshow-controls");

      // Initially controls should be hidden (opacity-0)
      expect(controls).toHaveClass("opacity-0");

      // Move mouse
      fireEvent.mouseMove(container);

      // Controls should be visible
      expect(controls).toHaveClass("opacity-100");
    });

    it("hides controls after 3 seconds of inactivity", () => {
      render(<SlideshowView {...defaultProps} />);

      const container = screen.getByTestId("slideshow-view");
      const controls = screen.getByTestId("slideshow-controls");

      // Move mouse to show controls
      fireEvent.mouseMove(container);
      expect(controls).toHaveClass("opacity-100");

      // Wait for controls to hide
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(controls).toHaveClass("opacity-0");
    });

    it("resets hide timer on subsequent mouse movements", () => {
      render(<SlideshowView {...defaultProps} />);

      const container = screen.getByTestId("slideshow-view");
      const controls = screen.getByTestId("slideshow-controls");

      // Move mouse
      fireEvent.mouseMove(container);
      expect(controls).toHaveClass("opacity-100");

      // Wait 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Move mouse again
      fireEvent.mouseMove(container);

      // Wait another 2 seconds (total 4 seconds from first move, 2 from second)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Controls should still be visible (timer was reset)
      expect(controls).toHaveClass("opacity-100");

      // Wait 1 more second (3 seconds from last move)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Now controls should be hidden
      expect(controls).toHaveClass("opacity-0");
    });
  });

  describe("Accessibility", () => {
    it("announces current image to screen readers", () => {
      render(<SlideshowView {...defaultProps} currentIndex={0} />);

      const announcement = screen.getByRole("status");
      expect(announcement).toHaveTextContent("Image 1 of 3: Image 1");
    });

    it("includes peeking state in announcement", () => {
      render(<SlideshowView {...defaultProps} isPeeking={true} />);

      const announcement = screen.getByRole("status");
      expect(announcement).toHaveTextContent("(showing original)");
    });

    it("has aria-live polite for announcements", () => {
      render(<SlideshowView {...defaultProps} />);

      const announcement = screen.getByRole("status");
      expect(announcement).toHaveAttribute("aria-live", "polite");
      expect(announcement).toHaveAttribute("aria-atomic", "true");
    });
  });

  describe("Hero animation", () => {
    it("applies hero animation when transitionState is active", async () => {
      const animations = await import("@/lib/canvas/animations");
      const { applyHeroTransformStyles, calculateHeroTransform } = vi.mocked(
        animations,
      );

      const activeTransition: GalleryTransition = {
        isActive: true,
        originRect: new DOMRect(100, 100, 200, 150),
        direction: "expand",
      };

      render(
        <SlideshowView {...defaultProps} transitionState={activeTransition} />,
      );

      expect(calculateHeroTransform).toHaveBeenCalledWith(
        activeTransition.originRect,
      );
      expect(applyHeroTransformStyles).toHaveBeenCalled();
    });

    it("clears hero styles after animation completes", async () => {
      const animations = await import("@/lib/canvas/animations");
      const { clearHeroTransformStyles } = vi.mocked(animations);

      const activeTransition: GalleryTransition = {
        isActive: true,
        originRect: new DOMRect(100, 100, 200, 150),
        direction: "expand",
      };

      render(
        <SlideshowView {...defaultProps} transitionState={activeTransition} />,
      );

      // Wait for animation to complete
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(clearHeroTransformStyles).toHaveBeenCalled();
    });

    it("does not apply animation when transition is not active", async () => {
      const animations = await import("@/lib/canvas/animations");
      const { applyHeroTransformStyles } = vi.mocked(animations);

      vi.clearAllMocks();

      render(<SlideshowView {...defaultProps} />);

      expect(applyHeroTransformStyles).not.toHaveBeenCalled();
    });

    it("does not apply animation when originRect is null", async () => {
      const animations = await import("@/lib/canvas/animations");
      const { applyHeroTransformStyles } = vi.mocked(animations);

      vi.clearAllMocks();

      const noRectTransition: GalleryTransition = {
        isActive: true,
        originRect: null,
        direction: "expand",
      };

      render(
        <SlideshowView {...defaultProps} transitionState={noRectTransition} />,
      );

      expect(applyHeroTransformStyles).not.toHaveBeenCalled();
    });
  });

  describe("Reduced motion preference", () => {
    it("respects prefers-reduced-motion setting", () => {
      // Mock matchMedia to return true for reduced motion
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const activeTransition: GalleryTransition = {
        isActive: true,
        originRect: new DOMRect(100, 100, 200, 150),
        direction: "expand",
      };

      render(
        <SlideshowView {...defaultProps} transitionState={activeTransition} />,
      );

      const container = screen.getByTestId("slideshow-view");
      // Should not have animation class when reduced motion is preferred
      expect(container).not.toHaveClass("animate-hero-expand");
    });
  });

  describe("Rotation buttons", () => {
    const mockOnRotate = vi.fn();

    beforeEach(() => {
      mockOnRotate.mockClear();
    });

    it("does not render rotation buttons when onRotate is not provided", () => {
      render(<SlideshowView {...defaultProps} />);

      expect(screen.queryByTestId("rotate-cw-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("rotate-ccw-button")).not.toBeInTheDocument();
    });

    it("renders rotation buttons when onRotate is provided", () => {
      render(<SlideshowView {...defaultProps} onRotate={mockOnRotate} />);

      expect(screen.getByTestId("rotate-cw-button")).toBeInTheDocument();
      expect(screen.getByTestId("rotate-ccw-button")).toBeInTheDocument();
    });

    it("calls onRotate with 'cw' when clockwise button is clicked", () => {
      render(<SlideshowView {...defaultProps} onRotate={mockOnRotate} />);

      const cwButton = screen.getByTestId("rotate-cw-button");
      fireEvent.click(cwButton);

      expect(mockOnRotate).toHaveBeenCalledWith("cw");
    });

    it("calls onRotate with 'ccw' when counter-clockwise button is clicked", () => {
      render(<SlideshowView {...defaultProps} onRotate={mockOnRotate} />);

      const ccwButton = screen.getByTestId("rotate-ccw-button");
      fireEvent.click(ccwButton);

      expect(mockOnRotate).toHaveBeenCalledWith("ccw");
    });

    it("clockwise button has correct aria-label", () => {
      render(<SlideshowView {...defaultProps} onRotate={mockOnRotate} />);

      const cwButton = screen.getByTestId("rotate-cw-button");
      expect(cwButton).toHaveAttribute("aria-label", "Rotate clockwise");
    });

    it("counter-clockwise button has correct aria-label", () => {
      render(<SlideshowView {...defaultProps} onRotate={mockOnRotate} />);

      const ccwButton = screen.getByTestId("rotate-ccw-button");
      expect(ccwButton).toHaveAttribute(
        "aria-label",
        "Rotate counter-clockwise",
      );
    });
  });

  describe("Cleanup", () => {
    it("cleans up keyboard event listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      const { unmount } = render(<SlideshowView {...defaultProps} />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });

    it("cleans up controls timer on unmount", () => {
      render(<SlideshowView {...defaultProps} />);

      const container = screen.getByTestId("slideshow-view");
      fireEvent.mouseMove(container);

      // Unmount should clean up the timer
      // This is tested by not throwing an error
    });

    it("handles animation timer cleanup when component unmounts during animation", async () => {
      const animations = await import("@/lib/canvas/animations");
      const { clearHeroTransformStyles } = vi.mocked(animations);

      vi.clearAllMocks();

      const activeTransition: GalleryTransition = {
        isActive: true,
        originRect: new DOMRect(100, 100, 200, 150),
        direction: "expand",
      };

      const { unmount } = render(
        <SlideshowView {...defaultProps} transitionState={activeTransition} />,
      );

      // Unmount before animation completes
      unmount();

      // Advance timers after unmount - the timeout callback should handle null ref gracefully
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // clearHeroTransformStyles should not be called since component is unmounted
      // (containerRef.current will be null)
      expect(clearHeroTransformStyles).not.toHaveBeenCalled();
    });
  });
});
