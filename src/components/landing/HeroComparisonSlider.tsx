"use client";

import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";

interface HeroComparisonSliderProps {
  originalUrl: string;
  enhancedUrl: string;
  className?: string;
}

export function HeroComparisonSlider({
  originalUrl,
  enhancedUrl,
  className,
}: HeroComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      handleMove(e.clientX);
    },
    [handleMove],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    },
    [isDragging, handleMove],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX);
      }
      setIsDragging(true);
    },
    [handleMove],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX);
      }
    },
    [handleMove],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = 5;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + step));
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full aspect-video overflow-hidden rounded-2xl border border-border/50 shadow-2xl cursor-ew-resize select-none",
        className,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      role="slider"
      aria-label="Image comparison slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(sliderPosition)}
      tabIndex={0}
    >
      {/* Enhanced image (full width, underneath) */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic comparison slider requires native img for clip-path */}
        <img
          src={enhancedUrl}
          alt="Enhanced"
          className="w-full h-full object-cover"
          draggable={false}
        />
        {/* Enhanced label */}
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-full border border-border/50">
          Enhanced by Pixel
        </div>
      </div>

      {/* Original image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden transition-[width] duration-75 ease-out"
        style={{ width: `${sliderPosition}%` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic comparison slider requires native img for clip-path */}
        <img
          src={originalUrl}
          alt="Original"
          className="w-full h-full object-cover"
          style={{
            width: `${100 / (sliderPosition / 100)}%`,
            maxWidth: "none",
          }}
          draggable={false}
        />
        {/* Original label */}
        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-full border border-border/50">
          Original
        </div>
      </div>

      {/* Slider line and handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-primary shadow-[0_0_12px_rgba(0,200,255,0.6)] cursor-ew-resize transition-[left] duration-75 ease-out"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-label="Drag to compare images"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(sliderPosition)}
        tabIndex={0}
      >
        {/* Handle circle with arrows and spark icon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-glow-cyan cursor-ew-resize transition-transform hover:scale-110 active:scale-95">
          {/* Left arrow */}
          <svg
            className="absolute left-1.5 w-3 h-3 text-primary-foreground opacity-80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {/* Spark icon center */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="text-primary-foreground"
          >
            <path
              d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
              fill="currentColor"
            />
          </svg>
          {/* Right arrow */}
          <svg
            className="absolute right-1.5 w-3 h-3 text-primary-foreground opacity-80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
