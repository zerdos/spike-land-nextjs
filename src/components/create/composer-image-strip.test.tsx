import type { ComposerImage } from "@/hooks/useComposerImages";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ComposerImageStrip } from "./composer-image-strip";

// Mock framer-motion to avoid animation complexities in tests
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      layout?: boolean;
      initial?: object;
      animate?: object;
      exit?: object;
    }) => {
      // Filter out framer-motion specific props
      const { layout: _layout, initial: _initial, animate: _animate, exit: _exit, ...htmlProps } =
        props as Record<string, unknown>;
      return <div {...htmlProps as React.HTMLAttributes<HTMLDivElement>}>{children}</div>;
    },
  },
}));

function createMockImage(overrides: Partial<ComposerImage> = {}): ComposerImage {
  return {
    id: `img-${Math.random().toString(36).slice(2)}`,
    file: new File(["content"], "test.jpg", { type: "image/jpeg" }),
    previewUrl: "blob:http://localhost/test-preview",
    isUploading: false,
    ...overrides,
  };
}

describe("ComposerImageStrip", () => {
  const defaultProps = {
    images: [] as ComposerImage[],
    onRemove: vi.fn(),
    onAddClick: vi.fn(),
    maxImages: 4,
  };

  it("should render nothing when images array is empty", () => {
    const { container } = render(<ComposerImageStrip {...defaultProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("should render thumbnails for each image", () => {
    const images = [
      createMockImage({ id: "img-1", previewUrl: "blob:http://localhost/1" }),
      createMockImage({ id: "img-2", previewUrl: "blob:http://localhost/2" }),
      createMockImage({ id: "img-3", previewUrl: "blob:http://localhost/3" }),
    ];

    render(<ComposerImageStrip {...defaultProps} images={images} />);

    const imgElements = screen.getAllByAltText("Attachment");
    expect(imgElements).toHaveLength(3);
    expect(imgElements[0]).toHaveAttribute("src", "blob:http://localhost/1");
    expect(imgElements[1]).toHaveAttribute("src", "blob:http://localhost/2");
    expect(imgElements[2]).toHaveAttribute("src", "blob:http://localhost/3");
  });

  it("should show loading spinner for uploading images", () => {
    const images = [
      createMockImage({ isUploading: true }),
    ];

    const { container } = render(
      <ComposerImageStrip {...defaultProps} images={images} />,
    );

    // The Loader2 icon should be rendered with animate-spin class
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).not.toBeNull();
  });

  it("should not show loading spinner for non-uploading images", () => {
    const images = [
      createMockImage({ isUploading: false }),
    ];

    const { container } = render(
      <ComposerImageStrip {...defaultProps} images={images} />,
    );

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeNull();
  });

  it("should show error indicator for failed images", () => {
    const images = [
      createMockImage({ error: "Upload failed" }),
    ];

    const { container } = render(
      <ComposerImageStrip {...defaultProps} images={images} />,
    );

    // Error overlay should have bg-red-500/30 class
    const errorOverlay = container.querySelector(".bg-red-500\\/30");
    expect(errorOverlay).not.toBeNull();

    // Should contain the "!" indicator
    expect(screen.getByText("!")).toBeDefined();
  });

  it("should not show error indicator for non-error images", () => {
    const images = [
      createMockImage({ error: undefined }),
    ];

    const { container } = render(
      <ComposerImageStrip {...defaultProps} images={images} />,
    );

    const errorOverlay = container.querySelector(".bg-red-500\\/30");
    expect(errorOverlay).toBeNull();
  });

  it("should call onRemove with correct id when remove button is clicked", () => {
    const onRemove = vi.fn();
    const images = [
      createMockImage({ id: "img-abc" }),
      createMockImage({ id: "img-def" }),
    ];

    render(
      <ComposerImageStrip
        {...defaultProps}
        images={images}
        onRemove={onRemove}
      />,
    );

    const removeButtons = screen.getAllByLabelText("Remove image");
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[1]!);
    expect(onRemove).toHaveBeenCalledWith("img-def");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("should show add button when under maxImages", () => {
    const images = [createMockImage()];

    render(
      <ComposerImageStrip
        {...defaultProps}
        images={images}
        maxImages={4}
      />,
    );

    const addButton = screen.getByLabelText("Add image");
    expect(addButton).toBeDefined();
  });

  it("should hide add button when at maxImages", () => {
    const images = [
      createMockImage({ id: "1" }),
      createMockImage({ id: "2" }),
    ];

    render(
      <ComposerImageStrip
        {...defaultProps}
        images={images}
        maxImages={2}
      />,
    );

    expect(screen.queryByLabelText("Add image")).toBeNull();
  });

  it("should call onAddClick when add button is clicked", () => {
    const onAddClick = vi.fn();
    const images = [createMockImage()];

    render(
      <ComposerImageStrip
        {...defaultProps}
        images={images}
        onAddClick={onAddClick}
      />,
    );

    fireEvent.click(screen.getByLabelText("Add image"));
    expect(onAddClick).toHaveBeenCalledTimes(1);
  });
});
