"use client";

import { SwarmSidebar } from "../layout/SwarmSidebar";
import { SwarmTopBar } from "../layout/SwarmTopBar";
import { ActiveAgentsWidget } from "./ActiveAgentsWidget";
import { AlertsFeedWidget } from "./AlertsFeedWidget";
import { DashboardGrid } from "./DashboardGrid";
import { DeploymentTimelineWidget } from "./DeploymentTimelineWidget";
import { EnvironmentSummaryWidget } from "./EnvironmentSummaryWidget";
import { MetricsWidget } from "./MetricsWidget";

export function SwarmDashboard() {
  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 lg:-m-8">
      <SwarmSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SwarmTopBar />
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <MetricsWidget />
          <DashboardGrid>
            <EnvironmentSummaryWidget />
            <AlertsFeedWidget />
            <ActiveAgentsWidget />
            <DeploymentTimelineWidget />
          </DashboardGrid>
        </div>
      </div>
    </div>
  );
}
