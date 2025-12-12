import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlbumDetailClient } from "./AlbumDetailClient";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/components/canvas", () => ({
  QRCodePanel: (
    { albumId, shareToken, albumName }: { albumId: string; shareToken: string; albumName: string; },
  ) => (
    <div
      data-testid="qr-panel"
      data-album-id={albumId}
      data-share-token={shareToken}
      data-album-name={albumName}
    >
      QR Panel
    </div>
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockClipboard = {
  writeText: vi.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

// Helper to setup fetch mocks for album + tokens endpoint
const setupFetchMocks = (albumResponse: unknown, tokensResponse = { balance: 100 }) => {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/tokens")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(tokensResponse),
      });
    }
    if (typeof albumResponse === "function") {
      return albumResponse();
    }
    return albumResponse;
  });
};

const createMockAlbum = (overrides = {}) => ({
  id: "album_1",
  name: "Test Album",
  description: "Test description",
  privacy: "PRIVATE" as const,
  coverImageId: null,
  shareToken: null,
  imageCount: 0,
  isOwner: true,
  images: [],
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

const createMockImage = (overrides = {}) => ({
  id: "img_1",
  name: "Test Image",
  description: null,
  originalUrl: "https://example.com/img1.jpg",
  enhancedUrl: null,
  width: 1920,
  height: 1080,
  sortOrder: 0,
  createdAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("AlbumDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading and Error States", () => {
    it("shows loading state initially", () => {
      setupFetchMocks(() => new Promise(() => {}));

      render(<AlbumDetailClient albumId="test-id" />);

      expect(document.querySelector(".animate-spin")).toBeDefined();
    });

    it("shows error state when album not found", async () => {
      setupFetchMocks({
        ok: false,
        status: 404,
      });

      render(<AlbumDetailClient albumId="not-found" />);

      await waitFor(() => {
        expect(screen.getByText("Album not found")).toBeDefined();
      });
    });

    it("shows error state when fetch fails", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/tokens")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ balance: 100 }),
          });
        }
        return Promise.reject(new Error("Network error"));
      });

      render(<AlbumDetailClient albumId="test-id" />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load album")).toBeDefined();
      });
    });
  });

  describe("Album Display", () => {
    it("renders album details when loaded", async () => {
      setupFetchMocks({
        ok: true,
        json: () => Promise.resolve({ album: createMockAlbum() }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Album")).toBeDefined();
        expect(screen.getByText("Test description")).toBeDefined();
        expect(screen.getByText("Private")).toBeDefined();
      });
    });

    it("displays images in album", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Image")).toBeDefined();
        expect(screen.getByText("1920 x 1080")).toBeDefined();
      });
    });

    it("shows empty state when no images", async () => {
      setupFetchMocks({
        ok: true,
        json: () => Promise.resolve({ album: createMockAlbum({ name: "Empty Album" }) }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("No images yet")).toBeDefined();
      });
    });

    it("shows enhanced badge for enhanced images", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [
                createMockImage({
                  enhancedUrl: "https://example.com/enhanced.jpg",
                  enhancementTier: "TIER_1K",
                }),
              ],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Enhanced")).toBeDefined();
      });
    });
  });

  describe("Privacy and Share", () => {
    it("shows copy link button for public albums", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              name: "Public Album",
              privacy: "PUBLIC",
              shareToken: "share-token-123",
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Copy Link")).toBeDefined();
      });
    });

    it("copies share link to clipboard", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              name: "Public Album",
              privacy: "PUBLIC",
              shareToken: "share-token-123",
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Copy Link")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Copy Link"));

      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    it("does not show copy link for private albums", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              privacy: "PRIVATE",
              shareToken: null,
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Album")).toBeDefined();
      });

      expect(screen.queryByText("Copy Link")).toBeNull();
    });
  });

  describe("Settings Dialog", () => {
    it("opens settings dialog when clicking settings button", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({ name: "My Album", description: "Description" }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("My Album")).toBeDefined();
      });

      const settingsButton = document.querySelector("button:has(svg.lucide-settings)");
      if (settingsButton) {
        fireEvent.click(settingsButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Album Settings")).toBeDefined();
      });
    });

    it("does not show settings for non-owner", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              name: "Other Album",
              privacy: "PUBLIC",
              isOwner: false,
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Other Album")).toBeDefined();
      });

      const settingsButton = document.querySelector("button:has(svg.lucide-settings)");
      expect(settingsButton).toBeNull();
    });
  });

  describe("Selection Mode", () => {
    it("shows select button when album has images and is owner", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Select")).toBeDefined();
      });
    });

    it("does not show select button when not owner", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
              isOwner: false,
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Image")).toBeDefined();
      });

      expect(screen.queryByText("Select")).toBeNull();
    });

    it("enters selection mode when clicking select button", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Select")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select"));

      await waitFor(() => {
        expect(screen.getByText("Select All")).toBeDefined();
        expect(screen.getByText("Cancel")).toBeDefined();
      });
    });

    it("exits selection mode when clicking cancel", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Select")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select"));

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.getByText("Select")).toBeDefined();
      });
    });

    it("shows select all and deselect all buttons in selection mode", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 2,
              images: [createMockImage(), createMockImage({ id: "img_2", name: "Image 2" })],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Select")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select"));

      await waitFor(() => {
        expect(screen.getByText("Select All")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select All"));

      await waitFor(() => {
        expect(screen.getByText("Deselect All")).toBeDefined();
      });
    });

    it("shows move and remove buttons when images are selected", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Select")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select"));

      await waitFor(() => {
        expect(screen.getByText("Select All")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select All"));

      await waitFor(() => {
        expect(screen.getByText(/Move/)).toBeDefined();
        expect(screen.getByText(/Remove/)).toBeDefined();
      });
    });

    it("removes selected images when clicking remove button", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Select")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select"));

      await waitFor(() => {
        expect(screen.getByText("Select All")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select All"));

      await waitFor(() => {
        expect(screen.getByText(/Remove/)).toBeDefined();
      });

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      );

      const removeButton = screen.getAllByText(/Remove/)[0];
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/albums/album_1/images",
          expect.objectContaining({
            method: "DELETE",
          }),
        );
      });

      confirmSpy.mockRestore();
    });
  });

  describe("Move Dialog", () => {
    it("opens move dialog when clicking move button", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Select")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select"));

      await waitFor(() => {
        expect(screen.getByText("Select All")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select All"));

      await waitFor(() => {
        expect(screen.getByText(/Move/)).toBeDefined();
      });

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              albums: [
                { id: "album_2", name: "Other Album", imageCount: 5 },
              ],
            }),
        })
      );

      const moveButton = screen.getAllByText(/Move/)[0];
      fireEvent.click(moveButton);

      await waitFor(() => {
        expect(screen.getByText("Move Images to Album")).toBeDefined();
      });
    });

    it("shows no albums message when no other albums exist", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Select")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select"));

      await waitFor(() => {
        expect(screen.getByText("Select All")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select All"));

      await waitFor(() => {
        expect(screen.getByText(/Move/)).toBeDefined();
      });

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              albums: [{ id: "album_1", name: "Current Album", imageCount: 1 }],
            }),
        })
      );

      const moveButton = screen.getAllByText(/Move/)[0];
      fireEvent.click(moveButton);

      await waitFor(() => {
        expect(screen.getByText(/No other albums available/)).toBeDefined();
      });
    });

    it("closes move dialog when clicking cancel", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Select")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select"));

      await waitFor(() => {
        expect(screen.getByText("Select All")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select All"));

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              albums: [
                { id: "album_2", name: "Other Album", imageCount: 5 },
              ],
            }),
        })
      );

      const moveButton = screen.getAllByText(/Move/)[0];
      fireEvent.click(moveButton);

      await waitFor(() => {
        expect(screen.getByText("Move Images to Album")).toBeDefined();
      });

      const cancelButtons = screen.getAllByText("Cancel");
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByText("Move Images to Album")).toBeNull();
      });
    });
  });

  describe("Cover Image Selection", () => {
    it("shows cover badge on cover image", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              coverImageId: "img_1",
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Cover")).toBeDefined();
      });
    });

    it("calls API to set cover when clicking star icon", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              coverImageId: null,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Image")).toBeDefined();
      });

      const card = document.querySelector(".group");
      if (card) {
        fireEvent.mouseEnter(card);
      }

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              album: { coverImageId: "img_1" },
            }),
        })
      );

      const starButton = document.querySelector('button[title="Set as cover"]');
      if (starButton) {
        fireEvent.click(starButton);
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/albums/album_1",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ coverImageId: "img_1" }),
          }),
        );
      });
    });
  });

  describe("Drag and Drop", () => {
    it("makes cards draggable when owner and not in selection mode", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 2,
              images: [
                createMockImage({ id: "img_1", sortOrder: 0 }),
                createMockImage({ id: "img_2", name: "Image 2", sortOrder: 1 }),
              ],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Image")).toBeDefined();
      });

      const cards = document.querySelectorAll('[draggable="true"]');
      expect(cards.length).toBe(2);
    });

    it("does not make cards draggable in selection mode", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 2,
              images: [
                createMockImage({ id: "img_1", sortOrder: 0 }),
                createMockImage({ id: "img_2", name: "Image 2", sortOrder: 1 }),
              ],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Select")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Select"));

      await waitFor(() => {
        expect(screen.getByText("Select All")).toBeDefined();
      });

      const cards = document.querySelectorAll('[draggable="false"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it("does not make cards draggable when not owner", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 2,
              isOwner: false,
              images: [
                createMockImage({ id: "img_1", sortOrder: 0 }),
                createMockImage({ id: "img_2", name: "Image 2", sortOrder: 1 }),
              ],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Image")).toBeDefined();
      });

      const cards = document.querySelectorAll('[draggable="false"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it("handles drag start event", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 2,
              images: [
                createMockImage({ id: "img_1", sortOrder: 0 }),
                createMockImage({ id: "img_2", name: "Image 2", sortOrder: 1 }),
              ],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Image")).toBeDefined();
      });

      const card = document.querySelector('[draggable="true"]');
      if (card) {
        const dataTransfer = { effectAllowed: "" };
        fireEvent.dragStart(card, { dataTransfer });
        expect(dataTransfer.effectAllowed).toBe("move");
      }
    });

    it("handles drag and drop to reorder images", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 2,
              images: [
                createMockImage({ id: "img_1", name: "Image 1", sortOrder: 0 }),
                createMockImage({ id: "img_2", name: "Image 2", sortOrder: 1 }),
              ],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Image 1")).toBeDefined();
      });

      const cards = document.querySelectorAll('[draggable="true"]');
      const firstCard = cards[0];
      const secondCard = cards[1];

      if (firstCard && secondCard) {
        const dataTransfer = { effectAllowed: "" };
        fireEvent.dragStart(firstCard, { dataTransfer });
        fireEvent.dragOver(secondCard, { preventDefault: () => {} });

        mockFetch.mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          })
        );

        fireEvent.drop(secondCard, { preventDefault: () => {} });
        fireEvent.dragEnd(firstCard);
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/albums/album_1/images",
          expect.objectContaining({
            method: "PATCH",
          }),
        );
      });
    });
  });

  describe("Image Removal", () => {
    it("removes single image when clicking remove button", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Image")).toBeDefined();
      });

      const card = document.querySelector(".group");
      if (card) {
        fireEvent.mouseEnter(card);
      }

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      );

      const deleteButton = document.querySelector("button.h-8.w-8:last-child");
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/albums/album_1/images",
          expect.objectContaining({
            method: "DELETE",
          }),
        );
      });

      confirmSpy.mockRestore();
    });

    it("does not remove image when confirmation is cancelled", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              imageCount: 1,
              images: [createMockImage()],
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Image")).toBeDefined();
      });

      const card = document.querySelector(".group");
      if (card) {
        fireEvent.mouseEnter(card);
      }

      const deleteButton = document.querySelector("button.h-8.w-8:last-child");
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      // Should not make a DELETE request when cancelled
      expect(mockFetch).not.toHaveBeenCalledWith(
        "/api/albums/album_1/images",
        expect.objectContaining({
          method: "DELETE",
        }),
      );

      confirmSpy.mockRestore();
    });
  });

  describe("Album Deletion", () => {
    it("deletes album and redirects when confirmed", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      setupFetchMocks({
        ok: true,
        json: () => Promise.resolve({ album: createMockAlbum() }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Album")).toBeDefined();
      });

      const settingsButton = document.querySelector("button:has(svg.lucide-settings)");
      if (settingsButton) {
        fireEvent.click(settingsButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Album Settings")).toBeDefined();
      });

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      );

      fireEvent.click(screen.getByText("Delete Album"));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/albums");
      });

      confirmSpy.mockRestore();
    });
  });

  describe("Album Update", () => {
    it("saves album settings when clicking save button", async () => {
      setupFetchMocks({
        ok: true,
        json: () => Promise.resolve({ album: createMockAlbum() }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Test Album")).toBeDefined();
      });

      const settingsButton = document.querySelector("button:has(svg.lucide-settings)");
      if (settingsButton) {
        fireEvent.click(settingsButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Album Settings")).toBeDefined();
      });

      const nameInput = screen.getByLabelText("Album Name");
      fireEvent.change(nameInput, { target: { value: "Updated Name" } });

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              album: {
                name: "Updated Name",
                description: "Test description",
                privacy: "PRIVATE",
                shareToken: null,
              },
            }),
        })
      );

      fireEvent.click(screen.getByText("Save Changes"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/albums/album_1",
          expect.objectContaining({
            method: "PATCH",
          }),
        );
      });
    });
  });

  describe("QR Panel Sidebar", () => {
    it("renders QR panel for UNLISTED album owned by user", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              name: "Unlisted Album",
              privacy: "UNLISTED",
              shareToken: "share-token-123",
              isOwner: true,
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-panel")).toBeDefined();
      });

      const qrPanel = screen.getByTestId("qr-panel");
      expect(qrPanel.getAttribute("data-album-id")).toBe("album_1");
      expect(qrPanel.getAttribute("data-share-token")).toBe("share-token-123");
      expect(qrPanel.getAttribute("data-album-name")).toBe("Unlisted Album");
    });

    it("renders QR panel for PUBLIC album owned by user", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              name: "Public Album",
              privacy: "PUBLIC",
              shareToken: "public-share-token",
              isOwner: true,
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-panel")).toBeDefined();
      });

      const qrPanel = screen.getByTestId("qr-panel");
      expect(qrPanel.getAttribute("data-album-id")).toBe("album_1");
      expect(qrPanel.getAttribute("data-share-token")).toBe("public-share-token");
    });

    it("does NOT render QR panel for PRIVATE album", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              name: "Private Album",
              privacy: "PRIVATE",
              shareToken: null,
              isOwner: true,
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Private Album")).toBeDefined();
      });

      expect(screen.queryByTestId("qr-panel")).toBeNull();
    });

    it("does NOT render QR panel when user is not owner", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              name: "Not My Album",
              privacy: "PUBLIC",
              shareToken: "share-token-123",
              isOwner: false,
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("Not My Album")).toBeDefined();
      });

      expect(screen.queryByTestId("qr-panel")).toBeNull();
    });

    it("does NOT render QR panel when no shareToken", async () => {
      setupFetchMocks({
        ok: true,
        json: () =>
          Promise.resolve({
            album: createMockAlbum({
              name: "No Share Token Album",
              privacy: "PUBLIC",
              shareToken: null,
              isOwner: true,
            }),
          }),
      });

      render(<AlbumDetailClient albumId="album_1" />);

      await waitFor(() => {
        expect(screen.getByText("No Share Token Album")).toBeDefined();
      });

      expect(screen.queryByTestId("qr-panel")).toBeNull();
    });
  });
});
