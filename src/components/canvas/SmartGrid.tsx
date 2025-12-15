"use client";

import type { GalleryImage } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";
import { forwardRef, useCallback, useRef } from "react";
import Masonry from "react-masonry-css";
import { GridThumbnail } from "./GridThumbnail";

const masonryBreakpoints = {
  default: 4,
  1024: 3,
  768: 2,
  640: 2,
};

export interface SmartGridProps {
  images: GalleryImage[];
  selectedImageId: string | null;
  onImageSelect: (id: string, element: HTMLElement) => void;
  onEnterSlideshow: () => void;
  isBlurred?: boolean;
  rotation?: 0 | 90 | 180 | 270;
  className?: string;
}

/**
 * SmartGrid component displays a responsive masonry grid of gallery images.
 *
 * Features:
 * - Responsive masonry layout (2 cols mobile, 3 cols tablet, 4 cols desktop)
 * - Fade in/out animation when transitioning to/from slideshow
 * - CSS rotation support
 * - Accessible with proper ARIA attributes
 * - Forwards keyboard navigation events to parent
 */
export const SmartGrid = forwardRef<HTMLDivElement, SmartGridProps>(
  function SmartGrid(
    {
      images,
      selectedImageId,
      onImageSelect,
      onEnterSlideshow,
      isBlurred = false,
      rotation = 0,
      className,
    },
    ref,
  ) {
    const thumbnailRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const handleDoubleClick = useCallback(
      (id: string) => {
        // Select the image first, then enter slideshow
        // The element is guaranteed to exist since this callback
        // is only called from rendered GridThumbnail components
        const element = thumbnailRefs.current.get(id);
        // Use non-null assertion since the element must exist when this is called
        onImageSelect(id, element!);
        onEnterSlideshow();
      },
      [onImageSelect, onEnterSlideshow],
    );

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        // Enter key on the grid triggers slideshow mode
        if (event.key === "Enter" && selectedImageId) {
          event.preventDefault();
          onEnterSlideshow();
        }
      },
      [selectedImageId, onEnterSlideshow],
    );

    const setThumbnailRef = useCallback(
      (id: string) => (element: HTMLDivElement | null) => {
        if (element) {
          thumbnailRefs.current.set(id, element);
        } else {
          thumbnailRefs.current.delete(id);
        }
      },
      [],
    );

    // Calculate rotation transform
    const rotationTransform = rotation !== 0
      ? `rotate(${rotation}deg)`
      : undefined;

    return (
      <div
        ref={ref}
        role="grid"
        aria-label="Photo gallery"
        onKeyDown={handleKeyDown}
        data-testid="smart-grid"
        style={{
          transform: rotationTransform,
        }}
        className={cn(
          "p-4",
          isBlurred && "animate-grid-fade-out",
          !isBlurred && "animate-grid-fade-in",
          className,
        )}
      >
        <Masonry
          breakpointCols={masonryBreakpoints}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-clip-padding"
        >
          {images.map((image) => (
            <GridThumbnail
              key={image.id}
              ref={setThumbnailRef(image.id)}
              image={image}
              isSelected={selectedImageId === image.id}
              onSelect={onImageSelect}
              onDoubleClick={handleDoubleClick}
            />
          ))}
        </Masonry>
      </div>
    );
  },
);
