/**
 * Statistics Panel
 *
 * Displays key metrics about the app factory pipeline.
 */

"use client";

import { Card } from "@/components/ui/card";
import type { AppFactoryStatistics } from "@/types/app-factory";
import { PHASE_CONFIG, PHASES_ORDERED } from "@/types/app-factory";

interface StatisticsPanelProps {
  statistics: AppFactoryStatistics;
}

/**
 * Format milliseconds as a human-readable duration
 */
function formatDuration(ms: number): string {
  if (ms === 0) return "—";

  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function StatisticsPanel({ statistics }: StatisticsPanelProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Statistics</h2>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Apps</p>
          <p className="mt-1 text-2xl font-bold">{statistics.totalApps}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">In Progress</p>
          <p className="mt-1 text-2xl font-bold text-cyan-600">
            {statistics.inProgressApps}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Completed Today</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {statistics.completedToday}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Failed Attempts</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {statistics.failedAttempts}
          </p>
        </Card>
      </div>

      {/* Phase Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {PHASES_ORDERED.map((phase) => {
          const config = PHASE_CONFIG[phase];
          const count = statistics.phaseCount[phase];
          const avgTime = statistics.avgTimePerPhase[phase];

          return (
            <Card key={phase} className={`p-3 ${config.bgColor}`}>
              <div className="flex items-center gap-2">
                <span>{config.emoji}</span>
                <span className={`text-sm font-medium ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <p className="mt-1 text-xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">
                Avg: {formatDuration(avgTime)}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Throughput */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Throughput: <strong>{statistics.completedThisHour}</strong>/hour
        </span>
        <span>|</span>
        <span>
          <strong>{statistics.completedToday}</strong>/day
        </span>
      </div>
    </div>
  );
}
