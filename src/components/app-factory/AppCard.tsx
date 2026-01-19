/**
 * App Card
 *
 * Draggable card representing an app in the Kanban board.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AppState } from "@/types/app-factory";
import { getAppLiveUrl, getStatusColor, PHASE_CONFIG } from "@/types/app-factory";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Bot, ExternalLink, Globe, Play } from "lucide-react";

interface AppCardProps {
  app: AppState;
  onResume?: (appName: string) => void;
}

/**
 * Format duration since a timestamp
 */
function formatTimeSince(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d`;
  if (diffHours > 0) return `${diffHours}h`;
  if (diffMinutes > 0) return `${diffMinutes}m`;
  return "just now";
}

export function AppCard({ app, onResume }: AppCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.name,
    data: { app },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  const statusColor = getStatusColor(app.attempts);
  const phaseConfig = PHASE_CONFIG[app.phase];
  const isJulesActive = app.julesSessionId && app.julesSessionState &&
    ["PENDING", "PLANNING", "IN_PROGRESS", "WAITING_FOR_USER"].includes(app.julesSessionState);

  // Check if app is paused (no active Jules session and not in complete/done phase)
  const isPaused = !isJulesActive && app.phase !== "complete" && app.phase !== "done";

  // Get live URL for the app
  const liveUrl = getAppLiveUrl(app.name);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 transition-shadow hover:shadow-md ${statusColor.border} ${statusColor.bg} ${
        isDragging ? "shadow-lg ring-2 ring-primary" : ""
      } ${isJulesActive ? "ring-2 ring-blue-500/50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{app.name}</p>
          <Badge
            variant="secondary"
            className="mt-1 text-xs"
          >
            {app.category}
          </Badge>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {app.attempts > 0 && (
            <Badge
              variant={app.attempts >= 3 ? "destructive" : "outline"}
              className="text-xs"
            >
              {app.attempts}x
            </Badge>
          )}
        </div>
      </div>

      {/* Jules Session Status */}
      {app.julesSessionId && (
        <div className="mt-2 flex items-center gap-2">
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
              isJulesActive
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            <Bot className={`h-3 w-3 ${isJulesActive ? "animate-pulse" : ""}`} />
            <span>{app.julesSessionState}</span>
          </div>
          {app.julesSessionUrl && (
            <a
              href={app.julesSessionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {app.lastError && (
        <p className="mt-2 truncate text-xs text-red-600 dark:text-red-400">
          {app.lastError}
        </p>
      )}

      {/* Live URL link - show for apps that have been developed */}
      {app.phase !== "plan" && (
        <div className="mt-2 flex items-center gap-2">
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Globe className="h-3 w-3" />
            <span>Live Preview</span>
          </a>
        </div>
      )}

      {/* Resume button for paused apps */}
      {isPaused && onResume && (
        <div className="mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResume(app.name);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
          >
            <Play className="h-3 w-3" />
            <span>Resume Jules</span>
          </button>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {phaseConfig.emoji}
          <span className={phaseConfig.color}>{phaseConfig.label}</span>
        </span>
        <span>{formatTimeSince(app.updatedAt)}</span>
      </div>
    </Card>
  );
}
