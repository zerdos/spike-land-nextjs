"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionWrapper } from "../landing-sections/shared/SectionWrapper";
import { ThemeButton } from "../landing-sections/shared/ThemeButton";

interface FeatureCTAProps {
  headline: string;
  description: string;
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  className?: string;
}

export function FeatureCTA({
  headline,
  description,
  primaryCta,
  secondaryCta,
  className,
}: FeatureCTAProps) {
  return (
    <SectionWrapper
      className={cn(
        "border-t border-[var(--landing-border)] relative overflow-hidden",
        className,
      )}
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--landing-primary)] opacity-10 blur-[150px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-4xl mx-auto text-center space-y-6"
      >
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
          {headline}
        </h2>
        <p className="text-lg md:text-xl text-[var(--landing-muted-fg)] max-w-2xl mx-auto">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href={primaryCta.href}>
            <ThemeButton size="lg" glow>
              {primaryCta.text}
            </ThemeButton>
          </Link>
          {secondaryCta && (
            <Link href={secondaryCta.href}>
              <ThemeButton variant="outline" size="lg">
                {secondaryCta.text}
              </ThemeButton>
            </Link>
          )}
        </div>
      </motion.div>
    </SectionWrapper>
  );
}
