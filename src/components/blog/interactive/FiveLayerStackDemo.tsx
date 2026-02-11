"use client";

import { FiveLayerStackCore } from "../../../../packages/video/src/components/core/FiveLayerStackCore";
import { useInViewProgress } from "./useInViewProgress";

export function FiveLayerStackDemo() {
  const { ref, progress } = useInViewProgress();

  return (
    <div ref={ref} className="my-8 flex flex-col items-center py-12 px-4 rounded-xl bg-background border border-border relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-blue-500/5 pointer-events-none" />
      
      <div className="mt-6 text-center relative z-10 mb-12">
        <div className="inline-block px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 text-xs font-bold mb-4 uppercase tracking-tighter">
          Scroll-Triggered Reveal
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Each layer of the prompt stack contributes to the agent's identity and precision. 
          Conserved layers stay in the KV cache to minimize costs.
        </p>
      </div>

      <div className="relative z-10 w-full overflow-hidden flex justify-center">
        <div className="w-full max-w-[700px]">
          <FiveLayerStackCore
            revealCount={5}
            progress={progress}
          />
        </div>
      </div>
    </div>
  );
}
