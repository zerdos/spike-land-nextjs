/**
 * Kanban Column
 *
 * A droppable column representing a phase in the pipeline.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppPhase, AppState } from "@/types/app-factory";
import { PHASE_CONFIG } from "@/types/app-factory";
import { useDroppable } from "@dnd-kit/core";
import { AppCard } from "./AppCard";

interface KanbanColumnProps {
  phase: AppPhase;
  apps: AppState[];
  onResumeApp?: (appName: string) => void;
}

export function KanbanColumn({ phase, apps, onResumeApp }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: phase,
    data: { phase },
  });

  const config = PHASE_CONFIG[phase];

  return (
    <Card
      ref={setNodeRef}
      className={`flex h-full flex-col transition-colors ${config.bgColor} ${
        isOver ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.emoji}</span>
          <span className={`font-semibold ${config.color}`}>{config.label}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {apps.length}
        </Badge>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-2">
          {apps.length === 0
            ? (
              <div
                className={`rounded-md border-2 border-dashed p-4 text-center text-sm text-muted-foreground ${
                  isOver ? "border-primary bg-primary/10" : "border-muted"
                }`}
              >
                {isOver ? "Drop here" : "No apps"}
              </div>
            )
            : (
              apps.map((app) => <AppCard key={app.name} app={app} onResume={onResumeApp} />)
            )}
        </div>
      </ScrollArea>
    </Card>
  );
}
