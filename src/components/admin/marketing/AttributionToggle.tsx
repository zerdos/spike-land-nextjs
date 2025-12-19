"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AttributionModel = "first-touch" | "last-touch";

interface AttributionToggleProps {
  value: AttributionModel;
  onChange: (model: AttributionModel) => void;
  className?: string;
}

export function AttributionToggle({
  value,
  onChange,
  className,
}: AttributionToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg bg-muted p-1",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange("first-touch")}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          value === "first-touch"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        First-touch
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange("last-touch")}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          value === "last-touch"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Last-touch
      </Button>
    </div>
  );
}
