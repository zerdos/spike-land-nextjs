import type { CSSProperties, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseHeroAnimationOptions {
  isActive: boolean;
  direction: "expand" | "collapse";
  originRect: DOMRect | null;
  onAnimationComplete?: () => void;
  animationDuration?: number; // in milliseconds, defaults to 300
}

export interface UseHeroAnimationReturn {
  animationRef: RefObject<HTMLDivElement | null>;
  isAnimating: boolean;
  animationStyles: CSSProperties;
}

// FLIP animation constants
const DEFAULT_ANIMATION_DURATION = 300;

/**
 * Calculates the scale factor needed to transform from origin size to target size
 */
function calculateScale(
  originRect: DOMRect,
  targetWidth: number,
  targetHeight: number,
): number {
  const scaleX = originRect.width / targetWidth;
  const scaleY = originRect.height / targetHeight;
  // Use the minimum scale to maintain aspect ratio
  return Math.min(scaleX, scaleY);
}

/**
 * Calculates the translation needed to move from target center to origin center
 */
function calculateTranslation(
  originRect: DOMRect,
  targetRect: DOMRect,
): { x: number; y: number; } {
  const originCenterX = originRect.left + originRect.width / 2;
  const originCenterY = originRect.top + originRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  return {
    x: originCenterX - targetCenterX,
    y: originCenterY - targetCenterY,
  };
}

export function useHeroAnimation({
  isActive,
  direction,
  originRect,
  onAnimationComplete,
  animationDuration = DEFAULT_ANIMATION_DURATION,
}: UseHeroAnimationOptions): UseHeroAnimationReturn {
  const animationRef = useRef<HTMLDivElement | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousActiveRef = useRef<boolean>(false);

  // Calculate animation styles based on current state
  const getAnimationStyles = useCallback((): CSSProperties => {
    if (!originRect || !isActive) {
      return {
        "--hero-x": "0px",
        "--hero-y": "0px",
        "--hero-scale": "1",
        "--hero-duration": `${animationDuration}ms`,
      } as CSSProperties;
    }

    const element = animationRef.current;
    if (!element) {
      return {
        "--hero-x": "0px",
        "--hero-y": "0px",
        "--hero-scale": "1",
        "--hero-duration": `${animationDuration}ms`,
      } as CSSProperties;
    }

    const targetRect = element.getBoundingClientRect();
    const scale = calculateScale(originRect, targetRect.width, targetRect.height);
    const translation = calculateTranslation(originRect, targetRect);

    if (direction === "expand") {
      // Starting from small (origin) to large (target)
      // Initial values should be the transform FROM origin
      return {
        "--hero-x": `${translation.x}px`,
        "--hero-y": `${translation.y}px`,
        "--hero-scale": String(scale),
        "--hero-duration": `${animationDuration}ms`,
      } as CSSProperties;
    } else {
      // Collapsing from large (current) to small (origin)
      return {
        "--hero-x": `${translation.x}px`,
        "--hero-y": `${translation.y}px`,
        "--hero-scale": String(scale),
        "--hero-duration": `${animationDuration}ms`,
      } as CSSProperties;
    }
  }, [originRect, isActive, direction, animationDuration]);

  // Trigger animation when isActive changes
  useEffect(() => {
    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    // Detect activation change
    const wasActive = previousActiveRef.current;
    previousActiveRef.current = isActive;

    if (isActive && !wasActive) {
      // Starting animation
      setIsAnimating(true);

      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
        animationTimeoutRef.current = null;
        onAnimationComplete?.();
      }, animationDuration);
    } else if (!isActive && wasActive) {
      // Stopping animation
      setIsAnimating(true);

      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
        animationTimeoutRef.current = null;
        onAnimationComplete?.();
      }, animationDuration);
    }
  }, [isActive, animationDuration, onAnimationComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const animationStyles = getAnimationStyles();

  return {
    animationRef,
    isAnimating,
    animationStyles,
  };
}
