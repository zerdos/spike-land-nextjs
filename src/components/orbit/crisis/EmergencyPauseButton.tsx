/**
 * Emergency Pause Button - Emergency stop for all automation
 * Resolves #522 (ORB-067): Crisis Detection UI
 */

"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface EmergencyPauseButtonProps {
  workspaceSlug: string;
  isPaused: boolean;
  onToggle: () => void;
}

export function EmergencyPauseButton(
  { workspaceSlug, isPaused, onToggle }: EmergencyPauseButtonProps,
) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isActing, setIsActing] = useState(false);

  const handleConfirm = async () => {
    setIsActing(true);
    try {
      const endpoint = isPaused ? "resume" : "pause";
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/crisis/${endpoint}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error(`Failed to ${endpoint}`);
      toast.success(isPaused ? "Automation resumed" : "Automation paused");
      onToggle();
      setDialogOpen(false);
    } catch (_error) {
      toast.error("Failed to toggle automation");
    } finally {
      setIsActing(false);
    }
  };

  return (
    <>
      <Button
        size="lg"
        variant={isPaused ? "default" : "destructive"}
        onClick={() => setDialogOpen(true)}
        className="w-full md:w-auto"
      >
        {isPaused
          ? (
            <>
              <Play className="h-5 w-5 mr-2" />
              Resume Automation
            </>
          )
          : (
            <>
              <AlertTriangle className="h-5 w-5 mr-2" />
              Emergency Pause
            </>
          )}
      </Button>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPaused ? "Resume Automation?" : "Emergency Pause?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPaused
                ? "This will resume all automated posting and campaigns."
                : "This will immediately pause ALL automated posting and campaigns across all platforms."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isActing}>
              {isPaused ? "Resume" : "Pause Everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
