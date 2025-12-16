import type { CanvasImage, CanvasOrder } from "@/lib/canvas/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseSlideshowOptions {
  images: CanvasImage[];
  interval: number;
  order: CanvasOrder;
  autoPlay?: boolean;
}

interface UseSlideshowReturn {
  currentImage: CanvasImage | null;
  currentIndex: number;
  nextImage: CanvasImage | null;
  isTransitioning: boolean;
  goToNext: () => void;
  goToPrev: () => void;
  pause: () => void;
  play: () => void;
  isPaused: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  return shuffled;
}

export function useSlideshow({
  images,
  interval,
  order,
  autoPlay = true,
}: UseSlideshowOptions): UseSlideshowReturn {
  const [orderedImages, setOrderedImages] = useState<CanvasImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(!autoPlay);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Order images based on order setting
  useEffect(() => {
    if (images.length === 0) {
      setOrderedImages([]);
      return;
    }

    const ordered = order === "random" ? shuffleArray(images) : [...images];
    setOrderedImages(ordered);
    setCurrentIndex(0);
  }, [images, order]);

  // Preload next image with LRU eviction
  useEffect(() => {
    if (orderedImages.length === 0) return;

    const nextIdx = (currentIndex + 1) % orderedImages.length;
    const nextImg = orderedImages[nextIdx];

    if (nextImg && !preloadedImagesRef.current.has(nextImg.id)) {
      // LRU eviction: keep max 3 preloaded images
      const MAX_PRELOADED = 3;
      if (preloadedImagesRef.current.size >= MAX_PRELOADED) {
        const firstKey = preloadedImagesRef.current.keys().next().value;
        if (firstKey) {
          preloadedImagesRef.current.delete(firstKey);
        }
      }

      const img = new Image();
      img.src = nextImg.url;
      preloadedImagesRef.current.set(nextImg.id, img);
    }
  }, [currentIndex, orderedImages]);

  const goToNext = useCallback(() => {
    if (orderedImages.length === 0) return;

    // Clear any existing transition timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    setIsTransitioning(true);
    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % orderedImages.length);
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, 300);
  }, [orderedImages.length]);

  const goToPrev = useCallback(() => {
    if (orderedImages.length === 0) return;

    // Clear any existing transition timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    setIsTransitioning(true);
    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex((prev) => prev === 0 ? orderedImages.length - 1 : prev - 1);
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, 300);
  }, [orderedImages.length]);

  const pause = useCallback(() => {
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Auto-advance with interval
  useEffect(() => {
    if (isPaused || orderedImages.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      goToNext();
    }, interval * 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPaused, orderedImages.length, interval, goToNext]);

  // Cleanup on unmount
  useEffect(() => {
    const preloadedImages = preloadedImagesRef.current;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      preloadedImages.clear();
    };
  }, []);

  const currentImage: CanvasImage | null = orderedImages.length > 0
    ? orderedImages[currentIndex] ?? null
    : null;
  const nextImage: CanvasImage | null = orderedImages.length > 0
    ? orderedImages[(currentIndex + 1) % orderedImages.length] ?? null
    : null;

  return {
    currentImage,
    currentIndex,
    nextImage,
    isTransitioning,
    goToNext,
    goToPrev,
    pause,
    play,
    isPaused,
  };
}
