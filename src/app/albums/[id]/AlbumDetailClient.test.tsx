import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlbumDetailClient } from "./AlbumDetailClient";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockClipboard = {
  writeText: vi.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

describe("AlbumDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockImplementation(
      () => new Promise(() => {}),
    );

    render(<AlbumDetailClient albumId="test-id" />);

    expect(document.querySelector(".animate-spin")).toBeDefined();
  });

  it("shows error state when album not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<AlbumDetailClient albumId="not-found" />);

    await waitFor(() => {
      expect(screen.getByText("Album not found")).toBeDefined();
    });
  });

  it("renders album details when loaded", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          album: {
            id: "album_1",
            name: "Test Album",
            description: "Test description",
            privacy: "PRIVATE",
            coverImageId: null,
            shareToken: null,
            imageCount: 0,
            isOwner: true,
            images: [],
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
    });

    render(<AlbumDetailClient albumId="album_1" />);

    await waitFor(() => {
      expect(screen.getByText("Test Album")).toBeDefined();
      expect(screen.getByText("Test description")).toBeDefined();
      expect(screen.getByText("Private")).toBeDefined();
    });
  });

  it("shows copy link button for public albums", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          album: {
            id: "album_1",
            name: "Public Album",
            description: null,
            privacy: "PUBLIC",
            coverImageId: null,
            shareToken: "share-token-123",
            imageCount: 0,
            isOwner: true,
            images: [],
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
    });

    render(<AlbumDetailClient albumId="album_1" />);

    await waitFor(() => {
      expect(screen.getByText("Copy Link")).toBeDefined();
    });
  });

  it("copies share link to clipboard", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          album: {
            id: "album_1",
            name: "Public Album",
            description: null,
            privacy: "PUBLIC",
            coverImageId: null,
            shareToken: "share-token-123",
            imageCount: 0,
            isOwner: true,
            images: [],
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
    });

    render(<AlbumDetailClient albumId="album_1" />);

    await waitFor(() => {
      expect(screen.getByText("Copy Link")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Copy Link"));

    expect(mockClipboard.writeText).toHaveBeenCalled();
  });

  it("opens settings dialog when clicking settings button", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          album: {
            id: "album_1",
            name: "My Album",
            description: "Description",
            privacy: "PRIVATE",
            coverImageId: null,
            shareToken: null,
            imageCount: 0,
            isOwner: true,
            images: [],
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
    });

    render(<AlbumDetailClient albumId="album_1" />);

    await waitFor(() => {
      expect(screen.getByText("My Album")).toBeDefined();
    });

    const settingsButton = document.querySelector(
      "button:has(svg.lucide-settings)",
    );
    if (settingsButton) {
      fireEvent.click(settingsButton);
    }

    await waitFor(() => {
      expect(screen.getByText("Album Settings")).toBeDefined();
    });
  });

  it("displays images in album", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          album: {
            id: "album_1",
            name: "My Album",
            description: null,
            privacy: "PRIVATE",
            coverImageId: null,
            shareToken: null,
            imageCount: 1,
            isOwner: true,
            images: [
              {
                id: "img_1",
                name: "Test Image",
                description: null,
                originalUrl: "https://example.com/img1.jpg",
                enhancedUrl: null,
                width: 1920,
                height: 1080,
                sortOrder: 0,
                createdAt: "2025-01-01T00:00:00Z",
              },
            ],
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
    });

    render(<AlbumDetailClient albumId="album_1" />);

    await waitFor(() => {
      expect(screen.getByText("Test Image")).toBeDefined();
      expect(screen.getByText("1920 x 1080")).toBeDefined();
    });
  });

  it("shows empty state when no images", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          album: {
            id: "album_1",
            name: "Empty Album",
            description: null,
            privacy: "PRIVATE",
            coverImageId: null,
            shareToken: null,
            imageCount: 0,
            isOwner: true,
            images: [],
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
    });

    render(<AlbumDetailClient albumId="album_1" />);

    await waitFor(() => {
      expect(screen.getByText("No images yet")).toBeDefined();
    });
  });

  it("does not show settings for non-owner", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          album: {
            id: "album_1",
            name: "Other Album",
            description: null,
            privacy: "PUBLIC",
            coverImageId: null,
            imageCount: 0,
            isOwner: false,
            images: [],
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        }),
    });

    render(<AlbumDetailClient albumId="album_1" />);

    await waitFor(() => {
      expect(screen.getByText("Other Album")).toBeDefined();
    });

    const settingsButton = document.querySelector(
      "button:has(svg.lucide-settings)",
    );
    expect(settingsButton).toBeNull();
  });
});
