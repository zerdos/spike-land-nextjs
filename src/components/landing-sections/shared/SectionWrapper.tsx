import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  fullWidth?: boolean;
}

export function SectionWrapper(
  { children, className, id, fullWidth = false }: SectionWrapperProps,
) {
  return (
    <section
      id={id}
      className={cn(
        "w-full py-20 px-4 md:px-6 relative overflow-hidden",
        className,
      )}
    >
      <div className={cn("mx-auto", fullWidth ? "w-full" : "max-w-7xl")}>
        {children}
      </div>
    </section>
  );
}
