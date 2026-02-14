"use client";

import { Badge } from "@/components/ui/badge";
import type { DocsSearchEntry } from "@/lib/docs/types";
import { cn } from "@/lib/utils";
import { BookOpen, Code2, FileText, Wrench } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const TYPE_ICONS: Record<DocsSearchEntry["type"], React.ComponentType<{ className?: string }>> = {
  tool: Wrench,
  api: Code2,
  page: FileText,
  guide: BookOpen,
};

const TYPE_LABELS: Record<DocsSearchEntry["type"], string> = {
  tool: "MCP Tool",
  api: "API",
  page: "Page",
  guide: "Guide",
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
}

interface SearchResultsProps {
  results: DocsSearchEntry[];
  onSelect: (href: string) => void;
}

export function SearchResults({ results, onSelect }: SearchResultsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const grouped = results.reduce<Record<string, DocsSearchEntry[]>>((acc, entry) => {
    const key = entry.type;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(entry);
    return acc;
  }, {});

  const flatResults = results;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const selected = flatResults[activeIndex];
        if (selected) {
          onSelect(selected.href);
        }
      }
    },
    [flatResults, activeIndex, onSelect],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  useEffect(() => {
    const activeElement = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    if (activeElement) {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (results.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-sm">No results found</p>
      </div>
    );
  }

  let flatIndex = 0;

  return (
    <div ref={listRef} className="divide-y divide-white/5" role="listbox">
      {(Object.keys(grouped) as Array<DocsSearchEntry["type"]>).map((type) => {
        const entries = grouped[type];
        if (!entries || entries.length === 0) return null;
        const Icon = TYPE_ICONS[type];

        return (
          <div key={type} className="py-2">
            <div className="flex items-center gap-2 px-4 py-1.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                {TYPE_LABELS[type]}
              </span>
              <span className="text-[10px] text-muted-foreground/30 ml-auto tabular-nums">
                {entries.length}
              </span>
            </div>
            {entries.map((entry) => {
              const currentIndex = flatIndex;
              flatIndex += 1;
              const isActive = currentIndex === activeIndex;

              return (
                <button
                  key={entry.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  data-index={currentIndex}
                  className={cn(
                    "w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors duration-150 rounded-lg mx-1",
                    isActive
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-white/5",
                  )}
                  onClick={() => onSelect(entry.href)}
                  onMouseEnter={() => setActiveIndex(currentIndex)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">
                      {entry.title}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">
                      {truncate(entry.description, 100)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 mt-0.5">
                    {entry.category}
                  </Badge>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
