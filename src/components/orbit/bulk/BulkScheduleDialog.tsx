"use client";

import { useState } from "react";
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

interface BulkScheduleDialogProps {
  workspaceIds?: string[];
  // onSchedule?: (data: any) => void;
}

/**
 * Dialog for bulk scheduling posts across workspaces
 */
export function BulkScheduleDialog({
  workspaceIds = [],
}: BulkScheduleDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Bulk Schedule</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Schedule Post Across Workspaces</DialogTitle>
          <DialogDescription>
            Schedule a post to multiple workspaces at once
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Selected workspaces: {workspaceIds.length}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Bulk scheduling UI coming soon...
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
