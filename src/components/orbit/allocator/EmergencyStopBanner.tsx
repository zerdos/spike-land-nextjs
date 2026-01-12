"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAutopilotConfig } from "@/hooks/useAutopilotConfig";
import { AlertCircle } from "lucide-react";

interface EmergencyStopBannerProps {
  workspaceSlug: string;
}

export function EmergencyStopBanner({ workspaceSlug }: EmergencyStopBannerProps) {
  const { config, updateConfig, isLoading } = useAutopilotConfig(workspaceSlug);

  if (isLoading || !config || !config.isEmergencyStopped) {
    return null;
  }

  const handleResume = async () => {
    if (confirm("Are you sure you want to resume autopilot operations?")) {
      await updateConfig({ isEmergencyStopped: false });
    }
  };

  return (
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
          onClick={handleResume}
          className="bg-white text-destructive hover:bg-gray-100"
        >
          Resume Autopilot
        </Button>
      </AlertDescription>
    </Alert>
  );
}
