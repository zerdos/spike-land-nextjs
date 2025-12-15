import { cn } from "@/lib/utils";

interface ProseProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Typography wrapper component for blog content
 * Provides consistent styling for long-form content
 */
export function Prose({ children, className }: ProseProps) {
  return (
    <div
      className={cn(
        // Base typography
        "prose-blog",
        // Max width for readability
        "max-w-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
