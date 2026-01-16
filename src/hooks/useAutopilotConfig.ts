import type { AutopilotConfig, UpdateAutopilotConfigInput } from "@/lib/allocator/autopilot-types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function useAutopilotConfig(workspaceSlug: string) {
  const [config, setConfig] = useState<AutopilotConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/orbit/${workspaceSlug}/allocator/autopilot`,
      );
      if (!res.ok) {
        if (res.status === 404) {
          // No config found, this is fine
          setConfig(null);
          return;
        }
        throw new Error("Failed to fetch configuration");
      }
      const data = await res.json();
      setConfig(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    if (workspaceSlug) {
      fetchConfig();
    }
  }, [workspaceSlug, fetchConfig]);

  const updateConfig = async (data: UpdateAutopilotConfigInput) => {
    try {
      const res = await fetch(
        `/api/orbit/${workspaceSlug}/allocator/autopilot`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to update configuration");
      }

      const result = await res.json();
      setConfig(result.config);
      toast.success("Autopilot configuration updated");
      return result.config;
    } catch (err) {
      toast.error("Failed to update configuration");
      console.error(err);
      throw err;
    }
  };

  const toggleAutopilot = async (isEnabled: boolean) => {
    try {
      const res = await fetch(
        `/api/orbit/${workspaceSlug}/allocator/autopilot/toggle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to toggle autopilot");
      }

      const result = await res.json();
      setConfig(result.config);
      toast.success(`Autopilot ${isEnabled ? "enabled" : "disabled"}`);
      return result.config;
    } catch (err) {
      toast.error("Failed to toggle autopilot");
      console.error(err);
      throw err;
    }
  };

  return {
    config,
    isLoading,
    error,
    updateConfig,
    toggleAutopilot,
    refreshConfig: fetchConfig,
  };
}
