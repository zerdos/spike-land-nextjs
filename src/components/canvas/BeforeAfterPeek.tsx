"use client";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ANIMATION_DURATIONS } from "@/lib/canvas/animations";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface BeforeAfterPeekProps {
  originalUrl: string;
  isActive: boolean;
  label?: string;
}

/**
 * Overlay component for peeking at the original image.
 * Shows the original version of an enhanced image with a fast fade transition.
 * Used in the slideshow view to compare before/after enhancements.
 */
export function BeforeAfterPeek({
  originalUrl,
  isActive,
  label = "Original",
}: BeforeAfterPeekProps) {
  // Check if user prefers reduced motion (hydration-safe)
  const prefersReducedMotion = useReducedMotion();

  // Transition duration matches the animation constants
  const transitionDuration = prefersReducedMotion
    ? 0
    : ANIMATION_DURATIONS.peekTransition;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10",
        "transition-opacity",
        isActive ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      style={{ transitionDuration: `${transitionDuration}ms` }}
      data-testid="before-after-peek"
      aria-hidden={!isActive}
    >
      {/* Original image */}
      <Image
        src={originalUrl}
        alt="Original image"
        fill
        className="object-contain"
        priority={isActive}
        sizes="100vw"
        data-testid="before-after-peek-image"
      />

      {/* Label badge */}
      <div
        className={cn(
          "absolute top-4 left-4 z-20",
          "bg-black/60 backdrop-blur-sm",
          "text-white/90 text-sm font-medium",
          "rounded-full px-4 py-1.5",
          "shadow-lg",
          "transition-opacity",
          isActive ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${transitionDuration}ms` }}
        data-testid="before-after-peek-label"
      >
        {label}
      </div>
    </div>
  );
}
