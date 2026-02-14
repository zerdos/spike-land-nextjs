"use client";

import { Map } from "lucide-react";
import { SwarmSidebar } from "../layout/SwarmSidebar";
import { SwarmTopBar } from "../layout/SwarmTopBar";
import { EmptyState } from "../shared/EmptyState";

export function RoadmapBoard() {
  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 lg:-m-8">
      <SwarmSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SwarmTopBar />
        <div className="flex-1 overflow-y-auto p-4">
          <EmptyState
            icon={Map}
            title="Roadmap"
            description="Track GitHub issues and project board items. Visualize sprint progress and assign work to agents."
          />
        </div>
      </div>
    </div>
  );
}
