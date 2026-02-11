"use client";

import { useState } from "react";
import { BayesianConfidenceCore } from "../../../../packages/video/src/components/core/BayesianConfidenceCore";
import { useInViewProgress } from "./useInViewProgress";

export function BayesianConfidenceDemo() {
  const { ref, progress } = useInViewProgress();
  const [helps, setHelps] = useState(5);
  const [fails, setFails] = useState(1);

  return (
    <div ref={ref} className="my-8 flex flex-col gap-6 items-center">
      <div className="rounded-xl overflow-hidden border border-border bg-background w-full max-w-xl" aria-live="polite" aria-label={`Confidence score visualization: ${helps} successes, ${fails} failures`}>
        <BayesianConfidenceCore
          helps={helps}
          fails={fails}
          progress={progress}
        />
      </div>

      <div className="flex gap-4 w-full max-w-md">
        <button
          type="button"
          onClick={() => setHelps(h => h + 1)}
          className="flex-1 px-4 py-3 sm:px-8 sm:py-4 rounded-xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-500 font-black transition-all active:scale-95 text-sm sm:text-base"
          aria-label="Log success (increases confidence)"
        >
          LOG SUCCESS
        </button>
        <button
          type="button"
          onClick={() => setFails(f => f + 1)}
          className="flex-1 px-4 py-3 sm:px-8 sm:py-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-500 font-black transition-all active:scale-95 text-sm sm:text-base"
          aria-label="Log failure (decreases confidence)"
        >
          LOG FAILURE
        </button>
      </div>

      <button
        type="button"
        onClick={() => { setHelps(0); setFails(0); }}
        className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest hover:text-foreground transition-colors"
      >
        Reset Counter
      </button>
      
      <div className="max-w-md text-center">
        <p className="text-xs text-muted-foreground leading-relaxed font-mono">
          This uses Laplace's "Rule of Succession" to estimate confidence in an agent's ability based on historical data. 
          Real-world agents transition from <span className="text-yellow-500 font-bold">CANDIDATE</span> to <span className="text-green-500 font-bold">ACTIVE</span> as they prove their reliability.
        </p>
      </div>
    </div>
  );
}
