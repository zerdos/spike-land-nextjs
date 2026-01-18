/**
 * Backlog Panel
 *
 * Shows the master list of app ideas that can be added to the pipeline.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MasterListItem } from "@/types/app-factory";
import { useMemo, useState } from "react";

interface BacklogPanelProps {
  masterList: MasterListItem[];
  onItemClick: (item: MasterListItem) => void;
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "utility", label: "Utility" },
  { value: "visualization", label: "Visualization" },
  { value: "productivity", label: "Productivity" },
  { value: "interactive", label: "Interactive" },
  { value: "health", label: "Health" },
  { value: "dogs", label: "Dogs" },
];

const CATEGORY_COLORS: Record<string, string> = {
  utility: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  visualization: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  productivity: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  interactive: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  health: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  dogs: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export function BacklogPanel({ masterList, onItemClick }: BacklogPanelProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filteredItems = useMemo(() => {
    return masterList.filter((item) => {
      const matchesSearch = search === "" ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = category === "all" || item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [masterList, search, category]);

  // Group by category for display
  const groupedItems = useMemo(() => {
    if (category !== "all") {
      return { [category]: filteredItems };
    }

    const groups: Record<string, MasterListItem[]> = {};
    for (const item of filteredItems) {
      const existing = groups[item.category];
      if (existing) {
        existing.push(item);
      } else {
        groups[item.category] = [item];
      }
    }
    return groups;
  }, [filteredItems, category]);

  return (
    <Card className="flex h-[calc(100vh-220px)] flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Backlog</h2>
        <p className="text-xs text-muted-foreground">
          {masterList.length} apps available
        </p>

        <div className="mt-3 space-y-2">
          <Input
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(groupedItems).map(([categoryName, items]) => (
            <div key={categoryName} className="mb-4">
              {category === "all" && (
                <p className="mb-2 px-2 text-xs font-medium uppercase text-muted-foreground">
                  {categoryName} ({items.length})
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => onItemClick(item)}
                    className="w-full rounded-md p-2 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-xs ${CATEGORY_COLORS[item.category] || ""}`}
                      >
                        {item.category}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No apps match your filters
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
