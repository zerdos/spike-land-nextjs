"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatFileSize } from "@/lib/utils";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

interface VersionToDelete {
  id: string;
  tier: string;
  sizeBytes?: number | null;
}

interface BulkDeleteDialogProps {
  selectedVersions: VersionToDelete[];
  onDelete: (versionIds: string[]) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
}

export function BulkDeleteDialog({
  selectedVersions,
  onDelete,
  onCancel,
  disabled = false,
}: BulkDeleteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalSize = selectedVersions.reduce(
    (sum, v) => sum + (v.sizeBytes || 0),
    0,
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(selectedVersions.map((v) => v.id));
      setIsOpen(false);
    } catch (error) {
      console.error("Bulk delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isDeleting) {
      onCancel();
    }
    setIsOpen(open);
  };

  if (selectedVersions.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          disabled={disabled || selectedVersions.length === 0}
          className="flex items-center gap-2"
          data-testid="delete-selected-button"
        >
          <Trash2 className="h-4 w-4" />
          Delete Selected ({selectedVersions.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirm Bulk Delete
          </DialogTitle>
          <DialogDescription>
            You are about to permanently delete {selectedVersions.length}{" "}
            enhancement version{selectedVersions.length !== 1 ? "s" : ""}. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="rounded-md bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Summary:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Versions to delete: {selectedVersions.length}</li>
              <li>Storage to be freed: {formatFileSize(totalSize)}</li>
            </ul>
          </div>
          {selectedVersions.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto">
              <p className="text-sm font-medium mb-2">Versions:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {selectedVersions.map((v) => (
                  <li key={v.id} className="flex justify-between">
                    <span>{v.tier}</span>
                    <span>{formatFileSize(v.sizeBytes)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting
              ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              )
              : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedVersions.length} Version{selectedVersions.length !== 1 ? "s" : ""}
                </>
              )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
