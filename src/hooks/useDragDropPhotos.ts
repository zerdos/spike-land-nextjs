import { useCallback, useState } from "react";

interface DragState {
  isDragging: boolean;
  draggedImageIds: string[];
  dragOverAlbumId: string | null;
}

interface UseDragDropPhotosOptions {
  onMoveComplete?: (imageIds: string[], albumId: string) => void;
  onMoveError?: (error: Error) => void;
}

interface UseDragDropPhotosReturn {
  dragState: DragState;
  handleDragStart: (imageIds: string[]) => void;
  handleDragEnd: () => void;
  handleDragOver: (albumId: string) => void;
  handleDragLeave: () => void;
  handleDrop: (albumId: string) => Promise<void>;
  isMoving: boolean;
}

const INITIAL_DRAG_STATE: DragState = {
  isDragging: false,
  draggedImageIds: [],
  dragOverAlbumId: null,
};

/**
 * Hook for managing drag-and-drop state for photo organization
 *
 * Supports:
 * - Multi-select drag operations
 * - Visual feedback during drag/drop
 * - Optimistic updates with rollback on error
 * - API integration for persisting changes
 *
 * @param options - Configuration options for callbacks
 * @returns Drag-drop state and handlers
 */
export function useDragDropPhotos(
  options?: UseDragDropPhotosOptions,
): UseDragDropPhotosReturn {
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const [isMoving, setIsMoving] = useState(false);

  /**
   * Initiates drag operation with selected image IDs
   */
  const handleDragStart = useCallback((imageIds: string[]) => {
    if (imageIds.length === 0) return;

    setDragState({
      isDragging: true,
      draggedImageIds: imageIds,
      dragOverAlbumId: null,
    });
  }, []);

  /**
   * Resets drag state when drag operation ends
   */
  const handleDragEnd = useCallback(() => {
    setDragState(INITIAL_DRAG_STATE);
  }, []);

  /**
   * Updates visual feedback when dragging over an album
   */
  const handleDragOver = useCallback((albumId: string) => {
    setDragState((prev) => ({
      ...prev,
      dragOverAlbumId: albumId,
    }));
  }, []);

  /**
   * Clears hover state when leaving an album drop zone
   */
  const handleDragLeave = useCallback(() => {
    setDragState((prev) => ({
      ...prev,
      dragOverAlbumId: null,
    }));
  }, []);

  /**
   * Handles drop event with optimistic update and rollback
   *
   * @param albumId - Target album ID for the images
   * @throws Error if API call fails
   */
  const handleDrop = useCallback(
    async (albumId: string) => {
      const { draggedImageIds } = dragState;

      if (draggedImageIds.length === 0) {
        handleDragEnd();
        return;
      }

      try {
        setIsMoving(true);

        // Optimistically update UI (handled by parent component via callback)
        // This allows the UI to update immediately while the API call is in flight

        const response = await fetch("/api/images/move-to-album", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageIds: draggedImageIds,
            targetAlbumId: albumId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: "Failed to move images to album",
          }));
          throw new Error(errorData.error || "Failed to move images to album");
        }

        // Success - notify parent component
        options?.onMoveComplete?.(draggedImageIds, albumId);
      } catch (error) {
        const errorObj = error instanceof Error
          ? error
          : new Error("Unknown error");

        // Notify parent component of error (for rollback)
        options?.onMoveError?.(errorObj);

        // Re-throw to allow parent to handle error display
        throw errorObj;
      } finally {
        setIsMoving(false);
        handleDragEnd();
      }
    },
    [dragState, handleDragEnd, options],
  );

  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isMoving,
  };
}
