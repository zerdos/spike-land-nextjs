"use client";

import { MousePointerClick } from "lucide-react";

import type { McpToolDef } from "@/components/mcp/mcp-tool-registry";
import { getCategoryById } from "@/components/mcp/mcp-tool-registry";
import { McpResponseViewer } from "@/components/mcp/McpResponseViewer";
import { McpToolForm } from "@/components/mcp/McpToolForm";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground gap-3">
        <MousePointerClick className="h-10 w-10 opacity-40" />
        <p className="text-lg">Select a tool from the sidebar to get started</p>
      </div>
    );
  }

  const category = getCategoryById(selectedTool.category);
  const colorClass = category
    ? CATEGORY_COLOR_MAP[category.color] || CATEGORY_COLOR_MAP["blue"]
    : CATEGORY_COLOR_MAP["blue"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-2xl font-bold">{selectedTool.displayName}</h3>
        <p className="text-muted-foreground">{selectedTool.description}</p>
        <div className="flex items-center gap-2">
          {category && (
            <Badge className={colorClass}>
              {category.name}
            </Badge>
          )}
          <Badge variant={selectedTool.tier === "free" ? "success" : "secondary"}>
            {selectedTool.tier}
          </Badge>
        </div>
      </div>

      {/* Form + Response */}
      <div className="grid lg:grid-cols-2 gap-6">
        <McpToolForm
          tool={selectedTool}
          onSubmit={onExecute}
          isExecuting={isExecuting}
        />
        <McpResponseViewer
          response={response}
          error={error}
          isExecuting={isExecuting}
          responseType={selectedTool.responseType}
        />
      </div>
    </div>
  );
}
