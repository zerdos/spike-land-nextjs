"use client";

import { cn } from "@/lib/utils";

interface TrustedByProps {
  className?: string;
}

// Styled text logos (since we don't have actual logo files)
const logos = [
  { name: "Enterprise", font: "font-sans font-semibold" },
  { name: "Discovery", font: "font-sans font-light italic" },
  { name: "Forbes", font: "font-serif font-bold" },
  { name: "The Wington Post", font: "font-serif italic" },
  { name: "TECH & MODEEVERY", font: "font-mono text-xs tracking-wider" },
  { name: "SAMSUNG", font: "font-sans font-bold tracking-widest" },
];

export function TrustedBy({ className }: TrustedByProps) {
  return (
    <section className={cn("py-8 border-t border-border/30", className)}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-6">
          <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Trusted by:
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12">
            {logos.map((logo) => (
              <span
                key={logo.name}
                className={cn(
                  "text-muted-foreground/60 hover:text-muted-foreground transition-colors",
                  logo.font,
                )}
              >
                {logo.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
