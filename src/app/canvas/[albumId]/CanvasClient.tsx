"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface CanvasImage {
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
}

export interface CanvasSettings {
  rotation: 0 | 90 | 180 | 270;
  order: "album" | "random";
  interval: number;
}

export interface CanvasClientProps {
  images: CanvasImage[];
  settings: CanvasSettings;
  albumName: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j] as T;
    shuffled[j] = temp as T;
  }
  return shuffled;
}

export function CanvasClient({ images, settings, albumName }: CanvasClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Shuffle images if order is random (only on mount)
  const displayImages = useMemo(() => {
    if (settings.order === "random" && images.length > 0) {
      return shuffleArray(images);
    }
    return images;
  }, [images, settings.order]);

  // Current image to display
  const currentImage = displayImages[currentIndex];
  const nextIndex = (currentIndex + 1) % displayImages.length;
  const nextImage = displayImages[nextIndex];

  // Auto-advance slideshow
  useEffect(() => {
    if (displayImages.length <= 1) return;

    const intervalMs = settings.interval * 1000;
    const timer = setInterval(() => {
      setIsTransitioning(true);
      // After fade out, change image
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % displayImages.length);
        setImageError(false);
        setIsTransitioning(false);
      }, 500); // 500ms for fade transition
    }, intervalMs);

    return () => clearInterval(timer);
  }, [displayImages.length, settings.interval]);

  // Hide cursor after 3s idle
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const hide = () => {
      document.body.style.cursor = "none";
    };

    const show = () => {
      document.body.style.cursor = "auto";
      clearTimeout(timeout);
      timeout = setTimeout(hide, 3000);
    };

    document.addEventListener("mousemove", show);
    timeout = setTimeout(hide, 3000);

    return () => {
      document.removeEventListener("mousemove", show);
      clearTimeout(timeout);
      document.body.style.cursor = "auto";
    };
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Handle empty images array gracefully
  if (displayImages.length === 0) {
    return (
      <div
        className="min-h-screen bg-black flex items-center justify-center"
        data-testid="canvas-empty"
      >
        <p className="text-white/50 text-lg">No images in this album</p>
      </div>
    );
  }

  // Calculate container dimensions for rotation
  // For 90 and 270 degree rotation, we need to swap width/height
  const needsSwap = settings.rotation === 90 || settings.rotation === 270;
  const containerStyle: React.CSSProperties = needsSwap
    ? {
      width: "100vh",
      height: "100vw",
    }
    : {
      width: "100vw",
      height: "100vh",
    };

  return (
    <div
      className="min-h-screen bg-black overflow-hidden"
      data-testid="canvas-container"
      aria-label={`Canvas display: ${albumName}`}
    >
      {/* Main image container */}
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          transform: `rotate(${settings.rotation}deg)`,
          ...containerStyle,
        }}
        data-testid="canvas-rotation-container"
      >
        {/* Current image with fade transition */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            isTransitioning ? "opacity-0" : "opacity-100"
          }`}
          data-testid="canvas-image-wrapper"
        >
          {currentImage && !imageError && (
            <Image
              src={currentImage.url}
              alt={currentImage.name}
              fill
              className="object-contain"
              priority
              onError={handleImageError}
              data-testid="canvas-current-image"
            />
          )}
          {imageError && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              data-testid="canvas-image-error"
            >
              <p className="text-white/50">Failed to load image</p>
            </div>
          )}
        </div>

        {/* Preload next image (hidden) */}
        {nextImage && displayImages.length > 1 && (
          <div className="absolute inset-0 opacity-0 pointer-events-none" aria-hidden="true">
            <Image
              src={nextImage.url}
              alt={nextImage.name}
              fill
              className="object-contain"
              data-testid="canvas-preload-image"
            />
          </div>
        )}
      </div>
    </div>
  );
}
