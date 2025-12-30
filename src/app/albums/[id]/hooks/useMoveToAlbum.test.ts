import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMoveToAlbum } from "./useMoveToAlbum";

const mockAlbums = [
  { id: "album-1", name: "Album 1", imageCount: 5 },
  { id: "album-2", name: "Album 2", imageCount: 10 },
  { id: "album-3", name: "Album 3", imageCount: 3 },
];

describe("useMoveToAlbum", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ albums: mockAlbums }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with closed dialog state", () => {
      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      expect(result.current.showMoveDialog).toBe(false);
      expect(result.current.allAlbums).toEqual([]);
      expect(result.current.isLoadingAlbums).toBe(false);
      expect(result.current.selectedTargetAlbum).toBe("");
      expect(result.current.isMoving).toBe(false);
    });
  });

  describe("openMoveDialog", () => {
    it("should open dialog and fetch albums", async () => {
      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      await act(async () => {
        result.current.openMoveDialog(new Set(["img-1"]));
      });

      expect(result.current.showMoveDialog).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith("/api/albums");

      await waitFor(() => {
        expect(result.current.isLoadingAlbums).toBe(false);
      });

      // Should exclude current album
      expect(result.current.allAlbums).toHaveLength(2);
      expect(result.current.allAlbums.find((a) => a.id === "album-1"))
        .toBeUndefined();
    });

    it("should not open dialog with no selected images", async () => {
      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      await act(async () => {
        result.current.openMoveDialog(new Set());
      });

      expect(result.current.showMoveDialog).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should reset selected target album when opening", async () => {
      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      // Set a target
      act(() => {
        result.current.setSelectedTargetAlbum("album-2");
      });

      // Open dialog
      await act(async () => {
        result.current.openMoveDialog(new Set(["img-1"]));
      });

      expect(result.current.selectedTargetAlbum).toBe("");
    });
  });

  describe("closeMoveDialog", () => {
    it("should close dialog and reset selection", async () => {
      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      // Open dialog
      await act(async () => {
        result.current.openMoveDialog(new Set(["img-1"]));
      });

      // Select target
      act(() => {
        result.current.setSelectedTargetAlbum("album-2");
      });

      // Close dialog
      act(() => {
        result.current.closeMoveDialog();
      });

      expect(result.current.showMoveDialog).toBe(false);
      expect(result.current.selectedTargetAlbum).toBe("");
    });
  });

  describe("setShowMoveDialog", () => {
    it("should update dialog visibility", () => {
      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      act(() => {
        result.current.setShowMoveDialog(true);
      });

      expect(result.current.showMoveDialog).toBe(true);

      act(() => {
        result.current.setShowMoveDialog(false);
      });

      expect(result.current.showMoveDialog).toBe(false);
    });
  });

  describe("setSelectedTargetAlbum", () => {
    it("should update selected target", () => {
      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      act(() => {
        result.current.setSelectedTargetAlbum("album-2");
      });

      expect(result.current.selectedTargetAlbum).toBe("album-2");
    });
  });

  describe("handleMoveImages", () => {
    it("should move images to target album", async () => {
      const onMoveComplete = vi.fn();
      const { result } = renderHook(() =>
        useMoveToAlbum({
          currentAlbumId: "album-1",
          onMoveComplete,
        })
      );

      // Setup
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ albums: mockAlbums }),
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true });

      // Open dialog
      await act(async () => {
        result.current.openMoveDialog(new Set(["img-1", "img-2"]));
      });

      await waitFor(() => {
        expect(result.current.isLoadingAlbums).toBe(false);
      });

      // Select target
      act(() => {
        result.current.setSelectedTargetAlbum("album-2");
      });

      // Move images
      await act(async () => {
        await result.current.handleMoveImages(new Set(["img-1", "img-2"]));
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/albums/album-2/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: ["img-1", "img-2"] }),
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/albums/album-1/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: ["img-1", "img-2"] }),
      });

      expect(onMoveComplete).toHaveBeenCalledWith(
        ["img-1", "img-2"],
        "album-2",
      );
      expect(result.current.showMoveDialog).toBe(false);
    });

    it("should not move without target album selected", async () => {
      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      await act(async () => {
        await result.current.handleMoveImages(new Set(["img-1"]));
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not move with empty image set", async () => {
      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      act(() => {
        result.current.setSelectedTargetAlbum("album-2");
      });

      await act(async () => {
        await result.current.handleMoveImages(new Set());
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should call onMoveError on add failure", async () => {
      const onMoveError = vi.fn();
      const { result } = renderHook(() =>
        useMoveToAlbum({
          currentAlbumId: "album-1",
          onMoveError,
        })
      );

      mockFetch.mockRejectedValueOnce(new Error("Add failed"));

      act(() => {
        result.current.setSelectedTargetAlbum("album-2");
      });

      await act(async () => {
        await result.current.handleMoveImages(new Set(["img-1"]));
      });

      expect(onMoveError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Add failed" }),
      );
      expect(result.current.isMoving).toBe(false);
    });

    it("should call onMoveError on remove failure", async () => {
      const onMoveError = vi.fn();
      const { result } = renderHook(() =>
        useMoveToAlbum({
          currentAlbumId: "album-1",
          onMoveError,
        })
      );

      mockFetch
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error("Remove failed"));

      act(() => {
        result.current.setSelectedTargetAlbum("album-2");
      });

      await act(async () => {
        await result.current.handleMoveImages(new Set(["img-1"]));
      });

      expect(onMoveError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Remove failed" }),
      );
    });

    it("should reset isMoving after move operation completes", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Add to target album
        .mockResolvedValueOnce({ ok: true }); // Remove from current album

      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      act(() => {
        result.current.setSelectedTargetAlbum("album-2");
      });

      await act(async () => {
        await result.current.handleMoveImages(new Set(["img-1"]));
      });

      expect(result.current.isMoving).toBe(false);
    });
  });

  describe("fetchAllAlbums error handling", () => {
    it("should handle fetch error gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      act(() => {
        result.current.openMoveDialog(new Set(["img-1"]));
      });

      await waitFor(() => {
        expect(result.current.isLoadingAlbums).toBe(false);
      });

      expect(result.current.allAlbums).toEqual([]);
    });

    it("should handle non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      act(() => {
        result.current.openMoveDialog(new Set(["img-1"]));
      });

      await waitFor(() => {
        expect(result.current.isLoadingAlbums).toBe(false);
      });

      expect(result.current.allAlbums).toEqual([]);
    });

    it("should handle JSON parse error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("JSON parse error")),
      });

      const { result } = renderHook(() => useMoveToAlbum({ currentAlbumId: "album-1" }));

      act(() => {
        result.current.openMoveDialog(new Set(["img-1"]));
      });

      await waitFor(() => {
        expect(result.current.isLoadingAlbums).toBe(false);
      });

      expect(result.current.allAlbums).toEqual([]);
    });
  });
});
