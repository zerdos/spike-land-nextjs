import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageSelectorDialog } from "./ImageSelectorDialog";

// Mock fetch
const fetchSpy = vi.spyOn(global, "fetch");

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

describe("ImageSelectorDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSelect: vi.fn(),
  };

  const mockImages = {
    images: [
      {
        id: "1",
        name: "Test Image 1",
        url: "https://example.com/image1.jpg",
        width: 100,
        height: 100,
        hasEnhancement: false,
      },
      {
        id: "2",
        name: "Test Image 2",
        url: "https://example.com/image2.jpg",
        width: 100,
        height: 100,
        hasEnhancement: false,
      },
    ],
    hasMore: false,
    nextCursor: null,
  };

  beforeEach(() => {
    fetchSpy.mockReset();
    defaultProps.onOpenChange.mockReset();
    defaultProps.onSelect.mockReset();
  });

  it("fetches and displays images when opened", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockImages,
    } as Response);

    render(<ImageSelectorDialog {...defaultProps} />);

    expect(screen.getByText("Select Image")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/api/images"));
    });

    await waitFor(() => {
      expect(screen.getByAltText("Test Image 1")).toBeInTheDocument();
      expect(screen.getByAltText("Test Image 2")).toBeInTheDocument();
    });
  });

  it("handles loading state", async () => {
    // Delay the response to check loading state
    fetchSpy.mockImplementationOnce(() =>
      new Promise(resolve =>
        setTimeout(() =>
          resolve({
            ok: true,
            json: async () => mockImages,
          } as Response), 100)
      )
    );

    render(<ImageSelectorDialog {...defaultProps} />);

    // Since loading state happens immediately on mount when open=true, and fetch is async
    // We should be able to see a loader if the component renders it.
    // However, depending on how fast render happens, it might be tricky.
    // The component sets isLoading(true) then calls fetch.

    // We can look for the Loader2 icon which usually has a specific class or we can assume there's text/spinner
    // Looking at the code: <Loader2 className="..." /> inside a div.
    // It doesn't have specific text.
    // Let's rely on finding something that indicates loading or just wait for images.
    // But to test loading state specifically, we might need to check for the absence of images initially.

    expect(screen.queryByAltText("Test Image 1")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByAltText("Test Image 1")).toBeInTheDocument();
    });
  });

  it("handles error state", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
    } as Response);

    render(<ImageSelectorDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load images. Please try again.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    });
  });

  it("handles empty state", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [], hasMore: false, nextCursor: null }),
    } as Response);

    render(<ImageSelectorDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("No images found")).toBeInTheDocument();
      expect(screen.getByText("Upload some images to your gallery first")).toBeInTheDocument();
    });
  });

  it("loads more images when 'Load More' is clicked", async () => {
    const firstPage = {
      images: [mockImages.images[0]],
      hasMore: true,
      nextCursor: "cursor-123",
    };

    const secondPage = {
      images: [mockImages.images[1]],
      hasMore: false,
      nextCursor: null,
    };

    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => firstPage,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => secondPage,
      } as Response);

    render(<ImageSelectorDialog {...defaultProps} />);

    // Wait for first page
    await waitFor(() => {
      expect(screen.getByAltText("Test Image 1")).toBeInTheDocument();
    });

    const loadMoreButton = screen.getByRole("button", { name: "Load More" });
    fireEvent.click(loadMoreButton);

    // Check fetch call for second page
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("cursor=cursor-123"));
    });

    // Wait for second page
    await waitFor(() => {
      expect(screen.getByAltText("Test Image 2")).toBeInTheDocument();
    });
  });

  it("selects an image when clicked", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockImages,
    } as Response);

    render(<ImageSelectorDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByAltText("Test Image 1")).toBeInTheDocument();
    });

    // Find the button wrapping the image
    const imageButton = screen.getByAltText("Test Image 1").closest("button");
    expect(imageButton).toBeInTheDocument();

    fireEvent.click(imageButton!);

    expect(defaultProps.onSelect).toHaveBeenCalledWith({
      type: "gallery",
      id: "1",
      url: "https://example.com/image1.jpg",
      name: "Test Image 1",
      width: 100,
      height: 100,
    });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("excludes specified image ID", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockImages,
    } as Response);

    render(<ImageSelectorDialog {...defaultProps} excludeImageId="1" />);

    await waitFor(() => {
      expect(screen.queryByAltText("Test Image 1")).not.toBeInTheDocument();
      expect(screen.getByAltText("Test Image 2")).toBeInTheDocument();
    });
  });

  it("doesn't fetch when dialog is closed", () => {
    render(<ImageSelectorDialog {...defaultProps} open={false} />);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resets state when dialog closes and reopens", async () => {
    // First open
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockImages,
    } as Response);

    const { rerender } = render(<ImageSelectorDialog {...defaultProps} />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // Close
    rerender(<ImageSelectorDialog {...defaultProps} open={false} />);

    // Reopen
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockImages,
    } as Response);

    rerender(<ImageSelectorDialog {...defaultProps} open={true} />);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
