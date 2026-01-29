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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CreateReportDialogProps {
  // Placeholder for future props
  // onCreateReport?: (reportData: unknown) => void;
}

/**
 * Dialog for creating a new workspace report
 */
export function CreateReportDialog({}: CreateReportDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Report</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create Workspace Report</DialogTitle>
          <DialogDescription>
            Create a custom report across multiple workspaces
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Report creation UI coming soon...
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Create Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
