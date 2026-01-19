/**
 * My-Apps Dashboard Client Component
 *
 * Real-time dashboard for monitoring my-apps feature activity.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";

interface MyAppsStats {
  overview: {
    totalApps: number;
    activeAppsToday: number;
    appsCreatedToday: number;
    appsCreatedThisWeek: number;
    totalMessages: number;
    messagesToday: number;
    userMessages: number;
    agentMessages: number;
    avgMessagesPerApp: number;
    errorRateThisWeek: number;
  };
  statusBreakdown: Record<string, number>;
  recentActivity: Array<{
    id: string;
    appName: string;
    status: string;
    message: string | null;
    createdAt: string;
  }>;
  topUsers: Array<{
    userId: string;
    name: string;
    email: string;
    appCount: number;
  }>;
  trends: {
    daily: Array<{ date: string; count: number; }>;
    hourly: Array<{ hour: number; count: number; }>;
  };
  generatedAt: string;
}

interface MyAppsDashboardClientProps {
  initialStats: MyAppsStats | null;
}

const POLLING_INTERVAL = 30000;

export function MyAppsDashboardClient({ initialStats }: MyAppsDashboardClientProps) {
  const [stats, setStats] = useState<MyAppsStats | null>(initialStats);
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/my-apps/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  }, [fetchStats]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);
      if (visible && isPolling) {
        fetchStats();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPolling, fetchStats]);

  useEffect(() => {
    if (!isPolling || !isVisible) return;

    const intervalId = setInterval(fetchStats, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isPolling, isVisible, fetchStats]);

  if (!stats) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Failed to load stats. Please try again.</p>
      </Card>
    );
  }

  const { overview } = stats;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">My-Apps Statistics</h1>
          <p className="mt-2 text-muted-foreground">
            Platform-wide activity monitoring for the my-apps feature
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
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
            <p>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}</p>
            {isPolling && <Badge variant="secondary" className="text-xs mt-1">Live</Badge>}
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </Card>
      )}

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Apps</p>
          <p className="mt-2 text-3xl font-bold">{overview.totalApps}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            +{overview.appsCreatedThisWeek} this week
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Active Today</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{overview.activeAppsToday}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overview.appsCreatedToday} created today
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Messages</p>
          <p className="mt-2 text-3xl font-bold">{overview.totalMessages}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overview.messagesToday} today
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Avg Messages/App</p>
          <p className="mt-2 text-3xl font-bold">{overview.avgMessagesPerApp}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overview.errorRateThisWeek} errors this week
          </p>
        </Card>
      </div>

      {/* Message Breakdown */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Message Breakdown</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
              User Messages
            </p>
            <p className="mt-1 text-2xl font-bold text-purple-900 dark:text-purple-100">
              {overview.userMessages}
            </p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Agent Messages
            </p>
            <p className="mt-1 text-2xl font-bold text-orange-900 dark:text-orange-100">
              {overview.agentMessages}
            </p>
          </div>
        </div>
      </Card>

      {/* Status Distribution */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Status Distribution</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.statusBreakdown).map(([status, count]) => (
            <Badge key={status} variant="secondary" className="text-sm px-3 py-1">
              {status}: {count}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Recent Activity & Top Users */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {stats.recentActivity.length === 0
              ? <p className="text-sm text-muted-foreground">No recent activity</p>
              : (
                stats.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <StatusBadge status={activity.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.appName}</p>
                      {activity.message && (
                        <p className="text-xs text-muted-foreground truncate">{activity.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
          </div>
        </Card>

        {/* Top Users */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Top Users</h2>
          <div className="space-y-3">
            {stats.topUsers.length === 0
              ? <p className="text-sm text-muted-foreground">No users found</p>
              : (
                stats.topUsers.map((user, index) => (
                  <div
                    key={user.userId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Badge variant="outline">{user.appCount} apps</Badge>
                  </div>
                ))
              )}
          </div>
        </Card>
      </div>

      {/* Trends */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Activity Trends (Last 7 Days)</h2>
        <div className="flex items-end gap-2 h-32">
          {stats.trends.daily.length === 0
            ? <p className="text-sm text-muted-foreground">No data available</p>
            : (
              stats.trends.daily.map((day, i) => {
                const maxCount = Math.max(...stats.trends.daily.map((d) => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.count} apps created`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                  </div>
                );
              })
            )}
        </div>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string; }) {
  const colorMap: Record<string, string> = {
    LIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    BUILDING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    PROMPTING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    DRAFTING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <span
      className={`text-xs px-2 py-1 rounded ${
        colorMap[status] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      }`}
    >
      {status}
    </span>
  );
}
