"use client";

import { Button } from "@/components/ui/button";
import { CheckSquare, FolderInput, Square, Trash2, X } from "lucide-react";
import { memo } from "react";

export interface ImageSelectionToolbarProps {
  isSelectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  onToggleSelectAll: () => void;
  onMove: () => void;
  onRemove: () => void;
  onCancel: () => void;
  onEnterSelectionMode: () => void;
}

/**
 * Toolbar for image selection mode with select all, move, remove, and cancel actions
 */
export const ImageSelectionToolbar = memo(function ImageSelectionToolbar({
  isSelectionMode,
  selectedCount,
  totalCount,
  onToggleSelectAll,
  onMove,
  onRemove,
  onCancel,
  onEnterSelectionMode,
}: ImageSelectionToolbarProps) {
  if (!isSelectionMode) {
    return (
      <Button variant="outline" size="sm" onClick={onEnterSelectionMode}>
        <CheckSquare className="mr-2 h-4 w-4" />
        Select
      </Button>
    );
  }

  const allSelected = selectedCount === totalCount;

  return (
    <>
      <Button variant="outline" size="sm" onClick={onToggleSelectAll}>
        {allSelected
          ? (
            <>
              <Square className="mr-2 h-4 w-4" />
              Deselect All
            </>
          )
          : (
            <>
              <CheckSquare className="mr-2 h-4 w-4" />
              Select All
            </>
          )}
      </Button>
      {selectedCount > 0 && (
        <>
          <Button variant="outline" size="sm" onClick={onMove}>
            <FolderInput className="mr-2 h-4 w-4" />
            Move ({selectedCount})
          </Button>
          <Button variant="destructive" size="sm" onClick={onRemove}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove ({selectedCount})
          </Button>
        </>
      )}
      <Button variant="ghost" size="sm" onClick={onCancel}>
        <X className="mr-2 h-4 w-4" />
        Cancel
      </Button>
    </>
  );
});
