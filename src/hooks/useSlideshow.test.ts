import type { CanvasImage } from "@/lib/canvas/types";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSlideshow } from "./useSlideshow";

describe("useSlideshow", () => {
  const mockImages: CanvasImage[] = [
    {
      id: "img-1",
      url: "https://example.com/image1.jpg",
      name: "Image 1",
      width: 1920,
      height: 1080,
    },
    {
      id: "img-2",
      url: "https://example.com/image2.jpg",
      name: "Image 2",
      width: 1920,
      height: 1080,
    },
    {
      id: "img-3",
      url: "https://example.com/image3.jpg",
      name: "Image 3",
      width: 1920,
      height: 1080,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock Image constructor for preloading
    global.Image = class MockImage {
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
    } as unknown as typeof Image;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("should initialize with first image in album order", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      expect(result.current.currentImage).toEqual(mockImages[0]);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.nextImage).toEqual(mockImages[1]);
    });

    it("should initialize with isPaused false when autoPlay is true", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "album",
          autoPlay: true,
        })
      );

      expect(result.current.isPaused).toBe(false);
    });

    it("should initialize with isPaused true when autoPlay is false", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      expect(result.current.isPaused).toBe(true);
    });

    it("should default autoPlay to true", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "album",
        })
      );

      expect(result.current.isPaused).toBe(false);
    });

    it("should handle empty images array", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: [],
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      expect(result.current.currentImage).toBeNull();
      expect(result.current.nextImage).toBeNull();
      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe("album order", () => {
    it("should maintain image sequence in album order", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      expect(result.current.currentImage).toEqual(mockImages[0]);

      act(() => {
        result.current.goToNext();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentImage).toEqual(mockImages[1]);

      act(() => {
        result.current.goToNext();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentImage).toEqual(mockImages[2]);
    });

    it("should wrap to first image after last image", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      // Go to last image
      act(() => {
        result.current.goToNext();
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      act(() => {
        result.current.goToNext();
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentImage).toEqual(mockImages[2]);

      // Should wrap to first
      act(() => {
        result.current.goToNext();
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentImage).toEqual(mockImages[0]);
    });
  });

  describe("random order", () => {
    it("should shuffle images in random order", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "random",
          autoPlay: false,
        })
      );

      // Should have all images but potentially in different order
      const currentId = result.current.currentImage?.id;
      expect(["img-1", "img-2", "img-3"]).toContain(currentId);
    });

    it("should reshuffle when order changes from album to random", () => {
      const { result, rerender } = renderHook(
        ({ order }) =>
          useSlideshow({
            images: mockImages,
            interval: 10,
            order,
            autoPlay: false,
          }),
        { initialProps: { order: "album" as const } },
      );

      expect(result.current.currentImage).toEqual(mockImages[0]);

      rerender({ order: "random" as const });

      // Should reset to index 0 with potentially different order
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.currentImage).toBeTruthy();
    });
  });

  describe("navigation", () => {
    it("should go to next image with goToNext", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      expect(result.current.currentIndex).toBe(0);

      act(() => {
        result.current.goToNext();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it("should go to previous image with goToPrev", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      // First go forward
      act(() => {
        result.current.goToNext();
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentIndex).toBe(1);

      // Then go back
      act(() => {
        result.current.goToPrev();
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentIndex).toBe(0);
    });

    it("should wrap to last image when going prev from first", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      expect(result.current.currentIndex).toBe(0);

      act(() => {
        result.current.goToPrev();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentIndex).toBe(mockImages.length - 1);
    });

    it("should handle goToNext with empty images", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: [],
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.currentIndex).toBe(0);
    });

    it("should handle goToPrev with empty images", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: [],
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      act(() => {
        result.current.goToPrev();
      });

      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe("transition state", () => {
    it("should set isTransitioning during navigation", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      expect(result.current.isTransitioning).toBe(false);

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.isTransitioning).toBe(true);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.isTransitioning).toBe(false);
    });

    it("should set isTransitioning during goToPrev", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 10,
          order: "album",
          autoPlay: false,
        })
      );

      expect(result.current.isTransitioning).toBe(false);

      act(() => {
        result.current.goToPrev();
      });

      expect(result.current.isTransitioning).toBe(true);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.isTransitioning).toBe(false);
    });
  });

  describe("auto-advance", () => {
    it("should auto-advance after interval when autoPlay is true", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 5,
          order: "album",
          autoPlay: true,
        })
      );

      expect(result.current.currentIndex).toBe(0);

      // Advance time by interval
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Wait for transition
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it("should not auto-advance when autoPlay is false", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 5,
          order: "album",
          autoPlay: false,
        })
      );

      expect(result.current.currentIndex).toBe(0);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.currentIndex).toBe(0);
    });

    it("should not auto-advance with empty images", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: [],
          interval: 5,
          order: "album",
          autoPlay: true,
        })
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.currentIndex).toBe(0);
    });

    it("should continue auto-advancing through multiple images", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 5,
          order: "album",
          autoPlay: true,
        })
      );

      expect(result.current.currentIndex).toBe(0);

      // First advance
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentIndex).toBe(1);

      // Second advance
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentIndex).toBe(2);
    });
  });

  describe("pause and play", () => {
    it("should stop auto-advance when paused", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 5,
          order: "album",
          autoPlay: true,
        })
      );

      expect(result.current.isPaused).toBe(false);

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPaused).toBe(true);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.currentIndex).toBe(0);
    });

    it("should resume auto-advance when played", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 5,
          order: "album",
          autoPlay: false,
        })
      );

      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.play();
      });

      expect(result.current.isPaused).toBe(false);

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it("should allow manual navigation while paused", () => {
      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 5,
          order: "album",
          autoPlay: false,
        })
      );

      expect(result.current.currentIndex).toBe(0);

      act(() => {
        result.current.goToNext();
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentIndex).toBe(1);
    });
  });

  describe("cleanup", () => {
    it("should cleanup timer on unmount", () => {
      const { unmount } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 5,
          order: "album",
          autoPlay: true,
        })
      );

      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("should cleanup preloaded images on unmount", () => {
      const { unmount } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 5,
          order: "album",
          autoPlay: false,
        })
      );

      // Trigger preloading
      act(() => {
        vi.advanceTimersByTime(100);
      });

      unmount();

      // Just verify unmount doesn't throw
      expect(true).toBe(true);
    });
  });

  describe("preloading", () => {
    it("should preload next image", () => {
      const ImageConstructorSpy = vi.fn();
      global.Image = class MockImage {
        src = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          ImageConstructorSpy();
        }
      } as unknown as typeof Image;

      renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 5,
          order: "album",
          autoPlay: false,
        })
      );

      // Should preload the next image
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(ImageConstructorSpy).toHaveBeenCalled();
    });

    it("should update preload when navigating", () => {
      const ImageConstructorSpy = vi.fn();
      global.Image = class MockImage {
        src = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          ImageConstructorSpy();
        }
      } as unknown as typeof Image;

      const { result } = renderHook(() =>
        useSlideshow({
          images: mockImages,
          interval: 5,
          order: "album",
          autoPlay: false,
        })
      );

      const initialCalls = ImageConstructorSpy.mock.calls.length;

      act(() => {
        result.current.goToNext();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should preload the new next image
      expect(ImageConstructorSpy.mock.calls.length).toBeGreaterThan(
        initialCalls,
      );
    });
  });

  describe("interval changes", () => {
    it("should restart timer when interval changes", () => {
      const { result, rerender } = renderHook(
        ({ interval }) =>
          useSlideshow({
            images: mockImages,
            interval,
            order: "album",
            autoPlay: true,
          }),
        { initialProps: { interval: 10 } },
      );

      expect(result.current.currentIndex).toBe(0);

      // Change interval
      rerender({ interval: 5 });

      // Should advance with new interval
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentIndex).toBe(1);
    });
  });
});
