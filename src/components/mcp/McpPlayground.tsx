"use client";

import { useCallback, useEffect, useState } from "react";

import type { McpToolDef } from "@/components/mcp/mcp-tool-registry";
import { McpToolDetail } from "@/components/mcp/McpToolDetail";
import { McpToolSidebar } from "@/components/mcp/McpToolSidebar";
import { getToolsByCategory } from "@/components/mcp/mcp-tool-registry";

interface McpPlaygroundProps {
  initialCategory?: string;
}

export function McpPlayground({ initialCategory }: McpPlaygroundProps) {
  const [selectedTool, setSelectedTool] = useState<McpToolDef | null>(null);
  const [response, setResponse] = useState<unknown>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategory) {
      const tools = getToolsByCategory(initialCategory);
      if (tools.length > 0) {
        setSelectedTool(tools[0] ?? null);
      }
    }
  }, [initialCategory]);

  const handleSelectTool = useCallback((tool: McpToolDef) => {
    setSelectedTool(tool);
    setResponse(null);
    setError(null);
  }, []);

  const handleExecute = useCallback(async (params: Record<string, unknown>) => {
    if (!selectedTool) return;

    setIsExecuting(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/mcp/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tool: selectedTool.name, params }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsExecuting(false);
    }
  }, [selectedTool]);

  return (
    <section className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">Interactive Playground</h2>
      <div className="flex flex-col lg:flex-row gap-6">
        <McpToolSidebar
          selectedTool={selectedTool}
          onSelectTool={handleSelectTool}
          initialCategory={initialCategory}
        />
        <div className="flex-1 min-w-0">
          <McpToolDetail
            selectedTool={selectedTool}
            onExecute={handleExecute}
            response={response}
            error={error}
            isExecuting={isExecuting}
          />
        </div>
      </div>
    </section>
  );
}
