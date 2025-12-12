"use client";

import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

interface DropZoneIndicatorProps {
  isActive: boolean;
  label?: string;
  className?: string;
}

export function DropZoneIndicator({
  isActive,
  label = "Drop to add to album",
  className,
}: DropZoneIndicatorProps) {
  if (!isActive) {
    return null;
  }

  return (
    <div
      data-testid="drop-zone-indicator"
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center",
        "pointer-events-none",
        "transition-all duration-200 ease-out",
        className,
      )}
      aria-hidden="true"
    >
      {/* Background overlay */}
      <div
        data-testid="drop-zone-overlay"
        className={cn(
          "absolute inset-0",
          "bg-primary/10 dark:bg-primary/15",
          "backdrop-blur-[2px]",
        )}
      />

      {/* Animated dashed border */}
      <div
        data-testid="drop-zone-border"
        className={cn(
          "absolute inset-2 rounded-lg",
          "border-2 border-dashed border-primary",
          "animate-pulse",
        )}
      />

      {/* Glow effect */}
      <div
        className={cn(
          "absolute inset-4 rounded-lg",
          "shadow-glow-cyan opacity-50",
        )}
      />

      {/* Content container */}
      <div
        data-testid="drop-zone-content"
        className={cn(
          "relative z-10 flex flex-col items-center gap-3",
          "p-6 rounded-xl",
          "bg-background/80 dark:bg-card/80",
          "shadow-lg",
          "animate-drop-zone-bounce",
        )}
      >
        <div
          className={cn(
            "p-3 rounded-full",
            "bg-primary/20",
            "shadow-glow-cyan-sm",
          )}
        >
          <Upload className="h-6 w-6 text-primary" data-testid="drop-zone-icon" />
        </div>
        <span
          data-testid="drop-zone-label"
          className={cn(
            "text-sm font-medium",
            "text-foreground",
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
