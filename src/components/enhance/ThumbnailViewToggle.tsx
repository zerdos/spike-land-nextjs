"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface ThumbnailViewToggleProps {
  showEnhanced: boolean;
  onToggle: (showEnhanced: boolean) => void;
  hasEnhancedImages: boolean;
  className?: string;
}

export function ThumbnailViewToggle({
  showEnhanced,
  onToggle,
  hasEnhancedImages,
  className,
}: ThumbnailViewToggleProps) {
  const isDisabled = !hasEnhancedImages;

  const handleLabelClick = () => {
    if (!isDisabled) {
      onToggle(!showEnhanced);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        isDisabled && "opacity-50",
        className,
      )}
      data-testid="thumbnail-view-toggle"
    >
      <span
        onClick={handleLabelClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleLabelClick();
          }
        }}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        className={cn(
          "text-xs select-none",
          isDisabled
            ? "cursor-not-allowed text-muted-foreground"
            : "cursor-pointer",
          !isDisabled && !showEnhanced && "text-foreground font-medium",
          !isDisabled && showEnhanced && "text-muted-foreground",
        )}
        data-testid="original-label"
      >
        Original
      </span>
      <Switch
        id="thumbnail-view-switch"
        checked={showEnhanced}
        onCheckedChange={onToggle}
        disabled={isDisabled}
        aria-label="Toggle between original and enhanced thumbnail view"
        data-testid="thumbnail-view-switch"
      />
      <span
        onClick={handleLabelClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleLabelClick();
          }
        }}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        className={cn(
          "text-xs select-none",
          isDisabled
            ? "cursor-not-allowed text-muted-foreground"
            : "cursor-pointer",
          !isDisabled && showEnhanced && "text-foreground font-medium",
          !isDisabled && !showEnhanced && "text-muted-foreground",
        )}
        data-testid="enhanced-label"
      >
        Enhanced
      </span>
    </div>
  );
}
