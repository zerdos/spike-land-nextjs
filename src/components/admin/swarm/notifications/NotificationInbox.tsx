"use client";

import { Bell } from "lucide-react";
import { SwarmSidebar } from "../layout/SwarmSidebar";
import { SwarmTopBar } from "../layout/SwarmTopBar";
import { EmptyState } from "../shared/EmptyState";

export function NotificationInbox() {
  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 lg:-m-8">
      <SwarmSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SwarmTopBar />
        <div className="flex-1 overflow-y-auto p-4">
          <EmptyState
            icon={Bell}
            title="Notifications"
            description="Real-time alerts for deployments, errors, agent status changes, and system events."
          />
        </div>
      </div>
    </div>
  );
}
