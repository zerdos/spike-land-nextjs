"use client";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

interface McpConfigSnippetProps {
  code: string;
  language?: "json" | "bash";
  className?: string;
}

export function McpConfigSnippet({
  code,
  language,
  className,
}: McpConfigSnippetProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0d1117]",
        className,
      )}
    >
      {/* Window Controls */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/[0.05]">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-sm" />
        </div>
        <div className="flex-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium ml-[-3.5rem]">
          {language === "bash" ? "Terminal" : language || "Config"}
        </div>
      </div>

      {/* Code Area */}
      <div className="p-6 relative group">
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <CopyButton text={code} />
        </div>
        <pre className="overflow-x-auto custom-scrollbar">
          <code className={cn(
            "font-mono text-sm leading-relaxed",
            language === "bash" ? "text-emerald-400" : "text-blue-300"
          )}>{code}</code>
        </pre>
      </div>
    </div>
  );
}
