"use client";

import { cn } from "@/lib/utils";

import { useAnimatedNumber } from "../hooks/useAnimatedNumber";

interface AnimatedCounterProps {
  value: number;
  label?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  numberClassName?: string;
  labelClassName?: string;
  duration?: number;
}

export function AnimatedCounter({
  value,
  label,
  prefix = "",
  suffix = "",
  className,
  numberClassName,
  labelClassName,
  duration = 2,
}: AnimatedCounterProps) {
  const displayValue = useAnimatedNumber(value, duration);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className={cn("text-3xl font-bold font-mono tracking-tight", numberClassName)}>
        {prefix}
        {displayValue.toLocaleString()}
        {suffix}
      </div>
      {label && (
        <div className={cn("text-sm text-muted-foreground mt-1", labelClassName)}>
          {label}
        </div>
      )}
    </div>
  );
}
