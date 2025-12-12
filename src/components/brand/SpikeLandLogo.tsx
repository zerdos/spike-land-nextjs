"use client";

import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

interface SpikeLandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "icon" | "horizontal" | "stacked";
  className?: string;
  showText?: boolean;
}

const sizeMap = {
  sm: { icon: 24, text: "text-lg", gap: "gap-2" },
  md: { icon: 32, text: "text-xl", gap: "gap-3" },
  lg: { icon: 48, text: "text-2xl", gap: "gap-3" },
  xl: { icon: 64, text: "text-4xl", gap: "gap-4" },
};

export function SpikeLandLogo({
  size = "md",
  variant = "horizontal",
  className,
  showText = true,
}: SpikeLandLogoProps) {
  const { icon, text, gap } = sizeMap[size];

  const zapIcon = (
    <Zap
      size={icon}
      className="flex-shrink-0 fill-amber-400 stroke-amber-500"
      aria-hidden="true"
    />
  );

  const wordmark = (
    <span
      className={cn(
        "font-heading font-bold tracking-tight lowercase",
        text,
        "text-foreground",
      )}
    >
      spike.land
    </span>
  );

  if (variant === "icon" || !showText) {
    return (
      <div
        className={cn("inline-flex items-center", className)}
        role="img"
        aria-label="Spike Land logo"
      >
        {zapIcon}
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div
        className={cn("inline-flex flex-col items-center gap-2", className)}
        role="img"
        aria-label="Spike Land logo"
      >
        {zapIcon}
        {wordmark}
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center", gap, className)}
      role="img"
      aria-label="Spike Land logo"
    >
      {zapIcon}
      {wordmark}
    </div>
  );
}
