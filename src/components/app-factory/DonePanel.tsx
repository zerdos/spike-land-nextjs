/**
 * Done Panel
 *
 * Panel showing completed and reviewed apps with links to live deployments.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AppState } from "@/types/app-factory";
import { getAppLiveUrl } from "@/types/app-factory";
import { CheckCircle, ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";

interface DonePanelProps {
  apps: AppState[];
}

export function DonePanel({ apps }: DonePanelProps) {
  const [search, setSearch] = useState("");

  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps;

    const lowerSearch = search.toLowerCase();
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(lowerSearch) ||
        app.category.toLowerCase().includes(lowerSearch),
    );
  }, [apps, search]);

  // Group apps by category
  const groupedApps = useMemo(() => {
    const groups: Record<string, AppState[]> = {};
    for (const app of filteredApps) {
      const existing = groups[app.category];
      if (existing) {
        existing.push(app);
      } else {
        groups[app.category] = [app];
      }
    }
    // Sort categories alphabetically
    return Object.fromEntries(
      Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)),
    );
  }, [filteredApps]);

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">Done</h2>
        </div>
        <Badge variant="secondary">{apps.length} apps</Badge>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search done apps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Apps List */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {Object.keys(groupedApps).length === 0
          ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {apps.length === 0
                ? "No apps completed yet"
                : "No apps match your search"}
            </p>
          )
          : (
            Object.entries(groupedApps).map(([category, categoryApps]) => (
              <div key={category}>
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  {category} ({categoryApps.length})
                </h3>
                <div className="space-y-2">
                  {categoryApps.map((app) => <DoneAppItem key={app.name} app={app} />)}
                </div>
              </div>
            ))
          )}
      </div>
    </Card>
  );
}

interface DoneAppItemProps {
  app: AppState;
}

function DoneAppItem({ app }: DoneAppItemProps) {
  const liveUrl = getAppLiveUrl(app.name);

  return (
    <div className="group flex items-center justify-between rounded-lg border bg-card p-2 hover:bg-accent">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{app.name}</p>
        <p className="text-xs text-muted-foreground">
          Completed {formatDate(app.updatedAt)}
        </p>
      </div>
      <a
        href={liveUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-2 flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
      >
        <ExternalLink className="h-3 w-3" />
        <span>View</span>
      </a>
    </div>
  );
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString();
}
