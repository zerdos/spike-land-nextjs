"use client";

import { useState } from "react";
import { BayesianConfidenceCore } from "../../../../packages/video/src/components/core/BayesianConfidenceCore";
import { useInViewProgress } from "./useInViewProgress";

export function BayesianConfidenceDemo() {
  const { ref, progress } = useInViewProgress();
  const [helps, setHelps] = useState(5);
  const [fails, setFails] = useState(1);

  return (
    <div ref={ref} className="my-16 flex flex-col gap-6 items-center">
      <div className="rounded-3xl overflow-hidden border border-white/10 bg-black w-full max-w-xl">
        <BayesianConfidenceCore
          helps={helps}
          fails={fails}
          progress={progress}
        />
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setHelps(h => h + 1)}
          className="flex-1 px-8 py-4 rounded-2xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-400 font-black transition-all active:scale-95"
        >
          LOG SUCCESS
        </button>
        <button
          type="button"
          onClick={() => setFails(f => f + 1)}
          className="flex-1 px-8 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-black transition-all active:scale-95"
        >
          LOG FAILURE
        </button>
      </div>

      <button
        type="button"
        onClick={() => { setHelps(0); setFails(0); }}
        className="text-[10px] text-white/20 uppercase font-bold tracking-widest hover:text-white/40 transition-colors"
      >
        Reset Counter
      </button>
      
      <div className="max-w-md text-center">
        <p className="text-xs text-white/40 leading-relaxed font-mono">
          This uses Laplace's "Rule of Succession" to estimate confidence in an agent's ability based on historical data. 
          Real-world agents transition from <span className="text-yellow-400">CANDIDATE</span> to <span className="text-green-400">ACTIVE</span> as they prove their reliability.
        </p>
      </div>
    </div>
  );
}
