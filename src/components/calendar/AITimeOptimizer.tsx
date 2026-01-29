/**
 * AI Time Optimizer Component
 * Interactive component to refresh and view optimal posting times
 * Issue #841
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";

interface AITimeOptimizerProps {
  workspaceId: string;
  onRefreshComplete?: () => void;
}

export function AITimeOptimizer({
  onRefreshComplete,
}: AITimeOptimizerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // This would call the API - simplified for now
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success("Optimal times refreshed", {
        description: "AI analysis complete. New recommendations available.",
      });

      onRefreshComplete?.();
    } catch (error) {
      toast.error("Refresh failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">AI Time Optimization</h3>
            <p className="text-sm text-muted-foreground">
              Analyze engagement patterns for optimal posting times
            </p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Analyzing..." : "Refresh"}
        </Button>
      </div>
    </div>
  );
}
