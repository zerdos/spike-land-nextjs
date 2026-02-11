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

  const STATES = [
    "Planning", "Writing", "Typing", "Linting", "Fixing", "Building", "Testing"
  ];

  return (
    <div ref={ref} className="my-8 flex flex-col gap-4">
      <div className="rounded-xl overflow-hidden border border-border aspect-video bg-background relative group">
        <AgentLoopCore
          revealCount={7}
          activeState={activeState}
          progress={inViewProgress}
          className="w-full h-full"
        />
        
        <div className="absolute top-6 left-6 text-2xl font-black text-muted-foreground italic tracking-tighter opacity-20 group-hover:opacity-100 transition-opacity pointer-events-none">
          THE LOOP
        </div>

        <div className="absolute bottom-6 left-6 flex gap-2" role="tablist" aria-label="Agent states">
          {STATES.map((stateName, i) => (
            <button
              key={stateName}
              type="button"
              role="tab"
              aria-selected={i === activeState}
              aria-label={`Select ${stateName} state`}
              onClick={() => {
                setActiveState(i);
                setIsPaused(true);
              }}
              className={`h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                i === activeState ? "bg-cyan-500 w-12" : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-8"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsPaused(!isPaused)}
          className="absolute bottom-6 right-6 px-4 py-2 rounded-full bg-background/80 border border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors backdrop-blur-sm"
        >
          {isPaused ? "Play" : "Pause"}
        </button>
      </div>
      
      <p className="text-center text-xs text-muted-foreground italic font-mono">
        Click the indicators or pause to focus on a specific state of the agent's workflow.
      </p>
    </div>
  );
}
