import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AlbumImage } from "./types";
import { useImageSelection } from "./useImageSelection";

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
    description: "A description",
    originalUrl: "https://example.com/2.jpg",
    enhancedUrl: "https://example.com/2-enhanced.jpg",
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

describe("useImageSelection", () => {
  describe("initialization", () => {
    it("should initialize with selection mode off by default", () => {
      const { result } = renderHook(() => useImageSelection());

      expect(result.current.isSelectionMode).toBe(false);
      expect(result.current.selectedImages.size).toBe(0);
      expect(result.current.selectedCount).toBe(0);
    });

    it("should initialize with selection mode on when specified", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      expect(result.current.isSelectionMode).toBe(true);
      expect(result.current.selectedImages.size).toBe(0);
    });
  });

  describe("enterSelectionMode", () => {
    it("should enter selection mode", () => {
      const { result } = renderHook(() => useImageSelection());

      expect(result.current.isSelectionMode).toBe(false);

      act(() => {
        result.current.enterSelectionMode();
      });

      expect(result.current.isSelectionMode).toBe(true);
    });

    it("should preserve existing selections when entering selection mode", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      // Add a selection
      act(() => {
        result.current.toggleImageSelection("img-1");
      });

      expect(result.current.selectedImages.has("img-1")).toBe(true);

      // Exit and re-enter
      act(() => {
        result.current.exitSelectionMode();
      });

      act(() => {
        result.current.enterSelectionMode();
      });

      // Selection should be cleared after exit
      expect(result.current.selectedImages.size).toBe(0);
    });
  });

  describe("exitSelectionMode", () => {
    it("should exit selection mode and clear selections", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      // Add some selections
      act(() => {
        result.current.toggleImageSelection("img-1");
        result.current.toggleImageSelection("img-2");
      });

      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.exitSelectionMode();
      });

      expect(result.current.isSelectionMode).toBe(false);
      expect(result.current.selectedImages.size).toBe(0);
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe("toggleImageSelection", () => {
    it("should add image to selection", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      act(() => {
        result.current.toggleImageSelection("img-1");
      });

      expect(result.current.selectedImages.has("img-1")).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it("should remove image from selection when already selected", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      act(() => {
        result.current.toggleImageSelection("img-1");
      });

      expect(result.current.selectedImages.has("img-1")).toBe(true);

      act(() => {
        result.current.toggleImageSelection("img-1");
      });

      expect(result.current.selectedImages.has("img-1")).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it("should handle multiple selections", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      act(() => {
        result.current.toggleImageSelection("img-1");
        result.current.toggleImageSelection("img-2");
        result.current.toggleImageSelection("img-3");
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.selectedImages.has("img-1")).toBe(true);
      expect(result.current.selectedImages.has("img-2")).toBe(true);
      expect(result.current.selectedImages.has("img-3")).toBe(true);
    });
  });

  describe("toggleSelectAll", () => {
    it("should select all images when none are selected", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      act(() => {
        result.current.toggleSelectAll(mockImages);
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.selectedImages.has("img-1")).toBe(true);
      expect(result.current.selectedImages.has("img-2")).toBe(true);
      expect(result.current.selectedImages.has("img-3")).toBe(true);
    });

    it("should deselect all images when all are selected", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      // Select all
      act(() => {
        result.current.toggleSelectAll(mockImages);
      });

      expect(result.current.selectedCount).toBe(3);

      // Toggle again to deselect all
      act(() => {
        result.current.toggleSelectAll(mockImages);
      });

      expect(result.current.selectedCount).toBe(0);
    });

    it("should select all when only some are selected", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      // Select only some
      act(() => {
        result.current.toggleImageSelection("img-1");
      });

      expect(result.current.selectedCount).toBe(1);

      // Toggle all should select all
      act(() => {
        result.current.toggleSelectAll(mockImages);
      });

      expect(result.current.selectedCount).toBe(3);
    });

    it("should work with empty image array", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      act(() => {
        result.current.toggleSelectAll([]);
      });

      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe("clearSelections", () => {
    it("should clear all selections without exiting selection mode", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      act(() => {
        result.current.toggleImageSelection("img-1");
        result.current.toggleImageSelection("img-2");
      });

      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.clearSelections();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isSelectionMode).toBe(true);
    });
  });

  describe("selectedCount", () => {
    it("should accurately reflect the number of selected images", () => {
      const { result } = renderHook(() => useImageSelection({ initialSelectionMode: true }));

      expect(result.current.selectedCount).toBe(0);

      act(() => {
        result.current.toggleImageSelection("img-1");
      });
      expect(result.current.selectedCount).toBe(1);

      act(() => {
        result.current.toggleImageSelection("img-2");
      });
      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.toggleImageSelection("img-1");
      });
      expect(result.current.selectedCount).toBe(1);
    });
  });
});
