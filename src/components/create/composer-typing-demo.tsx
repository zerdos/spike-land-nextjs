"use client";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTypewriter } from "@/hooks/useTypewriter";
import { AnimatePresence, motion } from "framer-motion";

interface ComposerTypingDemoProps {
  isActive: boolean;
}

export function ComposerTypingDemo({ isActive }: ComposerTypingDemoProps) {
  const prefersReducedMotion = useReducedMotion();
  const { displayText, isTyping } = useTypewriter({ enabled: isActive && !prefersReducedMotion });

  if (!isActive || prefersReducedMotion) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 px-4 py-3 pointer-events-none"
      >
        <span className="text-zinc-500 text-base">
          {displayText}
          {isTyping && (
            <span className="inline-block w-0.5 h-5 bg-cyan-400 ml-0.5 animate-pulse align-middle" />
          )}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
