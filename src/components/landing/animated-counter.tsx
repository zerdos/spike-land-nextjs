"use client";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useInView, useSpring, useMotionValueEvent } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({ value, duration = 2, suffix = "", className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState("0");

  const spring = useSpring(0, {
    duration: prefersReducedMotion ? 0 : duration * 1000,
    bounce: 0,
  });

  useMotionValueEvent(spring, "change", (current) => {
    setDisplayValue(Math.round(current).toLocaleString());
  });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value]);

  if (prefersReducedMotion) {
    return <span ref={ref} className={className}>{value.toLocaleString()}{suffix}</span>;
  }

  return (
    <span ref={ref} className={className}>
      {displayValue}
      {suffix}
    </span>
  );
}
