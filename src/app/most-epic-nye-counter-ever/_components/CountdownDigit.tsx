"use client";

import { useEffect, useState } from "react";

interface CountdownDigitProps {
  value: number;
  label: string;
}

/**
 * A glass morphism card for displaying a countdown digit/unit.
 * Features a glowing cyan pulse effect and responsive sizing.
 */
export default function CountdownDigit({ value, label }: CountdownDigitProps) {
  const [isPulsing, setIsPulsing] = useState(false);

  // Trigger pulse animation when value changes
  useEffect(() => {
    setIsPulsing(true);
    const timer = setTimeout(() => setIsPulsing(false), 500);
    return () => clearTimeout(timer);
  }, [value]);

  // Format to 2 digits, except for days which could be 3
  const formattedValue = label === "DAYS" ? value : value.toString().padStart(2, "0");

  return (
    <div className="group flex flex-col items-center gap-4">
      <div
        className={`relative flex h-24 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md transition-all duration-500 sm:h-32 sm:w-28 md:h-40 md:w-36 ${
          isPulsing ? "scale-105 border-cyan-500/40" : "scale-100"
        }`}
        style={{
          boxShadow: isPulsing
            ? "0 0 30px rgba(34, 211, 238, 0.2), inset 0 0 15px rgba(255, 255, 255, 0.1)"
            : "0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-cyan-500/5 blur-2xl group-hover:bg-cyan-500/10" />

        <span
          className={`animate-glow-pulse relative z-10 font-mono text-4xl font-bold tracking-tighter text-cyan-400 sm:text-6xl md:text-8xl ${
            isPulsing ? "animate-digit-pulse" : ""
          }`}
          style={{
            textShadow: "0 0 15px rgba(34, 211, 238, 0.5)",
          }}
        >
          {formattedValue}
        </span>
      </div>

      <span className="text-[10px] font-bold tracking-[0.3em] text-cyan-300/60 transition-colors group-hover:text-cyan-400 sm:text-xs md:text-sm">
        {label}
      </span>
    </div>
  );
}
