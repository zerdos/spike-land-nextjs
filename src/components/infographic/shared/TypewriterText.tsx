"use client";

import { cursorBlinkAnimation } from "@/lib/animation-variants";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ANIMATION_TIMING } from "../constants/design-tokens";

interface TypewriterTextProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  showCursor?: boolean;
}

export function TypewriterText({
  text,
  delay = 0,
  speed = ANIMATION_TIMING.typewriter,
  className,
  onComplete,
  showCursor = true,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setIsStarted(true);
    }, delay * 1000);

    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (!isStarted) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex >= text.length) {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
        return;
      }

      setDisplayedText(text.slice(0, currentIndex + 1));
      currentIndex++;
    }, speed);

    return () => clearInterval(interval);
  }, [isStarted, text, speed, onComplete]);

  return (
    <span className={cn("inline-flex items-center", className)}>
      {displayedText}
      {showCursor && !isComplete && (
        <motion.span
          variants={cursorBlinkAnimation}
          animate="animate"
          className="inline-block w-2 h-4 ml-1 bg-current opacity-70"
        />
      )}
    </span>
  );
}
