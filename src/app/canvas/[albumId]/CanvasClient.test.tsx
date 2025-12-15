import type { CanvasSettings, GalleryImage } from "@/lib/canvas/types";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasClient } from "./CanvasClient";

// Mock the brand components
vi.mock("@/components/brand", () => ({
  PixelLogo: ({ size, variant }: { size: string; variant: string; }) => (
    <div data-testid="pixel-logo" data-size={size} data-variant={variant}>
      Pixel Logo
    </div>
  ),
}));

// Mock the UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    [key: string]: unknown;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Play: () => <span data-testid="play-icon">▶</span>,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

// Mock the hooks
const mockSelectImage = vi.fn();
const mockEnterSlideshow = vi.fn();
const mockExitSlideshow = vi.fn();
const mockGoToNext = vi.fn();
const mockGoToPrev = vi.fn();
const mockStartPeek = vi.fn();
const mockEndPeek = vi.fn();
const mockGetTransitionOrigin = vi.fn(() => null);

let mockViewMode: "grid" | "slideshow" = "grid";
let mockSelectedImageId: string | null = null;
let mockCurrentIndex = 0;
let mockIsPeeking = false;
let mockIsTransitioning = false;

vi.mock("@/hooks/useSmartGallery", () => ({
  useSmartGallery: () => ({
    viewMode: mockViewMode,
    selectedImageId: mockSelectedImageId,
    selectedImage: null,
    currentIndex: mockCurrentIndex,
    isPeeking: mockIsPeeking,
    isTransitioning: mockIsTransitioning,
    selectImage: mockSelectImage,
    enterSlideshow: mockEnterSlideshow,
    exitSlideshow: mockExitSlideshow,
    goToNext: mockGoToNext,
    goToPrev: mockGoToPrev,
    startPeek: mockStartPeek,
    endPeek: mockEndPeek,
    getTransitionOrigin: mockGetTransitionOrigin,
    setTransitionOrigin: vi.fn(),
  }),
}));

let keyboardHandlers: {
  onSpacebar: () => void;
  onLeftArrow: () => void;
  onRightArrow: () => void;
  onBKeyDown: () => void;
  onBKeyUp: () => void;
  onEscape: () => void;
  isEnabled: boolean;
} | null = null;

vi.mock("@/hooks/useKeyboardNavigation", () => ({
  useKeyboardNavigation: (options: typeof keyboardHandlers) => {
    keyboardHandlers = options;
  },
}));

let touchGestureOptions: {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onDoubleTap: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  isEnabled: boolean;
} | null = null;

vi.mock("@/hooks/useTouchGestures", () => ({
  useTouchGestures: (
    _ref: React.RefObject<HTMLElement | null>,
    options: typeof touchGestureOptions,
  ) => {
    touchGestureOptions = options;
  },
}));

