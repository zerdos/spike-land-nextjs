"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

/**
 * State representing the current drag operation
 */
interface DragState {
  isDragging: boolean;
  draggedImageIds: string[];
  dragOverAlbumId: string | null;
}

/**
 * Context value provided to consumers
 */
export interface DragDropContextValue {
  /** Whether a drag operation is currently in progress */
  isDragging: boolean;
  /** IDs of images being dragged */
  draggedImageIds: string[];
  /** ID of the album currently being hovered over, if any */
  dragOverAlbumId: string | null;
  /** Whether a move operation is in progress */
  isMoving: boolean;

  /** Start a drag operation with the specified image IDs */
  startDrag: (imageIds: string[]) => void;
  /** End the current drag operation */
  endDrag: () => void;
  /** Set the album being hovered over during drag */
  setDragOver: (albumId: string | null) => void;
  /** Handle dropping images onto an album */
  handleDrop: (albumId: string) => Promise<void>;
}

/**
 * Props for the DragDropProvider component
 */
export interface DragDropProviderProps {
  /** Child components that will have access to the drag-drop context */
  children: React.ReactNode;
  /** Callback fired when a move operation completes successfully */
  onMoveComplete?: (targetAlbumId: string, imageIds: string[]) => void;
  /** Callback fired when a move operation fails */
  onMoveError?: (error: Error) => void;
}

const initialDragState: DragState = {
  isDragging: false,
  draggedImageIds: [],
  dragOverAlbumId: null,
};

const DragDropContext = createContext<DragDropContextValue | null>(null);

/**
 * Provider component for managing drag-drop state across the enhance feature.
 * Wraps child components to give them access to drag-drop functionality.
 *
 * @example
 * ```tsx
 * <DragDropProvider
 *   onMoveComplete={(albumId, imageIds) => {
 *     toast.success(`Moved ${imageIds.length} images to album`);
 *     refreshAlbums();
 *   }}
 *   onMoveError={(error) => {
 *     toast.error(error.message);
 *   }}
 * >
 *   <AlbumSidebar />
 *   <ImageGrid />
 * </DragDropProvider>
 * ```
 */
export function DragDropProvider({
  children,
  onMoveComplete,
  onMoveError,
}: DragDropProviderProps): React.JSX.Element {
  const [state, setState] = useState<DragState>(initialDragState);
  const [isMoving, setIsMoving] = useState(false);

  /**
   * Initiates a drag operation with the specified image IDs
   */
  const startDrag = useCallback((imageIds: string[]) => {
    if (imageIds.length === 0) return;

    setState({
      isDragging: true,
      draggedImageIds: imageIds,
      dragOverAlbumId: null,
    });
  }, []);

  /**
   * Ends the current drag operation without performing a drop
   */
  const endDrag = useCallback(() => {
    setState(initialDragState);
  }, []);

  /**
   * Updates the album currently being hovered over during a drag operation
   */
  const setDragOver = useCallback((albumId: string | null) => {
    setState((prev) => ({
      ...prev,
      dragOverAlbumId: albumId,
    }));
  }, []);

  /**
   * Handles dropping dragged images onto an album.
   * Makes API call to add images to the album.
   */
  const handleDrop = useCallback(
    async (albumId: string): Promise<void> => {
      if (state.draggedImageIds.length === 0) {
        endDrag();
        return;
      }

      setIsMoving(true);

      try {
        const response = await fetch(`/api/albums/${albumId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageIds: state.draggedImageIds }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            data.error || `Failed to add images to album (${response.status})`,
          );
        }

        const data = await response.json();

        // Call success callback with the results
        onMoveComplete?.(albumId, state.draggedImageIds);

        // Return early if no images were actually added (all were duplicates)
        if (data.added === 0) {
          return;
        }
      } catch (error) {
        const err = error instanceof Error
          ? error
          : new Error("Unknown error occurred");
        onMoveError?.(err);
      } finally {
        setIsMoving(false);
        endDrag();
      }
    },
    [state.draggedImageIds, endDrag, onMoveComplete, onMoveError],
  );

  const value: DragDropContextValue = {
    isDragging: state.isDragging,
    draggedImageIds: state.draggedImageIds,
    dragOverAlbumId: state.dragOverAlbumId,
    isMoving,
    startDrag,
    endDrag,
    setDragOver,
    handleDrop,
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
}

/**
 * Hook to access the drag-drop context.
 * Must be used within a DragDropProvider.
 *
 * @throws Error if used outside of DragDropProvider
 *
 * @example
 * ```tsx
 * function ImageCard({ imageId }: { imageId: string }) {
 *   const { startDrag, isDragging } = useDragDrop();
 *
 *   return (
 *     <div
 *       draggable
 *       onDragStart={() => startDrag([imageId])}
 *       className={isDragging ? 'opacity-50' : ''}
 *     >
 *       ...
 *     </div>
 *   );
 * }
 * ```
 */
export function useDragDrop(): DragDropContextValue {
  const context = useContext(DragDropContext);

  if (!context) {
    throw new Error("useDragDrop must be used within DragDropProvider");
  }

  return context;
}
