import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DragPreview, useDragPreview } from "./DragPreview";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, className, "data-testid": testId }: {
    src: string;
    alt: string;
    className?: string;
    fill?: boolean;
    sizes?: string;
    unoptimized?: boolean;
    "data-testid"?: string;
  }) => (
    <img
      src={src}
      alt={alt}
      className={className}
      data-testid={testId}
    />
  ),
}));

const mockImages = [
  { id: "1", url: "https://example.com/image1.jpg" },
  { id: "2", url: "https://example.com/image2.jpg" },
  { id: "3", url: "https://example.com/image3.jpg" },
];

describe("DragPreview Component", () => {
  describe("Visibility", () => {
    it("should not render when visible is false", () => {
      render(
        <DragPreview
          images={mockImages}
          position={{ x: 100, y: 100 }}
          visible={false}
        />,
      );
      expect(screen.queryByTestId("drag-preview")).not.toBeInTheDocument();
    });

    it("should not render when images array is empty", () => {
      render(
        <DragPreview
          images={[]}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      expect(screen.queryByTestId("drag-preview")).not.toBeInTheDocument();
    });

    it("should render when visible is true and images exist", () => {
      render(
        <DragPreview
          images={mockImages}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      expect(screen.getByTestId("drag-preview")).toBeInTheDocument();
    });
  });

  describe("Positioning", () => {
    it("should position at specified coordinates", () => {
      render(
        <DragPreview
          images={mockImages}
          position={{ x: 200, y: 300 }}
          visible={true}
        />,
      );
      const preview = screen.getByTestId("drag-preview");
      expect(preview).toHaveStyle({ left: "200px", top: "300px" });
    });

    it("should center the preview on cursor with transform", () => {
      render(
        <DragPreview
          images={mockImages}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      const preview = screen.getByTestId("drag-preview");
      expect(preview).toHaveStyle({ transform: "translate(-50%, -50%)" });
    });
  });

  describe("Single Image", () => {
    it("should render single image without count badge", () => {
      render(
        <DragPreview
          images={[mockImages[0]]}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      expect(screen.getByTestId("drag-preview-image-0")).toBeInTheDocument();
      expect(screen.queryByTestId("drag-preview-count")).not.toBeInTheDocument();
    });
  });

  describe("Multiple Images", () => {
    it("should render up to 3 stacked images", () => {
      render(
        <DragPreview
          images={mockImages}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      expect(screen.getByTestId("drag-preview-image-0")).toBeInTheDocument();
      expect(screen.getByTestId("drag-preview-image-1")).toBeInTheDocument();
      expect(screen.getByTestId("drag-preview-image-2")).toBeInTheDocument();
    });

    it("should show count badge for multiple images", () => {
      render(
        <DragPreview
          images={[mockImages[0], mockImages[1]]}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      const countBadge = screen.getByTestId("drag-preview-count");
      expect(countBadge).toBeInTheDocument();
      expect(countBadge).toHaveTextContent("2");
    });

    it("should show +N count when more than 3 images", () => {
      const manyImages = [
        ...mockImages,
        { id: "4", url: "https://example.com/image4.jpg" },
        { id: "5", url: "https://example.com/image5.jpg" },
      ];
      render(
        <DragPreview
          images={manyImages}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      const countBadge = screen.getByTestId("drag-preview-count");
      expect(countBadge).toHaveTextContent("+2");
    });

    it("should only display first 3 images even when more exist", () => {
      const manyImages = [
        ...mockImages,
        { id: "4", url: "https://example.com/image4.jpg" },
      ];
      render(
        <DragPreview
          images={manyImages}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      expect(screen.getByTestId("drag-preview-image-0")).toBeInTheDocument();
      expect(screen.getByTestId("drag-preview-image-1")).toBeInTheDocument();
      expect(screen.getByTestId("drag-preview-image-2")).toBeInTheDocument();
      expect(screen.queryByTestId("drag-preview-image-3")).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have pointer-events-none to not interfere with drag", () => {
      render(
        <DragPreview
          images={mockImages}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      const preview = screen.getByTestId("drag-preview");
      expect(preview).toHaveClass("pointer-events-none");
    });

    it("should have fixed positioning", () => {
      render(
        <DragPreview
          images={mockImages}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      const preview = screen.getByTestId("drag-preview");
      expect(preview).toHaveClass("fixed");
    });

    it("should have high z-index for visibility", () => {
      render(
        <DragPreview
          images={mockImages}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      const preview = screen.getByTestId("drag-preview");
      expect(preview).toHaveClass("z-50");
    });

    it("should have aria-hidden for accessibility", () => {
      render(
        <DragPreview
          images={mockImages}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      const preview = screen.getByTestId("drag-preview");
      expect(preview).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Stack Effect", () => {
    it("should apply rotation to stacked images", () => {
      render(
        <DragPreview
          images={mockImages}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      const firstImage = screen.getByTestId("drag-preview-image-0");
      const secondImage = screen.getByTestId("drag-preview-image-1");
      const thirdImage = screen.getByTestId("drag-preview-image-2");

      expect(firstImage).toHaveStyle({ transform: "translate(0px, 0px) rotate(0deg)" });
      expect(secondImage).toHaveStyle({ transform: "translate(-4px, -2px) rotate(-6deg)" });
      expect(thirdImage).toHaveStyle({ transform: "translate(4px, 2px) rotate(6deg)" });
    });

    it("should apply varying opacity to stacked images", () => {
      render(
        <DragPreview
          images={mockImages}
          position={{ x: 100, y: 100 }}
          visible={true}
        />,
      );
      const firstImage = screen.getByTestId("drag-preview-image-0");
      const secondImage = screen.getByTestId("drag-preview-image-1");

      expect(firstImage).toHaveStyle({ opacity: "0.9" });
      expect(secondImage).toHaveStyle({ opacity: "0.7" });
    });
  });
});

describe("useDragPreview Hook", () => {
  it("should initialize with default state", () => {
    const { result } = renderHook(() => useDragPreview());
    expect(result.current.previewState).toEqual({
      visible: false,
      position: { x: 0, y: 0 },
      images: [],
    });
  });

  it("should show preview with images and position", () => {
    const { result } = renderHook(() => useDragPreview());

    act(() => {
      result.current.showPreview(mockImages, 100, 200);
    });

    expect(result.current.previewState).toEqual({
      visible: true,
      position: { x: 100, y: 200 },
      images: mockImages,
    });
  });

  it("should update position", () => {
    const { result } = renderHook(() => useDragPreview());

    act(() => {
      result.current.showPreview(mockImages, 100, 200);
    });

    act(() => {
      result.current.updatePosition(300, 400);
    });

    expect(result.current.previewState.position).toEqual({ x: 300, y: 400 });
    expect(result.current.previewState.visible).toBe(true);
    expect(result.current.previewState.images).toEqual(mockImages);
  });

  it("should hide preview but keep images", () => {
    const { result } = renderHook(() => useDragPreview());

    act(() => {
      result.current.showPreview(mockImages, 100, 200);
    });

    act(() => {
      result.current.hidePreview();
    });

    expect(result.current.previewState.visible).toBe(false);
    expect(result.current.previewState.images).toEqual(mockImages);
  });

  it("should clear preview completely", () => {
    const { result } = renderHook(() => useDragPreview());

    act(() => {
      result.current.showPreview(mockImages, 100, 200);
    });

    act(() => {
      result.current.clearPreview();
    });

    expect(result.current.previewState).toEqual({
      visible: false,
      position: { x: 0, y: 0 },
      images: [],
    });
  });

  it("should maintain stable callback references", () => {
    const { result, rerender } = renderHook(() => useDragPreview());

    const initialShowPreview = result.current.showPreview;
    const initialUpdatePosition = result.current.updatePosition;
    const initialHidePreview = result.current.hidePreview;
    const initialClearPreview = result.current.clearPreview;

    rerender();

    expect(result.current.showPreview).toBe(initialShowPreview);
    expect(result.current.updatePosition).toBe(initialUpdatePosition);
    expect(result.current.hidePreview).toBe(initialHidePreview);
    expect(result.current.clearPreview).toBe(initialClearPreview);
  });
});
