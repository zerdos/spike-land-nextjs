"use client";

import { useState, useEffect } from "react";
import { RecursiveZoomCore } from "../../../../packages/video/src/components/core/RecursiveZoomCore";
import { useInViewProgress } from "./useInViewProgress";

export function RecursiveZoomDemo() {
  const { ref, progress: inViewProgress } = useInViewProgress();
  const [autoProgress, setAutoProgress] = useState(0);

  const isInView = inViewProgress > 0;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    // Only run interval when component is in view (C4)
    if (isInView) {
      interval = setInterval(() => {
        setAutoProgress((prev) => (prev + 0.005) % 1);
      }, 16);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInView]); // Only re-run when visibility state changes

  const labels = [
    "Context Engineering",
    "Claude Code Plan Mode",
    "Self-Improving Agent",
    "5-Layer Prompt Stack",
    "Context Engineering",
  ];

  return (
    <div ref={ref} className="my-8 rounded-xl overflow-hidden border border-border aspect-square sm:aspect-video relative group bg-background">
      <RecursiveZoomCore
        labels={labels}
        progress={autoProgress > 0 ? autoProgress : inViewProgress}
        zoomSpeed={0.5}
        className="w-full h-full"
      />
      
      <div className="absolute inset-0 pointer-events-none border-[12px] border-black/20 rounded-xl" />
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-[1px] h-[1px] bg-cyan-400 shadow-[0_0_100px_40px_rgba(34,211,238,0.15)]" />
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
        <div className="bg-background/60 backdrop-blur-xl p-4 rounded-xl border border-border max-w-[240px]">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-tighter mb-1">Infinite Progression</div>
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            Every solution creates a new context, and every context demands a new solution.
          </div>
        </div>
      </div>
    </div>
  );
}
