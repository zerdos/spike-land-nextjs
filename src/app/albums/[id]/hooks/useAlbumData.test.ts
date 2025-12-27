import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Album } from "./types";
import { useAlbumData } from "./useAlbumData";

const mockAlbum: Album = {
  id: "album-1",
  name: "Test Album",
  description: "Test description",
  privacy: "PRIVATE",
  coverImageId: null,
  pipelineId: null,
  shareToken: "abc123",
  imageCount: 2,
  isOwner: true,
  images: [
    {
      id: "img-1",
      name: "Image 1",
      description: null,
      originalUrl: "https://example.com/1.jpg",
      width: 800,
      height: 600,
      sortOrder: 0,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "img-2",
      name: "Image 2",
      description: null,
      originalUrl: "https://example.com/2.jpg",
      width: 1200,
      height: 800,
      sortOrder: 1,
      createdAt: "2024-01-02T00:00:00Z",
    },
  ],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
};

describe("useAlbumData", () => {
  const mockFetch = vi.fn();
  const mockWriteText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);

    // Mock clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    // Mock window.location.origin
    Object.defineProperty(window, "location", {
      value: { origin: "https://example.com" },
      writable: true,
      configurable: true,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ album: mockAlbum }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("initialization and fetch", () => {
    it("should fetch album on mount", async () => {
      const { result } = renderHook(() => useAlbumData("album-1"));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/albums/album-1");
      expect(result.current.album).toEqual(mockAlbum);
      expect(result.current.error).toBeNull();
    });

    it("should set edit form from fetched album", async () => {
      const { result } = renderHook(() => useAlbumData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.editForm.name).toBe("Test Album");
      expect(result.current.editForm.description).toBe("Test description");
      expect(result.current.editForm.privacy).toBe("PRIVATE");
      expect(result.current.editForm.pipelineId).toBeNull();
    });

    it("should set original order ref from fetched images", async () => {
      const { result } = renderHook(() => useAlbumData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.originalOrderRef.current).toEqual([
        "img-1",
        "img-2",
      ]);
    });

    it("should call onFetchComplete callback", async () => {
      const onFetchComplete = vi.fn();
      const { result } = renderHook(() => useAlbumData("album-1", { onFetchComplete }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(onFetchComplete).toHaveBeenCalledWith(mockAlbum);
    });
  });

  describe("error handling", () => {
    it("should handle 404 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useAlbumData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Album not found");
      expect(result.current.album).toBeNull();
    });

    it("should handle non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useAlbumData("album-1", { onError }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Failed to fetch album");
      expect(onError).toHaveBeenCalled();
    });

    it("should handle fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const onError = vi.fn();
      const { result } = renderHook(() => useAlbumData("album-1", { onError }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
      expect(onError).toHaveBeenCalled();
    });

    it("should handle JSON parse error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error("Parse error")),
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useAlbumData("album-1", { onError }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Failed to parse album data");
      expect(onError).toHaveBeenCalled();
    });
  });

  describe("saveSettings", () => {
    it("should save album settings", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ album: mockAlbum }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              album: { ...mockAlbum, name: "Updated Name" },
            }),
        });

      const onUpdateComplete = vi.fn();
      const { result } = renderHook(() => useAlbumData("album-1", { onUpdateComplete }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update edit form
      act(() => {
        result.current.setEditForm((prev) => ({
          ...prev,
          name: "Updated Name",
        }));
      });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/albums/album-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name",
          description: "Test description",
          privacy: "PRIVATE",
          pipelineId: null,
        }),
      });

      expect(onUpdateComplete).toHaveBeenCalled();
      expect(result.current.showSettings).toBe(false);
    });

    it("should not save with empty name", async () => {
      const { result } = renderHook(() => useAlbumData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear the name
      act(() => {
        result.current.setEditForm((prev) => ({ ...prev, name: "" }));
      });

      const fetchCallCount = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.saveSettings();
      });

      // Should not have made another fetch call
      expect(mockFetch.mock.calls.length).toBe(fetchCallCount);
    });

    it("should handle save error", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ album: mockAlbum }),
        })
        .mockRejectedValueOnce(new Error("Save failed"));

      const onError = vi.fn();
      const { result } = renderHook(() => useAlbumData("album-1", { onError }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.isSaving).toBe(false);
    });

    it("should handle non-ok save response", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ album: mockAlbum }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const onError = vi.fn();
      const { result } = renderHook(() => useAlbumData("album-1", { onError }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(onError).toHaveBeenCalled();
    });

    it("should handle JSON parse error on save response", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ album: mockAlbum }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.reject(new Error("Parse error")),
        });

      const onError = vi.fn();
      const { result } = renderHook(() => useAlbumData("album-1", { onError }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("deleteAlbum", () => {
    it("should delete album and call onDeleteComplete", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ album: mockAlbum }),
        })
        .mockResolvedValueOnce({ ok: true });

      const onDeleteComplete = vi.fn();
      const { result } = renderHook(() => useAlbumData("album-1", { onDeleteComplete }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteAlbum();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/albums/album-1", {
        method: "DELETE",
      });
      expect(onDeleteComplete).toHaveBeenCalled();
    });

    it("should handle delete error", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ album: mockAlbum }),
        })
        .mockRejectedValueOnce(new Error("Delete failed"));

      const onError = vi.fn();
      const { result } = renderHook(() => useAlbumData("album-1", { onError }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteAlbum();
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("copyShareLink", () => {
    it("should copy share link to clipboard and set copied state", async () => {
      const { result } = renderHook(() => useAlbumData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.copyShareLink();
      });

      expect(mockWriteText).toHaveBeenCalledWith(
        "https://example.com/albums/album-1?token=abc123",
      );
      expect(result.current.copied).toBe(true);
    });

    it("should reset copied state after timeout", async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useAlbumData("album-1"));

      // Run pending promises with fake timers
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      act(() => {
        result.current.copyShareLink();
      });

      expect(result.current.copied).toBe(true);

      // Should reset after 2 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(result.current.copied).toBe(false);

      vi.useRealTimers();
    });

    it("should not copy when no share token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            album: { ...mockAlbum, shareToken: undefined },
          }),
      });

      const { result } = renderHook(() => useAlbumData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.copyShareLink();
      });

      expect(mockWriteText).not.toHaveBeenCalled();
    });
  });

  describe("updateLocalAlbum", () => {
    it("should update local album state", async () => {
      const { result } = renderHook(() => useAlbumData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateLocalAlbum((prev) => prev ? { ...prev, name: "Updated Name" } : null);
      });

      expect(result.current.album?.name).toBe("Updated Name");
    });
  });

  describe("showSettings", () => {
    it("should toggle settings dialog", async () => {
      const { result } = renderHook(() => useAlbumData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.showSettings).toBe(false);

      act(() => {
        result.current.setShowSettings(true);
      });

      expect(result.current.showSettings).toBe(true);

      act(() => {
        result.current.setShowSettings(false);
      });

      expect(result.current.showSettings).toBe(false);
    });
  });

  describe("setEditForm", () => {
    it("should update edit form state", async () => {
      const { result } = renderHook(() => useAlbumData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setEditForm({
          name: "New Name",
          description: "New Description",
          privacy: "PUBLIC",
          pipelineId: "pipeline-1",
        });
      });

      expect(result.current.editForm.name).toBe("New Name");
      expect(result.current.editForm.description).toBe("New Description");
      expect(result.current.editForm.privacy).toBe("PUBLIC");
      expect(result.current.editForm.pipelineId).toBe("pipeline-1");
    });
  });

  describe("refetch", () => {
    it("should refetch album data", async () => {
      const { result } = renderHook(() => useAlbumData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ album: { ...mockAlbum, name: "Refetched" } }),
      });

      await act(async () => {
        await result.current.fetchAlbum();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.album?.name).toBe("Refetched");
    });
  });
});
