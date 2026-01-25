"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { SectionWrapper } from "../landing-sections/shared/SectionWrapper";
import { ThemeButton } from "../landing-sections/shared/ThemeButton";

interface FeatureHeroProps {
  badge?: string;
  headline: string;
  highlightedWord?: string;
  description: string;
  ctaText: string;
  ctaHref?: string;
  secondaryCta?: {
    text: string;
    href: string;
  };
  children?: ReactNode;
  className?: string;
}

export function FeatureHero({
  badge,
  headline,
  highlightedWord,
  description,
  ctaText,
  ctaHref = "/auth/signin",
  secondaryCta,
  children,
  className,
}: FeatureHeroProps) {
  // Split headline to highlight specific word
  const parts = highlightedWord
    ? headline.split(highlightedWord)
    : [headline];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[var(--landing-primary)] opacity-10 blur-[150px] rounded-full" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--landing-accent)] opacity-10 blur-[120px] rounded-full" />
      </div>

      <SectionWrapper className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          {badge && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center px-4 py-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-secondary)]/50 backdrop-blur-sm text-sm font-medium text-[var(--landing-muted-fg)]"
            >
              <span className="w-2 h-2 rounded-full bg-[var(--landing-primary)] mr-2 animate-pulse" />
              {badge}
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight"
          >
            {highlightedWord
              ? (
                <>
                  {parts[0]}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--landing-primary)] to-[var(--landing-accent)]">
                    {highlightedWord}
                  </span>
                  {parts[1]}
                </>
              )
              : (
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
                  {headline}
                </span>
              )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl lg:text-2xl text-[var(--landing-muted-fg)] max-w-3xl mx-auto"
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link href={ctaHref}>
              <ThemeButton size="lg" glow>
                {ctaText}
              </ThemeButton>
            </Link>
            {secondaryCta && (
              <Link href={secondaryCta.href}>
                <ThemeButton variant="outline" size="lg">
                  {secondaryCta.text}
                </ThemeButton>
              </Link>
            )}
          </motion.div>
        </div>

        {children && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 md:mt-24 relative"
          >
            {children}
          </motion.div>
        )}
      </SectionWrapper>
    </div>
  );
}
