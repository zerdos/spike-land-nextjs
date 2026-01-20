"use client";

import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

interface DroppableAlbumProps {
  albumId: string;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  onDrop?: (imageIds: string[]) => void;
  isDragOver?: boolean;
  children: React.ReactNode;
}

interface DragData {
  imageIds: string[];
}

function isDragData(data: unknown): data is DragData {
  return (
    typeof data === "object" &&
    data !== null &&
    "imageIds" in data &&
    Array.isArray((data as DragData).imageIds)
  );
}

export function DroppableAlbum({
  albumId,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver: externalIsDragOver,
  children,
}: DroppableAlbumProps) {
  const [internalIsDragOver, setInternalIsDragOver] = useState(false);

  const isDragOver = externalIsDragOver ?? internalIsDragOver;

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }

      if (!internalIsDragOver) {
        setInternalIsDragOver(true);
        onDragOver?.();
      }
    },
    [internalIsDragOver, onDragOver],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }

      if (!internalIsDragOver) {
        setInternalIsDragOver(true);
        onDragOver?.();
      }
    },
    [internalIsDragOver, onDragOver],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      const relatedTarget = e.relatedTarget as Node | null;
      const currentTarget = e.currentTarget as Node;

      if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
        setInternalIsDragOver(false);
        onDragLeave?.();
      }
    },
    [onDragLeave],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setInternalIsDragOver(false);

      if (!e.dataTransfer) {
        return;
      }

      try {
        const jsonData = e.dataTransfer.getData("application/json");
        if (!jsonData) {
          return;
        }

        const data: unknown = JSON.parse(jsonData);
        if (isDragData(data)) {
          onDrop?.(data.imageIds);
        }
      } catch (error) {
        // Invalid JSON in drag data - user may have dragged non-image content
        console.debug(
          "[DroppableAlbum] Invalid drag data, ignoring drop:",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    [onDrop],
  );

  return (
    <div
      data-testid={`droppable-album-${albumId}`}
      data-drag-over={isDragOver}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "transition-all duration-200",
        isDragOver && "ring-2 ring-primary scale-[1.02]",
      )}
    >
      {children}
    </div>
  );
}
