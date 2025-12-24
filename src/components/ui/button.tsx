import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:bg-white/5 disabled:text-muted-foreground/50 disabled:grayscale [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.96] active:duration-75",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25 hover:bg-destructive/90 hover:shadow-xl hover:shadow-destructive/30 hover:scale-[1.02]",
        success:
          "bg-success text-success-foreground shadow-lg shadow-success/25 hover:bg-success/90 hover:shadow-xl hover:shadow-success/30 hover:scale-[1.02]",
        warning:
          "bg-warning text-warning-foreground shadow-lg shadow-warning/25 hover:bg-warning/90 hover:shadow-xl hover:shadow-warning/30 hover:scale-[1.02]",
        outline:
          "border border-border bg-background/50 text-foreground shadow-sm hover:bg-muted hover:border-border/80",
        secondary:
          "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30 hover:scale-[1.02] active:scale-[0.98]",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-accent text-white shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 hover:scale-[1.02] active:scale-[0.98]",
      },
      size: {
        default: "h-11 md:h-10 px-6 md:px-5 py-2",
        sm: "h-10 md:h-9 rounded-lg px-4 text-xs",
        lg: "h-14 md:h-12 rounded-xl px-10 text-base",
        icon: "h-11 w-11 md:h-10 md:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants>
{
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
