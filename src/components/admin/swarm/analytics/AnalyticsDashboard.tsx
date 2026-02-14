"use client";

import { BarChart3 } from "lucide-react";
import { SwarmSidebar } from "../layout/SwarmSidebar";
import { SwarmTopBar } from "../layout/SwarmTopBar";
import { EmptyState } from "../shared/EmptyState";

export function AnalyticsDashboard() {
  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 lg:-m-8">
      <SwarmSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SwarmTopBar />
        <div className="flex-1 overflow-y-auto p-4">
          <EmptyState
            icon={BarChart3}
            title="Analytics"
            description="View user growth, MCP tool usage, error rates, and token consumption over time."
          />
        </div>
      </div>
    </div>
  );
}