// Mock the child components
vi.mock("@/components/canvas/SmartGrid", () => ({
  SmartGrid: ({
    images,
    selectedImageId,
    onImageSelect,
    onEnterSlideshow,
    isBlurred,
    rotation,
  }: {
    images: GalleryImage[];
    selectedImageId: string | null;
    onImageSelect: (id: string, element: HTMLElement) => void;
    onEnterSlideshow: () => void;
    isBlurred: boolean;
    rotation: number;
  }) => (
    <div
      data-testid="smart-grid"
      data-image-count={images.length}
      data-selected-id={selectedImageId}
      data-is-blurred={isBlurred}
      data-rotation={rotation}
    >
      {images.map((img) => (
        <button
          key={img.id}
          data-testid={`grid-thumbnail-${img.id}`}
          onClick={(e) => onImageSelect(img.id, e.currentTarget)}
          onDoubleClick={() => onEnterSlideshow()}
        >
          {img.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/canvas/SlideshowView", () => ({
  SlideshowView: ({
    images,
    currentIndex,
    isPeeking,
    onNavigate,
    onExit,
    rotation,
  }: {
    images: GalleryImage[];
    currentIndex: number;
    isPeeking: boolean;
    onNavigate: (dir: "prev" | "next") => void;
    onExit: () => void;
    transitionState: { isActive: boolean; };
    rotation: number;
  }) => (
    <div
      data-testid="slideshow-view"
      data-current-index={currentIndex}
      data-is-peeking={isPeeking}
      data-rotation={rotation}
      data-image-count={images.length}
    >
      <button data-testid="slideshow-prev" onClick={() => onNavigate("prev")}>
        Prev
      </button>
      <button data-testid="slideshow-next" onClick={() => onNavigate("next")}>
        Next
      </button>
      <button data-testid="slideshow-exit" onClick={onExit}>
        Exit
      </button>
    </div>
  ),
}));

vi.mock("@/components/canvas/FloatingHint", () => ({
  FloatingHint: ({
    text,
    isVisible,
    isTouchDevice,
  }: {
    text: string;
    isVisible: boolean;
    isTouchDevice: boolean;
  }) => (
    <div
      data-testid="floating-hint"
      data-text={text}
      data-is-visible={isVisible}
      data-is-touch-device={isTouchDevice}
    />
  ),
  HINT_TEXT: {
    desktop: "Press Spacebar to enter slideshow",
    touch: "Double-tap to enter slideshow",
  },
}));

const mockGalleryImages: GalleryImage[] = [
  {
    id: "img-1",
    url: "https://example.com/enhanced1.jpg",
    name: "Image 1",
    width: 1920,
    height: 1080,
    originalUrl: "https://example.com/original1.jpg",
    enhancedUrl: "https://example.com/enhanced1.jpg",
  },
  {
    id: "img-2",
    url: "https://example.com/enhanced2.jpg",
    name: "Image 2",
    width: 2560,
    height: 1440,
    originalUrl: "https://example.com/original2.jpg",
    enhancedUrl: "https://example.com/enhanced2.jpg",
  },
  {
    id: "img-3",
    url: "https://example.com/original3.jpg",
    name: "Image 3",
    width: 3840,
    height: 2160,
    originalUrl: "https://example.com/original3.jpg",
    enhancedUrl: null,
  },
];

const defaultSettings: CanvasSettings = {
  rotation: 0,
  order: "album",
  interval: 10,
};

describe("CanvasClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset mock states
    mockViewMode = "grid";
    mockSelectedImageId = null;
    mockCurrentIndex = 0;
    mockIsPeeking = false;
    mockIsTransitioning = false;
    keyboardHandlers = null;
    touchGestureOptions = null;
    // Reset document.body.style.cursor
    document.body.style.cursor = "auto";
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("renders the smart grid with images", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveAttribute("data-image-count", "3");
    });

    it("renders container with correct background", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const container = screen.getByTestId("canvas-container");
      expect(container.className).toContain("bg-[#0B0E14]");
    });

    it("renders with aria-label containing album name", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="My Beautiful Album"
        />,
      );

      const container = screen.getByTestId("canvas-container");
      expect(container).toHaveAttribute(
        "aria-label",
        "Canvas display: My Beautiful Album",
      );
    });

    it("passes rotation to SmartGrid", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={{ ...defaultSettings, rotation: 90 }}
          albumName="Test Album"
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveAttribute("data-rotation", "90");
    });

    it("passes selectedImageId to SmartGrid", () => {
      mockSelectedImageId = "img-2";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveAttribute("data-selected-id", "img-2");
    });
  });

  describe("Empty state", () => {
    it("shows empty state when no images provided", () => {
      render(
        <CanvasClient
          images={[]}
          settings={defaultSettings}
          albumName="Empty Album"
        />,
      );

      const emptyState = screen.getByTestId("canvas-empty");
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText("No images in this album")).toBeInTheDocument();
    });

    it("does not render grid when no images", () => {
      render(
        <CanvasClient
          images={[]}
          settings={defaultSettings}
          albumName="Empty Album"
        />,
      );

      expect(screen.queryByTestId("smart-grid")).not.toBeInTheDocument();
    });
  });

  describe("Slideshow View", () => {
    it("does not render slideshow in grid mode", () => {
      mockViewMode = "grid";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      expect(screen.queryByTestId("slideshow-view")).not.toBeInTheDocument();
    });

    it("renders slideshow when in slideshow mode", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      expect(screen.getByTestId("slideshow-view")).toBeInTheDocument();
    });

    it("passes currentIndex to slideshow", () => {
      mockViewMode = "slideshow";
      mockCurrentIndex = 2;
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const slideshow = screen.getByTestId("slideshow-view");
      expect(slideshow).toHaveAttribute("data-current-index", "2");
    });

    it("passes isPeeking to slideshow", () => {
      mockViewMode = "slideshow";
      mockIsPeeking = true;
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const slideshow = screen.getByTestId("slideshow-view");
      expect(slideshow).toHaveAttribute("data-is-peeking", "true");
    });

    it("calls goToNext when slideshow next button clicked", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      fireEvent.click(screen.getByTestId("slideshow-next"));
      expect(mockGoToNext).toHaveBeenCalled();
    });

    it("calls goToPrev when slideshow prev button clicked", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      fireEvent.click(screen.getByTestId("slideshow-prev"));
      expect(mockGoToPrev).toHaveBeenCalled();
    });

    it("calls exitSlideshow when exit button clicked", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      fireEvent.click(screen.getByTestId("slideshow-exit"));
      expect(mockExitSlideshow).toHaveBeenCalled();
    });

    it("blurs grid when in slideshow mode", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveAttribute("data-is-blurred", "true");
    });
  });

  describe("Floating Hint", () => {
    it("renders floating hint", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      expect(screen.getByTestId("floating-hint")).toBeInTheDocument();
    });

    it("shows hint when image is selected in grid mode", () => {
      mockViewMode = "grid";
      mockSelectedImageId = "img-1";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const hint = screen.getByTestId("floating-hint");
      expect(hint).toHaveAttribute("data-is-visible", "true");
    });

    it("hides hint when no image is selected", () => {
      mockViewMode = "grid";
      mockSelectedImageId = null;
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const hint = screen.getByTestId("floating-hint");
      expect(hint).toHaveAttribute("data-is-visible", "false");
    });

    it("shows desktop hint text for non-touch devices", () => {
      // Ensure no touch capability
      Object.defineProperty(navigator, "maxTouchPoints", {
        value: 0,
        writable: true,
        configurable: true,
      });
      // Remove ontouchstart if it exists
      const originalOntouchstart = Object.getOwnPropertyDescriptor(
        window,
        "ontouchstart",
      );
      delete (window as unknown as Record<string, unknown>).ontouchstart;

      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const hint = screen.getByTestId("floating-hint");
      expect(hint).toHaveAttribute(
        "data-text",
        "Press Spacebar to enter slideshow",
      );

      // Restore
      if (originalOntouchstart) {
        Object.defineProperty(window, "ontouchstart", originalOntouchstart);
      }
    });
  });

  describe("Image selection and slideshow entry", () => {
    it("calls selectImage when thumbnail is clicked", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      fireEvent.click(screen.getByTestId("grid-thumbnail-img-2"));
      expect(mockSelectImage).toHaveBeenCalledWith(
        "img-2",
        expect.any(HTMLElement),
      );
    });

    it("calls enterSlideshow on thumbnail double-click", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      fireEvent.doubleClick(screen.getByTestId("grid-thumbnail-img-1"));
      expect(mockEnterSlideshow).toHaveBeenCalled();
    });
  });

  describe("Keyboard navigation setup", () => {
    it("sets up keyboard navigation with isEnabled true", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      expect(keyboardHandlers).not.toBeNull();
      expect(keyboardHandlers?.isEnabled).toBe(true);
    });

    it("spacebar enters slideshow in grid mode", () => {
      mockViewMode = "grid";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      keyboardHandlers?.onSpacebar();
      expect(mockEnterSlideshow).toHaveBeenCalled();
    });

    it("spacebar exits slideshow in slideshow mode", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      keyboardHandlers?.onSpacebar();
      expect(mockExitSlideshow).toHaveBeenCalled();
    });

    it("left arrow calls goToPrev", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      keyboardHandlers?.onLeftArrow();
      expect(mockGoToPrev).toHaveBeenCalled();
    });

    it("right arrow calls goToNext", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      keyboardHandlers?.onRightArrow();
      expect(mockGoToNext).toHaveBeenCalled();
    });

    it("B key down starts peek", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      keyboardHandlers?.onBKeyDown();
      expect(mockStartPeek).toHaveBeenCalled();
    });

    it("B key up ends peek", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      keyboardHandlers?.onBKeyUp();
      expect(mockEndPeek).toHaveBeenCalled();
    });

    it("escape exits slideshow", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      keyboardHandlers?.onEscape();
      expect(mockExitSlideshow).toHaveBeenCalled();
    });
  });

  describe("Touch gestures setup", () => {
    it("sets up touch gestures for slideshow", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      expect(touchGestureOptions).not.toBeNull();
      expect(touchGestureOptions?.isEnabled).toBe(true);
    });

    it("disables touch gestures in grid mode", () => {
      mockViewMode = "grid";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      expect(touchGestureOptions?.isEnabled).toBe(false);
    });

    it("swipe left calls goToNext", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      touchGestureOptions?.onSwipeLeft();
      expect(mockGoToNext).toHaveBeenCalled();
    });

    it("swipe right calls goToPrev", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      touchGestureOptions?.onSwipeRight();
      expect(mockGoToPrev).toHaveBeenCalled();
    });

    it("double tap in grid mode enters slideshow", () => {
      mockViewMode = "grid";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      touchGestureOptions?.onDoubleTap();
      expect(mockEnterSlideshow).toHaveBeenCalled();
    });

    it("double tap in slideshow mode exits slideshow", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      touchGestureOptions?.onDoubleTap();
      expect(mockExitSlideshow).toHaveBeenCalled();
    });

    it("long press starts peek", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      touchGestureOptions?.onLongPressStart();
      expect(mockStartPeek).toHaveBeenCalled();
    });

    it("long press end ends peek", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      touchGestureOptions?.onLongPressEnd();
      expect(mockEndPeek).toHaveBeenCalled();
    });
  });

  describe("Random order", () => {
    it("shuffles images when order is random", () => {
      // Mock Math.random to produce consistent shuffle
      const mockRandom = vi.spyOn(Math, "random");
      mockRandom.mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);

      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={{ ...defaultSettings, order: "random" }}
          albumName="Test Album"
        />,
      );

      // The grid should be rendered with images
      expect(screen.getByTestId("smart-grid")).toBeInTheDocument();
    });

    it("maintains album order when order is album", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={{ ...defaultSettings, order: "album" }}
          albumName="Test Album"
        />,
      );

      // Grid should show first image in album order
      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveAttribute("data-image-count", "3");
    });
  });

  describe("Cursor hiding", () => {
    it("hides cursor after 3 seconds of no movement", async () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(document.body.style.cursor).toBe("none");
    });

    it("shows cursor on mouse movement", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      // Hide cursor first
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(document.body.style.cursor).toBe("none");

      // Move mouse
      act(() => {
        fireEvent.mouseMove(document);
      });

      expect(document.body.style.cursor).toBe("auto");
    });

    it("restarts hide timer on mouse movement", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      // Wait 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Move mouse
      act(() => {
        fireEvent.mouseMove(document);
      });

      // Wait another 2 seconds (total 4, but timer reset)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should still be visible
      expect(document.body.style.cursor).toBe("auto");

      // Wait remaining time to hide
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(document.body.style.cursor).toBe("none");
    });

    it("restores cursor on unmount", () => {
      const { unmount } = render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      // Hide cursor
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(document.body.style.cursor).toBe("none");

      // Unmount
      unmount();

      expect(document.body.style.cursor).toBe("auto");
    });
  });

  describe("Rotation settings", () => {
    it("applies 0 degree rotation", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={{ ...defaultSettings, rotation: 0 }}
          albumName="Test Album"
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveAttribute("data-rotation", "0");
    });

    it("applies 90 degree rotation", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={{ ...defaultSettings, rotation: 90 }}
          albumName="Test Album"
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveAttribute("data-rotation", "90");
    });

    it("applies 180 degree rotation", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={{ ...defaultSettings, rotation: 180 }}
          albumName="Test Album"
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveAttribute("data-rotation", "180");
    });

    it("applies 270 degree rotation", () => {
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={{ ...defaultSettings, rotation: 270 }}
          albumName="Test Album"
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveAttribute("data-rotation", "270");
    });

    it("passes rotation to slideshow view", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={{ ...defaultSettings, rotation: 90 }}
          albumName="Test Album"
        />,
      );

      const slideshow = screen.getByTestId("slideshow-view");
      expect(slideshow).toHaveAttribute("data-rotation", "90");
    });
  });

  describe("Touch device detection", () => {
    it("detects touch device on mount", () => {
      // Mock touch device
      Object.defineProperty(window, "ontouchstart", {
        value: () => {},
        writable: true,
      });

      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      // The hint should be rendered
      expect(screen.getByTestId("floating-hint")).toBeInTheDocument();
    });
  });

  describe("Header with Pixel Logo and CTA", () => {
    it("renders header with Pixel logo in grid mode", () => {
      mockViewMode = "grid";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const logo = screen.getByTestId("pixel-logo");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("data-size", "sm");
      expect(logo).toHaveAttribute("data-variant", "horizontal");
    });

    it("renders Pixel logo link with correct href", () => {
      mockViewMode = "grid";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const logoLink = screen.getByTestId("pixel-logo-link");
      expect(logoLink).toHaveAttribute("href", "/apps/pixel");
    });

    it("renders Start Slideshow button in grid mode", () => {
      mockViewMode = "grid";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const button = screen.getByTestId("start-slideshow-button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Start Slideshow");
    });

    it("Start Slideshow button is disabled when no image is selected", () => {
      mockViewMode = "grid";
      mockSelectedImageId = null;
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const button = screen.getByTestId("start-slideshow-button");
      expect(button).toBeDisabled();
    });

    it("Start Slideshow button is enabled when an image is selected", () => {
      mockViewMode = "grid";
      mockSelectedImageId = "img-1";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const button = screen.getByTestId("start-slideshow-button");
      expect(button).not.toBeDisabled();
    });

    it("clicking Start Slideshow button calls enterSlideshow", () => {
      mockViewMode = "grid";
      mockSelectedImageId = "img-1";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const button = screen.getByTestId("start-slideshow-button");
      fireEvent.click(button);

      expect(mockEnterSlideshow).toHaveBeenCalled();
    });

    it("does not render header in slideshow mode", () => {
      mockViewMode = "slideshow";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      expect(screen.queryByTestId("pixel-logo")).not.toBeInTheDocument();
      expect(screen.queryByTestId("start-slideshow-button")).not
        .toBeInTheDocument();
    });

    it("renders play icon in Start Slideshow button", () => {
      mockViewMode = "grid";
      render(
        <CanvasClient
          images={mockGalleryImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      expect(screen.getByTestId("play-icon")).toBeInTheDocument();
    });
  });
});
