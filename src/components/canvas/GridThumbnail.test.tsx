import type { GalleryImage } from "@/lib/canvas/types";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GridThumbnail } from "./GridThumbnail";

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

describe("GridThumbnail", () => {
  const mockImage: GalleryImage = {
    id: "test-image-1",
    url: "https://example.com/image.jpg",
    name: "Test Image",
    width: 1920,
    height: 1080,
    originalUrl: "https://example.com/original.jpg",
    enhancedUrl: "https://example.com/enhanced.jpg",
  };

  const mockOnSelect = vi.fn();
  const mockOnDoubleClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the thumbnail with image", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const image = screen.getByTestId("next-image");
      expect(image).toBeInTheDocument();
    });

    it("displays original image by default when not selected", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const image = screen.getByTestId("next-image");
      expect(image).toHaveAttribute("src", mockImage.originalUrl);
    });

    it("displays enhanced image when selected and enhancedUrl is available", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={true}
          onSelect={mockOnSelect}
        />,
      );

      const image = screen.getByTestId("next-image");
      expect(image).toHaveAttribute("src", mockImage.enhancedUrl);
    });

    it("displays original image when selected but no enhancedUrl is available", () => {
      const imageWithoutEnhanced: GalleryImage = {
        ...mockImage,
        enhancedUrl: null,
      };

      render(
        <GridThumbnail
          image={imageWithoutEnhanced}
          isSelected={true}
          onSelect={mockOnSelect}
        />,
      );

      const image = screen.getByTestId("next-image");
      expect(image).toHaveAttribute("src", imageWithoutEnhanced.originalUrl);
    });

    it("uses image name as alt text", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("alt", "Test Image");
    });

    it("uses fallback alt text when image name is empty", () => {
      const imageWithoutName: GalleryImage = {
        ...mockImage,
        name: "",
      };

      render(
        <GridThumbnail
          image={imageWithoutName}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("alt", "Gallery image");
    });

    it("applies custom className", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
          className="custom-class"
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      expect(thumbnail).toHaveClass("custom-class");
    });
  });

  describe("Selection state", () => {
    it("applies glow styles when selected", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={true}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      expect(thumbnail).toHaveClass("ring-2");
      expect(thumbnail).toHaveClass("ring-primary");
      expect(thumbnail).toHaveClass("animate-pulse-cyan");
    });

    it("does not apply glow styles when not selected", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      expect(thumbnail).not.toHaveClass("ring-2");
      expect(thumbnail).not.toHaveClass("ring-primary");
      expect(thumbnail).not.toHaveClass("animate-pulse-cyan");
    });
  });

  describe("Accessibility", () => {
    it("has role gridcell", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByRole("gridcell");
      expect(thumbnail).toBeInTheDocument();
    });

    it("has aria-selected false when not selected", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByRole("gridcell");
      expect(thumbnail).toHaveAttribute("aria-selected", "false");
    });

    it("has aria-selected true when selected", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={true}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByRole("gridcell");
      expect(thumbnail).toHaveAttribute("aria-selected", "true");
    });

    it("has tabIndex 0 for keyboard navigation", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByRole("gridcell");
      expect(thumbnail).toHaveAttribute("tabIndex", "0");
    });

    it("has focus ring styles", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      expect(thumbnail).toHaveClass("focus:ring-2");
      expect(thumbnail).toHaveClass("focus:ring-primary");
    });
  });

  describe("Interactions", () => {
    it("calls onSelect with image id and element on click", async () => {
      const user = userEvent.setup();

      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      await user.click(thumbnail);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(mockImage.id, thumbnail);
    });

    it("calls onDoubleClick with image id on double click", async () => {
      const user = userEvent.setup();

      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
          onDoubleClick={mockOnDoubleClick}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      await user.dblClick(thumbnail);

      expect(mockOnDoubleClick).toHaveBeenCalledTimes(1);
      expect(mockOnDoubleClick).toHaveBeenCalledWith(mockImage.id);
    });

    it("does not throw when onDoubleClick is not provided", async () => {
      const user = userEvent.setup();

      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);

      // Should not throw
      await user.dblClick(thumbnail);
    });

    it("calls onSelect on Enter key press", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      fireEvent.keyDown(thumbnail, { key: "Enter" });

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(mockImage.id, thumbnail);
    });

    it("calls onSelect on Space key press", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      fireEvent.keyDown(thumbnail, { key: " " });

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(mockImage.id, thumbnail);
    });

    it("does not call onSelect on other key press", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      fireEvent.keyDown(thumbnail, { key: "a" });

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it("prevents default on Enter key press", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      fireEvent(thumbnail, event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("prevents default on Space key press", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      const event = new KeyboardEvent("keydown", {
        key: " ",
        bubbles: true,
      });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      fireEvent(thumbnail, event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe("Image error handling", () => {
    it("shows error fallback when image fails to load", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const image = screen.getByTestId("next-image");
      fireEvent.error(image);

      expect(screen.getByTestId("image-error-fallback")).toBeInTheDocument();
      expect(screen.getByText("Failed to load")).toBeInTheDocument();
    });

    it("shows original image after error even when selected", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={true}
          onSelect={mockOnSelect}
        />,
      );

      const image = screen.getByTestId("next-image");
      fireEvent.error(image);

      // After error, should show fallback
      expect(screen.getByTestId("image-error-fallback")).toBeInTheDocument();
    });
  });

  describe("Ref forwarding", () => {
    it("forwards ref to the container element", () => {
      const ref = vi.fn();

      render(
        <GridThumbnail
          ref={ref}
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("CSS classes", () => {
    it("has mb-4 class for masonry spacing", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      expect(thumbnail).toHaveClass("mb-4");
    });

    it("applies paddingBottom style based on image aspect ratio", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      // Image is 1920x1080, so aspect ratio padding = (1080/1920) * 100 = 56.25%
      expect(thumbnail).toHaveStyle({ paddingBottom: "56.25%" });
    });

    it("has rounded-xl class for border radius", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      expect(thumbnail).toHaveClass("rounded-xl");
    });

    it("has cursor-pointer class", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      expect(thumbnail).toHaveClass("cursor-pointer");
    });

    it("has overflow-hidden class", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      expect(thumbnail).toHaveClass("overflow-hidden");
    });

    it("has transition classes for smooth animation", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      expect(thumbnail).toHaveClass("transition-all");
      expect(thumbnail).toHaveClass("duration-200");
    });

    it("has shadow class when selected", () => {
      const { container } = render(
        <GridThumbnail
          image={mockImage}
          isSelected={true}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = container.querySelector("[data-testid]");
      // The shadow class is applied via the cn utility with array syntax
      // We check the class list includes shadow pattern
      expect(thumbnail?.className).toContain("shadow-");
    });
  });

  describe("Data attributes", () => {
    it("has correct data-testid", () => {
      render(
        <GridThumbnail
          image={mockImage}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );

      const thumbnail = screen.getByTestId(`grid-thumbnail-${mockImage.id}`);
      expect(thumbnail).toBeInTheDocument();
    });
  });
});
