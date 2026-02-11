"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Custom hook that returns progress (0-1) of an element scrolling into view.
 * Uses IntersectionObserver and requestAnimationFrame for smooth animation.
 */
export function useInViewProgress() {
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let rafId: number;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          const animate = () => {
            const rect = element.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            // Calculate progress: 0 when element top hits window bottom, 
            // 1 when element bottom hits window top (or similar logic)
            // For demos, we want 0 -> 1 as it enters.
            const appearance = (windowHeight - rect.top) / (windowHeight * 0.5);
            const p = Math.min(Math.max(appearance, 0), 1);
            
            setProgress(p);
            
            if (p < 1) {
              rafId = requestAnimationFrame(animate);
            }
          };
          rafId = requestAnimationFrame(animate);
        }
      },
      { threshold: [0, 0.1, 0.5, 1] }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return { ref, progress };
}
