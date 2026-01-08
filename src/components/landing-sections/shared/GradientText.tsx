import { cn } from "@/lib/utils";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  from?: string;
  to?: string;
}

export function GradientText(
  { children, className, from, to }: GradientTextProps,
) {
  const fromColor = from || "var(--landing-primary)";
  const toColor = to || "var(--landing-accent)";

  return (
    <span
      className={cn(
        "bg-clip-text text-transparent bg-gradient-to-r",
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(to right, ${fromColor}, ${toColor})`,
      }}
    >
      {children}
    </span>
  );
}
