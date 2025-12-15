import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDragDropPhotos } from "./useDragDropPhotos";

// Mock fetch globally
global.fetch = vi.fn();

describe("useDragDropPhotos", () => {
  const mockOnMoveComplete = vi.fn();
  const mockOnMoveError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with correct default state", () => {
      const { result } = renderHook(() => useDragDropPhotos());

      expect(result.current.dragState).toEqual({
        isDragging: false,
        draggedImageIds: [],
        dragOverAlbumId: null,
      });
      expect(result.current.isMoving).toBe(false);
    });

    it("should initialize with callbacks when provided", () => {
      const { result } = renderHook(() =>
        useDragDropPhotos({
          onMoveComplete: mockOnMoveComplete,
          onMoveError: mockOnMoveError,
        })
      );

      expect(result.current.dragState.isDragging).toBe(false);
      expect(mockOnMoveComplete).not.toHaveBeenCalled();
      expect(mockOnMoveError).not.toHaveBeenCalled();
    });
  });

  describe("handleDragStart", () => {
    it("should set drag state when starting drag with image IDs", () => {
      const { result } = renderHook(() => useDragDropPhotos());

      act(() => {
        result.current.handleDragStart(["img1", "img2", "img3"]);
      });

      expect(result.current.dragState).toEqual({
        isDragging: true,
        draggedImageIds: ["img1", "img2", "img3"],
        dragOverAlbumId: null,
      });
    });

    it("should not update state when starting drag with empty array", () => {
      const { result } = renderHook(() => useDragDropPhotos());

      act(() => {
        result.current.handleDragStart([]);
      });

      expect(result.current.dragState.isDragging).toBe(false);
      expect(result.current.dragState.draggedImageIds).toEqual([]);
    });

    it("should handle single image drag", () => {
      const { result } = renderHook(() => useDragDropPhotos());

      act(() => {
        result.current.handleDragStart(["single-image-id"]);
      });

      expect(result.current.dragState.draggedImageIds).toEqual([
        "single-image-id",
      ]);
      expect(result.current.dragState.isDragging).toBe(true);
    });
  });

  describe("handleDragEnd", () => {
    it("should reset drag state to initial state", () => {
      const { result } = renderHook(() => useDragDropPhotos());

      // Start drag first
      act(() => {
        result.current.handleDragStart(["img1", "img2"]);
        result.current.handleDragOver("album1");
      });

      expect(result.current.dragState.isDragging).toBe(true);

      // End drag
      act(() => {
        result.current.handleDragEnd();
      });

      expect(result.current.dragState).toEqual({
        isDragging: false,
        draggedImageIds: [],
        dragOverAlbumId: null,
      });
    });

    it("should handle multiple drag end calls idempotently", () => {
      const { result } = renderHook(() => useDragDropPhotos());

      act(() => {
        result.current.handleDragStart(["img1"]);
      });

      act(() => {
        result.current.handleDragEnd();
        result.current.handleDragEnd();
        result.current.handleDragEnd();
      });

      expect(result.current.dragState.isDragging).toBe(false);
    });
  });

  describe("handleDragOver", () => {
    it("should update dragOverAlbumId when dragging over an album", () => {
      const { result } = renderHook(() => useDragDropPhotos());

      act(() => {
        result.current.handleDragStart(["img1"]);
        result.current.handleDragOver("album-123");
      });

      expect(result.current.dragState.dragOverAlbumId).toBe("album-123");
      expect(result.current.dragState.isDragging).toBe(true);
    });

    it("should update album ID when moving between albums", () => {
      const { result } = renderHook(() => useDragDropPhotos());

      act(() => {
        result.current.handleDragStart(["img1"]);
        result.current.handleDragOver("album-1");
      });

      expect(result.current.dragState.dragOverAlbumId).toBe("album-1");

      act(() => {
        result.current.handleDragOver("album-2");
      });

      expect(result.current.dragState.dragOverAlbumId).toBe("album-2");
    });
  });

  describe("handleDragLeave", () => {
    it("should clear dragOverAlbumId while maintaining drag state", () => {
      const { result } = renderHook(() => useDragDropPhotos());

      act(() => {
        result.current.handleDragStart(["img1", "img2"]);
        result.current.handleDragOver("album-123");
      });

      expect(result.current.dragState.dragOverAlbumId).toBe("album-123");

      act(() => {
        result.current.handleDragLeave();
      });

      expect(result.current.dragState.dragOverAlbumId).toBe(null);
      expect(result.current.dragState.isDragging).toBe(true);
      expect(result.current.dragState.draggedImageIds).toEqual([
        "img1",
        "img2",
      ]);
    });
  });

  describe("handleDrop", () => {
    it("should successfully move images and call onMoveComplete", async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() =>
        useDragDropPhotos({
          onMoveComplete: mockOnMoveComplete,
        })
      );

      act(() => {
        result.current.handleDragStart(["img1", "img2"]);
      });

      await act(async () => {
        await result.current.handleDrop("album-target");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/images/move-to-album", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageIds: ["img1", "img2"],
          targetAlbumId: "album-target",
        }),
      });

      expect(mockOnMoveComplete).toHaveBeenCalledWith(
        ["img1", "img2"],
        "album-target",
      );
      expect(result.current.dragState.isDragging).toBe(false);
      expect(result.current.isMoving).toBe(false);
    });

    it("should set isMoving to true during API call", async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useDragDropPhotos());

      act(() => {
        result.current.handleDragStart(["img1"]);
      });

      // Start the drop operation without awaiting
      let dropPromise: Promise<void>;
      act(() => {
        dropPromise = result.current.handleDrop("album-1");
      });

      // During the API call, isMoving should be true
      await waitFor(() => {
        expect(result.current.isMoving).toBe(true);
      });

      // Resolve the API call
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await dropPromise!;
      });

      expect(result.current.isMoving).toBe(false);
    });

    it("should handle API error and call onMoveError", async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Album not found" }),
      } as Response);

      const { result } = renderHook(() =>
        useDragDropPhotos({
          onMoveError: mockOnMoveError,
        })
      );

      act(() => {
        result.current.handleDragStart(["img1"]);
      });

      let caughtError: Error | null = null;
      await act(async () => {
        try {
          await result.current.handleDrop("non-existent-album");
        } catch (error) {
          caughtError = error as Error;
        }
      });

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError?.message).toBe("Album not found");
      expect(mockOnMoveError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Album not found",
        }),
      );
      expect(result.current.dragState.isDragging).toBe(false);
      expect(result.current.isMoving).toBe(false);
    });

    it("should handle network error", async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useDragDropPhotos({
          onMoveError: mockOnMoveError,
        })
      );

      act(() => {
        result.current.handleDragStart(["img1"]);
      });

      try {
        await act(async () => {
          await result.current.handleDrop("album-1");
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }

      expect(mockOnMoveError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Network error",
        }),
      );
    });

    it("should handle API error without JSON body", async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      const { result } = renderHook(() =>
        useDragDropPhotos({
          onMoveError: mockOnMoveError,
        })
      );

      act(() => {
        result.current.handleDragStart(["img1"]);
      });

      try {
        await act(async () => {
          await result.current.handleDrop("album-1");
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Failed to move images to album");
      }

      expect(mockOnMoveError).toHaveBeenCalled();
    });

    it("should do nothing when dropping with no dragged images", async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

      const { result } = renderHook(() =>
        useDragDropPhotos({
          onMoveComplete: mockOnMoveComplete,
        })
      );

      // Don't start drag (draggedImageIds is empty)
      await act(async () => {
        await result.current.handleDrop("album-1");
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockOnMoveComplete).not.toHaveBeenCalled();
      expect(result.current.dragState.isDragging).toBe(false);
    });

    it("should reset drag state after successful drop", async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useDragDropPhotos());

      act(() => {
        result.current.handleDragStart(["img1", "img2"]);
        result.current.handleDragOver("album-1");
      });

      await act(async () => {
        await result.current.handleDrop("album-1");
      });

      expect(result.current.dragState).toEqual({
        isDragging: false,
        draggedImageIds: [],
        dragOverAlbumId: null,
      });
    });

    it("should reset drag state after failed drop", async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Server error" }),
      } as Response);

      const { result } = renderHook(() =>
        useDragDropPhotos({
          onMoveError: mockOnMoveError,
        })
      );

      act(() => {
        result.current.handleDragStart(["img1"]);
        result.current.handleDragOver("album-1");
      });

      await act(async () => {
        try {
          await result.current.handleDrop("album-1");
        } catch (_error) {
          // Error expected
        }
      });

      expect(result.current.dragState).toEqual({
        isDragging: false,
        draggedImageIds: [],
        dragOverAlbumId: null,
      });
    });
  });

  describe("Callback Stability", () => {
    it("should maintain stable callback references", () => {
      const { result, rerender } = renderHook(() => useDragDropPhotos());

      const initialCallbacks = {
        handleDragStart: result.current.handleDragStart,
        handleDragEnd: result.current.handleDragEnd,
        handleDragOver: result.current.handleDragOver,
        handleDragLeave: result.current.handleDragLeave,
        handleDrop: result.current.handleDrop,
      };

      rerender();

      expect(result.current.handleDragStart).toBe(
        initialCallbacks.handleDragStart,
      );
      expect(result.current.handleDragEnd).toBe(initialCallbacks.handleDragEnd);
      expect(result.current.handleDragOver).toBe(
        initialCallbacks.handleDragOver,
      );
      expect(result.current.handleDragLeave).toBe(
        initialCallbacks.handleDragLeave,
      );
      expect(result.current.handleDrop).toBe(initialCallbacks.handleDrop);
    });
  });

  describe("Edge Cases", () => {
    it("should handle non-Error thrown values", async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() =>
        useDragDropPhotos({
          onMoveError: mockOnMoveError,
        })
      );

      act(() => {
        result.current.handleDragStart(["img1"]);
      });

      try {
        await act(async () => {
          await result.current.handleDrop("album-1");
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Unknown error");
      }

      expect(mockOnMoveError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Unknown error",
        }),
      );
    });

    it("should handle multiple rapid drag operations", () => {
      const { result } = renderHook(() => useDragDropPhotos());

      act(() => {
        result.current.handleDragStart(["img1"]);
        result.current.handleDragOver("album1");
        result.current.handleDragLeave();
        result.current.handleDragOver("album2");
        result.current.handleDragEnd();
      });

      expect(result.current.dragState.isDragging).toBe(false);
    });
  });
});
