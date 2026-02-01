"use client";

import { cn } from "@/lib/utils";

interface CodeEditorMockupProps {
  filename: string;
  code: string;
  className?: string;
  language?: string;
  highlightLines?: number[];
  variant?: "good" | "bad" | "neutral";
}

export function CodeEditorMockup({
  filename,
  code,
  className,
  highlightLines = [],
  variant = "neutral",
}: CodeEditorMockupProps) {
  const getBorderColor = () => {
    switch (variant) {
      case "good":
        return "border-emerald-500/30";
      case "bad":
        return "border-red-500/30";
      default:
        return "border-slate-800";
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-[#1e1e1e] shadow-2xl border",
        getBorderColor(),
        className,
      )}
    >
      {/* Editor Tabs */}
      <div className="flex items-center bg-[#252526] border-b border-[#1e1e1e] overflow-hidden">
        <div
          className={cn(
            "px-4 py-2 text-xs flex items-center gap-2 border-r border-[#1e1e1e] bg-[#1e1e1e]",
            variant === "good"
              ? "text-emerald-400"
              : variant === "bad"
              ? "text-red-400"
              : "text-blue-400",
          )}
        >
          <span className="w-2 h-2 rounded-full bg-current opacity-60" />
          {filename}
        </div>
      </div>

      {/* Editor Content */}
      <div className="p-4 overflow-x-auto font-mono text-xs leading-relaxed text-gray-300">
        <pre>
          <code>
            {code.split('\n').map((line, i) => (
              <div
                key={i}
                className={cn(
                  "px-2 -mx-2 rounded",
                  highlightLines.includes(i + 1) && "bg-white/5"
                )}
              >
                <span className="text-gray-600 w-6 inline-block select-none text-right mr-4">{i + 1}</span>
                {line}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
