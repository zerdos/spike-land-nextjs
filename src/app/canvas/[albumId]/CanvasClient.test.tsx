import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasClient, CanvasImage, CanvasSettings } from "./CanvasClient";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
    "data-testid": testId,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
    priority?: boolean;
    onError?: () => void;
    "data-testid"?: string;
  }) => (
    <img
      src={src}
      alt={alt}
      data-testid={testId}
      onError={onError}
    />
  ),
}));

const mockImages: CanvasImage[] = [
  {
    id: "img-1",
    url: "https://example.com/image1.jpg",
    name: "Image 1",
    width: 1920,
    height: 1080,
  },
  {
    id: "img-2",
    url: "https://example.com/image2.jpg",
    name: "Image 2",
    width: 2560,
    height: 1440,
  },
  {
    id: "img-3",
    url: "https://example.com/image3.jpg",
    name: "Image 3",
    width: 3840,
    height: 2160,
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
    // Reset document.body.style.cursor
    document.body.style.cursor = "auto";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("renders the first image", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const img = screen.getByTestId("canvas-current-image");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/image1.jpg");
      expect(img).toHaveAttribute("alt", "Image 1");
    });

    it("renders container with black background", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const container = screen.getByTestId("canvas-container");
      expect(container.className).toContain("bg-black");
    });

    it("renders with aria-label containing album name", () => {
      render(
        <CanvasClient
          images={mockImages}
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

    it("preloads next image when multiple images exist", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const preloadImg = screen.getByTestId("canvas-preload-image");
      expect(preloadImg).toBeInTheDocument();
      expect(preloadImg).toHaveAttribute("src", "https://example.com/image2.jpg");
    });

    it("does not preload next image when only one image exists", () => {
      const singleImage = [mockImages[0]];
      render(
        <CanvasClient
          images={singleImage}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      expect(screen.queryByTestId("canvas-preload-image")).not.toBeInTheDocument();
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

    it("does not render current image when no images", () => {
      render(
        <CanvasClient
          images={[]}
          settings={defaultSettings}
          albumName="Empty Album"
        />,
      );

      expect(screen.queryByTestId("canvas-current-image")).not.toBeInTheDocument();
    });
  });

  describe("Rotation", () => {
    it("applies 0 degree rotation transform", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, rotation: 0 }}
          albumName="Test Album"
        />,
      );

      const rotationContainer = screen.getByTestId("canvas-rotation-container");
      expect(rotationContainer.style.transform).toBe("rotate(0deg)");
    });

    it("applies 90 degree rotation transform", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, rotation: 90 }}
          albumName="Test Album"
        />,
      );

      const rotationContainer = screen.getByTestId("canvas-rotation-container");
      expect(rotationContainer.style.transform).toBe("rotate(90deg)");
    });

    it("applies 180 degree rotation transform", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, rotation: 180 }}
          albumName="Test Album"
        />,
      );

      const rotationContainer = screen.getByTestId("canvas-rotation-container");
      expect(rotationContainer.style.transform).toBe("rotate(180deg)");
    });

    it("applies 270 degree rotation transform", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, rotation: 270 }}
          albumName="Test Album"
        />,
      );

      const rotationContainer = screen.getByTestId("canvas-rotation-container");
      expect(rotationContainer.style.transform).toBe("rotate(270deg)");
    });

    it("swaps container dimensions for 90 degree rotation", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, rotation: 90 }}
          albumName="Test Album"
        />,
      );

      const rotationContainer = screen.getByTestId("canvas-rotation-container");
      expect(rotationContainer.style.width).toBe("100vh");
      expect(rotationContainer.style.height).toBe("100vw");
    });

    it("swaps container dimensions for 270 degree rotation", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, rotation: 270 }}
          albumName="Test Album"
        />,
      );

      const rotationContainer = screen.getByTestId("canvas-rotation-container");
      expect(rotationContainer.style.width).toBe("100vh");
      expect(rotationContainer.style.height).toBe("100vw");
    });

    it("uses normal dimensions for 0 degree rotation", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, rotation: 0 }}
          albumName="Test Album"
        />,
      );

      const rotationContainer = screen.getByTestId("canvas-rotation-container");
      expect(rotationContainer.style.width).toBe("100vw");
      expect(rotationContainer.style.height).toBe("100vh");
    });

    it("uses normal dimensions for 180 degree rotation", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, rotation: 180 }}
          albumName="Test Album"
        />,
      );

      const rotationContainer = screen.getByTestId("canvas-rotation-container");
      expect(rotationContainer.style.width).toBe("100vw");
      expect(rotationContainer.style.height).toBe("100vh");
    });
  });

  describe("Slideshow auto-advance", () => {
    it("advances to next image after interval", async () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, interval: 10 }}
          albumName="Test Album"
        />,
      );

      // Initial image
      expect(screen.getByTestId("canvas-current-image")).toHaveAttribute(
        "src",
        "https://example.com/image1.jpg",
      );

      // Advance timer by interval + transition time
      act(() => {
        vi.advanceTimersByTime(10000); // interval
      });

      act(() => {
        vi.advanceTimersByTime(500); // transition time
      });

      // Should now show second image
      expect(screen.getByTestId("canvas-current-image")).toHaveAttribute(
        "src",
        "https://example.com/image2.jpg",
      );
    });

    it("wraps around to first image after last", async () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, interval: 5 }}
          albumName="Test Album"
        />,
      );

      // Advance through all 3 images
      for (let i = 0; i < 3; i++) {
        act(() => {
          vi.advanceTimersByTime(5000 + 500);
        });
      }

      // Should wrap back to first image
      expect(screen.getByTestId("canvas-current-image")).toHaveAttribute(
        "src",
        "https://example.com/image1.jpg",
      );
    });

    it("does not auto-advance with single image", () => {
      const singleImage = [mockImages[0]];
      render(
        <CanvasClient
          images={singleImage}
          settings={{ ...defaultSettings, interval: 5 }}
          albumName="Test Album"
        />,
      );

      const initialSrc = screen.getByTestId("canvas-current-image").getAttribute("src");

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Should still be the same image
      expect(screen.getByTestId("canvas-current-image")).toHaveAttribute("src", initialSrc);
    });
  });

  describe("Fade transitions", () => {
    it("starts with full opacity", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const wrapper = screen.getByTestId("canvas-image-wrapper");
      expect(wrapper.className).toContain("opacity-100");
    });

    it("fades out during transition", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, interval: 10 }}
          albumName="Test Album"
        />,
      );

      // Start transition
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // During transition (before 500ms)
      const wrapper = screen.getByTestId("canvas-image-wrapper");
      expect(wrapper.className).toContain("opacity-0");
    });

    it("fades back in after transition", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, interval: 10 }}
          albumName="Test Album"
        />,
      );

      // Complete transition
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });

      const wrapper = screen.getByTestId("canvas-image-wrapper");
      expect(wrapper.className).toContain("opacity-100");
    });
  });

  describe("Random order", () => {
    it("shuffles images when order is random", () => {
      // Mock Math.random to produce consistent shuffle
      const mockRandom = vi.spyOn(Math, "random");
      mockRandom.mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);

      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, order: "random" }}
          albumName="Test Album"
        />,
      );

      // The image should be rendered (we can't guarantee which one due to shuffle)
      expect(screen.getByTestId("canvas-current-image")).toBeInTheDocument();
    });

    it("maintains album order when order is album", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, order: "album" }}
          albumName="Test Album"
        />,
      );

      // Should be first image in album order
      expect(screen.getByTestId("canvas-current-image")).toHaveAttribute(
        "src",
        "https://example.com/image1.jpg",
      );
    });
  });

  describe("Cursor hiding", () => {
    it("hides cursor after 3 seconds of no movement", async () => {
      render(
        <CanvasClient
          images={mockImages}
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
          images={mockImages}
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
          images={mockImages}
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
          images={mockImages}
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

  describe("Error handling", () => {
    it("shows error state when image fails to load", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const img = screen.getByTestId("canvas-current-image");
      act(() => {
        fireEvent.error(img);
      });

      expect(screen.getByTestId("canvas-image-error")).toBeInTheDocument();
      expect(screen.getByText("Failed to load image")).toBeInTheDocument();
    });

    it("hides current image when error occurs", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={defaultSettings}
          albumName="Test Album"
        />,
      );

      const img = screen.getByTestId("canvas-current-image");
      act(() => {
        fireEvent.error(img);
      });

      expect(screen.queryByTestId("canvas-current-image")).not.toBeInTheDocument();
    });

    it("clears error state when transitioning to next image", () => {
      render(
        <CanvasClient
          images={mockImages}
          settings={{ ...defaultSettings, interval: 5 }}
          albumName="Test Album"
        />,
      );

      // Trigger error
      const img = screen.getByTestId("canvas-current-image");
      act(() => {
        fireEvent.error(img);
      });

      expect(screen.getByTestId("canvas-image-error")).toBeInTheDocument();

      // Advance to next image
      act(() => {
        vi.advanceTimersByTime(5000 + 500);
      });

      // Error should be cleared
      expect(screen.queryByTestId("canvas-image-error")).not.toBeInTheDocument();
      expect(screen.getByTestId("canvas-current-image")).toBeInTheDocument();
    });
  });
});
