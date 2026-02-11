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
      <div className="absolute inset-[-1px] rounded-2xl bg-white/5 border border-white/10" />

      {/* Inner content container */}
      <div className="relative glass-2 rounded-2xl">
        {children}
      </div>
    </div>
  );
}
