import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "glass-1 glass-edge border-white/10 text-foreground shadow-sm",
        secondary: "bg-white/5 text-muted-foreground border border-white/5",
        destructive: "bg-destructive text-destructive-foreground shadow-glow-destructive",
        success: "bg-success text-success-foreground shadow-glow-success",
        warning: "bg-warning text-warning-foreground shadow-glow-warning",
        outline: "text-foreground border border-white/20",
        overlay: "bg-black/60 text-white hover:bg-black/70 border-none backdrop-blur-[2px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants>
{}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn("Badge", badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge };
