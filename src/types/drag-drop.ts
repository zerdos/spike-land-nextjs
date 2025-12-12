/**
 * Shared type definitions for drag-drop functionality
 * Used across Pixel app components and hooks for image album management
 */

/**
 * Current state of drag-drop operation
 */
export interface DragState {
  /** Whether a drag operation is in progress */
  isDragging: boolean;
  /** IDs of images being dragged */
  draggedImageIds: string[];
  /** ID of album currently being hovered over */
  dragOverAlbumId: string | null;
}

/**
 * Data transferred during drag operation
 */
export interface DragData {
  /** Type of data being dragged */
  type: "images";
  /** Array of image IDs being dragged */
  imageIds: string[];
  /** ID of source album if dragging from within an album */
  sourceAlbumId?: string;
}

/**
 * Result of a move operation
 */
export interface MoveResult {
  /** Whether the overall operation succeeded */
  success: boolean;
  /** Number of images successfully moved */
  moved: number;
  /** Individual results for each image */
  results: Array<{
    /** ID of the image */
    imageId: string;
    /** Whether this specific image was moved successfully */
    success: boolean;
    /** Error message if the move failed */
    error?: string;
  }>;
}

/**
 * Props for draggable components
 */
export interface DraggableProps {
  /** Callback when drag starts with the IDs of dragged images */
  onDragStart?: (imageIds: string[]) => void;
  /** Callback when drag operation ends */
  onDragEnd?: () => void;
}

/**
 * Props for droppable components
 */
export interface DroppableProps {
  /** Callback when dragged item hovers over this drop target */
  onDragOver?: (albumId: string) => void;
  /** Callback when dragged item leaves this drop target */
  onDragLeave?: () => void;
  /** Callback when dragged item is dropped on this target */
  onDrop?: (data: DragData) => void;
  /** Whether this component is currently a valid drop target */
  isDropTarget?: boolean;
}
