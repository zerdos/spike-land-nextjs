"use client";

import { useCallback, useRef, useState } from "react";

export interface DraggablePhotoCardProps {
  imageId: string;
  isSelected?: boolean;
  selectedImageIds?: string[];
  onDragStart?: (imageIds: string[]) => void;
  onDragEnd?: () => void;
  children: React.ReactNode;
}

export function DraggablePhotoCard({
  imageId,
  isSelected = false,
  selectedImageIds = [],
  onDragStart,
  onDragEnd,
  children,
}: DraggablePhotoCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; } | null>(null);

  const getImageIdsForDrag = useCallback((): string[] => {
    // If this image is selected and there are multiple selections, drag all selected
    if (isSelected && selectedImageIds.length > 1) {
      return selectedImageIds;
    }
    // Otherwise, just drag this single image
    return [imageId];
  }, [imageId, isSelected, selectedImageIds]);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const imageIds = getImageIdsForDrag();

      // Set drag data with image IDs
      e.dataTransfer.setData("application/json", JSON.stringify({ imageIds }));
      e.dataTransfer.effectAllowed = "move";

      // Store drag start position for potential threshold checking
      dragStartRef.current = { x: e.clientX, y: e.clientY };

      // Visual feedback - set dragging state
      setIsDragging(true);

      // Notify parent
      onDragStart?.(imageIds);
    },
    [getImageIdsForDrag, onDragStart],
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // Reset visual state
      setIsDragging(false);
      dragStartRef.current = null;

      // Restore opacity
      e.currentTarget.style.opacity = "1";

      // Notify parent
      onDragEnd?.();
    },
    [onDragEnd],
  );

  const handleDrag = useCallback((_e: React.DragEvent<HTMLDivElement>) => {
    // This fires continuously during drag - can be used for custom drag preview updates
    // We keep this handler minimal to avoid performance issues
    // The drag event with (0,0) coordinates indicates drag cancelled outside window
    // No action needed - we handle this in dragEnd
  }, []);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrag={handleDrag}
      className={`transition-opacity duration-150 ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        touchAction: "pan-y",
      }}
      data-draggable-photo-card
      data-image-id={imageId}
      data-is-dragging={isDragging}
      aria-grabbed={isDragging}
      role="listitem"
    >
      {children}
    </div>
  );
}
