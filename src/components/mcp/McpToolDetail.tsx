"use client";

import { MousePointerClick } from "lucide-react";

import type { McpToolDef } from "@/components/mcp/mcp-tool-registry";
import { getCategoryById } from "@/components/mcp/mcp-tool-registry";
import { McpResponseViewer } from "@/components/mcp/McpResponseViewer";
import { McpToolForm } from "@/components/mcp/McpToolForm";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface McpToolDetailProps {
  selectedTool: McpToolDef | null;
  onExecute: (params: Record<string, unknown>) => void;
  response: unknown;
  error: string | null;
  isExecuting: boolean;
}

const CATEGORY_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  pink: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  layers: "bg-white/10 text-white/80 border-white/20",
};

export function McpToolDetail({
  selectedTool,
  onExecute,
  response,
  error,
  isExecuting,
}: McpToolDetailProps) {
  if (!selectedTool) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground gap-4 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02] p-12 text-center backdrop-blur-sm">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10 shadow-xl">
          <MousePointerClick className="h-10 w-10 opacity-50 text-cyan-400" />
        </div>
        <h3 className="text-2xl font-bold text-foreground tracking-tight">Select a Tool</h3>
        <p className="text-muted-foreground max-w-sm leading-relaxed">
          Choose a tool from the sidebar to view its documentation, configure parameters, and execute it live.
        </p>
      </div>
    );
  }

  const category = getCategoryById(selectedTool.category);
  const colorClass = category
    ? CATEGORY_COLOR_MAP[category.color] || CATEGORY_COLOR_MAP["blue"]
    : CATEGORY_COLOR_MAP["blue"];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      {/* Header */}
      <Card className="glass-1 glass-edge p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          {/* Optional decorative icon could go here */}
        </div>
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-3xl font-bold tracking-tight text-white">{selectedTool.displayName}</h3>
            <div className="flex items-center gap-2">
              {category && (
                <Badge className={colorClass} variant="outline">
                  {category.name}
                </Badge>
              )}
              <Badge variant={selectedTool.tier === "free" ? "success" : "secondary"}>
                {selectedTool.tier === "free" ? "Free" : "Pro"}
              </Badge>
            </div>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {selectedTool.description}
          </p>
        </div>
      </Card>

      {/* Form + Response */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <McpToolForm
            tool={selectedTool}
            onSubmit={onExecute}
            isExecuting={isExecuting}
          />
        </div>
        <div className="sticky top-24 space-y-6">
           <McpResponseViewer
            response={response}
            error={error}
            isExecuting={isExecuting}
            responseType={selectedTool.responseType}
          />
        </div>
      </div>
    </div>
  );
}
