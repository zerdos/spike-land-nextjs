"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useCallback, useState } from "react";

interface DragPreviewImage {
  id: string;
  url: string;
}

interface DragPreviewProps {
  images: DragPreviewImage[];
  position: { x: number; y: number; };
  visible: boolean;
}

/**
 * Custom drag preview component that shows selected images during drag operations.
 * Renders as a fixed overlay that follows the cursor position.
 */
export function DragPreview({ images, position, visible }: DragPreviewProps) {
  if (!visible || images.length === 0) {
    return null;
  }

  const displayImages = images.slice(0, 3);
  const extraCount = images.length - 3;
  const hasMultiple = images.length > 1;

  return (
    <div
      className={cn(
        "fixed pointer-events-none z-50",
        "transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
      data-testid="drag-preview"
      aria-hidden="true"
    >
      <div className="relative w-20 h-20">
        {displayImages.map((image, index) => {
          const isFirst = index === 0;
          const rotation = isFirst ? 0 : index === 1 ? -6 : 6;
          const offsetX = isFirst ? 0 : index === 1 ? -4 : 4;
          const offsetY = isFirst ? 0 : index === 1 ? -2 : 2;
          const zIndex = 30 - index * 10;

          return (
            <div
              key={image.id}
              className={cn(
                "absolute inset-0 rounded-lg overflow-hidden",
                "bg-background shadow-lg border border-border/50",
                "transition-transform duration-100",
              )}
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`,
                zIndex,
                opacity: isFirst ? 0.9 : 0.7,
              }}
              data-testid={`drag-preview-image-${index}`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            </div>
          );
        })}

        {hasMultiple && (
          <div
            className={cn(
              "absolute -top-2 -right-2 z-50",
              "min-w-6 h-6 px-1.5",
              "flex items-center justify-center",
              "bg-primary text-primary-foreground",
              "text-xs font-semibold",
              "rounded-full shadow-md",
              "border-2 border-background",
            )}
            data-testid="drag-preview-count"
          >
            {extraCount > 0 ? `+${extraCount}` : images.length}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to manage drag preview state and position.
 * Returns handlers and state for use with drag operations.
 */
export function useDragPreview() {
  const [previewState, setPreviewState] = useState<{
    visible: boolean;
    position: { x: number; y: number; };
    images: DragPreviewImage[];
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    images: [],
  });

  const showPreview = useCallback((images: DragPreviewImage[], x: number, y: number) => {
    setPreviewState({
      visible: true,
      position: { x, y },
      images,
    });
  }, []);

  const updatePosition = useCallback((x: number, y: number) => {
    setPreviewState((prev) => ({
      ...prev,
      position: { x, y },
    }));
  }, []);

  const hidePreview = useCallback(() => {
    setPreviewState((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewState({
      visible: false,
      position: { x: 0, y: 0 },
      images: [],
    });
  }, []);

  return {
    previewState,
    showPreview,
    updatePosition,
    hidePreview,
    clearPreview,
  };
}
