import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeforeAfterPeek, type BeforeAfterPeekProps } from "./BeforeAfterPeek";

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
  ANIMATION_DURATIONS: {
    heroExpand: 400,
    heroCollapse: 400,
    gridFade: 300,
    thumbnailSwap: 200,
    peekTransition: 150,
  },
}));

describe("BeforeAfterPeek", () => {
  const defaultProps: BeforeAfterPeekProps = {
    originalUrl: "https://example.com/original.jpg",
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset matchMedia to default
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  describe("Rendering", () => {
    it("renders the peek container", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const container = screen.getByTestId("before-after-peek");
      expect(container).toBeInTheDocument();
    });

    it("renders the original image", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const image = screen.getByTestId("before-after-peek-image");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", defaultProps.originalUrl);
      expect(image).toHaveAttribute("alt", "Original image");
    });

    it("renders the label badge", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const label = screen.getByTestId("before-after-peek-label");
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent("Original");
    });

    it("renders custom label when provided", () => {
      render(<BeforeAfterPeek {...defaultProps} label="Before" />);

      const label = screen.getByTestId("before-after-peek-label");
      expect(label).toHaveTextContent("Before");
    });
  });

  describe("Visibility states", () => {
    it("shows overlay when active", () => {
      render(<BeforeAfterPeek {...defaultProps} isActive={true} />);

      const container = screen.getByTestId("before-after-peek");
      expect(container).toHaveClass("opacity-100");
      expect(container).not.toHaveClass("pointer-events-none");
    });

    it("hides overlay when not active", () => {
      render(<BeforeAfterPeek {...defaultProps} isActive={false} />);

      const container = screen.getByTestId("before-after-peek");
      expect(container).toHaveClass("opacity-0");
      expect(container).toHaveClass("pointer-events-none");
    });

    it("sets aria-hidden to false when active", () => {
      render(<BeforeAfterPeek {...defaultProps} isActive={true} />);

      const container = screen.getByTestId("before-after-peek");
      expect(container).toHaveAttribute("aria-hidden", "false");
    });

    it("sets aria-hidden to true when not active", () => {
      render(<BeforeAfterPeek {...defaultProps} isActive={false} />);

      const container = screen.getByTestId("before-after-peek");
      expect(container).toHaveAttribute("aria-hidden", "true");
    });

    it("shows label when active", () => {
      render(<BeforeAfterPeek {...defaultProps} isActive={true} />);

      const label = screen.getByTestId("before-after-peek-label");
      expect(label).toHaveClass("opacity-100");
    });

    it("hides label when not active", () => {
      render(<BeforeAfterPeek {...defaultProps} isActive={false} />);

      const label = screen.getByTestId("before-after-peek-label");
      expect(label).toHaveClass("opacity-0");
    });
  });

  describe("Transition duration", () => {
    it("applies peek transition duration to container", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const container = screen.getByTestId("before-after-peek");
      expect(container).toHaveStyle({ transitionDuration: "150ms" });
    });

    it("applies peek transition duration to label", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const label = screen.getByTestId("before-after-peek-label");
      expect(label).toHaveStyle({ transitionDuration: "150ms" });
    });

    it("sets transition duration to 0 when reduced motion is preferred", () => {
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

      render(<BeforeAfterPeek {...defaultProps} />);

      const container = screen.getByTestId("before-after-peek");
      expect(container).toHaveStyle({ transitionDuration: "0ms" });
    });
  });

  describe("Image properties", () => {
    it("image has fill attribute", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const image = screen.getByTestId("before-after-peek-image");
      expect(image).toHaveAttribute("data-fill", "true");
    });

    it("image has object-contain class", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const image = screen.getByTestId("before-after-peek-image");
      expect(image).toHaveClass("object-contain");
    });

    it("image has priority when active", () => {
      render(<BeforeAfterPeek {...defaultProps} isActive={true} />);

      const image = screen.getByTestId("before-after-peek-image");
      expect(image).toHaveAttribute("data-priority", "true");
    });

    it("image does not have priority when not active", () => {
      render(<BeforeAfterPeek {...defaultProps} isActive={false} />);

      const image = screen.getByTestId("before-after-peek-image");
      expect(image).toHaveAttribute("data-priority", "false");
    });

    it("image has 100vw sizes", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const image = screen.getByTestId("before-after-peek-image");
      expect(image).toHaveAttribute("data-sizes", "100vw");
    });
  });

  describe("Styling", () => {
    it("container has absolute positioning", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const container = screen.getByTestId("before-after-peek");
      expect(container).toHaveClass("absolute");
      expect(container).toHaveClass("inset-0");
    });

    it("container has z-10 for stacking", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const container = screen.getByTestId("before-after-peek");
      expect(container).toHaveClass("z-10");
    });

    it("label has correct positioning", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const label = screen.getByTestId("before-after-peek-label");
      expect(label).toHaveClass("absolute");
      expect(label).toHaveClass("top-4");
      expect(label).toHaveClass("left-4");
    });

    it("label has correct background styling", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const label = screen.getByTestId("before-after-peek-label");
      expect(label).toHaveClass("bg-black/60");
      expect(label).toHaveClass("backdrop-blur-sm");
    });

    it("label has correct text styling", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const label = screen.getByTestId("before-after-peek-label");
      expect(label).toHaveClass("text-white/90");
      expect(label).toHaveClass("text-sm");
      expect(label).toHaveClass("font-medium");
    });

    it("label has correct shape and padding", () => {
      render(<BeforeAfterPeek {...defaultProps} />);

      const label = screen.getByTestId("before-after-peek-label");
      expect(label).toHaveClass("rounded-full");
      expect(label).toHaveClass("px-4");
      expect(label).toHaveClass("py-1.5");
    });
  });

  describe("Different URL values", () => {
    it("renders different original URLs correctly", () => {
      const urls = [
        "https://example.com/image1.jpg",
        "https://cdn.example.com/photos/original/12345.png",
        "/api/images/original?id=abc",
      ];

      urls.forEach((url) => {
        const { unmount } = render(
          <BeforeAfterPeek originalUrl={url} isActive={true} />,
        );
        const image = screen.getByTestId("before-after-peek-image");
        expect(image).toHaveAttribute("src", url);
        unmount();
      });
    });
  });

  describe("Different label values", () => {
    it("renders different labels correctly", () => {
      const labels = ["Original", "Before", "Unenhanced", "Raw"];

      labels.forEach((label) => {
        const { unmount } = render(
          <BeforeAfterPeek {...defaultProps} label={label} />,
        );
        expect(screen.getByTestId("before-after-peek-label")).toHaveTextContent(
          label,
        );
        unmount();
      });
    });

    it("uses default label when not provided", () => {
      render(
        <BeforeAfterPeek
          originalUrl={defaultProps.originalUrl}
          isActive={true}
        />,
      );

      expect(screen.getByTestId("before-after-peek-label")).toHaveTextContent(
        "Original",
      );
    });
  });

  describe("Edge cases", () => {
    it("handles empty label", () => {
      render(<BeforeAfterPeek {...defaultProps} label="" />);

      const label = screen.getByTestId("before-after-peek-label");
      expect(label).toHaveTextContent("");
    });

    it("handles very long label", () => {
      const longLabel = "This is a very long label text";
      render(<BeforeAfterPeek {...defaultProps} label={longLabel} />);

      const label = screen.getByTestId("before-after-peek-label");
      expect(label).toHaveTextContent(longLabel);
    });

    it("handles special characters in URL", () => {
      const specialUrl = "https://example.com/image.jpg?size=large&format=jpeg";
      render(<BeforeAfterPeek originalUrl={specialUrl} isActive={true} />);

      const image = screen.getByTestId("before-after-peek-image");
      expect(image).toHaveAttribute("src", specialUrl);
    });
  });
});
