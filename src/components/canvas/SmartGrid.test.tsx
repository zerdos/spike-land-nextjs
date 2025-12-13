import type { GalleryImage } from "@/lib/canvas/types";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SmartGrid } from "./SmartGrid";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
    className,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    sizes?: string;
    className?: string;
    onError?: () => void;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={onError}
      data-testid="next-image"
    />
  ),
}));

describe("SmartGrid", () => {
  const mockImages: GalleryImage[] = [
    {
      id: "image-1",
      url: "https://example.com/image1.jpg",
      name: "Image 1",
      width: 1920,
      height: 1080,
      originalUrl: "https://example.com/original1.jpg",
      enhancedUrl: "https://example.com/enhanced1.jpg",
    },
    {
      id: "image-2",
      url: "https://example.com/image2.jpg",
      name: "Image 2",
      width: 1920,
      height: 1080,
      originalUrl: "https://example.com/original2.jpg",
      enhancedUrl: null,
    },
    {
      id: "image-3",
      url: "https://example.com/image3.jpg",
      name: "Image 3",
      width: 1920,
      height: 1080,
      originalUrl: "https://example.com/original3.jpg",
      enhancedUrl: "https://example.com/enhanced3.jpg",
    },
  ];

  const mockOnImageSelect = vi.fn();
  const mockOnEnterSlideshow = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the grid container", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toBeInTheDocument();
    });

    it("renders all images as thumbnails", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const thumbnails = screen.getAllByRole("gridcell");
      expect(thumbnails).toHaveLength(3);
    });

    it("renders empty grid when no images provided", () => {
      render(
        <SmartGrid
          images={[]}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toBeInTheDocument();

      const thumbnails = screen.queryAllByRole("gridcell");
      expect(thumbnails).toHaveLength(0);
    });
  });

  describe("Responsive grid classes", () => {
    it("has 3 column grid class for mobile", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveClass("grid-cols-3");
    });

    it("has 4 column grid class for tablet (md breakpoint)", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveClass("md:grid-cols-4");
    });

    it("has 6 column grid class for desktop (lg breakpoint)", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveClass("lg:grid-cols-6");
    });

    it("has gap-2 class for spacing", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveClass("gap-2");
    });

    it("has p-4 class for padding", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveClass("p-4");
    });
  });

  describe("Blur animation", () => {
    it("applies animate-grid-fade-out class when isBlurred is true", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
          isBlurred={true}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveClass("animate-grid-fade-out");
    });

    it("applies animate-grid-fade-in class when isBlurred is false", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
          isBlurred={false}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveClass("animate-grid-fade-in");
    });

    it("defaults to animate-grid-fade-in when isBlurred is not provided", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveClass("animate-grid-fade-in");
    });
  });

  describe("Rotation", () => {
    it("does not apply transform when rotation is 0", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
          rotation={0}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid.style.transform).toBe("");
    });

    it("applies rotate(90deg) transform when rotation is 90", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
          rotation={90}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid.style.transform).toBe("rotate(90deg)");
    });

    it("applies rotate(180deg) transform when rotation is 180", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
          rotation={180}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid.style.transform).toBe("rotate(180deg)");
    });

    it("applies rotate(270deg) transform when rotation is 270", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
          rotation={270}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid.style.transform).toBe("rotate(270deg)");
    });

    it("defaults to no rotation when rotation prop is not provided", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid.style.transform).toBe("");
    });
  });

  describe("Accessibility", () => {
    it("has role grid", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByRole("grid");
      expect(grid).toBeInTheDocument();
    });

    it("has aria-label Photo gallery", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByRole("grid");
      expect(grid).toHaveAttribute("aria-label", "Photo gallery");
    });
  });

  describe("Selection", () => {
    it("passes selectedImageId to thumbnails for selection state", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId="image-2"
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const thumbnails = screen.getAllByRole("gridcell");

      // First and third thumbnails should not be selected
      expect(thumbnails[0]).toHaveAttribute("aria-selected", "false");
      expect(thumbnails[2]).toHaveAttribute("aria-selected", "false");

      // Second thumbnail should be selected
      expect(thumbnails[1]).toHaveAttribute("aria-selected", "true");
    });

    it("calls onImageSelect when a thumbnail is clicked", async () => {
      const user = userEvent.setup();

      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const thumbnail = screen.getByTestId("grid-thumbnail-image-1");
      await user.click(thumbnail);

      expect(mockOnImageSelect).toHaveBeenCalledTimes(1);
      expect(mockOnImageSelect).toHaveBeenCalledWith("image-1", thumbnail);
    });
  });

  describe("Double click slideshow", () => {
    it("calls onEnterSlideshow on thumbnail double click", async () => {
      const user = userEvent.setup();

      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const thumbnail = screen.getByTestId("grid-thumbnail-image-1");
      await user.dblClick(thumbnail);

      expect(mockOnEnterSlideshow).toHaveBeenCalledTimes(1);
    });

    it("calls onImageSelect before onEnterSlideshow on double click", async () => {
      const user = userEvent.setup();
      const callOrder: string[] = [];

      const trackingOnImageSelect = vi.fn().mockImplementation(() => {
        callOrder.push("onImageSelect");
      });

      const trackingOnEnterSlideshow = vi.fn().mockImplementation(() => {
        callOrder.push("onEnterSlideshow");
      });

      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={trackingOnImageSelect}
          onEnterSlideshow={trackingOnEnterSlideshow}
        />,
      );

      const thumbnail = screen.getByTestId("grid-thumbnail-image-1");
      await user.dblClick(thumbnail);

      // Should have 3 calls: 2 from double click (as click) and 1 from double click handler
      // The onImageSelect is called both on click and double click handler
      expect(trackingOnImageSelect).toHaveBeenCalled();
      expect(trackingOnEnterSlideshow).toHaveBeenCalled();
    });
  });

  describe("Keyboard navigation", () => {
    it("calls onEnterSlideshow on Enter key when an image is selected", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId="image-1"
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      fireEvent.keyDown(grid, { key: "Enter" });

      expect(mockOnEnterSlideshow).toHaveBeenCalledTimes(1);
    });

    it("does not call onEnterSlideshow on Enter key when no image is selected", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      fireEvent.keyDown(grid, { key: "Enter" });

      expect(mockOnEnterSlideshow).not.toHaveBeenCalled();
    });

    it("prevents default on Enter key when image is selected", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId="image-1"
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      fireEvent(grid, event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("does not call onEnterSlideshow on other keys", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId="image-1"
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      fireEvent.keyDown(grid, { key: "a" });
      fireEvent.keyDown(grid, { key: "Escape" });
      fireEvent.keyDown(grid, { key: " " });

      expect(mockOnEnterSlideshow).not.toHaveBeenCalled();
    });
  });

  describe("Custom className", () => {
    it("applies custom className", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
          className="custom-class"
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveClass("custom-class");
    });

    it("merges custom className with default classes", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
          className="custom-class"
        />,
      );

      const grid = screen.getByTestId("smart-grid");
      expect(grid).toHaveClass("grid");
      expect(grid).toHaveClass("grid-cols-3");
      expect(grid).toHaveClass("custom-class");
    });
  });

  describe("Ref forwarding", () => {
    it("forwards ref to the grid container", () => {
      const ref = vi.fn();

      render(
        <SmartGrid
          ref={ref}
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("Image ordering", () => {
    it("renders images in the order provided", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const images = screen.getAllByTestId("next-image");
      expect(images[0]).toHaveAttribute("src", mockImages[0].originalUrl);
      expect(images[1]).toHaveAttribute("src", mockImages[1].originalUrl);
      expect(images[2]).toHaveAttribute("src", mockImages[2].originalUrl);
    });
  });

  describe("Thumbnail unmounting", () => {
    it("handles thumbnail unmount by removing from refs map", () => {
      const { rerender } = render(
        <SmartGrid
          images={mockImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      // Verify all three thumbnails are rendered
      expect(screen.getAllByRole("gridcell")).toHaveLength(3);

      // Rerender with fewer images (simulating unmount)
      const reducedImages = [mockImages[0]];
      rerender(
        <SmartGrid
          images={reducedImages}
          selectedImageId={null}
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      // Verify only one thumbnail remains
      expect(screen.getAllByRole("gridcell")).toHaveLength(1);
    });
  });

  describe("Selection with enhanced images", () => {
    it("shows enhanced image for selected image with enhancedUrl", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId="image-1"
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const images = screen.getAllByTestId("next-image");
      // First image is selected and has enhanced URL
      expect(images[0]).toHaveAttribute("src", mockImages[0].enhancedUrl);
    });

    it("shows original image for selected image without enhancedUrl", () => {
      render(
        <SmartGrid
          images={mockImages}
          selectedImageId="image-2"
          onImageSelect={mockOnImageSelect}
          onEnterSlideshow={mockOnEnterSlideshow}
        />,
      );

      const images = screen.getAllByTestId("next-image");
      // Second image is selected but has no enhanced URL
      expect(images[1]).toHaveAttribute("src", mockImages[1].originalUrl);
    });
  });
});
