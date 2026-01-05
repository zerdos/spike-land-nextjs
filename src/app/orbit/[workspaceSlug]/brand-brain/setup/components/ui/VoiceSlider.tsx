"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface VoiceSliderProps {
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceSlider({
  leftLabel,
  rightLabel,
  value,
  onChange,
  disabled = false,
  className,
}: VoiceSliderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            value < 50
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {leftLabel}
        </span>
        <span
          className={cn(
            "rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums",
          )}
        >
          {value}
        </span>
        <span
          className={cn(
            "text-sm font-medium transition-colors",
            value > 50
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {rightLabel}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0] ?? 50)}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        className="cursor-pointer"
      />
    </div>
  );
}
