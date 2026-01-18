/**
 * App Card
 *
 * Draggable card representing an app in the Kanban board.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AppState } from "@/types/app-factory";
import { getStatusColor, PHASE_CONFIG } from "@/types/app-factory";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Bot, ExternalLink } from "lucide-react";

interface AppCardProps {
  app: AppState;
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

export function AppCard({ app }: AppCardProps) {
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
