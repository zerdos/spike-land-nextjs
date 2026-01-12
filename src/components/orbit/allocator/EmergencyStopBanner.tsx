"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useAutopilotConfig } from "@/hooks/useAutopilotConfig";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

interface EmergencyStopBannerProps {
  workspaceSlug: string;
}

export function EmergencyStopBanner({ workspaceSlug }: EmergencyStopBannerProps) {
  const { config, updateConfig, isLoading } = useAutopilotConfig(workspaceSlug);
  const [showConfirm, setShowConfirm] = useState(false);

  if (isLoading || !config || !config.isEmergencyStopped) {
    return null;
  }

  const handleResume = async () => {
    await updateConfig({ isEmergencyStopped: false });
    setShowConfirm(false);
  };

  return (
    <>
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Autopilot Emergency Stop Active</AlertTitle>
        <AlertDescription className="flex items-center justify-between mt-2">
          <span>
            All automated budget adjustments are currently halted. No changes will be made until
            resumed.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm(true)}
            className="bg-white text-destructive hover:bg-gray-100"
          >
            Resume Autopilot
          </Button>
        </AlertDescription>
      </Alert>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Autopilot Operations?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to resume autopilot? Automated budget adjustments will restart
              immediately based on current rules and market conditions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResume}>
              Resume Operations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
