/**
 * App Factory Dashboard Client Component
 *
 * Real-time Kanban-style dashboard for monitoring Jules agents
 * building apps through the development pipeline.
 */

"use client";

import { ActivityFeed } from "@/components/app-factory/ActivityFeed";
import { AddAppModal } from "@/components/app-factory/AddAppModal";
import { BacklogPanel } from "@/components/app-factory/BacklogPanel";
import { DonePanel } from "@/components/app-factory/DonePanel";
import { JulesCapacityPanel } from "@/components/app-factory/JulesCapacityPanel";
import { KanbanBoard } from "@/components/app-factory/KanbanBoard";
import { StatisticsPanel } from "@/components/app-factory/StatisticsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AppFactoryDashboardData, AppPhase, MasterListItem } from "@/types/app-factory";
import { useCallback, useEffect, useState } from "react";

const POLLING_INTERVAL = 3000; // 3 seconds as per spec

export function AppFactoryDashboardClient() {
  const [data, setData] = useState<AppFactoryDashboardData | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMasterItem, setSelectedMasterItem] = useState<MasterListItem | null>(
    null,
  );

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/app-factory");
      if (!response.ok) {
        throw new Error("Failed to fetch app factory data");
      }
      const newData: AppFactoryDashboardData = await response.json();
      setData(newData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);
      if (visible && isPolling) {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPolling, fetchData]);

  // Polling
  useEffect(() => {
    if (!isPolling || !isVisible) return;

    const intervalId = setInterval(fetchData, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isPolling, isVisible, fetchData]);

  // Handle moving an app to a different phase
  const handleMoveApp = useCallback(
    async (appName: string, toPhase: AppPhase) => {
      try {
        const response = await fetch("/api/admin/app-factory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appName, toPhase }),
        });

        if (!response.ok) {
          throw new Error("Failed to move app");
        }

        // Refresh data
        await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to move app");
      }
    },
    [fetchData],
  );

  // Handle adding an app to the pipeline
  const handleAddApp = useCallback(
    async (name: string, category: string, description?: string) => {
      try {
        const response = await fetch("/api/admin/app-factory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, category, description }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to add app");
        }

        // Refresh data and close modal
        await fetchData();
        setShowAddModal(false);
        setSelectedMasterItem(null);
      } catch (err) {
        throw err;
      }
    },
    [fetchData],
  );

  // Handle clicking on a master list item
  const handleMasterListClick = useCallback((item: MasterListItem) => {
    setSelectedMasterItem(item);
    setShowAddModal(true);
  }, []);

  // Handle resuming a paused app (restart Jules session)
  const handleResumeApp = useCallback(
    async (appName: string) => {
      try {
        const response = await fetch("/api/admin/app-factory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resume", appName }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to resume app");
        }

        // Refresh data
        await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resume app");
      }
    },
    [fetchData],
  );

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">Loading...</div>
          <p className="text-muted-foreground">Fetching app factory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">App Factory Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Monitor Jules agents building apps through the pipeline
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              + Add App
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPolling(!isPolling)}
            >
              {isPolling ? "Pause" : "Resume"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
            </p>
            {isPolling && (
              <Badge variant="secondary" className="text-xs">
                Live (3s)
              </Badge>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center justify-between">
            <p className="text-red-600 dark:text-red-400">Error: {error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Jules Capacity Panel */}
      <JulesCapacityPanel capacity={data.julesCapacity} />

      {/* Main Layout: Backlog | Board + Stats + Activity | Done */}
      <div className="flex gap-6">
        {/* Left: Backlog Panel */}
        <div className="w-72 shrink-0">
          <BacklogPanel
            masterList={data.masterList}
            onItemClick={handleMasterListClick}
          />
        </div>

        {/* Center: Kanban + Stats + Activity */}
        <div className="flex-1 space-y-6 overflow-hidden">
          {/* Kanban Board - exclude "done" apps */}
          <KanbanBoard
            apps={data.apps.filter((app) => app.phase !== "done")}
            onMoveApp={handleMoveApp}
            onResumeApp={handleResumeApp}
          />

          {/* Statistics */}
          <StatisticsPanel statistics={data.statistics} />

          {/* Activity Feed */}
          <ActivityFeed activity={data.recentActivity} />
        </div>

        {/* Right: Done Panel */}
        <div className="w-72 shrink-0">
          <DonePanel apps={data.apps.filter((app) => app.phase === "done")} />
        </div>
      </div>

      {/* Add App Modal */}
      {showAddModal && (
        <AddAppModal
          initialItem={selectedMasterItem}
          onClose={() => {
            setShowAddModal(false);
            setSelectedMasterItem(null);
          }}
          onAdd={handleAddApp}
        />
      )}
    </div>
  );
}
