"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// Log broken images to server for monitoring
async function logBrokenImage(imageType: string, url: string) {
  try {
    await fetch("/api/logs/image-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: `COMPARISON_${imageType}_LOAD_ERROR`,
        versionId: "comparison-slider",
        tier: imageType,
        url,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error("[Image Error Logging Failed]", e);
  }
}

interface ImageComparisonSliderProps {
  originalUrl: string;
  enhancedUrl: string;
  originalLabel?: string;
  enhancedLabel?: string;
  /** Width of the original image. Used to calculate aspect ratio. Defaults to 16. */
  width?: number;
  /** Height of the original image. Used to calculate aspect ratio. Defaults to 9. */
  height?: number;
}

/**
 * A slider component to compare original and enhanced images.
 * Uses object-cover to ensure images fill the container, and dynamic aspect ratio
 * to match the original image dimensions.
 */
export function ImageComparisonSlider({
  originalUrl,
  enhancedUrl,
  originalLabel = "Original",
  enhancedLabel = "Enhanced",
  width = 16,
  height = 9,
}: ImageComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [enhancedError, setEnhancedError] = useState(false);
  const [originalError, setOriginalError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure valid dimensions to prevent CSS errors
  const safeWidth = Math.max(1, Number(width) || 16);
  const safeHeight = Math.max(1, Number(height) || 9);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    updatePosition(clientX);
  }, [updatePosition]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    updatePosition(clientX);
  }, [isDragging, updatePosition]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse event handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  }, [handleDragStart]);

  // Touch event handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      handleDragStart(touch.clientX);
    }
  }, [handleDragStart]);

  // Document-level listeners for drag continuation
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleDragMove(touch.clientX);
      }
    };

    const onEnd = () => {
      handleDragEnd();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("touchend", onEnd);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleEnhancedError = () => {
    console.error(`[Enhanced Image Load Error] URL: ${enhancedUrl}`);
    setEnhancedError(true);
    logBrokenImage("ENHANCED", enhancedUrl);
  };

  const handleOriginalError = () => {
    console.error(`[Original Image Load Error] URL: ${originalUrl}`);
    setOriginalError(true);
    logBrokenImage("ORIGINAL", originalUrl);
  };

  return (
    <div>
      <div
        ref={containerRef}
        className="relative bg-muted rounded-lg overflow-hidden w-full select-none cursor-ew-resize"
        style={{ aspectRatio: `${safeWidth} / ${safeHeight}`, touchAction: "none" }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* Enhanced image (background) */}
        {!enhancedError
          ? (
            <Image
              src={enhancedUrl}
              alt={enhancedLabel}
              fill
              className="object-cover"
              priority
              onError={handleEnhancedError}
            />
          )
          : (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
              <p className="text-sm text-destructive">Enhanced image failed to load</p>
            </div>
          )}

        {/* Original image (clipped overlay) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          {!originalError
            ? (
              <Image
                src={originalUrl}
                alt={originalLabel}
                fill
                className="object-cover"
                priority
                onError={handleOriginalError}
              />
            )
            : (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                <p className="text-sm text-destructive">Original image failed to load</p>
              </div>
            )}
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
          style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
        />

        {/* Labels */}
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
          {originalLabel}
        </div>
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
          {enhancedLabel}
        </div>
      </div>
    </div>
  );
}
