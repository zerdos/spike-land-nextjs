"use client";

import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  color?: "green" | "yellow" | "red" | "gray";
  className?: string;
}

const COLOR_MAP = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  gray: "bg-gray-500",
} as const;

export function LiveIndicator({ color = "green", className }: LiveIndicatorProps) {
  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)}>
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
          COLOR_MAP[color],
        )}
      />
      <span
        className={cn(
          "relative inline-flex h-2.5 w-2.5 rounded-full",
          COLOR_MAP[color],
        )}
      />
    </span>
  );
}
