"use client";

import type { GalleryImage } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { forwardRef, useCallback, useState } from "react";

export interface GridThumbnailProps {
  image: GalleryImage;
  isSelected: boolean;
  onSelect: (id: string, element: HTMLElement) => void;
  onDoubleClick?: (id: string) => void;
  className?: string;
}

/**
 * GridThumbnail component displays an individual image in the gallery grid.
 *
 * Features:
 * - Shows original image by default
 * - When selected, swaps to enhanced image (if available) with neon glow effect
 * - Handles image load errors gracefully
 * - Forwards ref for FLIP animation origin tracking
 * - Accessible with proper ARIA attributes
 */
export const GridThumbnail = forwardRef<HTMLDivElement, GridThumbnailProps>(
  function GridThumbnail(
    { image, isSelected, onSelect, onDoubleClick, className },
    ref,
  ) {
    const [imageError, setImageError] = useState(false);

    // Determine which image URL to display
    // When selected and enhanced version is available, show enhanced
    // Otherwise show original
    const displayUrl = isSelected && image.enhancedUrl && !imageError
      ? image.enhancedUrl
      : image.originalUrl;

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        onSelect(image.id, event.currentTarget);
      },
      [image.id, onSelect],
    );

    const handleDoubleClick = useCallback(() => {
      onDoubleClick?.(image.id);
    }, [image.id, onDoubleClick]);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(image.id, event.currentTarget);
        }
      },
      [image.id, onSelect],
    );

    const handleImageError = useCallback(() => {
      setImageError(true);
    }, []);

    return (
      <div
        ref={ref}
        role="gridcell"
        aria-selected={isSelected}
        tabIndex={0}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        data-testid={`grid-thumbnail-${image.id}`}
        className={cn(
          "relative aspect-square cursor-pointer overflow-hidden rounded-xl",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          isSelected && [
            "ring-2 ring-primary",
            "shadow-glow-cyan",
            "animate-pulse-cyan",
          ],
          className,
        )}
      >
        {imageError
          ? (
            <div
              className="flex h-full w-full items-center justify-center bg-muted"
              data-testid="image-error-fallback"
            >
              <span className="text-sm text-muted-foreground">
                Failed to load
              </span>
            </div>
          )
          : (
            <Image
              src={displayUrl}
              alt={image.name || "Gallery image"}
              fill
              sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
              className="object-cover"
              onError={handleImageError}
            />
          )}
      </div>
    );
  },
);
