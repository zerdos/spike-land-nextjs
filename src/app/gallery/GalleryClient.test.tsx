import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GalleryClient } from "./GalleryClient";

// Mock fetch
global.fetch = vi.fn();

// Mock GalleryFilters and GalleryGrid to avoid rendering children complexities
vi.mock("@/components/gallery/GalleryFilters", () => ({
  GalleryFilters: ({ onToggleTag, onClear, tags, activeTags }: any) => (
    <div data-testid="gallery-filters">
      <button onClick={onClear}>Clear</button>
      {tags.map((tag: string) => (
        <button key={tag} onClick={() => onToggleTag(tag)}>
          {tag}
        </button>
      ))}
      <div data-testid="active-tags">{activeTags.join(",")}</div>
    </div>
  ),
}));

vi.mock("@/components/gallery/GalleryGrid", () => ({
  GalleryGrid: ({ images }: any) => (
    <div data-testid="gallery-grid">
      {images.map((img: any) => (
        <div key={img.id}>{img.prompt}</div>
      ))}
    </div>
  ),
}));

describe("GalleryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch and render images on mount", async () => {
    const mockImages = [
      { id: "1", prompt: "Image 1", tags: ["tag1"] },
      { id: "2", prompt: "Image 2", tags: ["tag2"] },
    ];
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        items: mockImages,
        pagination: { page: 1, totalPages: 1 },
      }),
    });

    render(<GalleryClient />);

    await waitFor(() => {
      expect(screen.getByTestId("gallery-grid")).toBeInTheDocument();
    });

    expect(screen.getByText("Image 1")).toBeInTheDocument();
    expect(screen.getByText("Image 2")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/gallery/public?page=1"));
  });

  it("should handle filters", async () => {
     const mockImages = [
      { id: "1", prompt: "Image 1", tags: ["tag1"] },
    ];
    (global.fetch as any).mockResolvedValue({
      json: async () => ({
        items: mockImages,
        pagination: { page: 1, totalPages: 1 },
      }),
    });

    render(<GalleryClient />);

    await waitFor(() => {
      expect(screen.getByTestId("gallery-filters")).toBeInTheDocument();
    });

    // Toggle tag
    const tagBtn = screen.getByText("tag1");
    fireEvent.click(tagBtn);

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("tags=tag1"));
    });
  });
});
