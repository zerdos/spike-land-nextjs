"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ComposerGlowProps {
  isFocused: boolean;
  children: ReactNode;
  className?: string;
}

export function ComposerGlow({ isFocused, children, className }: ComposerGlowProps) {

  return (
    <div className={cn("relative rounded-2xl p-[1px]", className)}>
      {/* Animated gradient border — rotates via framer-motion */}
      <motion.div
        className="absolute inset-[-1px] rounded-2xl"
        animate={{
          opacity: isFocused ? 0.8 : 0.4,
        }}
        transition={{
          opacity: { duration: 0.3 },
        }}
        style={{
          background:
            "conic-gradient(from 0deg, #06b6d4, #a855f7, #ec4899, #06b6d4)",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          padding: "1px",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
        }}
      />

      {/* Inner content container */}
      <div className="relative glass-2 rounded-2xl">
        {children}
      </div>
    </div>
  );
}
