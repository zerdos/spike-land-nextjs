import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AlbumImage } from "./types";
import { useImageReorder } from "./useImageReorder";

// Mock images for testing
const mockImages: AlbumImage[] = [
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
  {
    id: "img-3",
    name: "Image 3",
    description: null,
    originalUrl: "https://example.com/3.jpg",
    width: 1000,
    height: 1000,
    sortOrder: 2,
    createdAt: "2024-01-03T00:00:00Z",
  },
];

// Create mock drag event
const createMockDragEvent = (
  overrides: Partial<React.DragEvent> = {},
): React.DragEvent => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  dataTransfer: {
    effectAllowed: "none",
    setData: vi.fn(),
    getData: vi.fn(),
    types: [],
  } as unknown as DataTransfer,
  ...overrides,
} as unknown as React.DragEvent);

describe("useImageReorder", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with null drag state", () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));

      expect(result.current.draggedImageId).toBeNull();
      expect(result.current.dragOverImageId).toBeNull();
      expect(result.current.isSavingOrder).toBe(false);
    });

    it("should have empty original order ref", () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));

      expect(result.current.originalOrderRef.current).toEqual([]);
    });
  });

  describe("setOriginalOrder", () => {
    it("should set the original order reference", () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));

      act(() => {
        result.current.setOriginalOrder(["img-1", "img-2", "img-3"]);
      });

      expect(result.current.originalOrderRef.current).toEqual([
        "img-1",
        "img-2",
        "img-3",
      ]);
    });
  });

  describe("handleDragStart", () => {
    it("should set dragged image ID", () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });

      expect(result.current.draggedImageId).toBe("img-1");
      expect(mockEvent.dataTransfer.effectAllowed).toBe("move");
    });
  });

  describe("handleDragOver", () => {
    it("should set drag over ID when different from dragged", () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      // Start dragging img-1
      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });

      // Hover over img-2
      act(() => {
        result.current.handleDragOver(mockEvent, "img-2");
      });

      expect(result.current.dragOverImageId).toBe("img-2");
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should not set drag over ID when same as dragged", () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      // Start dragging img-1
      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });

      // Hover over img-1 (same)
      act(() => {
        result.current.handleDragOver(mockEvent, "img-1");
      });

      expect(result.current.dragOverImageId).toBeNull();
    });

    it("should not set drag over ID when not dragging", () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragOver(mockEvent, "img-2");
      });

      expect(result.current.dragOverImageId).toBeNull();
    });
  });

  describe("handleDragLeave", () => {
    it("should clear drag over ID", () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      // Start dragging and hover
      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });
      act(() => {
        result.current.handleDragOver(mockEvent, "img-2");
      });

      expect(result.current.dragOverImageId).toBe("img-2");

      act(() => {
        result.current.handleDragLeave();
      });

      expect(result.current.dragOverImageId).toBeNull();
    });
  });

  describe("handleDragEnd", () => {
    it("should clear all drag state", () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      // Start dragging and hover
      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });
      act(() => {
        result.current.handleDragOver(mockEvent, "img-2");
      });

      act(() => {
        result.current.handleDragEnd();
      });

      expect(result.current.draggedImageId).toBeNull();
      expect(result.current.dragOverImageId).toBeNull();
    });
  });

  describe("resetDragState", () => {
    it("should reset all drag state", () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      // Start dragging and hover
      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });
      act(() => {
        result.current.handleDragOver(mockEvent, "img-2");
      });

      act(() => {
        result.current.resetDragState();
      });

      expect(result.current.draggedImageId).toBeNull();
      expect(result.current.dragOverImageId).toBeNull();
    });
  });

  describe("handleDrop", () => {
    it("should reorder images and save to backend", async () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      // Start dragging img-1
      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });

      let reorderResult: { images: AlbumImage[]; newOrder: string[]; } | null = null;

      await act(async () => {
        reorderResult = await result.current.handleDrop(
          mockEvent,
          "img-3",
          mockImages,
        );
      });

      expect(reorderResult).not.toBeNull();
      expect(reorderResult!.newOrder).toEqual(["img-2", "img-3", "img-1"]);
      expect(reorderResult!.images[0]!.id).toBe("img-2");
      expect(reorderResult!.images[1]!.id).toBe("img-3");
      expect(reorderResult!.images[2]!.id).toBe("img-1");

      expect(mockFetch).toHaveBeenCalledWith("/api/albums/album-1/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageOrder: ["img-2", "img-3", "img-1"] }),
      });
    });

    it("should update originalOrderRef on success", async () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });

      await act(async () => {
        await result.current.handleDrop(mockEvent, "img-2", mockImages);
      });

      expect(result.current.originalOrderRef.current).toEqual([
        "img-2",
        "img-1",
        "img-3",
      ]);
    });

    it("should return null when dropping on same image", async () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });

      let reorderResult: { images: AlbumImage[]; newOrder: string[]; } | null;

      await act(async () => {
        reorderResult = await result.current.handleDrop(
          mockEvent,
          "img-1",
          mockImages,
        );
      });

      expect(reorderResult!).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return null when not dragging", async () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      let reorderResult: { images: AlbumImage[]; newOrder: string[]; } | null;

      await act(async () => {
        reorderResult = await result.current.handleDrop(
          mockEvent,
          "img-2",
          mockImages,
        );
      });

      expect(reorderResult!).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return null when image not found in array", async () => {
      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragStart(mockEvent, "img-nonexistent");
      });

      let reorderResult: { images: AlbumImage[]; newOrder: string[]; } | null;

      await act(async () => {
        reorderResult = await result.current.handleDrop(
          mockEvent,
          "img-1",
          mockImages,
        );
      });

      expect(reorderResult!).toBeNull();
    });

    it("should handle API error and call onError", async () => {
      const onError = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      const { result } = renderHook(() => useImageReorder({ albumId: "album-1", onError }));
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });

      let reorderResult: { images: AlbumImage[]; newOrder: string[]; } | null;

      await act(async () => {
        reorderResult = await result.current.handleDrop(
          mockEvent,
          "img-2",
          mockImages,
        );
      });

      expect(reorderResult!).toBeNull();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Failed to save image order",
        }),
      );
    });

    it("should handle network error and call onError", async () => {
      const onError = vi.fn();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useImageReorder({ albumId: "album-1", onError }));
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });

      let reorderResult: { images: AlbumImage[]; newOrder: string[]; } | null;

      await act(async () => {
        reorderResult = await result.current.handleDrop(
          mockEvent,
          "img-2",
          mockImages,
        );
      });

      expect(reorderResult!).toBeNull();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Network error",
        }),
      );
    });

    it("should reset isSavingOrder after save completes", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });

      await act(async () => {
        await result.current.handleDrop(mockEvent, "img-2", mockImages);
      });

      expect(result.current.isSavingOrder).toBe(false);
    });

    it("should clear draggedImageId after drop", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useImageReorder({ albumId: "album-1" }));
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragStart(mockEvent, "img-1");
      });

      expect(result.current.draggedImageId).toBe("img-1");

      await act(async () => {
        await result.current.handleDrop(mockEvent, "img-2", mockImages);
      });

      expect(result.current.draggedImageId).toBeNull();
    });
  });
});
