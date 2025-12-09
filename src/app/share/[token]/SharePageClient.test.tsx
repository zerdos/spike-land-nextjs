import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SharePageClient } from "./SharePageClient";

vi.mock("@/components/enhance/ImageComparisonSlider", () => ({
  ImageComparisonSlider: ({
    originalUrl,
    enhancedUrl,
    originalLabel,
    enhancedLabel,
    width,
    height,
  }: {
    originalUrl: string;
    enhancedUrl: string;
    originalLabel: string;
    enhancedLabel: string;
    width: number;
    height: number;
  }) => (
    <div data-testid="image-comparison-slider">
      <span data-testid="slider-original-url">{originalUrl}</span>
      <span data-testid="slider-enhanced-url">{enhancedUrl}</span>
      <span data-testid="slider-original-label">{originalLabel}</span>
      <span data-testid="slider-enhanced-label">{enhancedLabel}</span>
      <span data-testid="slider-width">{width}</span>
      <span data-testid="slider-height">{height}</span>
    </div>
  ),
}));

const defaultProps = {
  imageName: "Beautiful Sunset",
  description: "A stunning sunset over the mountains",
  originalUrl: "https://example.com/original.jpg",
  enhancedUrl: "https://example.com/enhanced.jpg",
  originalWidth: 1920,
  originalHeight: 1080,
  enhancedWidth: 3840,
  enhancedHeight: 2160,
  tier: "TIER_4K",
  shareToken: "test-share-token",
};

describe("SharePageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("renders the image name as title", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Beautiful Sunset" }),
    ).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(
      screen.getByText("A stunning sunset over the mountains"),
    ).toBeInTheDocument();
  });

  it("does not render description when null", () => {
    render(<SharePageClient {...defaultProps} description={null} />);

    expect(
      screen.queryByText("A stunning sunset over the mountains"),
    ).not.toBeInTheDocument();
  });

  it("renders the tier badge", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(screen.getByText("4K")).toBeInTheDocument();
  });

  it("renders different tier badges correctly", () => {
    const { rerender } = render(<SharePageClient {...defaultProps} tier="TIER_1K" />);
    expect(screen.getByText("1K")).toBeInTheDocument();

    rerender(<SharePageClient {...defaultProps} tier="TIER_2K" />);
    expect(screen.getByText("2K")).toBeInTheDocument();
  });

  it("renders the ImageComparisonSlider with correct props", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(screen.getByTestId("image-comparison-slider")).toBeInTheDocument();
    expect(screen.getByTestId("slider-original-url")).toHaveTextContent(
      "https://example.com/original.jpg",
    );
    expect(screen.getByTestId("slider-enhanced-url")).toHaveTextContent(
      "https://example.com/enhanced.jpg",
    );
    expect(screen.getByTestId("slider-original-label")).toHaveTextContent(
      "Before",
    );
    expect(screen.getByTestId("slider-enhanced-label")).toHaveTextContent(
      "After",
    );
  });

  it("uses enhanced dimensions for the slider", () => {
    render(<SharePageClient {...defaultProps} />);

    expect(screen.getByTestId("slider-width")).toHaveTextContent("3840");
    expect(screen.getByTestId("slider-height")).toHaveTextContent("2160");
  });

  it("falls back to original dimensions when enhanced are null", () => {
    render(
      <SharePageClient
        {...defaultProps}
        enhancedWidth={null}
        enhancedHeight={null}
      />,
    );

    expect(screen.getByTestId("slider-width")).toHaveTextContent("1920");
    expect(screen.getByTestId("slider-height")).toHaveTextContent("1080");
  });

  it("renders download original button", () => {
    render(<SharePageClient {...defaultProps} />);

    const downloadOriginal = screen.getByRole("button", {
      name: /download original/i,
    });
    expect(downloadOriginal).toBeInTheDocument();
  });

  it("renders download enhanced button", () => {
    render(<SharePageClient {...defaultProps} />);

    const downloadEnhanced = screen.getByRole("button", {
      name: /download enhanced/i,
    });
    expect(downloadEnhanced).toBeInTheDocument();
  });

  it("calls download API when download original is clicked", async () => {
    const mockBlob = new Blob(["image-data"], { type: "image/jpeg" });
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
      headers: new Headers({
        "Content-Disposition": 'attachment; filename="test.jpg"',
      }),
    } as Response);

    render(<SharePageClient {...defaultProps} />);

    const downloadOriginal = screen.getByRole("button", {
      name: /download original/i,
    });
    fireEvent.click(downloadOriginal);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/share/test-share-token/download?type=original",
      );
    });
  });

  it("calls download API when download enhanced is clicked", async () => {
    const mockBlob = new Blob(["image-data"], { type: "image/jpeg" });
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
      headers: new Headers({
        "Content-Disposition": 'attachment; filename="test.jpg"',
      }),
    } as Response);

    render(<SharePageClient {...defaultProps} />);

    const downloadEnhanced = screen.getByRole("button", {
      name: /download enhanced/i,
    });
    fireEvent.click(downloadEnhanced);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/share/test-share-token/download?type=enhanced",
      );
    });
  });

  it("renders the header with Pixel branding", () => {
    const { container } = render(<SharePageClient {...defaultProps} />);

    // Get the link within the header specifically
    const header = container.querySelector("header");
    const headerLink = header?.querySelector("a");
    expect(headerLink).toBeInTheDocument();
    expect(headerLink).toHaveAttribute("href", "/");
    expect(headerLink?.textContent).toContain("pixel");
  });

  it("has dark background styling", () => {
    const { container } = render(<SharePageClient {...defaultProps} />);

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).toContain("bg-neutral-950");
  });

  it("sets max width based on enhanced dimensions", () => {
    const { container } = render(<SharePageClient {...defaultProps} />);

    const mainContent = container.querySelector("main > div");
    expect(mainContent).toHaveStyle({ maxWidth: "min(3840px, 90vw)" });
  });

  it("renders the footer with CTA link", () => {
    render(<SharePageClient {...defaultProps} />);

    const footerLink = screen.getByRole("link", { name: /enhanced with pixel/i });
    expect(footerLink).toBeInTheDocument();
    expect(footerLink).toHaveAttribute("href", "/");
  });

  it("handles download error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
    } as Response);

    render(<SharePageClient {...defaultProps} />);

    const downloadOriginal = screen.getByRole("button", {
      name: /download original/i,
    });
    fireEvent.click(downloadOriginal);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Download failed:", expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it("shows loading state while downloading", async () => {
    let resolvePromise: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(global.fetch).mockReturnValue(fetchPromise);

    render(<SharePageClient {...defaultProps} />);

    const downloadOriginal = screen.getByRole("button", {
      name: /download original/i,
    });
    fireEvent.click(downloadOriginal);

    // Button should be disabled during download
    expect(downloadOriginal).toBeDisabled();

    // Resolve the fetch
    const mockBlob = new Blob(["image-data"], { type: "image/jpeg" });
    resolvePromise!({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
      headers: new Headers(),
    } as Response);

    await waitFor(() => {
      expect(downloadOriginal).not.toBeDisabled();
    });
  });
});
