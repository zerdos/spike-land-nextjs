import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SideBySideComparison } from "./SideBySideComparison";

vi.mock("next/image", () => ({
  default: (
    { src, alt, onError, ...props }: {
      src: string;
      alt: string;
      onError?: () => void;
      [key: string]: unknown;
    },
  ) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Mock component for testing
      <img
        src={src}
        alt={alt}
        onError={onError}
        data-testid={props["data-testid"] || "mock-image"}
        {...props}
      />
    );
  },
}));

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as unknown as typeof fetch;

describe("SideBySideComparison Component", () => {
  const defaultProps = {
    originalUrl: "https://example.com/original.jpg",
    enhancedUrl: "https://example.com/enhanced.jpg",
  };

  it("should render both original and enhanced images", () => {
    render(<SideBySideComparison {...defaultProps} />);

    expect(screen.getByAltText("Original")).toBeInTheDocument();
    expect(screen.getByAltText("Enhanced")).toBeInTheDocument();
  });

  it("should render with custom labels", () => {
    render(
      <SideBySideComparison
        {...defaultProps}
        originalLabel="Before"
        enhancedLabel="After"
      />,
    );

    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("should render with default labels", () => {
    render(<SideBySideComparison {...defaultProps} />);

    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("Enhanced")).toBeInTheDocument();
  });

  it("should use custom width and height for aspect ratio", () => {
    const { container } = render(
      <SideBySideComparison
        {...defaultProps}
        width={1920}
        height={1080}
      />,
    );

    const imageContainers = container.querySelectorAll('[style*="aspect-ratio"]');
    expect(imageContainers.length).toBeGreaterThan(0);
    imageContainers.forEach((container) => {
      expect(container).toHaveStyle({ aspectRatio: "1920 / 1080" });
    });
  });

  it("should use default aspect ratio when width/height not provided", () => {
    const { container } = render(<SideBySideComparison {...defaultProps} />);

    const imageContainers = container.querySelectorAll('[style*="aspect-ratio"]');
    expect(imageContainers.length).toBeGreaterThan(0);
    imageContainers.forEach((container) => {
      expect(container).toHaveStyle({ aspectRatio: "16 / 9" });
    });
  });

  it("should handle invalid width/height with safe defaults", () => {
    const { container } = render(
      <SideBySideComparison
        {...defaultProps}
        width={0}
        height={0}
      />,
    );

    const imageContainers = container.querySelectorAll('[style*="aspect-ratio"]');
    expect(imageContainers.length).toBeGreaterThan(0);
    imageContainers.forEach((container) => {
      expect(container).toHaveStyle({ aspectRatio: "16 / 9" });
    });
  });

  it("should display error message when original image fails to load", async () => {
    render(<SideBySideComparison {...defaultProps} />);

    const originalImage = screen.getByAltText("Original");
    originalImage.dispatchEvent(new Event("error"));

    expect(await screen.findByText("Original image failed to load")).toBeInTheDocument();
  });

  it("should display error message when enhanced image fails to load", async () => {
    render(<SideBySideComparison {...defaultProps} />);

    const enhancedImage = screen.getByAltText("Enhanced");
    enhancedImage.dispatchEvent(new Event("error"));

    expect(await screen.findByText("Enhanced image failed to load")).toBeInTheDocument();
  });

  it("should log broken images to server when error occurs", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<SideBySideComparison {...defaultProps} />);

    const originalImage = screen.getByAltText("Original");
    originalImage.dispatchEvent(new Event("error"));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Original Image Load Error]"),
    );

    consoleSpy.mockRestore();
  });

  it("should render images in a grid layout", () => {
    const { container } = render(<SideBySideComparison {...defaultProps} />);

    const gridContainer = container.querySelector(".grid");
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass("grid-cols-1", "md:grid-cols-2");
  });
});
