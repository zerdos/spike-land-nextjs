import type { GalleryImage } from "@/lib/canvas/types";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSmartGallery } from "./useSmartGallery";

describe("useSmartGallery", () => {
  const mockImages: GalleryImage[] = [
    {
      id: "img-1",
      url: "https://example.com/image1.jpg",
      originalUrl: "https://example.com/original1.jpg",
      enhancedUrl: "https://example.com/enhanced1.jpg",
      name: "Image 1",
      width: 1920,
      height: 1080,
    },
    {
      id: "img-2",
      url: "https://example.com/image2.jpg",
      originalUrl: "https://example.com/original2.jpg",
      enhancedUrl: "https://example.com/enhanced2.jpg",
      name: "Image 2",
      width: 1920,
      height: 1080,
    },
    {
      id: "img-3",
      url: "https://example.com/image3.jpg",
      originalUrl: "https://example.com/original3.jpg",
      enhancedUrl: null,
      name: "Image 3",
      width: 1920,
      height: 1080,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      expect(result.current.viewMode).toBe("grid");
      expect(result.current.selectedImageId).toBeNull();
      expect(result.current.selectedImage).toBeNull();
      expect(result.current.currentIndex).toBe(-1);
      expect(result.current.isPeeking).toBe(false);
      expect(result.current.isTransitioning).toBe(false);
    });

    it("should initialize with initialSelectedId", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "img-2",
        })
      );

      expect(result.current.selectedImageId).toBe("img-2");
      expect(result.current.selectedImage).toEqual(mockImages[1]);
      expect(result.current.currentIndex).toBe(1);
    });

    it("should clear initialSelectedId when it does not exist in images", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "non-existent",
        })
      );

      // Hook should clear invalid selections
      expect(result.current.selectedImageId).toBeNull();
      expect(result.current.selectedImage).toBeNull();
      expect(result.current.currentIndex).toBe(-1);
    });

    it("should handle empty images array", () => {
      const { result } = renderHook(() => useSmartGallery({ images: [] }));

      expect(result.current.selectedImage).toBeNull();
      expect(result.current.currentIndex).toBe(-1);
    });
  });

  describe("selectImage", () => {
    it("should select an image by id", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      act(() => {
        result.current.selectImage("img-2");
      });

      expect(result.current.selectedImageId).toBe("img-2");
      expect(result.current.selectedImage).toEqual(mockImages[1]);
      expect(result.current.currentIndex).toBe(1);
    });

    it("should store transition origin when element is provided", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: 200,
          width: 300,
          height: 200,
          bottom: 300,
          right: 500,
          x: 200,
          y: 100,
          toJSON: () => ({}),
        }),
      } as unknown as HTMLElement;

      act(() => {
        result.current.selectImage("img-1", mockElement);
      });

      expect(mockElement.getBoundingClientRect).toHaveBeenCalled();
      expect(result.current.getTransitionOrigin()).toBeTruthy();
    });

    it("should select image without element", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      act(() => {
        result.current.selectImage("img-1");
      });

      expect(result.current.selectedImageId).toBe("img-1");
    });
  });

  describe("view mode transitions", () => {
    it("should enter slideshow mode", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      expect(result.current.viewMode).toBe("grid");

      act(() => {
        result.current.enterSlideshow();
      });

      expect(result.current.viewMode).toBe("slideshow");
      expect(result.current.isTransitioning).toBe(true);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.isTransitioning).toBe(false);
    });

    it("should exit slideshow mode", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      // First enter slideshow
      act(() => {
        result.current.enterSlideshow();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.viewMode).toBe("slideshow");

      // Then exit
      act(() => {
        result.current.exitSlideshow();
      });

      expect(result.current.viewMode).toBe("grid");
      expect(result.current.isTransitioning).toBe(true);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.isTransitioning).toBe(false);
    });

    it("should handle rapid enter/exit transitions", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      act(() => {
        result.current.enterSlideshow();
      });

      // Immediately exit before transition completes
      act(() => {
        result.current.exitSlideshow();
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.isTransitioning).toBe(false);
      expect(result.current.viewMode).toBe("grid");
    });

    it("should clear existing transition timeout when entering slideshow multiple times", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      // Enter slideshow
      act(() => {
        result.current.enterSlideshow();
      });

      // Enter again before transition completes (this should clear existing timeout)
      act(() => {
        result.current.enterSlideshow();
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.isTransitioning).toBe(false);
    });

    it("should clear existing transition timeout when exiting slideshow multiple times", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      // First enter slideshow
      act(() => {
        result.current.enterSlideshow();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Exit slideshow
      act(() => {
        result.current.exitSlideshow();
      });

      // Exit again before transition completes (this should clear existing timeout)
      act(() => {
        result.current.exitSlideshow();
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.isTransitioning).toBe(false);
    });
  });

  describe("navigation", () => {
    it("should go to next image", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "img-1",
        })
      );

      expect(result.current.currentIndex).toBe(0);

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.selectedImageId).toBe("img-2");
      expect(result.current.currentIndex).toBe(1);
    });

    it("should wrap to first image after last", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "img-3",
        })
      );

      expect(result.current.currentIndex).toBe(2);

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.selectedImageId).toBe("img-1");
      expect(result.current.currentIndex).toBe(0);
    });

    it("should select first image when goToNext with no selection", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      expect(result.current.selectedImageId).toBeNull();

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.selectedImageId).toBe("img-1");
    });

    it("should select first image when goToNext with invalid selection", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "non-existent",
        })
      );

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.selectedImageId).toBe("img-1");
    });

    it("should go to previous image", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "img-2",
        })
      );

      expect(result.current.currentIndex).toBe(1);

      act(() => {
        result.current.goToPrev();
      });

      expect(result.current.selectedImageId).toBe("img-1");
      expect(result.current.currentIndex).toBe(0);
    });

    it("should wrap to last image when going prev from first", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "img-1",
        })
      );

      expect(result.current.currentIndex).toBe(0);

      act(() => {
        result.current.goToPrev();
      });

      expect(result.current.selectedImageId).toBe("img-3");
      expect(result.current.currentIndex).toBe(2);
    });

    it("should select last image when goToPrev with no selection", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      expect(result.current.selectedImageId).toBeNull();

      act(() => {
        result.current.goToPrev();
      });

      expect(result.current.selectedImageId).toBe("img-3");
    });

    it("should select last image when goToPrev with invalid selection", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "non-existent",
        })
      );

      act(() => {
        result.current.goToPrev();
      });

      expect(result.current.selectedImageId).toBe("img-3");
    });

    it("should not change selection when goToNext with empty images", () => {
      const { result } = renderHook(() => useSmartGallery({ images: [] }));

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.selectedImageId).toBeNull();
    });

    it("should not change selection when goToPrev with empty images", () => {
      const { result } = renderHook(() => useSmartGallery({ images: [] }));

      act(() => {
        result.current.goToPrev();
      });

      expect(result.current.selectedImageId).toBeNull();
    });
  });

  describe("peek functionality", () => {
    it("should start peek", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      expect(result.current.isPeeking).toBe(false);

      act(() => {
        result.current.startPeek();
      });

      expect(result.current.isPeeking).toBe(true);
    });

    it("should end peek", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      act(() => {
        result.current.startPeek();
      });

      expect(result.current.isPeeking).toBe(true);

      act(() => {
        result.current.endPeek();
      });

      expect(result.current.isPeeking).toBe(false);
    });
  });

  describe("transition origin", () => {
    it("should get and set transition origin", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      expect(result.current.getTransitionOrigin()).toBeNull();

      const mockRect = {
        top: 100,
        left: 200,
        width: 300,
        height: 200,
        bottom: 300,
        right: 500,
        x: 200,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect;

      act(() => {
        result.current.setTransitionOrigin(mockRect);
      });

      expect(result.current.getTransitionOrigin()).toBe(mockRect);
    });

    it("should clear transition origin with null", () => {
      const { result } = renderHook(() => useSmartGallery({ images: mockImages }));

      const mockRect = {
        top: 100,
        left: 200,
        width: 300,
        height: 200,
        bottom: 300,
        right: 500,
        x: 200,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect;

      act(() => {
        result.current.setTransitionOrigin(mockRect);
      });

      expect(result.current.getTransitionOrigin()).toBe(mockRect);

      act(() => {
        result.current.setTransitionOrigin(null);
      });

      expect(result.current.getTransitionOrigin()).toBeNull();
    });
  });

  describe("auto-cycle", () => {
    it("should auto-cycle in grid mode when autoSelectInterval is set", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          autoSelectInterval: 1000,
        })
      );

      // Initially no selection
      expect(result.current.selectedImageId).toBeNull();

      // After first interval, should select first image
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.selectedImageId).toBe("img-1");

      // After second interval, should move to next
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.selectedImageId).toBe("img-2");
    });

    it("should wrap auto-cycle after last image", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "img-3",
          autoSelectInterval: 1000,
        })
      );

      expect(result.current.selectedImageId).toBe("img-3");

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.selectedImageId).toBe("img-1");
    });

    it("should pause auto-cycle when entering slideshow", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          autoSelectInterval: 1000,
        })
      );

      // Start auto-cycle
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.selectedImageId).toBe("img-1");

      // Enter slideshow
      act(() => {
        result.current.enterSlideshow();
      });

      // Wait for potential auto-advance
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should not have advanced further (still img-1 or img-2 depending on timing)
      // The key is that auto-cycle stopped
      const currentId = result.current.selectedImageId;

      // Wait more to confirm no further changes
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.selectedImageId).toBe(currentId);
    });

    it("should resume auto-cycle when exiting slideshow", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "img-1",
          autoSelectInterval: 1000,
        })
      );

      // Enter slideshow
      act(() => {
        result.current.enterSlideshow();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Exit slideshow
      act(() => {
        result.current.exitSlideshow();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Now in grid mode again, wait for auto-cycle
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.selectedImageId).toBe("img-2");
    });

    it("should not auto-cycle when autoSelectInterval is 0", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          autoSelectInterval: 0,
        })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.selectedImageId).toBeNull();
    });

    it("should not auto-cycle when autoSelectInterval is negative", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          autoSelectInterval: -1000,
        })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.selectedImageId).toBeNull();
    });

    it("should not auto-cycle when images is empty", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: [],
          autoSelectInterval: 1000,
        })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.selectedImageId).toBeNull();
    });

    it("should reset to first image when selection becomes invalid during auto-cycle", () => {
      const { result, rerender } = renderHook(
        ({ images }) =>
          useSmartGallery({
            images,
            initialSelectedId: "img-2",
            autoSelectInterval: 1000,
          }),
        { initialProps: { images: mockImages } },
      );

      expect(result.current.selectedImageId).toBe("img-2");

      // Change images to remove current selection
      const newImages: GalleryImage[] = [
        {
          id: "new-1",
          url: "https://example.com/new1.jpg",
          originalUrl: "https://example.com/new-original1.jpg",
          enhancedUrl: null,
          name: "New Image 1",
          width: 1920,
          height: 1080,
        },
      ];

      rerender({ images: newImages });

      // Selection should be cleared since img-2 no longer exists
      expect(result.current.selectedImageId).toBeNull();
    });
  });

  describe("images prop changes", () => {
    it("should reset selection when images become empty", () => {
      const { result, rerender } = renderHook(
        ({ images }) =>
          useSmartGallery({
            images,
            initialSelectedId: "img-1",
          }),
        { initialProps: { images: mockImages } },
      );

      expect(result.current.selectedImageId).toBe("img-1");

      rerender({ images: [] });

      expect(result.current.selectedImageId).toBeNull();
    });

    it("should clear selection when selected image is removed", () => {
      const { result, rerender } = renderHook(
        ({ images }) =>
          useSmartGallery({
            images,
            initialSelectedId: "img-2",
          }),
        { initialProps: { images: mockImages } },
      );

      expect(result.current.selectedImageId).toBe("img-2");

      // Remove img-2 from images
      const newImages = mockImages.filter((img) => img.id !== "img-2");
      rerender({ images: newImages });

      expect(result.current.selectedImageId).toBeNull();
    });

    it("should keep selection when image still exists after update", () => {
      const { result, rerender } = renderHook(
        ({ images }) =>
          useSmartGallery({
            images,
            initialSelectedId: "img-1",
          }),
        { initialProps: { images: mockImages } },
      );

      expect(result.current.selectedImageId).toBe("img-1");

      // Update images but keep img-1
      const newImages: GalleryImage[] = [
        mockImages[0]!,
        {
          id: "new-2",
          url: "https://example.com/new2.jpg",
          originalUrl: "https://example.com/new-original2.jpg",
          enhancedUrl: null,
          name: "New Image 2",
          width: 1920,
          height: 1080,
        },
      ];

      rerender({ images: newImages });

      expect(result.current.selectedImageId).toBe("img-1");
    });
  });

  describe("cleanup", () => {
    it("should cleanup auto-cycle timer on unmount", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const { unmount } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          autoSelectInterval: 1000,
        })
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("should cleanup transition timeout on unmount", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { result, unmount } = renderHook(() => useSmartGallery({ images: mockImages }));

      // Start a transition
      act(() => {
        result.current.enterSlideshow();
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe("function stability", () => {
    it("should maintain stable selectImage reference", () => {
      const { result, rerender } = renderHook(() => useSmartGallery({ images: mockImages }));

      const firstRef = result.current.selectImage;

      act(() => {
        result.current.selectImage("img-1");
      });

      rerender();

      expect(result.current.selectImage).toBe(firstRef);
    });

    it("should maintain stable goToNext reference", () => {
      const { result, rerender } = renderHook(() => useSmartGallery({ images: mockImages }));

      const firstRef = result.current.goToNext;

      rerender();

      expect(result.current.goToNext).toBe(firstRef);
    });

    it("should maintain stable goToPrev reference", () => {
      const { result, rerender } = renderHook(() => useSmartGallery({ images: mockImages }));

      const firstRef = result.current.goToPrev;

      rerender();

      expect(result.current.goToPrev).toBe(firstRef);
    });

    it("should maintain stable peek function references", () => {
      const { result, rerender } = renderHook(() => useSmartGallery({ images: mockImages }));

      const startPeekRef = result.current.startPeek;
      const endPeekRef = result.current.endPeek;

      rerender();

      expect(result.current.startPeek).toBe(startPeekRef);
      expect(result.current.endPeek).toBe(endPeekRef);
    });

    it("should maintain stable transition origin function references", () => {
      const { result, rerender } = renderHook(() => useSmartGallery({ images: mockImages }));

      const getRef = result.current.getTransitionOrigin;
      const setRef = result.current.setTransitionOrigin;

      rerender();

      expect(result.current.getTransitionOrigin).toBe(getRef);
      expect(result.current.setTransitionOrigin).toBe(setRef);
    });
  });

  describe("edge cases", () => {
    it("should handle single image array", () => {
      const singleImage: GalleryImage[] = [mockImages[0]!];

      const { result } = renderHook(() =>
        useSmartGallery({
          images: singleImage,
          initialSelectedId: "img-1",
        })
      );

      expect(result.current.currentIndex).toBe(0);

      // Next should wrap to same image
      act(() => {
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.selectedImageId).toBe("img-1");

      // Prev should also wrap to same image
      act(() => {
        result.current.goToPrev();
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.selectedImageId).toBe("img-1");
    });

    it("should handle auto-cycle resetting to first image when current selection is invalid", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "non-existent",
          autoSelectInterval: 1000,
        })
      );

      // Current selection is invalid
      expect(result.current.currentIndex).toBe(-1);

      // Auto-cycle should reset to first image
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.selectedImageId).toBe("img-1");
    });

    it("should handle rapid enter/exit with auto-cycle resume", () => {
      const { result } = renderHook(() =>
        useSmartGallery({
          images: mockImages,
          initialSelectedId: "img-1",
          autoSelectInterval: 500,
        })
      );

      // Enter slideshow
      act(() => {
        result.current.enterSlideshow();
      });

      // Immediately exit
      act(() => {
        result.current.exitSlideshow();
      });

      // Wait for transition to complete
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Auto-cycle should resume
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.selectedImageId).toBe("img-2");
    });
  });
});
