"use client";

import { useState } from "react";
import { AttentionSpotlightCore } from "../../../../packages/video/src/components/core/AttentionSpotlightCore";

export function AttentionSpotlightDemo() {
  const [tokenCount, setTokenCount] = useState(25);

  return (
    <div className="my-12 flex flex-col gap-6">
      <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black relative">
        <AttentionSpotlightCore
          tokenCount={tokenCount}
          progress={1}
          className="w-full h-full"
        />
      </div>

      <div className="flex flex-col gap-2 p-6 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-white/70 uppercase tracking-widest">Token Count</span>
          <span className="text-2xl font-mono text-cyan-400">{tokenCount}</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={tokenCount}
          onChange={(e) => setTokenCount(parseInt(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <p className="text-xs text-white/40 mt-2 italic">
          As tokens increase, the "spotlight" of attention dims and spreads, illustrating how context window size impacts focus.
        </p>
      </div>
    </div>
  );
}
