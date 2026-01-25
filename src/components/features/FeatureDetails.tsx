"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { SectionWrapper } from "../landing-sections/shared/SectionWrapper";
import { ThemeCard } from "../landing-sections/shared/ThemeCard";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeatureDetailsProps {
  title?: string;
  subtitle?: string;
  features: Feature[];
  layout?: "grid" | "list";
  className?: string;
}

export function FeatureDetails({
  title,
  subtitle,
  features,
  layout = "grid",
  className,
}: FeatureDetailsProps) {
  return (
    <SectionWrapper className={className}>
      {(title || subtitle) && (
        <div className="text-center mb-16">
          {title && (
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
            >
              {title}
            </motion.h2>
          )}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-[var(--landing-muted-fg)] max-w-2xl mx-auto"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      )}

      <div
        className={cn(
          layout === "grid"
            ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-6 max-w-3xl mx-auto",
        )}
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <ThemeCard
              hoverEffect
              className={cn(
                "h-full",
                layout === "list" && "flex items-start gap-6",
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--landing-primary)] to-[var(--landing-accent)] flex items-center justify-center",
                  layout === "list" ? "flex-shrink-0" : "mb-4",
                )}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-[var(--landing-muted-fg)]">
                  {feature.description}
                </p>
              </div>
            </ThemeCard>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}
