import { cn } from "@/lib/utils";

interface ThemeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
}

export function ThemeButton({
  children,
  className,
  variant = "primary",
  size = "md",
  glow = false,
  ...props
}: ThemeButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-300",
        "focus:outline-none focus:ring-2 focus:ring-[var(--landing-primary)] focus:ring-offset-2",
        {
          "rounded-[var(--landing-radius)]": true,
          // Variants
          "bg-[var(--landing-primary)] text-[var(--landing-primary-fg)] hover:opacity-90":
            variant === "primary",
          "bg-[var(--landing-secondary)] text-[var(--landing-secondary-fg)] hover:scale-[1.02]":
            variant === "secondary",
          "border-2 border-[var(--landing-border)] hover:border-[var(--landing-primary)] text-[var(--landing-fg)]":
            variant === "outline",
          "bg-transparent hover:bg-[var(--landing-muted)] text-[var(--landing-fg)]":
            variant === "ghost",
          // Sizes
          "px-4 py-2 text-sm": size === "sm",
          "px-6 py-3 text-base": size === "md",
          "px-8 py-4 text-lg": size === "lg",
          "px-10 py-5 text-xl": size === "xl",
          // Effects
          "shadow-[0_0_20px_-5px_var(--landing-primary)] hover:shadow-[0_0_30px_-5px_var(--landing-primary)]":
            glow && variant === "primary",
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
