"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreMcpToolListProps {
  tools: { name: string; category: string; description: string }[];
}

function formatCategory(category: string): string {
  return category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StoreMcpToolList({ tools }: StoreMcpToolListProps) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const grouped = tools.reduce<Record<string, typeof tools>>((acc, tool) => {
    const list = acc[tool.category] ?? [];
    list.push(tool);
    acc[tool.category] = list;
    return acc;
  }, {});

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, categoryTools]) => {
        const isOpen = openCategories.has(category);
        return (
          <div
            key={category}
            className="overflow-hidden rounded-xl border border-white/10"
          >
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className="flex w-full cursor-pointer items-center justify-between bg-white/5 p-4 transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-zinc-400" />
                <span className="font-medium text-zinc-200">
                  {formatCategory(category)}
                </span>
                <Badge variant="secondary">
                  {categoryTools.length} tool{categoryTools.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {isOpen && (
              <div>
                {categoryTools.map((tool, index) => (
                  <div
                    key={tool.name}
                    className={cn(
                      "border-t border-white/5 px-4 py-3",
                      index % 2 === 0 && "bg-white/[0.02]",
                    )}
                  >
                    <p className="font-mono text-sm text-cyan-400">
                      {tool.name}
                    </p>
                    <p className="text-sm text-zinc-400">{tool.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
