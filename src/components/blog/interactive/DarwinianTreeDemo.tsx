"use client";

import { useState, useEffect } from "react";
import { DarwinianTreeCore } from "../../../../packages/video/src/components/core/DarwinianTreeCore";
import { useInViewProgress } from "./useInViewProgress";

export function DarwinianTreeDemo() {
  const { ref, progress } = useInViewProgress();
  const [replayProgress, setReplayProgress] = useState<number | null>(null);

  const isActive = replayProgress !== null;

  useEffect(() => {
    if (!isActive) return undefined;
    
    let rafId: number;
    const startTime = performance.now();
    const duration = 4000; // 4 seconds for full animation

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const next = Math.min(elapsed / duration, 1);
      
      setReplayProgress(next);

      if (next < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        // Animation complete, reset to scroll control after a small delay or immediately
        // Setting to null reverts to 'progress' (scroll-based), which is 1 if fully in view.
        setReplayProgress(null); 
      }
    };
    
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isActive]);

  const handleReplay = () => {
    setReplayProgress(0);
  };

  const displayProgress = replayProgress !== null ? replayProgress : progress;

  return (
    <div ref={ref} className="my-8 rounded-xl overflow-hidden border border-border aspect-video bg-background relative group">
      <DarwinianTreeCore
        generations={3}
        progress={displayProgress}
        className="w-full h-full"
      />
      
      <div className="absolute top-6 left-6 flex flex-col gap-2 p-4 rounded-xl bg-background/5 backdrop-blur-sm transition-all hover:bg-background/40 border border-transparent hover:border-border/50">
        <div className="text-xl font-bold text-foreground tracking-tight">The Survival Loop</div>
        <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Evolutionary Code Improvement</div>
      </div>

      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={handleReplay} 
          type="button"
          className="px-4 py-2 bg-background/80 hover:bg-accent border border-border rounded-full text-[10px] text-foreground uppercase font-bold tracking-widest backdrop-blur-md cursor-pointer transition-colors"
        >
          Replay Animation
        </button>
      </div>
    </div>
  );
}
