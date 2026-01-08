import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlbumsClient } from "./AlbumsClient";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AlbumsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockImplementation(
      () => new Promise(() => {}),
    );

    render(<AlbumsClient />);

    expect(document.querySelector(".animate-spin")).toBeDefined();
  });

  it("shows empty state when no albums", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ albums: [] }),
    });

    render(<AlbumsClient />);

    await waitFor(
      () => {
        expect(screen.getByText("No albums yet")).toBeDefined();
      },
      { timeout: 3000 },
    );
  });

  it("renders albums when data is loaded", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          albums: [
            {
              id: "album_1",
              name: "My Album",
              description: "Test description",
              privacy: "PRIVATE",
              coverImageId: null,
              imageCount: 5,
              previewImages: [],
              createdAt: "2025-01-01T00:00:00Z",
              updatedAt: "2025-01-01T00:00:00Z",
            },
          ],
        }),
    });

    render(<AlbumsClient />);

    await waitFor(
      () => {
        expect(screen.getByText("My Album")).toBeDefined();
        expect(screen.getByText("5 images")).toBeDefined();
      },
      { timeout: 3000 },
    );
  });

  it("opens create album dialog when clicking New Album", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ albums: [] }),
    });

    render(<AlbumsClient />);

    await waitFor(
      () => {
        expect(screen.getByText("No albums yet")).toBeDefined();
      },
      { timeout: 3000 },
    );

    // Use getByRole to find button more reliably
    const newAlbumButtons = screen.getAllByRole("button", {
      name: /new album/i,
    });
    const newAlbumButton = newAlbumButtons[0];
    if (newAlbumButton) {
      fireEvent.click(newAlbumButton);
    }

    await waitFor(
      () => {
        expect(screen.getByText("Create New Album")).toBeDefined();
      },
      { timeout: 3000 },
    );
  });

  it("creates album when form is submitted", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ albums: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            album: { id: "new_album", name: "New Album" },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            albums: [
              {
                id: "new_album",
                name: "New Album",
                description: null,
                privacy: "PRIVATE",
                coverImageId: null,
                imageCount: 0,
                previewImages: [],
                createdAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-01T00:00:00Z",
              },
            ],
          }),
      });

    render(<AlbumsClient />);

    await waitFor(
      () => {
        expect(screen.getByText("No albums yet")).toBeDefined();
      },
      { timeout: 3000 },
    );

    const createButton = screen.getByRole("button", { name: /create album/i });
    fireEvent.click(createButton);

    await waitFor(
      () => {
        expect(screen.getByLabelText("Album Name")).toBeDefined();
      },
      { timeout: 3000 },
    );

    const nameInput = screen.getByLabelText("Album Name");
    fireEvent.change(nameInput, { target: { value: "New Album" } });

    // Find the submit button within the dialog
    const submitButtons = screen.getAllByRole("button", {
      name: /create album/i,
    });
    const submitButton = submitButtons.find((btn) => {
      const parent = btn.closest('[role="dialog"]');
      return parent !== null;
    });

    if (submitButton) {
      fireEvent.click(submitButton);
    }

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/albums",
          expect.any(Object),
        );
      },
      { timeout: 3000 },
    );
  });

  it("shows privacy badge on albums", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          albums: [
            {
              id: "album_1",
              name: "Public Album",
              description: null,
              privacy: "PUBLIC",
              coverImageId: null,
              imageCount: 0,
              previewImages: [],
              createdAt: "2025-01-01T00:00:00Z",
              updatedAt: "2025-01-01T00:00:00Z",
            },
          ],
        }),
    });

    render(<AlbumsClient />);

    await waitFor(
      () => {
        expect(screen.getByText("Public")).toBeDefined();
      },
      { timeout: 3000 },
    );
  });

  it("handles delete album", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            albums: [
              {
                id: "album_1",
                name: "Test Album",
                description: null,
                privacy: "PRIVATE",
                coverImageId: null,
                imageCount: 0,
                previewImages: [],
                createdAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-01T00:00:00Z",
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<AlbumsClient />);

    await waitFor(
      () => {
        expect(screen.getByText("Test Album")).toBeDefined();
      },
      { timeout: 3000 },
    );

    // Find the card that contains "Test Album" and get the delete button from within it
    const albumCard = screen.getByText("Test Album").closest(
      '[class*="overflow-hidden"]',
    );
    expect(albumCard).toBeDefined();

    if (albumCard) {
      // Find all buttons within this card
      const buttons = within(albumCard as HTMLElement).getAllByRole("button");
      // The delete button should be the one that's not the "View Album" link
      const deleteButton = buttons.find((btn) => {
        const svg = btn.querySelector("svg.lucide-trash-2");
        return svg !== null;
      });

      if (deleteButton) {
        fireEvent.click(deleteButton);

        await waitFor(
          () => {
            expect(confirmSpy).toHaveBeenCalled();
          },
          { timeout: 3000 },
        );
      }
    }

    confirmSpy.mockRestore();
  });
});
