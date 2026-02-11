"use client";

import { useState } from "react";
import { SplitScreenCore } from "../../../../packages/video/src/components/core/SplitScreenCore";

export function SplitScreenDemo() {
  const [split, setSplit] = useState(0.5);

  const LeftSide = () => (
    <div className="w-full h-full bg-[#0a192f] flex flex-col p-8 font-mono text-sm">
      <div className="border border-green-500/30 p-4 rounded-lg bg-green-500/5">
        <div className="grid grid-cols-10 gap-1 opacity-50">
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className={`h-4 rounded-sm ${i % 7 === 0 ? "bg-green-500" : "bg-green-500/20"}`} />
          ))}
        </div>
      </div>
      <div className="mt-4 text-green-400">✓ Grid System Initialized</div>
    </div>
  );

  const RightSide = () => (
    <div className="w-full h-full bg-[#1a0f0f] flex flex-col p-8 font-mono text-sm">
      <div className="border border-red-500/30 p-4 rounded-lg bg-red-500/5 overflow-hidden">
        <div className="text-red-500 space-y-1 animate-pulse">
          <div>ERROR: Uncaught ReferenceError: context is not defined</div>
          <div>at re-render (main.js:124:4)</div>
          <div>at dispatch (react.dom.js:32:1)</div>
          <div className="opacity-70">at handleEvent (events.js:12:1)</div>
        </div>
      </div>
      <div className="mt-4 text-red-400">✗ Runtime Crash (Vibe Paradox)</div>
    </div>
  );

  return (
    <div className="my-12 rounded-2xl overflow-hidden border border-white/10 aspect-video group relative">
      <SplitScreenCore
        leftContent={<LeftSide />}
        rightContent={<RightSide />}
        progress={split}
      />
      
      {/* Interactive handle */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={split}
        onChange={(e) => setSplit(parseFloat(e.target.value))}
        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-ew-resize z-20"
      />
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-xs font-mono text-white/70 border border-white/10 pointer-events-none">
        Drag to reveal the paradox
      </div>
    </div>
  );
}
