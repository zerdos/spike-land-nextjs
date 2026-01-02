"use client";

import { memo, useEffect, useState } from "react";

interface CountdownDigitProps {
  value: number;
  label: string;
  highlight?: boolean;
}

/**
 * A glass morphism card for displaying a countdown digit/unit.
 * Optimized for performance with memoization and reduced animations.
 */
function CountdownDigit(
  { value, label, highlight = false }: CountdownDigitProps,
) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  // Trigger flip animation when value changes
  useEffect(() => {
    if (value === displayValue) {
      return;
    }
    setIsFlipping(true);
    // Small delay to show flip animation
    const timer = setTimeout(() => {
      setDisplayValue(value);
      setIsFlipping(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [value, displayValue]);

  // Format to 2 digits, except for days which could be 3
  const formattedValue = label === "DAYS"
    ? displayValue
    : displayValue.toString().padStart(2, "0");

  return (
    <div
      className={`group flex flex-col items-center gap-3 ${
        highlight ? "animate-shake-subtle" : ""
      }`}
    >
      <div
        className={`relative flex h-20 w-16 items-center justify-center rounded-xl border backdrop-blur-md transition-all duration-300 sm:h-28 sm:w-24 md:h-32 md:w-28 ${
          highlight
            ? "border-red-500/60 bg-red-500/10 scale-110"
            : isFlipping
            ? "scale-105 border-cyan-500/40 bg-white/10"
            : "scale-100 border-white/20 bg-white/5"
        }`}
        style={{
          boxShadow: highlight
            ? "0 0 40px rgba(239, 68, 68, 0.3), inset 0 0 20px rgba(239, 68, 68, 0.1)"
            : "0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.1)",
        }}
      >
        <span
          className={`relative z-10 font-mono text-3xl font-black tracking-tighter sm:text-5xl md:text-6xl transition-transform ${
            highlight ? "text-red-400" : "text-cyan-400"
          } ${isFlipping ? "animate-flip-in" : ""}`}
          style={{
            textShadow: highlight
              ? "0 0 20px rgba(239, 68, 68, 0.8)"
              : "0 0 15px rgba(34, 211, 238, 0.5)",
          }}
        >
          {formattedValue}
        </span>
      </div>

      <span
        className={`text-[10px] font-bold tracking-[0.2em] sm:text-xs ${
          highlight ? "text-red-400/80 animate-pulse" : "text-cyan-300/60"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default memo(CountdownDigit);
