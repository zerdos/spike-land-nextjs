"use client";

import { FiveLayerStackCore } from "../../../../packages/video/src/components/core/FiveLayerStackCore";
import { useInViewProgress } from "./useInViewProgress";

export function FiveLayerStackDemo() {
  const { ref, progress } = useInViewProgress();

  return (
    <div ref={ref} className="my-16 flex flex-col items-center py-12 px-4 rounded-3xl bg-black/40 border border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-blue-500/10 pointer-events-none" />
      
      <div className="relative z-10 w-full overflow-hidden">
        <FiveLayerStackCore
          revealCount={5}
          progress={progress}
        />
      </div>

      <div className="mt-12 text-center relative z-10">
        <div className="inline-block px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-4 uppercase tracking-tighter">
          Scroll-Triggered Reveal
        </div>
        <p className="text-sm text-white/50 max-w-md">
          Each layer of the prompt stack contributes to the agent's identity and precision. 
          Conserved layers stay in the KV cache to minimize costs.
        </p>
      </div>
    </div>
  );
}
