"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EnvironmentInfo } from "@/lib/admin/swarm/types";
import { Rocket } from "lucide-react";
import { useState } from "react";

interface DeploymentDialogProps {
  env: EnvironmentInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (env: EnvironmentInfo) => Promise<void>;
}

export function DeploymentDialog({ env, open, onOpenChange, onConfirm }: DeploymentDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!env) return;
    setLoading(true);
    try {
      await onConfirm(env);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deploy to {env?.name?.toUpperCase()}</DialogTitle>
          <DialogDescription>
            This will trigger a new deployment to the <strong>{env?.name}</strong> environment.
            {env?.name === "prod" && (
              <span className="mt-2 block font-semibold text-yellow-500">
                Warning: This is a production deployment.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        {env && (
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment</span>
              <span className="font-medium uppercase">{env.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current version</span>
              <span className="font-mono text-xs">{env.version ?? "unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">URL</span>
              <span className="font-mono text-xs">{env.url}</span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            <Rocket className="mr-1 h-4 w-4" />
            {loading ? "Deploying..." : "Deploy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
