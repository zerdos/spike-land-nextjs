"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
  className?: string;
}

export function RefreshButton({ onRefresh, loading, className }: RefreshButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={onRefresh}
      disabled={loading}
    >
      <RefreshCw
        className={cn("h-4 w-4", loading && "animate-spin")}
      />
      <span className="sr-only">Refresh</span>
    </Button>
  );
}
