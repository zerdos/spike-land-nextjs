"use client";

import { useState } from "react";
import { AttentionSpotlightCore } from "../../../../packages/video/src/components/core/AttentionSpotlightCore";

export function AttentionSpotlightDemo() {
  const [tokenCount, setTokenCount] = useState(25);

  return (
    <div className="my-8 flex flex-col gap-6">
      <div className="rounded-xl overflow-hidden border border-border aspect-video bg-background relative">
        <AttentionSpotlightCore
          tokenCount={tokenCount}
          progress={1}
          className="w-full h-full"
        />
      </div>

      <div className="flex flex-col gap-4 p-6 rounded-xl bg-card border border-border">
        <div className="flex justify-between items-center">
          <label htmlFor="token-count-slider" className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Token Count</label>
          <span className="text-2xl font-mono text-cyan-500">{tokenCount}</span>
        </div>
        <input
          id="token-count-slider"
          type="range"
          min="1"
          max="100"
          value={tokenCount}
          onChange={(e) => setTokenCount(parseInt(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-cyan-500"
          aria-label="Adjust token count to see attention dilution"
        />
        <p className="text-xs text-muted-foreground italic">
          As tokens increase, the "spotlight" of attention dims and spreads, illustrating how context window size impacts focus.
        </p>
      </div>
    </div>
  );
}
