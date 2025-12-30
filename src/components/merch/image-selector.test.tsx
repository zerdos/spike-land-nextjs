/**
 * Tests for ImageSelector component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageSelector } from "./image-selector";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:test");
global.URL.revokeObjectURL = vi.fn();

describe("ImageSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ images: [] }),
    });
  });

  it("should render trigger button", () => {
    render(
      <ImageSelector
        minWidth={1024}
        minHeight={1024}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText("Select an image")).toBeInTheDocument();
  });

  it("should display minimum size requirements", () => {
    render(
      <ImageSelector
        minWidth={1024}
        minHeight={1024}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Min. 1024x1024px")).toBeInTheDocument();
  });

  it("should display selected image info", () => {
    render(
      <ImageSelector
        minWidth={1024}
        minHeight={1024}
        onSelect={vi.fn()}
        selectedImage={{
          type: "enhanced",
          imageId: "img_123",
          imageUrl: "https://example.com/image.jpg",
          width: 2048,
          height: 2048,
        }}
      />,
    );

    expect(screen.getByText("Image selected")).toBeInTheDocument();
    expect(screen.getByText("2048x2048px")).toBeInTheDocument();
  });

  it("should open dialog on button click", async () => {
    render(
      <ImageSelector
        minWidth={1024}
        minHeight={1024}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Choose Your Image")).toBeInTheDocument();
    });
  });

  it("should fetch images when dialog opens", async () => {
    render(
      <ImageSelector
        minWidth={1024}
        minHeight={1024}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/images?limit=50");
    });
  });

  it("should display images that meet size requirements", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          images: [
            {
              id: "img_1",
              name: "Test Image",
              originalUrl: "https://example.com/1.jpg",
              originalWidth: 2048,
              originalHeight: 2048,
            },
            {
              id: "img_2",
              name: "Small Image",
              originalUrl: "https://example.com/2.jpg",
              originalWidth: 512,
              originalHeight: 512,
            },
          ],
        }),
    });

    render(
      <ImageSelector
        minWidth={1024}
        minHeight={1024}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      // Only the large image should be displayed (the small one is filtered)
      expect(screen.getByAltText("Test Image")).toBeInTheDocument();
    });
  });

  it("should show empty state when no images meet requirements", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          images: [
            {
              id: "img_1",
              name: "Small Image",
              originalUrl: "https://example.com/1.jpg",
              originalWidth: 512,
              originalHeight: 512,
            },
          ],
        }),
    });

    render(
      <ImageSelector
        minWidth={1024}
        minHeight={1024}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(
        screen.getByText("No images found that meet the size requirements"),
      ).toBeInTheDocument();
    });
  });

  it("should have tabs for My Images and Upload New", async () => {
    render(
      <ImageSelector
        minWidth={1024}
        minHeight={1024}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("My Images")).toBeInTheDocument();
      expect(screen.getByText("Upload New")).toBeInTheDocument();
    });
  });

  it("should switch to upload tab when clicking Upload a new image", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ images: [] }),
    });

    render(
      <ImageSelector
        minWidth={1024}
        minHeight={1024}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(
        screen.getByText("No images found that meet the size requirements"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Upload a new image"));

    await waitFor(() => {
      expect(screen.getByText("Click to upload")).toBeInTheDocument();
    });
  });

  it("should call onSelect when image is clicked", async () => {
    const onSelect = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          images: [
            {
              id: "img_1",
              name: "Test Image",
              originalUrl: "https://example.com/1.jpg",
              originalWidth: 2048,
              originalHeight: 2048,
            },
          ],
        }),
    });

    render(
      <ImageSelector
        minWidth={1024}
        minHeight={1024}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByAltText("Test Image")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByAltText("Test Image"));

    expect(onSelect).toHaveBeenCalledWith({
      type: "enhanced",
      imageId: "img_1",
      imageUrl: "https://example.com/1.jpg",
      width: 2048,
      height: 2048,
    });
  });

  it("should have upload tab available", async () => {
    render(
      <ImageSelector
        minWidth={1024}
        minHeight={1024}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "My Images" }))
        .toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Upload New" }))
        .toBeInTheDocument();
    });
  });
});
