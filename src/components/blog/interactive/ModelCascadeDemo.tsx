"use client";

import { useState } from "react";
import { ModelCascadeCore } from "../../../../packages/video/src/components/core/ModelCascadeCore";
import { useInViewProgress } from "./useInViewProgress";

export function ModelCascadeDemo() {
  const { ref, progress } = useInViewProgress();
  const [hoverIndex, setHoverIndex] = useState(-1);

  return (
    <div ref={ref} className="my-16 py-12 rounded-3xl bg-black border border-white/5 flex flex-col items-center">
      <div className="w-full relative px-4 overflow-x-auto">
        <ModelCascadeCore
          revealCount={3}
          progress={progress}
          highlightIndex={hoverIndex}
          className="min-w-[800px]"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl px-6">
        {[
          { name: "Opus", color: "text-[#9945FF]", bg: "bg-[#9945FF]/10", border: "border-[#9945FF]/30", desc: "The Brain" },
          { name: "Sonnet", color: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10", border: "border-[#3B82F6]/30", desc: "The Surgeon" },
          { name: "Haiku", color: "text-[#10B981]", bg: "bg-[#10B981]/10", border: "border-[#10B981]/30", desc: "The Librarian" },
        ].map((m, i) => (
          <div
            key={m.name}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(-1)}
            className={`p-4 rounded-xl border ${m.bg} ${m.border} cursor-pointer transition-all ${hoverIndex === i ? "scale-105" : "opacity-70"}`}
          >
            <div className={`text-sm font-black italic tracking-tighter ${m.color}`}>{m.name.toUpperCase()}</div>
            <div className="text-[10px] text-white/40 font-mono mt-1">{m.desc}</div>
          </div>
        ))}
      </div>
      
      <p className="mt-8 text-[11px] text-white/30 uppercase tracking-[0.2em] font-bold">
        Hover to isolate model roles
      </p>
    </div>
  );
}
