/**
 * Activity Feed
 *
 * Live stream of recent events from the app factory pipeline.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HistoryEntry } from "@/types/app-factory";
import { PHASE_CONFIG } from "@/types/app-factory";

interface ActivityFeedProps {
  activity: HistoryEntry[];
}

/**
 * Format timestamp as relative time or time string
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Get event icon and color based on event type
 */
function getEventStyle(event: HistoryEntry): {
  icon: string;
  color: string;
  bgColor: string;
} {
  switch (event.event) {
    case "initialized":
      return {
        icon: "+",
        color: "text-blue-600",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
      };
    case "phase_complete":
      return {
        icon: "",
        color: "text-green-600",
        bgColor: "bg-green-100 dark:bg-green-900/30",
      };
    case "phase_failed":
      return {
        icon: "",
        color: "text-red-600",
        bgColor: "bg-red-100 dark:bg-red-900/30",
      };
    case "manual_move":
      return {
        icon: "",
        color: "text-purple-600",
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
      };
    default:
      return {
        icon: "",
        color: "text-muted-foreground",
        bgColor: "bg-muted",
      };
  }
}

export function ActivityFeed({ activity }: ActivityFeedProps) {
  if (activity.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Activity Feed</h2>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Events will appear here as apps move through the pipeline
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Activity Feed</h2>
      <Card>
        <ScrollArea className="h-64">
          <div className="divide-y divide-border">
            {activity.map((entry, index) => {
              const style = getEventStyle(entry);
              const fromConfig = entry.from ? PHASE_CONFIG[entry.from] : null;
              const toConfig = entry.to ? PHASE_CONFIG[entry.to] : null;

              return (
                <div
                  key={`${entry.appName}-${entry.timestamp}-${index}`}
                  className="flex items-start gap-3 p-3 hover:bg-muted/50"
                >
                  {/* Time */}
                  <span className="w-16 shrink-0 text-xs text-muted-foreground">
                    {formatTime(entry.timestamp)}
                  </span>

                  {/* Event Icon */}
                  <span className={`text-lg ${style.color}`}>{style.icon}</span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{entry.appName}</span>

                      {entry.event === "initialized" && (
                        <Badge variant="outline" className="text-xs">
                          New
                        </Badge>
                      )}

                      {entry.event === "phase_complete" && entry.from && entry.to && (
                        <span className="flex items-center gap-1 text-sm">
                          <span className={fromConfig?.color}>{fromConfig?.label}</span>
                          <span className="text-muted-foreground"></span>
                          <span className={toConfig?.color}>{toConfig?.label}</span>
                        </span>
                      )}

                      {entry.event === "phase_failed" && (
                        <Badge
                          variant="destructive"
                          className="text-xs"
                        >
                          Failed
                        </Badge>
                      )}

                      {entry.event === "manual_move" && entry.from && entry.to && (
                        <span className="flex items-center gap-1 text-sm">
                          <Badge variant="outline" className="text-xs">
                            Manual
                          </Badge>
                          <span className={fromConfig?.color}>{fromConfig?.label}</span>
                          <span className="text-muted-foreground"></span>
                          <span className={toConfig?.color}>{toConfig?.label}</span>
                        </span>
                      )}
                    </div>

                    {entry.reason && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {entry.reason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
