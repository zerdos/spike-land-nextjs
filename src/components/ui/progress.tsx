"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    glow?: boolean;
    variant?: "default" | "success" | "warning" | "destructive";
  }
>(({ className, value, glow = false, variant = "default", ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-white/10",
      className,
    )}
    aria-valuenow={value ?? 0}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-all",
        variant === "default" && "bg-primary",
        variant === "success" && "bg-success",
        variant === "warning" && "bg-warning",
        variant === "destructive" && "bg-destructive",
        glow && variant === "default" && "shadow-[0_0_10px_hsl(var(--primary)/0.5)]",
        glow && variant === "success" && "shadow-[0_0_10px_hsl(var(--success)/0.5)]",
        glow && variant === "warning" && "shadow-[0_0_10px_hsl(var(--warning)/0.5)]",
        glow && variant === "destructive" && "shadow-[0_0_10px_hsl(var(--destructive)/0.5)]",
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
