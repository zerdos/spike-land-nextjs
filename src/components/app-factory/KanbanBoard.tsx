/**
 * Kanban Board
 *
 * Main board with drag-and-drop between phase columns.
 */

"use client";

import type { AppPhase, AppState } from "@/types/app-factory";
import { PHASES_ORDERED } from "@/types/app-factory";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { AppCard } from "./AppCard";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  apps: AppState[];
  onMoveApp: (appName: string, toPhase: AppPhase) => Promise<void>;
}

export function KanbanBoard({ apps, onMoveApp }: KanbanBoardProps) {
  const [activeApp, setActiveApp] = useState<AppState | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  // Group apps by phase
  const appsByPhase = useMemo(() => {
    const grouped: Record<AppPhase, AppState[]> = {
      plan: [],
      develop: [],
      test: [],
      debug: [],
      polish: [],
      complete: [],
    };

    for (const app of apps) {
      grouped[app.phase].push(app);
    }

    // Sort each column by attempts (ascending) then by updatedAt (descending)
    for (const phase of PHASES_ORDERED) {
      grouped[phase].sort((a, b) => {
        if (a.attempts !== b.attempts) return a.attempts - b.attempts;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }

    return grouped;
  }, [apps]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const app = apps.find((a) => a.name === active.id);
    if (app) {
      setActiveApp(app);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveApp(null);

    if (!over) return;

    const appName = active.id as string;
    const toPhase = over.id as AppPhase;

    // Find the app being dragged
    const app = apps.find((a) => a.name === appName);
    if (!app) return;

    // Only move if phase is different
    if (app.phase !== toPhase) {
      onMoveApp(appName, toPhase);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-6 gap-3">
        {PHASES_ORDERED.map((phase) => (
          <div key={phase} className="h-[400px]">
            <KanbanColumn phase={phase} apps={appsByPhase[phase]} />
          </div>
        ))}
      </div>

      {/* Drag Overlay - shows the card being dragged */}
      <DragOverlay>
        {activeApp
          ? (
            <div className="w-48 rotate-3 scale-105">
              <AppCard app={activeApp} />
            </div>
          )
          : null}
      </DragOverlay>
    </DndContext>
  );
}
