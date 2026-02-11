"use client";

import { useState, useEffect } from "react";
import { DarwinianTreeCore } from "../../../../packages/video/src/components/core/DarwinianTreeCore";
import { useInViewProgress } from "./useInViewProgress";

export function DarwinianTreeDemo() {
  const { ref, progress } = useInViewProgress();
  const [replayProgress, setReplayProgress] = useState<number | null>(null);

  const handleReplay = () => {
    setReplayProgress(0);
  };

  useEffect(() => {
    if (replayProgress !== null && replayProgress < 1) {
      const frame = requestAnimationFrame(() => {
        setReplayProgress(prev => (prev !== null ? Math.min(prev + 0.01, 1) : null));
      });
      return () => cancelAnimationFrame(frame);
    } 
    
    if (replayProgress !== null && replayProgress >= 1) {
      setReplayProgress(null);
    }
    return undefined;
  }, [replayProgress]);

  const displayProgress = replayProgress !== null ? replayProgress : progress;

  return (
    <div ref={ref} className="my-16 rounded-2xl overflow-hidden border border-white/10 aspect-video bg-[#0a0a0f] relative group">
      <DarwinianTreeCore
        generations={3}
        progress={displayProgress}
        className="w-full h-full"
      />
      
      <div className="absolute top-6 left-6 flex flex-col gap-2">
        <div className="text-xl font-bold text-white tracking-tight">The Survival Loop</div>
        <div className="text-xs text-white/40 uppercase tracking-widest font-mono">Evolutionary Code Improvement</div>
      </div>

      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={handleReplay} 
          type="button"
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] text-white/70 uppercase font-bold tracking-widest backdrop-blur-md cursor-pointer"
        >
          Replay Animation
        </button>
      </div>
    </div>
  );
}
