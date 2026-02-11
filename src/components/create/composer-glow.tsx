"use client";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ComposerGlowProps {
  isFocused: boolean;
  children: ReactNode;
  className?: string;
}

export function ComposerGlow({ isFocused, children, className }: ComposerGlowProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={cn("relative rounded-2xl p-[1px]", className)}>
      {/* Animated gradient border — rotates via framer-motion */}
      <motion.div
        className="absolute inset-[-1px] rounded-2xl"
        animate={{
          opacity: isFocused ? 0.8 : 0.4,
          rotate: prefersReducedMotion ? 0 : 360,
        }}
        transition={{
          opacity: { duration: 0.3 },
          rotate: prefersReducedMotion
            ? undefined
            : { duration: 4, repeat: Infinity, ease: "linear" },
        }}
        style={{
          background:
            "conic-gradient(from 0deg, #06b6d4, #a855f7, #ec4899, #06b6d4)",
        }}
      />

      {/* Inner content container */}
      <div className="relative glass-2 rounded-2xl">
        {children}
      </div>
    </div>
  );
}
