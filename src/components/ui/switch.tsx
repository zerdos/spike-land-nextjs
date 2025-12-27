"use client";

import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Check, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "group peer relative inline-flex h-11 w-20 md:h-7 md:w-14 shrink-0 cursor-pointer items-center rounded-full border border-white/10 bg-black/20 shadow-inner transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-black/40 data-[state=checked]:shadow-glow-cyan hover:data-[state=unchecked]:bg-black/50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <div className="relative w-full h-full flex items-center justify-between px-2 md:px-1.5">
      {/* ON State Indicator */}
      <div className="flex items-center justify-center opacity-0 transition-opacity duration-200 group-data-[state=checked]:opacity-100">
        <Check
          className="h-4 w-4 md:h-3.5 md:w-3.5 text-primary-foreground font-bold"
          strokeWidth={3}
        />
      </div>

      {/* OFF State Indicator */}
      <div className="flex items-center justify-center opacity-100 transition-opacity duration-200 group-data-[state=checked]:opacity-0">
        <X className="h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground/60" strokeWidth={3} />
      </div>
    </div>

    <SwitchPrimitives.Thumb
      className={cn(
        "absolute left-1 md:left-0.5 pointer-events-none block h-9 w-9 md:h-6 md:w-6 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[38px] md:data-[state=checked]:translate-x-[28px] data-[state=unchecked]:translate-x-0 will-change-transform group-active:scale-95",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
