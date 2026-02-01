"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { TypewriterText } from "./TypewriterText";

interface TerminalMockupProps {
  command?: string | string[];
  output?: React.ReactNode;
  className?: string;
  autoPlay?: boolean;
  onCommandComplete?: () => void;
}

export function TerminalMockup({
  command,
  output,
  className,
  autoPlay = true,
  onCommandComplete,
}: TerminalMockupProps) {
  const commands = Array.isArray(command) ? command : [command].filter(Boolean);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-slate-950 border border-slate-800 shadow-2xl font-mono text-sm text-slate-300",
        className,
      )}
    >
      {/* Window Controls */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/50 border-b border-slate-800">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <div className="ml-2 text-xs text-slate-500 select-none">zsh</div>
      </div>

      {/* Terminal Content */}
      <div className="p-4 space-y-2 min-h-[160px]">
        {commands.map((cmd, idx) => (
          <div key={idx} className="flex gap-2">
            <span className="text-emerald-500 select-none">➜</span>
            <span className="text-cyan-500 select-none">~</span>
            <span className="text-white">
              {autoPlay
                ? (
                  <TypewriterText
                    text={cmd || ""}
                    delay={idx * 1}
                    onComplete={idx === commands.length - 1 ? onCommandComplete : undefined}
                  />
                )
                : cmd}
            </span>
          </div>
        ))}

        {output && (
          <div className="mt-4 animate-in fade-in duration-500 slide-in-from-top-1">
            {output}
          </div>
        )}
      </div>
    </div>
  );
}
