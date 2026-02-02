"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, FolderPlus, Tag } from "lucide-react";

interface BulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
}

export function BulkActions({ selectedCount, onClearSelection, onDelete }: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Card className="flex items-center gap-2 p-2 px-4 shadow-xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <span className="text-sm font-medium mr-2">{selectedCount} selected</span>

        <div className="h-4 w-px bg-border mx-1" />

        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>

        <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
            <FolderPlus className="mr-2 h-4 w-4" /> Add to Album
        </Button>

        <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
            <Tag className="mr-2 h-4 w-4" /> Tag
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Cancel
        </Button>
      </Card>
    </div>
  );
}
