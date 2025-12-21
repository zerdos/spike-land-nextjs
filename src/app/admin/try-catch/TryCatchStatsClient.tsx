/**
 * Try-Catch Stats Client Component
 *
 * Client-side dashboard with real-time polling for try-catch statistics.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TryCatchStats } from "@/lib/observability/try-catch-stats";
import { useCallback, useEffect, useMemo, useState } from "react";

// Polling interval (30 seconds)
const POLLING_INTERVAL = 30000;

/**
 * Calculates success rate as a percentage.
 */
function calculateSuccessRate(success: number, fail: number): number {
  const total = success + fail;
  return total > 0 ? (success / total) * 100 : 0;
}

export function TryCatchStatsClient() {
  const [stats, setStats] = useState<TryCatchStats | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/try-catch-stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
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

  const handleReset = useCallback(async () => {
    if (
      !confirm(
        "Are you sure you want to reset all try-catch statistics? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch("/api/admin/try-catch-stats", {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to reset stats");
      }
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset");
    } finally {
      setIsResetting(false);
    }
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Track page visibility to pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);
      if (visible && isPolling) {
        fetchStats();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPolling, fetchStats]);

  // Only poll when tab is visible AND polling is enabled
  useEffect(() => {
    if (!isPolling || !isVisible) return;

    const intervalId = setInterval(fetchStats, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isPolling, isVisible, fetchStats]);

  // Calculate totals (memoized)
  const totals = useMemo(() => {
    if (!stats) return null;
    return Object.values(stats.users).reduce(
      (acc, user) => ({
        allCalls: acc.allCalls + user.allCalls,
        frontendSuccess: acc.frontendSuccess + user.frontendSuccess,
        frontendFail: acc.frontendFail + user.frontendFail,
        backendSuccess: acc.backendSuccess + user.backendSuccess,
        backendFail: acc.backendFail + user.backendFail,
      }),
      {
        allCalls: 0,
        frontendSuccess: 0,
        frontendFail: 0,
        backendSuccess: 0,
        backendFail: 0,
      },
    );
  }, [stats]);

  // Memoized success rates
  const frontendSuccessRate = useMemo(
    () => (totals ? calculateSuccessRate(totals.frontendSuccess, totals.frontendFail) : 0),
    [totals],
  );

  const backendSuccessRate = useMemo(
    () => (totals ? calculateSuccessRate(totals.backendSuccess, totals.backendFail) : 0),
    [totals],
  );

  const userList = useMemo(() => (stats ? Object.values(stats.users) : []), [stats]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPolling(!isPolling)}
            aria-label={isPolling ? "Pause auto-refresh" : "Resume auto-refresh"}
          >
            {isPolling ? "Pause" : "Resume"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleReset}
            disabled={isResetting}
            aria-label="Reset all statistics"
          >
            {isResetting ? "Resetting..." : "Reset All Stats"}
          </Button>
        </div>
        <div className="text-right text-sm text-neutral-500">
          <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
          {isPolling && (
            <span className="text-xs block">
              <Badge variant="secondary" className="text-xs">
                Live
              </Badge>
            </span>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Total Calls
          </p>
          <p className="mt-2 text-3xl font-bold">
            {totals?.allCalls.toLocaleString() ?? 0}
          </p>
        </Card>

        <Card className="p-6 border-green-200 dark:border-green-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Frontend Success
          </p>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
            {totals?.frontendSuccess.toLocaleString() ?? 0}
          </p>
        </Card>

        <Card className="p-6 border-red-200 dark:border-red-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Frontend Fail
          </p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {totals?.frontendFail.toLocaleString() ?? 0}
          </p>
        </Card>

        <Card className="p-6 border-green-200 dark:border-green-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Backend Success
          </p>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
            {totals?.backendSuccess.toLocaleString() ?? 0}
          </p>
        </Card>

        <Card className="p-6 border-red-200 dark:border-red-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Backend Fail
          </p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {totals?.backendFail.toLocaleString() ?? 0}
          </p>
        </Card>
      </div>

      {/* Environment Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Frontend Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400">
                Success Rate
              </span>
              <span className="font-medium">{frontendSuccessRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${frontendSuccessRate}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-neutral-500">
              <span>{totals?.frontendSuccess ?? 0} success</span>
              <span>{totals?.frontendFail ?? 0} failures</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Backend Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400">
                Success Rate
              </span>
              <span className="font-medium">{backendSuccessRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${backendSuccessRate}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-neutral-500">
              <span>{totals?.backendSuccess ?? 0} success</span>
              <span>{totals?.backendFail ?? 0} failures</span>
            </div>
          </div>
        </Card>
      </div>

      {/* User Stats Table */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Stats by User</h2>
          <span className="text-sm text-neutral-500">
            {userList.length} user{userList.length !== 1 ? "s" : ""}
          </span>
        </div>

        {userList.length === 0
          ? (
            <div className="text-center py-8 text-neutral-500">
              No try-catch statistics recorded yet. Statistics will appear as users interact with
              the application.
            </div>
          )
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-neutral-500">
                    <th className="pb-3 font-medium">User (Email)</th>
                    <th className="pb-3 font-medium text-right">Total Calls</th>
                    <th className="pb-3 font-medium text-right">FE Success</th>
                    <th className="pb-3 font-medium text-right">FE Fail</th>
                    <th className="pb-3 font-medium text-right">BE Success</th>
                    <th className="pb-3 font-medium text-right">BE Fail</th>
                    <th className="pb-3 font-medium text-right">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {userList
                    .sort((a, b) => b.allCalls - a.allCalls)
                    .map((user) => (
                      <tr
                        key={user.email}
                        className="border-b border-neutral-100 dark:border-neutral-800"
                      >
                        <td className="py-3">
                          <span className="font-medium">
                            {user.email === "anonymous"
                              ? (
                                <span className="text-neutral-500 italic">
                                  anonymous
                                </span>
                              )
                              : (
                                user.email
                              )}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono">
                          {user.allCalls.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-mono text-green-600 dark:text-green-400">
                          {user.frontendSuccess.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-mono text-red-600 dark:text-red-400">
                          {user.frontendFail.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-mono text-green-600 dark:text-green-400">
                          {user.backendSuccess.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-mono text-red-600 dark:text-red-400">
                          {user.backendFail.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-sm text-neutral-500">
                          {new Date(user.lastSeen).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* Version Info */}
      {stats && (
        <div className="text-center text-xs text-neutral-400">
          Stats version: {stats.version} | Last KV update:{" "}
          {new Date(stats.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
}
