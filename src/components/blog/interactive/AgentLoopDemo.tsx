"use client";

import { useState, useEffect } from "react";
import { AgentLoopCore } from "../../../../packages/video/src/components/core/AgentLoopCore";
import { useInViewProgress } from "./useInViewProgress";

export function AgentLoopDemo() {
  const { ref, progress: inViewProgress } = useInViewProgress();
  const [activeState, setActiveState] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (inViewProgress > 0.5 && !isPaused) {
      const interval = setInterval(() => {
        setActiveState((prev) => (prev + 1) % 7);
      }, 2000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [inViewProgress, isPaused]);

  return (
    <div ref={ref} className="my-16 flex flex-col gap-4">
      <div className="rounded-3xl overflow-hidden border border-white/10 aspect-video bg-[#0a0a0f] relative group">
        <AgentLoopCore
          revealCount={7}
          activeState={activeState}
          progress={inViewProgress}
          className="w-full h-full"
        />
        
        <div className="absolute top-6 left-6 text-2xl font-black text-white italic tracking-tighter opacity-20 group-hover:opacity-100 transition-opacity">
          THE LOOP
        </div>

        <div className="absolute bottom-6 left-6 flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveState(i);
                setIsPaused(true);
              }}
              className={`w-8 h-1 rounded-full transition-all ${
                i === activeState ? "bg-cyan-400 w-12" : "bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="absolute bottom-6 right-6 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 uppercase tracking-widest hover:text-white transition-colors"
        >
          {isPaused ? "Play" : "Pause"}
        </button>
      </div>
      
      <p className="text-center text-xs text-white/30 italic font-mono">
        Click the indicators or pause to focus on a specific state of the agent's workflow.
      </p>
    </div>
  );
}
